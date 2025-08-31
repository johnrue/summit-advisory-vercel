import { createClient } from '@supabase/supabase-js'
import type { 
  BackgroundCheckStatus, 
  BackgroundCheckUpdate, 
  BackgroundCheckAudit,
  BackgroundCheckData,
  ExpiryReminderAlert,
  BackgroundCheckMetrics
} from '@/lib/types/background-check'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export class BackgroundCheckService {
  /**
   * Update background check status with audit trail
   */
  async updateStatus(
    applicationId: string, 
    update: BackgroundCheckUpdate,
    currentUserId: string
  ): Promise<{ success: true; data: BackgroundCheckAudit } | { success: false; error: string }> {
    try {
      // Get current status for audit trail
      const { data: currentData, error: fetchError } = await supabase
        .from('guard_leads')
        .select('background_check_status')
        .eq('id', applicationId)
        .single()

      if (fetchError) {
        return { success: false, error: `Failed to fetch current status: ${fetchError.message}` }
      }

      // Validate status transition
      const isValidTransition = this.validateStatusTransition(
        currentData.background_check_status as BackgroundCheckStatus,
        update.status
      )

      if (!isValidTransition) {
        return { 
          success: false, 
          error: `Invalid status transition from ${currentData.background_check_status} to ${update.status}` 
        }
      }

      // Begin transaction
      const { data: auditRecord, error: auditError } = await supabase
        .from('background_check_audit')
        .insert({
          application_id: applicationId,
          previous_status: currentData.background_check_status,
          new_status: update.status,
          changed_by: currentUserId,
          change_reason: update.notes,
          vendor_confirmation: update.vendorConfirmationNumber,
          manager_signature: update.approverSignature,
          is_system_generated: false
        })
        .select()
        .single()

      if (auditError) {
        return { success: false, error: `Failed to create audit record: ${auditError.message}` }
      }

      // Update guard_leads table
      const updateData: any = {
        background_check_status: update.status,
        background_check_date: new Date().toISOString(),
        background_check_notes: update.notes,
        background_check_approved_by: currentUserId
      }

      if (update.vendorConfirmationNumber) {
        updateData.vendor_confirmation_number = update.vendorConfirmationNumber
      }

      if (update.expiryDate) {
        updateData.background_check_expiry_date = update.expiryDate.toISOString().split('T')[0]
      }

      const { error: updateError } = await supabase
        .from('guard_leads')
        .update(updateData)
        .eq('id', applicationId)

      if (updateError) {
        return { success: false, error: `Failed to update application: ${updateError.message}` }
      }

      return { 
        success: true, 
        data: {
          id: auditRecord.id,
          applicationId: auditRecord.application_id,
          previousStatus: auditRecord.previous_status,
          newStatus: auditRecord.new_status,
          changedBy: auditRecord.changed_by,
          changeReason: auditRecord.change_reason,
          vendorConfirmation: auditRecord.vendor_confirmation,
          supportingDocuments: auditRecord.supporting_documents,
          createdAt: new Date(auditRecord.created_at),
          managerSignature: auditRecord.manager_signature,
          isSystemGenerated: auditRecord.is_system_generated
        }
      }
    } catch (error) {
      return { success: false, error: `Background check update failed: ${error}` }
    }
  }

  /**
   * Get background check audit trail for an application
   */
  async getAuditTrail(applicationId: string): Promise<{ success: true; data: BackgroundCheckAudit[] } | { success: false; error: string }> {
    try {
      const { data, error } = await supabase
        .from('background_check_audit')
        .select(`
          *,
          users:changed_by(first_name, last_name)
        `)
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: `Failed to fetch audit trail: ${error.message}` }
      }

      const auditTrail: BackgroundCheckAudit[] = data.map(record => ({
        id: record.id,
        applicationId: record.application_id,
        previousStatus: record.previous_status,
        newStatus: record.new_status,
        changedBy: record.users ? `${record.users.first_name} ${record.users.last_name}` : 'Unknown User',
        changeReason: record.change_reason,
        vendorConfirmation: record.vendor_confirmation,
        supportingDocuments: record.supporting_documents,
        createdAt: new Date(record.created_at),
        managerSignature: record.manager_signature,
        isSystemGenerated: record.is_system_generated
      }))

      return { success: true, data: auditTrail }
    } catch (error) {
      return { success: false, error: `Failed to get audit trail: ${error}` }
    }
  }

  /**
   * Get applications with expiring background checks
   */
  async getExpiringBackgroundChecks(daysAhead: number = 30): Promise<{ success: true; data: ExpiryReminderAlert[] } | { success: false; error: string }> {
    try {
      const expiryThreshold = new Date()
      expiryThreshold.setDate(expiryThreshold.getDate() + daysAhead)

      const { data, error } = await supabase
        .from('guard_leads')
        .select(`
          id,
          first_name,
          last_name,
          background_check_status,
          background_check_expiry_date,
          assigned_to,
          users:assigned_to(first_name, last_name)
        `)
        .eq('background_check_status', 'complete')
        .lte('background_check_expiry_date', expiryThreshold.toISOString().split('T')[0])
        .not('background_check_expiry_date', 'is', null)

      if (error) {
        return { success: false, error: `Failed to fetch expiring background checks: ${error.message}` }
      }

      const expiryAlerts: ExpiryReminderAlert[] = data.map(record => {
        const expiryDate = new Date(record.background_check_expiry_date)
        const today = new Date()
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        return {
          applicationId: record.id,
          applicantName: `${record.first_name} ${record.last_name}`,
          currentStatus: record.background_check_status as BackgroundCheckStatus,
          expiryDate,
          daysUntilExpiry,
          assignedManager: record.users ? `${(record.users as any).first_name} ${(record.users as any).last_name}` : undefined
        }
      })

      return { success: true, data: expiryAlerts }
    } catch (error) {
      return { success: false, error: `Failed to get expiring background checks: ${error}` }
    }
  }

  /**
   * Get background check data for an application
   */
  async getBackgroundCheckData(applicationId: string): Promise<{ success: true; data: BackgroundCheckData } | { success: false; error: string }> {
    try {
      const { data, error } = await supabase
        .from('guard_leads')
        .select(`
          background_check_status,
          background_check_date,
          vendor_confirmation_number,
          background_check_expiry_date,
          background_check_notes,
          users:background_check_approved_by(first_name, last_name)
        `)
        .eq('id', applicationId)
        .single()

      if (error) {
        return { success: false, error: `Failed to fetch background check data: ${error.message}` }
      }

      // Get audit trail
      const auditResult = await this.getAuditTrail(applicationId)
      
      const backgroundCheckData: BackgroundCheckData = {
        status: data.background_check_status as BackgroundCheckStatus,
        date: data.background_check_date ? new Date(data.background_check_date) : undefined,
        vendorConfirmationNumber: data.vendor_confirmation_number,
        expiryDate: data.background_check_expiry_date ? new Date(data.background_check_expiry_date) : undefined,
        notes: data.background_check_notes,
        approvedBy: data.users ? `${(data.users as any).first_name} ${(data.users as any).last_name}` : undefined,
        auditTrail: auditResult.success ? auditResult.data : []
      }

      return { success: true, data: backgroundCheckData }
    } catch (error) {
      return { success: false, error: `Failed to get background check data: ${error}` }
    }
  }

  /**
   * Get background check metrics for reporting
   */
  async getBackgroundCheckMetrics(): Promise<{ success: true; data: BackgroundCheckMetrics } | { success: false; error: string }> {
    try {
      const { data, error } = await supabase
        .from('guard_leads')
        .select('background_check_status, background_check_date, created_at')
        .not('background_check_status', 'is', null)

      if (error) {
        return { success: false, error: `Failed to fetch metrics: ${error.message}` }
      }

      const totalChecks = data.length
      const completedChecks = data.filter(record => record.background_check_status === 'complete').length
      const failedChecks = data.filter(record => record.background_check_status === 'failed').length
      
      // Get expiring checks (within 30 days)
      const expiringResult = await this.getExpiringBackgroundChecks(30)
      const expiringChecks = expiringResult.success ? expiringResult.data.length : 0

      // Calculate average processing time
      const completedWithDates = data.filter(record => 
        record.background_check_status === 'complete' && 
        record.background_check_date && 
        record.created_at
      )

      let averageProcessingDays = 0
      if (completedWithDates.length > 0) {
        const totalDays = completedWithDates.reduce((sum, record) => {
          const startDate = new Date(record.created_at)
          const completedDate = new Date(record.background_check_date)
          const days = Math.ceil((completedDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          return sum + days
        }, 0)
        averageProcessingDays = Math.round(totalDays / completedWithDates.length)
      }

      const complianceRate = totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0

      const metrics: BackgroundCheckMetrics = {
        totalChecks,
        completedChecks,
        failedChecks,
        expiringChecks,
        averageProcessingDays,
        complianceRate
      }

      return { success: true, data: metrics }
    } catch (error) {
      return { success: false, error: `Failed to calculate metrics: ${error}` }
    }
  }

  /**
   * Validate background check status transition
   */
  private validateStatusTransition(currentStatus: BackgroundCheckStatus, newStatus: BackgroundCheckStatus): boolean {
    const validTransitions: Record<BackgroundCheckStatus, BackgroundCheckStatus[]> = {
      'pending': ['in_progress', 'cancelled'],
      'in_progress': ['complete', 'failed', 'cancelled'],
      'complete': ['expired'],
      'failed': ['pending'], // Allow retry
      'expired': ['pending'], // Allow renewal
      'cancelled': ['pending'] // Allow restart
    }

    return validTransitions[currentStatus]?.includes(newStatus) ?? false
  }
}