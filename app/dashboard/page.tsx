'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/hooks/use-user-role'
import { useAuth } from '@/lib/auth/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { role, loading } = useUserRole()

  useEffect(() => {
    // Redirect users to their role-specific overview pages
    if (!loading && role) {
      switch (role) {
        case 'admin':
          router.replace('/dashboard/admin/overview')
          break
        case 'manager':
          router.replace('/dashboard/manager/overview')
          break
        case 'guard':
          router.replace('/dashboard/guard/overview')
          break
        case 'client':
          // Client role falls back to generic dashboard for now
          break
        default:
          // Unknown role, stay on generic dashboard
          break
      }
    }
  }, [role, loading, router])

  // Show loading state while determining user role
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-medium">Loading your dashboard...</h3>
            <p className="text-sm text-muted-foreground">
              Determining your role and permissions
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Fallback dashboard for clients or unknown roles
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.user_metadata?.first_name || user?.email}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Access Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <div>
              <strong>Email:</strong> {user?.email}
            </div>
            <div>
              <strong>Role:</strong> {role || 'Not assigned'}
            </div>
            <div>
              <strong>Account Status:</strong> Active
            </div>
          </div>
          {role === 'client' && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Client Access:</strong> Your account has client-level access. 
                Contact your administrator if you need additional permissions.
              </p>
            </div>
          )}
          {!role && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Role Assignment Pending:</strong> Your role has not been assigned yet. 
                Please contact your administrator to configure your account access.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}