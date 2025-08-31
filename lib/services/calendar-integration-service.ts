/**
 * Calendar Integration Service
 * Main orchestration service for calendar system operations
 */

import { createClient } from '@/lib/supabase'
import { calendarExportService } from './calendar-export-service'
import { oauthService } from './oauth-service'
import type { 
  CalendarConnectionStatus,
  CalendarSyncRequest,
  CalendarSyncResponse,
  CalendarSyncStats,
  BulkExportOperation
} from '@/lib/types/calendar-types'
import type { 
  CalendarProvider,
  CalendarIntegration,
  CalendarPreferences,
  OAuthConnection 
} from '@/lib/types/oauth-types'

export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
}

class CalendarIntegrationService {
  private readonly supabase = createClient()

  // Get all user's calendar connections
  async getUserConnections(userId: string): Promise<ServiceResult<OAuthConnection[]>> {
    try {
      const { data: integrations, error } = await this.supabase
        .from('calendar_integrations')
        .select(`
          id, provider, is_active, sync_enabled, last_sync_at, token_expires_at,
          calendar_preferences(*)
        `)
        .eq('user_id', userId)

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch calendar connections',
          errorCode: 'FETCH_CONNECTIONS_ERROR'
        }
      }

      const connections: OAuthConnection[] = integrations?.map(integration => ({
        provider: integration.provider,
        isConnected: integration.is_active,
        connectionStatus: this.getIntegrationStatus(integration),
        lastSync: integration.last_sync_at ? new Date(integration.last_sync_at) : undefined,
        syncEnabled: integration.sync_enabled,
        userEmail: undefined // Would need to decrypt and fetch from provider
      })) || []

