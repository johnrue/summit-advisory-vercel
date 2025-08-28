import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NotificationService } from '@/lib/services/notification-service'
import { createClient } from '@/lib/supabase'
import type { 
  Notification, 
  CreateNotificationRequest, 
  NotificationFilter,
  NotificationStats 
} from '@/lib/types/notification-types'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn()
}))

describe('NotificationService', () => {
  let notificationService: NotificationService
  let mockSupabase: any
  let mockSubscription: any

  const mockNotification: Notification = {
    id: 'test-notification-id',
    recipient_id: 'user-123',
    notification_type: 'shift_assignment',
    priority: 'normal',
    category: 'schedule',
    title: 'Shift Assignment',
    message: 'You have been assigned to a new shift',
    is_read: false,
    delivery_channels: ['in_app'],
    created_at: '2025-01-15T10:00:00Z',
    entity_type: 'shift',
    entity_id: 'shift-456'
  }

  const mockCreateRequest: CreateNotificationRequest = {
    recipient_id: 'user-123',
    notification_type: 'shift_assignment',
    priority: 'normal',
    category: 'schedule',
    title: 'New Shift Assignment',
    message: 'You have been assigned to morning shift',
    delivery_channels: ['in_app', 'email'],
    entity_type: 'shift',
    entity_id: 'shift-789'
  }

  beforeEach(() => {
    mockSubscription = {
      unsubscribe: vi.fn()
    }

    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      insert: vi.fn(() => mockSupabase),
      update: vi.fn(() => mockSupabase),
      delete: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      single: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      in: vi.fn(() => mockSupabase),
      gte: vi.fn(() => mockSupabase),
      lte: vi.fn(() => mockSupabase),
      lt: vi.fn(() => mockSupabase),
      order: vi.fn(() => mockSupabase),
      limit: vi.fn(() => mockSupabase),
      range: vi.fn(() => mockSupabase),
      channel: vi.fn(() => ({
        on: vi.fn(() => ({
          subscribe: vi.fn(() => mockSubscription)
        }))
      })),
      removeChannel: vi.fn()
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase)
    notificationService = NotificationService.getInstance()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NotificationService.getInstance()
      const instance2 = NotificationService.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('createNotification', () => {
    it('should create notification with default delivery channels', async () => {
      mockSupabase.single.mockResolvedValue({ 
        data: mockNotification, 
        error: null 
      })

      const result = await notificationService.createNotification({
        ...mockCreateRequest,
        delivery_channels: undefined
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        ...mockCreateRequest,
        delivery_channels: ['in_app']
      })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockNotification)
    })

    it('should create notification with specified delivery channels', async () => {
      mockSupabase.single.mockResolvedValue({ 
        data: mockNotification, 
        error: null 
      })

      const result = await notificationService.createNotification(mockCreateRequest)

      expect(mockSupabase.insert).toHaveBeenCalledWith(mockCreateRequest)
      expect(result.success).toBe(true)
    })

    it('should handle database errors during creation', async () => {
      const dbError = { message: 'Database connection failed' }
      mockSupabase.single.mockResolvedValue({ 
        data: null, 
        error: dbError 
      })

      const result = await notificationService.createNotification(mockCreateRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
      expect(result.code).toBe('CREATE_NOTIFICATION_FAILED')
    })

    it('should handle unexpected exceptions during creation', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Network error'))

      const result = await notificationService.createNotification(mockCreateRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
      expect(result.code).toBe('CREATE_NOTIFICATION_ERROR')
    })
  })

  describe('getNotifications', () => {
    const mockNotifications = [mockNotification, { ...mockNotification, id: 'test-2' }]

    it('should get notifications with default filter', async () => {
      mockSupabase.mockResolvedValue({ 
        data: mockNotifications, 
        error: null 
      })

      const result = await notificationService.getNotifications('user-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('recipient_id', 'user-123')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockNotifications)
    })

    it('should apply category filter', async () => {
      mockSupabase.mockResolvedValue({ 
        data: mockNotifications, 
        error: null 
      })

      const filter: NotificationFilter = {
        category: ['schedule', 'availability']
      }

      await notificationService.getNotifications('user-123', filter)

      expect(mockSupabase.in).toHaveBeenCalledWith('category', ['schedule', 'availability'])
    })

    it('should apply priority filter', async () => {
      mockSupabase.mockResolvedValue({ 
        data: mockNotifications, 
        error: null 
      })

      const filter: NotificationFilter = {
        priority: ['urgent', 'emergency']
      }

      await notificationService.getNotifications('user-123', filter)

      expect(mockSupabase.in).toHaveBeenCalledWith('priority', ['urgent', 'emergency'])
    })

    it('should apply read status filter', async () => {
      mockSupabase.mockResolvedValue({ 
        data: mockNotifications, 
        error: null 
      })

      const filter: NotificationFilter = {
        is_read: false
      }

      await notificationService.getNotifications('user-123', filter)

      expect(mockSupabase.eq).toHaveBeenCalledWith('is_read', false)
    })

    it('should apply date range filters', async () => {
      mockSupabase.mockResolvedValue({ 
        data: mockNotifications, 
        error: null 
      })

      const filter: NotificationFilter = {
        from_date: '2025-01-01T00:00:00Z',
        to_date: '2025-01-31T23:59:59Z'
      }

      await notificationService.getNotifications('user-123', filter)

      expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', '2025-01-01T00:00:00Z')
      expect(mockSupabase.lte).toHaveBeenCalledWith('created_at', '2025-01-31T23:59:59Z')
    })

    it('should apply pagination filters', async () => {
      mockSupabase.mockResolvedValue({ 
        data: mockNotifications, 
        error: null 
      })

      const filter: NotificationFilter = {
        limit: 25,
        offset: 50
      }

      await notificationService.getNotifications('user-123', filter)

      expect(mockSupabase.limit).toHaveBeenCalledWith(25)
      expect(mockSupabase.range).toHaveBeenCalledWith(50, 74)
    })

    it('should handle database errors during retrieval', async () => {
      const dbError = { message: 'Query timeout' }
      mockSupabase.mockResolvedValue({ 
        data: null, 
        error: dbError 
      })

      const result = await notificationService.getNotifications('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Query timeout')
      expect(result.code).toBe('GET_NOTIFICATIONS_FAILED')
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read with timestamp', async () => {
      const updatedNotification = { ...mockNotification, is_read: true }
      mockSupabase.single.mockResolvedValue({ 
        data: updatedNotification, 
        error: null 
      })

      const result = await notificationService.markAsRead('test-notification-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_read: true,
          read_at: expect.any(String)
        })
      )
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'test-notification-id')
      expect(result.success).toBe(true)
      expect(result.data).toEqual(updatedNotification)
    })

    it('should handle errors when marking as read', async () => {
      const dbError = { message: 'Notification not found' }
      mockSupabase.single.mockResolvedValue({ 
        data: null, 
        error: dbError 
      })

      const result = await notificationService.markAsRead('invalid-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Notification not found')
      expect(result.code).toBe('MARK_READ_FAILED')
    })
  })

  describe('acknowledgeNotification', () => {
    it('should acknowledge notification with timestamp', async () => {
      const acknowledgedNotification = { 
        ...mockNotification, 
        acknowledged_at: '2025-01-15T10:30:00Z' 
      }
      mockSupabase.single.mockResolvedValue({ 
        data: acknowledgedNotification, 
        error: null 
      })

      const result = await notificationService.acknowledgeNotification('test-notification-id')

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          acknowledged_at: expect.any(String)
        })
      )
      expect(result.success).toBe(true)
      expect(result.data).toEqual(acknowledgedNotification)
    })
  })

  describe('getNotificationStats', () => {
    const mockStatsData = [
      { category: 'schedule', priority: 'normal', is_read: false },
      { category: 'schedule', priority: 'urgent', is_read: true },
      { category: 'availability', priority: 'normal', is_read: false },
      { category: 'emergency', priority: 'emergency', is_read: false }
    ]

    it('should calculate notification statistics correctly', async () => {
      mockSupabase.mockResolvedValue({ 
        data: mockStatsData, 
        error: null 
      })

      const result = await notificationService.getNotificationStats('user-123')

      expect(mockSupabase.select).toHaveBeenCalledWith('category, priority, is_read')
      expect(result.success).toBe(true)
      
      const stats = result.data as NotificationStats
      expect(stats.total_count).toBe(4)
      expect(stats.unread_count).toBe(3)
      expect(stats.urgent_count).toBe(1)
      expect(stats.emergency_count).toBe(1)
      expect(stats.categories.schedule).toBe(2)
      expect(stats.categories.availability).toBe(1)
      expect(stats.categories.emergency).toBe(1)
      expect(stats.priorities.normal).toBe(2)
      expect(stats.priorities.urgent).toBe(1)
      expect(stats.priorities.emergency).toBe(1)
    })
  })

  describe('Real-time Subscriptions', () => {
    it('should create real-time subscription with correct channel and filter', () => {
      const mockCallback = vi.fn()
      
      notificationService.subscribeToNotifications('user-123', mockCallback)

      expect(mockSupabase.channel).toHaveBeenCalledWith('notifications:user-123')
    })

    it('should unsubscribe from real-time notifications', () => {
      notificationService.unsubscribeFromNotifications(mockSubscription)

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockSubscription)
    })

    it('should handle real-time notification callback', () => {
      const mockCallback = vi.fn()
      let subscriptionCallback: (payload: any) => void
      
      const mockChannel = {
        on: vi.fn((event, config, callback) => {
          subscriptionCallback = callback
          return { subscribe: vi.fn(() => mockSubscription) }
        })
      }
      mockSupabase.channel.mockReturnValue(mockChannel)

      notificationService.subscribeToNotifications('user-123', mockCallback)

      // Simulate real-time notification
      const payload = { new: mockNotification }
      subscriptionCallback!(payload)

      expect(mockCallback).toHaveBeenCalledWith(mockNotification)
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      const mockUpdateData = [{ id: '1' }, { id: '2' }]
      mockSupabase.mockResolvedValue({ 
        data: mockUpdateData, 
        error: null 
      })

      const result = await notificationService.markAllAsRead('user-123')

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_read: true,
          read_at: expect.any(String)
        })
      )
      expect(mockSupabase.eq).toHaveBeenNthCalledWith(1, 'recipient_id', 'user-123')
      expect(mockSupabase.eq).toHaveBeenNthCalledWith(2, 'is_read', false)
      expect(result.success).toBe(true)
      expect(result.data).toBe(2)
    })
  })

  describe('cleanupExpiredNotifications', () => {
    it('should delete expired notifications', async () => {
      const mockDeletedData = [{ id: '1' }, { id: '2' }]
      mockSupabase.mockResolvedValue({ 
        data: mockDeletedData, 
        error: null 
      })

      const result = await notificationService.cleanupExpiredNotifications()

      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.lt).toHaveBeenCalledWith('expires_at', expect.any(String))
      expect(result.success).toBe(true)
      expect(result.data).toBe(2)
    })
  })

  describe('createFromTemplate', () => {
    const mockTemplate = {
      id: 'template-1',
      name: 'shift_assignment',
      type: 'shift_assignment',
      category: 'schedule',
      default_priority: 'normal' as const,
      title_template: 'New {{shiftType}} Shift Assignment',
      message_template: 'You are assigned to {{location}} on {{date}}',
      default_channels: ['in_app', 'email'] as const,
      action_template: [
        { label: 'Accept', url: '/shifts/accept/{{shiftId}}' },
        { label: 'Decline', url: '/shifts/decline/{{shiftId}}' }
      ],
      created_at: '2025-01-15T09:00:00Z',
      updated_at: '2025-01-15T09:00:00Z'
    }

    const templateVariables = {
      shiftType: 'Morning',
      location: 'Downtown Office',
      date: 'January 20, 2025',
      shiftId: 'shift-789'
    }

    it('should create notification from template with variable interpolation', async () => {
      mockSupabase.single.mockResolvedValue({ 
        data: mockNotification, 
        error: null 
      })

      const result = await notificationService.createFromTemplate(
        mockTemplate,
        templateVariables,
        'user-123',
        'shift',
        'shift-789'
      )

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_id: 'user-123',
          notification_type: 'shift_assignment',
          priority: 'normal',
          category: 'schedule',
          title: 'New Morning Shift Assignment',
          message: 'You are assigned to Downtown Office on January 20, 2025',
          delivery_channels: ['in_app', 'email'],
          entity_type: 'shift',
          entity_id: 'shift-789',
          action_data: { 
            actions: mockTemplate.action_template
          }
        })
      )
      expect(result.success).toBe(true)
    })

    it('should handle missing template variables gracefully', async () => {
      mockSupabase.single.mockResolvedValue({ 
        data: mockNotification, 
        error: null 
      })

      const partialVariables = {
        shiftType: 'Evening'
        // Missing location and date variables
      }

      const result = await notificationService.createFromTemplate(
        mockTemplate,
        partialVariables,
        'user-123'
      )

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Evening Shift Assignment',
          message: 'You are assigned to {{location}} on {{date}}'
        })
      )
      expect(result.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle non-Error exceptions consistently', async () => {
      mockSupabase.single.mockRejectedValue('String error')

      const result = await notificationService.createNotification(mockCreateRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
      expect(result.code).toBe('CREATE_NOTIFICATION_ERROR')
    })

    it('should return empty array when data is null', async () => {
      mockSupabase.mockResolvedValue({ 
        data: null, 
        error: null 
      })

      const result = await notificationService.getNotifications('user-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })
  })
})