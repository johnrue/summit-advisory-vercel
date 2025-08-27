"use client"

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { BackgroundCheckService } from '@/lib/services/background-check-service'
import { BackgroundCheckNotificationService } from '@/lib/services/background-check-notification-service'
import type { 
  ExpiryReminderAlert, 
  BackgroundCheckNotificationConfig,
  BackgroundCheckMetrics 
} from '@/lib/types/background-check'

interface UseExpiryTrackingOptions {
  daysAhead?: number
  autoRefresh?: boolean
  refreshInterval?: number // minutes
  notificationConfig?: BackgroundCheckNotificationConfig
}

export function useExpiryTracking({
  daysAhead = 30,
  autoRefresh = false,
  refreshInterval = 15,
  notificationConfig
}: UseExpiryTrackingOptions = {}) {
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryReminderAlert[]>([])
  const [metrics, setMetrics] = useState<BackgroundCheckMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const { toast } = useToast()
  const backgroundCheckService = new BackgroundCheckService()
  const notificationService = new BackgroundCheckNotificationService()

  /**
   * Load expiry alerts
   */
  const loadExpiryAlerts = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await backgroundCheckService.getExpiringBackgroundChecks(daysAhead)
      if (result.success) {
        setExpiryAlerts(result.data)
        setLastRefresh(new Date())
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load expiry alerts",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [daysAhead, backgroundCheckService, toast])

  /**
   * Load background check metrics
   */
  const loadMetrics = useCallback(async () => {
    try {
      const result = await backgroundCheckService.getBackgroundCheckMetrics()
      if (result.success) {
        setMetrics(result.data)
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load metrics",
        variant: "destructive"
      })
    }
  }, [backgroundCheckService, toast])

  /**
   * Send reminder for specific application
   */
  const sendReminder = useCallback(async (alert: ExpiryReminderAlert) => {
    try {
      const result = await notificationService.sendExpiryReminder(alert, notificationConfig)
      if (result.success) {
        // Update alert to reflect reminder was sent
        setExpiryAlerts(prev => 
          prev.map(a => 
            a.applicationId === alert.applicationId 
              ? { ...a, lastReminderSent: new Date() }
              : a
          )
        )
        
        toast({
          title: "Reminder Sent",
          description: `Expiry reminder sent for ${alert.applicantName}`
        })
      } else {
        toast({
          title: "Failed to Send",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send expiry reminder",
        variant: "destructive"
      })
    }
  }, [notificationService, notificationConfig, toast])

  /**
   * Send bulk reminders for urgent expiries
   */
  const sendBulkReminders = useCallback(async (maxDaysUntilExpiry = 7) => {
    const urgentAlerts = expiryAlerts.filter(alert => 
      alert.daysUntilExpiry <= maxDaysUntilExpiry
    )

    if (urgentAlerts.length === 0) {
      toast({
        title: "No Urgent Alerts",
        description: "No background checks require immediate attention"
      })
      return
    }

    try {
      const results = await Promise.allSettled(
        urgentAlerts.map(alert => sendReminder(alert))
      )

      const successCount = results.filter(result => result.status === 'fulfilled').length
      
      toast({
        title: "Bulk Reminders Sent",
        description: `${successCount}/${urgentAlerts.length} reminders sent successfully`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send bulk reminders",
        variant: "destructive"
      })
    }
  }, [expiryAlerts, sendReminder, toast])

  /**
   * Get expiry alerts grouped by urgency
   */
  const getGroupedAlerts = useCallback(() => {
    const groups = {
      expired: expiryAlerts.filter(alert => alert.daysUntilExpiry < 0),
      urgent: expiryAlerts.filter(alert => alert.daysUntilExpiry >= 0 && alert.daysUntilExpiry <= 7),
      soon: expiryAlerts.filter(alert => alert.daysUntilExpiry > 7 && alert.daysUntilExpiry <= 14),
      upcoming: expiryAlerts.filter(alert => alert.daysUntilExpiry > 14)
    }

    return groups
  }, [expiryAlerts])

  /**
   * Get summary statistics
   */
  const getSummaryStats = useCallback(() => {
    const grouped = getGroupedAlerts()
    
    return {
      totalAlerts: expiryAlerts.length,
      expiredCount: grouped.expired.length,
      urgentCount: grouped.urgent.length,
      soonCount: grouped.soon.length,
      upcomingCount: grouped.upcoming.length,
      requiresImmediateAction: grouped.expired.length + grouped.urgent.length
    }
  }, [expiryAlerts, getGroupedAlerts])

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        loadExpiryAlerts()
        loadMetrics()
      }, refreshInterval * 60 * 1000) // Convert minutes to milliseconds

      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, loadExpiryAlerts, loadMetrics])

  // Initial data load
  useEffect(() => {
    loadExpiryAlerts()
    loadMetrics()
  }, [loadExpiryAlerts, loadMetrics])

  return {
    // Data
    expiryAlerts,
    metrics,
    backgroundCheckData,
    auditTrail,
    lastRefresh,
    
    // Loading states
    isLoading,
    isUpdating,
    
    // Actions
    loadExpiryAlerts,
    loadMetrics,
    loadBackgroundCheckData,
    sendReminder,
    sendBulkReminders,
    
    // Utilities
    getGroupedAlerts,
    getSummaryStats
  }
}