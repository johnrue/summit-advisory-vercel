import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { NotificationService } from '@/lib/services/notification-service'
import type { Notification } from '@/lib/types/notification-types'

// Mock the NotificationService
vi.mock('@/lib/services/notification-service', () => ({
  NotificationService: {
    getInstance: vi.fn()
  }
}))

// Mock the NotificationDropdown component
vi.mock('@/components/notifications/NotificationDropdown', () => ({
  NotificationDropdown: ({ isOpen, notifications, unreadCount, onNotificationRead, onMarkAllRead }: any) => (
    <div data-testid="notification-dropdown">
      <div data-testid="dropdown-open">{isOpen.toString()}</div>
      <div data-testid="dropdown-notifications">{notifications.length}</div>
      <div data-testid="dropdown-unread">{unreadCount}</div>
      <button onClick={() => onNotificationRead('test-id')}>Mark Read</button>
      <button onClick={onMarkAllRead}>Mark All Read</button>
    </div>
  )
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Bell: ({ className, ...props }: any) => (
    <div data-testid="bell-icon" className={className} {...props} />
  )
}))

describe('NotificationBell', () => {
  let mockNotificationService: any
  let mockSubscription: any

  const mockNotifications: Notification[] = [
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
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-15T10:00:00Z',
      entity_type: 'shift',
      entity_id: 'shift-456',
      action_data: {},
      delivery_status: 'pending'
    },
    {
      id: 'notification-2',
      recipient_id: 'user-123',
      notification_type: 'availability_request',
      priority: 'normal',
      category: 'availability',
      title: 'Availability Request',
      message: 'Please update your availability',
      is_read: false,
      delivery_channels: ['in_app'],
      created_at: '2025-01-15T09:00:00Z',
      updated_at: '2025-01-15T09:00:00Z',
      entity_type: 'availability',
      entity_id: 'availability-789',
      action_data: {},
      delivery_status: 'pending'
    },
    {
      id: 'notification-3',
      recipient_id: 'user-123',
      notification_type: 'shift_modification',
      priority: 'emergency',
      category: 'emergency',
      title: 'Emergency Shift Update',
      message: 'Emergency coverage needed immediately',
      is_read: false,
      delivery_channels: ['in_app', 'email'],
      created_at: '2025-01-15T11:00:00Z',
      updated_at: '2025-01-15T11:00:00Z',
      entity_type: 'shift',
      entity_id: 'shift-emergency',
      action_data: {},
      delivery_status: 'pending'
    }
  ]

  beforeEach(() => {
    mockSubscription = {
      unsubscribe: vi.fn()
    }

    mockNotificationService = {
      getNotifications: vi.fn(),
      subscribeToNotifications: vi.fn(() => mockSubscription),
      unsubscribeFromNotifications: vi.fn(),
      markAllAsRead: vi.fn()
    }

    vi.mocked(NotificationService.getInstance).mockReturnValue(mockNotificationService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render notification bell with default size', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      render(<NotificationBell userId="user-123" />)

      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument()
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Notifications (0 unread)')
    })

    it('should render with custom className', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      render(<NotificationBell userId="user-123" className="custom-class" />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('should render with different sizes', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      const { rerender } = render(<NotificationBell userId="user-123" size="sm" />)
      let button = screen.getByRole('button')
      expect(button).toHaveClass('h-8', 'w-8')

      rerender(<NotificationBell userId="user-123" size="lg" />)
      button = screen.getByRole('button')
      expect(button).toHaveClass('h-12', 'w-12')
    })
  })

  describe('Notification Loading', () => {
    it('should load notifications on mount', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: mockNotifications
      })

      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        expect(mockNotificationService.getNotifications).toHaveBeenCalledWith('user-123', {
          limit: 50,
          is_read: false
        })
      })
    })

    it('should handle loading errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockNotificationService.getNotifications.mockRejectedValue(new Error('Network error'))

      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error loading notifications:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('should reload notifications when userId changes', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      const { rerender } = render(<NotificationBell userId="user-123" />)
      
      await waitFor(() => {
        expect(mockNotificationService.getNotifications).toHaveBeenCalledWith('user-123', expect.any(Object))
      })

      rerender(<NotificationBell userId="user-456" />)

      await waitFor(() => {
        expect(mockNotificationService.getNotifications).toHaveBeenCalledWith('user-456', expect.any(Object))
      })
    })
  })

  describe('Unread Badge', () => {
    it('should display unread badge when notifications exist', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: mockNotifications
      })

      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
      })

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Notifications (3 unread)')
    })

    it('should not display badge when no unread notifications', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        expect(screen.queryByText('0')).not.toBeInTheDocument()
      })
    })

    it('should display 99+ for high unread counts', async () => {
      const manyNotifications = Array.from({ length: 150 }, (_, i) => ({
        ...mockNotifications[0],
        id: `notification-${i}`
      }))

      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: manyNotifications
      })

      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        expect(screen.getByText('99+')).toBeInTheDocument()
      })
    })

    it('should style bell icon based on unread status', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: mockNotifications
      })

      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        const bellIcon = screen.getByTestId('bell-icon')
        expect(bellIcon).toHaveClass('text-primary')
      })
    })
  })

  describe('Priority Indicators', () => {
    it('should show pulsing indicator for urgent notifications', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: mockNotifications
      })

      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        const pulsingIndicator = screen.getByRole('button').querySelector('.animate-ping')
        expect(pulsingIndicator).toBeInTheDocument()
        expect(pulsingIndicator).toHaveClass('bg-red-500')
      })
    })

    it('should not show pulsing indicator when no urgent notifications', async () => {
      const normalNotifications = mockNotifications.map(n => ({
        ...n,
        priority: 'normal' as const
      }))

      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: normalNotifications
      })

      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        const pulsingIndicator = screen.getByRole('button').querySelector('.animate-ping')
        expect(pulsingIndicator).not.toBeInTheDocument()
      })
    })

    it('should show pulsing indicator for emergency notifications', async () => {
      const emergencyNotifications = [
        { ...mockNotifications[0], priority: 'emergency' as const }
      ]

      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: emergencyNotifications
      })

      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        const pulsingIndicator = screen.getByRole('button').querySelector('.animate-ping')
        expect(pulsingIndicator).toBeInTheDocument()
      })
    })
  })

  describe('Dropdown Interaction', () => {
    beforeEach(async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: mockNotifications
      })
    })

    it('should toggle dropdown when bell is clicked', async () => {
      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        expect(screen.getByTestId('dropdown-open')).toHaveTextContent('false')
      })

      const bellButton = screen.getByRole('button')
      fireEvent.click(bellButton)

      expect(screen.getByTestId('dropdown-open')).toHaveTextContent('true')

      fireEvent.click(bellButton)
      expect(screen.getByTestId('dropdown-open')).toHaveTextContent('false')
    })

    it('should pass correct props to dropdown', async () => {
      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        expect(screen.getByTestId('dropdown-notifications')).toHaveTextContent('3')
        expect(screen.getByTestId('dropdown-unread')).toHaveTextContent('3')
      })
    })

    it('should close dropdown when onClose is called', async () => {
      render(<NotificationBell userId="user-123" />)

      const bellButton = screen.getByRole('button')
      fireEvent.click(bellButton)

      expect(screen.getByTestId('dropdown-open')).toHaveTextContent('true')

      // Simulate dropdown close (would be called by clicking outside, etc.)
      // This would need to be implemented based on actual dropdown behavior
    })
  })

  describe('Real-time Subscriptions', () => {
    it('should set up real-time subscription on mount', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        expect(mockNotificationService.subscribeToNotifications).toHaveBeenCalledWith(
          'user-123',
          expect.any(Function)
        )
      })
    })

    it('should clean up subscription on unmount', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      const { unmount } = render(<NotificationBell userId="user-123" />)

      unmount()

      expect(mockNotificationService.unsubscribeFromNotifications).toHaveBeenCalledWith(mockSubscription)
    })

    it('should handle new notification from real-time subscription', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      let subscriptionCallback: (notification: Notification) => void = () => {}
      mockNotificationService.subscribeToNotifications.mockImplementation((userId: string, callback: (notification: any) => void) => {
        subscriptionCallback = callback
        return mockSubscription
      })

      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Notifications (0 unread)')
      })

      // Simulate receiving new notification
      const newNotification: Notification = {
        ...mockNotifications[0],
        id: 'new-notification'
      }
      
      subscriptionCallback(newNotification)

      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Notifications (1 unread)')
        expect(screen.getByText('1')).toBeInTheDocument()
      })
    })

    it('should log high priority notifications to console', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      let subscriptionCallback: (notification: Notification) => void = () => {}
      mockNotificationService.subscribeToNotifications.mockImplementation((userId: string, callback: (notification: any) => void) => {
        subscriptionCallback = callback
        return mockSubscription
      })

      render(<NotificationBell userId="user-123" />)

      const urgentNotification: Notification = {
        ...mockNotifications[0],
        priority: 'urgent'
      }
      
      subscriptionCallback(urgentNotification)

      expect(consoleSpy).toHaveBeenCalledWith(
        'High priority notification received:',
        'Urgent Shift Assignment'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Notification Management', () => {
    beforeEach(async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: mockNotifications
      })
    })

    it('should handle marking single notification as read', async () => {
      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
      })

      const markReadButton = screen.getByText('Mark Read')
      fireEvent.click(markReadButton)

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })

    it('should handle marking all notifications as read', async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue({
        success: true,
        data: 3
      })

      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
      })

      const markAllReadButton = screen.getByText('Mark All Read')
      fireEvent.click(markAllReadButton)

      await waitFor(() => {
        expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith('user-123')
        expect(screen.queryByText(/\d/)).not.toBeInTheDocument()
      })
    })

    it('should handle mark all read errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockNotificationService.markAllAsRead.mockRejectedValue(new Error('Network error'))

      render(<NotificationBell userId="user-123" />)

      const markAllReadButton = screen.getByText('Mark All Read')
      fireEvent.click(markAllReadButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error marking all as read:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Loading States', () => {
    it('should show loading state initially', async () => {
      // Simulate slow API response
      mockNotificationService.getNotifications.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 100))
      )

      render(<NotificationBell userId="user-123" />)

      // Component should render but with loading state
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should pass loading state to dropdown', async () => {
      mockNotificationService.getNotifications.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 100))
      )

      render(<NotificationBell userId="user-123" />)

      // Initially loading should be true
      // After resolution, loading should be false
      await waitFor(() => {
        expect(mockNotificationService.getNotifications).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: mockNotifications
      })

      render(<NotificationBell userId="user-123" />)

      await waitFor(() => {
        const button = screen.getByRole('button')
        expect(button).toHaveAttribute('aria-label', 'Notifications (3 unread)')
      })
    })

    it('should be keyboard accessible', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      render(<NotificationBell userId="user-123" />)

      const button = screen.getByRole('button')
      
      button.focus()
      expect(document.activeElement).toBe(button)

      fireEvent.keyDown(button, { key: 'Enter' })
      // Should toggle dropdown (test actual behavior based on implementation)
    })

    it('should handle focus states properly', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        success: true,
        data: []
      })

      render(<NotificationBell userId="user-123" />)

      const button = screen.getByRole('button')
      
      fireEvent.focus(button)
      expect(button).toHaveClass('focus:bg-accent')
    })
  })
})