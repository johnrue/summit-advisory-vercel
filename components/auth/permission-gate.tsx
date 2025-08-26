'use client'

import { usePermissions } from '@/hooks/use-permissions'
import { useUserRole, type UserRole } from '@/hooks/use-user-role'
import { Loader2, AlertTriangle } from 'lucide-react'

interface PermissionGateProps {
  children: React.ReactNode
  permissions?: string[]
  roles?: UserRole[]
  requireAll?: boolean
  fallback?: React.ReactNode
  loading?: React.ReactNode
  showError?: boolean
}

export function PermissionGate({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback = null,
  loading,
  showError = false
}: PermissionGateProps) {
  const { 
    checkPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    loading: permissionsLoading 
  } = usePermissions()
  const { role, loading: roleLoading } = useUserRole()

  const isLoading = permissionsLoading || roleLoading

  // Show loading state
  if (isLoading) {
    if (loading) {
      return <>{loading}</>
    }
    
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Check role-based access
  if (roles.length > 0) {
    const hasRequiredRole = roles.includes(role!)
    if (!hasRequiredRole) {
      if (showError) {
        return (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            Insufficient role permissions
          </div>
        )
      }
      return <>{fallback}</>
    }
  }

  // Check permission-based access
  if (permissions.length > 0) {
    const hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)

    if (!hasAccess) {
      if (showError) {
        return (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            Missing required permissions: {permissions.join(', ')}
          </div>
        )
      }
      return <>{fallback}</>
    }
  }

  // If no restrictions or access granted, render children
  return <>{children}</>
}

// Convenience components for specific permissions

export function UserManagementGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate
      permissions={['users.view_all', 'users.create', 'users.edit']}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

export function GuardManagementGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate
      permissions={['guards.view_all', 'guards.edit_profiles', 'guards.manage_applications']}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

export function ShiftManagementGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate
      permissions={['shifts.view_all', 'shifts.create', 'shifts.assign']}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

export function SystemAdminGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate
      permissions={['system.manage_roles', 'system.view_audit_logs']}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

export function LeadManagementGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate
      permissions={['leads.view_all', 'leads.create', 'leads.edit']}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

export function ComplianceGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate
      permissions={['compliance.view_all', 'compliance.manage_reports']}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

// Role-based gates for convenience

export function AdminOnlyGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate roles={['admin']} fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

export function ManagerPlusGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate roles={['admin', 'manager']} fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

export function GuardPlusGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate roles={['admin', 'manager', 'guard']} fallback={fallback}>
      {children}
    </PermissionGate>
  )
}