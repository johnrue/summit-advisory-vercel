'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { useUserRole } from '@/hooks/use-user-role'
import { adminRoleViewService, type AdminRoleViewState, type RoleViewSwitchResponse } from '@/lib/admin/role-view-service'
import type { UserRole } from '@/lib/auth/role-service'

export function useAdminRoleView() {
  const { user } = useAuth()
  const { role: userRole } = useUserRole()
  
  const [currentViewRole, setCurrentViewRole] = useState<UserRole>(userRole || 'guard')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize view role from preferences
  useEffect(() => {
    if (userRole === 'admin') {
      const preferredViewRole = adminRoleViewService.getCurrentViewRole(userRole)
      setCurrentViewRole(preferredViewRole)
    } else {
      setCurrentViewRole(userRole || 'guard')
    }
  }, [userRole])

  const switchToRoleView = useCallback(async (targetRole: UserRole, persistPreference = false): Promise<RoleViewSwitchResponse> => {
    if (!userRole || userRole !== 'admin') {
      const result: RoleViewSwitchResponse = {
        currentViewRole: userRole || 'guard',
        adminRole: userRole || 'guard',
        success: false
      }
      setError('Only admins can switch role views')
      return result
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = adminRoleViewService.switchRoleView(userRole, targetRole, persistPreference)
      
      if (result.success) {
        setCurrentViewRole(result.currentViewRole)
        
        // Log the role view switch for audit purposes
        try {
          await fetch('/api/v1/admin/role-view/switch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              targetViewRole: targetRole,
              persistPreference
            })
          })
        } catch (auditError) {
          // Don't fail the operation if audit logging fails
        }
      } else {
        setError('Failed to switch role view')
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch role view'
      setError(errorMessage)
      return {
        currentViewRole: currentViewRole,
        adminRole: userRole,
        success: false
      }
    } finally {
      setIsLoading(false)
    }
  }, [userRole, currentViewRole])

  const returnToAdminView = useCallback(async (): Promise<RoleViewSwitchResponse> => {
    if (!userRole || userRole !== 'admin') {
      const result: RoleViewSwitchResponse = {
        currentViewRole: userRole || 'guard',
        adminRole: userRole || 'guard',
        success: false
      }
      setError('Only admins can use role view switching')
      return result
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = adminRoleViewService.returnToAdminView(userRole)
      
      if (result.success) {
        setCurrentViewRole(result.currentViewRole)
        
        // Log the return to admin view for audit purposes
        try {
          await fetch('/api/v1/admin/role-view/switch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              targetViewRole: userRole,
              persistPreference: false
            })
          })
        } catch (auditError) {
          // Don't fail the operation if audit logging fails
        }
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to return to admin view'
      setError(errorMessage)
      return {
        currentViewRole: currentViewRole,
        adminRole: userRole,
        success: false
      }
    } finally {
      setIsLoading(false)
    }
  }, [userRole, currentViewRole])

  const getAdminRoleViewState = useCallback((): AdminRoleViewState => {
    const adminUser = {
      id: user?.id || '',
      email: user?.email,
      role: userRole || 'guard'
    }

    return {
      adminUser,
      currentViewRole,
      isViewingSwitchedRole: adminRoleViewService.isViewingSwitchedRole(userRole || 'guard', currentViewRole),
      availableViewRoles: adminRoleViewService.getAvailableViewRoles(),
      roleViewPreferences: adminRoleViewService.getPreferences()
    }
  }, [user, userRole, currentViewRole])

  const clearPreferences = useCallback(() => {
    adminRoleViewService.clearPreferences()
    if (userRole) {
      setCurrentViewRole(userRole)
    }
  }, [userRole])

  // Only enable role view switching for admins
  const canSwitchRoleViews = userRole === 'admin'
  const state = getAdminRoleViewState()

  return {
    ...state,
    canSwitchRoleViews,
    isLoading,
    error,
    switchToRoleView,
    returnToAdminView,
    clearPreferences,
    
    // Convenience methods
    switchToManagerView: () => switchToRoleView('manager'),
    switchToGuardView: () => switchToRoleView('guard'),
    switchToAdminView: () => switchToRoleView('admin'),
    
    // Preference management
    setDefaultViewRole: (role: UserRole) => {
      adminRoleViewService.updatePreferences({ defaultViewRole: role })
    },
    setRememberLastView: (remember: boolean) => {
      adminRoleViewService.updatePreferences({ rememberLastView: remember })
    }
  }
}