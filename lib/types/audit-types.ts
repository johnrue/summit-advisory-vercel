import type { AuditAction, AuditEntityType } from '../types'

// AuditAction and AuditEntityType are now imported from main types file

export interface AuditLog {
  id: string
  user_id?: string
  action: AuditAction
  entity_type: AuditEntityType
  entity_id: string
  details?: any
  integrity_hash: string
  created_at: string
  
  // Legacy fields for backward compatibility
  table_name?: string
  record_id?: string
  old_values?: any
  new_values?: any
  ip_address?: string
  user_agent?: string
}

export interface CreateAuditLogRequest {
  action: AuditAction
  entity_type: AuditEntityType
  entity_id: string
  details?: any
  user_id?: string
}

export interface AuditLogFilter {
  user_id?: string
  action?: AuditAction
  entity_type?: AuditEntityType
  entity_id?: string
  date_from?: string
  date_to?: string
  search?: string
}

export interface AuditLogSearchResult {
  logs: AuditLog[]
  total_count: number
  has_more: boolean
}

export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: string
}