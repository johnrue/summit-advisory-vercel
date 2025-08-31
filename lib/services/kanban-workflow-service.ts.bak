import { supabase } from '@/lib/supabase'
import type { 
  GuardApplication, 
  PipelineStage, 
  StageTransitionRequest, 
  StageTransitionResponse,
  KanbanFilters,
  BulkActionRequest
} from '@/lib/types/kanban-workflow'

/**
 * Service for managing Kanban workflow operations
 */
export class KanbanWorkflowService {
  
  /**
   * Get applications by pipeline stage for Kanban board
   */
  static async getApplicationsByStage(
    filters?: KanbanFilters
  ): Promise<Record<PipelineStage, GuardApplication[]>> {
    try {
      let query = supabase
        .from('guard_leads')
        .select(`
          *,
          assigned_manager:assigned_manager_id(first_name, last_name, email),
          assigned_user:assigned_to(first_name, last_name, email),
          stage_changed_user:stage_changed_by(first_name, last_name, email)
        `)
        .order('priority', { ascending: true })
        .order('stage_changed_at', { ascending: false })

      // Apply filters
      if (filters?.stages && filters.stages.length > 0) {
        query = query.in('pipeline_stage', filters.stages)
      }

      if (filters?.assignedManagers && filters.assignedManagers.length > 0) {
        query = query.in('assigned_to', filters.assignedManagers)
      }

      if (filters?.priorities && filters.priorities.length > 0) {
        query = query.in('priority', filters.priorities)
      }

      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.from.toISOString())
          .lte('created_at', filters.dateRange.to.toISOString())
      }

