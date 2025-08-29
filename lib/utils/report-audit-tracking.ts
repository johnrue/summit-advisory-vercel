import { AuditService } from '@/lib/services/audit-service'
import { supabase } from '@/lib/supabase'
import type { ReportParameters } from '@/lib/types'

/**
 * Report Audit Tracking utility for comprehensive compliance audit trails
 * Tracks all report generation, access, and modification activities
 */
export class ReportAuditTracking {
  private static auditService = AuditService.getInstance()

  /**
   * Track report download/access with IP and user agent
   */
  static async trackReportAccess(
    reportId: string,
    action: 'viewed' | 'downloaded' | 'shared',
    userId: string,
    metadata: {
      ipAddress?: string
      userAgent?: string
      downloadUrl?: string
      fileSize?: number
      format?: string
    } = {}
  ): Promise<void> {
    try {
      // Store detailed access record in report_access_history table
      const { error } = await supabase
        .from('report_access_history')
        .insert([{
          report_id: reportId,
          user_id: userId,
          action: action,
          ip_address: metadata.ipAddress,
          user_agent: metadata.userAgent,
          download_url: metadata.downloadUrl,
          file_size: metadata.fileSize,
          format: metadata.format,
          accessed_at: new Date().toISOString()
        }])

      if (error) {
        console.error('Error storing report access history:', error)
      }

      // Log in audit system
      await this.auditService.logComplianceReportAccess(
        reportId,
        action,
        {
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          fileSize: metadata.fileSize,
          format: metadata.format
        },
        `Report ${action} by user from IP ${metadata.ipAddress || 'unknown'}`,
        userId
      )

    } catch (error) {
      console.error('Error tracking report access:', error)
    }
  }

