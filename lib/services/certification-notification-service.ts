import { AuditService } from './audit-service'
import type { CertificationExpiryCheck } from '@/lib/types'

/**
 * Certification Notification Service for Summit Advisory
 * Handles email notifications for certification expiry alerts and escalations
 */
export class CertificationNotificationService {
  private static auditService = AuditService.getInstance()

  /**
   * Send certification expiry alert to guard
   */
  static async sendExpiryAlert(check: CertificationExpiryCheck): Promise<void> {
    try {
      const alertType = check.alertType
      const daysRemaining = check.daysUntilExpiry
      
      // Email content based on alert type
      let subject: string
      let urgencyLevel: string
      
      switch (alertType) {
        case '30_day':
          subject = `Certification Renewal Reminder - ${check.certification.certificationType}`
          urgencyLevel = 'normal'
          break
        case '14_day':
          subject = `URGENT: Certification Expires Soon - ${check.certification.certificationType}`
          urgencyLevel = 'high'
          break
        case '7_day':
          subject = `CRITICAL: Certification Expires in ${daysRemaining} Days - ${check.certification.certificationType}`
          urgencyLevel = 'critical'
          break
        case 'expired':
          subject = `EXPIRED: Certification Renewal Required - ${check.certification.certificationType}`
          urgencyLevel = 'critical'
          break
        default:
          return
      }

      // Prepare email data
      const emailData = {
        to: check.guard.email,
        subject,
        template: 'certification-expiry-alert',
        data: {
          guardName: `${check.guard.firstName} ${check.guard.lastName}`,
          certificationType: check.certification.certificationType,
          expiryDate: check.certification.expiryDate.toLocaleDateString(),
          daysRemaining: daysRemaining,
          urgencyLevel,
          renewalInstructions: this.getRenewalInstructions(check.certification.certificationType),
          companyInfo: {
            name: 'Summit Advisory',
            license: 'TX DPS #C29754001',
            contact: '(830) 201-0414'
          }
        }
      }

      // In a real implementation, this would use an email service like Resend
      
      // Log notification in audit trail
      await this.auditService.logAction({
        action: 'created',
        entity_type: 'compliance_record',
        entity_id: check.certification.id,
        details: {
          guardId: check.guard.id,
          alertType: check.alertType,
          emailSubject: subject,
          recipientEmail: check.guard.email,
          daysUntilExpiry: check.daysUntilExpiry
        },
        user_id: 'system'
      })

    } catch (error) {
      throw new Error('Failed to send certification expiry alert')
    }
  }

  /**
   * Send escalation notification to managers
   */
  static async sendEscalationAlert(check: CertificationExpiryCheck): Promise<void> {
    try {
      const isOverdue = check.daysUntilExpiry < 0
      const subject = isOverdue
        ? `ESCALATION: Guard ${check.guard.firstName} ${check.guard.lastName} - Overdue Certification`
        : `ESCALATION: Guard ${check.guard.firstName} ${check.guard.lastName} - Critical Certification Expiry`

      // Get manager email addresses (in a real system, this would be fetched from database)
      const managerEmails = [
        'manager@summitadvisoryfirm.com',
        'compliance@summitadvisoryfirm.com'
      ]

      const emailData = {
        to: managerEmails,
        subject,
        template: 'certification-escalation-alert',
        data: {
          guardName: `${check.guard.firstName} ${check.guard.lastName}`,
          guardEmail: check.guard.email,
          guardPhone: check.guard.phone || 'Not provided',
          certificationType: check.certification.certificationType,
          expiryDate: check.certification.expiryDate.toLocaleDateString(),
          daysOverdue: isOverdue ? Math.abs(check.daysUntilExpiry) : 0,
          daysUntilExpiry: !isOverdue ? check.daysUntilExpiry : 0,
          isOverdue,
          certificateNumber: check.certification.certificateNumber || 'N/A',
          issuingAuthority: check.certification.issuingAuthority || 'N/A',
          canSchedule: check.canSchedule,
          actionRequired: isOverdue 
            ? 'Immediate action required - Guard cannot be scheduled until certification is renewed'
            : 'Urgent follow-up required - Certification expires soon',
          companyInfo: {
            name: 'Summit Advisory',
            license: 'TX DPS #C29754001',
            contact: '(830) 201-0414'
          }
        }
      }

      // In a real implementation, this would use an email service

      // Log escalation in audit trail
      await this.auditService.logAction({
        action: 'created',
        entity_type: 'compliance_record',
        entity_id: check.certification.id,
        details: {
          guardId: check.guard.id,
          recipientEmails: managerEmails,
          emailSubject: subject,
          isOverdue,
          daysOverdue: isOverdue ? Math.abs(check.daysUntilExpiry) : 0
        },
        user_id: 'system'
      })

    } catch (error) {
      throw new Error('Failed to send escalation alert to managers')
    }
  }

