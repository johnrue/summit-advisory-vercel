'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useUserRole, type UserRole } from '@/hooks/use-user-role'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles = ['admin', 'manager', 'guard'], 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { role, loading: roleLoading } = useUserRole()

  useEffect(() => {
    // Don't redirect while still loading
    if (authLoading || roleLoading) return

    // If no user, redirect to login
    if (!user) {
      router.push(`${redirectTo}?redirectTo=${window.location.pathname}`)
      return
    }

    // If user has role but not allowed, redirect to appropriate dashboard
    if (role && !allowedRoles.includes(role)) {
      let redirectPath = '/dashboard'
      
      switch (role) {
        case 'admin':
          redirectPath = '/dashboard/admin/overview'
          break
        case 'manager':
          redirectPath = '/dashboard/manager/overview'
          break
        case 'guard':
          redirectPath = '/dashboard/guard/overview'
          break
        default:
          redirectPath = '/dashboard'
      }
      
      router.push(redirectPath)
      return
    }
  }, [user, role, authLoading, roleLoading, router, allowedRoles, redirectTo])

  // Show loading state while checking auth
  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-medium">Checking authentication...</h3>
            <p className="text-sm text-muted-foreground">
              Verifying your permissions
            </p>
          </div>
        </div>
      </div>
    )
  }

  // If no user, don't render anything (redirect is happening)
  if (!user) {
    return null
  }

  // If user doesn't have the right role, don't render anything (redirect is happening)
  if (role && !allowedRoles.includes(role)) {
    return null
  }

  // User is authenticated and has the right role
  return <>{children}</>
}