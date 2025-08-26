'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { useUserRole, hasAnyRole } from '@/hooks/use-user-role'
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('admin' | 'manager' | 'guard' | 'client')[]
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  fallback 
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth()
  const { role, loading: roleLoading, error: roleError } = useUserRole()
  const router = useRouter()

  const isLoading = authLoading || roleLoading

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to login with current path as return URL
      const currentPath = window.location.pathname
      router.push(`/login?redirectTo=${encodeURIComponent(currentPath)}`)
    }
  }, [user, isLoading, router])

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show fallback or redirect to login
  if (!user) {
    return fallback || (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
          <p className="text-muted-foreground mb-4">Please log in to continue</p>
        </div>
      </div>
    )
  }

  // Role-based access control
  if (allowedRoles && allowedRoles.length > 0) {
    if (roleError) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Error</h1>
            <p className="text-muted-foreground mb-4">Unable to verify permissions</p>
            <p className="text-sm text-red-500">{roleError}</p>
          </div>
        </div>
      )
    }

    if (!hasAnyRole(role, allowedRoles)) {
      return fallback || (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this page
            </p>
            <p className="text-sm text-muted-foreground">
              Required role: {allowedRoles.join(' or ')} | Your role: {role || 'unknown'}
            </p>
          </div>
        </div>
      )
    }
  }

  return (
    <AuthErrorBoundary>
      {children}
    </AuthErrorBoundary>
  )
}

// Convenience components for specific roles
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      {children}
    </ProtectedRoute>
  )
}

export function ManagerRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['admin', 'manager']}>
      {children}
    </ProtectedRoute>
  )
}

export function GuardRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['admin', 'manager', 'guard']}>
      {children}
    </ProtectedRoute>
  )
}