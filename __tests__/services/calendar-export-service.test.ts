/**
 * Calendar Export Service Tests
 * Tests role-based calendar event export with one-way sync enforcement
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calendarExportService } from '@/lib/services/calendar-export-service'
import { createClient } from '@/lib/supabase'
import { oauthService } from '@/lib/services/oauth-service'

// Mock dependencies
vi.mock('@/lib/supabase')
vi.mock('@/lib/services/oauth-service')

const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  in: vi.fn(() => mockSupabase),
  gte: vi.fn(() => mockSupabase),
  lte: vi.fn(() => mockSupabase),
  single: vi.fn(() => Promise.resolve({ data: null, error: null }))
}

vi.mocked(createClient).mockReturnValue(mockSupabase as any)

// Mock OAuth service
const mockOAuthService = {
  refreshAccessToken: vi.fn()
}
vi.mocked(oauthService).refreshAccessToken = mockOAuthService.refreshAccessToken

// Mock fetch for calendar API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-sync-log-uuid'
  }
})

describe('CalendarExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.setSystemTime(new Date('2025-08-28T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mockIntegration = {
    id: 'integration-123',
    provider: 'google_calendar',
    is_active: true,
    sync_enabled: true
  }

  const mockShift = {
    id: 'shift-123',
    title: 'Security Shift',
    client_name: 'Test Client',
    site_name: 'Test Site',
    time_range: {
      start: '2025-08-28T14:00:00Z',
      end: '2025-08-28T22:00:00Z'
    },
    priority: 'high',
    special_requirements: 'Armed guard required',
    shift_assignments: [{ guard_id: 'guard-123', assignment_status: 'assigned' }],
    guard_profiles: [{ user_id: 'guard-123', first_name: 'John', last_name: 'Doe' }]
  }

  describe('exportEvents', () => {
    it('should export events for admin user with full access', async () => {
      // Mock integration lookup
      mockSupabase.single.mockImplementationOnce(() => 
        Promise.resolve({ data: mockIntegration, error: null })
      )

      // Mock user role lookup  
      mockSupabase.single.mockImplementationOnce(() =>
        Promise.resolve({ data: { role_name: 'admin' }, error: null })
      )

      // Mock preferences lookup
      mockSupabase.single.mockImplementation(() =>
        Promise.resolve({ data: { include_client_info: true }, error: null })
      )

      // Mock shift data for admin (all shifts)
      mockSupabase.select.mockImplementationOnce(() =>
        Promise.resolve({ data: [mockShift], error: null })
      )

      // Mock successful token refresh
      mockOAuthService.refreshAccessToken.mockResolvedValueOnce({
        success: true,
        data: { access_token: 'fresh-token' }
      })

      // Mock successful Google Calendar API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'google-event-123' })
      })

      // Mock sync logging
      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })

      // Mock last sync update
      mockSupabase.update.mockResolvedValueOnce({ data: null, error: null })

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['shift'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      const result = await calendarExportService.exportEvents(
        'admin-user-123',
        'integration-123',
        syncRequest
      )

      expect(result.success).toBe(true)
      expect(result.events_synced).toBe(1)
      expect(result.events_failed).toBe(0)
      expect(result.sync_log_id).toBe('test-sync-log-uuid')

      // Verify Google Calendar API was called with correct event data
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer fresh-token',
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('Security Shift - Test Client')
        })
      )

      // Verify sync log was created
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'test-sync-log-uuid',
          integration_id: 'integration-123',
          sync_type: 'export_shift',
          operation_status: 'completed',
          events_processed: 1
        })
      ])
    })

    it('should export limited events for guard user', async () => {
      mockSupabase.single.mockImplementationOnce(() => 
        Promise.resolve({ data: mockIntegration, error: null })
      )

      mockSupabase.single.mockImplementationOnce(() =>
        Promise.resolve({ data: { role_name: 'guard' }, error: null })
      )

      mockSupabase.single.mockImplementation(() =>
        Promise.resolve({ data: { include_client_info: false }, error: null })
      )

      // Mock shift query for guard (only assigned shifts)
      mockSupabase.select.mockImplementationOnce(() => {
        // Verify guard-specific filtering was applied
        expect(mockSupabase.eq).toHaveBeenCalledWith('shift_assignments.guard_id', 'guard-user-456')
        return Promise.resolve({ data: [mockShift], error: null })
      })

      mockOAuthService.refreshAccessToken.mockResolvedValueOnce({
        success: true,
        data: { access_token: 'guard-token' }
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'guard-event-123' })
      })

      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.update.mockResolvedValueOnce({ data: null, error: null })

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['shift'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      const result = await calendarExportService.exportEvents(
        'guard-user-456',
        'integration-123',
        syncRequest
      )

      expect(result.success).toBe(true)
      expect(result.events_synced).toBe(1)

      // Verify API call with privacy-filtered event data
      const apiCall = mockFetch.mock.calls[0]
      const eventBody = JSON.parse(apiCall[1].body)
      expect(eventBody.summary).toBe('Security Shift') // No client name for guard
      expect(eventBody.description).not.toContain('Test Client') // Privacy filtered
    })

    it('should export manager events for managed guards only', async () => {
      mockSupabase.single.mockImplementationOnce(() => 
        Promise.resolve({ data: mockIntegration, error: null })
      )

      mockSupabase.single.mockImplementationOnce(() =>
        Promise.resolve({ data: { role_name: 'manager' }, error: null })
      )

      // Mock managed guards lookup
      mockSupabase.select.mockImplementationOnce(() =>
        Promise.resolve({ 
          data: [
            { user_id: 'managed-guard-1' },
            { user_id: 'managed-guard-2' }
          ], 
          error: null 
        })
      )

      mockSupabase.single.mockImplementation(() =>
        Promise.resolve({ data: { include_guard_names: true }, error: null })
      )

      // Mock shift query for manager (managed guards only)
      mockSupabase.select.mockImplementationOnce(() => {
        // Verify manager-specific filtering was applied
        expect(mockSupabase.in).toHaveBeenCalledWith(
          'shift_assignments.guard_id', 
          ['managed-guard-1', 'managed-guard-2']
        )
        return Promise.resolve({ data: [mockShift], error: null })
      })

      mockOAuthService.refreshAccessToken.mockResolvedValueOnce({
        success: true,
        data: { access_token: 'manager-token' }
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'manager-event-123' })
      })

      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.update.mockResolvedValueOnce({ data: null, error: null })

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['shift'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      await calendarExportService.exportEvents(
        'manager-user-789',
        'integration-123',
        syncRequest
      )

      // Verify managed guards query was made
      expect(mockSupabase.from).toHaveBeenCalledWith('guard_profiles')
      expect(mockSupabase.eq).toHaveBeenCalledWith('manager_id', 'manager-user-789')
    })

    it('should handle Microsoft Outlook calendar export', async () => {
      const microsoftIntegration = { ...mockIntegration, provider: 'microsoft_outlook' }
      
      mockSupabase.single.mockImplementationOnce(() => 
        Promise.resolve({ data: microsoftIntegration, error: null })
      )

      mockSupabase.single.mockImplementationOnce(() =>
        Promise.resolve({ data: { role_name: 'admin' }, error: null })
      )

      mockSupabase.single.mockImplementation(() =>
        Promise.resolve({ data: { include_site_details: true }, error: null })
      )

      mockSupabase.select.mockImplementationOnce(() =>
        Promise.resolve({ data: [mockShift], error: null })
      )

      mockOAuthService.refreshAccessToken.mockResolvedValueOnce({
        success: true,
        data: { access_token: 'microsoft-token' }
      })

      // Mock Microsoft Graph API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'outlook-event-123' })
      })

      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.update.mockResolvedValueOnce({ data: null, error: null })

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['shift'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      await calendarExportService.exportEvents(
        'admin-user-123',
        'integration-123',
        syncRequest
      )

      // Verify Microsoft Graph API was called
      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me/events',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer microsoft-token',
            'Content-Type': 'application/json'
          }
        })
      )

      // Verify Microsoft event format
      const apiCall = mockFetch.mock.calls[0]
      const eventBody = JSON.parse(apiCall[1].body)
      expect(eventBody.subject).toBeDefined() // Microsoft uses 'subject' not 'summary'
      expect(eventBody.body.contentType).toBe('text')
    })

    it('should handle availability events export', async () => {
      mockSupabase.single.mockImplementationOnce(() => 
        Promise.resolve({ data: mockIntegration, error: null })
      )

      mockSupabase.single.mockImplementationOnce(() =>
        Promise.resolve({ data: { role_name: 'guard' }, error: null })
      )

      mockSupabase.single.mockImplementation(() =>
        Promise.resolve({ data: { sync_availability: true }, error: null })
      )

      // Mock availability data
      const mockAvailability = {
        id: 'avail-123',
        guard_id: 'guard-456',
        time_range: {
          start: '2025-08-28T09:00:00Z',
          end: '2025-08-28T17:00:00Z'
        },
        availability_type: 'regular',
        availability_status: 'available',
        guard_profiles: { user_id: 'guard-456', first_name: 'Jane', last_name: 'Smith' }
      }

      mockSupabase.select.mockImplementationOnce(() =>
        Promise.resolve({ data: [mockAvailability], error: null })
      )

      mockOAuthService.refreshAccessToken.mockResolvedValueOnce({
        success: true,
        data: { access_token: 'availability-token' }
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'availability-event-123' })
      })

      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.update.mockResolvedValueOnce({ data: null, error: null })

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['availability'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      const result = await calendarExportService.exportEvents(
        'guard-user-456',
        'integration-123',
        syncRequest
      )

      expect(result.success).toBe(true)
      expect(result.events_synced).toBe(1)

      // Verify availability event format
      const apiCall = mockFetch.mock.calls[0]
      const eventBody = JSON.parse(apiCall[1].body)
      expect(eventBody.summary).toBe('Available for Work')
      expect(eventBody.description).toContain('Guard availability')
    })

    it('should handle time off events export', async () => {
      mockSupabase.single.mockImplementationOnce(() => 
        Promise.resolve({ data: mockIntegration, error: null })
      )

      mockSupabase.single.mockImplementationOnce(() =>
        Promise.resolve({ data: { role_name: 'guard' }, error: null })
      )

      mockSupabase.single.mockImplementation(() =>
        Promise.resolve({ data: { sync_time_off: true }, error: null })
      )

      // Mock time off data
      const mockTimeOff = {
        id: 'timeoff-123',
        guard_id: 'guard-789',
        time_range: {
          start: '2025-08-30T00:00:00Z',
          end: '2025-08-31T00:00:00Z'
        },
        time_off_type: 'vacation',
        reason: 'Family vacation',
        status: 'approved',
        guard_profiles: { user_id: 'guard-789', first_name: 'Mike', last_name: 'Johnson' }
      }

      mockSupabase.select.mockImplementationOnce(() =>
        Promise.resolve({ data: [mockTimeOff], error: null })
      )

      mockOAuthService.refreshAccessToken.mockResolvedValueOnce({
        success: true,
        data: { access_token: 'timeoff-token' }
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'timeoff-event-123' })
      })

      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.update.mockResolvedValueOnce({ data: null, error: null })

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['time_off'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-09-01T00:00:00Z')
        },
        force_sync: false
      }

      const result = await calendarExportService.exportEvents(
        'guard-user-789',
        'integration-123',
        syncRequest
      )

      expect(result.success).toBe(true)

      // Verify time off event format
      const apiCall = mockFetch.mock.calls[0]
      const eventBody = JSON.parse(apiCall[1].body)
      expect(eventBody.summary).toBe('Time Off - vacation')
      expect(eventBody.description).toBe('Family vacation')
    })

    it('should handle bulk export with multiple event types', async () => {
      mockSupabase.single.mockImplementationOnce(() => 
        Promise.resolve({ data: mockIntegration, error: null })
      )

      mockSupabase.single.mockImplementationOnce(() =>
        Promise.resolve({ data: { role_name: 'manager' }, error: null })
      )

      // Mock managed guards
      mockSupabase.select.mockImplementationOnce(() =>
        Promise.resolve({ data: [{ user_id: 'managed-1' }], error: null })
      )

      mockSupabase.single.mockImplementation(() =>
        Promise.resolve({ data: { include_client_info: true }, error: null })
      )

      // Mock multiple event types
      mockSupabase.select
        .mockImplementationOnce(() => Promise.resolve({ data: [mockShift], error: null })) // shifts
        .mockImplementationOnce(() => Promise.resolve({ data: [], error: null })) // availability  
        .mockImplementationOnce(() => Promise.resolve({ data: [], error: null })) // time off

      mockOAuthService.refreshAccessToken.mockResolvedValueOnce({
        success: true,
        data: { access_token: 'bulk-token' }
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'bulk-event-123' })
      })

      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.update.mockResolvedValueOnce({ data: null, error: null })

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['shift', 'availability', 'time_off'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      const result = await calendarExportService.exportEvents(
        'manager-user-456',
        'integration-123',
        syncRequest
      )

      expect(result.success).toBe(true)

      // Verify bulk export was logged
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          sync_type: 'bulk_export'
        })
      ])
    })

    it('should handle integration not found', async () => {
      mockSupabase.single.mockImplementationOnce(() => 
        Promise.resolve({ data: null, error: { message: 'Not found' } })
      )

      const syncRequest = {
        integration_id: 'invalid-integration',
        event_types: ['shift'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      const result = await calendarExportService.exportEvents(
        'user-123',
        'invalid-integration',
        syncRequest
      )

      expect(result.success).toBe(false)
      expect(result.events_synced).toBe(0)
      expect(result.events_failed).toBe(1)
      expect(result.errors[0].error_message).toContain('Calendar integration not found')
    })

    it('should handle token refresh failure', async () => {
      mockSupabase.single.mockImplementationOnce(() => 
        Promise.resolve({ data: mockIntegration, error: null })
      )

      mockSupabase.single.mockImplementationOnce(() =>
        Promise.resolve({ data: { role_name: 'admin' }, error: null })
      )

      mockSupabase.single.mockImplementation(() =>
        Promise.resolve({ data: { include_client_info: true }, error: null })
      )

      mockSupabase.select.mockImplementationOnce(() =>
        Promise.resolve({ data: [mockShift], error: null })
      )

      // Mock token refresh failure
      mockOAuthService.refreshAccessToken.mockResolvedValueOnce({
        success: false,
        error: 'Token expired and cannot be refreshed'
      })

      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['shift'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      const result = await calendarExportService.exportEvents(
        'admin-user-123',
        'integration-123',
        syncRequest
      )

      expect(result.success).toBe(false)
      expect(result.errors[0].error_message).toContain('Token refresh failed')

      // Verify failed operation was logged
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          operation_status: 'failed',
          error_message: expect.stringContaining('Token refresh failed')
        })
      ])
    })

    it('should handle calendar API failure', async () => {
      mockSupabase.single.mockImplementationOnce(() => 
        Promise.resolve({ data: mockIntegration, error: null })
      )

      mockSupabase.single.mockImplementationOnce(() =>
        Promise.resolve({ data: { role_name: 'admin' }, error: null })
      )

      mockSupabase.single.mockImplementation(() =>
        Promise.resolve({ data: { include_client_info: true }, error: null })
      )

      mockSupabase.select.mockImplementationOnce(() =>
        Promise.resolve({ data: [mockShift], error: null })
      )

      mockOAuthService.refreshAccessToken.mockResolvedValueOnce({
        success: true,
        data: { access_token: 'valid-token' }
      })

      // Mock API failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            message: 'Insufficient permissions',
            code: 403
          }
        })
      })

      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.update.mockResolvedValueOnce({ data: null, error: null })

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['shift'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      const result = await calendarExportService.exportEvents(
        'admin-user-123',
        'integration-123',
        syncRequest
      )

      expect(result.success).toBe(false)
      expect(result.events_synced).toBe(0)
      expect(result.events_failed).toBe(1)
      expect(result.errors[0].error_message).toContain('Insufficient permissions')
    })

    it('should handle unsupported user role', async () => {
      mockSupabase.single.mockImplementationOnce(() => 
        Promise.resolve({ data: mockIntegration, error: null })
      )

      mockSupabase.single.mockImplementationOnce(() =>
        Promise.resolve({ data: { role_name: 'unknown_role' }, error: null })
      )

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['shift'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      const result = await calendarExportService.exportEvents(
        'unknown-user-123',
        'integration-123',
        syncRequest
      )

      expect(result.success).toBe(false)
      expect(result.errors[0].error_message).toContain('Unsupported user role')
    })

    it('should respect date range filtering', async () => {
      mockSupabase.single.mockImplementationOnce(() => 
        Promise.resolve({ data: mockIntegration, error: null })
      )

      mockSupabase.single.mockImplementationOnce(() =>
        Promise.resolve({ data: { role_name: 'admin' }, error: null })
      )

      mockSupabase.single.mockImplementation(() =>
        Promise.resolve({ data: { include_client_info: true }, error: null })
      )

      // Mock date range query
      mockSupabase.select.mockImplementationOnce(() => {
        expect(mockSupabase.gte).toHaveBeenCalledWith('time_range', '2025-08-28T00:00:00.000Z')
        expect(mockSupabase.lte).toHaveBeenCalledWith('time_range', '2025-08-30T00:00:00.000Z')
        return Promise.resolve({ data: [mockShift], error: null })
      })

      mockOAuthService.refreshAccessToken.mockResolvedValueOnce({
        success: true,
        data: { access_token: 'date-range-token' }
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'date-range-event-123' })
      })

      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.update.mockResolvedValueOnce({ data: null, error: null })

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['shift'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-30T00:00:00Z')
        },
        force_sync: false
      }

      await calendarExportService.exportEvents(
        'admin-user-123',
        'integration-123',
        syncRequest
      )

      // Date range filtering verification is in the mock implementation above
    })
  })

  describe('Privacy and Security', () => {
    it('should respect privacy settings for client information', async () => {
      mockSupabase.single.mockImplementationOnce(() => 
        Promise.resolve({ data: mockIntegration, error: null })
      )

      mockSupabase.single.mockImplementationOnce(() =>
        Promise.resolve({ data: { role_name: 'guard' }, error: null })
      )

      // Mock privacy setting - no client info
      mockSupabase.single.mockImplementation(() =>
        Promise.resolve({ data: { include_client_info: false }, error: null })
      )

      mockSupabase.select.mockImplementationOnce(() =>
        Promise.resolve({ data: [mockShift], error: null })
      )

      mockOAuthService.refreshAccessToken.mockResolvedValueOnce({
        success: true,
        data: { access_token: 'privacy-token' }
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'privacy-event-123' })
      })

      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.update.mockResolvedValueOnce({ data: null, error: null })

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['shift'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      await calendarExportService.exportEvents(
        'guard-user-123',
        'integration-123',
        syncRequest
      )

      // Verify privacy filtering in API call
      const apiCall = mockFetch.mock.calls[0]
      const eventBody = JSON.parse(apiCall[1].body)
      expect(eventBody.summary).toBe('Security Shift') // No client name
      expect(eventBody.description).not.toContain('Test Client')
      expect(eventBody.location).toBeUndefined() // Site details also filtered
    })

    it('should enforce one-way sync by only exporting events', async () => {
      // This test verifies that the service only makes POST requests (export)
      // and never makes GET requests to import calendar data
      
      mockSupabase.single.mockImplementationOnce(() => 
        Promise.resolve({ data: mockIntegration, error: null })
      )

      mockSupabase.single.mockImplementationOnce(() =>
        Promise.resolve({ data: { role_name: 'admin' }, error: null })
      )

      mockSupabase.single.mockImplementation(() =>
        Promise.resolve({ data: { include_client_info: true }, error: null })
      )

      mockSupabase.select.mockImplementationOnce(() =>
        Promise.resolve({ data: [mockShift], error: null })
      )

      mockOAuthService.refreshAccessToken.mockResolvedValueOnce({
        success: true,
        data: { access_token: 'oneway-token' }
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'oneway-event-123' })
      })

      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.update.mockResolvedValueOnce({ data: null, error: null })

      const syncRequest = {
        integration_id: 'integration-123',
        event_types: ['shift'],
        date_range: {
          start: new Date('2025-08-28T00:00:00Z'),
          end: new Date('2025-08-29T00:00:00Z')
        },
        force_sync: false
      }

      await calendarExportService.exportEvents(
        'admin-user-123',
        'integration-123',
        syncRequest
      )

      // Verify only POST method was used (export only, no import)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' })
      )

      // Verify no GET requests were made (would indicate import functionality)
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'GET' })
      )
    })
  })
})