import { NotificationDigestJob } from '../notification-digest-job'
import { NotificationService } from '../../services/notification-service'
import { AuditService } from '../../services/audit-service'
import { supabase } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: mockUsers,
          error: null,
          single: jest.fn(() => ({
            data: mockUserProfile,
            error: null
          }))
        })),
        is: jest.fn(() => ({
          lt: jest.fn(() => ({
            data: mockCriticalNotifications,
            error: null
          }))
        }))
      }))
    }))
  }
}))

// Mock NotificationService
jest.mock('../../services/notification-service', () => ({
  NotificationService: {
    getInstance: jest.fn(() => ({
      createNotificationDigest: jest.fn().mockResolvedValue({
        success: true,
        data: mockDigest
      }),
      createEscalation: jest.fn().mockResolvedValue({
        success: true,
        data: mockEscalation
      })
    }))
  }
}))

// Mock AuditService
jest.mock('../../services/audit-service', () => ({
  AuditService: {
    getInstance: jest.fn(() => ({
      logAction: jest.fn().mockResolvedValue({ success: true })
    }))
  }
}))

const mockUsers = [
  {
    user_id: 'user-1',
    email_digest_frequency: 'daily',
    email_digest_enabled: true
  },
  {
    user_id: 'user-2',
    email_digest_frequency: 'daily',
    email_digest_enabled: true
  }
]

const mockWeeklyUsers = [
  {
    user_id: 'user-3',
    email_digest_frequency: 'weekly',
    email_digest_enabled: true
  }
]

const mockUserProfile = {
  id: 'user-1',
  email: 'john.doe@example.com',
  first_name: 'John',
  last_name: 'Doe'
}

const mockDigest = {
  id: 'digest-1',
  recipientId: 'user-1',
  notifications: [
    {
      id: 'notif-1',
      title: 'Shift Assignment',
      message: 'You have a new shift assignment',
      priority: 'normal',
      category: 'scheduling',
      isRead: false,
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 'notif-2',
      title: 'System Update',
      message: 'System maintenance scheduled',
      priority: 'low',
      category: 'system',
      isRead: false,
      createdAt: '2024-01-15T11:00:00Z'
    }
  ],
  period: {
    startDate: new Date('2024-01-14T00:00:00Z'),
    endDate: new Date('2024-01-15T00:00:00Z')
  },
  deliverySchedule: 'daily',
  createdAt: '2024-01-15T12:00:00Z'
}

const mockCriticalNotifications = [
  {
    id: 'critical-notif-1',
    recipient_id: 'user-1',
    priority: 'critical',
    acknowledged_at: null,
    created_at: '2024-01-15T09:30:00Z',
    title: 'Critical Security Alert',
    message: 'Immediate action required'
  }
]

const mockEscalation = {
  id: 'escalation-1',
  originalNotificationId: 'critical-notif-1',
  recipientId: 'user-1',
  escalationLevel: 1,
  escalatedAt: '2024-01-15T12:00:00Z',
  reason: 'Critical notification unacknowledged for 15 minutes',
  resolved: false
}

