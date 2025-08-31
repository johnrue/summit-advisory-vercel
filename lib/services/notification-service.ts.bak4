import { createClient } from '@/lib/supabase'
import { AuditService } from './audit-service'
import type { 
  Notification, 
  NotificationPreferences,
  CreateNotificationData,
  NotificationChannel,
  NotificationPriority,
  NotificationCategory,
  NotificationType,
  NotificationStats,
  NotificationTemplate,
  NotificationDigest,
  NotificationEscalation
} from '@/lib/types'
import type { ServiceResult } from '@/lib/types'

export class NotificationService {
  private static instance: NotificationService
  private supabase = createClient()
  private static auditService = AuditService.getInstance()
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Create a new notification
   */
  async createNotification(request: CreateNotificationRequest): Promise<ServiceResult<Notification>> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert({
          ...request,
          delivery_channels: request.delivery_channels || ['in_app']
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message, code: 'CREATE_NOTIFICATION_FAILED' }
      }

      // Trigger real-time notification delivery
      await this.triggerRealtimeNotification(data)

      return { success: true, data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CREATE_NOTIFICATION_ERROR' 
      }
    }
  }

  /**
   * Get notifications for a user with filtering
   */
  async getNotifications(
    userId: string, 
    filter: NotificationFilter = {}
  ): Promise<ServiceResult<Notification[]>> {
    try {
      let query = this.supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filter.category && filter.category.length > 0) {
        query = query.in('category', filter.category)
      }

      if (filter.priority && filter.priority.length > 0) {
        query = query.in('priority', filter.priority)
      }

      if (filter.is_read !== undefined) {
        query = query.eq('is_read', filter.is_read)
      }

      if (filter.from_date) {
        query = query.gte('created_at', filter.from_date)
      }

      if (filter.to_date) {
        query = query.lte('created_at', filter.to_date)
      }

      if (filter.entity_type) {
        query = query.eq('entity_type', filter.entity_type)
      }

      if (filter.limit) {
        query = query.limit(filter.limit)
      }

      if (filter.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        return { success: false, error: error.message, code: 'GET_NOTIFICATIONS_FAILED' }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'GET_NOTIFICATIONS_ERROR' 
      }
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<ServiceResult<Notification>> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message, code: 'MARK_READ_FAILED' }
      }

      return { success: true, data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'MARK_READ_ERROR' 
      }
    }
  }

  /**
   * Acknowledge notification
   */
  async acknowledgeNotification(notificationId: string): Promise<ServiceResult<Notification>> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .update({ 
          acknowledged_at: new Date().toISOString() 
        })
        .eq('id', notificationId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message, code: 'ACKNOWLEDGE_FAILED' }
      }

      return { success: true, data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ACKNOWLEDGE_ERROR' 
      }
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(userId: string): Promise<ServiceResult<NotificationStats>> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('category, priority, is_read')
        .eq('recipient_id', userId)

      if (error) {
        return { success: false, error: error.message, code: 'GET_STATS_FAILED' }
      }

      const stats: NotificationStats = {
        total_count: data.length,
        unread_count: data.filter(n => !n.is_read).length,
        urgent_count: data.filter(n => n.priority === 'urgent').length,
        emergency_count: data.filter(n => n.priority === 'emergency').length,
        categories: {
          schedule: data.filter(n => n.category === 'schedule').length,
          availability: data.filter(n => n.category === 'availability').length,
          assignments: data.filter(n => n.category === 'assignments').length,
          system: data.filter(n => n.category === 'system').length,
          compliance: data.filter(n => n.category === 'compliance').length,
          emergency: data.filter(n => n.category === 'emergency').length,
        },
        priorities: {
          low: data.filter(n => n.priority === 'low').length,
          normal: data.filter(n => n.priority === 'normal').length,
          high: data.filter(n => n.priority === 'high').length,
          urgent: data.filter(n => n.priority === 'urgent').length,
          emergency: data.filter(n => n.priority === 'emergency').length,
        }
      }

      return { success: true, data: stats }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'GET_STATS_ERROR' 
      }
    }
  }

  /**
   * Subscribe to real-time notifications for a user
   */
  subscribeToNotifications(
    userId: string, 
    callback: (notification: Notification) => void
  ) {
    const subscription = this.supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        }, 
        (payload) => {
          callback(payload.new as Notification)
        }
      )
      .subscribe()

    return subscription
  }

  /**
   * Unsubscribe from real-time notifications
   */
  unsubscribeFromNotifications(subscription: any) {
    this.supabase.removeChannel(subscription)
  }

  /**
   * Bulk mark notifications as read
   */
  async markAllAsRead(userId: string): Promise<ServiceResult<number>> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('recipient_id', userId)
        .eq('is_read', false)
        .select('id')

      if (error) {
        return { success: false, error: error.message, code: 'MARK_ALL_READ_FAILED' }
      }

      return { success: true, data: data.length }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'MARK_ALL_READ_ERROR' 
      }
    }
  }

  /**
   * Delete expired notifications
   */
  async cleanupExpiredNotifications(): Promise<ServiceResult<number>> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id')

      if (error) {
        return { success: false, error: error.message, code: 'CLEANUP_FAILED' }
      }

      return { success: true, data: data.length }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CLEANUP_ERROR' 
      }
    }
  }

  /**
   * Trigger real-time notification delivery
   */
  private async triggerRealtimeNotification(notification: Notification): Promise<void> {
    // This method handles triggering real-time delivery
    // In a production environment, this could trigger edge functions
    // or external notification services
    
    // For now, we rely on Supabase real-time subscriptions
    // Future enhancement: Add webhook or edge function triggers
  }

  /**
   * Create notification from template
   */
  async createFromTemplate(
    template: NotificationTemplate,
    variables: Record<string, string>,
    recipientId: string,
    entityType?: string,
    entityId?: string
  ): Promise<ServiceResult<Notification>> {
    const title = this.interpolateTemplate(template.title_template, variables)
    const message = this.interpolateTemplate(template.message_template, variables)

    return this.createNotification({
      recipient_id: recipientId,
      notification_type: template.type,
      priority: template.default_priority,
      category: template.category,
      title,
      message,
      action_data: template.action_template ? { actions: template.action_template } : {},
      entity_type: entityType,
      entity_id: entityId,
      delivery_channels: template.default_channels
    })
  }

  /**
   * Enhanced notification sending with preference checking and multi-channel delivery
   */
  async sendWithPreferences(data: CreateNotificationData): Promise<ServiceResult<Notification>> {
    try {
      // Get user preferences to determine delivery channels
      const preferences = await this.getUserPreferences(data.recipientId)
      const effectiveChannels = this.getEffectiveChannels(data, preferences)

      // Create notification record
      const notificationResult = await this.createNotification({
        recipient_id: data.recipientId,
        sender_id: data.senderId,
        notification_type: data.type,
        priority: data.priority || 'normal',
        category: data.category || this.getCategoryFromType(data.type),
        title: data.title,
        message: data.message,
        action_data: data.actionData || {},
        entity_type: data.entityType,
        entity_id: data.entityId,
        delivery_channels: effectiveChannels,
        expires_at: data.expiresAt?.toISOString()
      })

      if (!notificationResult.success) {
        return notificationResult
      }

      const notification = notificationResult.data!

      // Process delivery for each channel
      const deliveryResults = await Promise.allSettled(
        effectiveChannels.map(channel => this.deliverToChannel(notification, channel))
      )

      // Update delivery status
      const deliveryStatus = this.buildDeliveryStatus(effectiveChannels, deliveryResults)
      await this.updateDeliveryStatus(notification.id, deliveryStatus)

      // Log notification creation
      await NotificationService.auditService.logAction({
        action: 'sent',
        entity_type: 'notification',
        entity_id: notification.id,
        details: {
          recipientId: data.recipientId,
          type: data.type,
          channels: effectiveChannels,
          priority: data.priority,
          deliveryStatus
        },
        user_id: data.senderId || 'system'
      })

      return { success: true, data: { ...notification, delivery_status: deliveryStatus } }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification',
        code: 'SEND_WITH_PREFERENCES_ERROR'
      }
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const { data: preferences, error } = await this.supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !preferences) {
      // Return default preferences if none exist
      return this.getDefaultPreferences(userId)
    }

    return this.mapDatabaseToPreferences(preferences)
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, updates: Partial<NotificationPreferences>): Promise<ServiceResult<NotificationPreferences>> {
    try {
      const { data: preferences, error } = await this.supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message, code: 'UPDATE_PREFERENCES_FAILED' }
      }

      // Log preference change
      await NotificationService.auditService.logAction({
        action: 'updated',
        entity_type: 'notification_preferences',
        entity_id: preferences.id,
        details: { updates },
        user_id: userId
      })

      return { success: true, data: this.mapDatabaseToPreferences(preferences) }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update preferences',
        code: 'UPDATE_PREFERENCES_ERROR'
      }
    }
  }

  /**
   * Create notification digest for user
   */
  async createNotificationDigest(
    userId: string, 
    startDate: Date, 
    endDate: Date,
    frequency: 'daily' | 'weekly' = 'daily'
  ): Promise<ServiceResult<NotificationDigest>> {
    try {
      // Get notifications for the period
      const { data: notifications, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('is_read', false)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message, code: 'GET_DIGEST_NOTIFICATIONS_FAILED' }
      }

      // Filter out high priority notifications (these are sent immediately)
      const digestNotifications = notifications.filter(n => 
        n.priority !== 'critical' && n.priority !== 'high'
      )

      const digest: NotificationDigest = {
        id: crypto.randomUUID(),
        recipientId: userId,
        notifications: digestNotifications.map(this.mapDatabaseToNotification),
        period: { startDate, endDate },
        deliverySchedule: frequency,
        createdAt: new Date().toISOString()
      }

      return { success: true, data: digest }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create digest',
        code: 'CREATE_DIGEST_ERROR'
      }
    }
  }

  /**
   * Create escalation for unacknowledged critical notifications
   */
  async createEscalation(
    originalNotificationId: string,
    recipientId: string,
    escalationLevel: number,
    reason: string,
    escalatedTo?: string
  ): Promise<ServiceResult<NotificationEscalation>> {
    try {
      const escalation: NotificationEscalation = {
        id: crypto.randomUUID(),
        originalNotificationId,
        recipientId,
        escalationLevel,
        escalatedAt: new Date().toISOString(),
        escalatedTo,
        reason,
        resolved: false
      }

      // In a full implementation, this would be stored in a separate escalations table
      // For now, create a new notification with escalation data
      const escalationNotification = await this.createNotification({
        recipient_id: escalatedTo || recipientId,
        notification_type: 'system_alert',
        priority: 'critical',
        category: 'emergency',
        title: `Escalation Level ${escalationLevel}: Unacknowledged Critical Alert`,
        message: `A critical notification requires immediate attention. Reason: ${reason}`,
        action_data: { escalation },
        entity_type: 'notification_escalation',
        entity_id: escalation.id,
        delivery_channels: ['in_app', 'email']
      })

      if (!escalationNotification.success) {
        return { success: false, error: escalationNotification.error, code: 'CREATE_ESCALATION_FAILED' }
      }

      // Log escalation
      await NotificationService.auditService.logAction({
        action: 'escalated',
        entity_type: 'notification',
        entity_id: originalNotificationId,
        details: {
          escalationLevel,
          escalatedTo,
          reason,
          escalationNotificationId: escalationNotification.data!.id
        },
        user_id: 'system'
      })

      return { success: true, data: escalation }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create escalation',
        code: 'CREATE_ESCALATION_ERROR'
      }
    }
  }

  /**
   * Private helper methods
   */
  private async deliverToChannel(notification: Notification, channel: NotificationChannel): Promise<boolean> {
    try {
      switch (channel) {
        case 'in_app':
          // In-app notifications are already stored in database
          return true

        case 'email':
          return await this.sendEmailNotification(notification)

        case 'sms':
          // SMS implementation would go here (not implemented in this version)
          console.log('SMS delivery not implemented yet')
          return false

        default:
          return false
      }
    } catch (error) {
      console.error(`Error delivering notification to ${channel}:`, error)
      return false
    }
  }

  private async sendEmailNotification(notification: Notification): Promise<boolean> {
    try {
      // Get email template for notification type
      const template = await this.getEmailTemplate(notification.type)
      if (!template) {
        console.error(`No email template found for type: ${notification.type}`)
        return false
      }

      // Get recipient user profile for email
      const { data: profile, error: profileError } = await this.supabase
        .from('user_profiles')
        .select('email, first_name, last_name')
        .eq('id', notification.recipientId)
        .single()

      if (profileError || !profile?.email) {
        console.error('Failed to get recipient email:', profileError)
        return false
      }

      // Render template with notification data
      const emailContent = this.renderEmailTemplate(template, {
        ...notification.actionData,
        recipientName: `${profile.first_name} ${profile.last_name}`,
        notificationTitle: notification.title,
        notificationMessage: notification.message
      })

      // For now, log the email that would be sent
      // In production, this would integrate with an email service like Resend
      console.log('Email notification to send:', {
        to: profile.email,
        subject: emailContent.subject,
        html: emailContent.body
      })

      return true

    } catch (error) {
      console.error('Error sending email notification:', error)
      return false
    }
  }

  private async getEmailTemplate(type: NotificationType) {
    const { data: template, error } = await this.supabase
      .from('notification_templates')
      .select('*')
      .eq('type', type)
      .eq('channel', 'email')
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error getting email template:', error)
      return null
    }

    return template
  }

  private renderEmailTemplate(template: any, variables: Record<string, any>) {
    let subject = template.subject_template || ''
    let body = template.body_template || ''

    // Replace template variables
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g')
      subject = subject.replace(placeholder, String(value))
      body = body.replace(placeholder, String(value))
    })

    return { subject, body }
  }

  private getEffectiveChannels(data: CreateNotificationData, preferences: NotificationPreferences): NotificationChannel[] {
    const requestedChannels = data.channels || ['in_app']
    const effectiveChannels: NotificationChannel[] = []

    requestedChannels.forEach(channel => {
      switch (channel) {
        case 'in_app':
          if (preferences.inAppNotifications) {
            effectiveChannels.push(channel)
          }
          break
        case 'email':
          if (preferences.emailNotifications && this.shouldSendEmail(data.type, preferences)) {
            effectiveChannels.push(channel)
          }
          break
        case 'sms':
          if (preferences.smsNotifications) {
            effectiveChannels.push(channel)
          }
          break
      }
    })

    // Always include in-app for critical notifications
    if (data.priority === 'critical' && !effectiveChannels.includes('in_app')) {
      effectiveChannels.push('in_app')
    }

    return effectiveChannels
  }

  private shouldSendEmail(type: NotificationType, preferences: NotificationPreferences): boolean {
    // Always send emails for critical notifications regardless of preferences
    const notification = this.getNotificationByType(type)
    if (notification && (notification.priority === 'critical' || notification.category === 'emergency')) {
      return true
    }

    switch (type) {
      case 'shift_assignment':
      case 'shift_change':
      case 'shift_cancellation':
        return preferences.scheduleNotifications
      case 'certification_expiry':
      case 'compliance_reminder':
        return preferences.complianceNotifications
      case 'emergency_alert':
        return preferences.emergencyNotifications
      case 'system_alert':
        return preferences.systemNotifications
      default:
        return true
    }
  }

  private getNotificationByType(type: NotificationType) {
    // Helper method to get notification details by type for priority/category checking
    const typeMap = {
      'emergency_alert': { priority: 'critical', category: 'emergency' },
      'shift_assignment': { priority: 'normal', category: 'scheduling' },
      'certification_expiry': { priority: 'high', category: 'compliance' },
      'system_alert': { priority: 'normal', category: 'system' }
    }
    return typeMap[type] || null
  }

  private getCategoryFromType(type: NotificationType): NotificationCategory {
    switch (type) {
      case 'shift_assignment':
      case 'shift_change':
      case 'shift_cancellation':
        return 'scheduling'
      case 'certification_expiry':
      case 'compliance_reminder':
        return 'compliance'
      case 'hiring_update':
        return 'hiring'
      case 'emergency_alert':
        return 'emergency'
      default:
        return 'system'
    }
  }

  private buildDeliveryStatus(channels: NotificationChannel[], results: PromiseSettledResult<boolean>[]): any {
    const status: any = {}
    channels.forEach((channel, index) => {
      const result = results[index]
      status[channel] = result.status === 'fulfilled' && result.value ? 'delivered' : 'failed'
    })
    return status
  }

  private async updateDeliveryStatus(notificationId: string, deliveryStatus: any): Promise<void> {
    await this.supabase
      .from('notifications')
      .update({ 
        delivery_status: deliveryStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)
  }

  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      id: '',
      userId,
      inAppNotifications: true,
      emailNotifications: true,
      smsNotifications: false,
      scheduleNotifications: true,
      availabilityNotifications: true,
      assignmentNotifications: true,
      systemNotifications: true,
      complianceNotifications: true,
      emergencyNotifications: true,
      notificationFrequency: 'immediate',
      weekendNotifications: true,
      emailDigestEnabled: false,
      emailDigestFrequency: 'daily',
      minimumPriority: 'low',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  private mapDatabaseToNotification = (data: any): Notification => {
    return {
      id: data.id,
      recipientId: data.recipient_id,
      senderId: data.sender_id,
      type: data.notification_type,
      priority: data.priority,
      category: data.category,
      title: data.title,
      message: data.message,
      actionData: data.action_data,
      entityType: data.entity_type,
      entityId: data.entity_id,
      deliveryStatus: data.delivery_status,
      deliveryChannels: data.delivery_channels,
      isRead: data.is_read,
      readAt: data.read_at,
      acknowledgedAt: data.acknowledged_at,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  private mapDatabaseToPreferences(data: any): NotificationPreferences {
    return {
      id: data.id,
      userId: data.user_id,
      inAppNotifications: data.in_app_notifications,
      emailNotifications: data.email_notifications,
      smsNotifications: data.sms_notifications,
      scheduleNotifications: data.schedule_notifications,
      availabilityNotifications: data.availability_notifications,
      assignmentNotifications: data.assignment_notifications,
      systemNotifications: data.system_notifications,
      complianceNotifications: data.compliance_notifications,
      emergencyNotifications: data.emergency_notifications,
      notificationFrequency: data.notification_frequency,
      quietHoursStart: data.quiet_hours_start,
      quietHoursEnd: data.quiet_hours_end,
      weekendNotifications: data.weekend_notifications,
      emailDigestEnabled: data.email_digest_enabled,
      emailDigestFrequency: data.email_digest_frequency,
      minimumPriority: data.minimum_priority,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  /**
   * Interpolate template variables
   */
  private interpolateTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match
    })
  }
}