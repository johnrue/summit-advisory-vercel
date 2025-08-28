// Story 3.3: Individual Availability Pattern Management API
// Handles specific pattern operations and overrides

import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityPatternService } from '@/lib/services/availability-pattern-service';
import { AvailabilityApiResponse } from '@/lib/types/availability-types';

// PUT /api/v1/guards/my-availability/patterns/[id] - Update specific pattern
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
    if (body.effectiveDate) {
      updateData.effectiveDate = new Date(body.effectiveDate);
    }
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : undefined;
    }
    if (body.dateOverrides) {
      updateData.dateOverrides = body.dateOverrides.map((override: any) => ({
        ...override,
        date: new Date(override.date)
      }));
    }

    // Validate dates if provided
    if (updateData.effectiveDate && updateData.endDate && updateData.endDate <= updateData.effectiveDate) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'End date must be after effective date'
          }
        },
        { status: 400 }
      );
    }

    const result = await AvailabilityPatternService.updatePattern(id, updateData);

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
        patterns: [result.data!]
      }
    });
  } catch (error) {
    console.error('Pattern update error:', error);
    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update availability pattern',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/guards/my-availability/patterns/[id] - Delete specific pattern
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

    const result = await AvailabilityPatternService.deletePattern(id);

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
    console.error('Pattern deletion error:', error);
    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete availability pattern',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    );
  }
}