  /**
   * Track email delivery of reports
   */
  static async trackReportEmail(
    reportId: string,
    recipients: string[],
    emailStatus: 'sent' | 'failed',
    userId: string,
    metadata: {
      messageId?: string
      errorMessage?: string
      attachmentSize?: number
    } = {}
  ): Promise<void> {
    try {
      await this.auditService.logComplianceReportGeneration(
        reportId,
        'emailed',
        {
          recipients: recipients,
          emailStatus: emailStatus,
          messageId: metadata.messageId,
          errorMessage: metadata.errorMessage,
          attachmentSize: metadata.attachmentSize
        },
        `Report emailed to ${recipients.length} recipient(s) with status: ${emailStatus}`,
        userId
      )

      // Update report metadata with email status
      const { error } = await supabase
        .from('compliance_reports')
        .update({
          email_status: emailStatus,
          email_sent_at: emailStatus === 'sent' ? new Date().toISOString() : null,
          email_error: metadata.errorMessage || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)

      if (error) {
        console.error('Error updating report email status:', error)
      }

    } catch (error) {
      console.error('Error tracking report email:', error)
    }
  }

  /**
   * Track scheduled report execution
   */
  static async trackScheduledReportExecution(
    scheduleId: string,
    reportId: string | null,
    status: 'success' | 'failed',
    executionMetadata: {
      startTime: Date
      endTime: Date
      guardCount?: number
      errorMessage?: string
      fileSize?: number
    }
  ): Promise<void> {
    try {
      const executionTime = executionMetadata.endTime.getTime() - executionMetadata.startTime.getTime()

      await this.auditService.logComplianceReportGeneration(
        reportId || scheduleId,
        'scheduled',
        {
          scheduleId: scheduleId,
          executionStatus: status,
          executionTimeMs: executionTime,
          guardCount: executionMetadata.guardCount,
          fileSize: executionMetadata.fileSize,
          errorMessage: executionMetadata.errorMessage
        },
        `Scheduled report execution ${status} in ${executionTime}ms`,
        'system'
      )

      // Store execution history
      const { error } = await supabase
        .from('report_execution_history')
        .insert([{
          schedule_id: scheduleId,
          report_id: reportId,
          execution_status: status,
          started_at: executionMetadata.startTime.toISOString(),
          completed_at: executionMetadata.endTime.toISOString(),
          execution_time_ms: executionTime,
          guard_count: executionMetadata.guardCount,
          file_size: executionMetadata.fileSize,
          error_message: executionMetadata.errorMessage
        }])

      if (error) {
        console.error('Error storing execution history:', error)
      }

    } catch (error) {
      console.error('Error tracking scheduled execution:', error)
    }
  }

  /**
   * Track report schedule changes
   */
  static async trackScheduleChange(
    scheduleId: string,
    action: 'created' | 'updated' | 'activated' | 'deactivated' | 'deleted',
    previousValues: any,
    newValues: any,
    userId: string
  ): Promise<void> {
    try {
      await this.auditService.logReportScheduleChange(
        scheduleId,
        action,
        previousValues,
        newValues,
        `Report schedule ${action} by user`,
        userId
      )

    } catch (error) {
      console.error('Error tracking schedule change:', error)
    }
  }

  /**
   * Get comprehensive audit trail for a specific report
   */
  static async getReportAuditTrail(reportId: string): Promise<{
    generation: any[]
    access: any[]
    emails: any[]
    total: number
  }> {
    try {
      // Get generation and email logs from audit system
      const auditResult = await this.auditService.getAuditLogs({
        entity_id: reportId,
        entity_type: 'compliance_report'
      }, 100, 0)

      // Get access history
      const { data: accessHistory, error: accessError } = await supabase
        .from('report_access_history')
        .select('*')
        .eq('report_id', reportId)
        .order('accessed_at', { ascending: false })

      if (accessError) {
        console.error('Error fetching access history:', accessError)
      }

      const auditLogs = auditResult.success ? auditResult.data?.logs || [] : []
      
      return {
        generation: auditLogs.filter(log => ['generated', 'failed', 'scheduled'].includes(log.action)),
        access: accessHistory || [],
        emails: auditLogs.filter(log => log.action === 'emailed'),
        total: auditLogs.length + (accessHistory?.length || 0)
      }

    } catch (error) {
      console.error('Error getting report audit trail:', error)
      return { generation: [], access: [], emails: [], total: 0 }
    }
  }

  /**
   * Get audit summary for compliance reporting
   */
  static async getComplianceAuditSummary(
    startDate: Date,
    endDate: Date
  ): Promise<{
    reportsGenerated: number
    reportsAccessed: number
    reportsEmailed: number
    schedulesExecuted: number
    failedGenerations: number
    uniqueUsers: number
  }> {
    try {
      // Get audit logs for the period
      const auditResult = await this.auditService.getAuditLogs({
        entity_type: 'compliance_report',
        date_from: startDate.toISOString(),
        date_to: endDate.toISOString()
      }, 1000, 0)

      const auditLogs = auditResult.success ? auditResult.data?.logs || [] : []

      // Get access history for the period
      const { data: accessHistory } = await supabase
        .from('report_access_history')
        .select('user_id')
        .gte('accessed_at', startDate.toISOString())
        .lte('accessed_at', endDate.toISOString())

      const uniqueUsers = new Set([
        ...auditLogs.map(log => log.user_id).filter(Boolean),
        ...(accessHistory || []).map(access => access.user_id).filter(Boolean)
      ]).size

      return {
        reportsGenerated: auditLogs.filter(log => log.action === 'generated').length,
        reportsAccessed: accessHistory?.length || 0,
        reportsEmailed: auditLogs.filter(log => log.action === 'emailed').length,
        schedulesExecuted: auditLogs.filter(log => log.action === 'scheduled').length,
        failedGenerations: auditLogs.filter(log => log.action === 'failed').length,
        uniqueUsers
      }

    } catch (error) {
      console.error('Error getting compliance audit summary:', error)
      return {
        reportsGenerated: 0,
        reportsAccessed: 0,
        reportsEmailed: 0,
        schedulesExecuted: 0,
        failedGenerations: 0,
        uniqueUsers: 0
      }
    }
  }

  /**
   * Clean up old audit records (for data retention compliance)
   */
  static async cleanupOldAuditRecords(retentionDays: number = 2555): Promise<{
    deletedAccessRecords: number
    deletedExecutionRecords: number
  }> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      // Clean up access history
      const { data: deletedAccess, error: accessError } = await supabase
        .from('report_access_history')
        .delete()
        .lt('accessed_at', cutoffDate.toISOString())
        .select('id')

      // Clean up execution history
      const { data: deletedExecution, error: executionError } = await supabase
        .from('report_execution_history')
        .delete()
        .lt('started_at', cutoffDate.toISOString())
        .select('id')

      if (accessError) {
        console.error('Error cleaning up access records:', accessError)
      }

      if (executionError) {
        console.error('Error cleaning up execution records:', executionError)
      }

      return {
        deletedAccessRecords: deletedAccess?.length || 0,
        deletedExecutionRecords: deletedExecution?.length || 0
      }

    } catch (error) {
      console.error('Error cleaning up old audit records:', error)
      return { deletedAccessRecords: 0, deletedExecutionRecords: 0 }
    }
  }
}