'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/auth/supabase'

export type UserRole = 'admin' | 'manager' | 'guard' | 'client'

interface UseUserRoleReturn {
  role: UserRole | null
  loading: boolean
  error: string | null
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth()
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setRole(null)
      setLoading(false)
      return
    }

    const fetchUserRole = async () => {
      try {
        setLoading(true)
        setError(null)

        // First check user metadata for role (fallback for new users)
        const metadataRole = user.user_metadata?.role as UserRole
        
        // Try to get role from database
        const supabase = createClient()
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          // PGRST116 is "not found" - acceptable for new users
          throw error
        }

        // Use database role if available, otherwise fallback to metadata, then default to 'guard'
        const finalRole = data?.role || metadataRole || 'guard'
        setRole(finalRole as UserRole)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user role'
        setError(errorMessage)
        // Fallback to metadata or default role on error
        const fallbackRole = user.user_metadata?.role as UserRole || 'guard'
        setRole(fallbackRole)
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [user])

  return { role, loading, error }
}

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<UserRole, number> = {
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
  
  return allowedRoles.some(role => hasPermission(userRole, role))
}