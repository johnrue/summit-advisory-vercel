// AI Processing Audit Service for Story 2.3
// Comprehensive logging and compliance tracking for AI processing and manager reviews

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Audit Types
export interface AIAuditEntry {
  id?: string
  application_id: string
  processing_type: 'resume_parsing' | 'data_validation' | 'manager_review' | 'bulk_approve'
  ai_model: string
  input_document_hash?: string
  processing_start_time: string
  processing_end_time?: string
  processing_status: 'success' | 'failure' | 'timeout' | 'cancelled'
  confidence_scores?: Record<string, number>
  validation_results?: any
  manager_overrides?: any
  error_details?: string
  user_id?: string
  session_id?: string
  created_at?: string
  updated_at?: string
}

export interface AIAuditQuery {
  application_id?: string
  processing_type?: string
  status?: string
  user_id?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export interface AIAuditSummary {
  total_operations: number
  success_rate: number
  average_processing_time: number
  by_type: Record<string, number>
  by_status: Record<string, number>
  by_model: Record<string, number>
}

export class AIAuditService {
  /**
   * Log AI processing start
   */
  static async logProcessingStart(
    applicationId: string,
    processingType: AIAuditEntry['processing_type'],
    aiModel: string,
    userId?: string,
    sessionId?: string,
    inputDocumentHash?: string
  ): Promise<string | null> {
    try {
      const auditEntry: Partial<AIAuditEntry> = {
        application_id: applicationId,
        processing_type: processingType,
        ai_model: aiModel,
        processing_start_time: new Date().toISOString(),
        processing_status: 'success', // Will be updated on completion
        user_id: userId,
        session_id: sessionId,
        input_document_hash: inputDocumentHash
      }

      const { data, error } = await supabase
        .from('ai_processing_audit')
        .insert(auditEntry)
        .select('id')
        .single()

      if (error) {
        return null
      }

      return data.id
    } catch (error) {
      return null
    }
  }

