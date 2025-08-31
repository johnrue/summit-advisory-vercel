import type { 
  BackgroundCheckStatus, 
  BackgroundCheckNotificationConfig,
  ExpiryReminderAlert
} from '@/lib/types/background-check'

// Email templates for background check workflows
export const BACKGROUND_CHECK_EMAIL_TEMPLATES = {
  STATUS_UPDATE_APPLICANT: 'background-status-update-applicant',
  STATUS_UPDATE_MANAGER: 'background-status-update-manager',
  EXPIRY_REMINDER_30_DAYS: 'background-expiry-30-days',
  EXPIRY_REMINDER_14_DAYS: 'background-expiry-14-days',
  EXPIRY_REMINDER_7_DAYS: 'background-expiry-7-days',
  BACKGROUND_CHECK_FAILED: 'background-check-failed',
  BACKGROUND_CHECK_COMPLETE: 'background-check-complete'
} as const

interface NotificationContext {
  applicantName: string
  applicationId: string
  previousStatus?: BackgroundCheckStatus
  newStatus: BackgroundCheckStatus
  managerName: string
  vendorConfirmation?: string
  expiryDate?: Date
  notes?: string
}

export class BackgroundCheckNotificationService {
  private defaultConfig: BackgroundCheckNotificationConfig = {
    statusChangeNotifications: {
      managerUpdates: true,
      applicantUpdates: true,
      adminOverride: false
    },
    expiryReminders: {
      enabled: true,
      reminderDays: [30, 14, 7],
      recipientRoles: ['manager', 'admin']
    },
    deliverySettings: {
      immediateNotifications: true,
      digestFrequency: 'daily',
      retryAttempts: 3
    }
  }

