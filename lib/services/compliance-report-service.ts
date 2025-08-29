import { supabase } from '@/lib/supabase'
import { AuditService } from './audit-service'
import type { Guard, ComplianceReport, TOPSReportData, ReportParameters } from '@/lib/types'

/**
 * TOPS Compliance Report Service for Summit Advisory
 * Generates compliance reports meeting Texas DPS requirements
 */
export class ComplianceReportService {
  
  /**
   * Generate TOPS compliance report with all required fields
   */
  static async generateTOPSReport(parameters: ReportParameters): Promise<ComplianceReport> {
    const auditService = AuditService.getInstance()
    let reportId: string | null = null

    try {
      // Fetch guard data for the specified period
      const guardData = await this.fetchGuardDataForPeriod(
        parameters.startDate,
        parameters.endDate
      )

      // Apply role-based data masking
      const maskedData = this.applyDataMasking(guardData, parameters.includeSensitiveData)

      // Generate report data structure
      const reportData: TOPSReportData = {
        reportPeriod: {
          startDate: parameters.startDate,
          endDate: parameters.endDate
        },
        company: {
          name: "Summit Advisory",
          license: "TX DPS #C29754001",
          contact: "(830) 201-0414",
          serviceAreas: ["Houston", "Dallas", "Austin", "San Antonio"]
        },
        guards: maskedData,
        generatedBy: parameters.generatedBy,
        generatedAt: new Date(),
        reportType: 'tops_compliance'
      }

      // Store report metadata
      const reportRecord = await this.storeReportMetadata({
        reportType: 'tops_compliance',
        generatedBy: parameters.generatedBy,
        reportPeriodStart: parameters.startDate,
        reportPeriodEnd: parameters.endDate,
        parameters: parameters,
        recipients: parameters.recipients || []
      })

      reportId = reportRecord.id

      // Log report generation in audit trail
      await auditService.logComplianceReportGeneration(
        reportRecord.id,
        'generated',
        {
          startDate: parameters.startDate.toISOString(),
          endDate: parameters.endDate.toISOString(),
          format: parameters.format,
          includeSensitiveData: parameters.includeSensitiveData,
          recipients: parameters.recipients,
          guardsCount: guardData.length
        },
        `TOPS compliance report generated for period ${parameters.startDate.toDateString()} to ${parameters.endDate.toDateString()}`,
        parameters.generatedBy
      )

      return {
        id: reportRecord.id,
        data: reportData,
        metadata: reportRecord,
        format: parameters.format
      }

    } catch (error) {
      console.error('Error generating TOPS report:', error)
      
      // Log report generation failure
      if (reportId) {
        await auditService.logComplianceReportGeneration(
          reportId,
          'failed',
          parameters,
          `Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          parameters.generatedBy
        )
      }
      
      throw new Error('Failed to generate TOPS compliance report')
    }
  }

  /**
   * Fetch guard data for the specified reporting period
   */
  private static async fetchGuardDataForPeriod(
    startDate: Date,
    endDate: Date
  ): Promise<Guard[]> {
    const { data: guards, error } = await supabase
      .from('guards')
      .select(`
        *,
        certifications (*),
        background_checks (*),
        training_records (*),
        employment_history (*)
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch guard data: ${error.message}`)
    }

    return guards || []
  }

  /**
   * Apply role-based data masking for sensitive information
   * SSN and sensitive data only visible to Manager/Admin roles
   */
  private static applyDataMasking(
    guards: Guard[],
    includeSensitiveData: boolean
  ): Guard[] {
    if (includeSensitiveData) {
      return guards // Return original data without processing if sensitive data is included
    }
    
    return guards.map(guard => ({
      ...guard,
      ssn: this.maskSSN(guard.ssn),
      dateOfBirth: null, // Complete redaction for GDPR/CCPA compliance
      homeAddress: 'RESTRICTED - Contact Admin',
      emergencyContact: 'RESTRICTED - Contact Admin'
    }))
  }

  /**
   * Mask SSN for non-privileged users
   */
  private static maskSSN(ssn: string): string {
    if (!ssn || ssn.length < 4) return 'XXX-XX-XXXX'
    // Ensure we only show last 4 digits regardless of SSN format
    const cleanSSN = ssn.replace(/\D/g, '') // Remove all non-digits
    if (cleanSSN.length < 4) return 'XXX-XX-XXXX'
    return `XXX-XX-${cleanSSN.slice(-4)}`
  }

  /**
   * Store report metadata in compliance_reports table
   */
  private static async storeReportMetadata(metadata: any) {
    const { data, error } = await supabase
      .from('compliance_reports')
      .insert([metadata])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to store report metadata: ${error.message}`)
    }

    return data
  }

  /**
   * Get guard roster with all TOPS required fields
   */
  static getGuardRosterFields(guards: Guard[]) {
    return guards.map(guard => ({
      licenseNumber: guard.licenseNumber,
      firstName: guard.firstName,
      lastName: guard.lastName,
      licenseExpiry: guard.licenseExpiry,
      certificationStatus: guard.certifications?.status || 'unknown',
      backgroundCheckStatus: guard.backgroundChecks?.status || 'pending',
      backgroundCheckDate: guard.backgroundChecks?.completedAt,
      employmentStatus: guard.employmentStatus,
      employmentStartDate: guard.employmentStartDate,
      trainingCompletionDate: guard.trainingRecords?.completedAt
    }))
  }

  /**
   * Get certification status summary for TOPS reporting
   */
  static getCertificationSummary(guards: Guard[]) {
    const summary = {
      active: 0,
      expired: 0,
      pendingRenewal: 0,
      total: guards.length
    }

    guards.forEach(guard => {
      const status = guard.certifications?.status
      if (status === 'active') summary.active++
      else if (status === 'expired') summary.expired++
      else if (status === 'pending_renewal') summary.pendingRenewal++
    })

    return summary
  }

  /**
   * Get background check status summary
   */
  static getBackgroundCheckSummary(guards: Guard[]) {
    const summary = {
      completed: 0,
      pending: 0,
      failed: 0,
      total: guards.length
    }

    guards.forEach(guard => {
      const status = guard.backgroundChecks?.status
      if (status === 'passed') summary.completed++
      else if (status === 'pending') summary.pending++
      else if (status === 'failed') summary.failed++
    })

    return summary
  }
}