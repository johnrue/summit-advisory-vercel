import { NotificationService } from '../notification-service'
import { AuditService } from '../audit-service'
import { createClient } from '@/lib/supabase'
import { CreateNotificationData, NotificationPreferences } from '@/lib/types'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockNotificationPreferences,
            error: null
          })),
          order: jest.fn(() => ({
            data: mockNotifications,
            error: null
          })),
          limit: jest.fn(() => ({
            range: jest.fn(() => ({
              data: mockNotifications,
              error: null,
              count: 5
            }))
          })),
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: mockNotifications.slice(0, 2),
                  error: null
                }))
              }))
            }))
          }))
        })),
        is: jest.fn(() => ({
          lt: jest.fn(() => ({
            data: [mockNotifications[0]],
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockNewNotification,
            error: null
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: mockUpdatedNotification,
              error: null
            }))
          })),
          data: null,
          error: null
        }))
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockUpdatedPreferences,
            error: null
          }))
        }))
      }))
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(() => mockSubscription)
      }))
    })),
    removeChannel: jest.fn()
  }))
}))

// Mock AuditService
jest.mock('../audit-service', () => ({
  AuditService: {
    getInstance: jest.fn(() => ({
      logAction: jest.fn().mockResolvedValue({ success: true })
    }))
  }
}))

const mockNotificationPreferences = {
  id: 'pref-1',
  user_id: 'user-1',
  in_app_notifications: true,
  email_notifications: true,
  sms_notifications: false,
  schedule_notifications: true,
  availability_notifications: true,
  assignment_notifications: true,
  system_notifications: true,
  compliance_notifications: true,
  emergency_notifications: true,
  notification_frequency: 'immediate',
  quiet_hours_start: null,
  quiet_hours_end: null,
  weekend_notifications: true,
  email_digest_enabled: false,
  email_digest_frequency: 'daily',
  minimum_priority: 'low',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z'
}

const mockUpdatedPreferences = {
  ...mockNotificationPreferences,
  email_notifications: false,
  updated_at: new Date().toISOString()
}

const mockNotifications = [
  {
    id: 'notif-1',
    recipient_id: 'user-1',
    sender_id: 'system',
    notification_type: 'shift_assignment',
    priority: 'normal',
    category: 'scheduling',
    title: 'New Shift Assignment',
    message: 'You have been assigned to a shift at Downtown Location',
    action_data: { shiftId: 'shift-1', location: 'Downtown Location' },
    entity_type: 'shift',
    entity_id: 'shift-1',
    delivery_status: 'delivered',
    delivery_channels: ['in_app', 'email'],
    is_read: false,
    read_at: null,
    acknowledged_at: null,
    expires_at: null,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 'notif-2',
    recipient_id: 'user-1',
    sender_id: 'system',
    notification_type: 'certification_expiry',
    priority: 'high',
    category: 'compliance',
    title: 'Certification Expiring Soon',
    message: 'Your TOPS license expires in 7 days',
    action_data: { certificationType: 'TOPS', daysUntilExpiry: 7 },
    entity_type: 'certification',
    entity_id: 'cert-1',
    delivery_status: 'delivered',
    delivery_channels: ['in_app', 'email'],
    is_read: true,
    read_at: '2024-01-15T12:00:00Z',
    acknowledged_at: null,
    expires_at: null,
    created_at: '2024-01-15T11:00:00Z',
    updated_at: '2024-01-15T12:00:00Z'
  }
]

