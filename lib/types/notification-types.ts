export type NotificationType = 
  | 'shift_assignment'
  | 'shift_cancellation'
  | 'shift_modification'
  | 'availability_request'
  | 'time_off_approved'
  | 'time_off_denied'
  | 'emergency_coverage'
  | 'system_alert'
  | 'calendar_sync_failed'
  | 'compliance_reminder'

export type NotificationPriority = 
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent'
  | 'emergency'

export type NotificationCategory = 
  | 'schedule'
  | 'availability'
  | 'assignments'
  | 'system'
  | 'compliance'
  | 'emergency'

export type DeliveryStatus = 
  | 'pending'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'retrying'

export type NotificationFrequency = 
  | 'immediate'
  | 'batched_5min'
  | 'batched_1hr'
  | 'daily_digest'
  | 'disabled'

export type DigestFrequency = 
  | 'daily'
  | 'weekly'
  | 'monthly'

export interface Notification {
  id: string
  recipient_id: string
  sender_id?: string
  notification_type: NotificationType
  priority: NotificationPriority
  category: NotificationCategory
  title: string
  message: string
  action_data: Record<string, any>
  entity_type?: string
  entity_id?: string
  delivery_status: DeliveryStatus
  delivery_channels: string[]
  is_read: boolean
  read_at?: string
  acknowledged_at?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  id: string
  user_id: string
  in_app_notifications: boolean
  email_notifications: boolean
  sms_notifications: boolean
  schedule_notifications: boolean
  availability_notifications: boolean
  assignment_notifications: boolean
  system_notifications: boolean
  compliance_notifications: boolean
  emergency_notifications: boolean
  notification_frequency: NotificationFrequency
  quiet_hours_start?: string
  quiet_hours_end?: string
  weekend_notifications: boolean
  email_digest_enabled: boolean
  email_digest_frequency: DigestFrequency
  minimum_priority: NotificationPriority
  created_at: string
  updated_at: string
}

export interface NotificationHistory {
  id: string
  notification_id: string
  delivery_channel: string
  delivery_attempt: number
  delivery_status: DeliveryStatus
  delivery_provider?: string
  external_id?: string
  error_message?: string
  error_code?: string
  delivery_duration_ms?: number
  attempted_at: string
  delivered_at?: string
}

export interface CreateNotificationRequest {
  recipient_id: string
  sender_id?: string
  notification_type: NotificationType
  priority?: NotificationPriority
  category: NotificationCategory
  title: string
  message: string
  action_data?: Record<string, any>
  entity_type?: string
  entity_id?: string
  delivery_channels?: string[]
  expires_at?: string
}

export interface NotificationFilter {
  category?: NotificationCategory[]
  priority?: NotificationPriority[]
  is_read?: boolean
  from_date?: string
  to_date?: string
  entity_type?: string
  limit?: number
  offset?: number
}

export interface NotificationStats {
  total_count: number
  unread_count: number
  urgent_count: number
  emergency_count: number
  categories: Record<NotificationCategory, number>
  priorities: Record<NotificationPriority, number>
}

export interface NotificationAction {
  id: string
  label: string
  action_type: 'accept' | 'decline' | 'view' | 'acknowledge' | 'custom'
  url?: string
  data?: Record<string, any>
  style?: 'primary' | 'secondary' | 'danger' | 'success'
}

export interface NotificationTemplate {
  type: NotificationType
  title_template: string
  message_template: string
  default_priority: NotificationPriority
  category: NotificationCategory
  default_channels: string[]
  action_template?: NotificationAction[]
  variables: string[]
}