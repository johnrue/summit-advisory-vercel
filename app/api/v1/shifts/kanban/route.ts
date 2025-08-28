// Story 3.4: Kanban Board API Endpoint
// Main API for Kanban board data, filtering, and shift movement

import { NextRequest, NextResponse } from 'next/server';
import { ShiftKanbanService } from '@/lib/services/shift-kanban-service';
import type { KanbanApiResponse, KanbanFilters } from '@/lib/types/kanban-types';

// GET /api/v1/shifts/kanban - Get Kanban board data with filtering
export async function GET(request: NextRequest) {
  try {
    const managerId = request.headers.get('x-manager-id');
    
    if (!managerId) {
      return NextResponse.json<KanbanApiResponse>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Manager authentication required'
        }
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filters from query parameters
    const filters: KanbanFilters = {};

    // Date range filtering
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    // Client filtering
    const clients = searchParams.get('clients');
    if (clients) {
      filters.clients = clients.split(',').map(c => c.trim());
    }

    // Site filtering
    const sites = searchParams.get('sites');
    if (sites) {
      filters.sites = sites.split(',').map(s => s.trim());
    }

    // Guard filtering
    const guards = searchParams.get('guards');
    if (guards) {
      filters.guards = guards.split(',').map(g => g.trim());
    }

    // Status filtering
    const statuses = searchParams.get('statuses');
    if (statuses) {
      filters.statuses = statuses.split(',').map(s => s.trim()) as any;
    }

    // Priority filtering
    const priorities = searchParams.get('priorities');
    if (priorities) {
      filters.priorities = priorities.split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p));
    }

    // Certification filtering
    const certifications = searchParams.get('certifications');
    if (certifications) {
      filters.certificationRequirements = certifications.split(',').map(c => c.trim());
    }

    // Assignment status filtering
    const assignmentStatus = searchParams.get('assignment_status');
    if (assignmentStatus && ['assigned', 'unassigned', 'all'].includes(assignmentStatus)) {
      filters.assignmentStatus = assignmentStatus as 'assigned' | 'unassigned' | 'all';
    }

    // Urgent alerts only
    const urgentOnly = searchParams.get('urgent_only') === 'true';
    if (urgentOnly) {
      filters.urgentOnly = true;
    }

    // Get board data
    const result = await ShiftKanbanService.getKanbanBoardData(managerId, filters);

    if (!result.success) {
      return NextResponse.json<KanbanApiResponse>({
        success: false,
        error: result.error
      }, { status: 500 });
    }

    return NextResponse.json<KanbanApiResponse>({
      success: true,
      data: result.data,
      metadata: {
        total: result.data?.shifts.length || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Kanban board GET error:', error);
    return NextResponse.json<KanbanApiResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve Kanban board data',
        details: { error: String(error) }
      }
    }, { status: 500 });
  }
}

// POST /api/v1/shifts/kanban - Move shift between columns
export async function POST(request: NextRequest) {
  try {
    const managerId = request.headers.get('x-manager-id');
    
    if (!managerId) {
      return NextResponse.json<KanbanApiResponse>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Manager authentication required'
        }
      }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.shiftId || !body.newStatus) {
      return NextResponse.json<KanbanApiResponse>({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'shiftId and newStatus are required'
        }
      }, { status: 400 });
    }

    // Validate status value
    const validStatuses = [
      'unassigned', 'assigned', 'confirmed', 'in_progress', 'completed', 'issue_logged', 'archived'
    ];
    if (!validStatuses.includes(body.newStatus)) {
      return NextResponse.json<KanbanApiResponse>({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        }
      }, { status: 400 });
    }

    // Execute shift movement
    const result = await ShiftKanbanService.moveShift(
      body.shiftId,
      body.newStatus,
      managerId,
      body.reason
    );

    if (!result.success) {
      const statusCode = result.error?.code === 'INVALID_TRANSITION' ? 409 : 500;
      return NextResponse.json<KanbanApiResponse>({
        success: false,
        error: result.error
      }, { status: statusCode });
    }

    return NextResponse.json<KanbanApiResponse>({
      success: true,
      data: {
        transition: result.data,
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Kanban board POST error:', error);
    return NextResponse.json<KanbanApiResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to move shift',
        details: { error: String(error) }
      }
    }, { status: 500 });
  }
}