import { createClient } from '@/lib/supabase'
import type { 
  NotificationPreferences,
  NotificationFrequency,
  DigestFrequency,
  NotificationPriority
} from '@/lib/types/notification-types'
import type { ServiceResult } from '@/lib/types'

export interface UpdatePreferencesRequest {
  in_app_notifications?: boolean
  email_notifications?: boolean
  sms_notifications?: boolean
  schedule_notifications?: boolean
  availability_notifications?: boolean
  assignment_notifications?: boolean
  system_notifications?: boolean
  compliance_notifications?: boolean
  emergency_notifications?: boolean
  notification_frequency?: NotificationFrequency
  quiet_hours_start?: string
  quiet_hours_end?: string
  weekend_notifications?: boolean
  email_digest_enabled?: boolean
  email_digest_frequency?: DigestFrequency
  minimum_priority?: NotificationPriority
}

export class NotificationPreferencesService {
  private static instance: NotificationPreferencesService
  private supabase = createClient()
  
  static getInstance(): NotificationPreferencesService {
    if (!NotificationPreferencesService.instance) {
      NotificationPreferencesService.instance = new NotificationPreferencesService()
    }
    return NotificationPreferencesService.instance
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string): Promise<ServiceResult<NotificationPreferences>> {
    try {
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, create default
          return this.createDefaultPreferences(userId)
        }
        return { success: false, error: error.message, code: 'GET_PREFERENCES_FAILED' }
      }

