// Story 3.2: Assignment Service Implementation
// Core assignment operations with conflict detection and workflow management

import { supabase } from '@/lib/supabase';
import {
  ServiceResult,
  ShiftAssignment,
  AssignmentCreateData,
  GuardResponseData,
  BatchAssignmentRequest,
  BatchAssignmentResult,
  AssignmentConflict,
  AssignmentErrorCodes,
  AssignmentStatus,
  GuardResponse,
  AssignmentMethod
} from '@/lib/types/assignment-types';
import { ConflictDetectionService } from './conflict-detection-service';
import { GuardEligibilityService } from './guard-eligibility-service';

export class AssignmentService {
  /**
   * Create a new shift assignment with comprehensive validation
   */
  static async createAssignment(
    assignmentData: AssignmentCreateData,
    assignedBy: string
  ): Promise<ServiceResult<ShiftAssignment>> {
    try {
      const { shiftId, guardId, overrideConflicts = false } = assignmentData;

      // 1. Validate shift exists and is assignable
      const { data: shift, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (shiftError || !shift) {
        return {
          success: false,
          error: {
            code: AssignmentErrorCodes.SHIFT_NOT_FOUND,
            message: 'Shift not found or not accessible',
            details: shiftError
          }
        };
      }

      // 2. Check if shift is already assigned
      const { data: existingAssignment } = await supabase
        .from('shift_assignments')
        .select('id')
        .eq('shift_id', shiftId)
        .single();

      if (existingAssignment) {
        return {
          success: false,
          error: {
            code: AssignmentErrorCodes.ASSIGNMENT_EXISTS,
            message: 'Shift is already assigned to another guard'
          }
        };
      }

      // 3. Validate guard eligibility
      const eligibilityResult = await GuardEligibilityService.checkGuardEligibility(guardId, shift);
      
      if (!eligibilityResult.eligible && !overrideConflicts) {
        return {
          success: false,
          error: {
            code: AssignmentErrorCodes.GUARD_NOT_ELIGIBLE,
            message: 'Guard is not eligible for this assignment',
            details: {
              reasons: eligibilityResult.reasons,
              conflicts: eligibilityResult.conflicts
            }
          }
        };
      }

      // 4. Detect and validate conflicts
      const conflictResult = await ConflictDetectionService.detectAssignmentConflicts(
        guardId,
        shiftId,
        overrideConflicts
      );

      if (!conflictResult.success) {
        return {
          success: false,
          error: {
            code: 'CONFLICT_DETECTION_FAILED',
            message: 'Failed to validate assignment conflicts',
            details: conflictResult.error
          }
        };
      }

      const { conflicts, canProceed, requiresOverride } = conflictResult.data!;

      // 5. Handle conflicts
      if (!canProceed && !overrideConflicts) {
        return {
          success: false,
          error: {
            code: AssignmentErrorCodes.CONFLICT_OVERRIDE_REQUIRED,
            message: 'Assignment has conflicts that require override',
            details: {
              conflicts,
              requiresOverride
            }
          }
        };
      }

      if (requiresOverride && !assignmentData.overrideReason) {
        return {
          success: false,
          error: {
            code: AssignmentErrorCodes.CONFLICT_OVERRIDE_REQUIRED,
            message: 'Override reason is required for conflicted assignments',
            details: { conflicts }
          }
        };
      }

      // 6. Create assignment record
      const assignmentRecord = {
        shift_id: shiftId,
        guard_id: guardId,
        assignment_status: 'pending' as AssignmentStatus,
        assigned_by: assignedBy,
        assignment_method: assignmentData.assignmentMethod || 'manual' as AssignmentMethod,
        eligibility_score: eligibilityResult.eligibilityScore,
        conflict_overridden: overrideConflicts && conflicts.length > 0,
        override_reason: assignmentData.overrideReason,
        override_by: overrideConflicts ? assignedBy : null,
        override_at: overrideConflicts ? new Date().toISOString() : null,
        assignment_notes: assignmentData.assignmentNotes,
        manager_notes: assignmentData.managerNotes
      };

      const { data: newAssignment, error: assignmentError } = await supabase
        .from('shift_assignments')
        .insert(assignmentRecord)
        .select('*')
        .single();

      if (assignmentError) {
        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to create assignment',
            details: assignmentError
          }
        };
      }

      // 7. Update shift's assigned_guard_id field
      const { error: shiftUpdateError } = await supabase
        .from('shifts')
        .update({ assigned_guard_id: guardId })
        .eq('id', shiftId);

      if (shiftUpdateError) {
        // Rollback assignment creation
        await supabase
          .from('shift_assignments')
          .delete()
          .eq('id', newAssignment.id);

        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to update shift assignment',
            details: shiftUpdateError
          }
        };
      }

      // 8. TODO: Send notification to guard
      // await this.sendAssignmentNotification(newAssignment.id);

      return {
        success: true,
        data: this.mapDatabaseAssignmentToInterface(newAssignment)
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to create assignment',
          details: error
        }
      };
    }
  }

  /**
   * Handle guard response to assignment
   */
  static async handleGuardResponse(
    assignmentId: string,
    responseData: GuardResponseData
  ): Promise<ServiceResult<ShiftAssignment>> {
    try {
      // 1. Get assignment details
      const { data: assignment, error: assignmentError } = await supabase
        .from('shift_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (assignmentError || !assignment) {
        return {
          success: false,
          error: {
            code: AssignmentErrorCodes.ASSIGNMENT_NOT_FOUND,
            message: 'Assignment not found',
            details: assignmentError
          }
        };
      }

      // 2. Validate assignment status
      if (assignment.assignment_status !== 'pending') {
        return {
          success: false,
          error: {
            code: AssignmentErrorCodes.INVALID_ASSIGNMENT_STATUS,
            message: `Cannot respond to assignment with status: ${assignment.assignment_status}`
          }
        };
      }

      // 3. Check if response is within deadline (24 hours by default)
      const assignedAt = new Date(assignment.assigned_at);
      const responseDeadline = new Date(assignedAt.getTime() + (24 * 60 * 60 * 1000));
      const now = new Date();

      if (now > responseDeadline) {
        // Mark as expired
        await supabase
          .from('shift_assignments')
          .update({ assignment_status: 'expired' })
          .eq('id', assignmentId);

        return {
          success: false,
          error: {
            code: AssignmentErrorCodes.RESPONSE_DEADLINE_PASSED,
            message: 'Response deadline has passed, assignment marked as expired'
          }
        };
      }

      // 4. Update assignment with guard response
      const updateData: any = {
        guard_response: responseData.response,
        guard_responded_at: new Date().toISOString(),
        guard_response_notes: responseData.notes,
        assignment_status: responseData.response === 'accept' ? 'accepted' : 'declined'
      };

      // Handle conditional acceptance
      if (responseData.response === 'conditional' && responseData.conditionalDetails) {
        updateData.assignment_status = 'accepted'; // Treat as accepted for now
        updateData.guard_response_notes = JSON.stringify({
          notes: responseData.notes,
          conditionalDetails: responseData.conditionalDetails
        });
      }

      const { data: updatedAssignment, error: updateError } = await supabase
        .from('shift_assignments')
        .update(updateData)
        .eq('id', assignmentId)
        .select('*')
        .single();

      if (updateError) {
        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to update assignment with guard response',
            details: updateError
          }
        };
      }

      // 5. Handle declined assignments
      if (responseData.response === 'decline') {
        // Unassign guard from shift
        await supabase
          .from('shifts')
          .update({ assigned_guard_id: null })
          .eq('id', assignment.shift_id);
        
        // TODO: Notify manager and suggest alternatives
        // await this.sendDeclinationNotification(assignmentId);
      }

      // 6. TODO: Send confirmation notification
      // await this.sendResponseConfirmationNotification(assignmentId);

      return {
        success: true,
        data: this.mapDatabaseAssignmentToInterface(updatedAssignment)
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to handle guard response',
          details: error
        }
      };
    }
  }

  /**
   * Get assignment details with related data
   */
  static async getAssignment(assignmentId: string): Promise<ServiceResult<ShiftAssignment & {
    shift?: any;
    guard?: any;
  }>> {
    try {
      const { data: assignment, error } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          shifts (*),
          guard_profiles:guard_id (
            id,
            first_name,
            last_name,
            profile_status
          )
        `)
        .eq('id', assignmentId)
        .single();

      if (error || !assignment) {
        return {
          success: false,
          error: {
            code: AssignmentErrorCodes.ASSIGNMENT_NOT_FOUND,
            message: 'Assignment not found',
            details: error
          }
        };
      }

      return {
        success: true,
        data: {
          ...this.mapDatabaseAssignmentToInterface(assignment),
          shift: assignment.shifts,
          guard: assignment.guard_profiles
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to get assignment details',
          details: error
        }
      };
    }
  }

  /**
   * Get assignments for a guard with filtering
   */
  static async getGuardAssignments(
    guardId: string,
    options: {
      status?: AssignmentStatus[];
      dateRange?: { start: Date; end: Date };
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ServiceResult<{
    assignments: ShiftAssignment[];
    total: number;
  }>> {
    try {
      let query = supabase
        .from('shift_assignments')
        .select('*, shifts (*)', { count: 'exact' })
        .eq('guard_id', guardId);

      // Apply filters
      if (options.status && options.status.length > 0) {
        query = query.in('assignment_status', options.status);
      }

      if (options.dateRange) {
        query = query
          .gte('assigned_at', options.dateRange.start.toISOString())
          .lte('assigned_at', options.dateRange.end.toISOString());
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);
      }

      // Order by most recent first
      query = query.order('assigned_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to get guard assignments',
            details: error
          }
        };
      }

      return {
        success: true,
        data: {
          assignments: (data || []).map(a => this.mapDatabaseAssignmentToInterface(a)),
          total: count || 0
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to get guard assignments',
          details: error
        }
      };
    }
  }

  /**
   * Cancel an assignment
   */
  static async cancelAssignment(
    assignmentId: string,
    cancelledBy: string,
    reason: string
  ): Promise<ServiceResult<ShiftAssignment>> {
    try {
      // Get assignment details
      const { data: assignment, error: assignmentError } = await supabase
        .from('shift_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (assignmentError || !assignment) {
        return {
          success: false,
          error: {
            code: AssignmentErrorCodes.ASSIGNMENT_NOT_FOUND,
            message: 'Assignment not found',
            details: assignmentError
          }
        };
      }

      // Update assignment status
      const { data: updatedAssignment, error: updateError } = await supabase
        .from('shift_assignments')
        .update({
          assignment_status: 'cancelled',
          manager_notes: `${assignment.manager_notes || ''}\n\nCancelled: ${reason}`.trim()
        })
        .eq('id', assignmentId)
        .select('*')
        .single();

      if (updateError) {
        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to cancel assignment',
            details: updateError
          }
        };
      }

      // Unassign from shift
      await supabase
        .from('shifts')
        .update({ assigned_guard_id: null })
        .eq('id', assignment.shift_id);

      // TODO: Send cancellation notification
      // await this.sendCancellationNotification(assignmentId, reason);

      return {
        success: true,
        data: this.mapDatabaseAssignmentToInterface(updatedAssignment)
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to cancel assignment',
          details: error
        }
      };
    }
  }

  /**
   * Batch assignment creation with transaction management
   */
  static async createBatchAssignments(
    batchRequest: BatchAssignmentRequest,
    assignedBy: string
  ): Promise<ServiceResult<BatchAssignmentResult>> {
    try {
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const results: BatchAssignmentResult = {
        batchId,
        totalAssignments: batchRequest.assignments.length,
        successfulAssignments: 0,
        failedAssignments: 0,
        assignments: [],
        startedAt: new Date(),
        status: 'processing'
      };

      // Process each assignment
      for (const assignmentData of batchRequest.assignments) {
        try {
          const result = await this.createAssignment(assignmentData, assignedBy);
          
          if (result.success) {
            results.successfulAssignments++;
            results.assignments.push({
              assignment: assignmentData,
              success: true,
              assignmentId: result.data!.id
            });
          } else {
            results.failedAssignments++;
            results.assignments.push({
              assignment: assignmentData,
              success: false,
              error: result.error?.message || 'Unknown error',
              conflicts: result.error?.details?.conflicts
            });

            // If not allowing partial success, stop processing
            if (!batchRequest.allowPartialSuccess) {
              results.status = 'failed';
              break;
            }
          }
        } catch (error) {
          results.failedAssignments++;
          results.assignments.push({
            assignment: assignmentData,
            success: false,
            error: 'Processing error occurred'
          });
        }
      }

      results.completedAt = new Date();
      
      if (results.failedAssignments === 0) {
        results.status = 'completed';
      } else if (results.successfulAssignments > 0) {
        results.status = 'partially_completed';
      } else {
        results.status = 'failed';
      }

      return {
        success: true,
        data: results
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: AssignmentErrorCodes.BATCH_OPERATION_FAILED,
          message: 'Failed to process batch assignments',
          details: error
        }
      };
    }
  }

  /**
   * Map database assignment record to interface
   */
  private static mapDatabaseAssignmentToInterface(dbAssignment: any): ShiftAssignment {
    return {
      id: dbAssignment.id,
      shiftId: dbAssignment.shift_id,
      guardId: dbAssignment.guard_id,
      assignmentStatus: dbAssignment.assignment_status,
      assignedBy: dbAssignment.assigned_by,
      assignedAt: new Date(dbAssignment.assigned_at),
      guardResponse: dbAssignment.guard_response,
      guardRespondedAt: dbAssignment.guard_responded_at ? new Date(dbAssignment.guard_responded_at) : undefined,
      guardResponseNotes: dbAssignment.guard_response_notes,
      eligibilityScore: dbAssignment.eligibility_score,
      assignmentMethod: dbAssignment.assignment_method,
      conflictOverridden: dbAssignment.conflict_overridden,
      overrideReason: dbAssignment.override_reason,
      overrideBy: dbAssignment.override_by,
      overrideAt: dbAssignment.override_at ? new Date(dbAssignment.override_at) : undefined,
      assignmentNotes: dbAssignment.assignment_notes,
      managerNotes: dbAssignment.manager_notes,
      createdAt: new Date(dbAssignment.created_at),
      updatedAt: new Date(dbAssignment.updated_at)
    };
  }
}