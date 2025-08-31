import { createClient } from '@/lib/supabase'
import type {
  ShiftTemplate,
  ShiftTemplateCreateData,
  ServiceResult,
  ApprovalStatus
} from '@/lib/types/shift-types'

export interface TemplateUsageStats {
  totalUsage: number
  monthlyUsage: number
  averageSuccessRate: number
  popularTimeSlots: string[]
  guardFeedbackScore: number
}

export class ShiftTemplateService {
  private supabase = createClient()

  async createTemplate(templateData: ShiftTemplateCreateData, managerId: string): Promise<ServiceResult<ShiftTemplate>> {
    try {
      // Validate manager permissions
      const hasPermission = await this.validateManagerPermissions(managerId)
      if (!hasPermission.success) {
        return {
          success: false,
          error: hasPermission.error
        }
      }

      const { data, error } = await this.supabase
        .from('shift_templates')
        .insert([{
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          template_data: templateData.templateData,
          created_by: managerId,
          is_shared: templateData.isShared,
          approval_status: templateData.isShared ? 'pending' : 'approved' // Shared templates need approval
        }])
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: {
            code: 'CREATE_TEMPLATE_FAILED',
            message: 'Failed to create template',
            details: { dbError: error }
          }
        }
      }

      return {
        success: true,
        data: this.mapDatabaseRowToTemplate(data)
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_TEMPLATE_ERROR',
          message: 'Unexpected error creating template',
          details: { error }
        }
      }
    }
  }

  async getTemplates(category?: string, sharedOnly?: boolean): Promise<ServiceResult<ShiftTemplate[]>> {
    try {
      let query = this.supabase
        .from('shift_templates')
        .select('*')
        .eq('approval_status', 'approved') // Only get approved templates

      if (category) {
        query = query.eq('category', category)
      }

      if (sharedOnly) {
        query = query.eq('is_shared', true)
      }

      query = query.order('usage_count', { ascending: false })

      const { data, error } = await query

      if (error) {
        return {
          success: false,
          error: {
            code: 'GET_TEMPLATES_FAILED',
            message: 'Failed to retrieve templates',
            details: { dbError: error }
          }
        }
      }

      return {
        success: true,
        data: data.map(row => this.mapDatabaseRowToTemplate(row))
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_TEMPLATES_ERROR',
          message: 'Error retrieving templates',
          details: { error }
        }
      }
    }
  }

  async getTemplate(templateId: string): Promise<ServiceResult<ShiftTemplate>> {
    try {
      const { data, error } = await this.supabase
        .from('shift_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (error) {
        return {
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found',
            details: { dbError: error }
          }
        }
      }

      return {
        success: true,
        data: this.mapDatabaseRowToTemplate(data)
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_TEMPLATE_ERROR',
          message: 'Error retrieving template',
          details: { error }
        }
      }
    }
  }

  async updateTemplate(templateId: string, updates: Partial<ShiftTemplateCreateData>): Promise<ServiceResult<ShiftTemplate>> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (updates.name) updateData.name = updates.name
      if (updates.description !== undefined) updateData.description = updates.description
      if (updates.category) updateData.category = updates.category
      if (updates.templateData) updateData.template_data = updates.templateData
      if (updates.isShared !== undefined) {
        updateData.is_shared = updates.isShared
        // If making template shared, require approval
        if (updates.isShared) {
          updateData.approval_status = 'pending'
        }
      }

      const { data, error } = await this.supabase
        .from('shift_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: {
            code: 'UPDATE_TEMPLATE_FAILED',
            message: 'Failed to update template',
            details: { dbError: error }
          }
        }
      }

      return {
        success: true,
        data: this.mapDatabaseRowToTemplate(data)
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_TEMPLATE_ERROR',
          message: 'Error updating template',
          details: { error }
        }
      }
    }
  }

  async deleteTemplate(templateId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase
        .from('shift_templates')
        .delete()
        .eq('id', templateId)

      if (error) {
        return {
          success: false,
          error: {
            code: 'DELETE_TEMPLATE_FAILED',
            message: 'Failed to delete template',
            details: { dbError: error }
          }
        }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_TEMPLATE_ERROR',
          message: 'Error deleting template',
          details: { error }
        }
      }
    }
  }

  // Template Analytics
  async getTemplateUsageStats(templateId: string): Promise<ServiceResult<TemplateUsageStats>> {
    try {
      // Get basic usage stats from the template record
      const templateResult = await this.getTemplate(templateId)
      if (!templateResult.success || !templateResult.data) {
        return {
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found for stats'
          }
        }
      }

      const template = templateResult.data

      // Get more detailed stats by looking at shifts created from this template
      const { data: shifts, error: shiftsError } = await this.supabase
        .from('shifts')
        .select('status, time_range, created_at')
        .eq('template_id', templateId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

      if (shiftsError) {
        console.warn('Failed to get shift stats for template:', shiftsError)
      }

      const monthlyUsage = shifts?.length || 0
      const completedShifts = shifts?.filter(s => s.status === 'completed') || []
      const successRate = monthlyUsage > 0 ? (completedShifts.length / monthlyUsage) * 100 : 0

      // Analyze popular time slots (simplified)
      const timeSlots = shifts?.map(s => {
        if (s.time_range) {
          const start = new Date(s.time_range.split(',')[0].replace('[', '').replace('"', ''))
          return start.getHours() >= 18 || start.getHours() < 6 ? 'Night' : 'Day'
        }
        return 'Unknown'
      }) || []

      const popularTimeSlots = [...new Set(timeSlots)]

      return {
        success: true,
        data: {
          totalUsage: template.usageCount,
          monthlyUsage,
          averageSuccessRate: Math.round(successRate),
          popularTimeSlots,
          guardFeedbackScore: 85 // Simplified - would integrate with feedback system
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_TEMPLATE_STATS_ERROR',
          message: 'Error retrieving template usage stats',
          details: { error }
        }
      }
    }
  }

  async incrementTemplateUsage(templateId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase
        .from('shift_templates')
        .update({ 
          usage_count: this.supabase.rpc('increment_usage_count', { template_id: templateId }),
          last_used_at: new Date().toISOString()
        })
        .eq('id', templateId)

      if (error) {
        // Don't fail the main operation if usage tracking fails
        console.warn('Failed to increment template usage:', error)
      }

      return { success: true }
    } catch (error) {
      console.warn('Error incrementing template usage:', error)
      return { success: true } // Don't fail the main operation
    }
  }

  // Template Approval Workflow
  async submitTemplateForApproval(templateId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase
        .from('shift_templates')
        .update({ 
          approval_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)

      if (error) {
        return {
          success: false,
          error: {
            code: 'SUBMIT_APPROVAL_FAILED',
            message: 'Failed to submit template for approval',
            details: { dbError: error }
          }
        }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SUBMIT_APPROVAL_ERROR',
          message: 'Error submitting template for approval',
          details: { error }
        }
      }
    }
  }

  async approveTemplate(templateId: string, approverId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase
        .from('shift_templates')
        .update({ 
          approval_status: 'approved',
          approved_by: approverId,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)

      if (error) {
        return {
          success: false,
          error: {
            code: 'APPROVE_TEMPLATE_FAILED',
            message: 'Failed to approve template',
            details: { dbError: error }
          }
        }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'APPROVE_TEMPLATE_ERROR',
          message: 'Error approving template',
          details: { error }
        }
      }
    }
  }

  async rejectTemplate(templateId: string, reason: string, approverId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await this.supabase
        .from('shift_templates')
        .update({ 
          approval_status: 'rejected',
          approved_by: approverId,
          description: reason, // Store rejection reason in description for now
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)

      if (error) {
        return {
          success: false,
          error: {
            code: 'REJECT_TEMPLATE_FAILED',
            message: 'Failed to reject template',
            details: { dbError: error }
          }
        }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REJECT_TEMPLATE_ERROR',
          message: 'Error rejecting template',
          details: { error }
        }
      }
    }
  }

  // Helper methods
  private async validateManagerPermissions(managerId: string): Promise<ServiceResult<boolean>> {
    try {
      const { data: user, error } = await this.supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', managerId)
        .single()

      if (error || !user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED_MANAGER',
            message: 'Manager not found or unauthorized'
          }
        }
      }

      if (!['manager', 'admin'].includes(user.role)) {
        return {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions for template management'
          }
        }
      }

      return { success: true, data: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PERMISSION_CHECK_ERROR',
          message: 'Error checking manager permissions',
          details: { error }
        }
      }
    }
  }

  private mapDatabaseRowToTemplate(row: any): ShiftTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      templateData: row.template_data,
      createdBy: row.created_by,
      approvedBy: row.approved_by,
      approvalStatus: row.approval_status,
      isShared: row.is_shared,
      usageCount: row.usage_count || 0,
      lastUsedAt: row.last_used_at,
      version: row.version || 1,
      parentTemplateId: row.parent_template_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}