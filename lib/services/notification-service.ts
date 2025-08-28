import { createClient } from '@/lib/supabase'
import type { 
  Notification, 
  CreateNotificationRequest, 
  NotificationFilter,
  NotificationStats,
  NotificationTemplate 
} from '@/lib/types/notification-types'
import type { ServiceResult } from '@/lib/types'

export class NotificationService {
  private static instance: NotificationService
  private supabase = createClient()
  
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
   * Interpolate template variables
   */
  private interpolateTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match
    })
  }
}