/**
 * Calendar Export Service
 * Handles role-based calendar event export with one-way sync enforcement
 */

import { createClient } from '@/lib/supabase'
import type { 
  CalendarExportEvent,
  CalendarExportFilter,
  CalendarSyncRequest,
  CalendarSyncResponse,
  CalendarSyncError,
  ManagerCalendarData,
  GuardCalendarData,
  EventType,
  CalendarExportConfig
} from '@/lib/types/calendar-types'
import type { CalendarProvider } from '@/lib/types/oauth-types'
import { oauthService } from './oauth-service'

class CalendarExportService {
  private readonly supabase = createClient()

  // Main export method with role-based filtering
  async exportEvents(
    userId: string,
    integrationId: string,
    syncRequest: CalendarSyncRequest
  ): Promise<CalendarSyncResponse> {
    const startTime = Date.now()
    const syncLogId = crypto.randomUUID()
    let eventsProcessed = 0
    let eventsFailed = 0
    const errors: CalendarSyncError[] = []

    try {
      // Get user integration and verify access
      const integration = await this.getIntegration(userId, integrationId)
      if (!integration) {
        throw new Error('Calendar integration not found')
      }

      // Get user role for filtering
      const userRole = await this.getUserRole(userId)
      
      // Create export filter based on user role
      const exportFilter: CalendarExportFilter = {
        userId,
        userRole,
        eventTypes: syncRequest.event_types,
        includeClientInfo: await this.getUserPreference(userId, integrationId, 'include_client_info'),
        includeGuardNames: await this.getUserPreference(userId, integrationId, 'include_guard_names'),
        includeSiteDetails: await this.getUserPreference(userId, integrationId, 'include_site_details'),
        dateRange: syncRequest.date_range
      }

      // Get events based on role
      let events: CalendarExportEvent[] = []
      
      switch (userRole) {
        case 'admin':
          events = await this.getAdminEvents(exportFilter)
          break
        case 'manager':
          events = await this.getManagerEvents(exportFilter)
          break
        case 'guard':
          events = await this.getGuardEvents(exportFilter)
          break
        default:
          throw new Error(`Unsupported user role: ${userRole}`)
      }

      // Export events to external calendar
      const exportResults = await this.exportEventsToProvider(
        integration.provider,
        integration,
        events,
        syncRequest.force_sync
      )

      eventsProcessed = exportResults.successful
      eventsFailed = exportResults.failed
      errors.push(...exportResults.errors)

      // Log sync operation
      await this.logSyncOperation(integrationId, syncLogId, {
        sync_type: syncRequest.event_types.length > 1 ? 'bulk_export' : `export_${syncRequest.event_types[0]}`,
        operation_status: eventsFailed > 0 ? 'completed' : 'completed',
        events_processed: eventsProcessed,
        operation_duration_ms: Date.now() - startTime,
        error_count: eventsFailed
      })

      // Update last sync time
      await this.updateLastSyncTime(integrationId)

      return {
        success: eventsFailed === 0,
        events_synced: eventsProcessed,
        events_failed: eventsFailed,
        sync_log_id: syncLogId,
        errors,
        duration_ms: Date.now() - startTime
      }

    } catch (error) {
      console.error('Calendar export error:', error)
      
      // Log failed operation
      await this.logSyncOperation(integrationId, syncLogId, {
        sync_type: 'bulk_export',
        operation_status: 'failed',
        events_processed: eventsProcessed,
        operation_duration_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })

      return {
        success: false,
        events_synced: eventsProcessed,
        events_failed: eventsFailed + 1,
        sync_log_id: syncLogId,
        errors: [{
          event_id: '',
          event_type: 'shift',
          error_code: 'EXPORT_ERROR',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          retry_count: 0
        }],
        duration_ms: Date.now() - startTime
      }
    }
  }

  // Get admin events (all events in system)
  private async getAdminEvents(filter: CalendarExportFilter): Promise<CalendarExportEvent[]> {
    const events: CalendarExportEvent[] = []
    
    if (filter.eventTypes.includes('shift')) {
      const shifts = await this.getShiftEvents(filter, 'admin')
      events.push(...shifts)
    }
    
    if (filter.eventTypes.includes('availability')) {
      const availability = await this.getAvailabilityEvents(filter, 'admin')
      events.push(...availability)
    }
    
    if (filter.eventTypes.includes('time_off')) {
      const timeOff = await this.getTimeOffEvents(filter, 'admin')
      events.push(...timeOff)
    }

    return events
  }

