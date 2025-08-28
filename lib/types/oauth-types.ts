/**
 * OAuth Integration Types for Calendar System
 * Comprehensive type definitions for Google Calendar and Microsoft Graph OAuth flows
 */

export type CalendarProvider = 'google_calendar' | 'microsoft_outlook' | 'microsoft_exchange'

export type SyncFrequency = 'real_time' | 'hourly' | 'daily' | 'manual'

export type SyncOperation = 
  | 'export_shift'
  | 'export_availability'
  | 'export_time_off'
  | 'bulk_export'
  | 'sync_status_check'

export type SyncStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'retrying'

// OAuth Token Management
export interface OAuthToken {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
  expires_at?: Date
}

export interface EncryptedOAuthToken {
  access_token_encrypted: string
  refresh_token_encrypted?: string
  token_expires_at?: Date
}

// OAuth Configuration
export interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
  authUrl: string
  tokenUrl: string
}

// OAuth Flow State
export interface OAuthState {
  userId: string
  provider: CalendarProvider
  returnUrl?: string
  nonce: string
  createdAt: Date
}

// Calendar Integration Record
export interface CalendarIntegration {
  id: string
  user_id: string
  provider: CalendarProvider
  provider_user_id: string
  access_token_encrypted: string
  refresh_token_encrypted?: string
  token_expires_at?: Date
  is_active: boolean
  sync_enabled: boolean
  last_sync_at?: Date
  created_at: Date
  updated_at: Date
}

// Calendar Preferences
export interface CalendarPreferences {
  id: string
  user_id: string
  integration_id: string
  sync_shifts: boolean
  sync_availability: boolean
  sync_time_off: boolean
  include_client_info: boolean
  include_site_details: boolean
  include_guard_names: boolean
  sync_frequency: SyncFrequency
  timezone_preference: string
  notify_sync_success: boolean
  notify_sync_failures: boolean
  created_at: Date
  updated_at: Date
}

// Sync Log Record
export interface CalendarSyncLog {
  id: string
  integration_id: string
  sync_type: SyncOperation
  operation_status: SyncStatus
  event_type?: string
  event_id?: string
  external_event_id?: string
  error_message?: string
  error_code?: string
  retry_count: number
  operation_duration_ms?: number
  events_processed: number
  created_at: Date
}

// OAuth Error Types
export interface OAuthError {
  error: string
  error_description: string
  error_uri?: string
}

// Calendar API Responses
export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  location?: string
  status: string
}

export interface MicrosoftCalendarEvent {
  id: string
  subject: string
  body?: {
    content: string
    contentType: string
  }
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  location?: {
    displayName: string
  }
  showAs: string
}

// Service Result Pattern
export interface OAuthResult<T> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
}

export interface CalendarSyncResult {
  success: boolean
  events_synced: number
  errors: string[]
  sync_log_id?: string
}

// OAuth Flow Types for UI
export interface OAuthConnection {
  provider: CalendarProvider
  isConnected: boolean
  connectionStatus: 'connected' | 'expired' | 'error' | 'disconnected'
  lastSync?: Date
  syncEnabled: boolean
  userEmail?: string
}

// Calendar Export Event
export interface CalendarExportEvent {
  title: string
  description: string
  start_time: Date
  end_time: Date
  timezone: string
  location?: string
  event_type: 'shift' | 'availability' | 'time_off'
  source_id: string
  privacy_level: 'public' | 'private' | 'confidential'
}