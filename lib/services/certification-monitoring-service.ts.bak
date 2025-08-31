import { supabase } from '@/lib/supabase'
import { AuditService } from './audit-service'
import type { 
  GuardCertification, 
  CertificationAlert, 
  CertificationExpiryCheck,
  CertificationDashboardData,
  Guard
} from '@/lib/types'

/**
 * Certification Monitoring Service for Summit Advisory
 * Handles automated monitoring, alerts, and compliance tracking for guard certifications
 */
export class CertificationMonitoringService {
  private static auditService = AuditService.getInstance()

  /**
   * Check for certifications approaching expiry and trigger alerts
   */
  static async checkExpirations(): Promise<CertificationExpiryCheck[]> {
    try {
      const today = new Date()
      const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000))

      // Fetch all active certifications expiring within 30 days
      const { data: certifications, error } = await supabase
        .from('guard_certifications')
        .select(`
          *,
          guards:guard_id (*)
        `)
        .eq('status', 'active')
        .lte('expiry_date', thirtyDaysFromNow.toISOString())
        .order('expiry_date', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch expiring certifications: ${error.message}`)
      }

      const expiryChecks: CertificationExpiryCheck[] = []

      for (const cert of certifications || []) {
        const daysUntilExpiry = this.calculateDaysUntilExpiry(new Date(cert.expiry_date))
        const alertType = this.determineAlertType(daysUntilExpiry)
        
        if (alertType) {
          const expiryCheck: CertificationExpiryCheck = {
            certification: this.mapDbCertification(cert),
            guard: cert.guards,
            daysUntilExpiry,
            alertType,
            shouldAlert: await this.shouldSendAlert(cert.id, alertType),
            canSchedule: daysUntilExpiry >= 0 && cert.status === 'active'
          }
          
          expiryChecks.push(expiryCheck)

          // Send alert if needed
          if (expiryCheck.shouldAlert) {
            await this.sendExpiryAlert(expiryCheck)
          }
        }
      }

      // Log monitoring execution
      await this.auditService.logAction({
        action: 'executed',
        entity_type: 'certification_monitoring',
        entity_id: 'system',
        details: {
          certificationsChecked: certifications?.length || 0,
          alertsTriggered: expiryChecks.filter(check => check.shouldAlert).length,
          expiredCertifications: expiryChecks.filter(check => check.daysUntilExpiry < 0).length
        },
        user_id: 'system'
      })

      return expiryChecks

    } catch (error) {
      console.error('Error checking certification expirations:', error)
      throw new Error('Failed to check certification expirations')
    }
  }

  /**
   * Get comprehensive certification dashboard data
   */
  static async getCertificationDashboard(): Promise<CertificationDashboardData> {
    try {
      const expiryChecks = await this.getAllCertificationChecks()

      const dashboard: CertificationDashboardData = {
        expiringIn30Days: expiryChecks.filter(check => 
          check.daysUntilExpiry <= 30 && check.daysUntilExpiry > 14
        ),
        expiringIn14Days: expiryChecks.filter(check => 
          check.daysUntilExpiry <= 14 && check.daysUntilExpiry > 7
        ),
        expiringIn7Days: expiryChecks.filter(check => 
          check.daysUntilExpiry <= 7 && check.daysUntilExpiry >= 0
        ),
        expired: expiryChecks.filter(check => check.daysUntilExpiry < 0),
        totalGuards: 0,
        compliantGuards: 0,
        nonCompliantGuards: 0,
        pendingRenewals: 0
      }

      // Calculate summary statistics
      const guardIds = new Set(expiryChecks.map(check => check.guard.id))
      dashboard.totalGuards = guardIds.size

      const compliantGuards = new Set()
      const nonCompliantGuards = new Set()

      expiryChecks.forEach(check => {
        if (check.canSchedule) {
          compliantGuards.add(check.guard.id)
        } else {
          nonCompliantGuards.add(check.guard.id)
        }
      })

      dashboard.compliantGuards = compliantGuards.size
      dashboard.nonCompliantGuards = nonCompliantGuards.size

      // Get pending renewals count
      const { count: pendingCount } = await supabase
        .from('certification_renewal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('request_status', 'pending')

      dashboard.pendingRenewals = pendingCount || 0

      return dashboard

    } catch (error) {
      console.error('Error generating certification dashboard:', error)
      throw new Error('Failed to generate certification dashboard')
    }
  }

  /**
   * Check if a guard can be scheduled based on certification status
   */
  static async canGuardBeScheduled(guardId: string): Promise<boolean> {
    try {
      const { data: certifications, error } = await supabase
        .from('guard_certifications')
        .select('expiry_date, status')
        .eq('guard_id', guardId)
        .eq('status', 'active')

      if (error) {
        throw new Error(`Failed to check guard certifications: ${error.message}`)
      }

      if (!certifications || certifications.length === 0) {
        return false // No active certifications
      }

      // Check if any certifications are expired
      const today = new Date()
      const hasExpiredCertifications = certifications.some(cert => 
        new Date(cert.expiry_date) < today
      )

      return !hasExpiredCertifications

    } catch (error) {
      console.error('Error checking guard scheduling eligibility:', error)
      return false
    }
  }

  /**
   * Get guards with expired certifications for escalation
   */
  static async getGuardsForEscalation(): Promise<CertificationExpiryCheck[]> {
    try {
      const expiryChecks = await this.getAllCertificationChecks()
      
      // Return guards with expired certifications or overdue renewals
      return expiryChecks.filter(check => 
        check.daysUntilExpiry < 0 || 
        (check.daysUntilExpiry <= 7 && !check.canSchedule)
      )

    } catch (error) {
      console.error('Error getting guards for escalation:', error)
      return []
    }
  }

  /**
   * Process escalation notifications for overdue renewals
   */
  static async processEscalations(): Promise<void> {
    try {
      const guardsForEscalation = await this.getGuardsForEscalation()

      for (const check of guardsForEscalation) {
        // Check if escalation already sent
        const shouldEscalate = await this.shouldSendAlert(
          check.certification.id, 
          'escalation'
        )

        if (shouldEscalate) {
          await this.sendEscalationAlert(check)
        }
      }

      // Log escalation processing
      await this.auditService.logAction({
        action: 'processed_escalations',
        entity_type: 'certification_monitoring',
        entity_id: 'system',
        details: {
          guardsProcessed: guardsForEscalation.length,
          escalationsSent: guardsForEscalation.filter(check => check.shouldAlert).length
        },
        user_id: 'system'
      })

    } catch (error) {
      console.error('Error processing escalations:', error)
      throw new Error('Failed to process certification escalations')
    }
  }

  // Private helper methods

  private static async getAllCertificationChecks(): Promise<CertificationExpiryCheck[]> {
    const { data: certifications, error } = await supabase
      .from('guard_certifications')
      .select(`
        *,
        guards:guard_id (*)
      `)
      .eq('status', 'active')
      .order('expiry_date', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch certifications: ${error.message}`)
    }

    return (certifications || []).map(cert => {
      const daysUntilExpiry = this.calculateDaysUntilExpiry(new Date(cert.expiry_date))
      const alertType = this.determineAlertType(daysUntilExpiry)
      
      return {
        certification: this.mapDbCertification(cert),
        guard: cert.guards,
        daysUntilExpiry,
        alertType: alertType || 'expired',
        shouldAlert: false,
        canSchedule: daysUntilExpiry >= 0 && cert.status === 'active'
      }
    })
  }

  private static calculateDaysUntilExpiry(expiryDate: Date): number {
    // Normalize dates to start of day for consistent day calculations
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)
    
    const diffTime = expiry.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  private static determineAlertType(daysUntilExpiry: number): '30_day' | '14_day' | '7_day' | 'expired' | null {
    if (daysUntilExpiry < 0) return 'expired'
    if (daysUntilExpiry <= 7) return '7_day'
    if (daysUntilExpiry <= 14) return '14_day'
    if (daysUntilExpiry <= 30) return '30_day'
    return null
  }

  private static async shouldSendAlert(certificationId: string, alertType: string): Promise<boolean> {
    // Check if alert already sent today
    const today = new Date().toISOString().split('T')[0]
    
    const { data: existingAlert, error } = await supabase
      .from('certification_alerts')
      .select('id')
      .eq('guard_certification_id', certificationId)
      .eq('alert_type', alertType)
      .eq('alert_date', today)
      .maybeSingle()

    if (error) {
      console.error('Error checking existing alerts:', error)
      return false
    }

    return !existingAlert
  }

  private static async sendExpiryAlert(check: CertificationExpiryCheck): Promise<void> {
    try {
      // Record the alert
      const { error: insertError } = await supabase
        .from('certification_alerts')
        .insert([{
          guard_certification_id: check.certification.id,
          guard_id: check.guard.id,
          alert_type: check.alertType,
          alert_date: new Date().toISOString().split('T')[0],
          sent_at: new Date().toISOString(),
          email_sent: true // In a real system, this would be set after email success
        }])

      if (insertError) {
        throw new Error(`Failed to record alert: ${insertError.message}`)
      }

      // Log the alert in audit trail
      await this.auditService.logAction({
        action: 'alert_sent',
        entity_type: 'certification_expiry',
        entity_id: check.certification.id,
        details: {
          guardId: check.guard.id,
          alertType: check.alertType,
          daysUntilExpiry: check.daysUntilExpiry,
          certificationType: check.certification.certificationType
        },
        user_id: 'system'
      })

    } catch (error) {
      console.error('Error sending expiry alert:', error)
    }
  }

  private static async sendEscalationAlert(check: CertificationExpiryCheck): Promise<void> {
    try {
      // Record the escalation alert
      const { error: insertError } = await supabase
        .from('certification_alerts')
        .insert([{
          guard_certification_id: check.certification.id,
          guard_id: check.guard.id,
          alert_type: 'escalation',
          alert_date: new Date().toISOString().split('T')[0],
          sent_at: new Date().toISOString(),
          email_sent: true,
          escalated: true
        }])

      if (insertError) {
        throw new Error(`Failed to record escalation: ${insertError.message}`)
      }

      // Log the escalation in audit trail
      await this.auditService.logAction({
        action: 'escalation_sent',
        entity_type: 'certification_expiry',
        entity_id: check.certification.id,
        details: {
          guardId: check.guard.id,
          daysOverdue: Math.abs(check.daysUntilExpiry),
          certificationType: check.certification.certificationType
        },
        user_id: 'system'
      })

    } catch (error) {
      console.error('Error sending escalation alert:', error)
    }
  }

  private static mapDbCertification(dbCert: any): GuardCertification {
    return {
      id: dbCert.id,
      guardId: dbCert.guard_id,
      certificationType: dbCert.certification_type,
      certificateNumber: dbCert.certificate_number,
      issuedDate: dbCert.issued_date ? new Date(dbCert.issued_date) : undefined,
      expiryDate: new Date(dbCert.expiry_date),
      issuingAuthority: dbCert.issuing_authority,
      documentUrl: dbCert.document_url,
      status: dbCert.status,
      createdAt: dbCert.created_at,
      updatedAt: dbCert.updated_at
    }
  }
}