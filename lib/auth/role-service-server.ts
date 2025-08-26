import { createClient } from './supabase-server'
import type { UserRole } from './role-service'

// Server-side role service for middleware and API routes
export class ServerRoleService {
  async getUserRole(userId: string): Promise<{ role: UserRole | null; error?: string }> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
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

  async assignRole(userId: string, role: UserRole, permissions?: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient()
      
      // Check if user role record already exists
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingRole) {
        // Update existing role
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({
            role,
            permissions: permissions || existingRole.permissions,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (updateError) throw updateError
      } else {
        // Create new role record
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role,
            permissions: permissions || {}
          })

        if (insertError) throw insertError
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign role'
      return { success: false, error: errorMessage }
    }
  }

  async listUsersWithRoles(role?: UserRole): Promise<{ users: any[]; error?: string }> {
    try {
      const supabase = await createClient()
      let query = supabase
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
}

// Export singleton instance
export const serverRoleService = new ServerRoleService()