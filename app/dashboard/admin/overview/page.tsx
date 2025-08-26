'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SystemAdminGate } from '@/components/auth/permission-gate'
import { useAuth } from '@/lib/auth/auth-context'
import {
  Users,
  Shield,
  Activity,
  Clock,
  UserCog,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'

interface SystemStats {
  totalUsers: number
  activeGuards: number
  pendingApplications: number
  recentActivities: number
  systemHealth: 'healthy' | 'warning' | 'error'
}

export default function AdminOverviewPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeGuards: 0,
    pendingApplications: 0,
    recentActivities: 0,
    systemHealth: 'healthy'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Replace with actual API call in future epic
    const fetchSystemStats = async () => {
      try {
        // Simulated data for MVP - will be replaced with real API
        setTimeout(() => {
          setStats({
            totalUsers: 24,
            activeGuards: 18,
            pendingApplications: 3,
            recentActivities: 12,
            systemHealth: 'healthy'
          })
          setLoading(false)
        }, 1000)
      } catch (error) {
        console.error('Failed to fetch system stats:', error)
        setLoading(false)
      }
    }

    fetchSystemStats()
  }, [])

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'error':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <CheckCircle2 className="h-4 w-4" />
    }
  }

  return (
    <SystemAdminGate>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              System overview and administrative controls
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs font-medium">
              ADMIN
            </Badge>
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
          </div>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '-' : stats.totalUsers}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all roles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Guards</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '-' : stats.activeGuards}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently employed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '-' : stats.pendingApplications}
              </div>
              <p className="text-xs text-muted-foreground">
                Require review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-2 ${getHealthColor(stats.systemHealth)}`}>
                {getHealthIcon(stats.systemHealth)}
                <span className="capitalize">{loading ? 'Loading' : stats.systemHealth}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                All systems operational
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Role Assignments</span>
                <Link href="/dashboard/admin/role-management">
                  <Button variant="outline" size="sm">
                    Manage Roles
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Admins:</span>
                  <span className="font-medium">2</span>
                </div>
                <div className="flex justify-between">
                  <span>Managers:</span>
                  <span className="font-medium">4</span>
                </div>
                <div className="flex justify-between">
                  <span>Guards:</span>
                  <span className="font-medium">{loading ? '-' : stats.activeGuards}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Platform Analytics
              </CardTitle>
              <CardDescription>
                System performance and usage metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Recent Activity</span>
                <Badge variant="secondary">
                  {loading ? '-' : stats.recentActivities} events
                </Badge>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Login Sessions:</span>
                  <span className="font-medium">15</span>
                </div>
                <div className="flex justify-between">
                  <span>API Requests:</span>
                  <span className="font-medium">1,247</span>
                </div>
                <div className="flex justify-between">
                  <span>Data Storage:</span>
                  <span className="font-medium">42.3 MB</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Admin Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Admin Activities</CardTitle>
            <CardDescription>
              Latest administrative actions and system events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading recent activities...</p>
              ) : (
                <>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <UserCog className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Role assignment updated</p>
                        <p className="text-xs text-muted-foreground">Guard promoted to Manager role</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">2 hours ago</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">New guard application</p>
                        <p className="text-xs text-muted-foreground">Application submitted for review</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">4 hours ago</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">System backup completed</p>
                        <p className="text-xs text-muted-foreground">All data successfully backed up</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">6 hours ago</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SystemAdminGate>
  )
}