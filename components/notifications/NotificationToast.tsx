"use client"

import { useState, useEffect } from 'react'
import { X, Check, AlertTriangle, Info, Calendar, Users, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Notification, NotificationCategory, NotificationPriority } from '@/lib/types/notification-types'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface NotificationToastProps {
  notification: Notification
  onDismiss: () => void
  onAction?: (actionId: string) => void
  autoHide?: boolean
  hideDelay?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export function NotificationToast({
  notification,
  onDismiss,
  onAction,
  autoHide = true,
  hideDelay = 5000,
  position = 'top-right'
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  // Auto-hide logic
  useEffect(() => {
    if (!autoHide) return

    // Don't auto-hide emergency notifications
    if (notification.priority === 'emergency') return

    const timer = setTimeout(() => {
      handleDismiss()
    }, hideDelay)

    return () => clearTimeout(timer)
  }, [autoHide, hideDelay, notification.priority])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss()
    }, 300) // Animation duration
  }

  const handleActionClick = (actionId: string) => {
    if (onAction) {
      onAction(actionId)
    }
    handleDismiss()
  }

  const getCategoryIcon = (category: NotificationCategory) => {
    const iconClass = "h-4 w-4 flex-shrink-0"
    
    switch (category) {
      case 'schedule':
        return <Calendar className={iconClass} />
      case 'assignments':
        return <Users className={iconClass} />
      case 'compliance':
        return <Shield className={iconClass} />
      case 'emergency':
        return <AlertTriangle className={iconClass} />
      default:
        return <Info className={iconClass} />
    }
  }

  const getToastStyles = (priority: NotificationPriority) => {
    switch (priority) {
      case 'emergency':
        return "border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100"
      case 'urgent':
        return "border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100"
      case 'high':
        return "border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100"
      case 'normal':
        return "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
      case 'low':
        return "border-gray-500 bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100"
      default:
        return "border-border bg-background text-foreground"
    }
  }

  const getPositionStyles = (position: string) => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4'
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      default:
        return 'top-4 right-4'
    }
  }

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case 'emergency':
        return <Badge variant="destructive" className="text-xs animate-pulse">Emergency</Badge>
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

  if (!isVisible) return null

  return (
    <div
      className={cn(
        "fixed z-50 w-96 max-w-[calc(100vw-2rem)] pointer-events-auto",
        getPositionStyles(position),
        "animate-in slide-in-from-top-2 fade-in-0",
        isExiting && "animate-out slide-out-to-top-2 fade-out-0"
      )}
    >
      <div
        className={cn(
          "rounded-lg border shadow-lg p-4",
          getToastStyles(notification.priority)
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Category Icon */}
            <div className={cn(
              "p-1.5 rounded-full mt-0.5",
              notification.category === 'emergency' ? "bg-red-200 text-red-700" :
              notification.category === 'schedule' ? "bg-blue-200 text-blue-700" :
              notification.category === 'assignments' ? "bg-green-200 text-green-700" :
              notification.category === 'compliance' ? "bg-yellow-200 text-yellow-700" :
              "bg-gray-200 text-gray-700"
            )}>
              {getCategoryIcon(notification.category)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="font-semibold text-sm truncate">
                  {notification.title}
                </h4>
                {getPriorityBadge(notification.priority)}
              </div>
              
              <p className="text-sm opacity-90 line-clamp-2 mb-1">
                {notification.message}
              </p>
              
              <div className="flex items-center gap-1 text-xs opacity-70">
                <span>
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-70 hover:opacity-100"
            onClick={handleDismiss}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Action buttons */}
        {notification.action_data?.actions && notification.action_data.actions.length > 0 && (
          <div className="flex gap-2 mt-3">
            {notification.action_data.actions.slice(0, 3).map((action: any) => (
              <Button
                key={action.id}
                variant={action.style === 'primary' ? 'default' : action.style === 'danger' ? 'destructive' : 'secondary'}
                size="sm"
                className="text-xs h-7 px-3"
                onClick={() => handleActionClick(action.id)}
              >
                {action.action_type === 'accept' && <Check className="h-3 w-3 mr-1" />}
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Progress bar for auto-hide (if not emergency) */}
        {autoHide && notification.priority !== 'emergency' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 rounded-b-lg overflow-hidden">
            <div 
              className="h-full bg-current opacity-30 animate-shrink-width"
              style={{ 
                animationDuration: `${hideDelay}ms`,
                animationTimingFunction: 'linear'
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}