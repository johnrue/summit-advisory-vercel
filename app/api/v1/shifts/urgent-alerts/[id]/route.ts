// Story 3.4: Individual Alert Management API
// Handles specific alert operations (acknowledge, resolve, escalate)

import { NextRequest, NextResponse } from 'next/server';
import { UrgentAlertService } from '@/lib/services/urgent-alert-service';
import type { UrgencyApiResponse } from '@/lib/types/urgency-types';

// PUT /api/v1/shifts/urgent-alerts/[id] - Acknowledge or resolve alert
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const managerId = request.headers.get('x-manager-id');
    
    if (!managerId) {
      return NextResponse.json<UrgencyApiResponse>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Manager authentication required'
        }
      }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate action
    if (!body.action || !['acknowledge', 'resolve'].includes(body.action)) {
      return NextResponse.json<UrgencyApiResponse>({
        success: false,
        error: {
          code: 'INVALID_ACTION',
          message: 'action must be either "acknowledge" or "resolve"'
        }
      }, { status: 400 });
    }

    let result;

    if (body.action === 'acknowledge') {
      result = await UrgentAlertService.acknowledgeAlert(
        id,
        managerId,
        body.notes
      );
    } else if (body.action === 'resolve') {
      result = await UrgentAlertService.resolveAlert(
        id,
        managerId,
        body.resolutionNotes
      );
    }

    if (!result || !result.success) {
      return NextResponse.json<UrgencyApiResponse>({
        success: false,
        error: result?.error || {
          code: 'OPERATION_FAILED',
          message: 'Failed to update alert'
        }
      }, { status: 500 });
    }

    return NextResponse.json<UrgencyApiResponse>({
      success: true,
      data: {
        alert: result.data,
        action: body.action,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Alert PUT error:', error);
    return NextResponse.json<UrgencyApiResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update alert',
        details: { error: String(error) }
      }
    }, { status: 500 });
  }
}