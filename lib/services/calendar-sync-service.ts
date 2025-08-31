/**
 * Calendar Sync Monitoring Service
 * Handles sync status tracking, health monitoring, and retry mechanisms
 */

import { createClient } from '@/lib/supabase'
import type { 
  CalendarSyncRequest,
  CalendarSyncResponse,
  CalendarSyncError,
  CalendarConnectionStatus,
  CalendarSyncStats 
} from '@/lib/types/calendar-types'
import type { 
  CalendarSyncLog,
  SyncStatus,
  SyncOperation,
  CalendarProvider 
} from '@/lib/types/oauth-types'
import { calendarIntegrationService } from './calendar-integration-service'

interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

interface SyncHealthCheck {
  integration_id: string
  provider: CalendarProvider
  is_healthy: boolean
  last_successful_sync: Date | null
  consecutive_failures: number
  error_rate_24h: number
  avg_response_time_ms: number
  status: 'healthy' | 'warning' | 'critical' | 'disconnected'
}

class CalendarSyncMonitor {
  private readonly supabase = createClient()
  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2
  }

  // Monitor all active integrations
  async monitorAllIntegrations(userId?: string): Promise<SyncHealthCheck[]> {
    try {
      let query = this.supabase
        .from('calendar_integrations')
        .select(`
          id, provider, user_id, is_active, sync_enabled, 
          last_sync_at, token_expires_at, created_at
        `)
        .eq('is_active', true)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data: integrations, error } = await query

      if (error) {
        throw new Error(`Failed to fetch integrations: ${error.message}`)
      }

      const healthChecks: SyncHealthCheck[] = []

      for (const integration of integrations || []) {
        const healthCheck = await this.checkIntegrationHealth(integration.id)
        healthChecks.push(healthCheck)
      }

      return healthChecks

    } catch (error) {
      console.error('Monitor all integrations error:', error)
      throw error
    }
  }

  // Check health of specific integration
  async checkIntegrationHealth(integrationId: string): Promise<SyncHealthCheck> {
    try {
      // Get integration details
      const { data: integration, error: integrationError } = await this.supabase
        .from('calendar_integrations')
        .select('id, provider, is_active, sync_enabled, last_sync_at, token_expires_at')
        .eq('id', integrationId)
        .single()

      if (integrationError || !integration) {
        throw new Error(`Integration not found: ${integrationId}`)
      }

      // Get sync logs for health analysis
      const { data: recentLogs, error: logsError } = await this.supabase
        .from('calendar_sync_logs')
        .select('operation_status, created_at, operation_duration_ms')
        .eq('integration_id', integrationId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      if (logsError) {
        throw new Error(`Failed to fetch sync logs: ${logsError.message}`)
      }

      // Analyze health metrics
      const logs = recentLogs || []
      const successfulSyncs = logs.filter(log => log.operation_status === 'completed')
      const failedSyncs = logs.filter(log => log.operation_status === 'failed')
      const errorRate = logs.length > 0 ? (failedSyncs.length / logs.length) : 0
      const avgResponseTime = successfulSyncs.length > 0 
        ? successfulSyncs.reduce((sum, log) => sum + (log.operation_duration_ms || 0), 0) / successfulSyncs.length
        : 0

      // Get consecutive failures  
      const consecutiveFailures = this.countConsecutiveFailures(logs as CalendarSyncLog[])

      // Determine health status
      const status = this.determineHealthStatus(
        integration,
        errorRate,
        consecutiveFailures,
        logs.length
      )

      const healthCheck: SyncHealthCheck = {
        integration_id: integrationId,
        provider: integration.provider,
        is_healthy: status === 'healthy',
        last_successful_sync: integration.last_sync_at ? new Date(integration.last_sync_at) : null,
        consecutive_failures: consecutiveFailures,
        error_rate_24h: errorRate,
        avg_response_time_ms: avgResponseTime,
        status
      }

      return healthCheck

    } catch (error) {
      console.error('Check integration health error:', error)
      
      // Return critical status for unknown integrations
      return {
        integration_id: integrationId,
        provider: 'google_calendar',
        is_healthy: false,
        last_successful_sync: null,
        consecutive_failures: 0,
        error_rate_24h: 1.0,
        avg_response_time_ms: 0,
        status: 'critical'
      }
    }
  }

  // Retry failed sync operations
  async retryFailedSync(syncLogId: string): Promise<CalendarSyncResponse> {
    try {
      // Get the failed sync log
      const { data: syncLog, error: logError } = await this.supabase
        .from('calendar_sync_logs')
        .select(`
          *, 
          calendar_integrations!inner(user_id, provider, is_active, sync_enabled)
        `)
        .eq('id', syncLogId)
        .eq('operation_status', 'failed')
        .single()

      if (logError || !syncLog) {
        throw new Error('Failed sync operation not found')
      }

      const integration = (syncLog as any).calendar_integrations

      // Check if integration is still active
      if (!integration.is_active || !integration.sync_enabled) {
        throw new Error('Integration is no longer active')
      }

      // Check retry limit
      if (syncLog.retry_count >= this.retryConfig.maxRetries) {
        throw new Error('Maximum retry attempts exceeded')
      }

      // Update retry count and status
      await this.supabase
        .from('calendar_sync_logs')
        .update({
          operation_status: 'retrying',
          retry_count: syncLog.retry_count + 1
        })
        .eq('id', syncLogId)

      // Create retry sync request
      const retryRequest: CalendarSyncRequest = {
        integration_id: syncLog.integration_id,
        event_types: syncLog.event_type ? [syncLog.event_type as any] : ['shift'],
        force_sync: true
      }

      // Wait for exponential backoff delay
      const delay = Math.min(
        this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, syncLog.retry_count),
        this.retryConfig.maxDelayMs
      )
      await this.sleep(delay)

      // Perform retry sync
      const retryResult = await calendarIntegrationService.syncCalendar(
        integration.user_id,
        retryRequest
      )

      if (!retryResult.success) {
        // Update failed retry
        await this.supabase
          .from('calendar_sync_logs')
          .update({
            operation_status: 'failed',
            error_message: retryResult.error,
            error_code: retryResult.errorCode
          })
          .eq('id', syncLogId)

        throw new Error(`Retry failed: ${retryResult.error}`)
      }

      // Update successful retry
      await this.supabase
        .from('calendar_sync_logs')
        .update({
          operation_status: 'completed'
        })
        .eq('id', syncLogId)

      return retryResult.data!

    } catch (error) {
      console.error('Retry failed sync error:', error)
      throw error
    }
  }

  // Get sync failure notifications
  async getSyncFailureNotifications(userId: string): Promise<CalendarSyncLog[]> {
    try {
      const { data: notifications, error } = await this.supabase
        .from('calendar_sync_logs')
        .select(`
          *, 
          calendar_integrations!inner(user_id, provider)
        `)
        .eq('calendar_integrations.user_id', userId)
        .eq('operation_status', 'failed')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        throw new Error(`Failed to get notifications: ${error.message}`)
      }

      return notifications || []

    } catch (error) {
      console.error('Get sync failure notifications error:', error)
      throw error
    }
  }

  // Schedule automatic retry for failed syncs
  async scheduleAutomaticRetries(): Promise<{ scheduled: number; errors: string[] }> {
    try {
      const errors: string[] = []
      let scheduled = 0

      // Get failed syncs that haven't reached retry limit
      const { data: failedSyncs, error } = await this.supabase
        .from('calendar_sync_logs')
        .select(`
          id, integration_id, retry_count, created_at,
          calendar_integrations!inner(is_active, sync_enabled)
        `)
        .eq('operation_status', 'failed')
        .lt('retry_count', this.retryConfig.maxRetries)
        .eq('calendar_integrations.is_active', true)
        .eq('calendar_integrations.sync_enabled', true)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      if (error) {
        throw new Error(`Failed to get failed syncs: ${error.message}`)
      }

      for (const failedSync of failedSyncs || []) {
        try {
          // Calculate next retry time based on exponential backoff
          const timeSinceFailure = Date.now() - new Date(failedSync.created_at).getTime()
          const retryDelay = Math.min(
            this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, failedSync.retry_count),
            this.retryConfig.maxDelayMs
          )

          // Only retry if enough time has passed
          if (timeSinceFailure >= retryDelay) {
            await this.retryFailedSync(failedSync.id)
            scheduled++
          }

        } catch (retryError) {
          errors.push(`Failed to retry sync ${failedSync.id}: ${retryError}`)
        }
      }

      return { scheduled, errors }

    } catch (error) {
      console.error('Schedule automatic retries error:', error)
      throw error
    }
  }

  // Get comprehensive sync dashboard data
  async getSyncDashboard(userId?: string): Promise<{
    overview: {
      total_integrations: number
      active_integrations: number
      healthy_integrations: number
      failed_integrations: number
    }
    health_checks: SyncHealthCheck[]
    recent_activity: CalendarSyncLog[]
    sync_stats: {
      syncs_24h: number
      events_synced_24h: number
      error_rate_24h: number
      avg_response_time_ms: number
    }
  }> {
    try {
      // Get all integrations
      let integrationsQuery = this.supabase
        .from('calendar_integrations')
        .select('id, is_active, sync_enabled')

      if (userId) {
        integrationsQuery = integrationsQuery.eq('user_id', userId)
      }

      const { data: integrations } = await integrationsQuery

      // Get health checks
      const healthChecks = await this.monitorAllIntegrations(userId)

      // Get recent activity
      let activityQuery = this.supabase
        .from('calendar_sync_logs')
        .select(`
          *, 
          calendar_integrations!inner(user_id, provider)
        `)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100)

      if (userId) {
        activityQuery = activityQuery.eq('calendar_integrations.user_id', userId)
      }

      const { data: recentActivity } = await activityQuery

      // Calculate overview stats
      const totalIntegrations = integrations?.length || 0
      const activeIntegrations = integrations?.filter(i => i.is_active).length || 0
      const healthyIntegrations = healthChecks.filter(h => h.status === 'healthy').length
      const failedIntegrations = healthChecks.filter(h => h.status === 'critical').length

      // Calculate sync stats
      const recentLogs = recentActivity || []
      const syncs24h = recentLogs.length
      const eventsSynced24h = recentLogs.reduce((sum, log) => sum + (log.events_processed || 0), 0)
      const failedSyncs24h = recentLogs.filter(log => log.operation_status === 'failed').length
      const errorRate24h = syncs24h > 0 ? (failedSyncs24h / syncs24h) : 0
      const successfulSyncs = recentLogs.filter(log => log.operation_status === 'completed')
      const avgResponseTime = successfulSyncs.length > 0
        ? successfulSyncs.reduce((sum, log) => sum + (log.operation_duration_ms || 0), 0) / successfulSyncs.length
        : 0

      return {
        overview: {
          total_integrations: totalIntegrations,
          active_integrations: activeIntegrations,
          healthy_integrations: healthyIntegrations,
          failed_integrations: failedIntegrations
        },
        health_checks: healthChecks,
        recent_activity: recentLogs,
        sync_stats: {
          syncs_24h: syncs24h,
          events_synced_24h: eventsSynced24h,
          error_rate_24h: errorRate24h,
          avg_response_time_ms: avgResponseTime
        }
      }

    } catch (error) {
      console.error('Get sync dashboard error:', error)
      throw error
    }
  }

  // Helper methods
  private countConsecutiveFailures(logs: CalendarSyncLog[]): number {
    let consecutive = 0
    
    for (const log of logs) {
      if (log.operation_status === 'failed') {
        consecutive++
      } else if (log.operation_status === 'completed') {
        break
      }
    }
    
    return consecutive
  }

  private determineHealthStatus(
    integration: any,
    errorRate: number,
    consecutiveFailures: number,
    totalOps: number
  ): 'healthy' | 'warning' | 'critical' | 'disconnected' {
    if (!integration.is_active) {
      return 'disconnected'
    }

    // Critical if too many consecutive failures
    if (consecutiveFailures >= 5) {
      return 'critical'
    }

    // Critical if very high error rate
    if (errorRate > 0.8) {
      return 'critical'
    }

    // Warning if moderate error rate or some consecutive failures
    if (errorRate > 0.3 || consecutiveFailures >= 2) {
      return 'warning'
    }

    // Warning if no recent activity (could indicate stuck sync)
    if (totalOps === 0 && integration.sync_enabled) {
      const hoursSinceLastSync = integration.last_sync_at
        ? (Date.now() - new Date(integration.last_sync_at).getTime()) / (1000 * 60 * 60)
        : Infinity

      if (hoursSinceLastSync > 24) {
        return 'warning'
      }
    }

    return 'healthy'
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const calendarSyncMonitor = new CalendarSyncMonitor()