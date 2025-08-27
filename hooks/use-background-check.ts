"use client"

import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { BackgroundCheckService } from '@/lib/services/background-check-service'
import { BackgroundCheckNotificationService } from '@/lib/services/background-check-notification-service'
import type { 
  BackgroundCheckStatus, 
  BackgroundCheckData, 
  BackgroundCheckUpdate,
  BackgroundCheckAudit,
  ExpiryReminderAlert,
  BackgroundCheckNotificationConfig
} from '@/lib/types/background-check'

interface UseBackgroundCheckOptions {
  applicationId?: string
  enableRealTime?: boolean
  notificationConfig?: BackgroundCheckNotificationConfig
}

export function useBackgroundCheck({
  applicationId,
  enableRealTime = false,
  notificationConfig
}: UseBackgroundCheckOptions = {}) {
  const [backgroundCheckData, setBackgroundCheckData] = useState<BackgroundCheckData | null>(null)
  const [auditTrail, setAuditTrail] = useState<BackgroundCheckAudit[]>([])
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryReminderAlert[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const { toast } = useToast()
  const backgroundCheckService = new BackgroundCheckService()
  const notificationService = new BackgroundCheckNotificationService()

  /**
   * Load background check data for a specific application
   */
  const loadBackgroundCheckData = useCallback(async (appId?: string) => {
    const targetId = appId || applicationId
    if (!targetId) return

    setIsLoading(true)
    try {
      const result = await backgroundCheckService.getBackgroundCheckData(targetId)
      if (result.success) {
        setBackgroundCheckData(result.data)
        setAuditTrail(result.data.auditTrail || [])
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
        description: "Failed to load background check data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [applicationId, backgroundCheckService, toast])

  /**
   * Update background check status
   */
  const updateStatus = useCallback(async (
    update: BackgroundCheckUpdate,
    currentUserId: string,
    appId?: string
  ) => {
    const targetId = appId || applicationId
    if (!targetId) throw new Error('Application ID is required')

    setIsUpdating(true)
    try {
      const result = await backgroundCheckService.updateStatus(targetId, update, currentUserId)
      
      if (result.success) {
        // Send notifications if configured
        if (notificationConfig) {
          await notificationService.sendStatusChangeNotification({
            applicantName: 'Applicant', // TODO: Get from application data
            applicationId: targetId,
            newStatus: update.status,
            managerName: 'Manager', // TODO: Get from auth context
            vendorConfirmation: update.vendorConfirmationNumber,
            expiryDate: update.expiryDate,
            notes: update.notes
          }, notificationConfig)
        }

        // Schedule expiry reminders if status is complete and has expiry date
        if (update.status === 'complete' && update.expiryDate) {
          await notificationService.scheduleExpiryReminders(
            targetId, 
            update.expiryDate, 
            notificationConfig
          )
        }

        // Reload data to reflect changes
        await loadBackgroundCheckData(targetId)

        toast({
          title: "Status Updated",
          description: `Background check status changed to ${update.status}`
        })

        return { success: true, data: result.data }
      } else {
        toast({
          title: "Update Failed",
          description: result.error,
          variant: "destructive"
        })
        return { success: false, error: result.error }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: "Error",
        description: `Failed to update status: ${errorMessage}`,
        variant: "destructive"
      })
      return { success: false, error: errorMessage }
    } finally {
      setIsUpdating(false)
    }
  }, [applicationId, backgroundCheckService, notificationService, notificationConfig, loadBackgroundCheckData, toast])

  /**
   * Load expiry alerts for monitoring
   */
  const loadExpiryAlerts = useCallback(async (daysAhead = 30) => {
    setIsLoading(true)
    try {
      const result = await backgroundCheckService.getExpiringBackgroundChecks(daysAhead)
      if (result.success) {
        setExpiryAlerts(result.data)
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
  }, [backgroundCheckService, toast])

  /**
   * Get audit trail for an application
   */
  const loadAuditTrail = useCallback(async (appId?: string) => {
    const targetId = appId || applicationId
    if (!targetId) return

    try {
      const result = await backgroundCheckService.getAuditTrail(targetId)
      if (result.success) {
        setAuditTrail(result.data)
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
        description: "Failed to load audit trail",
        variant: "destructive"
      })
    }
  }, [applicationId, backgroundCheckService, toast])

  /**
   * Check if status transition is valid
   */
  const validateStatusTransition = useCallback((
    currentStatus: BackgroundCheckStatus, 
    newStatus: BackgroundCheckStatus
  ): boolean => {
    const validTransitions: Record<BackgroundCheckStatus, BackgroundCheckStatus[]> = {
      'pending': ['in_progress', 'cancelled'],
      'in_progress': ['complete', 'failed', 'cancelled'],
      'complete': ['expired'],
      'failed': ['pending'], // Allow retry
      'expired': ['pending'], // Allow renewal
      'cancelled': ['pending'] // Allow restart
    }

    return validTransitions[currentStatus]?.includes(newStatus) ?? false
  }, [])

  /**
   * Get next valid statuses for current status
   */
  const getValidNextStatuses = useCallback((currentStatus: BackgroundCheckStatus): BackgroundCheckStatus[] => {
    const validTransitions: Record<BackgroundCheckStatus, BackgroundCheckStatus[]> = {
      'pending': ['in_progress', 'cancelled'],
      'in_progress': ['complete', 'failed', 'cancelled'],
      'complete': ['expired'],
      'failed': ['pending'],
      'expired': ['pending'],
      'cancelled': ['pending']
    }

    return validTransitions[currentStatus] || []
  }, [])

  /**
   * Send expiry reminder for an application
   */
  const sendExpiryReminder = useCallback(async (alert: ExpiryReminderAlert) => {
    try {
      const result = await notificationService.sendExpiryReminder(alert, notificationConfig)
      if (result.success) {
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

  // Load initial data
  useEffect(() => {
    if (applicationId) {
      loadBackgroundCheckData()
    }
  }, [applicationId, loadBackgroundCheckData])

  return {
    // Data
    backgroundCheckData,
    auditTrail,
    expiryAlerts,
    
    // Loading states
    isLoading,
    isUpdating,
    
    // Actions
    updateStatus,
    loadBackgroundCheckData,
    loadExpiryAlerts,
    loadAuditTrail,
    sendExpiryReminder,
    
    // Utilities
    validateStatusTransition,
    getValidNextStatuses
  }
}