  // Get manager events (managed team events only)
  private async getManagerEvents(filter: CalendarExportFilter): Promise<CalendarExportEvent[]> {
    const events: CalendarExportEvent[] = []
    
    // Get manager's managed guards
    const { data: managedGuards } = await this.supabase
      .from('guard_profiles')
      .select('user_id')
      .eq('manager_id', filter.userId)
      .eq('employment_status', 'active')

    const managedGuardIds = managedGuards?.map(g => g.user_id) || []
    
    if (filter.eventTypes.includes('shift')) {
      const shifts = await this.getShiftEvents({
        ...filter,
        managedGuardIds
      }, 'manager')
      events.push(...shifts)
    }
    
    if (filter.eventTypes.includes('availability')) {
      const availability = await this.getAvailabilityEvents({
        ...filter,
        managedGuardIds
      }, 'manager')
      events.push(...availability)
    }
    
    if (filter.eventTypes.includes('time_off')) {
      const timeOff = await this.getTimeOffEvents({
        ...filter,
        managedGuardIds
      }, 'manager')
      events.push(...timeOff)
    }

    return events
  }

  // Get guard events (personal events only)
  private async getGuardEvents(filter: CalendarExportFilter): Promise<CalendarExportEvent[]> {
    const events: CalendarExportEvent[] = []
    
    if (filter.eventTypes.includes('shift')) {
      const shifts = await this.getShiftEvents(filter, 'guard')
      events.push(...shifts)
    }
    
    if (filter.eventTypes.includes('availability')) {
      const availability = await this.getAvailabilityEvents(filter, 'guard')
      events.push(...availability)
    }
    
    if (filter.eventTypes.includes('time_off')) {
      const timeOff = await this.getTimeOffEvents(filter, 'guard')
      events.push(...timeOff)
    }

    return events
  }

  // Get shift events with role-based filtering
  private async getShiftEvents(
    filter: CalendarExportFilter & { managedGuardIds?: string[] },
    role: 'admin' | 'manager' | 'guard'
  ): Promise<CalendarExportEvent[]> {
    let query = this.supabase
      .from('shifts')
      .select(`
        id, title, client_name, site_name, time_range, priority, special_requirements,
        shift_assignments!inner(guard_id, assignment_status),
        guard_profiles!shift_assignments(user_id, first_name, last_name)
      `)

    // Apply role-based filtering
    switch (role) {
      case 'admin':
        // Admin sees all shifts
        break
      case 'manager':
        // Manager sees shifts for managed guards only
        if (filter.managedGuardIds && filter.managedGuardIds.length > 0) {
          query = query.in('shift_assignments.guard_id', filter.managedGuardIds)
        } else {
          return [] // No managed guards
        }
        break
      case 'guard':
        // Guard sees only assigned shifts
        query = query.eq('shift_assignments.guard_id', filter.userId)
        break
    }

    // Apply date range filter
    if (filter.dateRange) {
      query = query.gte('time_range', filter.dateRange.start.toISOString())
        .lte('time_range', filter.dateRange.end.toISOString())
    }

    query = query.eq('shift_assignments.assignment_status', 'assigned')

    const { data: shifts } = await query

    return shifts?.map(shift => {
      const timeRange = shift.time_range as { start: string, end: string }
      
      return {
        id: shift.id,
        title: this.generateShiftTitle(shift, filter),
        description: this.generateShiftDescription(shift, filter),
        start_time: new Date(timeRange.start),
        end_time: new Date(timeRange.end),
        timezone: 'UTC', // Will be converted to user timezone
        location: filter.includeSiteDetails ? shift.site_name : undefined,
        event_type: 'shift' as EventType,
        source_id: shift.id,
        privacy_level: filter.includeClientInfo ? 'public' : 'private',
        metadata: {
          client_name: filter.includeClientInfo ? shift.client_name : undefined,
          site_name: filter.includeSiteDetails ? shift.site_name : undefined,
          guard_names: filter.includeGuardNames ? 
            shift.guard_profiles?.map((g: any) => `${g.first_name} ${g.last_name}`) : 
            undefined,
          shift_priority: shift.priority,
          requirements: shift.special_requirements
        }
      } as CalendarExportEvent
    }) || []
  }

