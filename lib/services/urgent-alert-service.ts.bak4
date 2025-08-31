// Story 3.4: Urgent Alert Service
// Manages shift urgency monitoring and automated alert generation

import { createClient } from '@/lib/supabase';
import type { 
  UrgentShiftAlert, 
  UrgencyAlertType, 
  AlertPriority, 
  AlertStatus,
  ShiftUrgencyCalculation,
  AlertMetrics,
  AlertConfiguration 
} from '@/lib/types/urgency-types';
import type { ServiceResult } from '@/lib/types';

export class UrgentAlertService {
  private static supabase = createClient();

  // Alert Configuration Templates
  private static readonly DEFAULT_ALERT_CONFIG: AlertConfiguration[] = [
    {
      alertType: 'unassigned_24h',
      isEnabled: true,
      thresholdHours: 24,
      priority: 'high',
      escalationRules: [
        { level: 1, triggerAfterHours: 2, newPriority: 'critical' },
        { level: 2, triggerAfterHours: 6, requireManagerApproval: true }
      ],
      notificationMethods: [
        { type: 'email', enabled: true, recipients: [], cooldownMinutes: 30 },
        { type: 'dashboard', enabled: true, recipients: [] }
      ]
    },
    {
      alertType: 'unconfirmed_12h',
      isEnabled: true,
      thresholdHours: 12,
      priority: 'medium',
      escalationRules: [
        { level: 1, triggerAfterHours: 4, newPriority: 'high' }
      ],
      notificationMethods: [
        { type: 'email', enabled: true, recipients: [], cooldownMinutes: 60 },
        { type: 'dashboard', enabled: true, recipients: [] }
      ]
    },
    {
      alertType: 'no_show_risk',
      isEnabled: true,
      thresholdHours: 2,
      priority: 'critical',
      escalationRules: [
        { level: 1, triggerAfterHours: 0.5, requireManagerApproval: true }
      ],
      notificationMethods: [
        { type: 'email', enabled: true, recipients: [] },
        { type: 'sms', enabled: true, recipients: [] },
        { type: 'dashboard', enabled: true, recipients: [] }
      ]
    }
  ];

