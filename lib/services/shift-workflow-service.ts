// Story 3.4: Shift Workflow Management Service
// Handles Kanban workflow transitions and validation

import { createClient } from '@/lib/supabase';
import type { 
  KanbanStatus, 
  TransitionMethod, 
  StatusTransition, 
  WorkflowTransition 
} from '@/lib/types/kanban-types';
import type { ServiceResult } from '@/lib/types/service-types';

export class ShiftWorkflowService {
  private static supabase = createClient();

  // Kanban Workflow Configuration
  private static readonly WORKFLOW_COLUMNS = [
    {
      id: 'unassigned' as KanbanStatus,
      title: 'Unassigned',
      description: 'Shifts awaiting guard assignment',
      color: 'bg-red-100 border-red-300',
      allowedTransitions: ['assigned', 'issue_logged'] as KanbanStatus[],
      requiresValidation: true
    },
    {
      id: 'assigned' as KanbanStatus,
      title: 'Assigned', 
      description: 'Shifts assigned to guards but not confirmed',
      color: 'bg-yellow-100 border-yellow-300',
      allowedTransitions: ['confirmed', 'unassigned', 'issue_logged'] as KanbanStatus[],
      requiresValidation: true
    },
    {
      id: 'confirmed' as KanbanStatus,
      title: 'Confirmed',
      description: 'Guards have confirmed availability',
      color: 'bg-blue-100 border-blue-300', 
      allowedTransitions: ['in_progress', 'assigned', 'issue_logged'] as KanbanStatus[],
      requiresValidation: true
    },
    {
      id: 'in_progress' as KanbanStatus,
      title: 'In Progress',
      description: 'Shifts currently active',
      color: 'bg-purple-100 border-purple-300',
      allowedTransitions: ['completed', 'issue_logged'] as KanbanStatus[],
      requiresValidation: true
    },
    {
      id: 'completed' as KanbanStatus,
      title: 'Completed',
      description: 'Successfully completed shifts', 
      color: 'bg-green-100 border-green-300',
      allowedTransitions: ['archived', 'issue_logged'] as KanbanStatus[],
      requiresValidation: false
    },
    {
      id: 'issue_logged' as KanbanStatus,
      title: 'Issue Logged',
      description: 'Shifts with reported issues',
      color: 'bg-orange-100 border-orange-300',
      allowedTransitions: ['unassigned', 'assigned', 'confirmed', 'completed', 'archived'] as KanbanStatus[],
      requiresValidation: true
    },
    {
      id: 'archived' as KanbanStatus,
      title: 'Archived',
      description: 'Historical completed shifts',
      color: 'bg-gray-100 border-gray-300',
      allowedTransitions: [] as KanbanStatus[],
      requiresValidation: false
    }
  ];