  // Get availability events with role-based filtering
  private async getAvailabilityEvents(
    filter: CalendarExportFilter & { managedGuardIds?: string[] },
    role: 'admin' | 'manager' | 'guard'
  ): Promise<CalendarExportEvent[]> {
    let query = this.supabase
      .from('guard_availability')
      .select(`
        id, guard_id, time_range, availability_type, availability_status,
        guard_profiles!inner(user_id, first_name, last_name)
      `)

    // Apply role-based filtering
    switch (role) {
      case 'admin':
        // Admin sees all availability
        break
      case 'manager':
        // Manager sees availability for managed guards only
        if (filter.managedGuardIds && filter.managedGuardIds.length > 0) {
          query = query.in('guard_id', filter.managedGuardIds)
        } else {
          return []
        }
        break
      case 'guard':
        // Guard sees only their own availability
        query = query.eq('guard_id', filter.userId)
        break
    }

    // Apply date range filter
    if (filter.dateRange) {
      query = query.gte('time_range', filter.dateRange.start.toISOString())
        .lte('time_range', filter.dateRange.end.toISOString())
    }

    query = query.eq('availability_status', 'available')

    const { data: availability } = await query

    return availability?.map(avail => {
      const timeRange = avail.time_range as { start: string, end: string }
      const guardProfile = avail.guard_profiles as any
      
      return {
        id: avail.id,
        title: role === 'guard' ? 'Available for Work' : `${guardProfile.first_name} ${guardProfile.last_name} - Available`,
        description: `Guard availability - ${avail.availability_type}`,
        start_time: new Date(timeRange.start),
        end_time: new Date(timeRange.end),
        timezone: 'UTC',
        event_type: 'availability' as EventType,
        source_id: avail.id,
        privacy_level: 'private',
        metadata: {
          guard_names: filter.includeGuardNames ? [`${guardProfile.first_name} ${guardProfile.last_name}`] : undefined
        }
      } as CalendarExportEvent
    }) || []
  }

  // Get time off events with role-based filtering
  private async getTimeOffEvents(
    filter: CalendarExportFilter & { managedGuardIds?: string[] },
    role: 'admin' | 'manager' | 'guard'
  ): Promise<CalendarExportEvent[]> {
    let query = this.supabase
      .from('guard_time_off_requests')
      .select(`
        id, guard_id, time_range, time_off_type, reason,
        guard_profiles!inner(user_id, first_name, last_name)
      `)

    // Apply role-based filtering
    switch (role) {
      case 'admin':
        // Admin sees all time off requests
        break
      case 'manager':
        // Manager sees time off for managed guards only
        if (filter.managedGuardIds && filter.managedGuardIds.length > 0) {
          query = query.in('guard_id', filter.managedGuardIds)
        } else {
          return []
        }
        break
      case 'guard':
        // Guard sees only their own time off
        query = query.eq('guard_id', filter.userId)
        break
    }

    // Apply date range filter
    if (filter.dateRange) {
      query = query.gte('time_range', filter.dateRange.start.toISOString())
        .lte('time_range', filter.dateRange.end.toISOString())
    }

    query = query.eq('status', 'approved')

    const { data: timeOff } = await query

    return timeOff?.map(request => {
      const timeRange = request.time_range as { start: string, end: string }
      const guardProfile = request.guard_profiles as any
      
      return {
        id: request.id,
        title: role === 'guard' ? 
          `Time Off - ${request.time_off_type}` : 
          `${guardProfile.first_name} ${guardProfile.last_name} - Time Off`,
        description: request.reason || `${request.time_off_type} time off request`,
        start_time: new Date(timeRange.start),
        end_time: new Date(timeRange.end),
        timezone: 'UTC',
        event_type: 'time_off' as EventType,
        source_id: request.id,
        privacy_level: 'private',
        metadata: {
          guard_names: filter.includeGuardNames ? [`${guardProfile.first_name} ${guardProfile.last_name}`] : undefined
        }
      } as CalendarExportEvent
    }) || []
  }

