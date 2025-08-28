// Story 3.4: Shift Kanban Service
// Main orchestration service for Kanban board operations

import { createClient } from '@/lib/supabase';
import { ShiftWorkflowService } from './shift-workflow-service';
import { UrgentAlertService } from './urgent-alert-service';
import { ShiftArchiveService } from './shift-archive-service';
import type { 
  KanbanBoardData,
  KanbanFilters,
  BulkOperation,
  BulkActionRequest,
  KanbanMetrics,
  KanbanActivity 
} from '@/lib/types/kanban-types';
import type { ServiceResult } from '@/lib/types/service-types';

export class ShiftKanbanService {
  private static supabase = createClient();

  /**
   * Get complete Kanban board data with filtering
   */
  static async getKanbanBoardData(
    managerId?: string,
    filters?: KanbanFilters
  ): Promise<ServiceResult<KanbanBoardData>> {
    try {
      // Base query for shifts
      let shiftsQuery = this.supabase
        .from('shifts')
        .select(`
          *,
          shift_assignments!left(
            id,
            assignment_status,
            confirmed_at,
            guard_profiles!inner(
              first_name,
              last_name,
              phone_number
            )
          ),
          shift_urgency_alerts!left(
            id,
            alert_type,
            alert_priority,
            alert_status,
            hours_until_shift
          )
        `)
        .not('status', 'eq', 'archived')
        .order('time_range', { ascending: true });

      // Apply filters
      if (filters?.dateRange) {
        const startISO = filters.dateRange.start.toISOString();
        const endISO = filters.dateRange.end.toISOString();
        shiftsQuery = shiftsQuery
          .gte('time_range', `[${startISO},)`)
          .lt('time_range', `[${endISO},)`);
      }

      if (filters?.clients?.length) {
        shiftsQuery = shiftsQuery.or(
          filters.clients.map(client => `client_info->>name.ilike.%${client}%`).join(',')
        );
      }

      if (filters?.sites?.length) {
        shiftsQuery = shiftsQuery.or(
          filters.sites.map(site => 
            `location_data->>siteName.ilike.%${site}%,location_data->>address.ilike.%${site}%`
          ).join(',')
        );
      }

      if (filters?.guards?.length) {
        shiftsQuery = shiftsQuery.in('assigned_guard_id', filters.guards);
      }

      if (filters?.statuses?.length) {
        shiftsQuery = shiftsQuery.in('status', filters.statuses);
      }

      if (filters?.priorities?.length) {
        shiftsQuery = shiftsQuery.in('priority', filters.priorities);
      }

      if (filters?.assignmentStatus) {
        if (filters.assignmentStatus === 'assigned') {
          shiftsQuery = shiftsQuery.not('assigned_guard_id', 'is', null);
        } else if (filters.assignmentStatus === 'unassigned') {
          shiftsQuery = shiftsQuery.is('assigned_guard_id', null);
        }
      }

      if (filters?.urgentOnly) {
        shiftsQuery = shiftsQuery.not('shift_urgency_alerts', 'is', null);
      }

      const { data: shifts, error: shiftsError } = await shiftsQuery;

      if (shiftsError) {
        throw shiftsError;
      }

      // Get workflow columns configuration
      const columnsResult = await ShiftWorkflowService.getWorkflowConfig();
      if (!columnsResult.success) {
        throw new Error('Failed to get workflow configuration');
      }

      // Get active alerts
      const alertsResult = await UrgentAlertService.getActiveAlerts();
      const activeAlerts = alertsResult.success ? alertsResult.data || [] : [];

      // Get manager presence (placeholder)
      const activePresence = []; // Would implement real-time presence tracking

      // Calculate metrics
      const metricsResult = await this.calculateKanbanMetrics(shifts);
      const metrics = metricsResult.success ? metricsResult.data : {
        totalShifts: 0,
        shiftsByStatus: {},
        avgTimeToAssignment: 0,
        avgTimeToConfirmation: 0,
        completionRate: 0,
        urgentAlertsCount: 0,
        workflowBottlenecks: []
      };

      // Get recent activity
      const recentActivity = await this.getRecentKanbanActivity(managerId);

      const boardData: KanbanBoardData = {
        shifts: shifts || [],
        columns: columnsResult.data || [],
        filters: filters || {},
        activePresence,
        metrics: metrics || {} as KanbanMetrics,
        recentActivity: recentActivity.success ? recentActivity.data || [] : []
      };

      return {
        success: true,
        data: boardData
      };
    } catch (error) {
      console.error('Error getting Kanban board data:', error);
      return {
        success: false,
        error: {
          code: 'BOARD_DATA_ERROR',
          message: 'Failed to retrieve Kanban board data',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Move shift between Kanban columns
   */
  static async moveShift(
    shiftId: string,
    newStatus: string,
    managerId: string,
    reason?: string
  ): Promise<ServiceResult<any>> {
    try {
      const transitionResult = await ShiftWorkflowService.executeTransition(
        shiftId,
        newStatus as any,
        managerId,
        {
          transitionReason: reason,
          transitionMethod: 'manual'
        }
      );

      if (!transitionResult.success) {
        return {
          success: false,
          error: transitionResult.error
        };
      }

      // Record activity
      await this.recordKanbanActivity({
        activityType: 'shift_moved',
        managerId,
        details: {
          shiftId,
          newStatus,
          reason
        },
        affectedShifts: [shiftId]
      });

      // Check if this resolves any urgent alerts
      await this.checkAndResolveAlerts(shiftId, newStatus);

      return {
        success: true,
        data: transitionResult.data
      };
    } catch (error) {
      console.error('Error moving shift:', error);
      return {
        success: false,
        error: {
          code: 'MOVE_ERROR',
          message: 'Failed to move shift',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Execute bulk operations on multiple shifts
   */
  static async executeBulkAction(
    request: BulkActionRequest,
    executedBy: string
  ): Promise<ServiceResult<BulkOperation>> {
    try {
      const bulkOperationId = crypto.randomUUID();
      const operation: BulkOperation = {
        id: bulkOperationId,
        operationType: request.action,
        shiftIds: request.shiftIds,
        parameters: request.parameters,
        executedBy,
        executedAt: new Date(),
        status: 'executing',
        results: []
      };

      const results = [];

      for (const shiftId of request.shiftIds) {
        try {
          let result;

          switch (request.action) {
            case 'status_change':
              if (!request.parameters.newStatus) {
                throw new Error('New status required for status change');
              }
              result = await ShiftWorkflowService.executeTransition(
                shiftId,
                request.parameters.newStatus as any,
                executedBy,
                {
                  transitionReason: request.reason,
                  transitionMethod: 'bulk',
                  bulkOperationId
                }
              );
              break;

            case 'assign':
              if (!request.parameters.guardId) {
                throw new Error('Guard ID required for assignment');
              }
              // Would integrate with Story 3.2 assignment service
              result = { success: true, data: { assigned: true } };
              break;

            case 'priority_update':
              if (request.parameters.priority === undefined) {
                throw new Error('Priority value required for priority update');
              }
              const { error: priorityError } = await this.supabase
                .from('shifts')
                .update({ 
                  priority: request.parameters.priority,
                  updated_at: new Date().toISOString()
                })
                .eq('id', shiftId);

              if (priorityError) throw priorityError;
              result = { success: true, data: { priority: request.parameters.priority } };
              break;

            case 'notification':
              // Would implement notification system
              result = { success: true, data: { notified: true } };
              break;

            case 'clone':
              // Would implement shift cloning
              result = { success: true, data: { cloned: true } };
              break;

            default:
              throw new Error(`Unsupported bulk action: ${request.action}`);
          }

          results.push({
            shiftId,
            success: result.success,
            newValue: result.data,
            error: result.success ? undefined : result.error?.message
          });

        } catch (error) {
          results.push({
            shiftId,
            success: false,
            error: String(error)
          });
        }
      }

      operation.results = results;
      operation.status = results.every(r => r.success) ? 'completed' : 'failed';

      // Record bulk operation activity
      await this.recordKanbanActivity({
        activityType: 'bulk_operation',
        managerId: executedBy,
        details: {
          operationType: request.action,
          affectedCount: results.filter(r => r.success).length,
          totalCount: request.shiftIds.length,
          bulkOperationId
        },
        affectedShifts: request.shiftIds
      });

      return {
        success: true,
        data: operation
      };
    } catch (error) {
      console.error('Error executing bulk action:', error);
      return {
        success: false,
        error: {
          code: 'BULK_ACTION_ERROR',
          message: 'Failed to execute bulk action',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Get Kanban performance metrics
   */
  private static async calculateKanbanMetrics(shifts: any[]): Promise<ServiceResult<KanbanMetrics>> {
    try {
      const totalShifts = shifts.length;
      
      // Count shifts by status
      const shiftsByStatus = shifts.reduce((acc, shift) => {
        acc[shift.status] = (acc[shift.status] || 0) + 1;
        return acc;
      }, {});

      // Calculate timing metrics (would need historical data)
      const avgTimeToAssignment = 0; // Placeholder
      const avgTimeToConfirmation = 0; // Placeholder

      // Calculate completion rate
      const completedShifts = shifts.filter(s => s.status === 'completed').length;
      const completionRate = totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0;

      // Count urgent alerts
      const urgentAlertsCount = shifts.filter(s => 
        s.shift_urgency_alerts && s.shift_urgency_alerts.length > 0
      ).length;

      // Identify workflow bottlenecks
      const workflowBottlenecks = Object.entries(shiftsByStatus)
        .map(([status, count]) => ({
          status: status as any,
          avgDwellTime: 0, // Would calculate from historical data
          shiftCount: count as number
        }))
        .filter(bottleneck => bottleneck.shiftCount > totalShifts * 0.2); // Bottlenecks with >20% of shifts

      const metrics: KanbanMetrics = {
        totalShifts,
        shiftsByStatus,
        avgTimeToAssignment,
        avgTimeToConfirmation,
        completionRate,
        urgentAlertsCount,
        workflowBottlenecks
      };

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      console.error('Error calculating Kanban metrics:', error);
      return {
        success: false,
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to calculate Kanban metrics',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Get recent Kanban activity
   */
  private static async getRecentKanbanActivity(
    managerId?: string
  ): Promise<ServiceResult<KanbanActivity[]>> {
    try {
      // Get recent workflow transitions
      let query = this.supabase
        .from('shift_workflow_history')
        .select(`
          id,
          shift_id,
          previous_status,
          new_status,
          transition_method,
          changed_at,
          changed_by,
          bulk_operation_id
        `)
        .order('changed_at', { ascending: false })
        .limit(20);

      if (managerId) {
        query = query.eq('changed_by', managerId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const activities: KanbanActivity[] = data.map(item => ({
        id: item.id,
        activityType: 'shift_moved',
        managerId: item.changed_by,
        managerName: 'Manager', // Would resolve from user data
        timestamp: new Date(item.changed_at),
        details: {
          previousStatus: item.previous_status,
          newStatus: item.new_status,
          transitionMethod: item.transition_method,
          bulkOperationId: item.bulk_operation_id
        },
        affectedShifts: [item.shift_id]
      }));

      return {
        success: true,
        data: activities
      };
    } catch (error) {
      console.error('Error getting recent Kanban activity:', error);
      return {
        success: false,
        error: {
          code: 'ACTIVITY_ERROR',
          message: 'Failed to retrieve recent activity',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Record Kanban activity for audit and collaboration
   */
  private static async recordKanbanActivity(activity: {
    activityType: KanbanActivity['activityType'];
    managerId: string;
    details: Record<string, any>;
    affectedShifts?: string[];
  }): Promise<void> {
    try {
      // This would integrate with a real-time activity tracking system
      // For now, we'll use the workflow history as activity source
      
      console.log('Kanban activity recorded:', {
        type: activity.activityType,
        manager: activity.managerId,
        timestamp: new Date().toISOString(),
        details: activity.details,
        shifts: activity.affectedShifts
      });

      // Could also trigger real-time notifications to other managers
      // using Supabase real-time subscriptions
      
    } catch (error) {
      console.error('Error recording Kanban activity:', error);
      // Don't throw error as this is non-critical
    }
  }

  /**
   * Check and resolve alerts when shift status changes
   */
  private static async checkAndResolveAlerts(shiftId: string, newStatus: string): Promise<void> {
    try {
      // Get active alerts for this shift
      const { data: alerts } = await this.supabase
        .from('shift_urgency_alerts')
        .select('id, alert_type')
        .eq('shift_id', shiftId)
        .eq('alert_status', 'active');

      if (!alerts || alerts.length === 0) {
        return;
      }

      // Determine which alerts to resolve based on new status
      const alertsToResolve: string[] = [];

      for (const alert of alerts) {
        let shouldResolve = false;

        switch (alert.alert_type) {
          case 'unassigned_24h':
            shouldResolve = ['assigned', 'confirmed', 'in_progress', 'completed'].includes(newStatus);
            break;
          case 'unconfirmed_12h':
            shouldResolve = ['confirmed', 'in_progress', 'completed'].includes(newStatus);
            break;
          case 'no_show_risk':
            shouldResolve = ['in_progress', 'completed'].includes(newStatus);
            break;
          case 'understaffed':
            shouldResolve = ['assigned', 'confirmed', 'in_progress', 'completed'].includes(newStatus);
            break;
          case 'certification_gap':
            shouldResolve = false; // Requires manual resolution
            break;
        }

        if (shouldResolve) {
          alertsToResolve.push(alert.id);
        }
      }

      // Resolve alerts
      for (const alertId of alertsToResolve) {
        await UrgentAlertService.resolveAlert(
          alertId,
          'system',
          `Auto-resolved due to status change to ${newStatus}`
        );
      }
    } catch (error) {
      console.error('Error checking and resolving alerts:', error);
      // Don't throw error as this is non-critical
    }
  }
}