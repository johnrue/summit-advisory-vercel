import { supabase } from '@/lib/supabase'
import type {
  ServiceResult,
  TopsValidation,
  ComplianceCheck,
  ComplianceReport,
  ExpiryAlert,
  ComplianceFilters,
  TopsComplianceAudit,
  GuardProfile
} from '@/lib/types/guard-profile'
import { GuardProfileErrorCode } from '@/lib/types/guard-profile'

export class TOPSComplianceService {
  /**
   * Validate a TOPS profile URL for accessibility and format
   */
  async validateTopsProfile(profileUrl: string): Promise<ServiceResult<TopsValidation>> {
    try {
      // Validate URL format first
      if (!this.isValidTopsUrl(profileUrl)) {
        return {
          success: false,
          error: 'Invalid TOPS profile URL format',
          code: GuardProfileErrorCode.INVALID_TOPS_URL
        }
      }

      // Test URL accessibility (mock implementation)
      // In production, this would make an actual HTTP request to validate
      const validation: TopsValidation = await this.performTopsUrlValidation(profileUrl)

      return {
        success: true,
        data: validation
      }
    } catch (error) {
      return {
        success: false,
        error: `TOPS validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: GuardProfileErrorCode.INVALID_TOPS_URL
      }
    }
  }

  /**
   * Check TOPS compliance requirements for a guard profile
   */
  async checkTopsRequirements(
    profileId: string
  ): Promise<ServiceResult<ComplianceCheck>> {
    try {
      const { data: profile, error } = await supabase
        .from('guard_profiles')
        .select(`
          *,
          guard_document_expiry (
            id,
            document_type,
            document_name,
            expiry_date,
            status
          )
        `)
        .eq('id', profileId)
        .single()

      if (error || !profile) {
        return {
          success: false,
          error: 'Profile not found',
          code: GuardProfileErrorCode.PROFILE_NOT_FOUND
        }
      }

      const complianceCheck = await this.assessTopsCompliance(profile)

      // Log compliance check
      await this.logComplianceAccess(
        profileId,
        'compliance_check',
        'TOPS compliance assessment',
        {
          complianceScore: complianceCheck.overallScore,
          missingRequirements: complianceCheck.missingRequirements,
          criticalIssues: complianceCheck.criticalIssues
        }
      )

      return {
        success: true,
        data: complianceCheck
      }
    } catch (error) {
      return {
        success: false,
        error: `Compliance check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: GuardProfileErrorCode.COMPLIANCE_CHECK_FAILED
      }
    }
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(
    filters: ComplianceFilters = {}
  ): Promise<ServiceResult<ComplianceReport>> {
    try {
      // Build query with filters
      let query = supabase
        .from('guard_profiles')
        .select(`
          id,
          legal_name,
          employee_number,
          compliance_score,
          profile_status,
          employment_status,
          created_at,
          updated_at,
          guard_document_expiry (
            expiry_date,
            status,
            document_type
          )
        `)

      // Apply filters
      if (filters.employmentStatus?.length) {
        query = query.in('employment_status', filters.employmentStatus)
      }
      if (filters.profileStatus?.length) {
        query = query.in('profile_status', filters.profileStatus)
      }
      if (filters.complianceScoreMin !== undefined) {
        query = query.gte('compliance_score', filters.complianceScoreMin)
      }
      if (filters.complianceScoreMax !== undefined) {
        query = query.lte('compliance_score', filters.complianceScoreMax)
      }
      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.startDate)
          .lte('created_at', filters.dateRange.endDate)
      }

      const { data: profiles, error } = await query

      if (error) {
        return {
          success: false,
          error: `Report generation failed: ${error.message}`
        }
      }

      // Process profiles for report
      const guardProfiles = profiles?.map(profile => {
        const expiringDocs = profile.guard_document_expiry?.filter(doc => {
          const expiryDate = new Date(doc.expiry_date)
          const thirtyDaysFromNow = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
          return expiryDate <= thirtyDaysFromNow
        }).length || 0

        return {
          id: profile.id,
          name: profile.legal_name,
          employeeNumber: profile.employee_number || 'N/A',
          complianceScore: profile.compliance_score,
          status: profile.profile_status,
          expiringDocuments: expiringDocs
        }
      }) || []

      // Calculate summary statistics
      const totalProfiles = guardProfiles.length
      const compliantProfiles = guardProfiles.filter(p => p.complianceScore >= 90).length
      const nonCompliantProfiles = totalProfiles - compliantProfiles
      const averageScore = totalProfiles > 0 
        ? Math.round(guardProfiles.reduce((sum, p) => sum + p.complianceScore, 0) / totalProfiles)
        : 0
      const expiringDocuments = guardProfiles.reduce((sum, p) => sum + p.expiringDocuments, 0)

      const report: ComplianceReport = {
        guardProfiles,
        summary: {
          totalProfiles,
          compliantProfiles,
          nonCompliantProfiles,
          averageScore,
          expiringDocuments
        },
        generatedAt: new Date().toISOString(),
        generatedBy: (await supabase.auth.getUser()).data.user?.id || 'system'
      }

      return {
        success: true,
        data: report
      }
    } catch (error) {
      return {
        success: false,
        error: `Report generation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Check for documents expiring soon
   */
  async checkExpiryRequirements(): Promise<ServiceResult<ExpiryAlert[]>> {
    try {
      // Get documents expiring within 30 days
      const thirtyDaysFromNow = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))

      const { data: expiringDocs, error } = await supabase
        .from('guard_document_expiry')
        .select(`
          *,
          guard_profiles!inner (
            legal_name,
            employee_number
          )
        `)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .eq('status', 'active')
        .order('expiry_date', { ascending: true })

      if (error) {
        return {
          success: false,
          error: `Expiry check failed: ${error.message}`
        }
      }

      const alerts: ExpiryAlert[] = expiringDocs?.map(doc => {
        const expiryDate = new Date(doc.expiry_date)
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        
        let priority: 'high' | 'medium' | 'low' = 'low'
        if (daysUntilExpiry <= 7) priority = 'high'
        else if (daysUntilExpiry <= 14) priority = 'medium'

        return {
          guardProfileId: doc.guard_profile_id,
          guardName: doc.guard_profiles.legal_name,
          documentType: doc.document_type,
          documentName: doc.document_name,
          expiryDate: doc.expiry_date,
          daysUntilExpiry,
          priority
        }
      }) || []

      return {
        success: true,
        data: alerts
      }
    } catch (error) {
      return {
        success: false,
        error: `Expiry check error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Log compliance-related access for audit trail
   */
  async logComplianceAccess(
    profileId: string,
    accessType: string,
    action: string,
    details: any
  ): Promise<ServiceResult<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      await supabase
        .from('tops_compliance_audit')
        .insert([{
          guard_profile_id: profileId,
          audit_type: accessType,
          accessed_by: user?.id || 'system',
          access_details: {
            action,
            timestamp: new Date().toISOString(),
            userAgent: navigator?.userAgent || 'Unknown',
            ...details
          },
          compliance_status: 'pending_review'
        }])

      return {
        success: true,
        data: undefined
      }
    } catch (error) {
      return {
        success: false,
        error: `Audit logging failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Get compliance history for a profile
   */
  async getComplianceHistory(
    profileId: string
  ): Promise<ServiceResult<TopsComplianceAudit[]>> {
    try {
      const { data: auditRecords, error } = await supabase
        .from('tops_compliance_audit')
        .select('*')
        .eq('guard_profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(50) // Last 50 audit records

      if (error) {
        return {
          success: false,
          error: `Failed to fetch compliance history: ${error.message}`
        }
      }

      const history: TopsComplianceAudit[] = auditRecords?.map(record => ({
        id: record.id,
        guardProfileId: record.guard_profile_id,
        auditType: record.audit_type,
        accessedBy: record.accessed_by,
        accessDetails: record.access_details,
        complianceStatus: record.compliance_status,
        createdAt: record.created_at
      })) || []

      return {
        success: true,
        data: history
      }
    } catch (error) {
      return {
        success: false,
        error: `History fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Send expiry reminder notifications
   */
  async sendExpiryReminders(): Promise<ServiceResult<{ sent: number; failed: number }>> {
    try {
      const alertsResult = await this.checkExpiryRequirements()
      if (!alertsResult.success) {
        return alertsResult
      }

      const alerts = alertsResult.data
      let sent = 0
      let failed = 0

      for (const alert of alerts) {
        try {
          // Update reminder sent timestamp
          const currentTimestamp = new Date().toISOString()
          const { data: currentRecord } = await supabase
            .from('guard_document_expiry')
            .select('renewal_reminder_sent_at')
            .eq('guard_profile_id', alert.guardProfileId)
            .eq('document_type', alert.documentType)
            .single()

          const currentReminders = currentRecord?.renewal_reminder_sent_at || []
          const updatedReminders = [...currentReminders, currentTimestamp]

          await supabase
            .from('guard_document_expiry')
            .update({
              renewal_reminder_sent_at: updatedReminders
            })
            .eq('guard_profile_id', alert.guardProfileId)
            .eq('document_type', alert.documentType)

          // In production, send actual notification (email/SMS)
          // await this.sendNotification(alert)
          
          sent++
        } catch (error) {
          console.error(`Failed to send reminder for ${alert.guardProfileId}:`, error)
          failed++
        }
      }

      return {
        success: true,
        data: { sent, failed }
      }
    } catch (error) {
      return {
        success: false,
        error: `Reminder sending error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Private helper methods

  private isValidTopsUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      // Check if it's a valid TOPS-related URL pattern
      return parsed.protocol === 'https:' && 
             (parsed.hostname.includes('tops') || 
              parsed.hostname.includes('dps.texas.gov') ||
              parsed.hostname.includes('txdps'))
    } catch {
      return false
    }
  }

  private async performTopsUrlValidation(url: string): Promise<TopsValidation> {
    // Mock implementation - in production, make actual HTTP request
    // to validate TOPS profile accessibility
    
    try {
      // Simulate network call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock successful validation
      return {
        isValid: true,
        isAccessible: true,
        profileData: {
          name: 'Mock Profile',
          license: 'TX-123456',
          status: 'Active'
        }
      }
    } catch (error) {
      return {
        isValid: false,
        isAccessible: false,
        error: 'Could not access TOPS profile'
      }
    }
  }

  private async assessTopsCompliance(profile: any): Promise<ComplianceCheck> {
    const requirements = [
      'Basic Information Complete',
      'Government ID Uploaded',
      'Background Check Completed',
      'Security Training Certificate',
      'Drug-Free Policy Signed',
      'TOPS Profile URL Provided'
    ]

    const missingRequirements: string[] = []
    const criticalIssues: string[] = []
    const recommendations: string[] = []

    // Check basic information
    if (!profile.legal_name || !profile.date_of_birth || !profile.ssn_last_six) {
      missingRequirements.push('Basic Information Complete')
    }

    // Check documents
    const docChecklist = profile.document_checklist || {}
    if (!docChecklist.governmentId) {
      missingRequirements.push('Government ID Uploaded')
      criticalIssues.push('Government-issued photo ID is required for TOPS compliance')
    }

    if (!docChecklist.policyAcknowledgment) {
      missingRequirements.push('Drug-Free Policy Signed')
    }

    if (!docChecklist.securityTraining) {
      missingRequirements.push('Security Training Certificate')
      recommendations.push('Complete required security training and upload certificate')
    }

    // Check TOPS profile
    if (!profile.tops_profile_url) {
      missingRequirements.push('TOPS Profile URL Provided')
      recommendations.push('Add valid TOPS profile URL for regulatory compliance')
    }

    // Check for expiring documents
    const expiringDocs = profile.guard_document_expiry?.filter((doc: any) => {
      const expiryDate = new Date(doc.expiry_date)
      const thirtyDaysFromNow = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
      return expiryDate <= thirtyDaysFromNow && doc.status === 'active'
    }) || []

    if (expiringDocs.length > 0) {
      criticalIssues.push(`${expiringDocs.length} document(s) expiring within 30 days`)
      recommendations.push('Renew expiring documents to maintain compliance')
    }

    const metRequirements = requirements.length - missingRequirements.length
    const overallScore = Math.round((metRequirements / requirements.length) * 100)

    const isCompliant = overallScore >= 90 && criticalIssues.length === 0

    return {
      isCompliant,
      overallScore,
      requirements,
      missingRequirements,
      criticalIssues,
      recommendations,
      lastAssessed: new Date().toISOString(),
      nextReviewDate: new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)).toISOString() // 90 days
    }
  }
}

