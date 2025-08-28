// Story 3.3: Individual Availability Management API
// Handles specific availability window operations

import { NextRequest, NextResponse } from 'next/server';
import { GuardAvailabilityService } from '@/lib/services/guard-availability-service';
import { AvailabilityApiResponse } from '@/lib/types/availability-types';

// PUT /api/v1/guards/my-availability/[id] - Update specific availability
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
    const updateData = { ...body };
    if (body.availabilityWindow) {
      updateData.availabilityWindow = {
        start: new Date(body.availabilityWindow.start),
        end: new Date(body.availabilityWindow.end)
      };
    }

    const result = await GuardAvailabilityService.updateAvailability(id, updateData);

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
        availability: [result.data!]
      }
    });
  } catch (error) {
    console.error('Availability update error:', error);
    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update availability',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/guards/my-availability/[id] - Delete specific availability
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

    const result = await GuardAvailabilityService.deleteAvailability(id);

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
    console.error('Availability deletion error:', error);
    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete availability',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    );
  }
}