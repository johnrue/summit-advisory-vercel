import { supabase } from '@/lib/supabase'
import type { 
  InternalProject, 
  ProjectFormData, 
  ProjectFilters, 
  ProjectCategory,
  ApiResponse 
} from '@/lib/types'

export class ProjectManagementService {
  static async getProjects(filters: ProjectFilters = {}): Promise<ApiResponse<InternalProject[]>> {
    try {
      let query = supabase
        .from('project_summary_view')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority)
      }

      if (filters.category && filters.category.length > 0) {
        query = query.in('category_id', filters.category)
      }

      if (filters.ownerId) {
        query = query.eq('owner_id', filters.ownerId)
      }

      if (filters.assignedMember) {
        query = query.contains('assigned_members', [filters.assignedMember])
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      if (filters.isRecurring !== undefined) {
        query = query.eq('is_recurring', filters.isRecurring)
      }

      if (filters.dateRange) {
        query = query.gte('created_at', filters.dateRange.start)
                    .lte('created_at', filters.dateRange.end)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      // Transform database records to TypeScript interfaces
      const projects: InternalProject[] = (data || []).map(this.transformDatabaseProject)

      return {
        success: true,
        data: projects
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve projects'
      }
    }
  }

  static async getProjectById(id: string): Promise<ApiResponse<InternalProject>> {
    try {
      const { data, error } = await supabase
        .from('project_summary_view')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Project not found')
        }
        throw new Error(`Database error: ${error.message}`)
      }

      const project = this.transformDatabaseProject(data)

      return {
        success: true,
        data: project
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve project'
      }
    }
  }

  static async createProject(projectData: ProjectFormData): Promise<ApiResponse<InternalProject>> {
    try {
      // Insert into internal_projects table
      const { data, error } = await supabase
        .from('internal_projects')
        .insert({
          title: projectData.title,
          description: projectData.description,
          category_id: projectData.categoryId,
          priority: projectData.priority,
          owner_id: projectData.ownerId,
          assigned_members: projectData.assignedMembers || [],
          due_date: projectData.dueDate,
          estimated_hours: projectData.estimatedHours,
          budget: projectData.budget,
          template_id: projectData.templateId,
          is_recurring: projectData.isRecurring,
          recurring_schedule: projectData.recurringSchedule,
          status: 'backlog', // Default status
          impact_metrics: {},
          stage_validations: {},
          completion_criteria: []
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      // Create project assignments for assigned members
      if (projectData.assignedMembers && projectData.assignedMembers.length > 0) {
        const assignments = projectData.assignedMembers.map(memberId => ({
          project_id: data.id,
          user_id: memberId,
          user_name: `User ${memberId.slice(-4)}`, // TODO: Get actual user names
          role: 'contributor',
          assigned_by: projectData.ownerId,
          assigned_by_name: 'System' // TODO: Get actual user name
        }))

        await supabase
          .from('project_assignments')
          .insert(assignments)
      }

      // Get the complete project with all related data
      const projectResult = await this.getProjectById(data.id)
      if (!projectResult.success) {
        throw new Error('Failed to retrieve created project')
      }

      return {
        success: true,
        data: projectResult.data!
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create project'
      }
    }
  }

  static async updateProject(
    id: string, 
    updates: Partial<ProjectFormData>, 
    userId: string
  ): Promise<ApiResponse<InternalProject>> {
    try {
      const { data, error } = await supabase
        .from('internal_projects')
        .update({
          title: updates.title,
          description: updates.description,
          category_id: updates.categoryId,
          priority: updates.priority,
          due_date: updates.dueDate,
          estimated_hours: updates.estimatedHours,
          budget: updates.budget,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      // Update assignments if provided
      if (updates.assignedMembers) {
        // Remove existing assignments
        await supabase
          .from('project_assignments')
          .update({ removed_at: new Date().toISOString(), removed_by: userId })
          .eq('project_id', id)
          .is('removed_at', null)

        // Add new assignments
        if (updates.assignedMembers.length > 0) {
          const assignments = updates.assignedMembers.map(memberId => ({
            project_id: id,
            user_id: memberId,
            user_name: `User ${memberId.slice(-4)}`, // TODO: Get actual user names
            role: 'contributor',
            assigned_by: userId,
            assigned_by_name: 'System' // TODO: Get actual user name
          }))

          await supabase
            .from('project_assignments')
            .insert(assignments)
        }
      }

      const projectResult = await this.getProjectById(id)
      if (!projectResult.success) {
        throw new Error('Failed to retrieve updated project')
      }

      return {
        success: true,
        data: projectResult.data!
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update project'
      }
    }
  }

  static async updateProjectStatus(
    id: string, 
    status: string, 
    userId: string, 
    notes?: string
  ): Promise<ApiResponse<InternalProject>> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      }

      // Set completion date if moving to 'done'
      if (status === 'done') {
        updateData.completed_at = new Date().toISOString()
      } else if (status !== 'done') {
        updateData.completed_at = null
      }

      const { data, error } = await supabase
        .from('internal_projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      const projectResult = await this.getProjectById(id)
      if (!projectResult.success) {
        throw new Error('Failed to retrieve updated project')
      }

      return {
        success: true,
        data: projectResult.data!
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update project status'
      }
    }
  }

  static async deleteProject(id: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('internal_projects')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      return {
        success: true,
        data: undefined
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete project'
      }
    }
  }

  static async getProjectCategories(): Promise<ApiResponse<ProjectCategory[]>> {
    try {
      const { data, error } = await supabase
        .from('project_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      const categories: ProjectCategory[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        color: row.color,
        description: row.description || '',
        defaultPriority: row.default_priority
      }))

      return {
        success: true,
        data: categories
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve categories'
      }
    }
  }

  private static transformDatabaseProject(row: any): InternalProject {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: {
        id: row.category_id,
        name: row.category_name,
        color: row.category_color,
        description: '',
        defaultPriority: 'medium'
      },
      priority: row.priority,
      status: row.status,
      ownerId: row.owner_id,
      assignedMembers: row.assigned_members || [],
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      estimatedHours: row.estimated_hours,
      actualHours: row.actual_hours,
      budget: row.budget,
      actualCost: row.actual_cost,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      comments: [], // Will be loaded separately if needed
      attachments: [], // Will be loaded separately if needed
      statusUpdates: [], // Will be loaded separately if needed
      templateId: row.template_id,
      isRecurring: row.is_recurring || false,
      recurringSchedule: row.recurring_schedule,
      impactMetrics: row.impact_metrics || {},
      outcomeAssessment: row.outcome_assessment
    }
  }
}