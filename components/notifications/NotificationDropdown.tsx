"use client"

import { useState, useRef, useEffect } from 'react'
import { 
  Check, 
  CheckCheck, 
  Clock, 
  RefreshCw, 
  Settings, 
  X,
  AlertTriangle,
  Info,
  Calendar,
  Users,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { NotificationService } from '@/lib/services/notification-service'
import type { Notification, NotificationCategory, NotificationPriority } from '@/lib/types/notification-types'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  onNotificationRead: (id: string) => void
  onMarkAllRead: () => void
  onRefresh: () => void
}

export function NotificationDropdown({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  isLoading,
  onNotificationRead,
  onMarkAllRead,
  onRefresh
}: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all')
  const notificationService = NotificationService.getInstance()

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.is_read
      case 'urgent':
        return notification.priority === 'urgent' || notification.priority === 'emergency'
      default:
        return true
    }
  })

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      const result = await notificationService.markAsRead(notification.id)
      if (result.success) {
        onNotificationRead(notification.id)
      }
    }

    // Handle action data if present
    if (notification.action_data?.actions?.[0]?.url) {
      window.location.href = notification.action_data.actions[0].url
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
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 rounded-md border bg-popover p-0 shadow-md z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b">
        {[
          { key: 'all', label: 'All', count: notifications.length },
          { key: 'unread', label: 'Unread', count: unreadCount },
          { 
            key: 'urgent', 
            label: 'Urgent', 
            count: notifications.filter(n => n.priority === 'urgent' || n.priority === 'emergency').length 
          }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
              filter === tab.key
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 text-xs opacity-60">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Actions */}
      {unreadCount > 0 && (
        <div className="p-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={onMarkAllRead}
          >
            <CheckCheck className="h-3 w-3 mr-2" />
            Mark all as read
          </Button>
        </div>
      )}

      {/* Notifications list */}
      <ScrollArea className="max-h-96">
        <div className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Check className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">
                {filter === 'unread' 
                  ? 'No unread notifications' 
                  : filter === 'urgent'
                  ? 'No urgent notifications'
                  : 'No notifications'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification, index) => (
              <div key={notification.id}>
                <button
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full p-4 text-left hover:bg-accent/50 transition-colors",
                    !notification.is_read && "bg-primary/5 border-l-4 border-primary"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Category Icon */}
                    <div className={cn(
                      "p-2 rounded-full mt-0.5",
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
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className={cn(
                          "font-medium text-sm truncate",
                          !notification.is_read && "text-primary"
                        )}>
                          {notification.title}
                        </h4>
                        {getPriorityBadge(notification.priority)}
                      </div>

                      {/* Message */}
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {notification.message}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </div>
                        
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>

                      {/* Action buttons */}
                      {notification.action_data?.actions && (
                        <div className="flex gap-1 mt-2">
                          {notification.action_data.actions.slice(0, 2).map((action: any) => (
                            <Button
                              key={action.id}
                              variant={action.style === 'primary' ? 'default' : 'secondary'}
                              size="sm"
                              className="text-xs h-6 px-2"
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
                {index < filteredNotifications.length - 1 && <Separator />}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-xs"
          onClick={() => {
            onClose()
            window.location.href = '/dashboard/notifications'
          }}
        >
          <Settings className="h-3 w-3 mr-2" />
          View all notifications
        </Button>
      </div>
    </div>
  )
}