      return { success: true, data: connections }

    } catch (error) {
      console.error('Get user connections error:', error)
      return {
        success: false,
        error: 'Failed to get calendar connections',
        errorCode: 'GET_CONNECTIONS_ERROR'
      }
    }
  }

  // Get detailed connection status
  async getConnectionStatus(userId: string, integrationId: string): Promise<ServiceResult<CalendarConnectionStatus>> {
    try {
      const { data: integration, error } = await this.supabase
        .from('calendar_integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('user_id', userId)
        .single()

      if (error || !integration) {
        return {
          success: false,
          error: 'Integration not found',
          errorCode: 'INTEGRATION_NOT_FOUND'
        }
      }

      // Get recent sync logs for health assessment
      const { data: recentLogs } = await this.supabase
        .from('calendar_sync_logs')
        .select('operation_status, created_at')
        .eq('integration_id', integrationId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      const errorCount24h = recentLogs?.filter(log => log.operation_status === 'failed').length || 0
      const totalOps24h = recentLogs?.length || 0

      const status: CalendarConnectionStatus = {
        integration_id: integrationId,
        provider: integration.provider,
        is_connected: integration.is_active,
        is_active: integration.is_active,
        sync_enabled: integration.sync_enabled,
        last_sync_at: integration.last_sync_at ? new Date(integration.last_sync_at) : undefined,
        token_expires_at: integration.token_expires_at ? new Date(integration.token_expires_at) : undefined,
        sync_health: this.determineSyncHealth(integration, errorCount24h, totalOps24h),
        error_count_24h: errorCount24h,
        next_sync_at: this.calculateNextSyncTime(integration)
      }

      return { success: true, data: status }

    } catch (error) {
      console.error('Get connection status error:', error)
      return {
        success: false,
        error: 'Failed to get connection status',
        errorCode: 'CONNECTION_STATUS_ERROR'
      }
    }
  }

  // Initiate calendar sync
  async syncCalendar(
    userId: string,
    syncRequest: CalendarSyncRequest
  ): Promise<ServiceResult<CalendarSyncResponse>> {
    try {
      // Verify user owns the integration
      const { data: integration, error } = await this.supabase
        .from('calendar_integrations')
        .select('*')
        .eq('id', syncRequest.integration_id)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (error || !integration) {
        return {
          success: false,
          error: 'Integration not found or inactive',
          errorCode: 'INTEGRATION_NOT_FOUND'
        }
      }

      // Check if sync is enabled
      if (!integration.sync_enabled) {
        return {
          success: false,
          error: 'Calendar sync is disabled',
          errorCode: 'SYNC_DISABLED'
        }
      }

      // Perform the export
      const syncResponse = await calendarExportService.exportEvents(
        userId,
        syncRequest.integration_id,
        syncRequest
      )

      return { success: true, data: syncResponse }

    } catch (error) {
      console.error('Calendar sync error:', error)
      return {
        success: false,
        error: 'Failed to sync calendar',
        errorCode: 'SYNC_ERROR'
      }
    }
  }

  // Get sync statistics
  async getSyncStats(userId: string, integrationId: string): Promise<ServiceResult<CalendarSyncStats>> {
    try {
      // Verify user owns the integration
      const { data: integration, error: integrationError } = await this.supabase
        .from('calendar_integrations')
        .select('id')
        .eq('id', integrationId)
        .eq('user_id', userId)
        .single()

      if (integrationError || !integration) {
        return {
          success: false,
          error: 'Integration not found',
          errorCode: 'INTEGRATION_NOT_FOUND'
        }
      }

      // Get all sync logs for this integration
      const { data: allLogs, error: allLogsError } = await this.supabase
        .from('calendar_sync_logs')
        .select('operation_status, events_processed, operation_duration_ms, created_at')
        .eq('integration_id', integrationId)

      if (allLogsError) {
        return {
          success: false,
          error: 'Failed to fetch sync logs',
          errorCode: 'SYNC_LOGS_ERROR'
        }
      }

      // Get last 24 hours logs
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recent24hLogs = allLogs?.filter(log => 
        new Date(log.created_at) > last24h
      ) || []

      const totalSyncs = allLogs?.length || 0
      const successfulSyncs = allLogs?.filter(log => log.operation_status === 'completed').length || 0
      const failedSyncs = totalSyncs - successfulSyncs
      const avgDuration = allLogs?.length ? 
        allLogs.reduce((sum, log) => sum + (log.operation_duration_ms || 0), 0) / allLogs.length : 0
      const totalEvents = allLogs?.reduce((sum, log) => sum + (log.events_processed || 0), 0) || 0
      const recent24hSyncs = recent24hLogs.length
      const recent24hEvents = recent24hLogs.reduce((sum, log) => sum + (log.events_processed || 0), 0)
      const recent24hErrors = recent24hLogs.filter(log => log.operation_status === 'failed').length

      const stats: CalendarSyncStats = {
        integration_id: integrationId,
        total_syncs: totalSyncs,
        successful_syncs: successfulSyncs,
        failed_syncs: failedSyncs,
        average_duration_ms: avgDuration,
        events_synced_total: totalEvents,
        last_24h: {
          syncs: recent24hSyncs,
          events: recent24hEvents,
          errors: recent24hErrors
        },
        uptime_percentage: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 100
      }

      return { success: true, data: stats }

    } catch (error) {
      console.error('Get sync stats error:', error)
      return {
        success: false,
        error: 'Failed to get sync statistics',
        errorCode: 'SYNC_STATS_ERROR'
      }
    }
  }

  // Update calendar preferences
  async updatePreferences(
    userId: string,
    integrationId: string,
    preferences: Partial<CalendarPreferences>
  ): Promise<ServiceResult<CalendarPreferences>> {
    try {
      // Verify user owns the integration
      const { data: integration, error: integrationError } = await this.supabase
        .from('calendar_integrations')
        .select('id')
        .eq('id', integrationId)
        .eq('user_id', userId)
        .single()

      if (integrationError || !integration) {
        return {
          success: false,
          error: 'Integration not found',
          errorCode: 'INTEGRATION_NOT_FOUND'
        }
      }

      // Update preferences
      const { data: updatedPrefs, error } = await this.supabase
        .from('calendar_preferences')
        .upsert([{
          user_id: userId,
          integration_id: integrationId,
          ...preferences,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'user_id,integration_id'
        })
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: 'Failed to update preferences',
          errorCode: 'PREFERENCES_UPDATE_ERROR'
        }
      }

      return { success: true, data: updatedPrefs }

    } catch (error) {
      console.error('Update preferences error:', error)
      return {
        success: false,
        error: 'Failed to update calendar preferences',
        errorCode: 'PREFERENCES_ERROR'
      }
    }
  }

  // Enable/disable calendar sync
  async toggleSync(
    userId: string,
    integrationId: string,
    enabled: boolean
  ): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase
        .from('calendar_integrations')
        .update({
          sync_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId)
        .eq('user_id', userId)

      if (error) {
        return {
          success: false,
          error: 'Failed to toggle sync',
          errorCode: 'TOGGLE_SYNC_ERROR'
        }
      }

      // Log the change
      await this.supabase
        .from('calendar_sync_logs')
        .insert([{
          integration_id: integrationId,
          sync_type: 'sync_status_check',
          operation_status: 'completed',
          event_type: enabled ? 'sync_enabled' : 'sync_disabled',
          events_processed: 0,
          operation_duration_ms: 0
        }])

      return { success: true }

    } catch (error) {
      console.error('Toggle sync error:', error)
      return {
        success: false,
        error: 'Failed to toggle calendar sync',
        errorCode: 'TOGGLE_SYNC_ERROR'
      }
    }
  }

  // Helper methods
  private getIntegrationStatus(integration: any): 'connected' | 'expired' | 'error' | 'disconnected' {
    if (!integration.is_active) {
      return 'disconnected'
    }

    if (integration.token_expires_at) {
      const expiryTime = new Date(integration.token_expires_at)
      const now = new Date()
      const timeUntilExpiry = expiryTime.getTime() - now.getTime()
      
      // Token expired
      if (timeUntilExpiry <= 0) {
        return 'expired'
      }
      
      // Token expires within 24 hours
      if (timeUntilExpiry < 24 * 60 * 60 * 1000) {
        return 'warning' as any
      }
    }

    return 'connected'
  }

  private determineSyncHealth(
    integration: any,
    errorCount24h: number,
    totalOps24h: number
  ): 'healthy' | 'warning' | 'error' | 'disconnected' {
    if (!integration.is_active) {
      return 'disconnected'
    }

    if (errorCount24h === 0 && totalOps24h > 0) {
      return 'healthy'
    }

    if (totalOps24h === 0) {
      return 'warning' // No recent activity
    }

    const errorRate = errorCount24h / totalOps24h
    
    if (errorRate > 0.5) {
      return 'error' // More than 50% errors
    }

    if (errorRate > 0.1) {
      return 'warning' // More than 10% errors
    }

    return 'healthy'
  }

  private calculateNextSyncTime(integration: any): Date | undefined {
    if (!integration.sync_enabled || !integration.is_active) {
      return undefined
    }

    // For now, return next hour for hourly sync
    // In real implementation, this would be based on sync preferences
    const nextHour = new Date()
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
    
    return nextHour
  }
}

export const calendarIntegrationService = new CalendarIntegrationService()