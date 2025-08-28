// Story 3.3: Guard Availability API Endpoint
// Handles CRUD operations for guard availability management

import { NextRequest, NextResponse } from 'next/server';
import { GuardAvailabilityService } from '@/lib/services/guard-availability-service';
import { AvailabilityApiResponse } from '@/lib/types/availability-types';

// GET /api/v1/guards/my-availability - Get guard's availability
export async function GET(request: NextRequest) {
  try {
    // Extract guard ID from JWT (placeholder - would be implemented with auth middleware)
    const guardId = request.headers.get('x-guard-id'); // Temporary for development
    
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');
    const includeHistory = searchParams.get('include_history') === 'true';

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    // Get availability data
    const availabilityResult = await GuardAvailabilityService.getGuardAvailability(
      guardId,
      startDate,
      endDate
    );

    if (!availabilityResult.success) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: availabilityResult.error
        },
        { status: 500 }
      );
    }

    let historyData = undefined;
    if (includeHistory) {
      const historyResult = await GuardAvailabilityService.getAvailabilityHistory(guardId);
      if (historyResult.success) {
        historyData = historyResult.data;
      }
    }

    return NextResponse.json<AvailabilityApiResponse>({
      success: true,
      data: {
        availability: availabilityResult.data,
        ...(historyData && { history: historyData })
      }
    });
  } catch (error) {
    console.error('Guard availability GET error:', error);
    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch availability',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    );
  }
}

// POST /api/v1/guards/my-availability - Create new availability window
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
    if (!body.availabilityWindow || !body.availabilityWindow.start || !body.availabilityWindow.end) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Availability window with start and end times required'
          }
        },
        { status: 400 }
      );
    }

    // Parse dates
    const availabilityData = {
      ...body,
      guardId,
      availabilityWindow: {
        start: new Date(body.availabilityWindow.start),
        end: new Date(body.availabilityWindow.end)
      }
    };

    const result = await GuardAvailabilityService.createAvailability(availabilityData);

    if (!result.success) {
      const statusCode = result.error?.code === 'AVAILABILITY_CONFLICTS' ? 409 : 500;
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
          availability: [result.data!]
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Guard availability POST error:', error);
    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create availability',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    );
  }
}

// PUT /api/v1/guards/my-availability - Bulk update availability
export async function PUT(request: NextRequest) {
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
    const { updates } = body; // Array of availability updates

    if (!Array.isArray(updates)) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Updates array required'
          }
        },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      if (!update.id) {
        errors.push({
          update,
          error: 'Availability ID required for update'
        });
        continue;
      }

      const updateData = { ...update };
      if (update.availabilityWindow) {
        updateData.availabilityWindow = {
          start: new Date(update.availabilityWindow.start),
          end: new Date(update.availabilityWindow.end)
        };
      }

      const result = await GuardAvailabilityService.updateAvailability(update.id, updateData);
      
      if (result.success) {
        results.push(result.data);
      } else {
        errors.push({
          id: update.id,
          error: result.error
        });
      }
    }

    const hasErrors = errors.length > 0;
    const statusCode = hasErrors ? (results.length > 0 ? 207 : 400) : 200;

    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: !hasErrors,
        data: {
          availability: results,
          ...(hasErrors && { errors })
        }
      },
      { status: statusCode }
    );
  } catch (error) {
    console.error('Guard availability PUT error:', error);
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