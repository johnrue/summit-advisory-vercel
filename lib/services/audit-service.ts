import { createClient } from '@supabase/supabase-js'
import { generateIntegrityHash, verifyIntegrityHash, createAuditContext } from '@/lib/utils/audit-integrity'
import type { 
  AuditLog, 
  CreateAuditLogRequest, 
  AuditLogFilter, 
  AuditLogSearchResult,
  ServiceResult 
} from '@/lib/types/audit-types'

export class AuditService {
  private static instance: AuditService
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService()
    }
    return AuditService.instance
  }

  async logAction(request: CreateAuditLogRequest): Promise<ServiceResult<AuditLog>> {
    try {
      const auditData = {
        user_id: request.user_id,
        action: request.action,
        entity_type: request.entity_type,
        entity_id: request.entity_id,
        details: request.details,
        created_at: new Date().toISOString()
      }

      const integrity_hash = generateIntegrityHash(auditData)

      const { data, error } = await this.supabase
        .from('audit_logs')
        .insert({
          ...auditData,
          integrity_hash
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating audit log:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in logAction:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async logGuardProfileChange(
    guardId: string, 
    action: 'created' | 'updated' | 'approved' | 'rejected',
    previousValues?: any,
    newValues?: any,
    context?: string,
    userId?: string
  ): Promise<ServiceResult<AuditLog>> {
    const details = createAuditContext(previousValues, newValues, context)
    
    return this.logAction({
      action,
      entity_type: 'guard',
      entity_id: guardId,
      details,
      user_id: userId
    })
  }

  async logShiftChange(
    shiftId: string,
    action: 'created' | 'updated' | 'assigned' | 'unassigned' | 'deleted',
    previousValues?: any,
    newValues?: any,
    context?: string,
    userId?: string
  ): Promise<ServiceResult<AuditLog>> {
    const details = createAuditContext(previousValues, newValues, context)
    
    return this.logAction({
      action,
      entity_type: 'shift',
      entity_id: shiftId,
      details,
      user_id: userId
    })
  }

  async logHiringDecision(
    applicationId: string,
    action: 'approved' | 'rejected' | 'updated',
    previousValues?: any,
    newValues?: any,
    context?: string,
    userId?: string
  ): Promise<ServiceResult<AuditLog>> {
    const details = createAuditContext(previousValues, newValues, context)
    
    return this.logAction({
      action,
      entity_type: 'application',
      entity_id: applicationId,
      details,
      user_id: userId
    })
  }

  async logRoleChange(
    userId: string,
    action: 'created' | 'updated' | 'deleted',
    previousValues?: any,
    newValues?: any,
    context?: string,
    actorId?: string
  ): Promise<ServiceResult<AuditLog>> {
    const details = createAuditContext(previousValues, newValues, context)
    
    return this.logAction({
      action,
      entity_type: 'role_assignment',
      entity_id: userId,
      details,
      user_id: actorId
    })
  }

  async logComplianceReportGeneration(
    reportId: string,
    action: 'generated' | 'downloaded' | 'emailed' | 'scheduled' | 'failed',
    reportParameters?: any,
    context?: string,
    userId?: string
  ): Promise<ServiceResult<AuditLog>> {
    const details = createAuditContext(null, reportParameters, context)
    
    return this.logAction({
      action,
      entity_type: 'compliance_report',
      entity_id: reportId,
      details,
      user_id: userId
    })
  }

  async logComplianceReportAccess(
    reportId: string,
    action: 'viewed' | 'downloaded' | 'shared',
    accessDetails?: any,
    context?: string,
    userId?: string
  ): Promise<ServiceResult<AuditLog>> {
    const details = createAuditContext(null, accessDetails, context)
    
    return this.logAction({
      action,
      entity_type: 'compliance_report_access',
      entity_id: reportId,
      details,
      user_id: userId
    })
  }

  async logReportScheduleChange(
    scheduleId: string,
    action: 'created' | 'updated' | 'activated' | 'deactivated' | 'deleted',
    previousValues?: any,
    newValues?: any,
    context?: string,
    userId?: string
  ): Promise<ServiceResult<AuditLog>> {
    const details = createAuditContext(previousValues, newValues, context)
    
    return this.logAction({
      action,
      entity_type: 'report_schedule',
      entity_id: scheduleId,
      details,
      user_id: userId
    })
  }

  async getAuditLogs(
    filter: AuditLogFilter = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<ServiceResult<AuditLogSearchResult>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (filter.user_id) {
        query = query.eq('user_id', filter.user_id)
      }

      if (filter.action) {
        query = query.eq('action', filter.action)
      }

      if (filter.entity_type) {
        query = query.eq('entity_type', filter.entity_type)
      }

      if (filter.entity_id) {
        query = query.eq('entity_id', filter.entity_id)
      }

      if (filter.date_from) {
        query = query.gte('created_at', filter.date_from)
      }

      if (filter.date_to) {
        query = query.lte('created_at', filter.date_to)
      }

      if (filter.search) {
        // SQL injection protection: sanitize search input
        const sanitizedSearch = filter.search.replace(/[%_]/g, '\\$&')
        query = query.or(`details.ilike.%${sanitizedSearch}%,action.ilike.%${sanitizedSearch}%,entity_type.ilike.%${sanitizedSearch}%`)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching audit logs:', error)
        return { success: false, error: error.message }
      }

      return {
        success: true,
        data: {
          logs: data || [],
          total_count: count || 0,
          has_more: (count || 0) > offset + limit
        }
      }
    } catch (error) {
      console.error('Error in getAuditLogs:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async verifyLogIntegrity(logId: string): Promise<ServiceResult<boolean>> {
    try {
      const { data: log, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('id', logId)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      const isValid = verifyIntegrityHash({
        user_id: log.user_id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        details: log.details,
        created_at: log.created_at
      }, log.integrity_hash)

      return { success: true, data: isValid }
    } catch (error) {
      console.error('Error verifying log integrity:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getAuditSummary(
    entityType?: string,
    entityId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<ServiceResult<Record<string, number>>> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('action')

      if (entityType) {
        query = query.eq('entity_type', entityType)
      }

      if (entityId) {
        query = query.eq('entity_id', entityId)
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom)
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching audit summary:', error)
        return { success: false, error: error.message }
      }

      const summary = (data || []).reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return { success: true, data: summary }
    } catch (error) {
      console.error('Error in getAuditSummary:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
}