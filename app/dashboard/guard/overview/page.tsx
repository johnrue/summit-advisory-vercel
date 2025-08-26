'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/auth/auth-context'
import {
  Calendar,
  MapPin,
  Clock,
  User,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Bell,
  Briefcase,
  Settings,
  Phone,
  ArrowRight
} from 'lucide-react'

interface GuardStats {
  currentStatus: 'on_duty' | 'off_duty' | 'scheduled'
  currentShift?: {
    location: string
    startTime: string
    endTime: string
    supervisor: string
  }
  upcomingShifts: number
  completedHours: number
  certificationsStatus: 'current' | 'expiring' | 'expired'
  nextShift?: {
    date: string
    location: string
    duration: string
  }
  notifications: Array<{
    id: string
    type: 'shift' | 'training' | 'alert' | 'update'
    title: string
    message: string
    priority: 'high' | 'medium' | 'low'
    time: string
    read: boolean
  }>
}

export default function GuardOverviewPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<GuardStats>({
    currentStatus: 'off_duty',
    upcomingShifts: 0,
    completedHours: 0,
    certificationsStatus: 'current',
    notifications: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Replace with actual API call in future epic
    const fetchGuardStats = async () => {
      try {
        // Simulated data for MVP - will be replaced with real API
        setTimeout(() => {
          setStats({
            currentStatus: 'on_duty',
            currentShift: {
              location: 'Downtown Office Complex',
              startTime: '06:00 AM',
              endTime: '02:00 PM',
              supervisor: 'Manager Smith'
            },
            upcomingShifts: 5,
            completedHours: 168,
            certificationsStatus: 'current',
            nextShift: {
              date: 'Tomorrow',
              location: 'Retail Center North',
              duration: '8 hours'
            },
            notifications: [
              {
                id: '1',
                type: 'shift',
                title: 'Shift Assignment Updated',
                message: 'Your Thursday shift location has been changed',
                priority: 'high',
                time: '2 hours ago',
                read: false
              },
              {
                id: '2',
                type: 'training',
                title: 'Training Reminder',
                message: 'Monthly safety training due next week',
                priority: 'medium',
                time: '1 day ago',
                read: false
              },
              {
                id: '3',
                type: 'update',
                title: 'Policy Update',
                message: 'New equipment checkout procedures',
                priority: 'low',
                time: '2 days ago',
                read: true
              }
            ]
          })
          setLoading(false)
        }, 1000)
      } catch (error) {
        console.error('Failed to fetch guard stats:', error)
        setLoading(false)
      }
    }

    fetchGuardStats()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_duty':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'off_duty':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getCertificationColor = (status: string) => {
    switch (status) {
      case 'current':
        return 'text-green-600'
      case 'expiring':
        return 'text-yellow-600'
      case 'expired':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'shift':
        return <Calendar className="h-4 w-4" />
      case 'training':
        return <Shield className="h-4 w-4" />
      case 'alert':
        return <AlertTriangle className="h-4 w-4" />
      case 'update':
        return <Bell className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const unreadNotifications = stats.notifications.filter(n => !n.read).length

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Guard Dashboard</h1>
          <p className="text-muted-foreground">
            Your personal schedule and assignment information
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <Badge 
            variant="secondary" 
            className={`text-xs font-medium border ${getStatusColor(stats.currentStatus)}`}
          >
            {stats.currentStatus === 'on_duty' ? '🟢 ON DUTY' : 
             stats.currentStatus === 'scheduled' ? '🟡 SCHEDULED' : '⚫ OFF DUTY'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {user?.user_metadata?.first_name || user?.email}
          </span>
        </div>
      </div>

      {/* Current Shift Alert */}
      {!loading && stats.currentShift && stats.currentStatus === 'on_duty' && (
        <Alert className="border-green-200 bg-green-50">
          <Shield className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            You are currently on duty at <strong>{stats.currentShift.location}</strong> until <strong>{stats.currentShift.endTime}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Personal Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {loading ? '-' : stats.currentStatus.replace('_', ' ')}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.currentShift ? `At ${stats.currentShift.location}` : 'Available for assignment'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '-' : stats.upcomingShifts}
            </div>
            <p className="text-xs text-muted-foreground">
              Next 2 weeks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours This Month</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '-' : stats.completedHours}
            </div>
            <p className="text-xs text-muted-foreground">
              Hours completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certifications</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold capitalize ${getCertificationColor(stats.certificationsStatus)}`}>
              {loading ? '-' : stats.certificationsStatus}
            </div>
            <p className="text-xs text-muted-foreground">
              All requirements met
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Assignment and Personal Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Current Assignment
            </CardTitle>
            <CardDescription>
              Active shift details and location information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading assignment details...</p>
            ) : stats.currentShift ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{stats.currentShift.location}</h4>
                    <p className="text-sm text-muted-foreground">Current Location</p>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    Active
                  </Badge>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Start Time</p>
                    <p className="text-muted-foreground">{stats.currentShift.startTime}</p>
                  </div>
                  <div>
                    <p className="font-medium">End Time</p>
                    <p className="text-muted-foreground">{stats.currentShift.endTime}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-medium">Supervisor</p>
                    <p className="text-muted-foreground flex items-center gap-2">
                      {stats.currentShift.supervisor}
                      <Button variant="ghost" size="sm" className="h-6 p-1">
                        <Phone className="h-3 w-3" />
                      </Button>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Clock className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium">No Active Assignment</p>
                <p className="text-xs text-muted-foreground">You are currently off duty</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Next Shift
            </CardTitle>
            <CardDescription>
              Upcoming assignment details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading schedule...</p>
            ) : stats.nextShift ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{stats.nextShift.location}</h4>
                    <p className="text-sm text-muted-foreground">{stats.nextShift.date}</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                    Scheduled
                  </Badge>
                </div>
                <Separator />
                <div className="text-sm">
                  <p className="font-medium">Duration</p>
                  <p className="text-muted-foreground">{stats.nextShift.duration}</p>
                </div>
                <Button variant="outline" size="sm" className="w-full" disabled>
                  View Full Schedule
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium">No Upcoming Shifts</p>
                <p className="text-xs text-muted-foreground">Check back later for assignments</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profile Management and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Management
            </CardTitle>
            <CardDescription>
              Update your personal information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start" disabled>
                <User className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <Calendar className="h-4 w-4 mr-2" />
                Availability
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <Settings className="h-4 w-4 mr-2" />
                Preferences
              </Button>
              <Button variant="outline" className="justify-start" disabled>
                <Shield className="h-4 w-4 mr-2" />
                Certifications
              </Button>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground text-center">
              Profile features will be available in future epics
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </div>
              {unreadNotifications > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadNotifications}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Important updates and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            ) : stats.notifications.length === 0 ? (
              <div className="text-center py-6">
                <Bell className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium">No Notifications</p>
                <p className="text-xs text-muted-foreground">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {stats.notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border ${
                      !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        {getNotificationIcon(notification.type)}
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${!notification.read ? 'text-blue-900' : 'text-gray-900'}`}>
                            {notification.title}
                          </p>
                          <p className={`text-xs ${!notification.read ? 'text-blue-700' : 'text-gray-600'}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}