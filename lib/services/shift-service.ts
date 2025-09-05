import { createClient } from '@/lib/supabase'
import { AuditService } from '@/lib/services/audit-service'
import type {
  Shift,
  ShiftCreateData,
  ShiftUpdateData,
  ShiftFilterOptions,
  PaginationOptions,
  PaginatedResult,
  ServiceResult,
  ShiftStatus,
  GuardSuggestion,
  Assignment,
  CancellationResult,
  CostCalculation,
  ValidationResult,
  ConflictCheck,
  ShiftChangeHistoryEntry,
  ChangeReason
} from '@/lib/types/shift-types'
import { ShiftErrorCodes } from '@/lib/types/shift-types'

export class ShiftManagementService {
  private supabase = createClient()
  private auditService = AuditService.getInstance()

  // Core CRUD Operations
  async createShift(shiftData: ShiftCreateData, managerId: string): Promise<ServiceResult<Shift>> {
    try {
      // Validate manager permissions
      const hasPermission = await this.validateManagerPermissions(managerId)
      if (!hasPermission.success) {
        return {
          success: false,
          error: hasPermission.error
        }
      }

      // Calculate estimated hours from time range
      const estimatedHours = this.calculateEstimatedHours(shiftData.timeRange)

      // Insert shift into database
      const { data, error } = await this.supabase
        .from('shifts')
        .insert([{
          title: shiftData.title,
          description: shiftData.description,
          location_data: shiftData.locationData,
          time_range: `[${shiftData.timeRange.startTime}, ${shiftData.timeRange.endTime})`,
          estimated_hours: estimatedHours,
          required_certifications: shiftData.requiredCertifications,
          guard_requirements: shiftData.guardRequirements,
          client_info: shiftData.clientInfo,
          priority: shiftData.priority,
          rate_information: shiftData.rateInformation,
          special_requirements: shiftData.specialRequirements,
          calendar_sync: { syncEnabled: false },
          created_by: managerId
        }])
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: {
            code: 'CREATE_SHIFT_FAILED',
            message: 'Failed to create shift',
            details: { dbError: error }
          }
        }
      }

      // Log audit trail for shift creation
      await this.auditService.logShiftChange(
        data.id,
        'created',
        undefined, // No previous values for creation
        data,
        'New shift created',
        managerId
      )