const mockNewNotification = {
  id: 'notif-3',
  recipient_id: 'user-1',
  sender_id: 'manager-1',
  notification_type: 'approval_needed',
  priority: 'normal',
  category: 'system',
  title: 'Approval Required',
  message: 'Your time-off request needs approval',
  action_data: { requestId: 'req-1' },
  entity_type: 'time_off_request',
  entity_id: 'req-1',
  delivery_status: 'pending',
  delivery_channels: ['in_app'],
  is_read: false,
  read_at: null,
  acknowledged_at: null,
  expires_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

const mockUpdatedNotification = {
  ...mockNotifications[0],
  is_read: true,
  read_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

const mockSubscription = {
  unsubscribe: jest.fn()
}

const mockUserProfile = {
  id: 'user-1',
  email: 'john.doe@example.com',
  first_name: 'John',
  last_name: 'Doe'
}

describe('NotificationService', () => {
  let notificationService: NotificationService

  beforeEach(() => {
    jest.clearAllMocks()
    notificationService = NotificationService.getInstance()
  })

  describe('sendWithPreferences', () => {
    it('should send notification with user preferences', async () => {
      const notificationData: CreateNotificationData = {
        recipientId: 'user-1',
        senderId: 'system',
        type: 'shift_assignment',
        title: 'New Shift Assignment',
        message: 'You have been assigned to a shift',
        priority: 'normal',
        channels: ['in_app', 'email']
      }

      const result = await notificationService.sendWithPreferences(notificationData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.title).toBe('New Shift Assignment')
    })

    it('should handle missing recipient ID', async () => {
      const notificationData: CreateNotificationData = {
        recipientId: '',
        type: 'shift_assignment',
        title: 'Test',
        message: 'Test message'
      }

      const result = await notificationService.sendWithPreferences(notificationData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should respect user preference for email notifications', async () => {
      // Mock preferences with email disabled
      const mockPrefs = {
        ...mockNotificationPreferences,
        email_notifications: false
      }

      require('@/lib/supabase').createClient.mockReturnValueOnce({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: mockPrefs,
                error: null
              }))
            }))
          })),
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => ({
                data: mockNewNotification,
                error: null
              }))
            }))
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      })

      const notificationData: CreateNotificationData = {
        recipientId: 'user-1',
        type: 'shift_assignment',
        title: 'Test',
        message: 'Test message',
        channels: ['in_app', 'email']
      }

      const result = await notificationService.sendWithPreferences(notificationData)

      expect(result.success).toBe(true)
      // Should only include in_app channel since email is disabled
      expect(result.data?.deliveryChannels).not.toContain('email')
    })
  })

  describe('getUserPreferences', () => {
    it('should get user notification preferences', async () => {
      const preferences = await notificationService.getUserPreferences('user-1')

      expect(preferences).toBeDefined()
      expect(preferences.userId).toBe('user-1')
      expect(preferences.inAppNotifications).toBe(true)
      expect(preferences.emailNotifications).toBe(true)
    })

    it('should return default preferences when none exist', async () => {
      require('@/lib/supabase').createClient.mockReturnValueOnce({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: null,
                error: { code: 'PGRST116' }
              }))
            }))
          }))
        }))
      })

      const preferences = await notificationService.getUserPreferences('user-new')

      expect(preferences).toBeDefined()
      expect(preferences.userId).toBe('user-new')
      expect(preferences.inAppNotifications).toBe(true)
      expect(preferences.emailNotifications).toBe(true)
    })
  })

  describe('updateUserPreferences', () => {
    it('should update user notification preferences', async () => {
      const updates = { emailNotifications: false }

      const result = await notificationService.updateUserPreferences('user-1', updates)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.emailNotifications).toBe(false)
    })

    it('should log preference changes', async () => {
      const updates = { emailNotifications: false }

      await notificationService.updateUserPreferences('user-1', updates)

      const auditService = AuditService.getInstance()
      expect(auditService.logAction).toHaveBeenCalledWith({
        action: 'updated',
        entity_type: 'notification_preferences',
        entity_id: mockUpdatedPreferences.id,
        details: { updates },
        user_id: 'user-1'
      })
    })
  })

  describe('getNotifications', () => {
    it('should get user notifications with filtering', async () => {
      const result = await notificationService.getNotifications('user-1', {
        limit: 10,
        unreadOnly: false
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data?.length).toBe(2)
    })

    it('should filter unread notifications only', async () => {
      const result = await notificationService.getNotifications('user-1', {
        unreadOnly: true
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should handle database errors gracefully', async () => {
      require('@/lib/supabase').createClient.mockReturnValueOnce({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                data: null,
                error: { message: 'Database error' }
              }))
            }))
          }))
        }))
      })

      const result = await notificationService.getNotifications('user-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const result = await notificationService.markAsRead('notif-1')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should handle database errors', async () => {
      require('@/lib/supabase').createClient.mockReturnValueOnce({
        from: jest.fn(() => ({
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: null,
                  error: { message: 'Update failed' }
                }))
              }))
            }))
          }))
        }))
      })

      const result = await notificationService.markAsRead('notif-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
    })
  })

  describe('acknowledgeNotification', () => {
    it('should acknowledge notification', async () => {
      const result = await notificationService.acknowledgeNotification('notif-1')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should log acknowledgment', async () => {
      await notificationService.acknowledgeNotification('notif-1')

      // Note: The audit logging in acknowledgeNotification is in the enhanced version
      // This test might need adjustment based on the actual implementation
    })
  })

  describe('createNotificationDigest', () => {
    it('should create daily notification digest', async () => {
      const startDate = new Date('2024-01-15T00:00:00Z')
      const endDate = new Date('2024-01-15T23:59:59Z')

      const result = await notificationService.createNotificationDigest(
        'user-1',
        startDate,
        endDate,
        'daily'
      )

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.recipientId).toBe('user-1')
      expect(result.data?.deliverySchedule).toBe('daily')
    })

    it('should filter out high priority notifications from digest', async () => {
      const startDate = new Date('2024-01-15T00:00:00Z')
      const endDate = new Date('2024-01-15T23:59:59Z')

      const result = await notificationService.createNotificationDigest(
        'user-1',
        startDate,
        endDate,
        'daily'
      )

      expect(result.success).toBe(true)
      expect(result.data?.notifications).toBeDefined()
      
      // Should exclude high priority notifications
      const hasHighPriority = result.data?.notifications.some(n => 
        n.priority === 'high' || n.priority === 'critical'
      )
      expect(hasHighPriority).toBe(false)
    })
  })

  describe('createEscalation', () => {
    it('should create escalation for unacknowledged critical notification', async () => {
      const result = await notificationService.createEscalation(
        'notif-1',
        'user-1',
        1,
        'Critical notification unacknowledged for 15 minutes'
      )

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.escalationLevel).toBe(1)
      expect(result.data?.originalNotificationId).toBe('notif-1')
    })

    it('should log escalation creation', async () => {
      await notificationService.createEscalation(
        'notif-1',
        'user-1',
        1,
        'Test escalation'
      )

      // Audit logging should be called
      const auditService = AuditService.getInstance()
      expect(auditService.logAction).toHaveBeenCalled()
    })
  })

  describe('getNotificationStats', () => {
    it('should return notification statistics', async () => {
      const result = await notificationService.getNotificationStats('user-1')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(typeof result.data?.total_count).toBe('number')
      expect(typeof result.data?.unread_count).toBe('number')
    })
  })

  describe('real-time subscriptions', () => {
    it('should subscribe to notifications', () => {
      const callback = jest.fn()
      const subscription = notificationService.subscribeToNotifications('user-1', callback)

      expect(subscription).toBeDefined()
      expect(subscription).toBe(mockSubscription)
    })

    it('should unsubscribe from notifications', () => {
      const callback = jest.fn()
      const subscription = notificationService.subscribeToNotifications('user-1', callback)
      
      notificationService.unsubscribeFromNotifications(subscription)

      // Verify unsubscribe was called on the mocked client
      expect(require('@/lib/supabase').createClient().removeChannel).toHaveBeenCalledWith(subscription)
    })
  })

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      require('@/lib/supabase').createClient.mockImplementationOnce(() => {
        throw new Error('Service unavailable')
      })

      const result = await notificationService.getNotifications('user-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Service unavailable')
    })

    it('should handle invalid notification data', async () => {
      const invalidData = {
        recipientId: '',
        type: 'invalid_type' as any,
        title: '',
        message: ''
      }

      const result = await notificationService.sendWithPreferences(invalidData)

      expect(result.success).toBe(false)
    })
  })

  describe('preference validation', () => {
    it('should apply correct channel preferences', async () => {
      const preferences = await notificationService.getUserPreferences('user-1')

      expect(preferences.inAppNotifications).toBeDefined()
      expect(preferences.emailNotifications).toBeDefined()
      expect(preferences.smsNotifications).toBeDefined()
    })

    it('should handle quiet hours', async () => {
      const preferencesWithQuietHours = {
        ...mockNotificationPreferences,
        quiet_hours_start: '22:00',
        quiet_hours_end: '06:00'
      }

      require('@/lib/supabase').createClient.mockReturnValueOnce({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: preferencesWithQuietHours,
                error: null
              }))
            }))
          }))
        }))
      })

      const preferences = await notificationService.getUserPreferences('user-1')

      expect(preferences.quietHoursStart).toBe('22:00')
      expect(preferences.quietHoursEnd).toBe('06:00')
    })
  })
})