  /**
   * Log processing completion
   */
  static async logProcessingEnd(
    auditId: string,
    status: AIAuditEntry['processing_status'],
    results?: {
      confidence_scores?: Record<string, number>
      validation_results?: any
      error_details?: string
    }
  ): Promise<boolean> {
    try {
      const updateData: Partial<AIAuditEntry> = {
        processing_end_time: new Date().toISOString(),
        processing_status: status,
        ...results
      }

      const { error } = await supabase
        .from('ai_processing_audit')
        .update(updateData)
        .eq('id', auditId)

      if (error) {
        return false
      }

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Log manager review action
   */
  static async logManagerReview(
    applicationId: string,
    action: string,
    details: {
      field?: string
      original_value?: any
      new_value?: any
      confidence_threshold?: number
      approved_fields?: string[]
    },
    userId?: string,
    sessionId?: string
  ): Promise<boolean> {
    try {
      const auditEntry: Partial<AIAuditEntry> = {
        application_id: applicationId,
        processing_type: 'manager_review',
        ai_model: 'human_review',
        processing_start_time: new Date().toISOString(),
        processing_end_time: new Date().toISOString(),
        processing_status: 'success',
        manager_overrides: {
          action,
          ...details,
          timestamp: new Date().toISOString()
        },
        user_id: userId,
        session_id: sessionId
      }

      const { error } = await supabase
        .from('ai_processing_audit')
        .insert(auditEntry)

      if (error) {
        return false
      }

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get audit history for an application
   */
  static async getApplicationAuditHistory(applicationId: string): Promise<AIAuditEntry[]> {
    try {
      const { data, error } = await supabase
        .from('ai_processing_audit')
        .select('*')
        .eq('application_id', applicationId)
        .order('processing_start_time', { ascending: false })

      if (error) {
        return []
      }

      return data || []
    } catch (error) {
      return []
    }
  }

  /**
   * Query audit logs with filters
   */
  static async queryAuditLogs(query: AIAuditQuery = {}): Promise<{
    logs: AIAuditEntry[]
    total: number
    page: number
    pages: number
  }> {
    try {
      const page = query.page || 1
      const limit = query.limit || 50
      const offset = (page - 1) * limit

      let supabaseQuery = supabase
        .from('ai_processing_audit')
        .select('*', { count: 'exact' })

      // Apply filters
      if (query.application_id) {
        supabaseQuery = supabaseQuery.eq('application_id', query.application_id)
      }
      if (query.processing_type) {
        supabaseQuery = supabaseQuery.eq('processing_type', query.processing_type)
      }
      if (query.status) {
        supabaseQuery = supabaseQuery.eq('processing_status', query.status)
      }
      if (query.user_id) {
        supabaseQuery = supabaseQuery.eq('user_id', query.user_id)
      }
      if (query.date_from) {
        supabaseQuery = supabaseQuery.gte('processing_start_time', query.date_from)
      }
      if (query.date_to) {
        supabaseQuery = supabaseQuery.lte('processing_start_time', query.date_to)
      }

      const { data, error, count } = await supabaseQuery
        .order('processing_start_time', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return { logs: [], total: 0, page, pages: 0 }
      }

      const totalPages = Math.ceil((count || 0) / limit)

      return {
        logs: data || [],
        total: count || 0,
        page,
        pages: totalPages
      }
    } catch (error) {
      return { logs: [], total: 0, page: 1, pages: 0 }
    }
  }

  /**
   * Get audit summary statistics
   */
  static async getAuditSummary(dateFrom?: string, dateTo?: string): Promise<AIAuditSummary> {
    try {
      let query = supabase
        .from('ai_processing_audit')
        .select('processing_type, processing_status, ai_model, processing_start_time, processing_end_time')

      if (dateFrom) {
        query = query.gte('processing_start_time', dateFrom)
      }
      if (dateTo) {
        query = query.lte('processing_start_time', dateTo)
      }

      const { data, error } = await query

      if (error) {
        return {
          total_operations: 0,
          success_rate: 0,
          average_processing_time: 0,
          by_type: {},
          by_status: {},
          by_model: {}
        }
      }

      const logs = data || []
      const totalOps = logs.length
      const successOps = logs.filter(log => log.processing_status === 'success').length
      
      // Calculate average processing time
      let totalTime = 0
      let timedOperations = 0
      
      logs.forEach(log => {
        if (log.processing_start_time && log.processing_end_time) {
          const start = new Date(log.processing_start_time).getTime()
          const end = new Date(log.processing_end_time).getTime()
          totalTime += (end - start)
          timedOperations++
        }
      })

      const avgTime = timedOperations > 0 ? totalTime / timedOperations : 0

      // Group by type, status, and model
      const byType: Record<string, number> = {}
      const byStatus: Record<string, number> = {}
      const byModel: Record<string, number> = {}

      logs.forEach(log => {
        byType[log.processing_type] = (byType[log.processing_type] || 0) + 1
        byStatus[log.processing_status] = (byStatus[log.processing_status] || 0) + 1
        byModel[log.ai_model] = (byModel[log.ai_model] || 0) + 1
      })

      return {
        total_operations: totalOps,
        success_rate: totalOps > 0 ? (successOps / totalOps) * 100 : 0,
        average_processing_time: avgTime,
        by_type: byType,
        by_status: byStatus,
        by_model: byModel
      }
    } catch (error) {
      return {
        total_operations: 0,
        success_rate: 0,
        average_processing_time: 0,
        by_type: {},
        by_status: {},
        by_model: {}
      }
    }
  }

  /**
   * Get compliance report data
   */
  static async getComplianceReport(dateFrom: string, dateTo: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('ai_audit_compliance_view')
        .select('*')
        .gte('processing_start_time', dateFrom)
        .lte('processing_start_time', dateTo)
        .order('processing_start_time', { ascending: false })

      if (error) {
        return []
      }

      return data || []
    } catch (error) {
      return []
    }
  }

  /**
   * Clean up old audit logs (data retention)
   */
  static async cleanupOldLogs(daysToKeep: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const { data, error } = await supabase
        .from('ai_processing_audit')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id')

      if (error) {
        return 0
      }

      return data?.length || 0
    } catch (error) {
      return 0
    }
  }

  /**
   * Export audit logs for compliance
   */
  static async exportAuditLogs(
    query: AIAuditQuery = {},
    format: 'json' | 'csv' = 'json'
  ): Promise<string | null> {
    try {
      const { logs } = await this.queryAuditLogs({ ...query, limit: 10000 })

      if (format === 'csv') {
        // Simple CSV export
        if (logs.length === 0) return 'No data available'
        
        const headers = Object.keys(logs[0]).join(',')
        const rows = logs.map(log => 
          Object.values(log).map(value => 
            typeof value === 'object' ? JSON.stringify(value) : value
          ).join(',')
        )
        
        return [headers, ...rows].join('\n')
      }

      return JSON.stringify(logs, null, 2)
    } catch (error) {
      return null
    }
  }
}

export default AIAuditService