      return { success: true, data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'GET_PREFERENCES_ERROR' 
      }
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string, 
    updates: UpdatePreferencesRequest
  ): Promise<ServiceResult<NotificationPreferences>> {
    try {
      // Ensure emergency notifications cannot be disabled
      if (updates.emergency_notifications === false) {
        updates.emergency_notifications = true
      }

      const { data, error } = await this.supabase
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

      return { success: true, data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UPDATE_PREFERENCES_ERROR' 
      }
    }
  }

  /**
   * Create default preferences for a user
   */
  async createDefaultPreferences(userId: string): Promise<ServiceResult<NotificationPreferences>> {
    try {
      const defaultPreferences = {
        user_id: userId,
        in_app_notifications: true,
        email_notifications: true,
        sms_notifications: false,
        schedule_notifications: true,
        availability_notifications: true,
        assignment_notifications: true,
        system_notifications: true,
        compliance_notifications: true,
        emergency_notifications: true,
        notification_frequency: 'immediate' as NotificationFrequency,
        weekend_notifications: true,
        email_digest_enabled: false,
        email_digest_frequency: 'daily' as DigestFrequency,
        minimum_priority: 'normal' as NotificationPriority
      }

      const { data, error } = await this.supabase
        .from('notification_preferences')
        .insert(defaultPreferences)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message, code: 'CREATE_DEFAULT_PREFERENCES_FAILED' }
      }

      return { success: true, data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CREATE_DEFAULT_PREFERENCES_ERROR' 
      }
    }
  }

  /**
   * Check if user should receive notification based on preferences
   */
  async shouldReceiveNotification(
    userId: string,
    notificationType: string,
    priority: NotificationPriority,
    category: string,
    deliveryChannel: 'in_app' | 'email' | 'sms' = 'in_app'
  ): Promise<ServiceResult<boolean>> {
    try {
      const preferencesResult = await this.getPreferences(userId)
      if (!preferencesResult.success) {
        // If we can't get preferences, default to allowing the notification
        return { success: true, data: true }
      }

      const prefs = preferencesResult.data

      // Always allow emergency notifications
      if (priority === 'emergency' || category === 'emergency') {
        return { success: true, data: true }
      }

      // Check delivery channel preference
      switch (deliveryChannel) {
        case 'in_app':
          if (!prefs.in_app_notifications) return { success: true, data: false }
          break
        case 'email':
          if (!prefs.email_notifications) return { success: true, data: false }
          break
        case 'sms':
          if (!prefs.sms_notifications) return { success: true, data: false }
          break
      }

      // Check category preferences
      switch (category) {
        case 'schedule':
          if (!prefs.schedule_notifications) return { success: true, data: false }
          break
        case 'availability':
          if (!prefs.availability_notifications) return { success: true, data: false }
          break
        case 'assignments':
          if (!prefs.assignment_notifications) return { success: true, data: false }
          break
        case 'system':
          if (!prefs.system_notifications) return { success: true, data: false }
          break
        case 'compliance':
          if (!prefs.compliance_notifications) return { success: true, data: false }
          break
      }

      // Check priority threshold
      const priorityValues = {
        low: 1,
        normal: 2,
        high: 3,
        urgent: 4,
        emergency: 5
      }

      if (priorityValues[priority] < priorityValues[prefs.minimum_priority]) {
        return { success: true, data: false }
      }

      // Check quiet hours
      if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
        const now = new Date()
        const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
        
        if (this.isInQuietHours(currentTime, prefs.quiet_hours_start, prefs.quiet_hours_end)) {
          // Only allow emergency and urgent during quiet hours
          if (priority !== 'emergency' && priority !== 'urgent') {
            return { success: true, data: false }
          }
        }
      }

      // Check weekend preferences
      if (!prefs.weekend_notifications) {
        const now = new Date()
        const dayOfWeek = now.getDay()
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
          // Only allow emergency and urgent on weekends if weekend notifications are disabled
          if (priority !== 'emergency' && priority !== 'urgent') {
            return { success: true, data: false }
          }
        }
      }

      // Check notification frequency
      if (prefs.notification_frequency === 'disabled') {
        // Only emergency notifications when disabled
        if (priority !== 'emergency') {
          return { success: true, data: false }
        }
      }

      return { success: true, data: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'NOTIFICATION_CHECK_ERROR' 
      }
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(currentTime: string, startTime: string, endTime: string): boolean {
    // Convert times to minutes for easier comparison
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }

    const current = timeToMinutes(currentTime)
    const start = timeToMinutes(startTime)
    const end = timeToMinutes(endTime)

    if (start <= end) {
      // Same day quiet hours (e.g., 22:00 to 08:00 next day)
      return current >= start && current <= end
    } else {
      // Overnight quiet hours (e.g., 22:00 to 08:00 next day)
      return current >= start || current <= end
    }
  }

  /**
   * Get all users who should receive a specific notification
   */
  async getUsersForNotification(
    notificationType: string,
    priority: NotificationPriority,
    category: string,
    deliveryChannel: 'in_app' | 'email' | 'sms' = 'in_app',
    targetUserIds?: string[]
  ): Promise<ServiceResult<string[]>> {
    try {
      let query = this.supabase
        .from('notification_preferences')
        .select('user_id')

      // If specific users are targeted, filter by them
      if (targetUserIds && targetUserIds.length > 0) {
        query = query.in('user_id', targetUserIds)
      }

      // Apply basic filters based on notification type
      if (priority !== 'emergency') {
        // Emergency notifications always go through
        switch (deliveryChannel) {
          case 'in_app':
            query = query.eq('in_app_notifications', true)
            break
          case 'email':
            query = query.eq('email_notifications', true)
            break
          case 'sms':
            query = query.eq('sms_notifications', true)
            break
        }

        // Apply category filters
        switch (category) {
          case 'schedule':
            query = query.eq('schedule_notifications', true)
            break
          case 'availability':
            query = query.eq('availability_notifications', true)
            break
          case 'assignments':
            query = query.eq('assignment_notifications', true)
            break
          case 'system':
            query = query.eq('system_notifications', true)
            break
          case 'compliance':
            query = query.eq('compliance_notifications', true)
            break
        }
      }

      const { data, error } = await query

      if (error) {
        return { success: false, error: error.message, code: 'GET_USERS_FAILED' }
      }

      const userIds = data?.map(item => item.user_id) || []
      return { success: true, data: userIds }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'GET_USERS_ERROR' 
      }
    }
  }

  /**
   * Test notification delivery for a user
   */
  async testNotificationDelivery(
    userId: string,
    deliveryChannel: 'in_app' | 'email' | 'sms'
  ): Promise<ServiceResult<boolean>> {
    try {
      // Create a test notification
      const testNotification = {
        recipient_id: userId,
        notification_type: 'system_alert' as any,
        priority: 'normal' as NotificationPriority,
        category: 'system' as any,
        title: 'Test Notification',
        message: 'This is a test notification to verify your notification settings.',
        delivery_channels: [deliveryChannel],
        action_data: {
          actions: [
            {
              id: 'dismiss',
              label: 'Dismiss',
              action_type: 'acknowledge',
              style: 'secondary'
            }
          ]
        }
      }

      // Import NotificationService dynamically to avoid circular imports
      const { NotificationService } = await import('./notification-service')
      const notificationService = NotificationService.getInstance()

      const result = await notificationService.createNotification(testNotification)
      
      return { success: result.success, data: result.success }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'TEST_NOTIFICATION_ERROR' 
      }
    }
  }

  /**
   * Reset preferences to defaults
   */
  async resetToDefaults(userId: string): Promise<ServiceResult<NotificationPreferences>> {
    try {
      // Delete existing preferences
      await this.supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', userId)

      // Create new default preferences
      return this.createDefaultPreferences(userId)
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RESET_PREFERENCES_ERROR' 
      }
    }
  }

  /**
   * Export preferences for backup/migration
   */
  async exportPreferences(userId: string): Promise<ServiceResult<NotificationPreferences>> {
    return this.getPreferences(userId)
  }

  /**
   * Import preferences from backup
   */
  async importPreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<ServiceResult<NotificationPreferences>> {
    try {
      // Remove metadata fields that shouldn't be imported
      const { id, created_at, updated_at, ...importData } = preferences as any
      
      return this.updatePreferences(userId, {
        ...importData,
        user_id: userId
      })
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'IMPORT_PREFERENCES_ERROR' 
      }
    }
  }
}