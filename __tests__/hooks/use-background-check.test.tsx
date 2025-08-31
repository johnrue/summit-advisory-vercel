import { renderHook, act, waitFor } from '@testing-library/react'
import { useBackgroundCheck } from '@/hooks/use-background-check'
import type { BackgroundCheckUpdate } from '@/lib/types/background-check'

// Mock the services
jest.mock('@/lib/services/background-check-service')
jest.mock('@/lib/services/background-check-notification-service')
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

describe('useBackgroundCheck', () => {
  const mockBackgroundCheckService = {
    getBackgroundCheckData: jest.fn(),
    updateStatus: jest.fn(),
    getAuditTrail: jest.fn()
  }

  const mockNotificationService = {
    sendStatusChangeNotification: jest.fn(),
    scheduleExpiryReminders: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock the service constructors
    require('@/lib/services/background-check-service').BackgroundCheckService.mockImplementation(
      () => mockBackgroundCheckService
    )
    require('@/lib/services/background-check-notification-service').BackgroundCheckNotificationService.mockImplementation(
      () => mockNotificationService
    )
  })

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useBackgroundCheck({
      applicationId: 'app-123'
    }))

    expect(result.current.backgroundCheckData).toBeNull()
    expect(result.current.auditTrail).toEqual([])
    expect(result.current.expiryAlerts).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isUpdating).toBe(false)
  })

  it('should load background check data on mount', async () => {
    const mockData = {
      status: 'complete',
      date: new Date(),
      vendorConfirmationNumber: 'ABC123',
      auditTrail: []
    }

    mockBackgroundCheckService.getBackgroundCheckData.mockResolvedValue({
      success: true,
      data: mockData
    })

    const { result } = renderHook(() => useBackgroundCheck({
      applicationId: 'app-123'
    }))

    await waitFor(() => {
      expect(result.current.backgroundCheckData).toEqual(mockData)
    })

    expect(mockBackgroundCheckService.getBackgroundCheckData).toHaveBeenCalledWith('app-123')
  })

  it('should validate status transitions correctly', () => {
    const { result } = renderHook(() => useBackgroundCheck())

    // Test valid transitions
    expect(result.current.validateStatusTransition('pending', 'in_progress')).toBe(true)
    expect(result.current.validateStatusTransition('in_progress', 'complete')).toBe(true)
    expect(result.current.validateStatusTransition('complete', 'expired')).toBe(true)

    // Test invalid transitions
    expect(result.current.validateStatusTransition('complete', 'pending')).toBe(false)
    expect(result.current.validateStatusTransition('pending', 'complete')).toBe(false)
  })

  it('should return correct next valid statuses', () => {
    const { result } = renderHook(() => useBackgroundCheck())

    const validFromPending = result.current.getValidNextStatuses('pending')
    expect(validFromPending).toEqual(['in_progress', 'cancelled'])

    const validFromInProgress = result.current.getValidNextStatuses('in_progress')
    expect(validFromInProgress).toEqual(['complete', 'failed', 'cancelled'])

    const validFromComplete = result.current.getValidNextStatuses('complete')
    expect(validFromComplete).toEqual(['expired'])
  })

  it('should handle status updates with notifications', async () => {
    mockBackgroundCheckService.updateStatus.mockResolvedValue({
      success: true,
      data: { id: 'audit-123' }
    })

    mockBackgroundCheckService.getBackgroundCheckData.mockResolvedValue({
      success: true,
      data: { status: 'complete', auditTrail: [] }
    })

    mockNotificationService.sendStatusChangeNotification.mockResolvedValue({
      success: true
    })

    const { result } = renderHook(() => useBackgroundCheck({
      applicationId: 'app-123'
    }))

    const update: BackgroundCheckUpdate = {
      status: 'complete',
      notes: 'Background check completed',
      approverSignature: 'John Manager'
    }

    await act(async () => {
      const updateResult = await result.current.updateStatus(update, 'user-123')
      expect(updateResult.success).toBe(true)
    })

    expect(mockBackgroundCheckService.updateStatus).toHaveBeenCalledWith('app-123', update, 'user-123')
    expect(mockNotificationService.sendStatusChangeNotification).toHaveBeenCalled()
  })
})