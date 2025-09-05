// Story 3.3: Individual Time-Off Request Management API
// Handles specific time-off request operations

import { NextRequest, NextResponse } from 'next/server';
import { TimeOffRequestService } from '@/lib/services/time-off-request-service';
import { AvailabilityApiResponse } from '@/lib/types/availability-types';

// PUT /api/v1/guards/my-time-off-requests/[id] - Update specific time-off request
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    
    // Parse date fields if present
    const updateData = { ...body, guardId };
    if (body.startDate && body.endDate) {
      updateData.dateRange = {
        start: new Date(body.startDate),
        end: new Date(body.endDate)
      };
      
      // Validate date range
      if (updateData.dateRange.start >= updateData.dateRange.end) {
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
    }

    const result = await TimeOffRequestService.updateTimeOffRequest(id, updateData);

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
        timeOffRequests: [result.data!]
      }
    });
  } catch (error) {
    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update time-off request',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/guards/my-time-off-requests/[id] - Cancel time-off request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const result = await TimeOffRequestService.cancelTimeOffRequest(id);

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
      data: {}
    });
  } catch (error) {
    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel time-off request',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    );
  }
}