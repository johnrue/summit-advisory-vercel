import { NotificationService } from '@/lib/services/notification-service'
import { AuditService } from '@/lib/services/audit-service'
import { supabase } from '@/lib/supabase'

/**
 * Scheduled Job for Notification Digest Delivery
 * Sends daily and weekly digest emails to users who have enabled them
 */
export class NotificationDigestJob {
  private static auditService = AuditService.getInstance()

  /**
   * Execute daily digest job
   * Sends digest emails to users who have daily digest enabled
   */
  static async executeDailyDigest(): Promise<void> {
    try {
      const startTime = new Date()

      // Get users with daily digest enabled
      const { data: users, error } = await supabase
        .from('notification_preferences')
        .select('user_id, email_digest_frequency, email_digest_enabled')
        .eq('email_digest_enabled', true)
        .eq('email_digest_frequency', 'daily')

      if (error) {
        throw new Error(`Failed to get users for daily digest: ${error.message}`)
      }

      let digestsSent = 0
      let errors = 0
      const notificationService = NotificationService.getInstance()

      // Process each user
      for (const user of users || []) {
        try {
          const endDate = new Date()
          const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago

          const result = await notificationService.createNotificationDigest(
            user.user_id,
            startDate,
            endDate,
            'daily'
          )

          if (result.success && result.data && result.data.notifications.length > 0) {
            // In a full implementation, this would send the digest via email
            await this.sendDigestEmail(result.data)
            digestsSent++

          }

        } catch (error) {
          errors++
        }
      }

      const endTime = new Date()
      const executionTime = endTime.getTime() - startTime.getTime()

      // Log job execution
      await this.auditService.logAction({
        action: 'daily_digest_executed' as any,
        entity_type: 'notification_digest_job' as any,
        entity_id: 'daily_digest',
        details: {
          executionTime,
          usersProcessed: users?.length || 0,
          digestsSent,
          errors,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        },
        user_id: 'system'
      })


    } catch (error) {
      
      await this.auditService.logAction({
        action: 'daily_digest_failed' as any,
        entity_type: 'notification_digest_job' as any,
        entity_id: 'daily_digest',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        },
        user_id: 'system'
      })

      throw error
    }
  }

  /**
   * Execute weekly digest job
   * Sends digest emails to users who have weekly digest enabled
   */
  static async executeWeeklyDigest(): Promise<void> {
    try {
      const startTime = new Date()

      // Get users with weekly digest enabled
      const { data: users, error } = await supabase
        .from('notification_preferences')
        .select('user_id, email_digest_frequency, email_digest_enabled')
        .eq('email_digest_enabled', true)
        .eq('email_digest_frequency', 'weekly')

      if (error) {
        throw new Error(`Failed to get users for weekly digest: ${error.message}`)
      }

      let digestsSent = 0
      let errors = 0
      const notificationService = NotificationService.getInstance()

      // Process each user
      for (const user of users || []) {
        try {
          const endDate = new Date()
          const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago

          const result = await notificationService.createNotificationDigest(
            user.user_id,
            startDate,
            endDate,
            'weekly'
          )

          if (result.success && result.data && result.data.notifications.length > 0) {
            // In a full implementation, this would send the digest via email
            await this.sendDigestEmail(result.data)
            digestsSent++

          }

        } catch (error) {
          errors++
        }
      }

      const endTime = new Date()
      const executionTime = endTime.getTime() - startTime.getTime()

      // Log job execution
      await this.auditService.logAction({
        action: 'weekly_digest_executed' as any,
        entity_type: 'notification_digest_job' as any,
        entity_id: 'weekly_digest',
        details: {
          executionTime,
          usersProcessed: users?.length || 0,
          digestsSent,
          errors,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        },
        user_id: 'system'
      })


    } catch (error) {
      
      await this.auditService.logAction({
        action: 'weekly_digest_failed' as any,
        entity_type: 'notification_digest_job' as any,
        entity_id: 'weekly_digest',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        },
        user_id: 'system'
      })

      throw error
    }
  }

  /**
   * Process notification escalations
   * Check for unacknowledged critical notifications and create escalations
   */
  static async processEscalations(): Promise<void> {
    try {
      const startTime = new Date()

      // Get critical notifications that are unacknowledged and older than 15 minutes
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
      
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('priority', 'critical')
        .is('acknowledged_at', null)
        .lt('created_at', fifteenMinutesAgo.toISOString())

      if (error) {
        throw new Error(`Failed to get unacknowledged notifications: ${error.message}`)
      }

      let escalationsCreated = 0
      const notificationService = NotificationService.getInstance()

      for (const notification of notifications || []) {
        try {
          // Check if escalation already exists for this notification
          const { data: existingEscalation, error: escalationError } = await supabase
            .from('notifications')
            .select('id')
            .eq('entity_type', 'notification_escalation')
            .eq('entity_id', notification.id)
            .single()

          if (escalationError && escalationError.code !== 'PGRST116') {
            // Error other than "not found"
            throw escalationError
          }

          if (!existingEscalation) {
            // Create escalation
            const escalationResult = await notificationService.createEscalation(
              notification.id,
              notification.recipient_id,
              1, // First level escalation
              'Critical notification unacknowledged for 15 minutes'
            )

            if (escalationResult.success) {
              escalationsCreated++
            }
          }

        } catch (error) {
        }
      }

      const endTime = new Date()
      const executionTime = endTime.getTime() - startTime.getTime()

      // Log escalation processing
      await this.auditService.logAction({
        action: 'escalations_processed' as any,
        entity_type: 'notification_digest_job' as any,
        entity_id: 'escalation_processing',
        details: {
          executionTime,
          notificationsChecked: notifications?.length || 0,
          escalationsCreated,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        },
        user_id: 'system'
      })


    } catch (error) {
      throw error
    }
  }

  /**
   * Send digest email (placeholder implementation)
   * In production, this would integrate with an email service
   */
  private static async sendDigestEmail(digest: any): Promise<void> {
    try {
      // Get user profile for email address
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('email, first_name, last_name')
        .eq('id', digest.recipientId)
        .single()

      if (error || !profile?.email) {
        return
      }

      // Generate digest email content
      const emailContent = this.generateDigestEmailContent(digest, profile)

      // Log the email that would be sent
      // In production, this would use an email service like Resend

      // Mark digest as sent (in a full implementation)
      await this.auditService.logAction({
        action: 'digest_email_sent' as any,
        entity_type: 'notification_digest' as any,
        entity_id: digest.id,
        details: {
          recipientId: digest.recipientId,
          recipientEmail: profile.email,
          notificationCount: digest.notifications.length,
          period: digest.period,
          deliverySchedule: digest.deliverySchedule
        },
        user_id: 'system'
      })

    } catch (error) {
      throw error
    }
  }

  /**
   * Generate digest email content
   */
  private static generateDigestEmailContent(digest: any, profile: any) {
    const { notifications, period, deliverySchedule } = digest
    const recipientName = `${profile.first_name} ${profile.last_name}`
    
    const subject = `${deliverySchedule === 'daily' ? 'Daily' : 'Weekly'} Notification Digest - ${notifications.length} updates`
    
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">Summit Advisory</h1>
            <h2 style="color: #666; margin: 10px 0 0 0;">Notification Digest</h2>
          </div>
          
          <p>Hello ${recipientName},</p>
          
          <p>Here's your ${deliverySchedule} summary of notifications from ${new Date(period.startDate).toLocaleDateString()} to ${new Date(period.endDate).toLocaleDateString()}:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Summary</h3>
            <p style="margin: 5px 0;"><strong>${notifications.length}</strong> notifications</p>
            <p style="margin: 5px 0;"><strong>${notifications.filter((n: any) => n.priority === 'high' || n.priority === 'critical').length}</strong> high priority</p>
            <p style="margin: 5px 0;"><strong>${notifications.filter((n: any) => !n.isRead).length}</strong> unread</p>
          </div>
          
          <h3 style="color: #333; margin: 30px 0 15px 0;">Recent Notifications</h3>
          
          ${notifications.slice(0, 10).map((notification: any) => `
            <div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px; margin: 10px 0;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <h4 style="margin: 0; color: #333;">${notification.title}</h4>
                <span style="background-color: ${this.getPriorityColor(notification.priority)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; text-transform: uppercase;">
                  ${notification.priority}
                </span>
              </div>
              <p style="margin: 8px 0; color: #666; line-height: 1.4;">${notification.message}</p>
              <p style="margin: 0; font-size: 12px; color: #999;">
                ${notification.category} • ${new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
          `).join('')}
          
          ${notifications.length > 10 ? `
            <div style="text-align: center; margin: 20px 0;">
              <p style="color: #666;">... and ${notifications.length - 10} more notifications</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View All Notifications
            </a>
          </div>
          
          <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 40px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 5px 0;">
              You're receiving this digest because you have ${deliverySchedule} digest notifications enabled.
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/settings/notifications" style="color: #007bff;">
                Update your notification preferences
              </a>
            </p>
          </div>
        </body>
      </html>
    `
    
    return { subject, html }
  }

  private static getPriorityColor(priority: string): string {
    switch (priority) {
      case 'critical': return '#dc3545'
      case 'high': return '#fd7e14' 
      case 'normal': return '#007bff'
      case 'low': return '#6c757d'
      default: return '#6c757d'
    }
  }

  /**
   * Test job execution (for development/testing)
   */
  static async test(): Promise<void> {
    try {
      
      // Test daily digest
      await this.executeDailyDigest()
      
      // Test escalation processing
      await this.processEscalations()
      
    } catch (error) {
      throw error
    }
  }
}