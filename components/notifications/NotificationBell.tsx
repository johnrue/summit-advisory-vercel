"use client"

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationDropdown } from './NotificationDropdown'
import { NotificationService } from '@/lib/services/notification-service'
import type { Notification } from '@/lib/types/notification-types'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
  userId: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function NotificationBell({ userId, className, size = 'md' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const notificationService = NotificationService.getInstance()

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'h-8 w-8',
      icon: 'h-4 w-4',
      badge: 'h-5 w-5 text-xs'
    },
    md: {
      button: 'h-10 w-10',
      icon: 'h-5 w-5',
      badge: 'h-6 w-6 text-xs'
    },
    lg: {
      button: 'h-12 w-12',
      icon: 'h-6 w-6',
      badge: 'h-7 w-7 text-sm'
    }
  }

  const config = sizeConfig[size]

  // Load initial notifications
  useEffect(() => {
    loadNotifications()
  }, [userId])

  // Set up real-time subscription
  useEffect(() => {
    const subscription = notificationService.subscribeToNotifications(
      userId,
      handleNewNotification
    )

    return () => {
      notificationService.unsubscribeFromNotifications(subscription)
    }
  }, [userId])

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      
      // Load recent notifications
      const result = await notificationService.getNotifications(userId, {
        limit: 50,
        is_read: false
      })

      if (result.success) {
        setNotifications(result.data)
        setUnreadCount(result.data.length)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev])
    setUnreadCount(prev => prev + 1)
    
    // Show toast for high priority notifications
    if (notification.priority === 'urgent' || notification.priority === 'emergency') {
      // Could integrate with toast system here
      console.log('High priority notification received:', notification.title)
    }
  }

  const handleNotificationRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId 
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
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
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          config.button,
          "relative hover:bg-accent focus:bg-accent",
          className
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className={cn(
          config.icon,
          unreadCount > 0 ? "text-primary" : "text-muted-foreground"
        )} />
        
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className={cn(
              config.badge,
              "absolute -top-1 -right-1 flex items-center justify-center rounded-full border-2 border-background min-w-0 p-0"
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
        
        {/* Pulsing indicator for urgent notifications */}
        {notifications.some(n => !n.is_read && (n.priority === 'urgent' || n.priority === 'emergency')) && (
          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-ping" />
        )}
      </Button>

      <NotificationDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        isLoading={isLoading}
        onNotificationRead={handleNotificationRead}
        onMarkAllRead={handleMarkAllRead}
        onRefresh={loadNotifications}
      />
    </div>
  )
}