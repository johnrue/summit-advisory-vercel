import type { UserRole } from '@/lib/auth/role-service'

export interface AdminRoleViewState {
  adminUser: { id: string; email?: string; role: UserRole }
  currentViewRole: UserRole
  isViewingSwitchedRole: boolean
  availableViewRoles: UserRole[]
  roleViewPreferences: {
    defaultViewRole?: UserRole
    rememberLastView: boolean
  }
}

export interface AdminRoleViewPreferences {
  defaultViewRole?: UserRole
  rememberLastView: boolean
  lastViewRole?: UserRole
  viewSwitchHistory: {
    role: UserRole
    switchedAt: Date
  }[]
}

export interface RoleViewSwitchRequest {
  targetViewRole: UserRole
  persistPreference?: boolean
}

export interface RoleViewSwitchResponse {
  currentViewRole: UserRole
  adminRole: UserRole
  success: boolean
}

export class AdminRoleViewService {
  private static readonly PREFERENCES_KEY = 'admin_role_view_preferences'
  private static readonly MAX_HISTORY_ITEMS = 10

  // Available role views for admins
  private readonly availableRoles: UserRole[] = ['admin', 'manager', 'guard']

  getAvailableViewRoles(): UserRole[] {
    return [...this.availableRoles]
  }

  switchRoleView(
    adminRole: UserRole,
    targetViewRole: UserRole,
    persistPreference = false
  ): RoleViewSwitchResponse {
    // Validate admin permissions
    if (adminRole !== 'admin') {
      return {
        currentViewRole: adminRole,
        adminRole,
        success: false
      }
    }

    // Validate target role
    if (!this.availableRoles.includes(targetViewRole)) {
      return {
        currentViewRole: adminRole,
        adminRole,
        success: false
      }
    }

    // Update preferences if requested
    if (persistPreference) {
      this.updatePreferences({
        defaultViewRole: targetViewRole,
        rememberLastView: true,
        lastViewRole: targetViewRole
      })
    }

    // Add to history
    this.addToViewHistory(targetViewRole)

    return {
      currentViewRole: targetViewRole,
      adminRole,
      success: true
    }
  }

  returnToAdminView(adminRole: UserRole): RoleViewSwitchResponse {
    this.addToViewHistory(adminRole)
    
    return {
      currentViewRole: adminRole,
      adminRole,
      success: true
    }
  }

  getCurrentViewRole(adminRole: UserRole): UserRole {
    const preferences = this.getPreferences()
    
    if (preferences.rememberLastView && preferences.lastViewRole) {
      return preferences.lastViewRole
    }

    if (preferences.defaultViewRole) {
      return preferences.defaultViewRole
    }

    return adminRole
  }

  isViewingSwitchedRole(adminRole: UserRole, currentViewRole: UserRole): boolean {
    return adminRole !== currentViewRole
  }

  getPreferences(): AdminRoleViewPreferences {
    if (typeof window === 'undefined') {
      return {
        rememberLastView: false,
        viewSwitchHistory: []
      }
    }

    try {
      const stored = localStorage.getItem(AdminRoleViewService.PREFERENCES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as AdminRoleViewPreferences
        // Convert date strings back to Date objects
        parsed.viewSwitchHistory = parsed.viewSwitchHistory.map(item => ({
          ...item,
          switchedAt: new Date(item.switchedAt)
        }))
        return parsed
      }
    } catch (error) {
      console.warn('Failed to load admin role view preferences:', error)
    }

    return {
      rememberLastView: false,
      viewSwitchHistory: []
    }
  }

  updatePreferences(updates: Partial<AdminRoleViewPreferences>): void {
    if (typeof window === 'undefined') return

    try {
      const current = this.getPreferences()
      const updated = { ...current, ...updates }
      localStorage.setItem(AdminRoleViewService.PREFERENCES_KEY, JSON.stringify(updated))
    } catch (error) {
      console.warn('Failed to save admin role view preferences:', error)
    }
  }

  private addToViewHistory(role: UserRole): void {
    if (typeof window === 'undefined') return

    try {
      const preferences = this.getPreferences()
      const newEntry = {
        role,
        switchedAt: new Date()
      }

      // Remove any existing entries for this role to avoid duplicates
      const filteredHistory = preferences.viewSwitchHistory.filter(
        item => item.role !== role
      )

      // Add new entry at the beginning and limit history size
      const updatedHistory = [newEntry, ...filteredHistory]
        .slice(0, AdminRoleViewService.MAX_HISTORY_ITEMS)

      this.updatePreferences({
        viewSwitchHistory: updatedHistory
      })
    } catch (error) {
      console.warn('Failed to add to role view history:', error)
    }
  }

  clearPreferences(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(AdminRoleViewService.PREFERENCES_KEY)
    } catch (error) {
      console.warn('Failed to clear admin role view preferences:', error)
    }
  }

  getViewHistory(): { role: UserRole; switchedAt: Date }[] {
    return this.getPreferences().viewSwitchHistory
  }
}

// Export singleton instance
export const adminRoleViewService = new AdminRoleViewService()