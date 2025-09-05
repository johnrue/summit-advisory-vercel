import { createClient } from '@/lib/auth/supabase'
import type { UserRole } from '@/lib/auth/role-service'

export interface UserSupportInfo {
  id: string
  email: string
  role: UserRole
  permissions: string[]
  lastActive: Date | null
  createdAt: Date
  updatedAt: Date
  profile?: {
    firstName?: string
    lastName?: string
    phoneNumber?: string
  }
  rolePermissions?: Record<string, any>
}

export interface UserSupportContext {
  selectedUser: UserSupportInfo | null
  isViewingUserContext: boolean
  canViewUser: boolean
}

export interface UserSupportInfoRequest {
  userId: string
}

export interface UserSupportInfoResponse {
  user: UserSupportInfo | null
  canView: boolean
  error?: string
}

export interface PermissionComparison {
  adminPermissions: string[]
  userPermissions: string[]
  sharedPermissions: string[]
  adminOnlyPermissions: string[]
  userOnlyPermissions: string[]
}

export class UserSupportService {
  private supabase = createClient()

  async getUserSupportInfo(userId: string, adminUserId: string): Promise<UserSupportInfoResponse> {
    try {
      // First verify the requesting user is an admin
      const { data: adminRole, error: adminError } = await this.supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', adminUserId)
        .single()

      if (adminError || !adminRole || adminRole.role !== 'admin') {
        return {
          user: null,
          canView: false,
          error: 'Insufficient permissions to view user information'
        }
      }

      // Get user auth information
      const { data: { user: authUser }, error: authError } = await this.supabase.auth.admin.getUserById(userId)
      
      if (authError || !authUser) {
        return {
          user: null,
          canView: false,
          error: 'User not found'
        }
      }

      // Get user role and permissions
      const { data: userRole, error: roleError } = await this.supabase
        .from('user_roles')
        .select('role, permissions, created_at, updated_at')
        .eq('user_id', userId)
        .single()

      if (roleError) {
        return {
          user: null,
          canView: false,
          error: 'User role information not found'
        }
      }

      // Get user profile information (if exists)
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('first_name, last_name, phone_number')
        .eq('user_id', userId)
        .single()

      // Build comprehensive user information
      const userInfo: UserSupportInfo = {
        id: authUser.id,
        email: authUser.email || '',
        role: userRole.role as UserRole,
        permissions: this.extractPermissionsFromRole(userRole.role as UserRole),
        lastActive: authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at) : null,
        createdAt: new Date(authUser.created_at),
        updatedAt: new Date(userRole.updated_at),
        profile: profile ? {
          firstName: profile.first_name,
          lastName: profile.last_name,
          phoneNumber: profile.phone_number
        } : undefined,
        rolePermissions: userRole.permissions
      }

      return {
        user: userInfo,
        canView: true
      }
    } catch (error) {
      return {
        user: null,
        canView: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user information'
      }
    }
  }

  async compareUserPermissions(userId: string, adminUserId: string): Promise<PermissionComparison | null> {
    try {
      const userInfo = await this.getUserSupportInfo(userId, adminUserId)
      
      if (!userInfo.canView || !userInfo.user) {
        return null
      }

      const adminPermissions = this.extractPermissionsFromRole('admin')
      const userPermissions = userInfo.user.permissions

      const sharedPermissions = adminPermissions.filter(p => userPermissions.includes(p))
      const adminOnlyPermissions = adminPermissions.filter(p => !userPermissions.includes(p))
      const userOnlyPermissions = userPermissions.filter(p => !adminPermissions.includes(p))

      return {
        adminPermissions,
        userPermissions,
        sharedPermissions,
        adminOnlyPermissions,
        userOnlyPermissions
      }
    } catch (error) {
      return null
    }
  }

  private extractPermissionsFromRole(role: UserRole): string[] {
    // This mirrors the permission logic from the permission service
    const rolePermissions: Record<UserRole, string[]> = {
      admin: [
        'users.view_all', 'users.create', 'users.edit', 'users.delete',
        'system.manage_roles', 'system.view_audit_logs', 'system.manage_settings',
        'guards.view_all', 'guards.create', 'guards.edit', 'guards.delete',
        'guards.edit_profiles', 'guards.assign_shifts', 'guards.manage_applications',
        'shifts.view_all', 'shifts.create', 'shifts.edit', 'shifts.assign',
        'leads.view_all', 'leads.create', 'leads.edit', 'leads.delete',
        'leads.assign', 'leads.manage_pipeline',
        'compliance.view_all', 'compliance.create_reports', 'compliance.manage_audits',
        'reports.view_all', 'reports.create', 'reports.export'
      ],
      manager: [
        'guards.view_all', 'guards.edit_profiles', 'guards.assign_shifts', 'guards.manage_applications',
        'shifts.view_all', 'shifts.create', 'shifts.edit', 'shifts.assign',
        'leads.view_all', 'leads.create', 'leads.edit', 'leads.assign', 'leads.manage_pipeline',
        'compliance.view_all', 'compliance.create_reports',
        'reports.view_all', 'reports.create'
      ],
      guard: [
        'shifts.view_own', 'guards.view_own_profile', 'guards.edit_own_profile'
      ],
      client: [
        'shifts.view_assigned', 'reports.view_assigned'
      ]
    }

    return rolePermissions[role] || []
  }

  async listAllUsers(adminUserId: string, role?: UserRole): Promise<UserSupportInfo[]> {
    try {
      // Verify admin permissions
      const { data: adminRole, error: adminError } = await this.supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', adminUserId)
        .single()

      if (adminError || !adminRole || adminRole.role !== 'admin') {
        throw new Error('Insufficient permissions')
      }

      // Get all users with roles
      let query = this.supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          permissions,
          created_at,
          updated_at
        `)

      if (role) {
        query = query.eq('role', role)
      }

      const { data: userRoles, error: rolesError } = await query.order('created_at', { ascending: false })

      if (rolesError) {
        throw rolesError
      }

      // Get basic auth information for each user
      const users: UserSupportInfo[] = []
      
      for (const userRole of userRoles) {
        try {
          const { data: { user: authUser } } = await this.supabase.auth.admin.getUserById(userRole.user_id)
          
          if (authUser) {
            users.push({
              id: authUser.id,
              email: authUser.email || '',
              role: userRole.role as UserRole,
              permissions: this.extractPermissionsFromRole(userRole.role as UserRole),
              lastActive: authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at) : null,
              createdAt: new Date(authUser.created_at),
              updatedAt: new Date(userRole.updated_at),
              rolePermissions: userRole.permissions
            })
          }
        } catch (userError) {
          // Continue with other users
        }
      }

      return users
    } catch (error) {
      return []
    }
  }

  // Safe, read-only operations for user support
  isUserActive(user: UserSupportInfo): boolean {
    if (!user.lastActive) return false
    
    const now = new Date()
    const lastActive = new Date(user.lastActive)
    const daysSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    
    return daysSinceActive <= 30 // Active within last 30 days
  }

  getUserRoleLevel(role: UserRole): number {
    const levels = { client: 1, guard: 2, manager: 3, admin: 4 }
    return levels[role] || 0
  }

  formatUserDisplayName(user: UserSupportInfo): string {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
    }
    return user.email.split('@')[0]
  }

  getUserPermissionSummary(user: UserSupportInfo): { total: number; categories: Record<string, number> } {
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
  }
}

// Export singleton instance
export const userSupportService = new UserSupportService()