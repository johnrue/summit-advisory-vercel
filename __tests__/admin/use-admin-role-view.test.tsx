import { renderHook, act, waitFor } from '@testing-library/react'
import { useAdminRoleView } from '@/hooks/use-admin-role-view'
import { useAuth } from '@/lib/auth/auth-context'
import { useUserRole } from '@/hooks/use-user-role'
import { adminRoleViewService } from '@/lib/admin/role-view-service'

// Mock dependencies
jest.mock('@/lib/auth/auth-context')
jest.mock('@/hooks/use-user-role')
jest.mock('@/lib/admin/role-view-service')

// Mock fetch for API calls
global.fetch = jest.fn()

describe('useAdminRoleView', () => {
  const mockUser = {
    id: 'admin-user-id',
    email: 'admin@example.com'
  }

  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
  const mockUseUserRole = useUserRole as jest.MockedFunction<typeof useUserRole>
  const mockAdminRoleViewService = adminRoleViewService as jest.Mocked<typeof adminRoleViewService>

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      signOut: jest.fn(),
      signIn: jest.fn(),
      isLoading: false,
      error: null
    } as any)

    // Mock fetch to return successful responses
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })
  })

  describe('admin user', () => {
    beforeEach(() => {
      mockUseUserRole.mockReturnValue({ role: 'admin', isLoading: false, error: null })
      
      mockAdminRoleViewService.getCurrentViewRole.mockReturnValue('admin')
      mockAdminRoleViewService.getAvailableViewRoles.mockReturnValue(['admin', 'manager', 'guard'])
      mockAdminRoleViewService.isViewingSwitchedRole.mockReturnValue(false)
      mockAdminRoleViewService.getPreferences.mockReturnValue({
        rememberLastView: false,
        viewSwitchHistory: []
      })
    })

    it('should initialize with admin capabilities', () => {
      const { result } = renderHook(() => useAdminRoleView())

      expect(result.current.canSwitchRoleViews).toBe(true)
      expect(result.current.currentViewRole).toBe('admin')
      expect(result.current.adminUser.email).toBe('admin@example.com')
      expect(result.current.availableViewRoles).toEqual(['admin', 'manager', 'guard'])
    })

    it('should switch to manager view successfully', async () => {
      mockAdminRoleViewService.switchRoleView.mockReturnValue({
        success: true,
        currentViewRole: 'manager',
        adminRole: 'admin'
      })

      const { result } = renderHook(() => useAdminRoleView())

      await act(async () => {
        const response = await result.current.switchToRoleView('manager')
        expect(response.success).toBe(true)
        expect(response.currentViewRole).toBe('manager')
      })

      expect(mockAdminRoleViewService.switchRoleView).toHaveBeenCalledWith('admin', 'manager', false)
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/admin/role-view/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetViewRole: 'manager',
          persistPreference: false
        })
      })
    })

    it('should switch to guard view successfully', async () => {
      mockAdminRoleViewService.switchRoleView.mockReturnValue({
        success: true,
        currentViewRole: 'guard',
        adminRole: 'admin'
      })

      const { result } = renderHook(() => useAdminRoleView())

      await act(async () => {
        const response = await result.current.switchToGuardView()
        expect(response.success).toBe(true)
        expect(response.currentViewRole).toBe('guard')
      })

      expect(mockAdminRoleViewService.switchRoleView).toHaveBeenCalledWith('admin', 'guard', false)
    })

    it('should return to admin view successfully', async () => {
      mockAdminRoleViewService.returnToAdminView.mockReturnValue({
        success: true,
        currentViewRole: 'admin',
        adminRole: 'admin'
      })

      const { result } = renderHook(() => useAdminRoleView())

      await act(async () => {
        const response = await result.current.returnToAdminView()
        expect(response.success).toBe(true)
        expect(response.currentViewRole).toBe('admin')
      })

      expect(mockAdminRoleViewService.returnToAdminView).toHaveBeenCalledWith('admin')
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      mockAdminRoleViewService.switchRoleView.mockReturnValue({
        success: true,
        currentViewRole: 'manager',
        adminRole: 'admin'
      })

      const { result } = renderHook(() => useAdminRoleView())

      await act(async () => {
        const response = await result.current.switchToRoleView('manager')
        expect(response.success).toBe(true) // Should still succeed even if audit fails
      })

      expect(result.current.error).toBe(null) // Should not set error for audit failures
    })

    it('should handle service errors', async () => {
      mockAdminRoleViewService.switchRoleView.mockReturnValue({
        success: false,
        currentViewRole: 'admin',
        adminRole: 'admin'
      })

      const { result } = renderHook(() => useAdminRoleView())

      await act(async () => {
        const response = await result.current.switchToRoleView('manager')
        expect(response.success).toBe(false)
      })

      expect(result.current.error).toBe('Failed to switch role view')
    })

    it('should provide convenience methods', () => {
      const { result } = renderHook(() => useAdminRoleView())

      expect(typeof result.current.switchToManagerView).toBe('function')
      expect(typeof result.current.switchToGuardView).toBe('function')
      expect(typeof result.current.switchToAdminView).toBe('function')
    })

    it('should clear preferences', () => {
      const { result } = renderHook(() => useAdminRoleView())

      act(() => {
        result.current.clearPreferences()
      })

      expect(mockAdminRoleViewService.clearPreferences).toHaveBeenCalled()
    })

    it('should manage preferences', () => {
      const { result } = renderHook(() => useAdminRoleView())

      act(() => {
        result.current.setDefaultViewRole('manager')
        result.current.setRememberLastView(true)
      })

      expect(mockAdminRoleViewService.updatePreferences).toHaveBeenCalledWith({
        defaultViewRole: 'manager'
      })
      expect(mockAdminRoleViewService.updatePreferences).toHaveBeenCalledWith({
        rememberLastView: true
      })
    })
  })

  describe('non-admin user', () => {
    beforeEach(() => {
      mockUseUserRole.mockReturnValue({ role: 'manager', isLoading: false, error: null })
      
      mockAdminRoleViewService.getCurrentViewRole.mockReturnValue('manager')
      mockAdminRoleViewService.getAvailableViewRoles.mockReturnValue(['admin', 'manager', 'guard'])
      mockAdminRoleViewService.isViewingSwitchedRole.mockReturnValue(false)
      mockAdminRoleViewService.getPreferences.mockReturnValue({
        rememberLastView: false,
        viewSwitchHistory: []
      })
    })

    it('should not have role switching capabilities', () => {
      const { result } = renderHook(() => useAdminRoleView())

      expect(result.current.canSwitchRoleViews).toBe(false)
      expect(result.current.currentViewRole).toBe('manager')
    })

    it('should reject role switch attempts', async () => {
      const { result } = renderHook(() => useAdminRoleView())

      await act(async () => {
        const response = await result.current.switchToRoleView('admin')
        expect(response.success).toBe(false)
      })

      expect(result.current.error).toBe('Only admins can switch role views')
    })

    it('should reject return to admin attempts', async () => {
      const { result } = renderHook(() => useAdminRoleView())

      await act(async () => {
        const response = await result.current.returnToAdminView()
        expect(response.success).toBe(false)
      })

      expect(result.current.error).toBe('Only admins can use role view switching')
    })
  })

  describe('loading states', () => {
    beforeEach(() => {
      mockUseUserRole.mockReturnValue({ role: 'admin', isLoading: false, error: null })
      
      mockAdminRoleViewService.getCurrentViewRole.mockReturnValue('admin')
      mockAdminRoleViewService.getAvailableViewRoles.mockReturnValue(['admin', 'manager', 'guard'])
      mockAdminRoleViewService.isViewingSwitchedRole.mockReturnValue(false)
      mockAdminRoleViewService.getPreferences.mockReturnValue({
        rememberLastView: false,
        viewSwitchHistory: []
      })
    })

    it('should show loading state during role switch', async () => {
      // Delay the service response to test loading state
      let resolvePromise: (value: any) => void
      mockAdminRoleViewService.switchRoleView.mockImplementation(() => {
        return new Promise(resolve => {
          resolvePromise = resolve
        })
      })

      const { result } = renderHook(() => useAdminRoleView())

      act(() => {
        result.current.switchToRoleView('manager')
      })

      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        resolvePromise!({
          success: true,
          currentViewRole: 'manager',
          adminRole: 'admin'
        })
      })

      expect(result.current.isLoading).toBe(false)
    })
  })
})