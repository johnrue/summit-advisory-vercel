'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { useUserRole } from '@/hooks/use-user-role'
import type { 
  UserSupportInfo, 
  UserSupportContext, 
  PermissionComparison 
} from '@/lib/admin/user-support-service'

export function useUserSupport() {
  const { user } = useAuth()
  const { role } = useUserRole()
  
  const [selectedUser, setSelectedUser] = useState<UserSupportInfo | null>(null)
  const [isViewingUserContext, setIsViewingUserContext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionComparison, setPermissionComparison] = useState<PermissionComparison | null>(null)

  const canUseUserSupport = role === 'admin'

  const viewUserContext = useCallback(async (userId: string): Promise<void> => {
    if (!canUseUserSupport || !user) {
      setError('Only administrators can use user support tools')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/v1/admin/user-support/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch user information')
      }

      const data = await response.json()
      
      if (data.canView && data.user) {
        setSelectedUser(data.user)
        setIsViewingUserContext(true)
        
        // Also fetch permission comparison
        const comparisonResponse = await fetch(`/api/v1/admin/user-support/${userId}/permissions`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (comparisonResponse.ok) {
          const comparisonData = await comparisonResponse.json()
          setPermissionComparison(comparisonData.comparison)
        }
      } else {
        throw new Error('Cannot view user information')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to view user context'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [canUseUserSupport, user])

  const exitUserContext = useCallback(() => {
    setSelectedUser(null)
    setIsViewingUserContext(false)
    setPermissionComparison(null)
    setError(null)
  }, [])

  const getUserSupportContext = useCallback((): UserSupportContext => {
    return {
      selectedUser,
      isViewingUserContext,
      canViewUser: canUseUserSupport
    }
  }, [selectedUser, isViewingUserContext, canUseUserSupport])

  // Helper methods
  const isUserActive = useCallback((user: UserSupportInfo): boolean => {
    if (!user.lastActive) return false
    
    const now = new Date()
    const lastActive = new Date(user.lastActive)
    const daysSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    
    return daysSinceActive <= 30 // Active within last 30 days
  }, [])

  const getUserRoleLevel = useCallback((role: string): number => {
    const levels: Record<string, number> = { client: 1, guard: 2, manager: 3, admin: 4 }
    return levels[role] || 0
  }, [])

  const formatUserDisplayName = useCallback((user: UserSupportInfo): string => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
    }
    return user.email.split('@')[0]
  }, [])

  const getUserPermissionSummary = useCallback((user: UserSupportInfo): { 
    total: number
    categories: Record<string, number> 
  } => {
    const categories: Record<string, number> = {
      users: 0,
      guards: 0,
      shifts: 0,
      leads: 0,
      compliance: 0,
      reports: 0,
      system: 0
    }

    user.permissions.forEach(permission => {
      const category = permission.split('.')[0]
      if (categories.hasOwnProperty(category)) {
        categories[category]++
      }
    })

    return {
      total: user.permissions.length,
      categories
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    selectedUser,
    isViewingUserContext,
    isLoading,
    error,
    permissionComparison,
    canUseUserSupport,
    
    // Actions
    viewUserContext,
    exitUserContext,
    clearError,
    
    // Context
    getUserSupportContext,
    
    // Utilities
    isUserActive,
    getUserRoleLevel,
    formatUserDisplayName,
    getUserPermissionSummary
  }
}