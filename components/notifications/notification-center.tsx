"use client"

import { useState, useEffect } from 'react'
import { Bell, CheckCircle, AlertTriangle, Info, X, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { 
  Notification, 
  NotificationPriority, 
  NotificationCategory,
  NotificationStats
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface NotificationCenterProps {
  userId: string
  className?: string
}

export default function NotificationCenter({ userId, className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    if (userId) {
      fetchNotifications()
      fetchStats()
    }
  }, [userId])

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications?userId=${userId}&limit=50`)
      const data = await response.json()
      
      if (data.success) {
        setNotifications(data.notifications)
        // Subscribe to real-time updates after initial load
        subscribeToNotifications()
      } else {
        console.error('Failed to fetch notifications:', data.error)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToNotifications = () => {
    // In a real implementation, this would set up Supabase real-time subscription
    // For now, we'll poll for updates periodically
    const intervalId = setInterval(() => {
      fetchStats() // Refresh stats periodically for real-time badge updates
    }, 30000) // Every 30 seconds

    return () => clearInterval(intervalId)
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/notifications/stats?userId=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          action: 'read',
          userId
        })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        )
        fetchStats() // Refresh stats
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const acknowledge = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          action: 'acknowledge',
          userId
        })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, acknowledgedAt: new Date().toISOString() }
              : n
          )
        )
      }
    } catch (error) {
      console.error('Error acknowledging notification:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        )
        fetchStats()
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const getPriorityIcon = (priority: NotificationPriority) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'normal':
        return <Info className="h-4 w-4 text-blue-500" />
      case 'low':
        return <Info className="h-4 w-4 text-gray-400" />
      default:
        return <Info className="h-4 w-4 text-gray-400" />
    }
  }

  const getCategoryColor = (category: NotificationCategory) => {
    switch (category) {
      case 'emergency':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'compliance':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'scheduling':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'hiring':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'system':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const filterNotifications = (notifications: Notification[], tab: string) => {
    switch (tab) {
      case 'unread':
        return notifications.filter(n => !n.isRead)
      case 'critical':
        return notifications.filter(n => n.priority === 'critical' || n.priority === 'high')
      case 'today':
        const today = new Date().toDateString()
        return notifications.filter(n => new Date(n.createdAt).toDateString() === today)
      default:
        return notifications
    }
  }

  const filteredNotifications = filterNotifications(notifications, activeTab)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("relative", className)}
        >
          <Bell className="h-5 w-5" />
          {stats && stats.unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {stats.unreadCount > 99 ? '99+' : stats.unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Notifications
            <div className="flex gap-2">
              {stats && stats.unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </SheetTitle>
        </SheetHeader>

        {stats && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Card>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">{stats.totalNotifications}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-red-600">{stats.unreadCount}</div>
                <div className="text-xs text-muted-foreground">Unread</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
            <TabsTrigger value="critical" className="text-xs">Critical</TabsTrigger>
            <TabsTrigger value="today" className="text-xs">Today</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <ScrollArea className="h-[600px]">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-sm text-muted-foreground">Loading notifications...</div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-sm text-muted-foreground">No notifications found</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification, index) => (
                    <Card
                      key={notification.id}
                      className={cn(
                        "transition-colors hover:bg-muted/50",
                        !notification.isRead && "border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                              {getPriorityIcon(notification.priority)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-medium leading-5">
                                  {notification.title}
                                </h4>
                                {!notification.isRead && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markAsRead(notification.id)}
                                    className="h-6 w-6 p-0 shrink-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 leading-5">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge 
                                  variant="secondary" 
                                  className={cn("text-xs", getCategoryColor(notification.category))}
                                >
                                  {notification.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(notification.createdAt), 'MMM d, HH:mm')}
                                </span>
                              </div>
                              {notification.priority === 'critical' && !notification.acknowledgedAt && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => acknowledge(notification.id)}
                                  className="mt-2 h-7 text-xs"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Acknowledge
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}