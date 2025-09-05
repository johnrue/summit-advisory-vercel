import { createClient } from '@/lib/supabase'
import type { 
  Notification, 
  NotificationHistory, 
  DeliveryStatus 
} from '@/lib/types/notification-types'
import type { ServiceResult } from '@/lib/types'

export class NotificationDeliveryService {
  private static instance: NotificationDeliveryService
  private supabase = createClient()
  private retryQueue: Map<string, number> = new Map()
  private maxRetries = 3
  
  static getInstance(): NotificationDeliveryService {
    if (!NotificationDeliveryService.instance) {
      NotificationDeliveryService.instance = new NotificationDeliveryService()
    }
    return NotificationDeliveryService.instance
  }

  /**
   * Process notification delivery across all channels
   */
  async processNotificationDelivery(notification: Notification): Promise<ServiceResult<boolean>> {
    try {
      const deliveryPromises = notification.delivery_channels.map(channel => 
        this.deliverToChannel(notification, channel)
      )

      const results = await Promise.allSettled(deliveryPromises)
      
      // Check if at least one delivery succeeded
      const hasSuccessfulDelivery = results.some(result => 
        result.status === 'fulfilled' && result.value.success
      )

      if (hasSuccessfulDelivery) {
        await this.updateNotificationStatus(notification.id, 'delivered')
        return { success: true, data: true }
      } else {
        await this.updateNotificationStatus(notification.id, 'failed')
        return { success: false, error: 'All delivery channels failed' }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Deliver notification to specific channel
   */
  private async deliverToChannel(
    notification: Notification, 
    channel: string
  ): Promise<ServiceResult<boolean>> {
    const startTime = Date.now()
    
    try {
      let deliveryResult: ServiceResult<boolean>

      switch (channel) {
        case 'in_app':
          deliveryResult = await this.deliverInApp(notification)
          break
        case 'email':
          deliveryResult = await this.deliverEmail(notification)
          break
        case 'sms':
          deliveryResult = await this.deliverSMS(notification)
          break
        default:
          deliveryResult = { 
            success: false, 
            error: `Unknown delivery channel: ${channel}`
          }
      }

      const duration = Date.now() - startTime

      // Log delivery attempt
      await this.logDeliveryAttempt(
        notification.id,
        channel,
        deliveryResult.success ? 'delivered' : 'failed',
        duration,
        typeof deliveryResult.error === 'string' ? deliveryResult.error : undefined,
        this.getRetryCount(notification.id)
      )

      return deliveryResult
    } catch (error) {
      const duration = Date.now() - startTime
      
      await this.logDeliveryAttempt(
        notification.id,
        channel,
        'failed',
        duration,
        error instanceof Error ? error.message : 'Unknown error',
        this.getRetryCount(notification.id)
      )

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Deliver in-app notification (already handled by real-time subscriptions)
   */
  private async deliverInApp(notification: Notification): Promise<ServiceResult<boolean>> {
    // In-app notifications are delivered via Supabase real-time subscriptions
    // This method primarily serves as a confirmation that the notification exists
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('id')
        .eq('id', notification.id)
        .single()

      if (error || !data) {
        return { success: false, error: 'Notification not found'}
      }

      return { success: true, data: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Deliver email notification
   */
  private async deliverEmail(notification: Notification): Promise<ServiceResult<boolean>> {
    try {
      // Get recipient email - this would come from user profile
      // For now, using a placeholder
      const recipientEmail = await this.getRecipientEmail(notification.recipient_id)
      if (!recipientEmail) {
        return { 
          success: false, 
          error: 'Recipient email not found', 
        }
      }

      // Import EmailNotificationService dynamically to avoid circular imports
      const { EmailNotificationService } = await import('./email-notification-service')
      const emailService = EmailNotificationService.getInstance()

      const result = await emailService.sendEmailNotification(
        notification,
        recipientEmail
      )

      return { success: result.success, data: result.success }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Email delivery error',
      }
    }
  }

  /**
   * Get recipient email address
   * TODO: Implement proper user profile lookup
   */
  private async getRecipientEmail(userId: string): Promise<string | null> {
    try {
      // For development, return a placeholder
      // In production, this would query the user profile
      return 'user@example.com'
      
      // Production implementation would look like:
      // const { data, error } = await this.supabase
      //   .from('user_profiles')
      //   .select('email')
      //   .eq('user_id', userId)
      //   .single()
      // return data?.email || null
    } catch (error) {
      return null
    }
  }

  /**
   * Deliver SMS notification (placeholder for future implementation)
   */
  private async deliverSMS(notification: Notification): Promise<ServiceResult<boolean>> {
    // TODO: Implement SMS delivery service integration
    // This will be a future enhancement
    return { success: false, error: 'SMS delivery not implemented'}
  }

  /**
   * Update notification delivery status
   */
  private async updateNotificationStatus(
    notificationId: string, 
    status: DeliveryStatus
  ): Promise<void> {
    await this.supabase
      .from('notifications')
      .update({ 
        delivery_status: status,
        updated_at: new Date().toISOString() 
      })
      .eq('id', notificationId)
  }

  /**
   * Log delivery attempt to history
   */
  private async logDeliveryAttempt(
    notificationId: string,
    channel: string,
    status: DeliveryStatus,
    duration: number,
    errorMessage?: string,
    attempt: number = 1
  ): Promise<void> {
    await this.supabase
      .from('notification_history')
      .insert({
        notification_id: notificationId,
        delivery_channel: channel,
        delivery_attempt: attempt,
        delivery_status: status,
        delivery_provider: this.getProviderForChannel(channel),
        error_message: errorMessage,
        delivery_duration_ms: duration,
        delivered_at: status === 'delivered' ? new Date().toISOString() : null
      })
  }

  /**
   * Get provider name for delivery channel
   */
  private getProviderForChannel(channel: string): string {
    switch (channel) {
      case 'in_app':
        return 'supabase'
      case 'email':
        return 'sendgrid' // Or whatever email service is configured
      case 'sms':
        return 'twilio'   // Or whatever SMS service is configured
      default:
        return 'unknown'
    }
  }

  /**
   * Retry failed notification delivery
   */
  async retryNotificationDelivery(notificationId: string): Promise<ServiceResult<boolean>> {
    try {
      const retryCount = this.getRetryCount(notificationId)
      
      if (retryCount >= this.maxRetries) {
        return { 
          success: false, 
          error: `Maximum retry attempts (${this.maxRetries}) exceeded`, 
        }
      }

      // Get notification details
      const { data: notification, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .single()

      if (error || !notification) {
        return { success: false, error: 'Notification not found'}
      }

      // Increment retry count
      this.retryQueue.set(notificationId, retryCount + 1)

      // Update status to retrying
      await this.updateNotificationStatus(notificationId, 'retrying')

      // Process delivery
      return this.processNotificationDelivery(notification as Notification)
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get retry count for notification
   */
  private getRetryCount(notificationId: string): number {
    return this.retryQueue.get(notificationId) || 0
  }

  /**
   * Process notification queue (for batch processing)
   */
  async processNotificationQueue(): Promise<ServiceResult<number>> {
    try {
      // Get pending notifications
      const { data: notifications, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('delivery_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(100) // Process in batches

      if (error) {
        return { success: false, error: error.message}
      }

      if (!notifications || notifications.length === 0) {
        return { success: true, data: 0 }
      }

      const deliveryPromises = notifications.map(notification => 
        this.processNotificationDelivery(notification as Notification)
      )

      const results = await Promise.allSettled(deliveryPromises)
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length

      return { success: true, data: successCount }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get delivery history for a notification
   */
  async getDeliveryHistory(notificationId: string): Promise<ServiceResult<NotificationHistory[]>> {
    try {
      const { data, error } = await this.supabase
        .from('notification_history')
        .select('*')
        .eq('notification_id', notificationId)
        .order('attempted_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message}
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get delivery analytics
   */
  async getDeliveryAnalytics(timeRange: { from: string; to: string }): Promise<ServiceResult<any>> {
    try {
      const { data, error } = await this.supabase
        .from('notification_history')
        .select('delivery_channel, delivery_status, delivery_duration_ms, attempted_at')
        .gte('attempted_at', timeRange.from)
        .lte('attempted_at', timeRange.to)

      if (error) {
        return { success: false, error: error.message}
      }

      // Process analytics data
      const analytics = {
        total_attempts: data.length,
        successful_deliveries: data.filter(h => h.delivery_status === 'delivered').length,
        failed_deliveries: data.filter(h => h.delivery_status === 'failed').length,
        average_duration: data
          .filter(h => h.delivery_duration_ms)
          .reduce((sum, h) => sum + (h.delivery_duration_ms || 0), 0) / data.length,
        channel_breakdown: data.reduce((acc, h) => {
          acc[h.delivery_channel] = (acc[h.delivery_channel] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        status_breakdown: data.reduce((acc, h) => {
          acc[h.delivery_status] = (acc[h.delivery_status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }

      return { success: true, data: analytics }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}