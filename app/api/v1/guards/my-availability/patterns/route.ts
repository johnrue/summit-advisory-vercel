// Story 3.3: Availability Patterns API Endpoint
// Handles recurring availability pattern management

import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityPatternService } from '@/lib/services/availability-pattern-service';
import { AvailabilityApiResponse, PatternType } from '@/lib/types/availability-types';

// GET /api/v1/guards/my-availability/patterns - Get guard's availability patterns
export async function GET(request: NextRequest) {
  try {
    const guardId = request.headers.get('x-guard-id');
    
    if (!guardId) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Guard authentication required'
          }
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') === 'true';

    const result = await AvailabilityPatternService.getPatterns(guardId, activeOnly);

    if (!result.success) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: result.error
        },
        { status: 500 }
      );
    }

    return NextResponse.json<AvailabilityApiResponse>({
      success: true,
      data: {
        patterns: result.data
      },
      metadata: {
        total: result.data?.length || 0,
        page: 1,
        limit: 50,
        hasMore: false
      }
    });
  } catch (error) {
    console.error('Availability patterns GET error:', error);
    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch availability patterns',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    );
  }
}

// POST /api/v1/guards/my-availability/patterns - Create new availability pattern
export async function POST(request: NextRequest) {
  try {
    const guardId = request.headers.get('x-guard-id');
    
    if (!guardId) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Guard authentication required'
          }
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.patternName || !body.patternType || !body.weeklySchedule || !body.effectiveDate) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Pattern name, type, weekly schedule, and effective date are required'
          }
        },
        { status: 400 }
      );
    }

    // Validate pattern type
    const validPatternTypes: PatternType[] = ['weekly_recurring', 'bi_weekly', 'monthly', 'custom'];
    if (!validPatternTypes.includes(body.patternType)) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_PATTERN_TYPE',
            message: `Pattern type must be one of: ${validPatternTypes.join(', ')}`
          }
        },
        { status: 400 }
      );
    }

    const patternData = {
      patternName: body.patternName,
      patternType: body.patternType,
      weeklySchedule: body.weeklySchedule,
      effectiveDate: new Date(body.effectiveDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined
    };

    // Validate effective date
    if (patternData.effectiveDate < new Date()) {
      patternData.effectiveDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (patternData.effectiveDate < today) {
        return NextResponse.json<AvailabilityApiResponse>(
          {
            success: false,
            error: {
              code: 'INVALID_EFFECTIVE_DATE',
              message: 'Effective date cannot be in the past'
            }
          },
          { status: 400 }
        );
      }
    }

    // Validate end date if provided
    if (patternData.endDate && patternData.endDate <= patternData.effectiveDate) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_END_DATE',
            message: 'End date must be after effective date'
          }
        },
        { status: 400 }
      );
    }

    const result = await AvailabilityPatternService.createPattern(guardId, patternData);

    if (!result.success) {
      const statusCode = result.error?.code === 'PATTERN_CONFLICT' ? 409 : 500;
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: result.error
        },
        { status: statusCode }
      );
    }

    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: true,
        data: {
          patterns: [result.data!]
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Availability pattern POST error:', error);
    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create availability pattern',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    );
  }
}