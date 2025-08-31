// Story 3.4: Shift Archive API Endpoint
// Manages shift archival, search, and historical reporting

import { NextRequest, NextResponse } from 'next/server';
import { ShiftArchiveService } from '@/lib/services/shift-archive-service';
import type { ArchiveApiResponse, ArchiveReason, ArchiveSearchQuery } from '@/lib/types/archive-types';

// GET /api/v1/shifts/archive - Search archived shifts
export async function GET(request: NextRequest) {
  try {
    const managerId = request.headers.get('x-manager-id');
    
    if (!managerId) {
      return NextResponse.json<ArchiveApiResponse>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Manager authentication required'
        }
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse search query from parameters
    const searchQuery: ArchiveSearchQuery = {};

    // Keywords search
    const keywords = searchParams.get('keywords');
    if (keywords) {
      searchQuery.keywords = keywords.split(',').map(k => k.trim());
    }

    // Client filtering
    const clientNames = searchParams.get('client_names');
    if (clientNames) {
      searchQuery.clientNames = clientNames.split(',').map(c => c.trim());
    }

    // Guard filtering
    const guardNames = searchParams.get('guard_names');
    if (guardNames) {
      searchQuery.guardNames = guardNames.split(',').map(g => g.trim());
    }

    // Site filtering
    const siteNames = searchParams.get('site_names');
    if (siteNames) {
      searchQuery.siteNames = siteNames.split(',').map(s => s.trim());
    }

    // Date range filtering
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    if (startDate && endDate) {
      searchQuery.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    // Archive reason filtering
    const archiveReasons = searchParams.get('archive_reasons');
    if (archiveReasons) {
      const reasons = archiveReasons.split(',').map(r => r.trim()) as ArchiveReason[];
      const validReasons: ArchiveReason[] = ['completed', 'cancelled', 'no_show', 'issue_resolved', 'administrative'];
      searchQuery.archiveReasons = reasons.filter(r => validReasons.includes(r));
    }

    // Satisfaction range filtering
    const minSatisfaction = searchParams.get('min_satisfaction');
    const maxSatisfaction = searchParams.get('max_satisfaction');
    if (minSatisfaction && maxSatisfaction) {
      const min = parseInt(minSatisfaction, 10);
      const max = parseInt(maxSatisfaction, 10);
      if (!isNaN(min) && !isNaN(max) && min >= 1 && max <= 5 && min <= max) {
        searchQuery.satisfactionRange = { min, max };
      }
    }

    // Revenue range filtering
    const minRevenue = searchParams.get('min_revenue');
    const maxRevenue = searchParams.get('max_revenue');
    if (minRevenue && maxRevenue) {
      const min = parseFloat(minRevenue);
      const max = parseFloat(maxRevenue);
      if (!isNaN(min) && !isNaN(max) && min >= 0 && min <= max) {
        searchQuery.revenueRange = { min, max };
      }
    }

    // Incidents filter
    const hasIncidents = searchParams.get('has_incidents');
    if (hasIncidents === 'true' || hasIncidents === 'false') {
      searchQuery.hasIncidents = hasIncidents === 'true';
    }

    // Sorting
    const sortBy = searchParams.get('sort_by');
    if (sortBy && ['date', 'revenue', 'satisfaction', 'duration'].includes(sortBy)) {
      searchQuery.sortBy = sortBy as 'date' | 'revenue' | 'satisfaction' | 'duration';
    }

    const sortOrder = searchParams.get('sort_order');
    if (sortOrder && ['asc', 'desc'].includes(sortOrder)) {
      searchQuery.sortOrder = sortOrder as 'asc' | 'desc';
    }

    // Pagination
    const limit = searchParams.get('limit');
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 100) {
        searchQuery.limit = limitNum;
      }
    }

    const offset = searchParams.get('offset');
    if (offset) {
      const offsetNum = parseInt(offset, 10);
      if (!isNaN(offsetNum) && offsetNum >= 0) {
        searchQuery.offset = offsetNum;
      }
    }

    // Execute search
    const result = await ShiftArchiveService.searchArchivedShifts(searchQuery);

    if (!result.success) {
      return NextResponse.json<ArchiveApiResponse>({
        success: false,
        error: result.error
      }, { status: 500 });
    }

    return NextResponse.json<ArchiveApiResponse>({
      success: true,
      data: result.data,
      metadata: {
        total: result.data?.totalCount || 0,
        archived: result.data?.results.length || 0,
        totalRevenue: result.data?.aggregations.totalRevenue || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Archive GET error:', error);
    return NextResponse.json<ArchiveApiResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to search archived shifts',
        details: { error: String(error) }
      }
    }, { status: 500 });
  }
}

// POST /api/v1/shifts/archive - Archive shifts
export async function POST(request: NextRequest) {
  try {
    const managerId = request.headers.get('x-manager-id');
    
    if (!managerId) {
      return NextResponse.json<ArchiveApiResponse>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Manager authentication required'
        }
      }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.shiftIds || !Array.isArray(body.shiftIds) || body.shiftIds.length === 0) {
      return NextResponse.json<ArchiveApiResponse>({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'shiftIds array is required and must not be empty'
        }
      }, { status: 400 });
    }

    // Validate archive reason
    const validReasons: ArchiveReason[] = ['completed', 'cancelled', 'no_show', 'issue_resolved', 'administrative'];
    const reason = (body.reason as ArchiveReason) || 'completed';
    if (!validReasons.includes(reason)) {
      return NextResponse.json<ArchiveApiResponse>({
        success: false,
        error: {
          code: 'INVALID_REASON',
          message: `Invalid archive reason. Must be one of: ${validReasons.join(', ')}`
        }
      }, { status: 400 });
    }

    // Limit batch size
    if (body.shiftIds.length > 20) {
      return NextResponse.json<ArchiveApiResponse>({
        success: false,
        error: {
          code: 'TOO_MANY_SHIFTS',
          message: 'Maximum 20 shifts allowed per archive operation'
        }
      }, { status: 400 });
    }

    // Archive shifts
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const shiftId of body.shiftIds) {
      try {
        const archiveResult = await ShiftArchiveService.archiveShift(
          shiftId,
          managerId,
          reason,
          body.completionMetrics // Optional completion metrics
        );

        if (archiveResult.success) {
          successCount++;
          results.push({
            shiftId,
            success: true,
            archiveId: archiveResult.data?.id
          });
        } else {
          errorCount++;
          results.push({
            shiftId,
            success: false,
            error: typeof archiveResult.error === 'string' 
              ? archiveResult.error 
              : archiveResult.error?.message
          });
        }
      } catch (error) {
        errorCount++;
        results.push({
          shiftId,
          success: false,
          error: String(error)
        });
      }
    }

    return NextResponse.json<ArchiveApiResponse>({
      success: successCount > 0,
      data: {
        results,
        summary: {
          totalShifts: body.shiftIds.length,
          successCount,
          errorCount,
          successRate: (successCount / body.shiftIds.length) * 100
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        archivedBy: managerId
      }
    }, { status: successCount > 0 ? 201 : 400 });

  } catch (error) {
    console.error('Archive POST error:', error);
    return NextResponse.json<ArchiveApiResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to archive shifts',
        details: { error: String(error) }
      }
    }, { status: 500 });
  }
}