  // Export events to external calendar provider
  private async exportEventsToProvider(
    provider: CalendarProvider,
    integration: any,
    events: CalendarExportEvent[],
    forceSync = false
  ): Promise<{ successful: number; failed: number; errors: CalendarSyncError[] }> {
    let successful = 0
    let failed = 0
    const errors: CalendarSyncError[] = []

    // Get fresh access token
    const tokenResult = await oauthService.refreshAccessToken(integration.id)
    if (!tokenResult.success) {
      throw new Error(`Token refresh failed: ${tokenResult.error}`)
    }

    const accessToken = tokenResult.data!.access_token

    for (const event of events) {
      try {
        switch (provider) {
          case 'google_calendar':
            await this.exportToGoogleCalendar(event, accessToken)
            break
          case 'microsoft_outlook':
            await this.exportToMicrosoftCalendar(event, accessToken)
            break
          default:
            throw new Error(`Unsupported provider: ${provider}`)
        }
        successful++
      } catch (error) {
        failed++
        errors.push({
          event_id: event.id,
          event_type: event.event_type,
          error_code: 'EXPORT_FAILED',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          retry_count: 0
        })
      }
    }

    return { successful, failed, errors }
  }

  // Export to Google Calendar
  private async exportToGoogleCalendar(event: CalendarExportEvent, accessToken: string): Promise<void> {
    const googleEvent = {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.start_time.toISOString(),
        timeZone: event.timezone
      },
      end: {
        dateTime: event.end_time.toISOString(),
        timeZone: event.timezone
      },
      location: event.location
    }

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(googleEvent)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Google Calendar API error: ${error.error?.message || response.statusText}`)
    }
  }

  // Export to Microsoft Calendar
  private async exportToMicrosoftCalendar(event: CalendarExportEvent, accessToken: string): Promise<void> {
    const microsoftEvent = {
      subject: event.title,
      body: {
        contentType: 'text',
        content: event.description
      },
      start: {
        dateTime: event.start_time.toISOString(),
        timeZone: event.timezone
      },
      end: {
        dateTime: event.end_time.toISOString(),
        timeZone: event.timezone
      },
      location: event.location ? {
        displayName: event.location
      } : undefined
    }

    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(microsoftEvent)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Microsoft Graph API error: ${error.error?.message || response.statusText}`)
    }
  }

  // Helper methods
  private async getIntegration(userId: string, integrationId: string) {
    const { data } = await this.supabase
      .from('calendar_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()
    
    return data
  }

  private async getUserRole(userId: string): Promise<'admin' | 'manager' | 'guard'> {
    const { data } = await this.supabase
      .from('user_roles')
      .select('role_name')
      .eq('user_id', userId)
      .single()
    
    return data?.role_name || 'guard'
  }

  private async getUserPreference(userId: string, integrationId: string, key: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('calendar_preferences')
      .select(key)
      .eq('user_id', userId)
      .eq('integration_id', integrationId)
      .single()
    
    return data?.[key] || false
  }

  private generateShiftTitle(shift: any, filter: CalendarExportFilter): string {
    if (filter.includeClientInfo && shift.client_name) {
      return `Security Shift - ${shift.client_name}`
    }
    return shift.title || 'Security Shift'
  }

  private generateShiftDescription(shift: any, filter: CalendarExportFilter): string {
    const parts = []
    
    if (filter.includeClientInfo && shift.client_name) {
      parts.push(`Client: ${shift.client_name}`)
    }
    
    if (filter.includeSiteDetails && shift.site_name) {
      parts.push(`Location: ${shift.site_name}`)
    }
    
    if (shift.priority) {
      parts.push(`Priority: ${shift.priority}`)
    }
    
    if (shift.special_requirements) {
      parts.push(`Requirements: ${shift.special_requirements}`)
    }
    
    return parts.join('\n') || 'Security shift assignment'
  }

  private async logSyncOperation(integrationId: string, syncLogId: string, data: any): Promise<void> {
    await this.supabase
      .from('calendar_sync_logs')
      .insert([{
        id: syncLogId,
        integration_id: integrationId,
        ...data,
        created_at: new Date().toISOString()
      }])
  }

  private async updateLastSyncTime(integrationId: string): Promise<void> {
    await this.supabase
      .from('calendar_integrations')
      .update({ 
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId)
  }
}

export const calendarExportService = new CalendarExportService()