      if (filters?.searchQuery) {
        query = query.or(`
          first_name.ilike.%${filters.searchQuery}%,
          last_name.ilike.%${filters.searchQuery}%,
          email.ilike.%${filters.searchQuery}%,
          application_reference.ilike.%${filters.searchQuery}%
        `)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch applications: ${error.message}`)
      }

      // Group applications by pipeline stage
      const applicationsByStage: Record<PipelineStage, GuardApplication[]> = {
        lead_captured: [],
        application_received: [],
        under_review: [],
        background_check: [],
        interview_scheduled: [],
        interview_completed: [],
        approved: [],
        rejected: [],
        profile_created: []
      }

      data?.forEach((app: any) => {
        const application: GuardApplication = {
          ...app,
          pipeline_stage: app.pipeline_stage as PipelineStage
        }
        applicationsByStage[application.pipeline_stage].push(application)
      })

      return applicationsByStage
    } catch (error) {
      console.error('Error fetching applications by stage:', error)
      throw error
    }
  }

  /**
   * Move application to a new pipeline stage
   */
  static async moveApplicationToStage(
    request: StageTransitionRequest
  ): Promise<StageTransitionResponse> {
    try {
      // Get current application data
      const { data: currentApp, error: fetchError } = await supabase
        .from('guard_leads')
        .select('pipeline_stage')
        .eq('id', request.applicationId)
        .single()

      if (fetchError) {
        throw new Error(`Failed to fetch current application: ${fetchError.message}`)
      }

      const previousStage = currentApp.pipeline_stage as PipelineStage

      // Update the application
      const updateData: any = {
        pipeline_stage: request.newStage,
        stage_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (request.userId) {
        updateData.stage_changed_by = request.userId
      }

      if (request.notes) {
        updateData.workflow_notes = request.notes
      }

      const { data, error } = await supabase
        .from('guard_leads')
        .update(updateData)
        .eq('id', request.applicationId)
        .select(`
          *,
          assigned_manager:assigned_manager_id(first_name, last_name, email),
          assigned_user:assigned_to(first_name, last_name, email),
          stage_changed_user:stage_changed_by(first_name, last_name, email)
        `)
        .single()

      if (error) {
        throw new Error(`Failed to update application stage: ${error.message}`)
      }

      return {
        success: true,
        data: {
          application: { ...data, pipeline_stage: data.pipeline_stage as PipelineStage },
          previousStage
        }
      }
    } catch (error) {
      console.error('Error moving application to stage:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Assign application to a manager
   */
  static async assignApplication(
    applicationId: string,
    managerId: string,
    assignedBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        assigned_to: managerId,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('guard_leads')
        .update(updateData)
        .eq('id', applicationId)

      if (error) {
        throw new Error(`Failed to assign application: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Error assigning application:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Update application priority
   */
  static async updateApplicationPriority(
    applicationId: string,
    priority: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (priority < 1 || priority > 10) {
        throw new Error('Priority must be between 1 and 10')
      }

      const { error } = await supabase
        .from('guard_leads')
        .update({ 
          priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      if (error) {
        throw new Error(`Failed to update priority: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Error updating application priority:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Perform bulk actions on multiple applications
   */
  static async performBulkAction(
    request: BulkActionRequest
  ): Promise<{ success: boolean; processedCount: number; errors: string[] }> {
    const errors: string[] = []
    let processedCount = 0

    try {
      for (const applicationId of request.applicationIds) {
        try {
          switch (request.action) {
            case 'assign':
              if (request.data?.managerId) {
                const result = await this.assignApplication(
                  applicationId, 
                  request.data.managerId,
                  request.data.assignedBy
                )
                if (result.success) processedCount++
                else errors.push(`Failed to assign ${applicationId}: ${result.error}`)
              }
              break

            case 'stage_change':
              if (request.data?.newStage) {
                const result = await this.moveApplicationToStage({
                  applicationId,
                  newStage: request.data.newStage,
                  notes: request.data.notes,
                  userId: request.data.userId
                })
                if (result.success) processedCount++
                else errors.push(`Failed to move ${applicationId}: ${result.error}`)
              }
              break

            case 'priority_change':
              if (request.data?.priority) {
                const result = await this.updateApplicationPriority(
                  applicationId,
                  request.data.priority
                )
                if (result.success) processedCount++
                else errors.push(`Failed to update priority ${applicationId}: ${result.error}`)
              }
              break

            default:
              errors.push(`Unsupported bulk action: ${request.action}`)
          }
        } catch (error) {
          errors.push(`Error processing ${applicationId}: ${error}`)
        }
      }

      return {
        success: errors.length === 0,
        processedCount,
        errors
      }
    } catch (error) {
      console.error('Error performing bulk action:', error)
      return {
        success: false,
        processedCount,
        errors: [...errors, `Bulk action failed: ${error}`]
      }
    }
  }

  /**
   * Get workflow performance metrics
   */
  static async getWorkflowMetrics(dateRange?: { from: Date; to: Date }) {
    try {
      let query = supabase
        .from('guard_leads')
        .select('pipeline_stage, created_at, stage_changed_at, priority')

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString())
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch workflow metrics: ${error.message}`)
      }

      // Calculate metrics
      const stageDistribution: Record<PipelineStage, number> = {
        lead_captured: 0,
        application_received: 0,
        under_review: 0,
        background_check: 0,
        interview_scheduled: 0,
        interview_completed: 0,
        approved: 0,
        rejected: 0,
        profile_created: 0
      }

      let totalApplications = 0
      let averageProcessingTime = 0

      data?.forEach((app: any) => {
        stageDistribution[app.pipeline_stage as PipelineStage]++
        totalApplications++

        // Calculate processing time for completed applications
        if (app.stage_changed_at && app.created_at) {
          const processingTime = new Date(app.stage_changed_at).getTime() - new Date(app.created_at).getTime()
          averageProcessingTime += processingTime
        }
      })

      if (totalApplications > 0) {
        averageProcessingTime = Math.round(averageProcessingTime / totalApplications / (1000 * 60 * 60 * 24)) // Convert to days
      }

      return {
        success: true,
        data: {
          stageDistribution,
          totalApplications,
          averageProcessingTime,
          conversionRate: totalApplications > 0 ? 
            Math.round((stageDistribution.approved / totalApplications) * 100) : 0
        }
      }
    } catch (error) {
      console.error('Error fetching workflow metrics:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}