  /**
   * Send renewal request notification to managers
   */
  static async sendRenewalRequestNotification(data: {
    guardName: string
    guardEmail: string
    certificationType: string
    currentExpiryDate: Date
    newExpiryDate: Date
    documentUrl: string
    requestId: string
  }): Promise<void> {
    try {
      const managerEmails = [
        'manager@summitadvisoryfirm.com',
        'compliance@summitadvisoryfirm.com'
      ]

      const emailData = {
        to: managerEmails,
        subject: `Certification Renewal Request - ${data.guardName}`,
        template: 'certification-renewal-request',
        data: {
          guardName: data.guardName,
          guardEmail: data.guardEmail,
          certificationType: data.certificationType,
          currentExpiryDate: data.currentExpiryDate.toLocaleDateString(),
          newExpiryDate: data.newExpiryDate.toLocaleDateString(),
          documentUrl: data.documentUrl,
          requestId: data.requestId,
          reviewUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/certifications/renewals/${data.requestId}`,
          companyInfo: {
            name: 'Summit Advisory',
            license: 'TX DPS #C29754001',
            contact: '(830) 201-0414'
          }
        }
      }

      // In a real implementation, this would use an email service

      // Log notification in audit trail
      await this.auditService.logAction({
        action: 'created',
        entity_type: 'compliance_record',
        entity_id: data.requestId,
        details: {
          guardName: data.guardName,
          certificationType: data.certificationType,
          recipientEmails: managerEmails
        },
        user_id: 'system'
      })

    } catch (error) {
      throw new Error('Failed to send renewal request notification')
    }
  }

  /**
   * Send renewal decision notification to guard
   */
  static async sendRenewalDecisionNotification(data: {
    guardName: string
    guardEmail: string
    certificationType: string
    decision: 'approved' | 'rejected'
    reviewNotes?: string
    newExpiryDate?: Date
  }): Promise<void> {
    try {
      const isApproved = data.decision === 'approved'
      const subject = `Certification Renewal ${isApproved ? 'Approved' : 'Rejected'} - ${data.certificationType}`

      const emailData = {
        to: data.guardEmail,
        subject,
        template: 'certification-renewal-decision',
        data: {
          guardName: data.guardName,
          certificationType: data.certificationType,
          decision: data.decision,
          isApproved,
          reviewNotes: data.reviewNotes,
          newExpiryDate: data.newExpiryDate?.toLocaleDateString(),
          nextSteps: isApproved 
            ? 'Your certification has been updated with the new expiry date. You can continue your normal schedule.'
            : 'Please review the feedback and submit a new renewal request with the required corrections.',
          companyInfo: {
            name: 'Summit Advisory',
            license: 'TX DPS #C29754001',
            contact: '(830) 201-0414'
          }
        }
      }

      // In a real implementation, this would use an email service

      // Log notification in audit trail
      await this.auditService.logAction({
        action: 'updated',
        entity_type: 'compliance_record',
        entity_id: 'renewal_decision',
        details: {
          guardName: data.guardName,
          guardEmail: data.guardEmail,
          certificationType: data.certificationType,
          decision: data.decision
        },
        user_id: 'system'
      })

    } catch (error) {
      throw new Error('Failed to send renewal decision notification')
    }
  }

  /**
   * Send batch notification summary to compliance officers
   */
  static async sendComplianceSummary(data: {
    periodStart: Date
    periodEnd: Date
    totalAlerts: number
    expiredCertifications: number
    pendingRenewals: number
    escalationsRequired: number
  }): Promise<void> {
    try {
      const complianceEmails = [
        'compliance@summitadvisoryfirm.com',
        'manager@summitadvisoryfirm.com'
      ]

      const emailData = {
        to: complianceEmails,
        subject: `Weekly Certification Compliance Summary`,
        template: 'certification-compliance-summary',
        data: {
          periodStart: data.periodStart.toLocaleDateString(),
          periodEnd: data.periodEnd.toLocaleDateString(),
          totalAlerts: data.totalAlerts,
          expiredCertifications: data.expiredCertifications,
          pendingRenewals: data.pendingRenewals,
          escalationsRequired: data.escalationsRequired,
          dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/certifications/dashboard`,
          companyInfo: {
            name: 'Summit Advisory',
            license: 'TX DPS #C29754001',
            contact: '(830) 201-0414'
          }
        }
      }

      // In a real implementation, this would use an email service

      // Log summary in audit trail
      await this.auditService.logAction({
        action: 'created',
        entity_type: 'compliance_report',
        entity_id: 'weekly_summary',
        details: {
          periodStart: data.periodStart.toISOString(),
          periodEnd: data.periodEnd.toISOString(),
          totalAlerts: data.totalAlerts,
          expiredCertifications: data.expiredCertifications,
          recipientEmails: complianceEmails
        },
        user_id: 'system'
      })

    } catch (error) {
      throw new Error('Failed to send compliance summary')
    }
  }

  // Private helper methods

  private static getRenewalInstructions(certificationType: string): string {
    const baseInstructions = `
To renew your ${certificationType}:
1. Log into your guard portal
2. Navigate to "My Certifications"
3. Click "Renew" next to the expiring certification
4. Upload your new certificate document
5. Set the new expiry date
6. Submit for manager review

For assistance, contact the office at (830) 201-0414.
    `.trim()

    // Add certification-specific instructions if needed
    switch (certificationType.toLowerCase()) {
      case 'tops license':
        return baseInstructions + '\n\nNote: TOPS license renewal must be completed through the Texas DPS website first.'
      case 'cpr':
        return baseInstructions + '\n\nNote: CPR certification must be from an approved provider.'
      case 'first aid':
        return baseInstructions + '\n\nNote: First Aid certification must be from an approved provider.'
      default:
        return baseInstructions
    }
  }
}