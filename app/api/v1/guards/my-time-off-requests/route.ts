// Story 3.3: Time-Off Requests API Endpoint
// Handles time-off request management for guards

import { NextRequest, NextResponse } from 'next/server';
import { TimeOffRequestService } from '@/lib/services/time-off-request-service';
import { AvailabilityApiResponse, TimeOffStatus } from '@/lib/types/availability-types';

// GET /api/v1/guards/my-time-off-requests - Get guard's time-off requests
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
    const statusParam = searchParams.get('status') as TimeOffStatus | null;
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');
    const includeStats = searchParams.get('include_stats') === 'true';

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    const result = await TimeOffRequestService.getTimeOffRequests(
      guardId,
      statusParam || undefined,
      startDate,
      endDate
    );

    if (!result.success) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: result.error
        },
        { status: 500 }
      );
    }

    let statisticsData = undefined;
    if (includeStats) {
      const statsResult = await TimeOffRequestService.getTimeOffStatistics(
        guardId,
        startDate,
        endDate
      );
      if (statsResult.success) {
        statisticsData = statsResult.data;
      }
    }

    return NextResponse.json<AvailabilityApiResponse>({
      success: true,
      data: {
        timeOffRequests: result.data,
        ...(statisticsData && { statistics: statisticsData })
      },
      metadata: {
        total: result.data?.length || 0,
        page: 1,
        limit: 50,
        hasMore: false
      }
    });
  } catch (error) {
    console.error('Time-off requests GET error:', error);
    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch time-off requests',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    );
  }
}

// POST /api/v1/guards/my-time-off-requests - Create new time-off request
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
    if (!body.requestType || !body.startDate || !body.endDate) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Request type, start date, and end date are required'
          }
        },
        { status: 400 }
      );
    }

    const requestData = {
      requestType: body.requestType,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      reason: body.reason
    };

    // Validate date range
    if (requestData.startDate >= requestData.endDate) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'Start date must be before end date'
          }
        },
        { status: 400 }
      );
    }

    // Check if start date is in the past (allow same day for emergency requests)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (requestData.startDate < today && requestData.requestType !== 'emergency') {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_START_DATE',
            message: 'Start date cannot be in the past for non-emergency requests'
          }
        },
        { status: 400 }
      );
    }

    const result = await TimeOffRequestService.createTimeOffRequest(guardId, requestData);

    if (!result.success) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: result.error
        },
        { status: 500 }
      );
    }

    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: true,
        data: {
          timeOffRequests: [result.data!]
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Time-off request POST error:', error);
    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create time-off request',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    );
  }
}