  /**
   * Get workflow configuration for Kanban board
   */
  static async getWorkflowConfig(): Promise<ServiceResult<typeof ShiftWorkflowService.WORKFLOW_COLUMNS>> {
    try {
      return {
        success: true,
        data: ShiftWorkflowService.WORKFLOW_COLUMNS
      };
    } catch (error) {
      console.error('Error getting workflow config:', error);
      return {
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'Failed to get workflow configuration',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Validate status transition
   */
  static async validateTransition(
    fromStatus: KanbanStatus, 
    toStatus: KanbanStatus,
    shiftId: string
  ): Promise<ServiceResult<StatusTransition>> {
    try {
      const fromColumn = this.WORKFLOW_COLUMNS.find(col => col.id === fromStatus);
      const toColumn = this.WORKFLOW_COLUMNS.find(col => col.id === toStatus);

      if (!fromColumn || !toColumn) {
        return {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Invalid status provided for transition'
          }
        };
      }

      const isValidTransition = fromColumn.allowedTransitions.includes(toStatus);
      const businessRules: string[] = [];
      const validationRules: string[] = [];

      // Business rule validations
      if (toStatus === 'assigned') {
        validationRules.push('GUARD_ASSIGNMENT_REQUIRED');
      }

      if (toStatus === 'confirmed') {
        validationRules.push('GUARD_CONFIRMATION_REQUIRED');
      }

      if (toStatus === 'in_progress') {
        validationRules.push('SHIFT_TIME_VALIDATION_REQUIRED');
      }

      if (toStatus === 'completed') {
        validationRules.push('COMPLETION_CRITERIA_MET');
      }

      // Check business rules if validation required
      if (fromColumn.requiresValidation && validationRules.length > 0) {
        const validationResult = await this.validateBusinessRules(shiftId, validationRules);
        if (!validationResult.success) {
          return {
            success: false,
            error: validationResult.error
          };
        }
        businessRules.push(...(validationResult.data || []));
      }

      return {
        success: true,
        data: {
          fromStatus,
          toStatus,
          isValid: isValidTransition,
          requiresApproval: ['archived'].includes(toStatus),
          validationRules,
          businessRules
        }
      };
    } catch (error) {
      console.error('Error validating transition:', error);
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate status transition',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Execute workflow transition
   */
  static async executeTransition(
    shiftId: string,
    newStatus: KanbanStatus,
    changedBy: string,
    options: {
      transitionReason?: string;
      transitionMethod?: TransitionMethod;
      bulkOperationId?: string;
      bypassValidation?: boolean;
    } = {}
  ): Promise<ServiceResult<WorkflowTransition>> {
    try {
      // Get current shift status
      const { data: shift } = await this.supabase
        .from('shifts')
        .select('status')
        .eq('id', shiftId)
        .single();

      if (!shift) {
        return {
          success: false,
          error: {
            code: 'SHIFT_NOT_FOUND',
            message: 'Shift not found'
          }
        };
      }

      const currentStatus = shift.status as KanbanStatus;

      // Validate transition unless bypassed
      if (!options.bypassValidation) {
        const validation = await this.validateTransition(currentStatus, newStatus, shiftId);
        if (!validation.success || !validation.data?.isValid) {
          return {
            success: false,
            error: validation.error || {
              code: 'INVALID_TRANSITION',
              message: `Invalid transition from ${currentStatus} to ${newStatus}`
            }
          };
        }
      }

      // Update shift status
      const { error: updateError } = await this.supabase
        .from('shifts')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', shiftId);

      if (updateError) {
        throw updateError;
      }

      // Record workflow transition
      const transitionData = {
        shift_id: shiftId,
        previous_status: currentStatus,
        new_status: newStatus,
        transition_reason: options.transitionReason,
        changed_by: changedBy,
        kanban_column_changed: true,
        transition_method: options.transitionMethod || 'manual',
        bulk_operation_id: options.bulkOperationId
      };

      const { data: transition, error: transitionError } = await this.supabase
        .from('shift_workflow_history')
        .insert(transitionData)
        .select()
        .single();

      if (transitionError) {
        throw transitionError;
      }

      return {
        success: true,
        data: {
          id: transition.id,
          shiftId: transition.shift_id,
          previousStatus: transition.previous_status,
          newStatus: transition.new_status,
          transitionReason: transition.transition_reason,
          changedBy: transition.changed_by,
          changedAt: new Date(transition.changed_at),
          kanbanColumnChanged: transition.kanban_column_changed,
          transitionMethod: transition.transition_method,
          bulkOperationId: transition.bulk_operation_id
        }
      };
    } catch (error) {
      console.error('Error executing workflow transition:', error);
      return {
        success: false,
        error: {
          code: 'TRANSITION_ERROR',
          message: 'Failed to execute workflow transition',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Get workflow history for a shift
   */
  static async getWorkflowHistory(
    shiftId: string,
    limit = 20
  ): Promise<ServiceResult<WorkflowTransition[]>> {
    try {
      const { data, error } = await this.supabase
        .from('shift_workflow_history')
        .select('*')
        .eq('shift_id', shiftId)
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      const transitions: WorkflowTransition[] = data.map(item => ({
        id: item.id,
        shiftId: item.shift_id,
        previousStatus: item.previous_status,
        newStatus: item.new_status,
        transitionReason: item.transition_reason,
        changedBy: item.changed_by,
        changedAt: new Date(item.changed_at),
        kanbanColumnChanged: item.kanban_column_changed,
        transitionMethod: item.transition_method,
        bulkOperationId: item.bulk_operation_id
      }));

      return {
        success: true,
        data: transitions
      };
    } catch (error) {
      console.error('Error getting workflow history:', error);
      return {
        success: false,
        error: {
          code: 'HISTORY_ERROR',
          message: 'Failed to retrieve workflow history',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Validate business rules for status transitions
   */
  private static async validateBusinessRules(
    shiftId: string,
    rules: string[]
  ): Promise<ServiceResult<string[]>> {
    try {
      const { data: shift } = await this.supabase
        .from('shifts')
        .select(`
          *,
          shift_assignments!left(*)
        `)
        .eq('id', shiftId)
        .single();

      if (!shift) {
        return {
          success: false,
          error: {
            code: 'SHIFT_NOT_FOUND',
            message: 'Shift not found for validation'
          }
        };
      }

      const validationResults: string[] = [];

      for (const rule of rules) {
        switch (rule) {
          case 'GUARD_ASSIGNMENT_REQUIRED':
            if (!shift.assigned_guard_id) {
              return {
                success: false,
                error: {
                  code: 'GUARD_ASSIGNMENT_REQUIRED',
                  message: 'Guard assignment required before changing status to assigned'
                }
              };
            }
            validationResults.push('Guard assignment validated');
            break;

          case 'GUARD_CONFIRMATION_REQUIRED':
            // Check if guard has confirmed (integration with Story 3.2)
            if (!shift.shift_assignments || shift.shift_assignments.length === 0) {
              return {
                success: false,
                error: {
                  code: 'GUARD_CONFIRMATION_REQUIRED',
                  message: 'Guard confirmation required before changing status to confirmed'
                }
              };
            }
            validationResults.push('Guard confirmation validated');
            break;

          case 'SHIFT_TIME_VALIDATION_REQUIRED':
            const shiftStart = new Date(shift.time_range.split(',')[0].replace('[', '').replace('"', ''));
            const now = new Date();
            if (shiftStart > now) {
              return {
                success: false,
                error: {
                  code: 'SHIFT_NOT_STARTED',
                  message: 'Shift cannot be marked in progress before start time'
                }
              };
            }
            validationResults.push('Shift timing validated');
            break;

          case 'COMPLETION_CRITERIA_MET':
            // Basic completion validation (can be extended)
            if (!shift.assigned_guard_id) {
              return {
                success: false,
                error: {
                  code: 'COMPLETION_CRITERIA_NOT_MET',
                  message: 'Cannot complete shift without guard assignment'
                }
              };
            }
            validationResults.push('Completion criteria validated');
            break;
        }
      }

      return {
        success: true,
        data: validationResults
      };
    } catch (error) {
      console.error('Error validating business rules:', error);
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate business rules',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Get workflow statistics
   */
  static async getWorkflowStatistics(
    dateRange?: { start: Date; end: Date }
  ): Promise<ServiceResult<Record<KanbanStatus, number>>> {
    try {
      let query = this.supabase
        .from('shifts')
        .select('status');

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const statistics: Record<KanbanStatus, number> = {
        unassigned: 0,
        assigned: 0,
        confirmed: 0,
        in_progress: 0,
        completed: 0,
        issue_logged: 0,
        archived: 0
      };

      data.forEach(shift => {
        const status = shift.status as KanbanStatus;
        if (status in statistics) {
          statistics[status]++;
        }
      });

      return {
        success: true,
        data: statistics
      };
    } catch (error) {
      console.error('Error getting workflow statistics:', error);
      return {
        success: false,
        error: {
          code: 'STATISTICS_ERROR',
          message: 'Failed to retrieve workflow statistics',
          details: { error: String(error) }
        }
      };
    }
  }
}