      return {
        success: true,
        data: this.mapDatabaseRowToShift(data)
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_SHIFT_ERROR',
          message: 'Unexpected error creating shift',
          details: { error }
        }
      }
    }
  }

  async getShift(shiftId: string): Promise<ServiceResult<Shift>> {
    try {
      const { data, error } = await this.supabase
        .from('shifts')
        .select(`
          *,
          assigned_guard:guard_profiles(id, legal_name, employee_number),
          created_by_user:auth.users(id, email)
        `)
        .eq('id', shiftId)
        .single()

      if (error) {
        return {
          success: false,
          error: {
            code: 'SHIFT_NOT_FOUND',
            message: 'Shift not found',
            details: { dbError: error }
          }
        }
      }

      return {
        success: true,
        data: this.mapDatabaseRowToShift(data)
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_SHIFT_ERROR',
          message: 'Error retrieving shift',
          details: { error }
        }
      }
    }
  }

  async getShifts(filters: ShiftFilterOptions, pagination: PaginationOptions): Promise<ServiceResult<PaginatedResult<Shift>>> {
    try {
      let query = this.supabase
        .from('shifts')
        .select(`
          *,
          assigned_guard:guard_profiles(id, legal_name, employee_number)
        `, { count: 'exact' })

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters.assignedGuardId) {
        query = query.eq('assigned_guard_id', filters.assignedGuardId)
      }

      if (filters.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority)
      }

      if (filters.dateRange) {
        query = query.gte('time_range', `[${filters.dateRange.start},)`)
        query = query.lte('time_range', `(,${filters.dateRange.end}]`)
      }

      // Apply pagination
      const page = pagination.page || 1
      const limit = pagination.limit || 20
      const offset = (page - 1) * limit

      query = query
        .order(pagination.sortBy || 'created_at', { ascending: pagination.sortOrder === 'asc' })
        .range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        return {
          success: false,
          error: {
            code: 'GET_SHIFTS_FAILED',
            message: 'Failed to retrieve shifts',
            details: { dbError: error }
          }
        }
      }

      const shifts = data.map(row => this.mapDatabaseRowToShift(row))
      const total = count || 0

      return {
        success: true,
        data: {
          data: shifts,
          total,
          page,
          limit,
          hasNextPage: offset + limit < total,
          hasPreviousPage: page > 1
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_SHIFTS_ERROR',
          message: 'Error retrieving shifts',
          details: { error }
        }
      }
    }
  }

  async updateShift(shiftId: string, updates: ShiftUpdateData, managerId: string): Promise<ServiceResult<Shift>> {
    try {
      // Validate manager permissions
      const hasPermission = await this.validateManagerPermissions(managerId)
      if (!hasPermission.success) {
        return {
          success: false,
          error: hasPermission.error
        }
      }

      // Get current shift data for change tracking
      const currentShift = await this.getShift(shiftId)
      if (!currentShift.success || !currentShift.data) {
        return {
          success: false,
          error: {
            code: 'SHIFT_NOT_FOUND',
            message: 'Shift not found for update'
          }
        }
      }

      // Prepare update data
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (updates.title) updateData.title = updates.title
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.locationData) updateData.location_data = updates.locationData
      if (updates.timeRange) {
        updateData.time_range = `[${updates.timeRange.startTime}, ${updates.timeRange.endTime})`
        updateData.estimated_hours = this.calculateEstimatedHours(updates.timeRange)
      }
      if (updates.requiredCertifications) updateData.required_certifications = updates.requiredCertifications
      if (updates.guardRequirements) updateData.guard_requirements = updates.guardRequirements
      if (updates.clientInfo) updateData.client_info = updates.clientInfo
      if (updates.priority) updateData.priority = updates.priority
      if (updates.rateInformation) updateData.rate_information = updates.rateInformation
      if (updates.specialRequirements !== undefined) updateData.special_requirements = updates.specialRequirements

      // Update shift in database
      const { data, error } = await this.supabase
        .from('shifts')
        .update(updateData)
        .eq('id', shiftId)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: {
            code: 'UPDATE_SHIFT_FAILED',
            message: 'Failed to update shift',
            details: { dbError: error }
          }
        }
      }

      // Log audit trail for shift update
      await this.auditService.logShiftChange(
        shiftId,
        'updated',
        currentShift.data,
        data,
        updates.changeDescription || 'Shift updated',
        managerId
      )

      // Track changes in audit log (keep existing method for backward compatibility)
      await this.trackShiftModification(shiftId, currentShift.data, this.mapDatabaseRowToShift(data), updates.changeReason, updates.changeDescription || '', managerId)

      return {
        success: true,
        data: this.mapDatabaseRowToShift(data)
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_SHIFT_ERROR',
          message: 'Error updating shift',
          details: { error }
        }
      }
    }
  }

  async cancelShift(shiftId: string, reason: string, managerId: string): Promise<ServiceResult<CancellationResult>> {
    try {
      // Update shift status to cancelled
      const updateResult = await this.updateShift(shiftId, {
        changeReason: 'operational',
        changeDescription: reason,
        managerSignature: `Manager-${managerId}-${Date.now()}`
      }, managerId)

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error
        }
      }

      // Update status to cancelled
      await this.supabase
        .from('shifts')
        .update({ status: 'cancelled' })
        .eq('id', shiftId)

      // Get replacement suggestions (simplified for now)
      const replacementSuggestions: GuardSuggestion[] = []

      return {
        success: true,
        data: {
          cancelled: true,
          replacementSuggestions,
          financialImpact: {
            cancellationFee: 0,
            refundAmount: 0,
            billingAdjustment: 0
          },
          notificationsSent: []
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CANCEL_SHIFT_ERROR',
          message: 'Error cancelling shift',
          details: { error }
        }
      }
    }
  }

  // Assignment Operations
  async assignGuardToShift(shiftId: string, guardId: string, managerId: string): Promise<ServiceResult<Assignment>> {
    try {
      // Validate guard eligibility
      const eligibilityResult = await this.checkGuardEligibility(guardId, shiftId)
      if (!eligibilityResult.success || !eligibilityResult.data?.isEligible) {
        return {
          success: false,
          error: {
            code: ShiftErrorCodes.INVALID_GUARD_ELIGIBILITY,
            message: 'Guard is not eligible for this shift',
            details: { eligibilityResult }
          }
        }
      }

      // Assign guard to shift
      const { data, error } = await this.supabase
        .from('shifts')
        .update({ 
          assigned_guard_id: guardId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', shiftId)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: {
            code: 'ASSIGN_GUARD_FAILED',
            message: 'Failed to assign guard to shift',
            details: { dbError: error }
          }
        }
      }

      // Log audit trail for guard assignment
      await this.auditService.logShiftChange(
        shiftId,
        'assigned',
        undefined, // No previous assignment values needed
        { guardId, assignedAt: new Date().toISOString() },
        `Guard ${guardId} assigned to shift`,
        managerId
      )

      return {
        success: true,
        data: {
          shiftId,
          guardId,
          assignedAt: new Date().toISOString(),
          assignedBy: managerId,
          confirmationRequired: true
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ASSIGN_GUARD_ERROR',
          message: 'Error assigning guard to shift',
          details: { error }
        }
      }
    }
  }

  async unassignGuardFromShift(shiftId: string, managerId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase
        .from('shifts')
        .update({ 
          assigned_guard_id: null,
          status: 'open',
          updated_at: new Date().toISOString()
        })
        .eq('id', shiftId)

      if (error) {
        return {
          success: false,
          error: {
            code: 'UNASSIGN_GUARD_FAILED',
            message: 'Failed to unassign guard from shift',
            details: { dbError: error }
          }
        }
      }

      // Log audit trail for guard unassignment
      await this.auditService.logShiftChange(
        shiftId,
        'unassigned',
        undefined, // No previous values needed
        { unassignedAt: new Date().toISOString() },
        'Guard unassigned from shift',
        managerId
      )

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNASSIGN_GUARD_ERROR',
          message: 'Error unassigning guard from shift',
          details: { error }
        }
      }
    }
  }

  async suggestEligibleGuards(shiftId: string): Promise<ServiceResult<GuardSuggestion[]>> {
    try {
      // Get shift details
      const shiftResult = await this.getShift(shiftId)
      if (!shiftResult.success || !shiftResult.data) {
        return {
          success: false,
          error: {
            code: 'SHIFT_NOT_FOUND',
            message: 'Shift not found for guard suggestions'
          }
        }
      }

      // Get eligible guards (simplified for now - just get schedulable guards)
      const { data: guards, error } = await this.supabase
        .from('guard_profiles')
        .select(`
          id, 
          legal_name, 
          employee_number, 
          certification_status,
          guard_leads(email)
        `)
        .eq('profile_status', 'approved')
        .eq('is_schedulable', true)

      if (error) {
        return {
          success: false,
          error: {
            code: 'GET_GUARDS_FAILED',
            message: 'Failed to retrieve eligible guards',
            details: { dbError: error }
          }
        }
      }

      // Convert to guard suggestions (simplified scoring for now)
      const suggestions: GuardSuggestion[] = guards.map(guard => ({
        guardId: guard.id,
        guardName: guard.legal_name,
        eligibilityScore: 85, // Simplified scoring
        matchingFactors: [
          {
            factor: 'Profile Status',
            score: 100,
            description: 'Guard has approved profile'
          },
          {
            factor: 'Schedulable',
            score: 100,
            description: 'Guard is available for scheduling'
          }
        ],
        availabilityStatus: 'available' as const
      }))

      return {
        success: true,
        data: suggestions
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SUGGEST_GUARDS_ERROR',
          message: 'Error suggesting eligible guards',
          details: { error }
        }
      }
    }
  }

  // Template Operations
  async cloneShift(sourceShiftId: string, modifications?: Partial<ShiftCreateData>): Promise<ServiceResult<Shift>> {
    try {
      // Get source shift
      const sourceResult = await this.getShift(sourceShiftId)
      if (!sourceResult.success || !sourceResult.data) {
        return {
          success: false,
          error: {
            code: 'SOURCE_SHIFT_NOT_FOUND',
            message: 'Source shift not found for cloning'
          }
        }
      }

      const sourceShift = sourceResult.data

      // Create new shift data based on source
      const newShiftData: ShiftCreateData = {
        title: modifications?.title || `${sourceShift.title} (Copy)`,
        description: modifications?.description || sourceShift.description,
        locationData: modifications?.locationData || sourceShift.locationData,
        timeRange: modifications?.timeRange || sourceShift.timeRange,
        requiredCertifications: modifications?.requiredCertifications || sourceShift.requiredCertifications,
        guardRequirements: modifications?.guardRequirements || sourceShift.guardRequirements,
        clientInfo: modifications?.clientInfo || sourceShift.clientInfo,
        priority: modifications?.priority || sourceShift.priority,
        rateInformation: modifications?.rateInformation || sourceShift.rateInformation,
        specialRequirements: modifications?.specialRequirements || sourceShift.specialRequirements
      }

      // Create the cloned shift
      return this.createShift(newShiftData, sourceShift.createdBy)
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CLONE_SHIFT_ERROR',
          message: 'Error cloning shift',
          details: { error }
        }
      }
    }
  }

  // Business Logic Integration
  async calculateShiftCost(shiftData: ShiftCreateData): Promise<ServiceResult<CostCalculation>> {
    try {
      const estimatedHours = this.calculateEstimatedHours(shiftData.timeRange)
      const baseRate = shiftData.rateInformation.baseRate
      
      // Simplified calculation
      const regularHours = Math.min(estimatedHours, 8)
      const overtimeHours = Math.max(0, estimatedHours - 8)
      
      const regularPay = regularHours * baseRate
      const overtimePay = overtimeHours * baseRate * shiftData.rateInformation.overtimeMultiplier
      
      const totalGuardPay = regularPay + overtimePay
      const clientBillingAmount = totalGuardPay * 1.5 // 50% markup
      const profitMargin = clientBillingAmount - totalGuardPay

      return {
        success: true,
        data: {
          regularHours,
          overtimeHours,
          regularPay,
          overtimePay,
          specialRatePay: 0,
          totalGuardPay,
          clientBillingAmount,
          profitMargin
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COST_CALCULATION_ERROR',
          message: 'Error calculating shift cost',
          details: { error }
        }
      }
    }
  }

  async validateShiftRequirements(shiftData: ShiftCreateData): Promise<ServiceResult<ValidationResult>> {
    try {
      const errors: Array<{field: string; code: string; message: string}> = []
      const warnings: Array<{field: string; message: string}> = []

      // Basic validation
      if (!shiftData.title?.trim()) {
        errors.push({
          field: 'title',
          code: 'REQUIRED',
          message: 'Shift title is required'
        })
      }

      if (!shiftData.locationData?.siteName?.trim()) {
        errors.push({
          field: 'locationData.siteName',
          code: 'REQUIRED',
          message: 'Site name is required'
        })
      }

      if (!shiftData.timeRange?.startTime || !shiftData.timeRange?.endTime) {
        errors.push({
          field: 'timeRange',
          code: 'REQUIRED',
          message: 'Start and end times are required'
        })
      } else {
        const startTime = new Date(shiftData.timeRange.startTime)
        const endTime = new Date(shiftData.timeRange.endTime)
        
        if (endTime <= startTime) {
          errors.push({
            field: 'timeRange',
            code: 'INVALID_RANGE',
            message: 'End time must be after start time'
          })
        }
      }

      if (!shiftData.rateInformation?.baseRate || shiftData.rateInformation.baseRate <= 0) {
        errors.push({
          field: 'rateInformation.baseRate',
          code: 'INVALID_VALUE',
          message: 'Base rate must be greater than 0'
        })
      }

      return {
        success: true,
        data: {
          isValid: errors.length === 0,
          errors,
          warnings
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Error validating shift requirements',
          details: { error }
        }
      }
    }
  }

  // Helper methods
  private calculateEstimatedHours(timeRange: { startTime: string; endTime: string }): number {
    const start = new Date(timeRange.startTime)
    const end = new Date(timeRange.endTime)
    const diffMs = end.getTime() - start.getTime()
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100 // Round to 2 decimal places
  }

  private async validateManagerPermissions(managerId: string): Promise<ServiceResult<boolean>> {
    try {
      const { data: user, error } = await this.supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', managerId)
        .single()

      if (error || !user) {
        return {
          success: false,
          error: {
            code: ShiftErrorCodes.UNAUTHORIZED_MANAGER,
            message: 'Manager not found or unauthorized'
          }
        }
      }

      if (!['manager', 'admin'].includes(user.role)) {
        return {
          success: false,
          error: {
            code: ShiftErrorCodes.UNAUTHORIZED_MANAGER,
            message: 'Insufficient permissions for shift management'
          }
        }
      }

      return { success: true, data: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PERMISSION_CHECK_ERROR',
          message: 'Error checking manager permissions',
          details: { error }
        }
      }
    }
  }

  private async checkGuardEligibility(guardId: string, shiftId: string): Promise<ServiceResult<{ isEligible: boolean; reasons: string[] }>> {
    try {
      // Call the database function to validate guard eligibility
      const { data, error } = await this.supabase
        .rpc('validate_guard_shift_eligibility', {
          guard_id: guardId,
          required_certs: []  // Will be enhanced later with actual requirements
        })

      if (error) {
        return {
          success: false,
          error: {
            code: 'ELIGIBILITY_CHECK_FAILED',
            message: 'Failed to check guard eligibility',
            details: { dbError: error }
          }
        }
      }

      return {
        success: true,
        data: {
          isEligible: data,
          reasons: data ? [] : ['Guard not eligible']
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ELIGIBILITY_CHECK_ERROR',
          message: 'Error checking guard eligibility',
          details: { error }
        }
      }
    }
  }

  private async trackShiftModification(
    shiftId: string, 
    previousShift: Shift, 
    updatedShift: Shift, 
    changeReason: ChangeReason, 
    changeDescription: string, 
    managerId: string
  ): Promise<void> {
    try {
      const changes = []
      
      // Compare fields and track changes
      if (previousShift.title !== updatedShift.title) {
        changes.push({
          field: 'title',
          previousValue: previousShift.title,
          newValue: updatedShift.title
        })
      }

      if (JSON.stringify(previousShift.locationData) !== JSON.stringify(updatedShift.locationData)) {
        changes.push({
          field: 'locationData',
          previousValue: previousShift.locationData,
          newValue: updatedShift.locationData
        })
      }

      // Insert change records
      for (const change of changes) {
        await this.supabase
          .from('shift_change_history')
          .insert({
            shift_id: shiftId,
            changed_field: change.field,
            previous_value: change.previousValue,
            new_value: change.newValue,
            change_reason: changeReason,
            change_description: changeDescription,
            changed_by: managerId,
            manager_signature: `Manager-${managerId}-${Date.now()}`
          })
      }
    } catch (error) {
      // Don't throw - this shouldn't break the main update operation
    }
  }

  private mapDatabaseRowToShift(row: any): Shift {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      locationData: row.location_data,
      timeRange: this.parseTimeRange(row.time_range),
      estimatedHours: parseFloat(row.estimated_hours),
      assignedGuardId: row.assigned_guard_id,
      requiredCertifications: row.required_certifications || [],
      guardRequirements: row.guard_requirements || {},
      clientInfo: row.client_info,
      priority: row.priority,
      rateInformation: row.rate_information,
      status: row.status,
      specialRequirements: row.special_requirements,
      templateId: row.template_id,
      clonedFrom: row.cloned_from,
      calendarSync: row.calendar_sync || { syncEnabled: false },
      payrollSyncStatus: row.payroll_sync_status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  private parseTimeRange(timeRangeStr: string): { startTime: string; endTime: string } {
    // Parse PostgreSQL tstzrange format: [start,end)
    const match = timeRangeStr.match(/\[([^,]+),([^)]+)\)/)
    if (match) {
      return {
        startTime: match[1].replace(/"/g, ''),
        endTime: match[2].replace(/"/g, '')
      }
    }
    
    // Fallback
    return {
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    }
  }
}