  /**
   * Send status change notification
   */
  async sendStatusChangeNotification(
    context: NotificationContext,
    config: BackgroundCheckNotificationConfig = this.defaultConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const notifications: Promise<any>[] = []

      // Send applicant notification
      if (config.statusChangeNotifications.applicantUpdates) {
        notifications.push(this.sendApplicantStatusNotification(context))
      }

      // Send manager notification
      if (config.statusChangeNotifications.managerUpdates) {
        notifications.push(this.sendManagerStatusNotification(context))
      }

      // Send admin override notification if critical status
      if (config.statusChangeNotifications.adminOverride && this.isCriticalStatus(context.newStatus)) {
        notifications.push(this.sendAdminOverrideNotification(context))
      }

      await Promise.all(notifications)

      return { success: true }
    } catch (error) {
      return { success: false, error: `Failed to send notifications: ${error}` }
    }
  }

  /**
   * Send expiry reminder notifications
   */
  async sendExpiryReminder(
    alert: ExpiryReminderAlert,
    config: BackgroundCheckNotificationConfig = this.defaultConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!config.expiryReminders.enabled) {
        return { success: true }
      }

      const template = this.getExpiryReminderTemplate(alert.daysUntilExpiry)
      
      // Send to assigned manager
      if (alert.assignedManager) {
        await this.sendEmail({
          template,
          to: alert.assignedManager,
          context: {
            applicantName: alert.applicantName,
            expiryDate: alert.expiryDate,
            daysUntilExpiry: alert.daysUntilExpiry,
            applicationId: alert.applicationId
          }
        })
      }

      // Send to admin roles if configured
      if (config.expiryReminders.recipientRoles.includes('admin')) {
        await this.sendAdminExpiryNotification(alert)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: `Failed to send expiry reminder: ${error}` }
    }
  }

  /**
   * Schedule automated expiry reminders
   */
  async scheduleExpiryReminders(
    applicationId: string,
    expiryDate: Date,
    config: BackgroundCheckNotificationConfig = this.defaultConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!config.expiryReminders.enabled) {
        return { success: true }
      }

      for (const daysBefore of config.expiryReminders.reminderDays) {
        const reminderDate = new Date(expiryDate)
        reminderDate.setDate(reminderDate.getDate() - daysBefore)

        // TODO: Implement scheduled job system
        // For now, we'll create a log entry for the scheduled reminder
        console.log(`Scheduled expiry reminder for ${applicationId} on ${reminderDate.toISOString()}`)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: `Failed to schedule reminders: ${error}` }
    }
  }

  /**
   * Get notification delivery metrics
   */
  async getNotificationMetrics(dateFrom: Date, dateTo: Date): Promise<{
    success: boolean
    data?: {
      totalSent: number
      delivered: number
      failed: number
      deliveryRate: number
    }
    error?: string
  }> {
    try {
      // TODO: Implement notification tracking table and metrics calculation
      // For now, return mock data
      return {
        success: true,
        data: {
          totalSent: 0,
          delivered: 0,
          failed: 0,
          deliveryRate: 0
        }
      }
    } catch (error) {
      return { success: false, error: `Failed to get notification metrics: ${error}` }
    }
  }

  /**
   * Send applicant status notification
   */
  private async sendApplicantStatusNotification(context: NotificationContext): Promise<void> {
    const template = this.getApplicantStatusTemplate(context.newStatus)
    
    await this.sendEmail({
      template,
      to: `${context.applicantName}`, // TODO: Get actual email from application
      context: {
        applicantName: context.applicantName,
        newStatus: context.newStatus,
        notes: context.notes
      }
    })
  }

  /**
   * Send manager status notification
   */
  private async sendManagerStatusNotification(context: NotificationContext): Promise<void> {
    await this.sendEmail({
      template: BACKGROUND_CHECK_EMAIL_TEMPLATES.STATUS_UPDATE_MANAGER,
      to: context.managerName,
      context
    })
  }

  /**
   * Send admin override notification for critical statuses
   */
  private async sendAdminOverrideNotification(context: NotificationContext): Promise<void> {
    await this.sendEmail({
      template: BACKGROUND_CHECK_EMAIL_TEMPLATES.STATUS_UPDATE_MANAGER,
      to: 'admin@summitadvisoryfirm.com', // TODO: Get admin email from config
      context: {
        ...context,
        isAdminOverride: true
      }
    })
  }

  /**
   * Send admin expiry notification
   */
  private async sendAdminExpiryNotification(alert: ExpiryReminderAlert): Promise<void> {
    const template = this.getExpiryReminderTemplate(alert.daysUntilExpiry)
    
    await this.sendEmail({
      template,
      to: 'admin@summitadvisoryfirm.com', // TODO: Get admin email from config
      context: {
        applicantName: alert.applicantName,
        expiryDate: alert.expiryDate,
        daysUntilExpiry: alert.daysUntilExpiry,
        applicationId: alert.applicationId,
        isAdminNotification: true
      }
    })
  }

  /**
   * Get appropriate email template for applicant status updates
   */
  private getApplicantStatusTemplate(status: BackgroundCheckStatus): string {
    switch (status) {
      case 'complete':
        return BACKGROUND_CHECK_EMAIL_TEMPLATES.BACKGROUND_CHECK_COMPLETE
      case 'failed':
        return BACKGROUND_CHECK_EMAIL_TEMPLATES.BACKGROUND_CHECK_FAILED
      default:
        return BACKGROUND_CHECK_EMAIL_TEMPLATES.STATUS_UPDATE_APPLICANT
    }
  }

  /**
   * Get appropriate expiry reminder template
   */
  private getExpiryReminderTemplate(daysUntilExpiry: number): string {
    if (daysUntilExpiry <= 7) {
      return BACKGROUND_CHECK_EMAIL_TEMPLATES.EXPIRY_REMINDER_7_DAYS
    } else if (daysUntilExpiry <= 14) {
      return BACKGROUND_CHECK_EMAIL_TEMPLATES.EXPIRY_REMINDER_14_DAYS
    } else {
      return BACKGROUND_CHECK_EMAIL_TEMPLATES.EXPIRY_REMINDER_30_DAYS
    }
  }

  /**
   * Determine if status change requires admin notification
   */
  private isCriticalStatus(status: BackgroundCheckStatus): boolean {
    return status === 'failed' || status === 'expired'
  }

  /**
   * Send email using existing email service
   */
  private async sendEmail(emailData: {
    template: string
    to: string
    context: Record<string, any>
  }): Promise<void> {
    // TODO: Integrate with existing email service from consultation-service.ts pattern
    console.log('Background check email notification:', emailData)
    
    // This should integrate with the existing email service infrastructure
    // For now, we're logging the notification for development purposes
  }
}