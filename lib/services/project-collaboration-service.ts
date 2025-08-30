import { supabase } from '@/lib/supabase'
import type { 
  ProjectComment, 
  ProjectCollaborationActivity,
  ApiResponse 
} from '@/lib/types'

export class ProjectCollaborationService {
  static async getProjectComments(projectId: string, userId: string): Promise<ApiResponse<ProjectComment[]>> {
    try {
      // Check if user has access to this project
      const hasAccess = await this.checkProjectAccess(projectId, userId)
      if (!hasAccess) {
        return {
          success: false,
          error: 'Access denied'
        }
      }

      const { data, error } = await supabase
        .from('project_comments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      const comments: ProjectComment[] = (data || []).map(row => ({
        id: row.id,
        projectId: row.project_id,
        authorId: row.author_id,
        authorName: row.author_name,
        content: row.content,
        mentions: row.mentions || [],
        parentCommentId: row.parent_comment_id,
        createdAt: new Date(row.created_at),
        updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
      }))

      return {
        success: true,
        data: comments
      }
    } catch (error) {
      console.error('Error in getProjectComments:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve comments'
      }
    }
  }

  static async addProjectComment(
    projectId: string, 
    authorId: string, 
    content: string,
    parentCommentId?: string
  ): Promise<ApiResponse<{ comment: ProjectComment; project: any }>> {
    try {
      // Check if user has access to this project
      const hasAccess = await this.checkProjectAccess(projectId, authorId)
      if (!hasAccess) {
        return {
          success: false,
          error: 'Access denied'
        }
      }

      // Parse mentions from content
      const mentions = this.extractMentions(content)

      const { data, error } = await supabase
        .from('project_comments')
        .insert({
          project_id: projectId,
          author_id: authorId,
          author_name: 'System User', // TODO: Get actual user name
          content: content,
          mentions: mentions,
          parent_comment_id: parentCommentId
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      const comment: ProjectComment = {
        id: data.id,
        projectId: data.project_id,
        authorId: data.author_id,
        authorName: data.author_name,
        content: data.content,
        mentions: data.mentions || [],
        parentCommentId: data.parent_comment_id,
        createdAt: new Date(data.created_at),
        updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
      }

      // Create mentions records
      if (mentions.length > 0) {
        const mentionRecords = mentions.map(userId => ({
          project_id: projectId,
          comment_id: data.id,
          mentioned_user_id: userId,
          mentioned_user_name: `User ${userId.slice(-4)}`, // TODO: Get actual user name
          mentioned_by: authorId,
          mentioned_by_name: 'System User', // TODO: Get actual user name
          context: content.substring(0, 200)
        }))

        await supabase
          .from('project_mentions')
          .insert(mentionRecords)
      }

      // Get updated project (simplified - in real implementation would fetch full project)
      const project = { id: projectId, updated: true }

      return {
        success: true,
        data: { comment, project }
      }
    } catch (error) {
      console.error('Error in addProjectComment:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add comment'
      }
    }
  }

  static async getProjectActivities(projectId: string, userId: string): Promise<ApiResponse<ProjectCollaborationActivity[]>> {
    try {
      // Check if user has access to this project
      const hasAccess = await this.checkProjectAccess(projectId, userId)
      if (!hasAccess) {
        return {
          success: false,
          error: 'Access denied'
        }
      }

      const { data, error } = await supabase
        .from('project_activities')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50) // Limit to recent activities

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      const activities: ProjectCollaborationActivity[] = (data || []).map(row => ({
        id: row.id,
        projectId: row.project_id,
        activityType: row.activity_type,
        authorId: row.author_id,
        authorName: row.author_name,
        description: row.description,
        metadata: row.metadata,
        createdAt: new Date(row.created_at)
      }))

      return {
        success: true,
        data: activities
      }
    } catch (error) {
      console.error('Error in getProjectActivities:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve activities'
      }
    }
  }

  private static async checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('internal_projects')
        .select('owner_id, assigned_members')
        .eq('id', projectId)
        .single()

      if (error || !data) {
        return false
      }

      // Check if user is owner or assigned member
      return data.owner_id === userId || 
             (data.assigned_members && data.assigned_members.includes(userId))
    } catch (error) {
      console.error('Error checking project access:', error)
      return false
    }
  }

  private static extractMentions(content: string): string[] {
    // Extract @mentions from content
    const mentionRegex = /@([a-zA-Z0-9-_]+)/g
    const mentions = []
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1])
    }

    return [...new Set(mentions)] // Remove duplicates
  }
}