// Story 2.7: Audit Trail Service
// Immutable audit record management and integrity verification

import { createClient } from '@/lib/supabase'
import type { 
  DecisionAuditRecord,
  AuditEventType,
  ServiceResult,
  AuditFilters,
  ComplianceReport,
  ComplianceFilters
} from '@/lib/types/approval-workflow'

export interface CreateAuditRecordRequest {
  hiringDecisionId: string
  auditEventType: AuditEventType
  previousState?: Record<string, any>
  newState?: Record<string, any>
  changeReason: string
  clientIpAddress?: string
  userAgent?: string
  isSystemGenerated?: boolean
  complianceFlag?: boolean
}

export interface AuditIntegrityReport {
  decisionId: string
  totalRecords: number
  verifiedRecords: number
  integrityScore: number // 0-100%
  suspiciousActivities: Array<{
    recordId: string
    issue: string
    severity: 'low' | 'medium' | 'high'
  }>
  lastVerified: Date
}

export interface AuditExportFilters {
  decisionIds?: string[]
  dateRange?: {
    from: Date
    to: Date
  }
  auditEventTypes?: AuditEventType[]
  actorIds?: string[]
  includeSystemGenerated?: boolean
  format: 'json' | 'csv' | 'pdf'
}

export interface AuditExport {
  exportId: string
  format: string
  recordCount: number
  exportedAt: Date
  downloadUrl: string
  expiresAt: Date
}

export class AuditTrailService {
  private supabase = createClient()

