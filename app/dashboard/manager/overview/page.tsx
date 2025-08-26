'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserManagementGate } from '@/components/auth/permission-gate'
import { useAuth } from '@/lib/auth/auth-context'
import {
  Calendar,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Briefcase,
  TrendingUp,
  Bell,
  ArrowRight,
  Plus
} from 'lucide-react'

interface ManagerStats {
  teamSize: number
  activeShifts: number
  pendingApprovals: number
  upcomingSchedules: number
  performanceScore: number
  urgentItems: Array<{
    id: string
    type: 'approval' | 'schedule' | 'incident'
    title: string
    priority: 'high' | 'medium' | 'low'
    time: string
  }>
}

export default function ManagerOverviewPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<ManagerStats>({
    teamSize: 0,
    activeShifts: 0,
    pendingApprovals: 0,
    upcomingSchedules: 0,
    performanceScore: 0,
    urgentItems: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Replace with actual API call in future epic
    const fetchManagerStats = async () => {
      try {
        // Simulated data for MVP - will be replaced with real API
        setTimeout(() => {
          setStats({
            teamSize: 12,
            activeShifts: 8,
            pendingApprovals: 3,
            upcomingSchedules: 15,
            performanceScore: 94,
            urgentItems: [
              {
                id: '1',
                type: 'approval',
                title: 'Guard shift change request',
                priority: 'high',
                time: '2 hours ago'
              },
              {
                id: '2',
                type: 'schedule',
                title: 'Weekend coverage gap',
                priority: 'high',
                time: '4 hours ago'
              },
              {
                id: '3',
                type: 'incident',
                title: 'Equipment maintenance needed',
                priority: 'medium',
                time: '6 hours ago'
              }
            ]
          })
          setLoading(false)
        }, 1000)
      } catch (error) {
        console.error('Failed to fetch manager stats:', error)
        setLoading(false)
      }
    }

    fetchManagerStats()
  }, [])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return <CheckCircle2 className="h-4 w-4" />
      case 'schedule':
        return <Calendar className="h-4 w-4" />
      case 'incident':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <UserManagementGate>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manager Dashboard</h1>
            <p className="text-muted-foreground">
              Team operations and management overview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs font-medium">
              MANAGER
            </Badge>
            <span className="text-sm text-muted-foreground">
              Team Size: {loading ? '-' : stats.teamSize}
            </span>
          </div>
        </div>

        {/* Urgent Items Alert */}
        {!loading && stats.urgentItems.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              You have {stats.urgentItems.filter(item => item.priority === 'high').length} high-priority items requiring immediate attention.
            </AlertDescription>
          </Alert>
        )}

        {/* Operational Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Size</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '-' : stats.teamSize}
              </div>
              <p className="text-xs text-muted-foreground">
                Guards under supervision
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Shifts</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '-' : stats.activeShifts}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently on duty
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '-' : stats.pendingApprovals}
              </div>
              <p className="text-xs text-muted-foreground">
                Require your action
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPerformanceColor(stats.performanceScore)}`}>
                {loading ? '-' : `${stats.performanceScore}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                Team efficiency score
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions and Urgent Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Common management tasks and workflows
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button variant="outline" className="justify-start" disabled>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Shift
                </Button>
                <Button variant="outline" className="justify-start" disabled>
                  <Users className="h-4 w-4 mr-2" />
                  Assign Guards
                </Button>
                <Button variant="outline" className="justify-start" disabled>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve Request
                </Button>
                <Button variant="outline" className="justify-start" disabled>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground text-center">
                Actions will be available in future epics
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Urgent Items
                {!loading && stats.urgentItems.length > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {stats.urgentItems.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Items requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading urgent items...</p>
              ) : stats.urgentItems.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-sm font-medium text-green-600">All caught up!</p>
                  <p className="text-xs text-muted-foreground">No urgent items require attention</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.urgentItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border ${getPriorityColor(item.priority)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <div>
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs opacity-75 capitalize">{item.type} • {item.time}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notifications Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Manager Notifications
            </CardTitle>
            <CardDescription>
              Updates and alerts for management workflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading notifications...</p>
              ) : (
                <>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Weekly schedule submitted</p>
                        <p className="text-xs text-muted-foreground">Team schedule for next week ready for review</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">1 hour ago</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Guard training completed</p>
                        <p className="text-xs text-muted-foreground">3 guards completed mandatory safety training</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">3 hours ago</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 bg-yellow-600 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Equipment inspection due</p>
                        <p className="text-xs text-muted-foreground">Monthly equipment check scheduled for tomorrow</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">5 hours ago</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </UserManagementGate>
  )
}