import { supabase } from '@/lib/supabase'
import type { 
  ApplicationComment,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentQueryOptions
} from '@/lib/types/kanban-workflow'

/**
 * Service for managing application comments and collaboration
 */
export class ApplicationCommentService {
  
  /**
   * Get comments for an application
   */
  static async getComments(
    applicationId: string,
    options: CommentQueryOptions = {}
  ): Promise<{ success: boolean; data?: ApplicationComment[]; error?: string }> {
    try {
      let query = supabase
        .from('application_comments')
        .select(`
          *,
          author:author_id(first_name, last_name, email)
        `)
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true })

      if (!options.includeDeleted) {
        query = query.eq('is_deleted', false)
      }

      if (options.commentType) {
        query = query.eq('comment_type', options.commentType)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch comments: ${error.message}`)
      }

      // Transform data to include author name
      const comments: ApplicationComment[] = (data || []).map((comment: any) => ({
        ...comment,
        author_name: comment.author 
          ? `${comment.author.first_name} ${comment.author.last_name}` 
          : 'Unknown User'
      }))

      // Build threaded structure for parent-child relationships
      const threaded = this.buildThreadedComments(comments)

      return {
        success: true,
        data: threaded
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Add a new comment
   */
  static async addComment(
    request: CreateCommentRequest,
    authorId: string
  ): Promise<{ success: boolean; data?: ApplicationComment; error?: string }> {
    try {
      const commentData = {
        application_id: request.applicationId,
        author_id: authorId,
        comment_text: request.commentText.trim(),
        comment_type: request.commentType,
        parent_comment_id: request.parentCommentId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false
      }

      const { data, error } = await supabase
        .from('application_comments')
        .insert([commentData])
        .select(`
          *,
          author:author_id(first_name, last_name, email)
        `)
        .single()

      if (error) {
        throw new Error(`Failed to add comment: ${error.message}`)
      }

      const comment: ApplicationComment = {
        ...data,
        author_name: data.author 
          ? `${data.author.first_name} ${data.author.last_name}` 
          : 'Unknown User'
      }

      return {
        success: true,
        data: comment
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Update an existing comment
   */
  static async updateComment(
    commentId: string,
    request: UpdateCommentRequest,
    userId: string
  ): Promise<{ success: boolean; data?: ApplicationComment; error?: string }> {
    try {
      // First verify the user owns this comment or is an admin
      const { data: existingComment, error: fetchError } = await supabase
        .from('application_comments')
        .select('author_id')
        .eq('id', commentId)
        .single()

      if (fetchError) {
        throw new Error(`Comment not found: ${fetchError.message}`)
      }

      if (existingComment.author_id !== userId) {
        // TODO: Check if user is admin - for now, only allow author to edit
        throw new Error('Not authorized to edit this comment')
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (request.commentText) {
        updateData.comment_text = request.commentText.trim()
      }

      if (request.commentType) {
        updateData.comment_type = request.commentType
      }

      const { data, error } = await supabase
        .from('application_comments')
        .update(updateData)
        .eq('id', commentId)
        .select(`
          *,
          author:author_id(first_name, last_name, email)
        `)
        .single()

      if (error) {
        throw new Error(`Failed to update comment: ${error.message}`)
      }

      const comment: ApplicationComment = {
        ...data,
        author_name: data.author 
          ? `${data.author.first_name} ${data.author.last_name}` 
          : 'Unknown User'
      }

      return {
        success: true,
        data: comment
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Delete a comment (soft delete)
   */
  static async deleteComment(
    commentId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First verify the user owns this comment or is an admin
      const { data: existingComment, error: fetchError } = await supabase
        .from('application_comments')
        .select('author_id')
        .eq('id', commentId)
        .single()

      if (fetchError) {
        throw new Error(`Comment not found: ${fetchError.message}`)
      }

      if (existingComment.author_id !== userId) {
        // TODO: Check if user is admin - for now, only allow author to delete
        throw new Error('Not authorized to delete this comment')
      }

      const { error } = await supabase
        .from('application_comments')
        .update({ 
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)

      if (error) {
        throw new Error(`Failed to delete comment: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get mentioned users in a comment text
   */
  static async getMentionedUsers(commentText: string): Promise<string[]> {
    try {
      // Extract @mentions from comment text
      const mentionRegex = /@(\w+)/g
      const mentions: string[] = []
      let match

      while ((match = mentionRegex.exec(commentText)) !== null) {
        mentions.push(match[1])
      }

      if (mentions.length === 0) {
        return []
      }

      // TODO: Implement user lookup by username or email
      // For now, return empty array
      return []
    } catch (error) {
      return []
    }
  }

  /**
   * Build threaded comment structure
   */
  private static buildThreadedComments(comments: ApplicationComment[]): ApplicationComment[] {
    const commentMap = new Map<string, ApplicationComment>()
    const rootComments: ApplicationComment[] = []

    // First pass: create map and identify root comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment })
      if (!comment.parent_comment_id) {
        rootComments.push(comment)
      }
    })

    // Second pass: build parent-child relationships
    comments.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id)
        if (parent) {
          if (!parent.replies) {
            parent.replies = []
          }
          parent.replies.push(comment)
        }
      }
    })

    return rootComments
  }

  /**
   * Get comment statistics for an application
   */
  static async getCommentStats(
    applicationId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('application_comments')
        .select('comment_type, author_id')
        .eq('application_id', applicationId)
        .eq('is_deleted', false)

      if (error) {
        throw new Error(`Failed to fetch comment stats: ${error.message}`)
      }

      const stats = {
        total: data?.length || 0,
        by_type: data?.reduce((acc: any, comment: any) => {
          acc[comment.comment_type] = (acc[comment.comment_type] || 0) + 1
          return acc
        }, {}) || {},
        unique_authors: new Set(data?.map(c => c.author_id)).size || 0
      }

      return {
        success: true,
        data: stats
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}

// Extend ApplicationComment interface for threaded comments
declare global {
  interface ApplicationComment {
    replies?: ApplicationComment[]
  }
}