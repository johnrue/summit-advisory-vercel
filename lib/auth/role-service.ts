import { createClient } from './supabase'
import { AuditService } from '@/lib/services/audit-service'
import type { User } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'manager' | 'guard' | 'client'

export interface UserRoleRecord {
  id: string
  user_id: string
  role: UserRole
  permissions: Record<string, any>
  created_at: string
  updated_at: string
}

export interface RoleAssignmentResult {
  success: boolean
  error?: string
  role?: UserRole
}

export class RoleService {
  private supabase = createClient()
  private auditService = AuditService.getInstance()

  async assignRole(userId: string, role: UserRole, permissions?: Record<string, any>): Promise<RoleAssignmentResult> {
    try {
      // Check if user role record already exists
      const { data: existingRole, error: checkError } = await this.supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" - acceptable for new users
        throw checkError
      }

      const { data: { user: currentUser } } = await this.supabase.auth.getUser()
      const actorId = currentUser?.id

      if (existingRole) {
        // Update existing role
        const { error: updateError } = await this.supabase
          .from('user_roles')
          .update({
            role,
            permissions: permissions || existingRole.permissions,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (updateError) throw updateError

        // Log audit trail for role update
        await this.auditService.logRoleChange(
          userId,
          'updated',
          { role: existingRole.role, permissions: existingRole.permissions },
          { role, permissions: permissions || existingRole.permissions },
          `Role changed from ${existingRole.role} to ${role}`,
          actorId
        )
      } else {
        // Create new role record
        const { error: insertError } = await this.supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role,
            permissions: permissions || {}
          })

        if (insertError) throw insertError

        // Log audit trail for new role assignment
        await this.auditService.logRoleChange(
          userId,
          'created',
          undefined, // No previous values for new role
          { role, permissions: permissions || {} },
          `New role assigned: ${role}`,
          actorId
        )
      }

      return { success: true, role }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign role'
      return { success: false, error: errorMessage }
    }
  }

  async getUserRole(userId: string): Promise<{ role: UserRole | null; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return { role: data?.role as UserRole || null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user role'
      return { role: null, error: errorMessage }
    }
  }

  async updateRolePermissions(userId: string, permissions: Record<string, any>): Promise<RoleAssignmentResult> {
    try {
      const { error } = await this.supabase
        .from('user_roles')
        .update({
          permissions,
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

  async removeRole(userId: string): Promise<RoleAssignmentResult> {
    try {
      // Get existing role for audit trail
      const { data: existingRole } = await this.supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single()

      const { error } = await this.supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      if (error) throw error

      // Log audit trail for role removal
      if (existingRole) {
        const { data: { user: currentUser } } = await this.supabase.auth.getUser()
        await this.auditService.logRoleChange(
          userId,
          'deleted',
          { role: existingRole.role, permissions: existingRole.permissions },
          undefined, // No new values for deletion
          `Role removed: ${existingRole.role}`,
          currentUser?.id
        )
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove role'
      return { success: false, error: errorMessage }
    }
  }

  async listUsersWithRoles(role?: UserRole): Promise<{ users: UserRoleRecord[]; error?: string }> {
    try {
      let query = this.supabase
        .from('user_roles')
        .select('*')

      if (role) {
        query = query.eq('role', role)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      return { users: data || [] }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list users'
      return { users: [], error: errorMessage }
    }
  }

  // Auto-assign role during registration based on metadata
  async autoAssignRoleFromMetadata(user: User): Promise<RoleAssignmentResult> {
    try {
      const metadataRole = user.user_metadata?.role as UserRole
      
      if (!metadataRole) {
        // Default role for users without specified role
        return await this.assignRole(user.id, 'guard')
      }

      // Validate role is allowed
      const allowedRoles: UserRole[] = ['guard', 'manager', 'admin', 'client']
      if (!allowedRoles.includes(metadataRole)) {
        return await this.assignRole(user.id, 'guard')
      }

      return await this.assignRole(user.id, metadataRole)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to auto-assign role'
      return { success: false, error: errorMessage }
    }
  }
}

// Note: ServerRoleService is defined in a separate server-only file to avoid client/server import conflicts

// Export singleton instances
export const roleService = new RoleService()

// Role hierarchy and permission checking
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  client: 1,
  guard: 2,
  manager: 3,
  admin: 4,
}

export function hasPermission(userRole: UserRole | null, requiredRole: UserRole): boolean {
  if (!userRole) return false
  
  const userLevel = ROLE_HIERARCHY[userRole] || 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0
  
  return userLevel >= requiredLevel
}

export function hasAnyRole(userRole: UserRole | null, allowedRoles: UserRole[]): boolean {
  if (!userRole || allowedRoles.length === 0) return false
  
  return allowedRoles.includes(userRole)
}

export function canAccessRoute(userRole: UserRole | null, routePath: string): boolean {
  const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
    '/dashboard/admin': ['admin'],
    '/dashboard/manager': ['admin', 'manager'],
    '/dashboard/guard': ['admin', 'manager', 'guard'],
    '/dashboard': ['admin', 'manager', 'guard'],
    '/hiring': ['admin', 'manager'],
    '/scheduling': ['admin', 'manager', 'guard'],
    '/compliance': ['admin', 'manager'],
    '/leads': ['admin', 'manager'],
  }

  const allowedRoles = ROUTE_PERMISSIONS[routePath]
  if (!allowedRoles) return true // No specific restrictions

  return hasAnyRole(userRole, allowedRoles)
}