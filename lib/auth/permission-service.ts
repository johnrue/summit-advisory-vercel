import { createClient } from './supabase'
import type { UserRole } from './role-service'

// Re-export UserRole for external use
export type { UserRole }

// Comprehensive permission matrix interface
export interface PermissionMatrix {
  users: {
    view_all: boolean
    create: boolean
    edit: boolean
    delete: boolean
  }
  guards: {
    view_all: boolean
    edit_profiles: boolean
    assign_shifts: boolean
    manage_applications: boolean
  }
  shifts: {
    view_all: boolean
    create: boolean
    edit: boolean
    assign: boolean
  }
  system: {
    view_audit_logs: boolean
    manage_roles: boolean
    system_config: boolean
  }
  leads: {
    view_all: boolean
    create: boolean
    edit: boolean
    assign: boolean
  }
  compliance: {
    view_all: boolean
    manage_reports: boolean
    audit_access: boolean
  }
}

// Permission checking result interface
export interface PermissionCheckResult {
  hasPermission: boolean
  error?: string
}

// Permission service class
export class PermissionService {
  private supabase = createClient()

  // Get default permission matrix for a role
  static getDefaultPermissions(role: UserRole): PermissionMatrix {
    const matrices: Record<UserRole, PermissionMatrix> = {
      admin: {
        users: { view_all: true, create: true, edit: true, delete: true },
        guards: { view_all: true, edit_profiles: true, assign_shifts: true, manage_applications: true },
        shifts: { view_all: true, create: true, edit: true, assign: true },
        system: { view_audit_logs: true, manage_roles: true, system_config: true },
        leads: { view_all: true, create: true, edit: true, assign: true },
        compliance: { view_all: true, manage_reports: true, audit_access: true }
      },
      manager: {
        users: { view_all: false, create: false, edit: false, delete: false },
        guards: { view_all: true, edit_profiles: true, assign_shifts: true, manage_applications: true },
        shifts: { view_all: true, create: true, edit: true, assign: true },
        system: { view_audit_logs: false, manage_roles: false, system_config: false },
        leads: { view_all: true, create: true, edit: true, assign: true },
        compliance: { view_all: true, manage_reports: false, audit_access: false }
      },
      guard: {
        users: { view_all: false, create: false, edit: false, delete: false },
        guards: { view_all: false, edit_profiles: false, assign_shifts: false, manage_applications: false },
        shifts: { view_all: false, create: false, edit: false, assign: false },
        system: { view_audit_logs: false, manage_roles: false, system_config: false },
        leads: { view_all: false, create: false, edit: false, assign: false },
        compliance: { view_all: false, manage_reports: false, audit_access: false }
      },
      client: {
        users: { view_all: false, create: false, edit: false, delete: false },
        guards: { view_all: false, edit_profiles: false, assign_shifts: false, manage_applications: false },
        shifts: { view_all: false, create: false, edit: false, assign: false },
        system: { view_audit_logs: false, manage_roles: false, system_config: false },
        leads: { view_all: false, create: false, edit: false, assign: false },
        compliance: { view_all: false, manage_reports: false, audit_access: false }
      }
    }
    
    return matrices[role]
  }

  // Get user's permission matrix from database
  async getUserPermissions(userId: string): Promise<{ permissions: PermissionMatrix | null; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('user_roles')
        .select('permissions, role')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!data) {
        return { permissions: null }
      }

