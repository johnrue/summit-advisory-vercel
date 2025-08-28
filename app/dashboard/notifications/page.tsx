"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell,
  Search,
  Filter,
  RefreshCw,
  Settings,
  MoreVertical,
  Check,
  CheckCheck,
  AlertTriangle,
  Info,
  Calendar,
  Users,
  Shield,
  Clock
} from 'lucide-react'
import { NotificationService } from '@/lib/services/notification-service'
import type { 
  Notification, 
  NotificationFilter,
  NotificationStats,
  NotificationCategory,
  NotificationPriority 
} from '@/lib/types/notification-types'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format } from 'date-fns'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'urgent'>('all')
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all')
  const [selectedPriority, setSelectedPriority] = useState<NotificationPriority | 'all'>('all')

  const notificationService = NotificationService.getInstance()
  // TODO: Get actual user ID from auth context
  const userId = 'current-user-id'

  useEffect(() => {
    loadNotifications()
    loadStats()
  }, [])

  useEffect(() => {
    filterNotifications()
  }, [notifications, searchTerm, activeTab, selectedCategory, selectedPriority])

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      const result = await notificationService.getNotifications(userId, { limit: 100 })
      if (result.success) {
        setNotifications(result.data)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const result = await notificationService.getNotificationStats(userId)
      if (result.success) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const filterNotifications = () => {
    let filtered = notifications

    // Apply tab filter
    switch (activeTab) {
      case 'unread':
        filtered = filtered.filter(n => !n.is_read)
        break
      case 'urgent':
        filtered = filtered.filter(n => n.priority === 'urgent' || n.priority === 'emergency')
        break
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(n => n.category === selectedCategory)
    }

    // Apply priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(n => n.priority === selectedPriority)
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredNotifications(filtered)
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const result = await notificationService.markAsRead(notificationId)
      if (result.success) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        )
      }
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const result = await notificationService.markAllAsRead(userId)
      if (result.success) {
        setNotifications(prev => 
          prev.map(n => ({ 
            ...n, 
            is_read: true, 
            read_at: new Date().toISOString() 
          }))
        )
        await loadStats()
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'schedule':
        return <Calendar className="h-4 w-4" />
      case 'assignments':
        return <Users className="h-4 w-4" />
      case 'compliance':
        return <Shield className="h-4 w-4" />
      case 'emergency':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case 'emergency':
        return <Badge variant="destructive" className="text-xs">Emergency</Badge>
      case 'urgent':
        return <Badge variant="destructive" className="text-xs">Urgent</Badge>
      case 'high':
        return <Badge className="text-xs bg-orange-500">High</Badge>
      case 'normal':
        return <Badge variant="secondary" className="text-xs">Normal</Badge>
      case 'low':
        return <Badge variant="outline" className="text-xs">Low</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground">
            Manage your notifications and stay updated on important events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadNotifications} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_count}</div>
              <p className="text-xs text-muted-foreground">All notifications</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
              <CheckCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unread_count}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgent</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.urgent_count}</div>
              <p className="text-xs text-muted-foreground">Require immediate action</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Emergency</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.emergency_count}</div>
              <p className="text-xs text-muted-foreground">Critical issues</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="border border-input bg-background px-3 py-2 text-sm rounded-md"
              >
                <option value="all">All Categories</option>
                <option value="schedule">Schedule</option>
                <option value="assignments">Assignments</option>
                <option value="availability">Availability</option>
                <option value="compliance">Compliance</option>
                <option value="emergency">Emergency</option>
                <option value="system">System</option>
              </select>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as any)}
                className="border border-input bg-background px-3 py-2 text-sm rounded-md"
              >
                <option value="all">All Priorities</option>
                <option value="emergency">Emergency</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
            {stats && stats.unread_count > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Notifications List */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({stats?.unread_count || 0})
          </TabsTrigger>
          <TabsTrigger value="urgent">
            Urgent ({(stats?.urgent_count || 0) + (stats?.emergency_count || 0)})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <ScrollArea className="h-[600px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading notifications...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No notifications found</h3>
                  <p className="text-sm">
                    {searchTerm || selectedCategory !== 'all' || selectedPriority !== 'all'
                      ? 'Try adjusting your filters'
                      : 'You\'re all caught up!'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 hover:bg-accent/50 transition-colors cursor-pointer",
                        !notification.is_read && "bg-primary/5 border-l-4 border-primary"
                      )}
                      onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Category Icon */}
                        <div className={cn(
                          "p-2 rounded-full mt-1",
                          notification.category === 'emergency' ? "bg-red-100 text-red-600" :
                          notification.category === 'schedule' ? "bg-blue-100 text-blue-600" :
                          notification.category === 'assignments' ? "bg-green-100 text-green-600" :
                          notification.category === 'compliance' ? "bg-yellow-100 text-yellow-600" :
                          "bg-gray-100 text-gray-600"
                        )}>
                          {getCategoryIcon(notification.category)}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className={cn(
                              "font-medium text-sm",
                              !notification.is_read && "text-primary font-semibold"
                            )}>
                              {notification.title}
                            </h3>
                            <div className="flex items-center gap-2">
                              {getPriorityBadge(notification.priority)}
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-primary rounded-full" />
                              )}
                            </div>
                          </div>

                          {/* Message */}
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {notification.message}
                          </p>

                          {/* Footer */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </div>
                              <span className="capitalize">{notification.category}</span>
                            </div>
                            
                            {notification.acknowledged_at && (
                              <div className="flex items-center gap-1 text-green-600">
                                <Check className="h-3 w-3" />
                                Acknowledged
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          {notification.action_data?.actions && (
                            <div className="flex gap-2 mt-3">
                              {notification.action_data.actions.slice(0, 3).map((action: any) => (
                                <Button
                                  key={action.id}
                                  variant={action.style === 'primary' ? 'default' : action.style === 'danger' ? 'destructive' : 'secondary'}
                                  size="sm"
                                  className="text-xs h-7 px-3"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (action.url) {
                                      window.location.href = action.url
                                    }
                                  }}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}