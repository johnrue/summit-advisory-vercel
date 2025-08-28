// Story 3.3: Time-Off Request Service
// Manages time-off requests with approval workflow and conflict checking

import { createClient } from '@/lib/supabase';
import { 
  TimeOffRequest,
  ServiceResult,
  TimeOffStatus,
  TimeOffType,
  AvailabilityConflict
} from '@/lib/types/availability-types';
import { GuardAvailabilityService } from './guard-availability-service';

export class TimeOffRequestService {
  private static supabase = createClient();

  // Core time-off request management
  static async createTimeOffRequest(
    guardId: string,
    requestData: {
      requestType: TimeOffType;
      startDate: Date;
      endDate: Date;
      reason?: string;
    }
  ): Promise<ServiceResult<TimeOffRequest>> {
    try {
      // Validate date range
      if (requestData.startDate >= requestData.endDate) {
        return {
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'Start date must be before end date',
            details: { requestData }
          }
        };
      }

      // Check for conflicts with existing assignments
      const conflictCheck = await this.checkTimeOffConflicts(
        guardId,
        requestData.startDate,
        requestData.endDate
      );

      if (!conflictCheck.success) {
        return conflictCheck as ServiceResult<TimeOffRequest>;
      }

      const hasConflicts = conflictCheck.data && conflictCheck.data.length > 0;
      const conflictingShifts = hasConflicts 
        ? conflictCheck.data!.flatMap(c => c.conflictingItems)
        : [];

      const requestRecord = {
        guard_id: guardId,
        request_type: requestData.requestType,
        date_range: `[${requestData.startDate.toISOString()},${requestData.endDate.toISOString()})`,
        reason: requestData.reason,
        status: 'pending',
        has_conflicts: hasConflicts,
        conflicting_shifts: conflictingShifts,
        replacement_required: hasConflicts && conflictingShifts.length > 0
      };

      const { data, error } = await this.supabase
        .from('time_off_requests')
        .insert(requestRecord)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'CREATE_TIME_OFF_REQUEST_ERROR',
            message: 'Failed to create time-off request',
            details: { error, requestRecord }
          }
        };
      }

      // If emergency request, mark as high priority and send immediate notifications
      if (requestData.requestType === 'emergency') {
        await this.sendEmergencyNotifications(guardId, data.id);
      }

      return {
        success: true,
        data: this.transformTimeOffRecord(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TIME_OFF_SERVICE_ERROR',
          message: 'Unexpected error creating time-off request',
          details: { error, guardId, requestData }
        }
      };
    }
  }

  static async getTimeOffRequests(
    guardId?: string,
    status?: TimeOffStatus,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<TimeOffRequest[]>> {
    try {
      let query = this.supabase
        .from('time_off_requests')
        .select('*');

      if (guardId) {
        query = query.eq('guard_id', guardId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (startDate) {
        query = query.gte('date_range', `[${startDate.toISOString()},)`);
      }

      if (endDate) {
        query = query.lt('date_range', `[,${endDate.toISOString()})`);
      }

      const { data, error } = await query.order('requested_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: {
            code: 'FETCH_TIME_OFF_REQUESTS_ERROR',
            message: 'Failed to fetch time-off requests',
            details: { error, guardId, status }
          }
        };
      }

      const requests = data?.map(record => this.transformTimeOffRecord(record)) || [];

      return {
        success: true,
        data: requests
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TIME_OFF_SERVICE_ERROR',
          message: 'Unexpected error fetching time-off requests',
          details: { error, guardId, status }
        }
      };
    }
  }

  static async updateTimeOffRequest(
    requestId: string,
    updates: Partial<TimeOffRequest>
  ): Promise<ServiceResult<TimeOffRequest>> {
    try {
      const updateRecord: any = {};

      if (updates.reason !== undefined) updateRecord.reason = updates.reason;
      if (updates.status) updateRecord.status = updates.status;
      if (updates.approvalNotes !== undefined) updateRecord.approval_notes = updates.approvalNotes;
      
      if (updates.dateRange) {
        updateRecord.date_range = `[${updates.dateRange.start.toISOString()},${updates.dateRange.end.toISOString()})`;
        
        // Recheck conflicts if date range changed
        const conflictCheck = await this.checkTimeOffConflicts(
          updates.guardId!,
          updates.dateRange.start,
          updates.dateRange.end
        );
        
        if (conflictCheck.success) {
          const hasConflicts = conflictCheck.data && conflictCheck.data.length > 0;
          updateRecord.has_conflicts = hasConflicts;
          updateRecord.conflicting_shifts = hasConflicts 
            ? conflictCheck.data!.flatMap(c => c.conflictingItems)
            : [];
          updateRecord.replacement_required = hasConflicts && updateRecord.conflicting_shifts.length > 0;
        }
      }

      const { data, error } = await this.supabase
        .from('time_off_requests')
        .update(updateRecord)
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'UPDATE_TIME_OFF_REQUEST_ERROR',
            message: 'Failed to update time-off request',
            details: { error, requestId, updates }
          }
        };
      }

      return {
        success: true,
        data: this.transformTimeOffRecord(data)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TIME_OFF_SERVICE_ERROR',
          message: 'Unexpected error updating time-off request',
          details: { error, requestId, updates }
        }
      };
    }
  }

  // Manager approval workflow
  static async approveTimeOffRequest(
    requestId: string,
    managerId: string,
    approvalNotes?: string
  ): Promise<ServiceResult<TimeOffRequest>> {
    try {
      const updateRecord = {
        status: 'approved',
        approved_by: managerId,
        approved_at: new Date().toISOString(),
        approval_notes: approvalNotes
      };

      const { data, error } = await this.supabase
        .from('time_off_requests')
        .update(updateRecord)
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'APPROVE_TIME_OFF_ERROR',
            message: 'Failed to approve time-off request',
            details: { error, requestId, managerId }
          }
        };
      }

      // Create unavailability window for approved time-off
      const timeOffData = this.transformTimeOffRecord(data);
      await GuardAvailabilityService.createAvailability({
        guardId: timeOffData.guardId,
        availabilityWindow: timeOffData.dateRange,
        availabilityType: 'unavailable',
        availabilityStatus: 'active',
        notes: `Approved time-off: ${timeOffData.requestType}${timeOffData.reason ? ` - ${timeOffData.reason}` : ''}`,
        overrideReason: 'approved_time_off'
      });

      // Log approval in availability history
      await GuardAvailabilityService['logAvailabilityChange'](
        timeOffData.guardId,
        'time_off_approved',
        null,
        data,
        `Time-off approved by manager: ${timeOffData.requestType}`
      );

      // Send notification to guard (placeholder)
      await this.sendApprovalNotification(timeOffData.guardId, requestId, 'approved');

      return {
        success: true,
        data: timeOffData
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TIME_OFF_SERVICE_ERROR',
          message: 'Unexpected error approving time-off request',
          details: { error, requestId, managerId }
        }
      };
    }
  }

  static async denyTimeOffRequest(
    requestId: string,
    managerId: string,
    denialReason?: string
  ): Promise<ServiceResult<TimeOffRequest>> {
    try {
      const updateRecord = {
        status: 'denied',
        approved_by: managerId,
        approved_at: new Date().toISOString(),
        approval_notes: denialReason
      };

      const { data, error } = await this.supabase
        .from('time_off_requests')
        .update(updateRecord)
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'DENY_TIME_OFF_ERROR',
            message: 'Failed to deny time-off request',
            details: { error, requestId, managerId }
          }
        };
      }

      const timeOffData = this.transformTimeOffRecord(data);

      // Log denial in availability history
      await GuardAvailabilityService['logAvailabilityChange'](
        timeOffData.guardId,
        'time_off_denied',
        null,
        data,
        `Time-off denied by manager: ${denialReason || 'No reason provided'}`
      );

      // Send notification to guard (placeholder)
      await this.sendApprovalNotification(timeOffData.guardId, requestId, 'denied');

      return {
        success: true,
        data: timeOffData
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TIME_OFF_SERVICE_ERROR',
          message: 'Unexpected error denying time-off request',
          details: { error, requestId, managerId }
        }
      };
    }
  }

  static async cancelTimeOffRequest(requestId: string): Promise<ServiceResult<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from('time_off_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('status', 'pending') // Only allow cancellation of pending requests
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: {
            code: 'CANCEL_TIME_OFF_ERROR',
            message: 'Failed to cancel time-off request',
            details: { error, requestId }
          }
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TIME_OFF_SERVICE_ERROR',
          message: 'Unexpected error cancelling time-off request',
          details: { error, requestId }
        }
      };
    }
  }

  // Conflict detection
  private static async checkTimeOffConflicts(
    guardId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ServiceResult<AvailabilityConflict[]>> {
    try {
      const conflicts: AvailabilityConflict[] = [];

      // Check for existing confirmed shift assignments
      const { data: shiftAssignments, error: assignmentError } = await this.supabase
        .from('shift_assignments')
        .select(`
          id,
          shift_id,
          shifts (
            title,
            time_range
          )
        `)
        .eq('guard_id', guardId)
        .eq('assignment_status', 'confirmed')
        .overlaps('shifts.time_range', `[${startDate.toISOString()},${endDate.toISOString()})`);

      if (assignmentError) {
        return {
          success: false,
          error: {
            code: 'ASSIGNMENT_CONFLICT_CHECK_ERROR',
            message: 'Failed to check shift assignment conflicts',
            details: { assignmentError, guardId }
          }
        };
      }

      if (shiftAssignments && shiftAssignments.length > 0) {
        conflicts.push({
          type: 'shift_overlap',
          severity: 'high',
          message: `Conflicts with ${shiftAssignments.length} confirmed shift assignment(s)`,
          conflictingItems: shiftAssignments.map(a => a.shift_id),
          resolutionOptions: [
            {
              type: 'find_replacement',
              description: 'Find replacement guards for conflicting shifts',
              impact: 'Requires manager approval and replacement coordination',
              recommendationScore: 0.8
            },
            {
              type: 'cancel_time_off',
              description: 'Cancel or reschedule time-off request',
              impact: 'Guard will not get requested time off',
              recommendationScore: 0.2
            }
          ],
          canAutoResolve: false
        });
      }

      // Check for overlapping approved time-off requests
      const { data: existingTimeOff, error: timeOffError } = await this.supabase
        .from('time_off_requests')
        .select('id, request_type, date_range')
        .eq('guard_id', guardId)
        .eq('status', 'approved')
        .overlaps('date_range', `[${startDate.toISOString()},${endDate.toISOString()})`);

      if (timeOffError) {
        return {
          success: false,
          error: {
            code: 'TIME_OFF_CONFLICT_CHECK_ERROR',
            message: 'Failed to check time-off conflicts',
            details: { timeOffError, guardId }
          }
        };
      }

      if (existingTimeOff && existingTimeOff.length > 0) {
        conflicts.push({
          type: 'time_off_conflict',
          severity: 'medium',
          message: `Overlaps with ${existingTimeOff.length} existing approved time-off request(s)`,
          conflictingItems: existingTimeOff.map(t => t.id),
          resolutionOptions: [
            {
              type: 'modify_availability',
              description: 'Modify one of the conflicting time-off requests',
              impact: 'May require rescheduling existing approved time-off',
              recommendationScore: 0.6
            }
          ],
          canAutoResolve: false
        });
      }

      return {
        success: true,
        data: conflicts
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TIME_OFF_SERVICE_ERROR',
          message: 'Unexpected error checking time-off conflicts',
          details: { error, guardId, startDate, endDate }
        }
      };
    }
  }

  // Helper methods
  private static transformTimeOffRecord(record: any): TimeOffRequest {
    const dateRange = record.date_range.split(',');
    const startDate = new Date(dateRange[0].replace('[', ''));
    const endDate = new Date(dateRange[1].replace(')', ''));

    return {
      id: record.id,
      guardId: record.guard_id,
      requestType: record.request_type,
      dateRange: { start: startDate, end: endDate },
      reason: record.reason,
      status: record.status,
      requestedAt: new Date(record.requested_at),
      approvedBy: record.approved_by,
      approvedAt: record.approved_at ? new Date(record.approved_at) : undefined,
      approvalNotes: record.approval_notes,
      hasConflicts: record.has_conflicts,
      conflictingShifts: record.conflicting_shifts || [],
      replacementRequired: record.replacement_required,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at)
    };
  }

  private static async sendEmergencyNotifications(guardId: string, requestId: string): Promise<void> {
    // Placeholder for notification service integration
    console.log(`Emergency time-off notification sent for guard ${guardId}, request ${requestId}`);
  }

  private static async sendApprovalNotification(
    guardId: string, 
    requestId: string, 
    decision: 'approved' | 'denied'
  ): Promise<void> {
    // Placeholder for notification service integration
    console.log(`Time-off ${decision} notification sent to guard ${guardId} for request ${requestId}`);
  }

  // Analytics methods
  static async getTimeOffStatistics(
    guardId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<{
    totalRequests: number;
    approvedRequests: number;
    deniedRequests: number;
    pendingRequests: number;
    averageRequestDays: number;
    requestsByType: Record<TimeOffType, number>;
  }>> {
    try {
      let query = this.supabase
        .from('time_off_requests')
        .select('*');

      if (guardId) {
        query = query.eq('guard_id', guardId);
      }

      if (startDate) {
        query = query.gte('requested_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('requested_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: {
            code: 'FETCH_STATISTICS_ERROR',
            message: 'Failed to fetch time-off statistics',
            details: { error, guardId }
          }
        };
      }

      const requests = data || [];
      const totalRequests = requests.length;
      const approvedRequests = requests.filter(r => r.status === 'approved').length;
      const deniedRequests = requests.filter(r => r.status === 'denied').length;
      const pendingRequests = requests.filter(r => r.status === 'pending').length;

      // Calculate average request days
      const totalDays = requests.reduce((sum, request) => {
        const dateRange = request.date_range.split(',');
        const start = new Date(dateRange[0].replace('[', ''));
        const end = new Date(dateRange[1].replace(')', ''));
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      const averageRequestDays = totalRequests > 0 ? totalDays / totalRequests : 0;

      // Group by request type
      const requestsByType = requests.reduce((acc, request) => {
        acc[request.request_type] = (acc[request.request_type] || 0) + 1;
        return acc;
      }, {} as Record<TimeOffType, number>);

      return {
        success: true,
        data: {
          totalRequests,
          approvedRequests,
          deniedRequests,
          pendingRequests,
          averageRequestDays,
          requestsByType
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TIME_OFF_SERVICE_ERROR',
          message: 'Unexpected error fetching time-off statistics',
          details: { error, guardId }
        }
      };
    }
  }
}