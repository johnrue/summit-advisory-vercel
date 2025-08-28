"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  Bell,
  Smartphone,
  Eye,
  TrendingUp
} from 'lucide-react'
import { NotificationDeliveryService } from '@/lib/services/notification-delivery-service'
import { NotificationService } from '@/lib/services/notification-service'
import type { 
  Notification, 
  NotificationHistory as NotificationHistoryType,
  NotificationFilter,
  DeliveryStatus,
  NotificationPriority,
  NotificationCategory
} from '@/lib/types/notification-types'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'

interface NotificationHistoryProps {
  userId: string
  className?: string
}

interface HistoryFilter {
  search?: string
  category?: NotificationCategory | 'all'
  priority?: NotificationPriority | 'all'
  deliveryStatus?: DeliveryStatus | 'all'
  deliveryChannel?: string | 'all'
  dateFrom?: string
  dateTo?: string
}

export function NotificationHistory({ userId, className }: NotificationHistoryProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<HistoryFilter>({
    category: 'all',
    priority: 'all',
    deliveryStatus: 'all',
    deliveryChannel: 'all'
  })
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null)
  const [deliveryHistory, setDeliveryHistory] = useState<Record<string, NotificationHistoryType[]>>({})

  const notificationService = NotificationService.getInstance()
  const deliveryService = NotificationDeliveryService.getInstance()

  useEffect(() => {
    loadNotificationHistory()
  }, [userId])

  useEffect(() => {
    filterNotifications()
  }, [notifications, filter])

  const loadNotificationHistory = async () => {
    try {
      setIsLoading(true)
      const result = await notificationService.getNotifications(userId, { 
        limit: 100,
        // Load all notifications for history view
      })

      if (result.success) {
        setNotifications(result.data)
      }
    } catch (error) {
      console.error('Error loading notification history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDeliveryHistory = async (notificationId: string) => {
    try {
      const result = await deliveryService.getDeliveryHistory(notificationId)
      if (result.success) {
        setDeliveryHistory(prev => ({
          ...prev,
          [notificationId]: result.data
        }))
      }
    } catch (error) {
      console.error('Error loading delivery history:', error)
    }
  }

  const filterNotifications = () => {
    let filtered = notifications

    // Apply search filter
    if (filter.search) {
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(filter.search!.toLowerCase()) ||
        n.message.toLowerCase().includes(filter.search!.toLowerCase())
      )
    }

    // Apply category filter
    if (filter.category && filter.category !== 'all') {
      filtered = filtered.filter(n => n.category === filter.category)
    }

    // Apply priority filter
    if (filter.priority && filter.priority !== 'all') {
      filtered = filtered.filter(n => n.priority === filter.priority)
    }

    // Apply delivery status filter
    if (filter.deliveryStatus && filter.deliveryStatus !== 'all') {
      filtered = filtered.filter(n => n.delivery_status === filter.deliveryStatus)
    }

    // Apply delivery channel filter
    if (filter.deliveryChannel && filter.deliveryChannel !== 'all') {
      filtered = filtered.filter(n => n.delivery_channels.includes(filter.deliveryChannel!))
    }

    // Apply date filters
    if (filter.dateFrom) {
      filtered = filtered.filter(n => 
        new Date(n.created_at) >= new Date(filter.dateFrom!)
      )
    }

    if (filter.dateTo) {
      filtered = filtered.filter(n => 
        new Date(n.created_at) <= new Date(filter.dateTo!)
      )
    }

    setFilteredNotifications(filtered)
  }

  const handleNotificationClick = async (notificationId: string) => {
    setSelectedNotification(selectedNotification === notificationId ? null : notificationId)
    
    if (!deliveryHistory[notificationId]) {
      await loadDeliveryHistory(notificationId)
    }
  }

  const exportHistory = () => {
    const data = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      notifications: filteredNotifications,
      delivery_history: deliveryHistory
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notification-history-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusIcon = (status: DeliveryStatus) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'bounced':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'retrying':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'in_app':
        return <Bell className="h-4 w-4 text-blue-600" />
      case 'email':
        return <Mail className="h-4 w-4 text-green-600" />
      case 'sms':
        return <Smartphone className="h-4 w-4 text-purple-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
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

  const getCategoryBadge = (category: NotificationCategory) => {
    const categoryColors = {
      schedule: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      assignments: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      availability: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      compliance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      emergency: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      system: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }

    return (
      <Badge variant="outline" className={cn("text-xs", categoryColors[category])}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </Badge>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification History</h2>
          <p className="text-muted-foreground">
            View and track all your notification deliveries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportHistory}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadNotificationHistory}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={filter.search || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                className="pl-8"
              />
            </div>

            {/* Category Filter */}
            <select
              value={filter.category}
              onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value as any }))}
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

            {/* Priority Filter */}
            <select
              value={filter.priority}
              onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value as any }))}
              className="border border-input bg-background px-3 py-2 text-sm rounded-md"
            >
              <option value="all">All Priorities</option>
              <option value="emergency">Emergency</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={filter.deliveryStatus}
              onChange={(e) => setFilter(prev => ({ ...prev, deliveryStatus: e.target.value as any }))}
              className="border border-input bg-background px-3 py-2 text-sm rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
              <option value="retrying">Retrying</option>
              <option value="bounced">Bounced</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Channel Filter */}
            <select
              value={filter.deliveryChannel}
              onChange={(e) => setFilter(prev => ({ ...prev, deliveryChannel: e.target.value }))}
              className="border border-input bg-background px-3 py-2 text-sm rounded-md"
            >
              <option value="all">All Channels</option>
              <option value="in_app">In-App</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>

            {/* Date From */}
            <div>
              <Input
                type="date"
                value={filter.dateFrom || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
                placeholder="From date"
              />
            </div>

            {/* Date To */}
            <div>
              <Input
                type="date"
                value={filter.dateTo || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value }))}
                placeholder="To date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Notification History ({filteredNotifications.length})</span>
            <Badge variant="outline">
              {filteredNotifications.filter(n => n.delivery_status === 'delivered').length} Delivered
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading history...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No notifications found</h3>
                <p className="text-sm">
                  {Object.values(filter).some(v => v && v !== 'all')
                    ? 'Try adjusting your filters'
                    : 'No notification history available'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <div key={notification.id}>
                    <button
                      onClick={() => handleNotificationClick(notification.id)}
                      className={cn(
                        "w-full p-4 text-left rounded-lg border transition-colors",
                        "hover:bg-accent/50",
                        selectedNotification === notification.id && "bg-accent/30 border-primary"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-sm truncate">
                              {notification.title}
                            </h3>
                            {getPriorityBadge(notification.priority)}
                            {getCategoryBadge(notification.category)}
                          </div>

                          {/* Message */}
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                            {notification.message}
                          </p>

                          {/* Footer */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {getStatusIcon(notification.delivery_status)}
                              <span className="capitalize">{notification.delivery_status}</span>
                            </div>
                            
                            {notification.is_read && (
                              <div className="flex items-center gap-1 text-green-600">
                                <Eye className="h-3 w-3" />
                                Read
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Delivery Channels */}
                        <div className="flex items-center gap-1">
                          {notification.delivery_channels.map(channel => (
                            <div
                              key={channel}
                              className="p-1 rounded bg-muted"
                              title={`Delivered via ${channel}`}
                            >
                              {getChannelIcon(channel)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Delivery History */}
                    {selectedNotification === notification.id && (
                      <div className="ml-4 mt-2 p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                        <h4 className="font-medium text-sm mb-3">Delivery History</h4>
                        
                        {deliveryHistory[notification.id] ? (
                          <div className="space-y-2">
                            {deliveryHistory[notification.id].map((history) => (
                              <div key={history.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  {getChannelIcon(history.delivery_channel)}
                                  <span className="capitalize">{history.delivery_channel}</span>
                                  <span className="text-muted-foreground">
                                    Attempt #{history.delivery_attempt}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1">
                                    {getStatusIcon(history.delivery_status)}
                                    <span className="capitalize">{history.delivery_status}</span>
                                  </div>
                                  
                                  {history.delivery_duration_ms && (
                                    <span className="text-muted-foreground">
                                      {history.delivery_duration_ms}ms
                                    </span>
                                  )}
                                  
                                  <span className="text-muted-foreground">
                                    {formatDistanceToNow(new Date(history.attempted_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Loading delivery history...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}