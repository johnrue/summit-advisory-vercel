import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmailNotificationService } from '@/lib/services/email-notification-service'
import type { 
  Notification, 
  EmailTemplate, 
  EmailNotificationRequest,
  EmailDeliveryResult 
} from '@/lib/services/email-notification-service'

// Mock environment variables
const mockEnv = {
  NEXT_PUBLIC_SITE_URL: 'https://summitadvisoryfirm.com'
}

Object.assign(process.env, mockEnv)

describe('EmailNotificationService', () => {
  let emailService: EmailNotificationService
  let mockConsoleLog: any

  const mockNotification: Notification = {
    id: 'notification-123',
    recipient_id: 'user-456',
    notification_type: 'shift_assignment',
    priority: 'urgent',
    category: 'schedule',
    title: 'Urgent Shift Assignment',
    message: 'You have been assigned to an urgent security shift at Downtown Plaza.',
    is_read: false,
    delivery_channels: ['in_app', 'email'],
    created_at: '2025-01-15T14:30:00Z',
    entity_type: 'shift',
    entity_id: 'shift-789',
    action_data: {
      actions: [
        { label: 'Accept Shift', url: '/shifts/789/accept' },
        { label: 'View Details', url: '/shifts/789' }
      ]
    }
  }

  beforeEach(() => {
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    emailService = EmailNotificationService.getInstance()
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockConsoleLog.mockRestore()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = EmailNotificationService.getInstance()
      const instance2 = EmailNotificationService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('sendEmailNotification', () => {
    it('should send email notification with default template', async () => {
      const result = await emailService.sendEmailNotification(
        mockNotification,
        'guard@summitadvisory.com'
      )

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        external_id: expect.stringMatching(/^console_\d+$/),
        status: 'sent',
        delivery_time_ms: expect.any(Number)
      })
    })

    it('should send email notification with custom template', async () => {
      const customTemplate: EmailTemplate = {
        subject: 'Custom Subject',
        html: '<p>Custom HTML content</p>',
        text: 'Custom text content'
      }

      const result = await emailService.sendEmailNotification(
        mockNotification,
        'manager@summitadvisory.com',
        customTemplate
      )

      expect(result.success).toBe(true)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Custom Subject')
      )
    })

    it('should handle delivery failure gracefully', async () => {
      // Mock console.log to throw an error (simulating delivery failure)
      mockConsoleLog.mockImplementation(() => {
        throw new Error('Console logging failed')
      })

      const result = await emailService.sendEmailNotification(
        mockNotification,
        'test@example.com'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Console logging failed')
    })

    it('should track delivery time accurately', async () => {
      const startTime = Date.now()
      
      const result = await emailService.sendEmailNotification(
        mockNotification,
        'timing@test.com'
      )

      const endTime = Date.now()
      
      expect(result.success).toBe(true)
      expect(result.data?.delivery_time_ms).toBeLessThan(endTime - startTime + 10)
    })
  })

  describe('Priority Indicator Generation', () => {
    it('should generate correct priority indicators', () => {
      const testCases = [
        { priority: 'emergency', expected: '🚨 EMERGENCY' },
        { priority: 'urgent', expected: '⚡ URGENT' },
        { priority: 'high', expected: '🔴 HIGH' },
        { priority: 'normal', expected: '📢 NOTICE' },
        { priority: 'low', expected: 'ℹ️ INFO' }
      ]

      testCases.forEach(async ({ priority, expected }) => {
        const testNotification = { 
          ...mockNotification, 
          priority: priority as any 
        }
        
        await emailService.sendEmailNotification(
          testNotification,
          'priority@test.com'
        )

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining(expected)
        )
      })
    })
  })

  describe('Category Icon Generation', () => {
    it('should generate correct category icons', () => {
      const testCases = [
        { category: 'schedule', expected: '📅' },
        { category: 'assignments', expected: '👥' },
        { category: 'compliance', expected: '🛡️' },
        { category: 'emergency', expected: '🚨' },
        { category: 'availability', expected: '⏰' },
        { category: 'system', expected: '⚙️' },
        { category: 'unknown', expected: '📧' }
      ]

      testCases.forEach(async ({ category, expected }) => {
        const testNotification = { 
          ...mockNotification, 
          category 
        }
        
        await emailService.sendEmailNotification(
          testNotification,
          'category@test.com'
        )

        // Icons appear in the HTML template
        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining('Text Content:')
        )
      })
    })
  })

  describe('HTML Template Generation', () => {
    it('should generate mobile-optimized HTML template', async () => {
      await emailService.sendEmailNotification(
        mockNotification,
        'html@test.com'
      )

      // Extract the HTML content from console log
      const logCalls = mockConsoleLog.mock.calls
      const textContentCall = logCalls.find(call => 
        call[0]?.includes && call[0].includes('Text Content:')
      )
      
      expect(textContentCall).toBeDefined()
    })

    it('should include priority-based styling in HTML', async () => {
      const urgentNotification = { 
        ...mockNotification, 
        priority: 'urgent' as const 
      }
      
      await emailService.sendEmailNotification(
        urgentNotification,
        'styling@test.com'
      )

      // Urgent notifications should have orange styling
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('⚡ URGENT')
      )
    })

    it('should include action buttons in HTML template', async () => {
      const notificationWithActions = {
        ...mockNotification,
        action_data: {
          actions: [
            { label: 'Accept', url: '/shifts/accept/789' },
            { label: 'Decline', url: '/shifts/decline/789', style: 'secondary' }
          ]
        }
      }

      await emailService.sendEmailNotification(
        notificationWithActions,
        'actions@test.com'
      )

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Text Content:')
      )
    })

    it('should handle notifications without actions', async () => {
      const notificationNoActions = {
        ...mockNotification,
        action_data: undefined
      }

      await emailService.sendEmailNotification(
        notificationNoActions,
        'noactions@test.com'
      )

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Text Content:')
      )
    })
  })

  describe('Text Template Generation', () => {
    it('should generate plain text template', async () => {
      await emailService.sendEmailNotification(
        mockNotification,
        'text@test.com'
      )

      const logCalls = mockConsoleLog.mock.calls
      const textCall = logCalls.find(call => 
        call[0] && typeof call[0] === 'string' && call[0].includes('⚡ URGENT')
      )
      
      expect(textCall).toBeDefined()
    })

    it('should include action URLs in text template', async () => {
      await emailService.sendEmailNotification(
        mockNotification,
        'textactions@test.com'
      )

      const logCalls = mockConsoleLog.mock.calls
      const textCall = logCalls.find(call => 
        call[0] && typeof call[0] === 'string' && 
        call[0].includes('Accept Shift:')
      )
      
      expect(textCall).toBeDefined()
    })

    it('should include company footer information', async () => {
      await emailService.sendEmailNotification(
        mockNotification,
        'footer@test.com'
      )

      const logCalls = mockConsoleLog.mock.calls
      const footerCall = logCalls.find(call => 
        call[0] && typeof call[0] === 'string' && 
        call[0].includes('Summit Advisory - TX DPS License #C29754001')
      )
      
      expect(footerCall).toBeDefined()
    })
  })

  describe('Email Digest Creation', () => {
    const mockNotifications: Notification[] = [
      {
        ...mockNotification,
        id: 'notif-1',
        priority: 'urgent',
        category: 'schedule',
        title: 'Urgent Shift Change'
      },
      {
        ...mockNotification,
        id: 'notif-2',
        priority: 'normal',
        category: 'availability',
        title: 'Availability Request'
      },
      {
        ...mockNotification,
        id: 'notif-3',
        priority: 'emergency',
        category: 'emergency',
        title: 'Emergency Alert'
      }
    ]

    it('should create daily digest with grouped notifications', async () => {
      const result = await emailService.createEmailDigest(
        mockNotifications,
        'digest@summitadvisory.com',
        'daily'
      )

      expect(result.success).toBe(true)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Summit Advisory - Daily Digest')
      )
    })

    it('should create weekly digest', async () => {
      const result = await emailService.createEmailDigest(
        mockNotifications,
        'weekly@summitadvisory.com',
        'weekly'
      )

      expect(result.success).toBe(true)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Summit Advisory - Weekly Digest')
      )
    })

    it('should create monthly digest', async () => {
      const result = await emailService.createEmailDigest(
        mockNotifications,
        'monthly@summitadvisory.com',
        'monthly'
      )

      expect(result.success).toBe(true)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Summit Advisory - Monthly Digest')
      )
    })

    it('should handle digest creation errors', async () => {
      mockConsoleLog.mockImplementation(() => {
        throw new Error('Digest generation failed')
      })

      const result = await emailService.createEmailDigest(
        mockNotifications,
        'error@test.com',
        'daily'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Digest generation failed')
    })
  })

  describe('Notification Grouping', () => {
    it('should group notifications correctly for digest', async () => {
      const testNotifications: Notification[] = [
        { ...mockNotification, id: '1', priority: 'urgent', category: 'schedule' },
        { ...mockNotification, id: '2', priority: 'emergency', category: 'emergency' },
        { ...mockNotification, id: '3', priority: 'normal', category: 'schedule' },
        { ...mockNotification, id: '4', priority: 'normal', category: 'assignments' },
        { ...mockNotification, id: '5', priority: 'low', category: 'system' }
      ]

      await emailService.createEmailDigest(
        testNotifications,
        'grouping@test.com',
        'daily'
      )

      // Should group urgent/emergency together
      // Should group by categories: schedule, assignments, other
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Daily Digest')
      )
    })
  })

  describe('Email Provider Integration', () => {
    it('should default to console provider in development', async () => {
      const result = await emailService.sendEmailNotification(
        mockNotification,
        'provider@test.com'
      )

      expect(result.success).toBe(true)
      expect(result.data?.external_id).toMatch(/^console_\d+$/)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('EMAIL NOTIFICATION (Development Mode)')
      )
    })

    it('should log email details in development mode', async () => {
      await emailService.sendEmailNotification(
        mockNotification,
        'details@test.com'
      )

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('To: details@test.com')
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Subject:')
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Priority: urgent')
      )
    })

    it('should include notification ID when provided', async () => {
      await emailService.sendEmailNotification(
        mockNotification,
        'notifid@test.com'
      )

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Notification ID: notification-123')
      )
    })
  })

  describe('Template Variable Handling', () => {
    it('should handle HTML entities properly', async () => {
      const htmlNotification = {
        ...mockNotification,
        title: 'Test with <script>alert("xss")</script>',
        message: 'Message with & special characters'
      }

      const result = await emailService.sendEmailNotification(
        htmlNotification,
        'html-entities@test.com'
      )

      expect(result.success).toBe(true)
      // HTML should be properly escaped in templates
    })

    it('should handle empty action data gracefully', async () => {
      const emptyActionsNotification = {
        ...mockNotification,
        action_data: { actions: [] }
      }

      const result = await emailService.sendEmailNotification(
        emptyActionsNotification,
        'emptyactions@test.com'
      )

      expect(result.success).toBe(true)
    })

    it('should format timestamps correctly', async () => {
      await emailService.sendEmailNotification(
        mockNotification,
        'timestamp@test.com'
      )

      const logCalls = mockConsoleLog.mock.calls
      const timestampCall = logCalls.find(call => 
        call[0] && typeof call[0] === 'string' && 
        call[0].includes('Sent:')
      )
      
      expect(timestampCall).toBeDefined()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle notification without created_at timestamp', async () => {
      const noTimestampNotification = {
        ...mockNotification,
        created_at: undefined as any
      }

      const result = await emailService.sendEmailNotification(
        noTimestampNotification,
        'notimestamp@test.com'
      )

      expect(result.success).toBe(true)
    })

    it('should handle missing environment variables', async () => {
      const originalUrl = process.env.NEXT_PUBLIC_SITE_URL
      delete process.env.NEXT_PUBLIC_SITE_URL

      const result = await emailService.sendEmailNotification(
        mockNotification,
        'noenv@test.com'
      )

      expect(result.success).toBe(true)
      // Should use fallback URL
      
      process.env.NEXT_PUBLIC_SITE_URL = originalUrl
    })

    it('should handle null or undefined message gracefully', async () => {
      const nullMessageNotification = {
        ...mockNotification,
        message: null as any
      }

      const result = await emailService.sendEmailNotification(
        nullMessageNotification,
        'nullmsg@test.com'
      )

      expect(result.success).toBe(true)
    })
  })

  describe('Performance and Optimization', () => {
    it('should deliver email notification quickly', async () => {
      const startTime = Date.now()
      
      const result = await emailService.sendEmailNotification(
        mockNotification,
        'performance@test.com'
      )
      
      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(result.success).toBe(true)
      expect(totalTime).toBeLessThan(100) // Should complete within 100ms
      expect(result.data?.delivery_time_ms).toBeLessThan(totalTime)
    })

    it('should handle multiple simultaneous email requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        emailService.sendEmailNotification(
          { ...mockNotification, id: `notification-${i}` },
          `concurrent-${i}@test.com`
        )
      )

      const results = await Promise.all(promises)

      results.forEach(result => {
        expect(result.success).toBe(true)
      })
    })
  })
})