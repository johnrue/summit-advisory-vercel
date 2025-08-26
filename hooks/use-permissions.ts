'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { useUserRole } from '@/hooks/use-user-role'
import { 
  permissionService, 
  type PermissionMatrix, 
  type PermissionCheckResult,
  PermissionService,
  hasAnyPermission,
  hasAllPermissions
} from '@/lib/auth/permission-service'

interface UsePermissionsReturn {
  permissions: PermissionMatrix | null
  loading: boolean
  error: string | null
  checkPermission: (permissionPath: string) => boolean
  checkPermissions: (permissionPaths: string[]) => Record<string, boolean>
  hasAnyPermission: (permissionPaths: string[]) => boolean
  hasAllPermissions: (permissionPaths: string[]) => boolean
  refreshPermissions: () => Promise<void>
}

export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth()
  const { role } = useUserRole()
  const [permissions, setPermissions] = useState<PermissionMatrix | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { permissions: userPermissions, error: permError } = await permissionService.getUserPermissions(user.id)
      
      if (permError) {
        // Fallback to default permissions for the user's role if database fetch fails
        if (role) {
          const defaultPermissions = PermissionService.getDefaultPermissions(role)
          setPermissions(defaultPermissions)
          setError(`Using default permissions: ${permError}`)
        } else {
          throw new Error(permError)
        }
      } else {
        setPermissions(userPermissions)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user permissions'
      setError(errorMessage)
      
      // Final fallback to default permissions if both database and role-based fallback fail
      if (role) {
        setPermissions(PermissionService.getDefaultPermissions(role))
      }
    } finally {
      setLoading(false)
    }
  }, [user, role])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  // Check a single permission path
  const checkPermission = useCallback((permissionPath: string): boolean => {
    if (!permissions) return false
    
    const parts = permissionPath.split('.')
    let current: any = permissions
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        return false
      }
    }
    
    return Boolean(current)
  }, [permissions])

  // Check multiple permissions
  const checkPermissions = useCallback((permissionPaths: string[]): Record<string, boolean> => {
    const results: Record<string, boolean> = {}
    
    for (const path of permissionPaths) {
      results[path] = checkPermission(path)
    }
    
    return results
  }, [checkPermission])

  // Check if user has any of the specified permissions
  const hasAnyPermissionCheck = useCallback((permissionPaths: string[]): boolean => {
    return hasAnyPermission(permissions, permissionPaths)
  }, [permissions])

  // Check if user has all of the specified permissions
  const hasAllPermissionsCheck = useCallback((permissionPaths: string[]): boolean => {
    return hasAllPermissions(permissions, permissionPaths)
  }, [permissions])

  // Refresh permissions from database
  const refreshPermissions = useCallback(async () => {
    await fetchPermissions()
  }, [fetchPermissions])

  return {
    permissions,
    loading,
    error,
    checkPermission,
    checkPermissions,
    hasAnyPermission: hasAnyPermissionCheck,
    hasAllPermissions: hasAllPermissionsCheck,
    refreshPermissions
  }
}

// Hook for checking specific permission groups
export function usePermissionGroups() {
  const { hasAnyPermission, hasAllPermissions } = usePermissions()

  return {
    canManageUsers: hasAnyPermission(['users.create', 'users.edit', 'users.delete']),
    canViewAllUsers: hasAnyPermission(['users.view_all']),
    canManageGuards: hasAnyPermission(['guards.edit_profiles', 'guards.assign_shifts', 'guards.manage_applications']),
    canViewAllGuards: hasAnyPermission(['guards.view_all']),
    canManageShifts: hasAnyPermission(['shifts.create', 'shifts.edit', 'shifts.assign']),
    canViewAllShifts: hasAnyPermission(['shifts.view_all']),
    canAccessSystemAdmin: hasAnyPermission(['system.view_audit_logs', 'system.manage_roles', 'system.system_config']),
    canManageRoles: hasAnyPermission(['system.manage_roles']),
    canViewAuditLogs: hasAnyPermission(['system.view_audit_logs']),
    canManageLeads: hasAnyPermission(['leads.create', 'leads.edit', 'leads.assign']),
    canViewAllLeads: hasAnyPermission(['leads.view_all']),
    canManageCompliance: hasAnyPermission(['compliance.manage_reports', 'compliance.audit_access']),
    canViewCompliance: hasAnyPermission(['compliance.view_all']),
    
    // Admin-level checks
    isSystemAdmin: hasAllPermissions(['system.manage_roles', 'system.view_audit_logs']),
    isFullAdmin: hasAllPermissions([
      'users.create', 'users.edit', 'users.delete',
      'system.manage_roles', 'system.view_audit_logs'
    ])
  }
}

// Hook for checking route-specific permissions
export function useRoutePermissions() {
  const { checkPermission } = usePermissions()
  const { role } = useUserRole()

  const checkRouteAccess = useCallback((routePath: string): boolean => {
    // Route-specific permission mappings
    const routePermissions: Record<string, string[]> = {
      '/dashboard/admin/role-management': ['system.manage_roles'],
      '/dashboard/admin/user-management': ['users.view_all'],
      '/dashboard/admin/audit-logs': ['system.view_audit_logs'],
      '/dashboard/admin': ['system.view_audit_logs', 'system.manage_roles'],
      '/dashboard/guards': ['guards.view_all'],
      '/dashboard/guards/create': ['guards.manage_applications'],
      '/dashboard/guards/edit': ['guards.edit_profiles'],
      '/dashboard/shifts': ['shifts.view_all'],
      '/dashboard/shifts/create': ['shifts.create'],
      '/dashboard/shifts/assign': ['shifts.assign'],
      '/dashboard/leads': ['leads.view_all'],
      '/dashboard/leads/create': ['leads.create'],
      '/dashboard/compliance': ['compliance.view_all'],
      '/dashboard/compliance/reports': ['compliance.manage_reports']
    }

    const requiredPermissions = routePermissions[routePath]
    
    if (!requiredPermissions) {
      // No specific permissions required, use role-based access
      return role !== null
    }

    // Check if user has any of the required permissions
    return requiredPermissions.some(permission => checkPermission(permission))
  }, [checkPermission, role])

  return {
    checkRouteAccess,
    canAccessAdminRoutes: checkRouteAccess('/dashboard/admin'),
    canAccessUserManagement: checkRouteAccess('/dashboard/admin/user-management'),
    canAccessRoleManagement: checkRouteAccess('/dashboard/admin/role-management'),
    canAccessAuditLogs: checkRouteAccess('/dashboard/admin/audit-logs'),
    canAccessGuardManagement: checkRouteAccess('/dashboard/guards'),
    canAccessShiftManagement: checkRouteAccess('/dashboard/shifts'),
    canAccessLeadManagement: checkRouteAccess('/dashboard/leads'),
    canAccessCompliance: checkRouteAccess('/dashboard/compliance')
  }
}