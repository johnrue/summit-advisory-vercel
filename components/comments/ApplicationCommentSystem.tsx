"use client"

import { useState, useEffect, useCallback } from 'react'
import { CommentThread } from './CommentThread'
import { CommentEditor } from './CommentEditor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, MessageCircle, Plus, Filter } from 'lucide-react'
import { ApplicationCommentService } from '@/lib/services/application-comment-service'
import type { 
  ApplicationComment, 
  CommentType,
  CreateCommentRequest
} from '@/lib/types/kanban-workflow'

interface ApplicationCommentSystemProps {
  applicationId: string
  currentUserId: string
  currentUserName: string
  onCommentAdd?: (comment: ApplicationComment) => void
  showThreading?: boolean
  enableMentions?: boolean
  maxHeight?: string
  className?: string
}

export function ApplicationCommentSystem({
  applicationId,
  currentUserId,
  currentUserName,
  onCommentAdd,
  showThreading = true,
  enableMentions = true,
  maxHeight = '500px',
  className = ''
}: ApplicationCommentSystemProps) {
  const [comments, setComments] = useState<ApplicationComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | CommentType>('all')
  const [showEditor, setShowEditor] = useState(false)
  const [stats, setStats] = useState<any>(null)

  // Load comments
  const loadComments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const result = await ApplicationCommentService.getComments(applicationId, {
        includeDeleted: false,
        commentType: activeTab === 'all' ? undefined : activeTab
      })

      if (result.success && result.data) {
        setComments(result.data)
      } else {
        setError(result.error || 'Failed to load comments')
      }

      // Load stats
      const statsResult = await ApplicationCommentService.getCommentStats(applicationId)
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
      setError('Failed to load comments')
    } finally {
      setIsLoading(false)
    }
  }, [applicationId, activeTab])

  // Initial load
  useEffect(() => {
    loadComments()
  }, [loadComments])

  // Handle new comment submission
  const handleCommentSubmit = async (
    commentText: string, 
    commentType: CommentType,
    parentCommentId?: string
  ) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const request: CreateCommentRequest = {
        applicationId,
        commentText,
        commentType,
        parentCommentId
      }

      const result = await ApplicationCommentService.addComment(request, currentUserId)

      if (result.success && result.data) {
        // Add comment to local state
        if (parentCommentId && showThreading) {
          // Add as reply to existing comment
          const addReplyToComment = (comments: ApplicationComment[]): ApplicationComment[] => {
            return comments.map(comment => {
              if (comment.id === parentCommentId) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), result.data!]
                }
              }
              if (comment.replies) {
                return {
                  ...comment,
                  replies: addReplyToComment(comment.replies)
                }
              }
              return comment
            })
          }
          setComments(addReplyToComment(comments))
        } else {
          // Add as root comment
          setComments(prev => [...prev, result.data!])
        }

        // Callback for parent component
        onCommentAdd?.(result.data)
        
        // Hide editor
        setShowEditor(false)
        
        // Reload to get updated stats
        setTimeout(loadComments, 500)
      } else {
        setError(result.error || 'Failed to add comment')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      setError('Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle comment update
  const handleCommentUpdate = async (commentId: string, newText: string) => {
    try {
      const result = await ApplicationCommentService.updateComment(
        commentId, 
        { commentText: newText }, 
        currentUserId
      )

      if (result.success && result.data) {
        // Update comment in local state
        const updateComment = (comments: ApplicationComment[]): ApplicationComment[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return result.data!
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: updateComment(comment.replies)
              }
            }
            return comment
          })
        }
        setComments(updateComment(comments))
      } else {
        setError(result.error || 'Failed to update comment')
      }
    } catch (error) {
      console.error('Error updating comment:', error)
      setError('Failed to update comment')
    }
  }

  // Handle comment deletion
  const handleCommentDelete = async (commentId: string) => {
    try {
      const result = await ApplicationCommentService.deleteComment(commentId, currentUserId)

      if (result.success) {
        // Remove comment from local state
        const removeComment = (comments: ApplicationComment[]): ApplicationComment[] => {
          return comments
            .filter(comment => comment.id !== commentId)
            .map(comment => ({
              ...comment,
              replies: comment.replies ? removeComment(comment.replies) : undefined
            }))
        }
        setComments(removeComment(comments))
      } else {
        setError(result.error || 'Failed to delete comment')
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      setError('Failed to delete comment')
    }
  }

  // Filter comments by type for tabs
  const getFilteredComments = () => {
    if (activeTab === 'all') {
      return comments
    }
    return comments.filter(comment => comment.comment_type === activeTab)
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading comments...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Comments & Collaboration</span>
            {stats && (
              <Badge variant="secondary">{stats.total}</Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={showEditor ? "secondary" : "outline"}
              onClick={() => setShowEditor(!showEditor)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Comment
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Comment Type Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="mb-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all" className="text-xs">
              All
              {stats && <Badge variant="outline" className="ml-1">{stats.total}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
            <TabsTrigger value="interview_feedback" className="text-xs">Interview</TabsTrigger>
            <TabsTrigger value="background_check" className="text-xs">Background</TabsTrigger>
            <TabsTrigger value="manager_note" className="text-xs">Manager</TabsTrigger>
            <TabsTrigger value="system_notification" className="text-xs">System</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Comment Editor */}
        {showEditor && (
          <div className="mb-4">
            <CommentEditor
              onSubmit={handleCommentSubmit}
              onCancel={() => setShowEditor(false)}
              isSubmitting={isSubmitting}
              enableMentions={enableMentions}
              placeholder="Add a comment..."
              currentUserName={currentUserName}
            />
          </div>
        )}

        {/* Comments List */}
        <ScrollArea style={{ maxHeight }} className="pr-4">
          {getFilteredComments().length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No comments yet</p>
              <p className="text-xs">Be the first to add feedback or notes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {getFilteredComments().map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  onReply={showThreading ? handleCommentSubmit : undefined}
                  onEdit={handleCommentUpdate}
                  onDelete={handleCommentDelete}
                  enableMentions={enableMentions}
                  showReplies={showThreading}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}