import { supabase } from '@/lib/supabase'
import type { 
  ProjectTemplate,
  ApiResponse 
} from '@/lib/types'

export class ProjectTemplateService {
  static async getProjectTemplates(userId: string): Promise<ApiResponse<ProjectTemplate[]>> {
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .select(`
          *,
          category:project_categories(*)
        `)
        .or(`is_public.eq.true,created_by.eq.${userId}`)
        .order('usage_count', { ascending: false })

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      const templates: ProjectTemplate[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: {
          id: row.category.id,
          name: row.category.name,
          color: row.category.color,
          description: row.category.description || '',
          defaultPriority: row.category.default_priority
        },
        defaultDuration: row.default_duration,
        defaultPriority: row.default_priority,
        checklistItems: row.checklist_items || [],
        requiredResources: row.required_resources || [],
        createdBy: row.created_by,
        createdByName: row.created_by_name,
        isPublic: row.is_public,
        usageCount: row.usage_count,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }))

      return {
        success: true,
        data: templates
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve templates'
      }
    }
  }

  static async getTemplateById(id: string): Promise<ApiResponse<ProjectTemplate>> {
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .select(`
          *,
          category:project_categories(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Template not found')
        }
        throw new Error(`Database error: ${error.message}`)
      }

      const template: ProjectTemplate = {
        id: data.id,
        name: data.name,
        description: data.description,
        category: {
          id: data.category.id,
          name: data.category.name,
          color: data.category.color,
          description: data.category.description || '',
          defaultPriority: data.category.default_priority
        },
        defaultDuration: data.default_duration,
        defaultPriority: data.default_priority,
        checklistItems: data.checklist_items || [],
        requiredResources: data.required_resources || [],
        createdBy: data.created_by,
        createdByName: data.created_by_name,
        isPublic: data.is_public,
        usageCount: data.usage_count,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      }

      return {
        success: true,
        data: template
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve template'
      }
    }
  }

  static async createProjectTemplate(templateData: any): Promise<ApiResponse<ProjectTemplate>> {
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .insert({
          name: templateData.name,
          description: templateData.description,
          category_id: templateData.categoryId,
          default_duration: templateData.defaultDuration || 40,
          default_priority: templateData.defaultPriority || 'medium',
          checklist_items: templateData.checklistItems || [],
          required_resources: templateData.requiredResources || [],
          created_by: templateData.createdBy,
          created_by_name: 'System User', // TODO: Get actual user name
          is_public: templateData.isPublic || false
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      const templateResult = await this.getTemplateById(data.id)
      if (!templateResult.success) {
        throw new Error('Failed to retrieve created template')
      }

      return {
        success: true,
        data: templateResult.data!
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template'
      }
    }
  }

  static async incrementTemplateUsage(templateId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('project_templates')
        .update({
          usage_count: 1, // Note: This should be handled with RPC for atomic increment
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)

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
        error: error instanceof Error ? error.message : 'Failed to increment template usage'
      }
    }
  }
}