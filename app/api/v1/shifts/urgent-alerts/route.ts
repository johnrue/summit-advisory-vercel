// Story 3.4: Urgent Alerts API Endpoint
// Manages shift urgent alerts, acknowledgments, and escalations

import { NextRequest, NextResponse } from 'next/server';
import { UrgentAlertService } from '@/lib/services/urgent-alert-service';
import type { UrgencyApiResponse, UrgencyAlertType, AlertPriority } from '@/lib/types/urgency-types';

// GET /api/v1/shifts/urgent-alerts - Get active urgent alerts with filtering
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    
    // Parse filtering parameters
    const filters: {
      alertTypes?: UrgencyAlertType[];
      priorities?: AlertPriority[];
      shiftIds?: string[];
      hoursUntilMax?: number;
    } = {};

    // Alert type filtering
    const alertTypes = searchParams.get('alert_types');
    if (alertTypes) {
      const types = alertTypes.split(',').map(t => t.trim()) as UrgencyAlertType[];
      const validTypes: UrgencyAlertType[] = [
        'unassigned_24h', 'unconfirmed_12h', 'no_show_risk', 'understaffed', 'certification_gap'
      ];
      filters.alertTypes = types.filter(t => validTypes.includes(t));
    }

    // Priority filtering
    const priorities = searchParams.get('priorities');
    if (priorities) {
      const priors = priorities.split(',').map(p => p.trim()) as AlertPriority[];
      const validPriorities: AlertPriority[] = ['low', 'medium', 'high', 'critical'];
      filters.priorities = priors.filter(p => validPriorities.includes(p));
    }

    // Shift ID filtering
    const shiftIds = searchParams.get('shift_ids');
    if (shiftIds) {
      filters.shiftIds = shiftIds.split(',').map(id => id.trim());
    }

    // Hours until shift maximum
    const hoursUntilMax = searchParams.get('hours_until_max');
    if (hoursUntilMax) {
      const hours = parseFloat(hoursUntilMax);
      if (!isNaN(hours) && hours > 0) {
        filters.hoursUntilMax = hours;
      }
    }

    // Get active alerts
    const result = await UrgentAlertService.getActiveAlerts(filters);

    if (!result.success) {
      return NextResponse.json<UrgencyApiResponse>({
        success: false,
        error: result.error
      }, { status: 500 });
    }

    // Get alert metrics
    const metricsResult = await UrgentAlertService.getAlertMetrics();
    const metrics = metricsResult.success ? metricsResult.data : undefined;

    return NextResponse.json<UrgencyApiResponse>({
      success: true,
      data: {
        alerts: result.data || [],
        metrics
      },
      metadata: {
        total: result.data?.length || 0,
        activeAlerts: result.data?.length || 0,
        criticalAlerts: result.data?.filter(a => a.alertPriority === 'critical').length || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Urgent alerts GET error:', error);
    return NextResponse.json<UrgencyApiResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve urgent alerts',
        details: { error: String(error) }
      }
    }, { status: 500 });
  }
}

// POST /api/v1/shifts/urgent-alerts - Trigger manual alert monitoring
export async function POST(request: NextRequest) {
  try {
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

    // Manually trigger alert monitoring
    const result = await UrgentAlertService.monitorShiftsForAlerts();

    if (!result.success) {
      return NextResponse.json<UrgencyApiResponse>({
        success: false,
        error: result.error
      }, { status: 500 });
    }

    const generatedAlerts = result.data || [];

    return NextResponse.json<UrgencyApiResponse>({
      success: true,
      data: {
        generatedAlerts,
        summary: {
          newAlerts: generatedAlerts.length,
          alertsByType: generatedAlerts.reduce((acc, alert) => {
            acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
            return acc;
          }, {} as Record<UrgencyAlertType, number>),
          alertsByPriority: generatedAlerts.reduce((acc, alert) => {
            acc[alert.alertPriority] = (acc[alert.alertPriority] || 0) + 1;
            return acc;
          }, {} as Record<AlertPriority, number>)
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        triggeredBy: managerId
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Urgent alerts POST error:', error);
    return NextResponse.json<UrgencyApiResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to trigger alert monitoring',
        details: { error: String(error) }
      }
    }, { status: 500 });
  }
}