      // Return permissions from database or default for role
      const permissions = data.permissions as PermissionMatrix || PermissionService.getDefaultPermissions(data.role)
      return { permissions }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user permissions'
      return { permissions: null, error: errorMessage }
    }
  }

  // Check if user has a specific permission
  async checkPermission(userId: string, permissionPath: string): Promise<PermissionCheckResult> {
    try {
      const { permissions, error } = await this.getUserPermissions(userId)
      
      if (error) {
        return { hasPermission: false, error }
      }

      if (!permissions) {
        return { hasPermission: false, error: 'User permissions not found' }
      }

      // Navigate permission path (e.g., "users.view_all")
      const parts = permissionPath.split('.')
      let current: any = permissions
      
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part]
        } else {
          return { hasPermission: false, error: `Permission path not found: ${permissionPath}` }
        }
      }

      return { hasPermission: Boolean(current) }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Permission check failed'
      return { hasPermission: false, error: errorMessage }
    }
  }

  // Check multiple permissions at once
  async checkPermissions(userId: string, permissionPaths: string[]): Promise<Record<string, PermissionCheckResult>> {
    const results: Record<string, PermissionCheckResult> = {}
    
    const { permissions, error } = await this.getUserPermissions(userId)
    
    if (error || !permissions) {
      const defaultResult = { hasPermission: false, error: error || 'User permissions not found' }
      for (const path of permissionPaths) {
        results[path] = defaultResult
      }
      return results
    }

    for (const path of permissionPaths) {
      const parts = path.split('.')
      let current: any = permissions
      let hasPermission = true
      let pathError: string | undefined

      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part]
        } else {
          hasPermission = false
          pathError = `Permission path not found: ${path}`
          break
        }
      }

      if (hasPermission) {
        hasPermission = Boolean(current)
      }

      results[path] = { hasPermission, error: pathError }
    }

    return results
  }

  // Update user permissions
  async updateUserPermissions(userId: string, permissions: Partial<PermissionMatrix>): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current permissions to merge with updates
      const { permissions: currentPermissions } = await this.getUserPermissions(userId)
      
      if (!currentPermissions) {
        return { success: false, error: 'User not found or no existing permissions' }
      }

      // Deep merge current permissions with updates
      const updatedPermissions = this.mergePermissions(currentPermissions, permissions)

      const { error } = await this.supabase
        .from('user_roles')
        .update({
          permissions: updatedPermissions,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update permissions'
      return { success: false, error: errorMessage }
    }
  }

  // Deep merge permissions objects
  private mergePermissions(current: PermissionMatrix, updates: Partial<PermissionMatrix>): PermissionMatrix {
    const result = { ...current }
    
    for (const [category, categoryUpdates] of Object.entries(updates)) {
      if (categoryUpdates && category in result) {
        (result as any)[category] = {
          ...(result as any)[category],
          ...categoryUpdates
        }
      }
    }
    
    return result
  }
}

// Export singleton instance
export const permissionService = new PermissionService()

// Utility functions for permission checking
export function hasAnyPermission(permissions: PermissionMatrix | null, permissionPaths: string[]): boolean {
  if (!permissions) return false
  
  return permissionPaths.some(path => {
    const parts = path.split('.')
    let current: any = permissions
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        return false
      }
    }
    
    return Boolean(current)
  })
}

export function hasAllPermissions(permissions: PermissionMatrix | null, permissionPaths: string[]): boolean {
  if (!permissions) return false
  
  return permissionPaths.every(path => {
    const parts = path.split('.')
    let current: any = permissions
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        return false
      }
    }
    
    return Boolean(current)
  })
}

// Common permission groups for convenience
export const PERMISSION_GROUPS = {
  USER_MANAGEMENT: ['users.view_all', 'users.create', 'users.edit', 'users.delete'],
  GUARD_MANAGEMENT: ['guards.view_all', 'guards.edit_profiles', 'guards.assign_shifts', 'guards.manage_applications'],
  SHIFT_MANAGEMENT: ['shifts.view_all', 'shifts.create', 'shifts.edit', 'shifts.assign'],
  SYSTEM_ADMIN: ['system.view_audit_logs', 'system.manage_roles', 'system.system_config'],
  LEAD_MANAGEMENT: ['leads.view_all', 'leads.create', 'leads.edit', 'leads.assign'],
  COMPLIANCE: ['compliance.view_all', 'compliance.manage_reports', 'compliance.audit_access']
} as const