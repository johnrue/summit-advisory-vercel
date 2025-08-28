/**
 * Calendar Integration Types
 * Core types for calendar system operations and data models
 */

import type { 
  CalendarProvider, 
  SyncFrequency, 
  SyncOperation, 
  SyncStatus,
  CalendarIntegration,
  CalendarPreferences,
  CalendarSyncLog 
} from './oauth-types'

export type { 
  CalendarProvider, 
  SyncFrequency, 
  SyncOperation, 
  SyncStatus,
  CalendarIntegration,
  CalendarPreferences,
  CalendarSyncLog 
} from './oauth-types'

// Calendar Event Types
export type EventType = 'shift' | 'availability' | 'time_off' | 'meeting'
export type EventPrivacyLevel = 'public' | 'private' | 'confidential'

// Role-based export filtering
export interface CalendarExportFilter {
  userId: string
  userRole: 'admin' | 'manager' | 'guard'
  eventTypes: EventType[]
  includeClientInfo: boolean
  includeGuardNames: boolean
  includeSiteDetails: boolean
  dateRange?: {
    start: Date
    end: Date
  }
}

// Calendar event for export
export interface CalendarExportEvent {
  id: string
  title: string
  description: string
  start_time: Date
  end_time: Date
  timezone: string
  location?: string
  event_type: EventType
  source_id: string
  privacy_level: EventPrivacyLevel
  external_event_id?: string
  metadata: {
    client_name?: string
    site_name?: string
    guard_names?: string[]
    shift_priority?: string
    requirements?: string[]
  }
}

// Calendar sync request
export interface CalendarSyncRequest {
  integration_id: string
  event_types: EventType[]
  force_sync?: boolean
  date_range?: {
    start: Date
    end: Date
  }
}

// Calendar sync response
export interface CalendarSyncResponse {
  success: boolean
  events_synced: number
  events_failed: number
  sync_log_id: string
  errors: CalendarSyncError[]
  duration_ms: number
}

// Calendar sync error
export interface CalendarSyncError {
  event_id: string
  event_type: EventType
  error_code: string
  error_message: string
  retry_count: number
}

// Calendar connection status
export interface CalendarConnectionStatus {
  integration_id: string
  provider: CalendarProvider
  is_connected: boolean
  is_active: boolean
  sync_enabled: boolean
  last_sync_at?: Date
  token_expires_at?: Date
  sync_health: 'healthy' | 'warning' | 'error' | 'disconnected'
  error_count_24h: number
  next_sync_at?: Date
}

// Calendar export configuration
export interface CalendarExportConfig {
  provider: CalendarProvider
  calendar_id?: string
  event_visibility: 'default' | 'public' | 'private'
  send_notifications: boolean
  color_code?: string
  prefix_title: boolean
  title_prefix?: string
}

// Manager-specific export data
export interface ManagerCalendarData {
  managed_shifts: CalendarExportEvent[]
  team_availability: CalendarExportEvent[]
  team_time_off: CalendarExportEvent[]
  meetings: CalendarExportEvent[]
  total_events: number
}

// Guard-specific export data
export interface GuardCalendarData {
  assigned_shifts: CalendarExportEvent[]
  personal_availability: CalendarExportEvent[]
  time_off_requests: CalendarExportEvent[]
  total_events: number
}

// Calendar conflict detection
export interface CalendarConflict {
  id: string
  event_1: CalendarExportEvent
  event_2: CalendarExportEvent
  conflict_type: 'overlap' | 'double_booking' | 'availability_conflict'
  severity: 'low' | 'medium' | 'high' | 'critical'
  resolution_suggestions: string[]
  auto_resolvable: boolean
}

// Calendar sync statistics
export interface CalendarSyncStats {
  integration_id: string
  total_syncs: number
  successful_syncs: number
  failed_syncs: number
  average_duration_ms: number
  events_synced_total: number
  last_24h: {
    syncs: number
    events: number
    errors: number
  }
  uptime_percentage: number
}

// Timezone handling
export interface TimezoneConfig {
  user_timezone: string
  display_timezone: string
  storage_timezone: 'UTC'
  handle_dst: boolean
  timezone_detection: 'auto' | 'manual'
}

// Calendar permission scope
export interface CalendarPermission {
  provider: CalendarProvider
  scope: string
  description: string
  required: boolean
  granted: boolean
  requested_at?: Date
  granted_at?: Date
}

// Bulk export operation
export interface BulkExportOperation {
  id: string
  user_id: string
  integration_ids: string[]
  event_types: EventType[]
  date_range: {
    start: Date
    end: Date
  }
  status: SyncStatus
  progress: number
  total_events: number
  processed_events: number
  failed_events: number
  started_at: Date
  completed_at?: Date
  error_summary?: string[]
}