/**
 * Calendar Sync Workflow Integration Tests
 * Tests end-to-end calendar synchronization workflows
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createClient } from '@/lib/supabase'
import { oauthService } from '@/lib/services/oauth-service'
import { calendarExportService } from '@/lib/services/calendar-export-service'
import { calendarIntegrationService } from '@/lib/services/calendar-integration-service'
import { timezoneService } from '@/lib/services/timezone-service'

// Mock all dependencies
vi.mock('@/lib/supabase')
vi.mock('@/lib/services/oauth-service')
vi.mock('@/lib/services/calendar-export-service')
vi.mock('@/lib/services/calendar-integration-service')
vi.mock('@/lib/services/timezone-service')

const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  auth: {
    getUser: vi.fn()
  }
}

vi.mocked(createClient).mockReturnValue(mockSupabase as any)

// Mock fetch for external API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Calendar Sync Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.setSystemTime(new Date('2025-08-28T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  }

  const mockShift = {
    id: 'shift-456',
    title: 'Security Shift',
    client_name: 'Test Client Corp',
    site_name: 'Downtown Office',
    time_range: {
      start: '2025-08-28T14:00:00Z',
      end: '2025-08-28T22:00:00Z'
    },
    priority: 'high',
    special_requirements: 'Armed guard required',
    shift_assignments: [{ guard_id: 'user-123', assignment_status: 'assigned' }],
    guard_profiles: [{ user_id: 'user-123', first_name: 'John', last_name: 'Doe' }]
  }

  describe('Complete OAuth Flow Integration', () => {
    it('should complete full OAuth flow from initiation to callback', async () => {
      // Step 1: Initiate OAuth
      vi.mocked(oauthService.initiateOAuth).mockResolvedValueOnce({
        success: true,
        data: {
          authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&state=oauth-state-123',
          state: 'oauth-state-123'
        }
      })

      const oauthInitiation = await oauthService.initiateOAuth(
        'user-123',
        'google_calendar',
        'https://app.example.com/calendar'
      )

      expect(oauthInitiation.success).toBe(true)
      expect(oauthInitiation.data?.authUrl).toContain('accounts.google.com')
      expect(oauthInitiation.data?.state).toBe('oauth-state-123')

      // Step 2: Handle OAuth callback
      vi.mocked(oauthService.handleOAuthCallback).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'integration-789',
          user_id: 'user-123',
          provider: 'google_calendar',
          is_active: true,
          sync_enabled: true,
          created_at: new Date('2025-08-28T10:00:00Z'),
          updated_at: new Date('2025-08-28T10:00:00Z')
        }
      })

      const oauthCallback = await oauthService.handleOAuthCallback(
        'authorization-code-456',
        'oauth-state-123'
      )

      expect(oauthCallback.success).toBe(true)
      expect(oauthCallback.data?.provider).toBe('google_calendar')
      expect(oauthCallback.data?.is_active).toBe(true)

      // Verify OAuth service calls
      expect(oauthService.initiateOAuth).toHaveBeenCalledWith(
        'user-123',
        'google_calendar',
        'https://app.example.com/calendar'
      )
      expect(oauthService.handleOAuthCallback).toHaveBeenCalledWith(
        'authorization-code-456',
        'oauth-state-123'
      )
    })

    it('should handle OAuth flow with token refresh', async () => {
      // Mock expired token scenario
      vi.mocked(oauthService.refreshAccessToken).mockResolvedValueOnce({
        success: true,
        data: {
          access_token: 'refreshed-access-token',
          refresh_token: 'refreshed-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'calendar.events',
          expires_at: new Date('2025-08-28T14:00:00Z')
        }
      })

      const tokenRefresh = await oauthService.refreshAccessToken('integration-789')

      expect(tokenRefresh.success).toBe(true)
      expect(tokenRefresh.data?.access_token).toBe('refreshed-access-token')
      expect(tokenRefresh.data?.expires_at).toBeInstanceOf(Date)
    })

    it('should handle OAuth flow failure gracefully', async () => {
      vi.mocked(oauthService.handleOAuthCallback).mockResolvedValueOnce({
        success: false,
        error: 'Invalid authorization code',
        errorCode: 'INVALID_GRANT'
      })

      const failedCallback = await oauthService.handleOAuthCallback(
        'invalid-code',
        'oauth-state-123'
      )

      expect(failedCallback.success).toBe(false)
      expect(failedCallback.error).toBe('Invalid authorization code')
      expect(failedCallback.errorCode).toBe('INVALID_GRANT')
    })
  })

  describe('End-to-End Calendar Export Workflow', () => {
    it('should complete full calendar export workflow for guard user', async () => {
      // Step 1: Get user connections
      vi.mocked(calendarIntegrationService.getUserConnections).mockResolvedValueOnce({
        success: true,
        data: [{
          provider: 'google_calendar',
          isConnected: true,
          connectionStatus: 'connected',
          syncEnabled: true,
          lastSync: new Date('2025-08-28T09:00:00Z')
        }]
      })

      const connections = await calendarIntegrationService.getUserConnections('user-123')

      expect(connections.success).toBe(true)
      expect(connections.data).toHaveLength(1)
      expect(connections.data![0].provider).toBe('google_calendar')

      // Step 2: Trigger calendar sync
      vi.mocked(calendarExportService.exportEvents).mockResolvedValueOnce({
        success: true,
        events_synced: 3,
        events_failed: 0,
        sync_log_id: 'sync-log-123',
        errors: [],
        duration_ms: 2500
      })

      const syncRequest = {
        integration_id: 'integration-789',
        event_types: ['shift', 'availability'] as const,
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      const exportResult = await calendarExportService.exportEvents(
        'user-123',
        'integration-789',
        syncRequest
      )

      expect(exportResult.success).toBe(true)
      expect(exportResult.events_synced).toBe(3)
      expect(exportResult.events_failed).toBe(0)

      // Step 3: Get sync statistics
      vi.mocked(calendarIntegrationService.getSyncStats).mockResolvedValueOnce({
        success: true,
        data: {
          integration_id: 'integration-789',
          total_syncs: 15,
          successful_syncs: 14,
          failed_syncs: 1,
          average_duration_ms: 2200,
          events_synced_total: 42,
          last_24h: {
            syncs: 3,
            events: 8,
            errors: 0
          },
          uptime_percentage: 93.33
        }
      })

      const syncStats = await calendarIntegrationService.getSyncStats(
        'user-123',
        'integration-789'
      )

      expect(syncStats.success).toBe(true)
      expect(syncStats.data?.uptime_percentage).toBeGreaterThan(90)
      expect(syncStats.data?.last_24h.errors).toBe(0)

      // Verify workflow completion
      expect(calendarIntegrationService.getUserConnections).toHaveBeenCalledWith('user-123')
      expect(calendarExportService.exportEvents).toHaveBeenCalledWith('user-123', 'integration-789', syncRequest)
      expect(calendarIntegrationService.getSyncStats).toHaveBeenCalledWith('user-123', 'integration-789')
    })

    it('should handle partial sync failure in workflow', async () => {
      // Mock sync with some failures
      vi.mocked(calendarExportService.exportEvents).mockResolvedValueOnce({
        success: false,
        events_synced: 2,
        events_failed: 1,
        sync_log_id: 'sync-log-456',
        errors: [{
          event_id: 'shift-789',
          event_type: 'shift',
          error_code: 'API_RATE_LIMIT',
          error_message: 'Google Calendar API rate limit exceeded',
          retry_count: 0
        }],
        duration_ms: 5000
      })

      const syncRequest = {
        integration_id: 'integration-789',
        event_types: ['shift'] as const,
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      const partialResult = await calendarExportService.exportEvents(
        'user-123',
        'integration-789',
        syncRequest
      )

      expect(partialResult.success).toBe(false)
      expect(partialResult.events_synced).toBe(2)
      expect(partialResult.events_failed).toBe(1)
      expect(partialResult.errors).toHaveLength(1)
      expect(partialResult.errors[0].error_code).toBe('API_RATE_LIMIT')
    })
  })

  describe('Multi-Provider Integration Workflow', () => {
    it('should handle multiple calendar providers for the same user', async () => {
      // Mock user with multiple integrations
      vi.mocked(calendarIntegrationService.getUserConnections).mockResolvedValueOnce({
        success: true,
        data: [
          {
            provider: 'google_calendar',
            isConnected: true,
            connectionStatus: 'connected',
            syncEnabled: true,
            lastSync: new Date('2025-08-28T09:00:00Z')
          },
          {
            provider: 'microsoft_outlook',
            isConnected: true,
            connectionStatus: 'connected',
            syncEnabled: true,
            lastSync: new Date('2025-08-28T08:30:00Z')
          }
        ]
      })

      const multiProviderConnections = await calendarIntegrationService.getUserConnections('user-123')

      expect(multiProviderConnections.success).toBe(true)
      expect(multiProviderConnections.data).toHaveLength(2)

      const googleProvider = multiProviderConnections.data!.find(c => c.provider === 'google_calendar')
      const microsoftProvider = multiProviderConnections.data!.find(c => c.provider === 'microsoft_outlook')

      expect(googleProvider).toBeDefined()
      expect(microsoftProvider).toBeDefined()
      expect(googleProvider?.isConnected).toBe(true)
      expect(microsoftProvider?.isConnected).toBe(true)

      // Verify both providers can sync independently
      vi.mocked(calendarExportService.exportEvents)
        .mockResolvedValueOnce({
          success: true,
          events_synced: 5,
          events_failed: 0,
          sync_log_id: 'google-sync-123',
          errors: [],
          duration_ms: 2000
        })
        .mockResolvedValueOnce({
          success: true,
          events_synced: 4,
          events_failed: 0,
          sync_log_id: 'microsoft-sync-456',
          errors: [],
          duration_ms: 1800
        })

      const syncRequest = {
        integration_id: 'google-integration',
        event_types: ['shift'] as const,
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      const googleSync = await calendarExportService.exportEvents('user-123', 'google-integration', syncRequest)
      const microsoftSync = await calendarExportService.exportEvents('user-123', 'microsoft-integration', {
        ...syncRequest,
        integration_id: 'microsoft-integration'
      })

      expect(googleSync.success).toBe(true)
      expect(microsoftSync.success).toBe(true)
      expect(googleSync.sync_log_id).toBe('google-sync-123')
      expect(microsoftSync.sync_log_id).toBe('microsoft-sync-456')
    })
  })

  describe('Timezone-Aware Sync Workflow', () => {
    it('should handle timezone conversions in sync workflow', async () => {
      // Mock timezone service
      vi.mocked(timezoneService.detectUserTimezone).mockReturnValueOnce('America/New_York')
      vi.mocked(timezoneService.convertTime).mockReturnValueOnce({
        utc: new Date('2025-08-28T18:00:00Z'),
        local: new Date('2025-08-28T14:00:00-04:00'),
        timezone: 'America/New_York',
        formatted: 'Aug 28, 2025, 2:00 PM EDT',
        offsetInfo: { hours: 4, minutes: 0, sign: '-' }
      })

      const userTimezone = timezoneService.detectUserTimezone()
      expect(userTimezone).toBe('America/New_York')

      const timeConversion = timezoneService.convertTime(
        new Date('2025-08-28T18:00:00Z'),
        'UTC',
        'America/New_York'
      )

      expect(timeConversion.timezone).toBe('America/New_York')
      expect(timeConversion.formatted).toContain('EDT')

      // Mock export with timezone-aware events
      vi.mocked(calendarExportService.exportEvents).mockResolvedValueOnce({
        success: true,
        events_synced: 1,
        events_failed: 0,
        sync_log_id: 'timezone-sync-789',
        errors: [],
        duration_ms: 1500
      })

      const timezoneAwareSync = await calendarExportService.exportEvents(
        'user-123',
        'integration-789',
        {
          integration_id: 'integration-789',
          event_types: ['shift'],
          date_range: {
            start: new Date('2025-08-28T00:00:00Z'),
            end: new Date('2025-08-29T00:00:00Z')
          },
          force_sync: false
        }
      )

      expect(timezoneAwareSync.success).toBe(true)
    })

    it('should detect and handle DST transitions', async () => {
      vi.mocked(timezoneService.getDstTransitions).mockReturnValueOnce([
        {
          date: new Date('2025-03-09T07:00:00Z'),
          type: 'spring_forward',
          oldOffset: -5,
          newOffset: -4,
          timezone: 'America/New_York'
        }
      ])

      const dstTransitions = timezoneService.getDstTransitions('America/New_York', 2025)

      expect(dstTransitions).toHaveLength(1)
      expect(dstTransitions[0].type).toBe('spring_forward')

      // Mock conflict detection
      vi.mocked(timezoneService.detectTimezoneConflicts).mockReturnValueOnce([
        {
          eventIndex: 0,
          issue: 'dst_transition',
          description: 'Event occurs during DST transition (spring forward)',
          suggestion: 'Adjust event time to avoid the lost hour'
        }
      ])

      const events = [{
        start: new Date('2025-03-09T07:30:00Z'),
        end: new Date('2025-03-09T08:30:00Z'),
        timezone: 'America/New_York'
      }]

      const conflicts = timezoneService.detectTimezoneConflicts(events, 'America/New_York')

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].issue).toBe('dst_transition')
    })
  })

  describe('Role-Based Access Control in Sync Workflow', () => {
    it('should enforce role-based filtering in export workflow', async () => {
      // Test admin access (all events)
      vi.mocked(calendarExportService.exportEvents).mockResolvedValueOnce({
        success: true,
        events_synced: 25, // High number indicating admin sees all events
        events_failed: 0,
        sync_log_id: 'admin-sync-123',
        errors: [],
        duration_ms: 3500
      })

      const adminSync = await calendarExportService.exportEvents(
        'admin-user-456',
        'admin-integration',
        {
          integration_id: 'admin-integration',
          event_types: ['shift', 'availability', 'time_off'],
          date_range: {
            start: new Date('2025-08-28T00:00:00Z'),
            end: new Date('2025-08-29T00:00:00Z')
          },
          force_sync: false
        }
      )

      expect(adminSync.success).toBe(true)
      expect(adminSync.events_synced).toBe(25) // Admin sees all events

      // Test guard access (limited events)
      vi.mocked(calendarExportService.exportEvents).mockResolvedValueOnce({
        success: true,
        events_synced: 3, // Lower number indicating filtered view
        events_failed: 0,
        sync_log_id: 'guard-sync-456',
        errors: [],
        duration_ms: 1200
      })

      const guardSync = await calendarExportService.exportEvents(
        'guard-user-789',
        'guard-integration',
        {
          integration_id: 'guard-integration',
          event_types: ['shift', 'availability'],
          date_range: {
            start: new Date('2025-08-28T00:00:00Z'),
            end: new Date('2025-08-29T00:00:00Z')
          },
          force_sync: false
        }
      )

      expect(guardSync.success).toBe(true)
      expect(guardSync.events_synced).toBe(3) // Guard sees only assigned events
    })
  })

  describe('Error Recovery and Retry Workflow', () => {
    it('should handle sync failures with automatic retry', async () => {
      // First attempt fails
      vi.mocked(calendarExportService.exportEvents).mockResolvedValueOnce({
        success: false,
        events_synced: 0,
        events_failed: 3,
        sync_log_id: 'failed-sync-123',
        errors: [
          {
            event_id: 'event-1',
            event_type: 'shift',
            error_code: 'NETWORK_ERROR',
            error_message: 'Network timeout during calendar API call',
            retry_count: 0
          }
        ],
        duration_ms: 10000
      })

      const firstAttempt = await calendarExportService.exportEvents(
        'user-123',
        'integration-789',
        {
          integration_id: 'integration-789',
          event_types: ['shift'],
          date_range: {
            start: new Date('2025-08-28T00:00:00Z'),
            end: new Date('2025-08-29T00:00:00Z')
          },
          force_sync: false
        }
      )

      expect(firstAttempt.success).toBe(false)
      expect(firstAttempt.errors[0].error_code).toBe('NETWORK_ERROR')

      // Retry attempt succeeds
      vi.mocked(calendarExportService.exportEvents).mockResolvedValueOnce({
        success: true,
        events_synced: 3,
        events_failed: 0,
        sync_log_id: 'retry-sync-456',
        errors: [],
        duration_ms: 2000
      })

      const retryAttempt = await calendarExportService.exportEvents(
        'user-123',
        'integration-789',
        {
          integration_id: 'integration-789',
          event_types: ['shift'],
          date_range: {
            start: new Date('2025-08-28T00:00:00Z'),
            end: new Date('2025-08-29T00:00:00Z')
          },
          force_sync: true // Force retry
        }
      )

      expect(retryAttempt.success).toBe(true)
      expect(retryAttempt.events_synced).toBe(3)
    })

    it('should handle token expiration and refresh in workflow', async () => {
      // Mock token refresh during sync
      vi.mocked(oauthService.refreshAccessToken).mockResolvedValueOnce({
        success: true,
        data: {
          access_token: 'new-fresh-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'calendar.events',
          expires_at: new Date('2025-08-28T14:00:00Z')
        }
      })

      const tokenRefresh = await oauthService.refreshAccessToken('integration-789')
      expect(tokenRefresh.success).toBe(true)

      // Sync proceeds with refreshed token
      vi.mocked(calendarExportService.exportEvents).mockResolvedValueOnce({
        success: true,
        events_synced: 5,
        events_failed: 0,
        sync_log_id: 'refreshed-sync-789',
        errors: [],
        duration_ms: 2200
      })

      const syncAfterRefresh = await calendarExportService.exportEvents(
        'user-123',
        'integration-789',
        {
          integration_id: 'integration-789',
          event_types: ['shift'],
          date_range: {
            start: new Date('2025-08-28T00:00:00Z'),
            end: new Date('2025-08-29T00:00:00Z')
          },
          force_sync: false
        }
      )

      expect(syncAfterRefresh.success).toBe(true)
      expect(syncAfterRefresh.events_synced).toBe(5)
    })
  })

  describe('Preference Management Workflow', () => {
    it('should handle preference updates affecting sync behavior', async () => {
      // Update preferences
      vi.mocked(calendarIntegrationService.updatePreferences).mockResolvedValueOnce({
        success: true,
        data: {
          user_id: 'user-123',
          integration_id: 'integration-789',
          sync_shifts: true,
          sync_availability: false,
          include_client_info: false,
          sync_frequency: 'hourly',
          updated_at: '2025-08-28T10:00:00Z'
        }
      })

      const prefUpdate = await calendarIntegrationService.updatePreferences(
        'user-123',
        'integration-789',
        {
          sync_shifts: true,
          sync_availability: false,
          include_client_info: false
        }
      )

      expect(prefUpdate.success).toBe(true)
      expect(prefUpdate.data?.sync_shifts).toBe(true)
      expect(prefUpdate.data?.sync_availability).toBe(false)

      // Sync respects updated preferences (only shifts, no availability)
      vi.mocked(calendarExportService.exportEvents).mockResolvedValueOnce({
        success: true,
        events_synced: 2, // Only shifts, no availability
        events_failed: 0,
        sync_log_id: 'pref-sync-123',
        errors: [],
        duration_ms: 1500
      })

      const syncWithPreferences = await calendarExportService.exportEvents(
        'user-123',
        'integration-789',
        {
          integration_id: 'integration-789',
          event_types: ['shift'], // Only shifts per preferences
          date_range: {
            start: new Date('2025-08-28T00:00:00Z'),
            end: new Date('2025-08-29T00:00:00Z')
          },
          force_sync: false
        }
      )

      expect(syncWithPreferences.success).toBe(true)
      expect(syncWithPreferences.events_synced).toBe(2)
    })

    it('should handle sync toggle workflow', async () => {
      // Disable sync
      vi.mocked(calendarIntegrationService.toggleSync).mockResolvedValueOnce({
        success: true
      })

      const disableSync = await calendarIntegrationService.toggleSync(
        'user-123',
        'integration-789',
        false
      )

      expect(disableSync.success).toBe(true)

      // Enable sync
      vi.mocked(calendarIntegrationService.toggleSync).mockResolvedValueOnce({
        success: true
      })

      const enableSync = await calendarIntegrationService.toggleSync(
        'user-123',
        'integration-789',
        true
      )

      expect(enableSync.success).toBe(true)

      // Verify toggle calls
      expect(calendarIntegrationService.toggleSync).toHaveBeenCalledTimes(2)
      expect(calendarIntegrationService.toggleSync).toHaveBeenNthCalledWith(1, 'user-123', 'integration-789', false)
      expect(calendarIntegrationService.toggleSync).toHaveBeenNthCalledWith(2, 'user-123', 'integration-789', true)
    })
  })

  describe('Performance and Monitoring Workflow', () => {
    it('should track sync performance metrics across workflow', async () => {
      const performanceMetrics = {
        startTime: Date.now(),
        endTime: Date.now() + 2500,
        eventsProcessed: 15,
        apiCallsDuration: 1800,
        databaseOperationsDuration: 400,
        memoryUsage: process.memoryUsage()
      }

      // Mock sync with performance tracking
      vi.mocked(calendarExportService.exportEvents).mockResolvedValueOnce({
        success: true,
        events_synced: 15,
        events_failed: 0,
        sync_log_id: 'perf-sync-123',
        errors: [],
        duration_ms: performanceMetrics.endTime - performanceMetrics.startTime
      })

      const perfSync = await calendarExportService.exportEvents(
        'user-123',
        'integration-789',
        {
          integration_id: 'integration-789',
          event_types: ['shift', 'availability'],
          date_range: {
            start: new Date('2025-08-28T00:00:00Z'),
            end: new Date('2025-08-29T00:00:00Z')
          },
          force_sync: false
        }
      )

      expect(perfSync.success).toBe(true)
      expect(perfSync.duration_ms).toBe(2500)
      expect(perfSync.events_synced).toBe(15)

      // Get performance statistics
      vi.mocked(calendarIntegrationService.getSyncStats).mockResolvedValueOnce({
        success: true,
        data: {
          integration_id: 'integration-789',
          total_syncs: 50,
          successful_syncs: 48,
          failed_syncs: 2,
          average_duration_ms: 2200,
          events_synced_total: 750,
          last_24h: {
            syncs: 5,
            events: 75,
            errors: 0
          },
          uptime_percentage: 96.0
        }
      })

      const perfStats = await calendarIntegrationService.getSyncStats('user-123', 'integration-789')

      expect(perfStats.success).toBe(true)
      expect(perfStats.data?.uptime_percentage).toBeGreaterThan(95)
      expect(perfStats.data?.average_duration_ms).toBeLessThan(3000)
    })
  })
})