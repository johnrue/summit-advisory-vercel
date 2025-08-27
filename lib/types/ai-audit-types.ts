// AI Audit Trail Types for Story 2.3
// Type definitions for comprehensive AI processing and manager review audit trails

export interface AIProcessingAuditEntry {
  id: string
  application_id: string
  processing_type: AIProcessingType
  ai_model: string
  input_document_hash?: string
  processing_start_time: string
  processing_end_time?: string
  processing_status: ProcessingStatus
  confidence_scores?: Record<string, number>
  validation_results?: ValidationAuditResults
  manager_overrides?: ManagerOverrideAuditData
  error_details?: string
  user_id?: string
  session_id?: string
  created_at: string
  updated_at: string
}

export type AIProcessingType = 
  | 'resume_parsing'
  | 'data_validation'
  | 'manager_review'
  | 'bulk_approve'
  | 'field_override'
  | 'confidence_recalculation'

export type ProcessingStatus = 
  | 'success'
  | 'failure' 
  | 'timeout'
  | 'cancelled'
  | 'pending'
  | 'in_progress'

export interface ValidationAuditResults {
  validation_type: 'format' | 'consistency' | 'completeness' | 'authenticity'
  fields_validated: string[]
  validation_errors: ValidationErrorAudit[]
  validation_warnings: ValidationWarningAudit[]
  auto_fixes_applied: AutoFixAudit[]
  validation_confidence: number
  processing_time_ms: number
}

export interface ValidationErrorAudit {
  field: string
  error_type: 'format' | 'consistency' | 'required' | 'invalid_value'
  message: string
  original_value: any
  suggested_fix?: any
}

export interface ValidationWarningAudit {
  field: string
  warning_type: 'incomplete' | 'low_confidence' | 'potential_issue'
  message: string
  original_value: any
  suggestion?: string
}

export interface AutoFixAudit {
  field: string
  fix_type: 'format_correction' | 'data_enrichment' | 'consistency_repair'
  original_value: any
  fixed_value: any
  confidence: number
}

export interface ManagerOverrideAuditData {
  action: ManagerReviewAction
  field?: string
  original_value?: any
  new_value?: any
  confidence_threshold?: number
  approved_fields?: string[]
  rejected_fields?: string[]
  override_reason?: string
  timestamp: string
  session_duration_seconds?: number
  review_notes?: string
}

export type ManagerReviewAction = 
  | 'field_approved'
  | 'field_rejected'
  | 'field_overridden'
  | 'bulk_approved'
  | 'bulk_rejected'
  | 'application_approved'
  | 'application_rejected'
  | 'application_flagged'
  | 'review_session_started'
  | 'review_session_completed'

export interface AIAuditQuery {
  application_id?: string
  processing_type?: AIProcessingType[]
  status?: ProcessingStatus[]
  user_id?: string
  ai_model?: string[]
  date_from?: string
  date_to?: string
  has_errors?: boolean
  has_overrides?: boolean
  confidence_range?: {
    min: number
    max: number
  }
  page?: number
  limit?: number
  sort_by?: 'processing_start_time' | 'processing_end_time' | 'processing_type'
  sort_order?: 'asc' | 'desc'
}

export interface AIAuditQueryResult {
  logs: AIProcessingAuditEntry[]
  total: number
  page: number
  pages: number
  summary: AIAuditSummary
}

export interface AIAuditSummary {
  total_operations: number
  success_rate: number
  failure_rate: number
  average_processing_time: number
  total_processing_time: number
  by_type: Record<AIProcessingType, number>
  by_status: Record<ProcessingStatus, number>
  by_model: Record<string, number>
  by_user: Record<string, number>
  date_range: {
    earliest: string
    latest: string
  }
  performance_metrics: {
    fastest_operation: number
    slowest_operation: number
    median_processing_time: number
  }
  error_analysis: {
    most_common_errors: Array<{
      error: string
      count: number
      percentage: number
    }>
    error_trends: Array<{
      date: string
      error_count: number
    }>
  }
}

export interface ComplianceReportData {
  id: string
  application_id: string
  first_name: string
  last_name: string
  email: string
  application_reference: string
  processing_type: AIProcessingType
  ai_model: string
  processing_start_time: string
  processing_end_time?: string
  processing_status: ProcessingStatus
  confidence_scores?: Record<string, number>
  manager_overrides?: ManagerOverrideAuditData
  user_id?: string
  session_id?: string
  created_at: string
  processing_duration_seconds?: number
}

export interface ComplianceReportSummary {
  report_period: {
    from: string
    to: string
  }
  total_applications_processed: number
  total_audit_entries: number
  ai_processing_stats: {
    total_ai_operations: number
    success_rate: number
    average_confidence: number
    models_used: string[]
  }
  manager_review_stats: {
    total_reviews: number
    total_overrides: number
    override_rate: number
    most_overridden_fields: Array<{
      field: string
      count: number
    }>
  }
  compliance_indicators: {
    audit_trail_completeness: number
    data_retention_compliance: boolean
    processing_time_within_sla: number
  }
  quality_metrics: {
    high_confidence_processing: number
    manual_intervention_rate: number
    error_resolution_rate: number
  }
}

export interface AuditExportOptions {
  format: 'json' | 'csv' | 'xlsx'
  include_sensitive_data: boolean
  date_range: {
    from: string
    to: string
  }
  filters?: AIAuditQuery
  include_compliance_summary: boolean
  encryption_required: boolean
}

export interface DataRetentionPolicy {
  audit_logs_retention_days: number
  sensitive_data_retention_days: number
  error_logs_retention_days: number
  compliance_reports_retention_days: number
  auto_cleanup_enabled: boolean
  archive_before_deletion: boolean
  archive_location?: string
}

// Real-time audit events for monitoring
export interface AuditEvent {
  type: 'audit_entry_created' | 'audit_query_executed' | 'compliance_report_generated'
  timestamp: string
  user_id?: string
  data: any
  metadata?: {
    user_agent?: string
    ip_address?: string
    session_id?: string
  }
}

// Manager review session tracking
export interface ReviewSession {
  session_id: string
  application_id: string
  user_id: string
  started_at: string
  ended_at?: string
  actions_taken: ManagerReviewAction[]
  fields_reviewed: string[]
  overrides_made: number
  approvals_made: number
  session_duration_seconds?: number
  completion_status: 'completed' | 'abandoned' | 'interrupted'
}

export interface ReviewSessionSummary {
  total_sessions: number
  completed_sessions: number
  abandoned_sessions: number
  average_session_duration: number
  average_actions_per_session: number
  most_reviewed_fields: Array<{
    field: string
    review_count: number
  }>
  reviewer_performance: Array<{
    user_id: string
    sessions_count: number
    average_duration: number
    override_rate: number
  }>
}