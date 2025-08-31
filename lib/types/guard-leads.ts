import type { Database } from './database'
import type { LeadSource, LeadStatus } from '../types'

// Re-export for consumers
export type { LeadSource, LeadStatus }

export interface GuardLead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  lead_source: LeadSource
  source_details?: string
  status: LeadStatus
  notes?: string
  assigned_manager_id?: string
  application_link_token?: string
  application_link_expires_at?: string
  last_reminder_sent_at?: string
  created_at: string
  updated_at: string
}

export interface GuardLeadFormData {
  first_name: string
  last_name: string
  email: string
  phone?: string
  lead_source: LeadSource
  source_details?: Record<string, any>
}

export interface GuardLeadCaptureRequest {
  first_name: string
  last_name: string
  email: string
  phone?: string
  lead_source: LeadSource
  source_details?: Record<string, any>
}

export interface GuardLeadCaptureResponse {
  success: boolean
  data: {
    id: string
    application_link?: string
    estimated_contact_time: string
  }
  error?: string
}

export interface LeadListRequest {
  page?: number
  limit?: number
  source_filter?: LeadSource[]
  status_filter?: LeadStatus[]
  date_from?: string
  date_to?: string
}

export interface LeadListResponse {
  success: boolean
  data: {
    leads: GuardLead[]
    pagination: {
      total: number
      page: number
      pages: number
    }
  }
}

export interface LeadFilters {
  sources?: LeadSource[]
  statuses?: LeadStatus[]
  dateRange?: {
    from: Date
    to: Date
  }
  assignedManager?: string
}