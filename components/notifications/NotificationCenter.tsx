"use client"

import { useState, useEffect } from 'react'
import { NotificationToast } from './NotificationToast'
import { NotificationService } from '@/lib/services/notification-service'
import type { Notification } from '@/lib/types/notification-types'

interface NotificationCenterProps {
  userId: string
  maxToasts?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export function NotificationCenter({ 
  userId, 
  maxToasts = 3,
  position = 'top-right'
}: NotificationCenterProps) {
  const [toastNotifications, setToastNotifications] = useState<Notification[]>([])
  const notificationService = NotificationService.getInstance()

  useEffect(() => {
    // Subscribe to real-time notifications
    const subscription = notificationService.subscribeToNotifications(
      userId,
      handleNewNotification
    )

    return () => {
      notificationService.unsubscribeFromNotifications(subscription)
    }
  }, [userId])

  const handleNewNotification = (notification: Notification) => {
    // Only show toasts for certain priorities and categories
    const shouldShowToast = 
      notification.priority === 'urgent' ||
      notification.priority === 'emergency' ||
      notification.category === 'emergency' ||
      (notification.priority === 'high' && notification.category === 'schedule')

    if (shouldShowToast) {
      setToastNotifications(prev => {
        const newToasts = [notification, ...prev]
        // Keep only the most recent toasts up to maxToasts
        return newToasts.slice(0, maxToasts)
      })
    }
  }

  const handleDismissToast = (notificationId: string) => {
    setToastNotifications(prev => 
      prev.filter(n => n.id !== notificationId)
    )
  }

  const handleToastAction = async (notificationId: string, actionId: string) => {
    const notification = toastNotifications.find(n => n.id === notificationId)
    if (!notification) return

    // Handle different action types
    const action = notification.action_data?.actions?.find((a: any) => a.id === actionId)
    if (!action) return

    try {
      switch (action.action_type) {
        case 'accept':
          // Handle accept action (e.g., accept shift)
          if (action.url) {
            window.location.href = action.url
          }
          break
        
        case 'decline':
          // Handle decline action
          console.log('Declined notification:', notificationId)
          break
        
        case 'view':
          // Handle view action
          if (action.url) {
            window.location.href = action.url
          }
          break
        
        case 'acknowledge':
          // Mark as acknowledged
          await notificationService.acknowledgeNotification(notificationId)
          break
      }
    } catch (error) {
      console.error('Error handling notification action:', error)
    }
  }

  return (
    <div className="pointer-events-none">
      {toastNotifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            transform: `translateY(${index * 80}px)`
          }}
          className="relative"
        >
          <NotificationToast
            notification={notification}
            onDismiss={() => handleDismissToast(notification.id)}
            onAction={(actionId) => handleToastAction(notification.id, actionId)}
            position={position}
            autoHide={notification.priority !== 'emergency'}
            hideDelay={
              notification.priority === 'urgent' ? 8000 :
              notification.priority === 'high' ? 6000 :
              5000
            }
          />
        </div>
      ))}
    </div>
  )
}