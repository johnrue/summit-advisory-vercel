import { supabase } from '@/lib/supabase'
import { hiringNotificationTemplates, type NotificationData } from '@/lib/templates/hiring-notifications'

export interface EmailSendRequest {
  to: string
  template: keyof typeof hiringNotificationTemplates
  data: NotificationData
  priority?: 'high' | 'normal' | 'low'
  scheduledFor?: Date
}

export interface EmailLog {
  id: string
  to: string
  from: string
  subject: string
  template: string
  data: Record<string, any>
  status: 'pending' | 'sent' | 'failed' | 'bounced'
  sentAt?: string
  failureReason?: string
  deliveryStatus?: 'delivered' | 'opened' | 'clicked'
  createdAt: string
  updatedAt: string
}

export interface EmailServiceResult<T = any> {
  success: boolean
  data?: T
  error?: string
  messageId?: string
}

export class EmailService {
  private readonly FROM_ADDRESS = 'noreply@summitadvisoryfirm.com'
  private readonly FROM_NAME = 'Summit Advisory'

  /**
   * Send email using template with data interpolation
   */
  async sendTemplateEmail(request: EmailSendRequest): Promise<EmailServiceResult<EmailLog>> {
    try {
      // Get template configuration
      const templateFunction = hiringNotificationTemplates[request.template]
      if (!templateFunction) {
        return {
          success: false,
          error: `Template '${request.template}' not found`
        }
      }

      // Generate template with data
      const template = templateFunction(request.data)
      const subject = template.subject
      const htmlBody = template.html
      const textBody = template.text

      // Basic validation for required data
      if (!request.data.applicantName || !request.data.applicationId) {
        return {
          success: false,
          error: 'Missing required template data: applicantName and applicationId are required'
        }
      }

      // Create email log entry
      const emailLog: Omit<EmailLog, 'id' | 'createdAt' | 'updatedAt'> = {
        to: request.to,
        from: `${this.FROM_NAME} <${this.FROM_ADDRESS}>`,
        subject,
        template: request.template,
        data: request.data,
        status: 'pending'
      }

      // Insert email log
      const { data: logData, error: logError } = await supabase
        .from('email_logs')
        .insert([emailLog])
        .select()
        .single()

      if (logError) {
        return {
          success: false,
          error: `Failed to create email log: ${logError.message}`
        }
      }

      // Send email (implementation depends on email provider)
      const sendResult = await this.sendEmail({
        to: request.to,
        subject,
        html: htmlBody,
        text: textBody,
        priority: request.priority || 'normal'
      })

      if (sendResult.success) {
        // Update log with success
        await supabase
          .from('email_logs')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', logData.id)

        return {
          success: true,
          data: { ...logData, status: 'sent', sentAt: new Date().toISOString() } as EmailLog,
          messageId: sendResult.messageId
        }
      } else {
        // Update log with failure
        await supabase
          .from('email_logs')
          .update({
            status: 'failed',
            failure_reason: sendResult.error
          })
          .eq('id', logData.id)

        return {
          success: false,
          error: sendResult.error,
          data: { ...logData, status: 'failed', failureReason: sendResult.error } as EmailLog
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Email service error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Send bulk emails to multiple recipients
   */
  async sendBulkEmails(
    recipients: string[], 
    template: keyof typeof hiringNotificationTemplates, 
    data: NotificationData
  ): Promise<EmailServiceResult<EmailLog[]>> {
    try {
      const results: EmailLog[] = []
      const errors: string[] = []

      for (const recipient of recipients) {
        const result = await this.sendTemplateEmail({
          to: recipient,
          template,
          data
        })

        if (result.success && result.data) {
          results.push(result.data)
        } else {
          errors.push(`${recipient}: ${result.error}`)
        }
      }

      return {
        success: errors.length === 0,
        data: results,
        error: errors.length > 0 ? `Some emails failed: ${errors.join(', ')}` : undefined
      }
    } catch (error) {
      return {
        success: false,
        error: `Bulk email error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Get email logs with filtering
   */
  async getEmailLogs(filters?: {
    to?: string
    template?: string
    status?: EmailLog['status']
    dateFrom?: Date
    dateTo?: Date
    limit?: number
  }): Promise<EmailServiceResult<EmailLog[]>> {
    try {
      let query = supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters) {
        if (filters.to) {
          query = query.eq('to', filters.to)
        }
        if (filters.template) {
          query = query.eq('template', filters.template)
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.dateFrom) {
          query = query.gte('created_at', filters.dateFrom.toISOString())
        }
        if (filters.dateTo) {
          query = query.lte('created_at', filters.dateTo.toISOString())
        }
        if (filters.limit) {
          query = query.limit(filters.limit)
        }
      } else {
        query = query.limit(50) // Default limit
      }

      const { data, error } = await query

      if (error) {
        return {
          success: false,
          error: `Failed to get email logs: ${error.message}`
        }
      }

      return {
        success: true,
        data: data as EmailLog[]
      }
    } catch (error) {
      return {
        success: false,
        error: `Email logs error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Resend a failed email
   */
  async resendEmail(emailLogId: string): Promise<EmailServiceResult<EmailLog>> {
    try {
      // Get original email log
      const { data: originalLog, error: fetchError } = await supabase
        .from('email_logs')
        .select('*')
        .eq('id', emailLogId)
        .single()

      if (fetchError || !originalLog) {
        return {
          success: false,
          error: 'Email log not found'
        }
      }

      // Resend using original template and data
      const result = await this.sendTemplateEmail({
        to: originalLog.to,
        template: originalLog.template as keyof typeof hiringNotificationTemplates,
        data: originalLog.data as NotificationData
      })

      return result
    } catch (error) {
      return {
        success: false,
        error: `Resend error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Get email statistics
   */
  async getEmailStats(dateFrom?: Date, dateTo?: Date): Promise<EmailServiceResult<{
    total: number
    sent: number
    failed: number
    pending: number
    deliveryRate: number
    failureRate: number
  }>> {
    try {
      let query = supabase
        .from('email_logs')
        .select('status')

      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString())
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString())
      }

      const { data, error } = await query

      if (error) {
        return {
          success: false,
          error: `Failed to get email stats: ${error.message}`
        }
      }

      const stats = data.reduce(
        (acc, log) => {
          acc.total++
          acc[log.status as keyof typeof acc]++
          return acc
        },
        { total: 0, sent: 0, failed: 0, pending: 0 }
      )

      const deliveryRate = stats.total > 0 ? (stats.sent / stats.total) * 100 : 0
      const failureRate = stats.total > 0 ? (stats.failed / stats.total) * 100 : 0

      return {
        success: true,
        data: {
          ...stats,
          deliveryRate: Math.round(deliveryRate * 100) / 100,
          failureRate: Math.round(failureRate * 100) / 100
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Stats error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Private helper methods


  /**
   * Send email using configured email provider
   */
  private async sendEmail(email: {
    to: string
    subject: string
    html: string
    text: string
    priority: 'high' | 'normal' | 'low'
  }): Promise<EmailServiceResult<{ messageId: string }>> {
    try {
      // In development/demo mode, log email to console
      if (process.env.NODE_ENV === 'development') {

        return {
          success: true,
          data: { messageId: `dev-${Date.now()}` }
        }
      }

      // TODO: Implement actual email sending with Supabase Edge Functions
      // For now, simulate successful sending
      await new Promise(resolve => setTimeout(resolve, 100))

      return {
        success: true,
        data: { messageId: `msg-${Date.now()}` }
      }
    } catch (error) {
      return {
        success: false,
        error: `Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

// Export singleton instance
export const emailService = new EmailService()

// Utility functions for common email operations
export const sendApplicationReceivedEmail = async (
  applicantEmail: string, 
  applicantName: string, 
  applicationId: string
) => {
  return emailService.sendTemplateEmail({
    to: applicantEmail,
    template: 'applicationReceived',
    data: {
      applicantName,
      applicationId,
      portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    } as any
  })
}

export const sendInterviewScheduledEmail = async (
  applicantEmail: string,
  applicantName: string,
  interviewDate: Date,
  interviewLocation: string,
  interviewerName: string
) => {
  return emailService.sendTemplateEmail({
    to: applicantEmail,
    template: 'interviewScheduled',
    data: {
      applicantName,
      interviewDate: interviewDate.toLocaleDateString(),
      interviewTime: interviewDate.toLocaleTimeString(),
      interviewLocation,
      interviewerName,
      calendarLink: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/interview/${applicantEmail}`,
      rescheduleUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reschedule`
    } as any
  })
}

export const sendApplicationApprovedEmail = async (
  applicantEmail: string,
  applicantName: string,
  profileCreationToken: string
) => {
  return emailService.sendTemplateEmail({
    to: applicantEmail,
    template: 'applicationApproved',
    data: {
      applicantName,
      approvalDate: new Date().toLocaleDateString(),
      profileCreationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/profile/create/${profileCreationToken}`,
      companyName: 'Summit Advisory',
      hrContactEmail: 'hr@summitadvisoryfirm.com'
    } as any
  })
}

export const sendApplicationRejectedEmail = async (
  applicantEmail: string,
  applicantName: string,
  rejectionReason?: string
) => {
  return emailService.sendTemplateEmail({
    to: applicantEmail,
    template: 'applicationRejected',
    data: {
      applicantName,
      rejectionDate: new Date().toLocaleDateString(),
      rejectionReason: rejectionReason || 'Application did not meet our current requirements',
      reapplyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/apply`,
      contactEmail: 'hr@summitadvisoryfirm.com'
    } as any
  })
}

export const sendManagerAssignmentEmail = async (
  managerEmail: string,
  managerName: string,
  applicantName: string,
  applicationId: string
) => {
  return emailService.sendTemplateEmail({
    to: managerEmail,
    template: 'managerAssignment',
    data: {
      managerName,
      applicantName,
      applicationId,
      assignmentDate: new Date().toLocaleDateString(),
      applicationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/hiring/${applicationId}`,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    } as any
  })
}