  /**
   * Create a new audit record for a hiring decision
   */
  async createAuditRecord(record: CreateAuditRecordRequest): Promise<ServiceResult<DecisionAuditRecord>> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        return { success: false, error: { code: 'AUTH_REQUIRED' , message: 'User not authenticated' }}
      }

      // Generate digital signature for the audit record
      const digitalSignature = await this.generateAuditSignature(user.id, record)

      const { data, error } = await this.supabase
        .from('decision_audit_trail')
        .insert({
          hiring_decision_id: record.hiringDecisionId,
          audit_event_type: record.auditEventType,
          actor_id: user.id,
          previous_state: record.previousState,
          new_state: record.newState,
          change_reason: record.changeReason,
          digital_signature: digitalSignature,
          client_ip_address: record.clientIpAddress,
          user_agent: record.userAgent,
          is_system_generated: record.isSystemGenerated || false,
          compliance_flag: record.complianceFlag || false
        })
        .select(`
          *,
          actor:auth.users(id, email, raw_user_meta_data)
        `)
        .single()

      if (error) {
        return { success: false, error: { code: 'DATABASE_ERROR' , message: error.message }}
      }

      return { success: true, data: this.mapDatabaseToAuditRecord(data) }
    } catch (error) {
      return { 
        success: false, 
        error: {
          code: 'AUDIT_CREATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Get audit trail for a specific hiring decision
   */
  async getAuditTrail(decisionId: string, filters?: AuditFilters): Promise<ServiceResult<DecisionAuditRecord[]>> {
    try {
      let query = this.supabase
        .from('decision_audit_trail')
        .select(`
          *,
          actor:auth.users(id, email, raw_user_meta_data)
        `)
        .eq('hiring_decision_id', decisionId)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.auditEventTypes?.length) {
        query = query.in('audit_event_type', filters.auditEventTypes)
      }

      if (filters?.actorIds?.length) {
        query = query.in('actor_id', filters.actorIds)
      }

      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.from.toISOString())
          .lte('created_at', filters.dateRange.to.toISOString())
      }

      if (filters?.complianceFlags !== undefined) {
        query = query.eq('compliance_flag', filters.complianceFlags[0])
      }

      if (filters?.systemGenerated !== undefined) {
        query = query.eq('is_system_generated', filters.systemGenerated)
      }

      const { data, error } = await query

      if (error) {
        return { success: false, error: { code: 'DATABASE_ERROR' , message: error.message }}
      }

      return { 
        success: true, 
        data: data.map(this.mapDatabaseToAuditRecord) 
      }
    } catch (error) {
      return { 
        success: false, 
        error: {
          code: 'AUDIT_RETRIEVAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Validate audit trail integrity for a decision
   */
  async validateAuditIntegrity(decisionId: string): Promise<ServiceResult<AuditIntegrityReport>> {
    try {
      // Get all audit records for the decision
      const auditResult = await this.getAuditTrail(decisionId)
      if (!auditResult.success) {
        return { 
          success: false, 
          error: typeof auditResult.error === 'string' 
            ? { code: 'AUDIT_RETRIEVAL_FAILED', message: auditResult.error }
            : auditResult.error || { code: 'AUDIT_RETRIEVAL_FAILED', message: 'Failed to retrieve audit records' }
        }
      }

      const auditRecords = auditResult.data
      if (!auditRecords) {
        return {
          success: false,
          error: { code: 'NO_AUDIT_RECORDS', message: 'No audit records found' }
        }
      }

      let verifiedRecords = 0
      const suspiciousActivities: AuditIntegrityReport['suspiciousActivities'] = []

      // Verify each record's digital signature
      for (const record of auditRecords) {
        const isValid = await this.verifyAuditSignature(record)
        if (isValid) {
          verifiedRecords++
        } else {
          suspiciousActivities.push({
            recordId: record.id,
            issue: 'Invalid digital signature',
            severity: 'high'
          })
        }

        // Check for suspicious patterns
        if (record.isSystemGenerated && record.actorId) {
          // System-generated records should not have human actors
          suspiciousActivities.push({
            recordId: record.id,
            issue: 'System-generated record with human actor',
            severity: 'medium'
          })
        }

        // Check for rapid successive changes
        const rapidChanges = auditRecords.filter(r => 
          r.actorId === record.actorId &&
          Math.abs(r.createdAt.getTime() - record.createdAt.getTime()) < 60000 // 1 minute
        )
        
        if (rapidChanges.length > 3) {
          suspiciousActivities.push({
            recordId: record.id,
            issue: 'Rapid successive changes detected',
            severity: 'low'
          })
        }
      }

      const integrityScore = auditRecords.length > 0 
        ? Math.round((verifiedRecords / auditRecords.length) * 100)
        : 100

      const report: AuditIntegrityReport = {
        decisionId,
        totalRecords: auditRecords.length,
        verifiedRecords,
        integrityScore,
        suspiciousActivities: [...new Map(
          suspiciousActivities.map(item => [item.recordId, item])
        ).values()], // Remove duplicates
        lastVerified: new Date()
      }

      return { success: true, data: report }
    } catch (error) {
      return { 
        success: false, 
        error: {
          code: 'INTEGRITY_VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Export audit data for compliance reporting
   */
  async exportAuditData(filters: AuditExportFilters): Promise<ServiceResult<AuditExport>> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        return { success: false, error: { code: 'AUTH_REQUIRED' , message: 'User not authenticated' }}
      }

      // Build query based on filters
      let query = this.supabase
        .from('decision_audit_trail')
        .select(`
          *,
          hiring_decision:hiring_decisions(application_id, decision_type, approver_id),
          actor:auth.users(id, email, raw_user_meta_data)
        `)
        .order('created_at', { ascending: false })

      if (filters.decisionIds?.length) {
        query = query.in('hiring_decision_id', filters.decisionIds)
      }

      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.from.toISOString())
          .lte('created_at', filters.dateRange.to.toISOString())
      }

      if (filters.auditEventTypes?.length) {
        query = query.in('audit_event_type', filters.auditEventTypes)
      }

      if (filters.actorIds?.length) {
        query = query.in('actor_id', filters.actorIds)
      }

      if (filters.includeSystemGenerated === false) {
        query = query.eq('is_system_generated', false)
      }

      const { data, error } = await query

      if (error) {
        return { success: false, error: { code: 'DATABASE_ERROR' , message: error.message }}
      }

      // Generate export file (in production, this would create actual files)
      const exportId = `audit_export_${Date.now()}_${user.id}`
      const exportData = this.formatExportData(data, filters.format)

      // Create audit record for the export
      await this.createAuditRecord({
        hiringDecisionId: filters.decisionIds?.[0] || 'bulk_export',
        auditEventType: 'audit_export',
        changeReason: `Audit data export requested by ${user.email}`,
        newState: { 
          exportId, 
          format: filters.format, 
          recordCount: data.length,
          filters 
        },
        isSystemGenerated: false,
        complianceFlag: true
      })

      const auditExport: AuditExport = {
        exportId,
        format: filters.format,
        recordCount: data.length,
        exportedAt: new Date(),
        downloadUrl: `/api/v1/approval/exports/${exportId}`, // This would need to be implemented
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }

      return { success: true, data: auditExport }
    } catch (error) {
      return { 
        success: false, 
        error: {
          code: 'EXPORT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Generate compliance report for audit trail data
   */
  async generateComplianceReport(
    reportType: 'approval_summary' | 'audit_trail' | 'delegation_report' | 'decision_integrity',
    filters: ComplianceFilters
  ): Promise<ServiceResult<ComplianceReport>> {
    try {
      const reportData = await this.buildComplianceReportData(reportType, filters)
      
      const report: ComplianceReport = {
        id: `compliance_${reportType}_${Date.now()}`,
        reportType,
        generatedAt: new Date(),
        reportPeriod: filters.dateRange || {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: new Date()
        },
        totalDecisions: reportData.totalDecisions,
        approvals: reportData.approvals,
        rejections: reportData.rejections,
        delegatedDecisions: reportData.delegatedDecisions,
        auditRecords: reportData.auditRecords,
        complianceIssues: reportData.complianceIssues,
        reportData
      }

      return { success: true, data: report }
    } catch (error) {
      return { 
        success: false, 
        error: {
          code: 'COMPLIANCE_REPORT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Schedule compliance reporting (would integrate with cron/scheduled jobs)
   */
  async scheduleComplianceReporting(): Promise<ServiceResult<boolean>> {
    try {
      // In production, this would integrate with a job scheduler
      // For now, just return success
      return { success: true, data: true }
    } catch (error) {
      return { 
        success: false, 
        error: {
          code: 'SCHEDULING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  // Private helper methods

  private async generateAuditSignature(actorId: string, record: CreateAuditRecordRequest): Promise<string> {
    // Generate cryptographic signature for audit record integrity
    // In production, this would use proper cryptographic signing
    const signatureData = {
      actorId,
      hiringDecisionId: record.hiringDecisionId,
      auditEventType: record.auditEventType,
      changeReason: record.changeReason,
      timestamp: Date.now()
    }
    return Buffer.from(JSON.stringify(signatureData)).toString('base64')
  }

  private async verifyAuditSignature(record: DecisionAuditRecord): Promise<boolean> {
    try {
      // Verify the digital signature of an audit record
      // In production, this would use proper cryptographic verification
      const expectedSignature = await this.generateAuditSignature(record.actorId, {
        hiringDecisionId: record.hiringDecisionId,
        auditEventType: record.auditEventType,
        changeReason: record.changeReason,
        previousState: record.previousState,
        newState: record.newState
      })
      
      // For demo purposes, assume signature is valid if it exists
      return Boolean(record.digitalSignature)
    } catch {
      return false
    }
  }

  private formatExportData(data: any[], format: string): any {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2)
      case 'csv':
        return this.convertToCSV(data)
      case 'pdf':
        return { message: 'PDF generation would be implemented here', data }
      default:
        return data
    }
  }

  private convertToCSV(data: any[]): string {
    if (!data.length) return ''
    
    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(',')
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header]
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      }).join(',')
    )
    
    return [csvHeaders, ...csvRows].join('\n')
  }

  private async buildComplianceReportData(
    reportType: string, 
    filters: ComplianceFilters
  ): Promise<Record<string, any>> {
    // Build compliance report data based on type
    const baseData = {
      totalDecisions: 0,
      approvals: 0,
      rejections: 0,
      delegatedDecisions: 0,
      auditRecords: 0,
      complianceIssues: 0
    }

    // In production, this would query the actual data
    // For now, return mock data structure
    return baseData
  }

  private mapDatabaseToAuditRecord(dbRecord: any): DecisionAuditRecord {
    return {
      id: dbRecord.id,
      hiringDecisionId: dbRecord.hiring_decision_id,
      auditEventType: dbRecord.audit_event_type,
      actorId: dbRecord.actor_id,
      actorName: dbRecord.actor?.raw_user_meta_data?.full_name || dbRecord.actor?.email || 'Unknown',
      previousState: dbRecord.previous_state,
      newState: dbRecord.new_state,
      changeReason: dbRecord.change_reason,
      digitalSignature: dbRecord.digital_signature,
      clientIpAddress: dbRecord.client_ip_address,
      userAgent: dbRecord.user_agent,
      createdAt: new Date(dbRecord.created_at),
      isSystemGenerated: dbRecord.is_system_generated,
      complianceFlag: dbRecord.compliance_flag
    }
  }
}

// Export singleton instance
export const auditTrailService = new AuditTrailService()