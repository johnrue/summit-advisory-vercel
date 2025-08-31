import { createClient } from '@supabase/supabase-js'
import { AuditService } from '@/lib/services/audit-service'
import type { 
  AuditEntityType,
  ServiceResult
} from '@/lib/types/audit-types'

interface RetentionPolicy {
  id: string
  entity_type: AuditEntityType
  retention_period_days: number
  archive_after_days: number
  secure_delete_after_days: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface RetentionJob {
  id: string
  job_type: 'archive' | 'delete'
  entity_type?: AuditEntityType
  records_processed: number
  records_affected: number
  started_at: string
  completed_at?: string
  status: 'running' | 'completed' | 'failed'
  error_message?: string
  job_metadata?: any
}

interface ArchivalResult {
  archived_count: number
  deleted_count: number
  job_id: string
  errors: string[]
}

export class AuditRetentionService {
  private static instance: AuditRetentionService
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  private auditService = AuditService.getInstance()

  static getInstance(): AuditRetentionService {
    if (!AuditRetentionService.instance) {
      AuditRetentionService.instance = new AuditRetentionService()
    }
    return AuditRetentionService.instance
  }

  /**
   * Run automated archival process for all entity types
   */
  async runArchivalProcess(): Promise<ServiceResult<ArchivalResult>> {
    try {
      // Create a job record
      const { data: job, error: jobError } = await this.supabase
        .from('audit_retention_jobs')
        .insert({
          job_type: 'archive',
          status: 'running',
          job_metadata: {
            started_by: 'automated_process',
            process_type: 'full_archival'
          }
        })
        .select()
        .single()

      if (jobError || !job) {
        return { success: false, error: 'Failed to create archival job' }
      }

      let totalArchived = 0
      let totalDeleted = 0
      const errors: string[] = []

      try {
        // Get active retention policies
        const { data: policies, error: policiesError } = await this.supabase
          .from('audit_retention_policies')
          .select('*')
          .eq('is_active', true)

        if (policiesError) {
          throw new Error(`Failed to fetch retention policies: ${policiesError.message}`)
        }

        if (!policies || policies.length === 0) {
          throw new Error('No active retention policies found')
        }

        // Process each entity type
        for (const policy of policies) {
          try {
            // Archive old records
            const archiveResult = await this.archiveOldRecords(policy)
            if (archiveResult.success && archiveResult.data) {
              totalArchived += archiveResult.data
            } else if (!archiveResult.success) {
              errors.push(`Archive failed for ${policy.entity_type}: ${archiveResult.error}`)
            }

            // Delete very old records
            const deleteResult = await this.deleteVeryOldRecords(policy)
            if (deleteResult.success && deleteResult.data) {
              totalDeleted += deleteResult.data
            } else if (!deleteResult.success) {
              errors.push(`Delete failed for ${policy.entity_type}: ${deleteResult.error}`)
            }
          } catch (error) {
            errors.push(`Processing error for ${policy.entity_type}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }

        // Update job record as completed
        await this.supabase
          .from('audit_retention_jobs')
          .update({
            status: errors.length > 0 ? 'failed' : 'completed',
            completed_at: new Date().toISOString(),
            records_affected: totalArchived + totalDeleted,
            error_message: errors.length > 0 ? errors.join('; ') : null
          })
          .eq('id', job.id)

        // Log the archival operation itself
        await this.auditService.logAction({
          action: 'updated',
          entity_type: 'compliance_record',
          entity_id: job.id,
          details: {
            operation: 'automated_archival',
            archived_count: totalArchived,
            deleted_count: totalDeleted,
            errors_count: errors.length
          }
        })

        return {
          success: true,
          data: {
            archived_count: totalArchived,
            deleted_count: totalDeleted,
            job_id: job.id,
            errors
          }
        }
      } catch (error) {
        // Update job as failed
        await this.supabase
          .from('audit_retention_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', job.id)

        throw error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Archival process failed'
      }
    }
  }

  /**
   * Archive old records based on retention policy
   */
  private async archiveOldRecords(policy: RetentionPolicy): Promise<ServiceResult<number>> {
    try {
      const archiveDate = new Date()
      archiveDate.setDate(archiveDate.getDate() - policy.archive_after_days)

      // Get old records to archive
      const { data: oldRecords, error: selectError } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', policy.entity_type)
        .lt('created_at', archiveDate.toISOString())
        .limit(1000) // Process in batches

      if (selectError) {
        return { success: false, error: selectError.message }
      }

      if (!oldRecords || oldRecords.length === 0) {
        return { success: true, data: 0 }
      }

      // Insert into archive table
      const archiveRecords = oldRecords.map(record => ({
        ...record,
        archived_at: new Date().toISOString(),
        archive_reason: `Archived after ${policy.archive_after_days} days per retention policy`
      }))

      const { error: archiveError } = await this.supabase
        .from('audit_logs_archive')
        .insert(archiveRecords)

      if (archiveError) {
        return { success: false, error: archiveError.message }
      }

      // Delete from main table
      const { error: deleteError } = await this.supabase
        .from('audit_logs')
        .delete()
        .eq('entity_type', policy.entity_type)
        .lt('created_at', archiveDate.toISOString())

      if (deleteError) {
        return { success: false, error: deleteError.message }
      }

      return { success: true, data: oldRecords.length }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Archive operation failed'
      }
    }
  }

  /**
   * Securely delete very old archived records
   */
  private async deleteVeryOldRecords(policy: RetentionPolicy): Promise<ServiceResult<number>> {
    try {
      const deleteDate = new Date()
      deleteDate.setDate(deleteDate.getDate() - policy.secure_delete_after_days)

      // Count records to be deleted (for reporting)
      const { data: countData, error: countError } = await this.supabase
        .from('audit_logs_archive')
        .select('id', { count: 'exact' })
        .eq('entity_type', policy.entity_type)
        .lt('created_at', deleteDate.toISOString())

      if (countError) {
        return { success: false, error: countError.message }
      }

      const deleteCount = countData?.length || 0

      if (deleteCount === 0) {
        return { success: true, data: 0 }
      }

      // Perform secure deletion
      const { error: deleteError } = await this.supabase
        .from('audit_logs_archive')
        .delete()
        .eq('entity_type', policy.entity_type)
        .lt('created_at', deleteDate.toISOString())

      if (deleteError) {
        return { success: false, error: deleteError.message }
      }

      return { success: true, data: deleteCount }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Secure deletion failed'
      }
    }
  }

  /**
   * Get retention policy for an entity type
   */
  async getRetentionPolicy(entityType: AuditEntityType): Promise<ServiceResult<RetentionPolicy>> {
    try {
      const { data, error } = await this.supabase
        .from('audit_retention_policies')
        .select('*')
        .eq('entity_type', entityType)
        .eq('is_active', true)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch retention policy'
      }
    }
  }

  /**
   * Update retention policy
   */
  async updateRetentionPolicy(
    entityType: AuditEntityType,
    updates: Partial<Pick<RetentionPolicy, 'retention_period_days' | 'archive_after_days' | 'secure_delete_after_days'>>
  ): Promise<ServiceResult<RetentionPolicy>> {
    try {
      const { data, error } = await this.supabase
        .from('audit_retention_policies')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('entity_type', entityType)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Log the policy change
      await this.auditService.logAction({
        action: 'updated',
        entity_type: 'compliance_record',
        entity_id: data.id,
        details: {
          operation: 'retention_policy_update',
          entity_type: entityType,
          changes: updates
        }
      })

      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update retention policy'
      }
    }
  }

  /**
   * Get recent retention jobs
   */
  async getRetentionJobs(limit: number = 10): Promise<ServiceResult<RetentionJob[]>> {
    try {
      const { data, error } = await this.supabase
        .from('audit_retention_jobs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch retention jobs'
      }
    }
  }

  /**
   * Get archival statistics
   */
  async getArchivalStats(): Promise<ServiceResult<{
    total_active_logs: number
    total_archived_logs: number
    oldest_active_log: string | null
    newest_archived_log: string | null
  }>> {
    try {
      // Count active logs
      const { data: activeCount, error: activeError } = await this.supabase
        .from('audit_logs')
        .select('id', { count: 'exact' })

      if (activeError) {
        return { success: false, error: activeError.message }
      }

      // Count archived logs
      const { data: archivedCount, error: archivedError } = await this.supabase
        .from('audit_logs_archive')
        .select('id', { count: 'exact' })

      if (archivedError) {
        return { success: false, error: archivedError.message }
      }

      // Get oldest active log
      const { data: oldestActive, error: oldestError } = await this.supabase
        .from('audit_logs')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      // Get newest archived log
      const { data: newestArchived, error: newestError } = await this.supabase
        .from('audit_logs_archive')
        .select('archived_at')
        .order('archived_at', { ascending: false })
        .limit(1)
        .single()

      return {
        success: true,
        data: {
          total_active_logs: activeCount?.length || 0,
          total_archived_logs: archivedCount?.length || 0,
          oldest_active_log: oldestActive?.created_at || null,
          newest_archived_log: newestArchived?.archived_at || null
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch archival statistics'
      }
    }
  }
}