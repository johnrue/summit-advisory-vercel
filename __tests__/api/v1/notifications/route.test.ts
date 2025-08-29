import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, POST } from '@/app/api/v1/notifications/route'
import { NotificationService } from '@/lib/services/notification-service'
import { NextRequest } from 'next/server'
import type { CreateNotificationRequest, NotificationFilter } from '@/lib/types/notification-types'

// Mock the NotificationService
vi.mock('@/lib/services/notification-service', () => ({
  NotificationService: {
    getInstance: vi.fn()
  }
}))

describe('/api/v1/notifications', () => {
  let mockNotificationService: any

  const mockNotifications = [
    {
      id: 'notification-1',
      recipient_id: 'user-123',
      notification_type: 'shift_assignment',
      priority: 'urgent',
      category: 'schedule',
      title: 'Urgent Shift Assignment',
      message: 'You have been assigned to an urgent shift',
      is_read: false,
      delivery_channels: ['in_app'],
      created_at: '2025-01-15T10:00:00Z'
    },
    {
      id: 'notification-2',
      recipient_id: 'user-123',
      notification_type: 'availability_request',
      priority: 'normal',
      category: 'availability',
      title: 'Availability Request',
      message: 'Please update your availability',
      is_read: true,
      delivery_channels: ['in_app', 'email'],
      created_at: '2025-01-15T09:00:00Z'
    }
  ]

  beforeEach(() => {
    mockNotificationService = {
      getNotifications: vi.fn(),
      createNotification: vi.fn(),
      getNotificationStats: vi.fn(),
      markAsRead: vi.fn(),
      acknowledgeNotification: vi.fn()
    }

    vi.mocked(NotificationService.getInstance).mockReturnValue(mockNotificationService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/v1/notifications', () => {
    it('should return notifications with default filter', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: mockNotifications
      })

      const url = new URL('http://localhost/api/v1/notifications?userId=user-123')
      const request = new NextRequest(url)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockNotifications)
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith('user-123', {})
    })

    it('should apply query parameter filters', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: [mockNotifications[0]]
      })

      const url = new URL('http://localhost/api/v1/notifications')
      url.searchParams.set('userId', 'user-123')
      url.searchParams.set('category', 'schedule,availability')
      url.searchParams.set('priority', 'urgent')
      url.searchParams.set('is_read', 'false')
      url.searchParams.set('limit', '25')
      url.searchParams.set('offset', '10')

      const request = new NextRequest(url)
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const expectedFilter: NotificationFilter = {
        category: ['schedule', 'availability'],
        priority: ['urgent'],
        is_read: false,
        limit: 25,
        offset: 10
      }
      
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith('user-123', expectedFilter)
    })

    it('should apply date range filters', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: mockNotifications
      })

      const url = new URL('http://localhost/api/v1/notifications')
      url.searchParams.set('userId', 'user-123')
      url.searchParams.set('from_date', '2025-01-01T00:00:00Z')
      url.searchParams.set('to_date', '2025-01-31T23:59:59Z')

      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith('user-123', {
        from_date: '2025-01-01T00:00:00Z',
        to_date: '2025-01-31T23:59:59Z'
      })
    })

    it('should return 400 when userId is missing', async () => {
      const url = new URL('http://localhost/api/v1/notifications')
      const request = new NextRequest(url)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('userId is required')
    })

    it('should handle service errors', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: false,
        error: 'Database connection failed',
        code: 'GET_NOTIFICATIONS_FAILED'
      })

      const url = new URL('http://localhost/api/v1/notifications?userId=user-123')
      const request = new NextRequest(url)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Database connection failed')
    })

    it('should handle unexpected exceptions', async () => {
      mockNotificationService.getNotifications.mockRejectedValue(new Error('Network error'))

      const url = new URL('http://localhost/api/v1/notifications?userId=user-123')
      const request = new NextRequest(url)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
    })

    it('should parse boolean parameters correctly', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      const testCases = [
        { value: 'true', expected: true },
        { value: 'false', expected: false },
        { value: '1', expected: true },
        { value: '0', expected: false },
        { value: 'yes', expected: true },
        { value: 'no', expected: false },
        { value: 'invalid', expected: undefined }
      ]

      for (const testCase of testCases) {
        const url = new URL('http://localhost/api/v1/notifications')
        url.searchParams.set('userId', 'user-123')
        url.searchParams.set('is_read', testCase.value)

        const request = new NextRequest(url)
        await GET(request)

        const expectedFilter = testCase.expected !== undefined ? 
          { is_read: testCase.expected } : {}
        
        expect(mockNotificationService.getNotifications).toHaveBeenCalledWith('user-123', expectedFilter)
      }
    })

    it('should parse numeric parameters correctly', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      const url = new URL('http://localhost/api/v1/notifications')
      url.searchParams.set('userId', 'user-123')
      url.searchParams.set('limit', '50')
      url.searchParams.set('offset', '25')

      const request = new NextRequest(url)
      await GET(request)

      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith('user-123', {
        limit: 50,
        offset: 25
      })
    })

    it('should handle invalid numeric parameters', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      const url = new URL('http://localhost/api/v1/notifications')
      url.searchParams.set('userId', 'user-123')
      url.searchParams.set('limit', 'invalid')
      url.searchParams.set('offset', 'also-invalid')

      const request = new NextRequest(url)
      await GET(request)

      // Should ignore invalid numeric parameters
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith('user-123', {})
    })
  })

  describe('POST /api/v1/notifications', () => {
    const validCreateRequest: CreateNotificationRequest = {
      recipient_id: 'user-456',
      notification_type: 'shift_assignment',
      priority: 'normal',
      category: 'schedule',
      title: 'New Shift Assignment',
      message: 'You have been assigned to a new shift',
      delivery_channels: ['in_app', 'email'],
      entity_type: 'shift',
      entity_id: 'shift-789'
    }

    it('should create notification with valid request', async () => {
      const createdNotification = {
        id: 'new-notification-123',
        ...validCreateRequest,
        is_read: false,
        created_at: '2025-01-15T12:00:00Z'
      }

      mockNotificationService.createNotification.mockResolvedValue({
        success: true,
        data: createdNotification
      })

      const request = new NextRequest('http://localhost/api/v1/notifications', {
        method: 'POST',
        body: JSON.stringify(validCreateRequest),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(createdNotification)
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(validCreateRequest)
    })

    it('should validate required fields', async () => {
      const invalidRequest = {
        recipient_id: 'user-456',
        // Missing required fields
      }

      const request = new NextRequest('http://localhost/api/v1/notifications', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('validation failed')
    })

    it('should validate enum values', async () => {
      const invalidEnumRequest = {
        ...validCreateRequest,
        priority: 'invalid-priority',
        category: 'invalid-category'
      }

      const request = new NextRequest('http://localhost/api/v1/notifications', {
        method: 'POST',
        body: JSON.stringify(invalidEnumRequest),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid enum value')
    })

    it('should validate delivery channels array', async () => {
      const invalidChannelsRequest = {
        ...validCreateRequest,
        delivery_channels: ['invalid-channel']
      }

      const request = new NextRequest('http://localhost/api/v1/notifications', {
        method: 'POST',
        body: JSON.stringify(invalidChannelsRequest),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid enum value')
    })

    it('should handle service creation errors', async () => {
      mockNotificationService.createNotification.mockResolvedValue({
        success: false,
        error: 'Database constraint violation',
        code: 'CREATE_NOTIFICATION_FAILED'
      })

      const request = new NextRequest('http://localhost/api/v1/notifications', {
        method: 'POST',
        body: JSON.stringify(validCreateRequest),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Database constraint violation')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost/api/v1/notifications', {
        method: 'POST',
        body: 'invalid-json{',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid JSON')
    })

    it('should handle missing Content-Type header', async () => {
      const request = new NextRequest('http://localhost/api/v1/notifications', {
        method: 'POST',
        body: JSON.stringify(validCreateRequest)
        // No Content-Type header
      })

      const response = await POST(request)
      const data = await response.json()

      // Should still work with valid JSON
      expect(response.status).toBe(201)
    })

    it('should trim and sanitize string inputs', async () => {
      const requestWithWhitespace = {
        ...validCreateRequest,
        title: '  Shift Assignment  ',
        message: '  You have been assigned to a new shift  '
      }

      const createdNotification = {
        id: 'new-notification-123',
        ...validCreateRequest,
        title: 'Shift Assignment',
        message: 'You have been assigned to a new shift',
        is_read: false,
        created_at: '2025-01-15T12:00:00Z'
      }

      mockNotificationService.createNotification.mockResolvedValue({
        success: true,
        data: createdNotification
      })

      const request = new NextRequest('http://localhost/api/v1/notifications', {
        method: 'POST',
        body: JSON.stringify(requestWithWhitespace),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Shift Assignment',
          message: 'You have been assigned to a new shift'
        })
      )
    })

    it('should validate action_data structure when provided', async () => {
      const requestWithActions = {
        ...validCreateRequest,
        action_data: {
          actions: [
            { label: 'Accept', url: '/shifts/accept/789' },
            { label: 'Decline', url: '/shifts/decline/789' }
          ]
        }
      }

      const createdNotification = {
        id: 'new-notification-123',
        ...requestWithActions,
        is_read: false,
        created_at: '2025-01-15T12:00:00Z'
      }

      mockNotificationService.createNotification.mockResolvedValue({
        success: true,
        data: createdNotification
      })

      const request = new NextRequest('http://localhost/api/v1/notifications', {
        method: 'POST',
        body: JSON.stringify(requestWithActions),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.action_data.actions).toHaveLength(2)
    })

    it('should set default delivery channels when not provided', async () => {
      const requestWithoutChannels = {
        ...validCreateRequest,
        delivery_channels: undefined
      }

      const createdNotification = {
        id: 'new-notification-123',
        ...validCreateRequest,
        delivery_channels: ['in_app'],
        is_read: false,
        created_at: '2025-01-15T12:00:00Z'
      }

      mockNotificationService.createNotification.mockResolvedValue({
        success: true,
        data: createdNotification
      })

      const request = new NextRequest('http://localhost/api/v1/notifications', {
        method: 'POST',
        body: JSON.stringify(requestWithoutChannels),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          delivery_channels: ['in_app']
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle service unavailable errors', async () => {
      vi.mocked(NotificationService.getInstance).mockImplementation(() => {
        throw new Error('Service unavailable')
      })

      const url = new URL('http://localhost/api/v1/notifications?userId=user-123')
      const request = new NextRequest(url)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle timeout errors', async () => {
      mockNotificationService.getNotifications.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )

      const url = new URL('http://localhost/api/v1/notifications?userId=user-123')
      const request = new NextRequest(url)

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('Response Headers', () => {
    it('should set proper Content-Type header', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      const url = new URL('http://localhost/api/v1/notifications?userId=user-123')
      const request = new NextRequest(url)

      const response = await GET(request)

      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should set CORS headers for API access', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      const url = new URL('http://localhost/api/v1/notifications?userId=user-123')
      const request = new NextRequest(url, {
        headers: {
          'Origin': 'https://summitadvisoryfirm.com'
        }
      })

      const response = await GET(request)

      // Verify CORS headers are set appropriately
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
    })
  })
})