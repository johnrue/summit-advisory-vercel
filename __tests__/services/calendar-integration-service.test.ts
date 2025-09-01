/**
 * Calendar Integration Service Tests
 * Tests main orchestration service for calendar operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals'
import { calendarIntegrationService } from '@/lib/services/calendar-integration-service'
import { createClient } from '@/lib/supabase'
import { calendarExportService } from '@/lib/services/calendar-export-service'

// Mock dependencies
jest.mock('@/lib/supabase')
jest.mock('@/lib/services/calendar-export-service')

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  upsert: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  single: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  filter: jest.fn(() => mockSupabase)
}

jest.mocked(createClient).mockReturnValue(mockSupabase as any)

// Mock calendar export service
const mockCalendarExportService = {
  exportEvents: jest.fn()
}
jest.mocked(calendarExportService).exportEvents = mockCalendarExportService.exportEvents

describe('CalendarIntegrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.setSystemTime(new Date('2025-08-28T10:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const mockIntegration = {
    id: 'integration-123',
    provider: 'google_calendar',
    is_active: true,
    sync_enabled: true,
    last_sync_at: '2025-08-28T09:30:00Z',
    token_expires_at: '2025-08-28T16:00:00Z',
    calendar_preferences: [{
      sync_shifts: true,
      sync_availability: true,
      include_client_info: false
    }]
  }

  describe('getUserConnections', () => {
    it('should retrieve all user calendar connections', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [mockIntegration],
        error: null
      })

      const result = await calendarIntegrationService.getUserConnections('user-123')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data![0]).toEqual(
        expect.objectContaining({
          provider: 'google_calendar',
          isConnected: true,
          syncEnabled: true,
          lastSync: expect.any(Date)
        })
      )

      // Verify correct query was made
      expect(mockSupabase.from).toHaveBeenCalledWith('calendar_integrations')
      expect(mockSupabase.select).toHaveBeenCalledWith(
        expect.stringContaining('calendar_preferences(*)')
      )
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123')
    })

    it('should handle empty connections list', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await calendarIntegrationService.getUserConnections('user-456')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
    })

    it('should handle database error', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      })

      const result = await calendarIntegrationService.getUserConnections('user-789')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch calendar connections')
      expect(result.errorCode).toBe('FETCH_CONNECTIONS_ERROR')
    })

    it('should correctly determine connection status', async () => {
      const expiredIntegration = {
        ...mockIntegration,
        token_expires_at: '2025-08-28T09:00:00Z' // Expired 1 hour ago
      }

      const inactiveIntegration = {
        ...mockIntegration,
        is_active: false
      }

      mockSupabase.select.mockResolvedValueOnce({
        data: [mockIntegration, expiredIntegration, inactiveIntegration],
        error: null
      })

      const result = await calendarIntegrationService.getUserConnections('user-123')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
      
      // Active connection
      expect(result.data![0].connectionStatus).toBe('connected')
      
      // Expired token connection  
      expect(result.data![1].connectionStatus).toBe('expired')
      
      // Inactive connection
      expect(result.data![2].connectionStatus).toBe('disconnected')
    })
  })

  describe('getConnectionStatus', () => {
    it('should return detailed connection status with health metrics', async () => {
      // Mock integration lookup
      mockSupabase.select.mockResolvedValueOnce({
        data: mockIntegration,
        error: null
      })

      // Mock recent sync logs (24h)
      const mockLogs = [
        { operation_status: 'completed', created_at: '2025-08-28T09:45:00Z' },
        { operation_status: 'completed', created_at: '2025-08-28T08:30:00Z' },
        { operation_status: 'failed', created_at: '2025-08-28T07:15:00Z' }
      ]

      mockSupabase.select.mockResolvedValueOnce({
        data: mockLogs,
        error: null
      })

      const result = await calendarIntegrationService.getConnectionStatus(
        'user-123', 
        'integration-123'
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(
        expect.objectContaining({
          integration_id: 'integration-123',
          provider: 'google_calendar',
          is_connected: true,
          is_active: true,
          sync_enabled: true,
          last_sync_at: expect.any(Date),
          token_expires_at: expect.any(Date),
          sync_health: 'healthy', // 2/3 successful = 66% success rate > 50%
          error_count_24h: 1,
          next_sync_at: expect.any(Date)
        })
      )

      // Verify correct queries were made
      expect(mockSupabase.from).toHaveBeenCalledWith('calendar_integrations')
      expect(mockSupabase.from).toHaveBeenCalledWith('calendar_sync_logs')
      expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', expect.any(String))
    })

    it('should handle integration not found', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' }
      })

      const result = await calendarIntegrationService.getConnectionStatus(
        'user-123', 
        'invalid-integration'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Integration not found')
      expect(result.errorCode).toBe('INTEGRATION_NOT_FOUND')
    })

    it('should calculate sync health correctly', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: { ...mockIntegration, is_active: false },
        error: null
      })

      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await calendarIntegrationService.getConnectionStatus(
        'user-123', 
        'integration-123'
      )

      expect(result.success).toBe(true)
      expect(result.data?.sync_health).toBe('disconnected') // Inactive integration
    })

    it('should determine error health status', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: mockIntegration,
        error: null
      })

      // Mock high error rate (3 failures out of 4 operations = 75% error rate)
      const errorLogs = [
        { operation_status: 'failed', created_at: '2025-08-28T09:45:00Z' },
        { operation_status: 'failed', created_at: '2025-08-28T09:30:00Z' },
        { operation_status: 'failed', created_at: '2025-08-28T09:15:00Z' },
        { operation_status: 'completed', created_at: '2025-08-28T09:00:00Z' }
      ]

      mockSupabase.select.mockResolvedValueOnce({
        data: errorLogs,
        error: null
      })

      const result = await calendarIntegrationService.getConnectionStatus(
        'user-123', 
        'integration-123'
      )

      expect(result.success).toBe(true)
      expect(result.data?.sync_health).toBe('error') // > 50% error rate
      expect(result.data?.error_count_24h).toBe(3)
    })

    it('should determine warning health status', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: mockIntegration,
        error: null
      })

      // Mock moderate error rate (2 failures out of 10 operations = 20% error rate)
      const warningLogs = Array(8).fill({ operation_status: 'completed', created_at: '2025-08-28T09:30:00Z' })
        .concat([
          { operation_status: 'failed', created_at: '2025-08-28T09:15:00Z' },
          { operation_status: 'failed', created_at: '2025-08-28T09:00:00Z' }
        ])

      mockSupabase.select.mockResolvedValueOnce({
        data: warningLogs,
        error: null
      })

      const result = await calendarIntegrationService.getConnectionStatus(
        'user-123', 
        'integration-123'
      )

      expect(result.success).toBe(true)
      expect(result.data?.sync_health).toBe('warning') // 10-50% error rate
    })

    it('should handle no recent activity', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: mockIntegration,
        error: null
      })

      // Mock no recent logs
      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await calendarIntegrationService.getConnectionStatus(
        'user-123', 
        'integration-123'
      )

      expect(result.success).toBe(true)
      expect(result.data?.sync_health).toBe('warning') // No recent activity
      expect(result.data?.error_count_24h).toBe(0)
    })
  })

  describe('syncCalendar', () => {
    it('should successfully initiate calendar sync', async () => {
      // Mock integration verification
      mockSupabase.select.mockResolvedValueOnce({
        data: mockIntegration,
        error: null
      })

      // Mock successful export
      mockCalendarExportService.exportEvents.mockResolvedValueOnce({
        success: true,
        events_synced: 5,
        events_failed: 0,
        sync_log_id: 'sync-123',
        errors: [],
        duration_ms: 1200
      })

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['shift', 'availability'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      const result = await calendarIntegrationService.syncCalendar(
        'user-123',
        syncRequest
      )

      expect(result.success).toBe(true)
      expect(result.data?.events_synced).toBe(5)
      expect(result.data?.events_failed).toBe(0)

      // Verify integration was validated
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true)

      // Verify export service was called
      expect(mockCalendarExportService.exportEvents).toHaveBeenCalledWith(
        'user-123',
        'integration-123',
        syncRequest
      )
    })

    it('should handle integration not found', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Integration not found' }
      })

      const syncRequest = {
        integration_id: 'invalid-integration',
        event_types: ['shift'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      const result = await calendarIntegrationService.syncCalendar(
        'user-123',
        syncRequest
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Integration not found or inactive')
      expect(result.errorCode).toBe('INTEGRATION_NOT_FOUND')
    })

    it('should handle sync disabled integration', async () => {
      const disabledIntegration = { ...mockIntegration, sync_enabled: false }
      
      mockSupabase.select.mockResolvedValueOnce({
        data: disabledIntegration,
        error: null
      })

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['shift'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      const result = await calendarIntegrationService.syncCalendar(
        'user-123',
        syncRequest
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Calendar sync is disabled')
      expect(result.errorCode).toBe('SYNC_DISABLED')
    })

    it('should handle export service failure', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: mockIntegration,
        error: null
      })

      // Mock export failure
      mockCalendarExportService.exportEvents.mockResolvedValueOnce({
        success: false,
        events_synced: 2,
        events_failed: 3,
        sync_log_id: 'sync-failed-123',
        errors: [
          {
            event_id: 'event-1',
            event_type: 'shift',
            error_code: 'API_ERROR',
            error_message: 'Calendar API quota exceeded',
            retry_count: 0
          }
        ],
        duration_ms: 5000
      })

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['shift'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      const result = await calendarIntegrationService.syncCalendar(
        'user-123',
        syncRequest
      )

      expect(result.success).toBe(true) // Service returns export result as-is
      expect(result.data?.success).toBe(false)
      expect(result.data?.events_failed).toBe(3)
      expect(result.data?.errors).toHaveLength(1)
    })
  })

  describe('getSyncStats', () => {
    it('should return comprehensive sync statistics', async () => {
      // Mock integration verification
      mockSupabase.select.mockResolvedValueOnce({
        data: { id: 'integration-123' },
        error: null
      })

      // Mock sync logs
      const mockAllLogs = [
        {
          operation_status: 'completed',
          events_processed: 5,
          operation_duration_ms: 1200,
          created_at: '2025-08-28T09:30:00Z'
        },
        {
          operation_status: 'completed',
          events_processed: 3,
          operation_duration_ms: 800,
          created_at: '2025-08-28T08:15:00Z'
        },
        {
          operation_status: 'failed',
          events_processed: 0,
          operation_duration_ms: 500,
          created_at: '2025-08-28T07:45:00Z'
        },
        {
          operation_status: 'completed',
          events_processed: 7,
          operation_duration_ms: 1500,
          created_at: '2025-08-27T22:30:00Z' // Older than 24h
        }
      ]

      mockSupabase.select.mockResolvedValueOnce({
        data: mockAllLogs,
        error: null
      })

      const result = await calendarIntegrationService.getSyncStats(
        'user-123',
        'integration-123'
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(
        expect.objectContaining({
          integration_id: 'integration-123',
          total_syncs: 4,
          successful_syncs: 3,
          failed_syncs: 1,
          average_duration_ms: 1000, // (1200 + 800 + 500 + 1500) / 4
          events_synced_total: 15, // 5 + 3 + 0 + 7
          last_24h: {
            syncs: 3, // Only last 3 logs within 24h
            events: 8, // 5 + 3 + 0
            errors: 1
          },
          uptime_percentage: 75 // 3/4 successful
        })
      )

      // Verify correct queries
      expect(mockSupabase.from).toHaveBeenCalledWith('calendar_integrations')
      expect(mockSupabase.from).toHaveBeenCalledWith('calendar_sync_logs')
    })

    it('should handle integration not found for stats', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Integration not found' }
      })

      const result = await calendarIntegrationService.getSyncStats(
        'user-123',
        'invalid-integration'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Integration not found')
      expect(result.errorCode).toBe('INTEGRATION_NOT_FOUND')
    })

    it('should handle no sync logs', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: { id: 'integration-123' },
        error: null
      })

      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await calendarIntegrationService.getSyncStats(
        'user-123',
        'integration-123'
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(
        expect.objectContaining({
          total_syncs: 0,
          successful_syncs: 0,
          failed_syncs: 0,
          average_duration_ms: 0,
          events_synced_total: 0,
          uptime_percentage: 100 // No syncs = 100% uptime
        })
      )
    })

    it('should calculate 24-hour window correctly', async () => {
      jest.setSystemTime(new Date('2025-08-28T10:00:00Z'))

      mockSupabase.select.mockResolvedValueOnce({
        data: { id: 'integration-123' },
        error: null
      })

      const mixedTimeLogs = [
        {
          operation_status: 'completed',
          events_processed: 5,
          created_at: '2025-08-28T09:30:00Z' // Within 24h
        },
        {
          operation_status: 'failed',
          events_processed: 2,
          created_at: '2025-08-27T09:30:00Z' // Exactly 24h ago, should be excluded
        },
        {
          operation_status: 'completed',
          events_processed: 3,
          created_at: '2025-08-27T08:00:00Z' // Older than 24h
        }
      ]

      mockSupabase.select.mockResolvedValueOnce({
        data: mixedTimeLogs,
        error: null
      })

      const result = await calendarIntegrationService.getSyncStats(
        'user-123',
        'integration-123'
      )

      expect(result.success).toBe(true)
      expect(result.data?.last_24h).toEqual({
        syncs: 1, // Only the 09:30 log
        events: 5,
        errors: 0
      })
    })
  })

  describe('updatePreferences', () => {
    it('should successfully update calendar preferences', async () => {
      // Mock integration verification
      mockSupabase.select.mockResolvedValueOnce({
        data: { id: 'integration-123' },
        error: null
      })

      const updatedPrefs = {
        sync_shifts: true,
        sync_availability: false,
        include_client_info: true,
        sync_frequency: 'hourly'
      }

      // Mock preference update
      mockSupabase.upsert.mockResolvedValueOnce({
        data: {
          user_id: 'user-123',
          integration_id: 'integration-123',
          ...updatedPrefs,
          updated_at: '2025-08-28T10:00:00Z'
        },
        error: null
      })

      const result = await calendarIntegrationService.updatePreferences(
        'user-123',
        'integration-123',
        updatedPrefs
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(
        expect.objectContaining(updatedPrefs)
      )

      // Verify upsert was called with correct conflict resolution
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        [expect.objectContaining({
          user_id: 'user-123',
          integration_id: 'integration-123',
          ...updatedPrefs,
          updated_at: expect.any(String)
        })],
        { onConflict: 'user_id,integration_id' }
      )
    })

    it('should handle integration not found for preferences', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Integration not found' }
      })

      const preferences = { sync_shifts: false }

      const result = await calendarIntegrationService.updatePreferences(
        'user-123',
        'invalid-integration',
        preferences
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Integration not found')
      expect(result.errorCode).toBe('INTEGRATION_NOT_FOUND')
    })

    it('should handle preference update failure', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: { id: 'integration-123' },
        error: null
      })

      mockSupabase.upsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Constraint violation' }
      })

      const preferences = { sync_shifts: true }

      const result = await calendarIntegrationService.updatePreferences(
        'user-123',
        'integration-123',
        preferences
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update preferences')
      expect(result.errorCode).toBe('PREFERENCES_UPDATE_ERROR')
    })
  })

  describe('toggleSync', () => {
    it('should successfully enable calendar sync', async () => {
      mockSupabase.update.mockResolvedValueOnce({
        data: null,
        error: null
      })

      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await calendarIntegrationService.toggleSync(
        'user-123',
        'integration-456',
        true
      )

      expect(result.success).toBe(true)

      // Verify sync toggle update
      expect(mockSupabase.update).toHaveBeenCalledWith({
        sync_enabled: true,
        updated_at: expect.any(String)
      })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'integration-456')
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123')

      // Verify sync status log was created
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          integration_id: 'integration-456',
          sync_type: 'sync_status_check',
          operation_status: 'completed',
          event_type: 'sync_enabled',
          events_processed: 0,
          operation_duration_ms: 0
        })
      ])
    })

    it('should successfully disable calendar sync', async () => {
      mockSupabase.update.mockResolvedValueOnce({
        data: null,
        error: null
      })

      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await calendarIntegrationService.toggleSync(
        'user-456',
        'integration-789',
        false
      )

      expect(result.success).toBe(true)

      // Verify sync was disabled
      expect(mockSupabase.update).toHaveBeenCalledWith({
        sync_enabled: false,
        updated_at: expect.any(String)
      })

      // Verify disabled log entry
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          event_type: 'sync_disabled'
        })
      ])
    })

    it('should handle sync toggle failure', async () => {
      mockSupabase.update.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' }
      })

      const result = await calendarIntegrationService.toggleSync(
        'user-123',
        'integration-456',
        true
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to toggle sync')
      expect(result.errorCode).toBe('TOGGLE_SYNC_ERROR')
    })

    it('should log sync toggle even if logging fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      mockSupabase.update.mockResolvedValueOnce({
        data: null,
        error: null
      })

      // Mock logging failure
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Log insert failed' }
      })

      const result = await calendarIntegrationService.toggleSync(
        'user-123',
        'integration-456',
        true
      )

      // Main operation should still succeed even if logging fails
      expect(result.success).toBe(true)

      consoleSpy.mockRestore()
    })
  })

  describe('Connection Status Helpers', () => {
    it('should determine connection status correctly for expired tokens', async () => {
      const expiredIntegration = {
        ...mockIntegration,
        token_expires_at: '2025-08-28T09:00:00Z' // Expired 1 hour ago
      }

      mockSupabase.select.mockResolvedValueOnce({
        data: expiredIntegration,
        error: null
      })

      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await calendarIntegrationService.getConnectionStatus(
        'user-123',
        'integration-123'
      )

      expect(result.success).toBe(true)
      expect(result.data?.is_connected).toBe(true) // Still active
      expect(result.data?.sync_health).toBe('warning') // But needs attention
    })

    it('should calculate next sync time correctly', async () => {
      const enabledIntegration = {
        ...mockIntegration,
        sync_enabled: true,
        is_active: true
      }

      mockSupabase.select.mockResolvedValueOnce({
        data: enabledIntegration,
        error: null
      })

      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await calendarIntegrationService.getConnectionStatus(
        'user-123',
        'integration-123'
      )

      expect(result.success).toBe(true)
      expect(result.data?.next_sync_at).toBeInstanceOf(Date)
      
      // Should be set to next hour (11:00 AM)
      const nextSync = result.data!.next_sync_at!
      expect(nextSync.getHours()).toBe(11)
      expect(nextSync.getMinutes()).toBe(0)
      expect(nextSync.getSeconds()).toBe(0)
    })

    it('should return undefined next sync time for disabled sync', async () => {
      const disabledIntegration = {
        ...mockIntegration,
        sync_enabled: false
      }

      mockSupabase.select.mockResolvedValueOnce({
        data: disabledIntegration,
        error: null
      })

      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await calendarIntegrationService.getConnectionStatus(
        'user-123',
        'integration-123'
      )

      expect(result.success).toBe(true)
      expect(result.data?.next_sync_at).toBeUndefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle general service errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Mock database connection failure
      mockSupabase.from.mockImplementationOnce(() => {
        throw new Error('Database connection lost')
      })

      const result = await calendarIntegrationService.getUserConnections('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to get calendar connections')
      expect(result.errorCode).toBe('GET_CONNECTIONS_ERROR')

      consoleSpy.mockRestore()
    })

    it('should handle sync stats database error', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: { id: 'integration-123' },
        error: null
      })

      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Query timeout' }
      })

      const result = await calendarIntegrationService.getSyncStats(
        'user-123',
        'integration-123'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch sync logs')
      expect(result.errorCode).toBe('SYNC_LOGS_ERROR')
    })
  })
})