"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Send } from 'lucide-react'
import type { InternalProject } from '@/lib/types'

interface ProjectCommentsProps {
  project: InternalProject
  onUpdate: (project: InternalProject) => void
}

export function ProjectComments({ project, onUpdate }: ProjectCommentsProps) {
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/v1/projects/${project.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
        })
      })

      if (!response.ok) {
        throw new Error('Failed to add comment')
      }

      const updatedProject = await response.json()
      onUpdate(updatedProject.project)
      setNewComment('')
    } catch (error) {
    } finally {
      setIsSubmitting(false)
    }
  }

  const comments = project.comments || []

  return (
    <div className="space-y-6">
      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[100px]"
        />
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={!newComment.trim() || isSubmitting}
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Adding...' : 'Add Comment'}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No comments yet</p>
            <p className="text-sm text-muted-foreground">
              Be the first to add a comment to this project
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {comment.authorName?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{comment.authorName || 'Unknown User'}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-sm text-foreground bg-muted p-3 rounded-lg">
                  {comment.content}
                </div>
                {comment.mentions && comment.mentions.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Mentioned: {comment.mentions.length} user(s)
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}