  /**
   * Monitor shifts and generate urgent alerts
   */
  static async monitorShiftsForAlerts(): Promise<ServiceResult<UrgentShiftAlert[]>> {
    try {
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const next12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000);

      // Get shifts that need monitoring
      const { data: shifts, error } = await this.supabase
        .from('shifts')
        .select(`
          id,
          title,
          time_range,
          status,
          assigned_guard_id,
          client_info,
          location_data,
          required_certifications,
          created_at,
          shift_assignments!left(
            id,
            assignment_status,
            confirmed_at
          )
        `)
        .in('status', ['unassigned', 'assigned', 'confirmed'])
        .lt('time_range', `[${next24Hours.toISOString()},)`)
        .order('time_range');

      if (error) {
        throw error;
      }

      const generatedAlerts: UrgentShiftAlert[] = [];

      for (const shift of shifts) {
        const shiftStart = new Date(shift.time_range.split(',')[0].replace('[', '').replace('"', ''));
        const hoursUntilShift = (shiftStart.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Skip shifts that have already started
        if (hoursUntilShift <= 0) {
          continue;
        }

        // Check for existing active alerts to avoid duplicates
        const { data: existingAlerts } = await this.supabase
          .from('shift_urgency_alerts')
          .select('id, alert_type')
          .eq('shift_id', shift.id)
          .eq('alert_status', 'active');

        const existingAlertTypes = existingAlerts?.map(a => a.alert_type) || [];

        // Generate alerts based on conditions
        const alertsToGenerate: Array<{
          type: UrgencyAlertType;
          priority: AlertPriority;
          reason: string;
        }> = [];

        // Unassigned within 24 hours
        if (shift.status === 'unassigned' && 
            hoursUntilShift <= 24 && 
            !existingAlertTypes.includes('unassigned_24h')) {
          alertsToGenerate.push({
            type: 'unassigned_24h',
            priority: hoursUntilShift <= 6 ? 'critical' : 'high',
            reason: `Shift unassigned with ${Math.round(hoursUntilShift)} hours remaining`
          });
        }

        // Assigned but unconfirmed within 12 hours
        if (shift.status === 'assigned' && 
            hoursUntilShift <= 12 && 
            !existingAlertTypes.includes('unconfirmed_12h')) {
          const isConfirmed = shift.shift_assignments?.some(a => a.confirmed_at);
          if (!isConfirmed) {
            alertsToGenerate.push({
              type: 'unconfirmed_12h',
              priority: hoursUntilShift <= 4 ? 'high' : 'medium',
              reason: `Guard assigned but not confirmed with ${Math.round(hoursUntilShift)} hours remaining`
            });
          }
        }

        // No-show risk detection (within 2 hours and no recent guard activity)
        if (['assigned', 'confirmed'].includes(shift.status) && 
            hoursUntilShift <= 2 && 
            !existingAlertTypes.includes('no_show_risk')) {
          // This could be enhanced with guard reliability scoring
          const riskScore = await this.calculateNoShowRisk(shift.assigned_guard_id);
          if (riskScore > 0.7) {
            alertsToGenerate.push({
              type: 'no_show_risk',
              priority: 'critical',
              reason: `High no-show risk detected for guard with ${Math.round(hoursUntilShift)} hours remaining`
            });
          }
        }

        // Certification gap detection
        if (shift.required_certifications && 
            shift.assigned_guard_id &&
            !existingAlertTypes.includes('certification_gap')) {
          const certificationCheck = await this.checkCertificationGaps(
            shift.assigned_guard_id, 
            shift.required_certifications
          );
          if (certificationCheck.hasGaps) {
            alertsToGenerate.push({
              type: 'certification_gap',
              priority: 'high',
              reason: `Missing required certifications: ${certificationCheck.missingCertifications.join(', ')}`
            });
          }
        }

        // Create alerts
        for (const alertSpec of alertsToGenerate) {
          const alertResult = await this.createAlert({
            shiftId: shift.id,
            alertType: alertSpec.type,
            alertPriority: alertSpec.priority,
            hoursUntilShift: Math.round(hoursUntilShift * 100) / 100, // Round to 2 decimals
            reason: alertSpec.reason
          });

          if (alertResult.success && alertResult.data) {
            generatedAlerts.push(alertResult.data);
          }
        }
      }

      return {
        success: true,
        data: generatedAlerts
      };
    } catch (error) {
      console.error('Error monitoring shifts for alerts:', error);
      return {
        success: false,
        error: {
          code: 'MONITORING_ERROR',
          message: 'Failed to monitor shifts for urgent alerts',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Create a new urgent alert
   */
  static async createAlert(params: {
    shiftId: string;
    alertType: UrgencyAlertType;
    alertPriority: AlertPriority;
    hoursUntilShift: number;
    reason?: string;
  }): Promise<ServiceResult<UrgentShiftAlert>> {
    try {
      const alertData = {
        shift_id: params.shiftId,
        alert_type: params.alertType,
        alert_priority: params.alertPriority,
        hours_until_shift: params.hoursUntilShift,
        alert_status: 'active' as AlertStatus,
        escalation_level: 1,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('shift_urgency_alerts')
        .insert(alertData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const alert: UrgentShiftAlert = {
        id: data.id,
        shiftId: data.shift_id,
        alertType: data.alert_type,
        alertPriority: data.alert_priority,
        hoursUntilShift: data.hours_until_shift,
        alertStatus: data.alert_status,
        acknowledgedBy: data.acknowledged_by,
        acknowledgedAt: data.acknowledged_at ? new Date(data.acknowledged_at) : undefined,
        resolvedAt: data.resolved_at ? new Date(data.resolved_at) : undefined,
        escalationLevel: data.escalation_level,
        lastEscalatedAt: data.last_escalated_at ? new Date(data.last_escalated_at) : undefined,
        maxEscalationLevel: 3,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      // Trigger notifications
      await this.triggerNotifications(alert, params.reason);

      return {
        success: true,
        data: alert
      };
    } catch (error) {
      console.error('Error creating urgent alert:', error);
      return {
        success: false,
        error: {
          code: 'ALERT_CREATION_ERROR',
          message: 'Failed to create urgent alert',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Acknowledge an alert
   */
  static async acknowledgeAlert(
    alertId: string, 
    acknowledgedBy: string,
    notes?: string
  ): Promise<ServiceResult<UrgentShiftAlert>> {
    try {
      const { data, error } = await this.supabase
        .from('shift_urgency_alerts')
        .update({
          alert_status: 'acknowledged',
          acknowledged_by: acknowledgedBy,
          acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: {
          id: data.id,
          shiftId: data.shift_id,
          alertType: data.alert_type,
          alertPriority: data.alert_priority,
          hoursUntilShift: data.hours_until_shift,
          alertStatus: data.alert_status,
          acknowledgedBy: data.acknowledged_by,
          acknowledgedAt: new Date(data.acknowledged_at),
          resolvedAt: data.resolved_at ? new Date(data.resolved_at) : undefined,
          escalationLevel: data.escalation_level,
          lastEscalatedAt: data.last_escalated_at ? new Date(data.last_escalated_at) : undefined,
          maxEscalationLevel: 3,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        }
      };
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      return {
        success: false,
        error: {
          code: 'ACKNOWLEDGMENT_ERROR',
          message: 'Failed to acknowledge alert',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Resolve an alert
   */
  static async resolveAlert(
    alertId: string,
    resolvedBy: string,
    resolutionNotes?: string
  ): Promise<ServiceResult<UrgentShiftAlert>> {
    try {
      const { data, error } = await this.supabase
        .from('shift_urgency_alerts')
        .update({
          alert_status: 'resolved',
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: {
          id: data.id,
          shiftId: data.shift_id,
          alertType: data.alert_type,
          alertPriority: data.alert_priority,
          hoursUntilShift: data.hours_until_shift,
          alertStatus: data.alert_status,
          acknowledgedBy: data.acknowledged_by,
          acknowledgedAt: data.acknowledged_at ? new Date(data.acknowledged_at) : undefined,
          resolvedAt: new Date(data.resolved_at),
          escalationLevel: data.escalation_level,
          lastEscalatedAt: data.last_escalated_at ? new Date(data.last_escalated_at) : undefined,
          maxEscalationLevel: 3,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        }
      };
    } catch (error) {
      console.error('Error resolving alert:', error);
      return {
        success: false,
        error: {
          code: 'RESOLUTION_ERROR',
          message: 'Failed to resolve alert',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Get active alerts with filtering
   */
  static async getActiveAlerts(filters?: {
    alertTypes?: UrgencyAlertType[];
    priorities?: AlertPriority[];
    shiftIds?: string[];
    hoursUntilMax?: number;
  }): Promise<ServiceResult<UrgentShiftAlert[]>> {
    try {
      let query = this.supabase
        .from('shift_urgency_alerts')
        .select(`
          *,
          shifts!inner(
            id,
            title,
            time_range,
            client_info,
            location_data
          )
        `)
        .eq('alert_status', 'active')
        .order('alert_priority', { ascending: false })
        .order('hours_until_shift', { ascending: true });

      if (filters?.alertTypes?.length) {
        query = query.in('alert_type', filters.alertTypes);
      }

      if (filters?.priorities?.length) {
        query = query.in('alert_priority', filters.priorities);
      }

      if (filters?.shiftIds?.length) {
        query = query.in('shift_id', filters.shiftIds);
      }

      if (filters?.hoursUntilMax) {
        query = query.lte('hours_until_shift', filters.hoursUntilMax);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const alerts: UrgentShiftAlert[] = data.map(item => ({
        id: item.id,
        shiftId: item.shift_id,
        alertType: item.alert_type,
        alertPriority: item.alert_priority,
        hoursUntilShift: item.hours_until_shift,
        alertStatus: item.alert_status,
        acknowledgedBy: item.acknowledged_by,
        acknowledgedAt: item.acknowledged_at ? new Date(item.acknowledged_at) : undefined,
        resolvedAt: item.resolved_at ? new Date(item.resolved_at) : undefined,
        escalationLevel: item.escalation_level,
        lastEscalatedAt: item.last_escalated_at ? new Date(item.last_escalated_at) : undefined,
        maxEscalationLevel: 3,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));

      return {
        success: true,
        data: alerts
      };
    } catch (error) {
      console.error('Error getting active alerts:', error);
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to retrieve active alerts',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Get alert metrics and statistics
   */
  static async getAlertMetrics(
    period?: { start: Date; end: Date }
  ): Promise<ServiceResult<AlertMetrics>> {
    try {
      let query = this.supabase.from('shift_urgency_alerts').select('*');

      if (period) {
        query = query
          .gte('created_at', period.start.toISOString())
          .lte('created_at', period.end.toISOString());
      }

      const { data: alerts, error } = await query;

      if (error) {
        throw error;
      }

      // Calculate metrics
      const activeAlerts = alerts.filter(a => a.alert_status === 'active');
      const resolvedAlerts = alerts.filter(a => a.alert_status === 'resolved');

      const alertsByType: Record<UrgencyAlertType, number> = {
        unassigned_24h: 0,
        unconfirmed_12h: 0,
        no_show_risk: 0,
        understaffed: 0,
        certification_gap: 0
      };

      const alertsByPriority: Record<AlertPriority, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };

      alerts.forEach(alert => {
        alertsByType[alert.alert_type as UrgencyAlertType]++;
        alertsByPriority[alert.alert_priority as AlertPriority]++;
      });

      // Calculate resolution time
      let totalResolutionTime = 0;
      let resolvedCount = 0;

      resolvedAlerts.forEach(alert => {
        if (alert.resolved_at && alert.created_at) {
          const resolutionTime = (new Date(alert.resolved_at).getTime() - 
                                 new Date(alert.created_at).getTime()) / (1000 * 60 * 60);
          totalResolutionTime += resolutionTime;
          resolvedCount++;
        }
      });

      const avgResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

      // Calculate metrics for last 24 hours
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = alerts.filter(a => new Date(a.created_at) >= last24h);

      const metrics: AlertMetrics = {
        totalActiveAlerts: activeAlerts.length,
        alertsByType,
        alertsByPriority,
        avgResolutionTime,
        escalationRate: alerts.filter(a => a.escalation_level > 1).length / alerts.length * 100,
        falsePositiveRate: 0, // Would need additional tracking
        newAlertsLast24h: recent.filter(a => a.alert_status === 'active').length,
        resolvedAlertsLast24h: recent.filter(a => a.alert_status === 'resolved').length,
        escalatedAlertsLast24h: recent.filter(a => a.escalation_level > 1).length,
        criticalAlertsUnresolved: activeAlerts.filter(a => a.alert_priority === 'critical').length,
        averageAcknowledgmentTime: 0, // Would need additional calculation
        shiftsAtRisk: activeAlerts.length
      };

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      console.error('Error getting alert metrics:', error);
      return {
        success: false,
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to calculate alert metrics',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Calculate no-show risk for a guard (placeholder implementation)
   */
  private static async calculateNoShowRisk(guardId?: string): Promise<number> {
    if (!guardId) return 0;
    
    // This would implement ML-based risk scoring based on:
    // - Historical no-show rate
    // - Recent activity patterns
    // - Confirmation response times
    // - External factors (weather, traffic, etc.)
    
    // For now, return a basic risk score
    return 0.3; // 30% base risk
  }

  /**
   * Check for certification gaps (placeholder implementation)
   */
  private static async checkCertificationGaps(
    guardId: string, 
    requiredCertifications: any
  ): Promise<{ hasGaps: boolean; missingCertifications: string[] }> {
    // This would check guard certifications against requirements
    // Integration with guard profile and certification tracking
    
    return {
      hasGaps: false,
      missingCertifications: []
    };
  }

  /**
   * Trigger notifications for an alert
   */
  private static async triggerNotifications(
    alert: UrgentShiftAlert,
    reason?: string
  ): Promise<void> {
    // This would integrate with notification systems:
    // - Email notifications to managers
    // - SMS alerts for critical issues
    // - Dashboard real-time updates
    // - Webhook integrations
    
    console.log('Alert notification triggered:', {
      alertId: alert.id,
      type: alert.alertType,
      priority: alert.alertPriority,
      reason
    });
  }
}