describe('NotificationDigestJob', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variable for testing
    process.env.NEXT_PUBLIC_BASE_URL = 'https://test.example.com'
  })

  describe('executeDailyDigest', () => {
    it('should execute daily digest job successfully', async () => {
      await NotificationDigestJob.executeDailyDigest()

      // Verify Supabase query was called
      expect(supabase.from).toHaveBeenCalledWith('notification_preferences')

      // Verify NotificationService was called for each user
      const notificationService = NotificationService.getInstance()
      expect(notificationService.createNotificationDigest).toHaveBeenCalledTimes(2)

      // Verify audit log was created
      const auditService = AuditService.getInstance()
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'daily_digest_executed',
          entity_type: 'notification_digest_job',
          entity_id: 'daily_digest'
        })
      )
    })

    it('should handle users with no notifications', async () => {
      const emptyDigest = {
        ...mockDigest,
        notifications: []
      }

      const mockNotificationService = {
        createNotificationDigest: jest.fn().mockResolvedValue({
          success: true,
          data: emptyDigest
        })
      }

      ;(NotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationService)

      await NotificationDigestJob.executeDailyDigest()

      // Should still process but not send digest for empty notifications
      expect(mockNotificationService.createNotificationDigest).toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: { message: 'Database connection failed' }
          }))
        }))
      })

      await expect(NotificationDigestJob.executeDailyDigest()).rejects.toThrow(
        'Failed to get users for daily digest: Database connection failed'
      )

      // Verify error was logged
      const auditService = AuditService.getInstance()
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'daily_digest_failed',
          entity_type: 'notification_digest_job'
        })
      )
    })

    it('should continue processing other users if one fails', async () => {
      const mockNotificationService = {
        createNotificationDigest: jest.fn()
          .mockResolvedValueOnce({ success: true, data: mockDigest })
          .mockRejectedValueOnce(new Error('User processing failed'))
      }

      ;(NotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationService)

      // Should not throw error, but continue processing
      await NotificationDigestJob.executeDailyDigest()

      expect(mockNotificationService.createNotificationDigest).toHaveBeenCalledTimes(2)
    })
  })

  describe('executeWeeklyDigest', () => {
    beforeEach(() => {
      // Mock weekly users
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: mockWeeklyUsers,
            error: null
          }))
        }))
      })
    })

    it('should execute weekly digest job successfully', async () => {
      await NotificationDigestJob.executeWeeklyDigest()

      // Verify correct frequency filter was used
      expect(supabase.from).toHaveBeenCalledWith('notification_preferences')

      // Verify weekly digest was created
      const notificationService = NotificationService.getInstance()
      expect(notificationService.createNotificationDigest).toHaveBeenCalledWith(
        'user-3',
        expect.any(Date),
        expect.any(Date),
        'weekly'
      )

      // Verify audit log was created
      const auditService = AuditService.getInstance()
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'weekly_digest_executed',
          entity_type: 'notification_digest_job'
        })
      )
    })

    it('should use correct date range for weekly digest', async () => {
      const beforeExecution = Date.now()
      await NotificationDigestJob.executeWeeklyDigest()
      const afterExecution = Date.now()

      const notificationService = NotificationService.getInstance()
      const callArgs = (notificationService.createNotificationDigest as jest.Mock).mock.calls[0]
      
      const startDate = callArgs[1] as Date
      const endDate = callArgs[2] as Date

      // Check that date range is approximately 7 days
      const timeDiff = endDate.getTime() - startDate.getTime()
      const expectedTimeDiff = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
      
      expect(Math.abs(timeDiff - expectedTimeDiff)).toBeLessThan(1000) // Within 1 second
      expect(endDate.getTime()).toBeGreaterThanOrEqual(beforeExecution)
      expect(endDate.getTime()).toBeLessThanOrEqual(afterExecution)
    })
  })

  describe('processEscalations', () => {
    beforeEach(() => {
      // Mock critical notifications query
      require('@/lib/supabase').supabase.from.mockImplementation((table) => {
        if (table === 'notifications' && arguments.length === 1) {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                is: jest.fn(() => ({
                  lt: jest.fn(() => ({
                    data: mockCriticalNotifications,
                    error: null
                  }))
                }))
              })),
              single: jest.fn(() => ({
                data: null,
                error: { code: 'PGRST116' } // Not found
              }))
            }))
          }
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: null,
                error: { code: 'PGRST116' }
              }))
            }))
          }))
        }
      })
    })

    it('should process escalations for unacknowledged critical notifications', async () => {
      await NotificationDigestJob.processEscalations()

      // Verify critical notifications were queried
      expect(supabase.from).toHaveBeenCalledWith('notifications')

      // Verify escalation was created
      const notificationService = NotificationService.getInstance()
      expect(notificationService.createEscalation).toHaveBeenCalledWith(
        'critical-notif-1',
        'user-1',
        1,
        'Critical notification unacknowledged for 15 minutes'
      )

      // Verify audit log was created
      const auditService = AuditService.getInstance()
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'escalations_processed',
          entity_type: 'notification_digest_job'
        })
      )
    })

    it('should not create escalation if one already exists', async () => {
      // Mock existing escalation
      require('@/lib/supabase').supabase.from.mockImplementation((table) => {
        if (table === 'notifications') {
          // First call - get critical notifications
          if (arguments.length === 1) {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  is: jest.fn(() => ({
                    lt: jest.fn(() => ({
                      data: mockCriticalNotifications,
                      error: null
                    }))
                  }))
                }))
              }))
            }
          }
          // Second call - check for existing escalation
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { id: 'existing-escalation' },
                  error: null
                }))
              }))
            }))
          }
        }
        return {}
      })

      await NotificationDigestJob.processEscalations()

      // Verify escalation was not created
      const notificationService = NotificationService.getInstance()
      expect(notificationService.createEscalation).not.toHaveBeenCalled()
    })

    it('should handle no critical notifications', async () => {
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            is: jest.fn(() => ({
              lt: jest.fn(() => ({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      })

      await NotificationDigestJob.processEscalations()

      // Should complete without errors
      const auditService = AuditService.getInstance()
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'escalations_processed',
          details: expect.objectContaining({
            notificationsChecked: 0,
            escalationsCreated: 0
          })
        })
      )
    })
  })

  describe('email content generation', () => {
    it('should generate proper digest email content', () => {
      // Access private method through reflection for testing
      const emailContent = (NotificationDigestJob as any).generateDigestEmailContent(
        mockDigest,
        mockUserProfile
      )

      expect(emailContent.subject).toContain('Daily Notification Digest')
      expect(emailContent.subject).toContain('2 updates')
      expect(emailContent.html).toContain('John Doe')
      expect(emailContent.html).toContain('Shift Assignment')
      expect(emailContent.html).toContain('System Update')
      expect(emailContent.html).toContain('https://test.example.com/dashboard')
    })

    it('should handle different priority colors', () => {
      const getPriorityColor = (NotificationDigestJob as any).getPriorityColor

      expect(getPriorityColor('critical')).toBe('#dc3545')
      expect(getPriorityColor('high')).toBe('#fd7e14')
      expect(getPriorityColor('normal')).toBe('#007bff')
      expect(getPriorityColor('low')).toBe('#6c757d')
      expect(getPriorityColor('unknown')).toBe('#6c757d')
    })

    it('should truncate notifications list in email', () => {
      const longDigest = {
        ...mockDigest,
        notifications: Array.from({ length: 15 }, (_, i) => ({
          id: `notif-${i}`,
          title: `Notification ${i}`,
          message: `Message ${i}`,
          priority: 'normal',
          category: 'system',
          createdAt: new Date().toISOString()
        }))
      }

      const emailContent = (NotificationDigestJob as any).generateDigestEmailContent(
        longDigest,
        mockUserProfile
      )

      expect(emailContent.html).toContain('... and 5 more notifications')
    })
  })

  describe('test execution', () => {
    it('should run test successfully', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()

      await NotificationDigestJob.test()

      expect(consoleLogSpy).toHaveBeenCalledWith('Running notification digest job test...')
      expect(consoleLogSpy).toHaveBeenCalledWith('Test completed successfully')

      consoleLogSpy.mockRestore()
    })

    it('should handle test failures', async () => {
      const mockError = new Error('Test failed')
      
      // Mock daily digest to fail
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => {
          throw mockError
        })
      })

      await expect(NotificationDigestJob.test()).rejects.toThrow('Test failed')
    })
  })

  describe('error handling and recovery', () => {
    it('should handle partial failures in user processing', async () => {
      const mockNotificationService = {
        createNotificationDigest: jest.fn()
          .mockResolvedValueOnce({ success: true, data: mockDigest })
          .mockRejectedValueOnce(new Error('Network error'))
      }

      ;(NotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationService)

      // Should not throw, should continue processing
      await expect(NotificationDigestJob.executeDailyDigest()).resolves.not.toThrow()

      // Verify both users were attempted
      expect(mockNotificationService.createNotificationDigest).toHaveBeenCalledTimes(2)
    })

    it('should log detailed execution metrics', async () => {
      await NotificationDigestJob.executeDailyDigest()

      const auditService = AuditService.getInstance()
      const logCall = (auditService.logAction as jest.Mock).mock.calls.find(
        call => call[0].action === 'daily_digest_executed'
      )

      expect(logCall).toBeDefined()
      expect(logCall[0].details).toMatchObject({
        usersProcessed: expect.any(Number),
        digestsSent: expect.any(Number),
        errors: expect.any(Number),
        executionTime: expect.any(Number),
        startTime: expect.any(String),
        endTime: expect.any(String)
      })
    })
  })
})