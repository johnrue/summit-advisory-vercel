// Story 3.3: Emergency Unavailability API Endpoint
// Handles immediate unavailability reporting with manager notifications

import { NextRequest, NextResponse } from 'next/server';
import { GuardAvailabilityService } from '@/lib/services/guard-availability-service';
import { AvailabilityApiResponse, EmergencyUnavailabilityData } from '@/lib/types/availability-types';

// POST /api/v1/guards/my-availability/emergency - Report emergency unavailability
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
    if (!body.startTime || !body.reason) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Start time and reason are required for emergency unavailability'
          }
        },
        { status: 400 }
      );
    }

    const emergencyData: EmergencyUnavailabilityData = {
      startTime: new Date(body.startTime),
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      reason: body.reason,
      isImmediate: body.isImmediate !== undefined ? body.isImmediate : true,
      affectedShifts: body.affectedShifts || [],
      requestReplacement: body.requestReplacement !== undefined ? body.requestReplacement : true
    };

    // Validate that emergency is not too far in the past
    const now = new Date();
    const maxPastHours = 2; // Allow reporting up to 2 hours in the past
    const minStartTime = new Date(now.getTime() - (maxPastHours * 60 * 60 * 1000));

    if (emergencyData.startTime < minStartTime) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_EMERGENCY_TIME',
            message: `Emergency unavailability can only be reported up to ${maxPastHours} hours in the past`
          }
        },
        { status: 400 }
      );
    }

    // Validate end time if provided
    if (emergencyData.endTime && emergencyData.endTime <= emergencyData.startTime) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_TIME_RANGE',
            message: 'End time must be after start time'
          }
        },
        { status: 400 }
      );
    }

    const result = await GuardAvailabilityService.reportEmergencyUnavailability(
      guardId,
      emergencyData
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

    // Return success with emergency details
    return NextResponse.json(
      {
        success: true,
        data: {
          emergency: {
            availabilityId: result.data!.availabilityId,
            notificationsSent: result.data!.notificationsSent,
            emergencyData,
            timestamp: new Date().toISOString()
          }
        }
      },
      { status: 201 }
    );
  } catch (error) {
    
    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to report emergency unavailability',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    );
  }
}

// GET /api/v1/guards/my-availability/emergency - Get emergency unavailability history
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
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    // Get availability history for emergency events
    const historyResult = await GuardAvailabilityService.getAvailabilityHistory(guardId, limit);

    if (!historyResult.success) {
      return NextResponse.json<AvailabilityApiResponse>(
        {
          success: false,
          error: historyResult.error
        },
        { status: 500 }
      );
    }

    // Filter for emergency-related changes
    const emergencyHistory = historyResult.data?.filter(
      record => record.changeType === 'emergency_unavailable'
    ) || [];

    return NextResponse.json({
      success: true,
      data: {
        emergencyHistory
      },
      metadata: {
        total: emergencyHistory.length,
        page: 1,
        limit,
        hasMore: emergencyHistory.length >= limit
      }
    });
  } catch (error) {
    
    return NextResponse.json<AvailabilityApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch emergency unavailability history',
          details: { error: String(error) }
        }
      },
      { status: 500 }
    );
  }
}