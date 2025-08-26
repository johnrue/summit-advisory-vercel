import { adminRoleViewService, AdminRoleViewService } from '@/lib/admin/role-view-service'
import type { UserRole } from '@/lib/auth/role-service'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => store[key] = value,
    removeItem: (key: string) => delete store[key],
    clear: () => store = {}
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('AdminRoleViewService', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('getAvailableViewRoles', () => {
    it('should return all available role views', () => {
      const roles = adminRoleViewService.getAvailableViewRoles()
      expect(roles).toEqual(['admin', 'manager', 'guard'])
    })
  })

  describe('switchRoleView', () => {
    it('should allow admin to switch to manager view', () => {
      const result = adminRoleViewService.switchRoleView('admin', 'manager', false)
      expect(result.success).toBe(true)
      expect(result.currentViewRole).toBe('manager')
      expect(result.adminRole).toBe('admin')
    })

    it('should allow admin to switch to guard view', () => {
      const result = adminRoleViewService.switchRoleView('admin', 'guard', false)
      expect(result.success).toBe(true)
      expect(result.currentViewRole).toBe('guard')
      expect(result.adminRole).toBe('admin')
    })

    it('should reject non-admin role switches', () => {
      const result = adminRoleViewService.switchRoleView('manager', 'admin', false)
      expect(result.success).toBe(false)
      expect(result.currentViewRole).toBe('manager')
      expect(result.adminRole).toBe('manager')
    })

    it('should reject invalid target roles', () => {
      const result = adminRoleViewService.switchRoleView('admin', 'invalid' as UserRole, false)
      expect(result.success).toBe(false)
    })

    it('should persist preference when requested', () => {
      adminRoleViewService.switchRoleView('admin', 'manager', true)
      const preferences = adminRoleViewService.getPreferences()
      expect(preferences.defaultViewRole).toBe('manager')
      expect(preferences.rememberLastView).toBe(true)
      expect(preferences.lastViewRole).toBe('manager')
    })
  })

  describe('returnToAdminView', () => {
    it('should return admin to admin view', () => {
      const result = adminRoleViewService.returnToAdminView('admin')
      expect(result.success).toBe(true)
      expect(result.currentViewRole).toBe('admin')
      expect(result.adminRole).toBe('admin')
    })
  })

  describe('getCurrentViewRole', () => {
    it('should return admin role when no preferences set', () => {
      const role = adminRoleViewService.getCurrentViewRole('admin')
      expect(role).toBe('admin')
    })

    it('should return last view role when remember is enabled', () => {
      adminRoleViewService.updatePreferences({
        rememberLastView: true,
        lastViewRole: 'manager'
      })
      
      const role = adminRoleViewService.getCurrentViewRole('admin')
      expect(role).toBe('manager')
    })

    it('should return default role when set', () => {
      adminRoleViewService.updatePreferences({
        defaultViewRole: 'guard',
        rememberLastView: false
      })
      
      const role = adminRoleViewService.getCurrentViewRole('admin')
      expect(role).toBe('guard')
    })
  })

  describe('isViewingSwitchedRole', () => {
    it('should return false when viewing same role', () => {
      const isViewing = adminRoleViewService.isViewingSwitchedRole('admin', 'admin')
      expect(isViewing).toBe(false)
    })

    it('should return true when viewing different role', () => {
      const isViewing = adminRoleViewService.isViewingSwitchedRole('admin', 'manager')
      expect(isViewing).toBe(true)
    })
  })

  describe('preferences management', () => {
    it('should save and load preferences correctly', () => {
      const testPreferences = {
        defaultViewRole: 'manager' as UserRole,
        rememberLastView: true,
        lastViewRole: 'guard' as UserRole,
        viewSwitchHistory: [
          { role: 'manager' as UserRole, switchedAt: new Date('2025-01-01') }
        ]
      }

      adminRoleViewService.updatePreferences(testPreferences)
      const loaded = adminRoleViewService.getPreferences()

      expect(loaded.defaultViewRole).toBe('manager')
      expect(loaded.rememberLastView).toBe(true)
      expect(loaded.lastViewRole).toBe('guard')
      expect(loaded.viewSwitchHistory).toHaveLength(1)
      expect(loaded.viewSwitchHistory[0].role).toBe('manager')
    })

    it('should handle corrupted localStorage gracefully', () => {
      localStorageMock.setItem('admin_role_view_preferences', 'invalid json')
      const preferences = adminRoleViewService.getPreferences()
      
      expect(preferences.rememberLastView).toBe(false)
      expect(preferences.viewSwitchHistory).toEqual([])
    })

    it('should clear preferences correctly', () => {
      adminRoleViewService.updatePreferences({
        defaultViewRole: 'manager',
        rememberLastView: true
      })
      
      adminRoleViewService.clearPreferences()
      const preferences = adminRoleViewService.getPreferences()
      
      expect(preferences.defaultViewRole).toBeUndefined()
      expect(preferences.rememberLastView).toBe(false)
    })
  })

  describe('view history', () => {
    it('should add entries to view history', () => {
      // Access private method through any cast for testing
      const service = adminRoleViewService as any
      service.addToViewHistory('manager')
      service.addToViewHistory('guard')
      
      const history = adminRoleViewService.getViewHistory()
      expect(history).toHaveLength(2)
      expect(history[0].role).toBe('guard') // Most recent first
      expect(history[1].role).toBe('manager')
    })

    it('should limit history to maximum items', () => {
      const service = adminRoleViewService as any
      
      // Add more than max items
      for (let i = 0; i < 15; i++) {
        service.addToViewHistory(i % 2 === 0 ? 'manager' : 'guard')
      }
      
      const history = adminRoleViewService.getViewHistory()
      expect(history.length).toBeLessThanOrEqual(10)
    })

    it('should remove duplicate entries', () => {
      const service = adminRoleViewService as any
      service.addToViewHistory('manager')
      service.addToViewHistory('guard')
      service.addToViewHistory('manager') // Duplicate
      
      const history = adminRoleViewService.getViewHistory()
      const managerEntries = history.filter(entry => entry.role === 'manager')
      expect(managerEntries).toHaveLength(1) // Only one manager entry
    })
  })
})

// Test server-side behavior
describe('AdminRoleViewService (Server Side)', () => {
  const originalWindow = global.window

  beforeAll(() => {
    // Clear localStorage first
    localStorageMock.clear()
    // Simulate server environment
    delete (global as any).window
  })

  afterAll(() => {
    global.window = originalWindow
  })

  it('should handle preferences gracefully on server side', () => {
    const service = new AdminRoleViewService()
    const preferences = service.getPreferences()
    
    expect(preferences.rememberLastView).toBe(false)
    expect(preferences.viewSwitchHistory).toEqual([])
  })

  it('should not crash when updating preferences on server side', () => {
    const service = new AdminRoleViewService()
    expect(() => {
      service.updatePreferences({ rememberLastView: true })
    }).not.toThrow()
  })
})