"use client"

import { useState } from 'react'
import { CommentEditor } from './CommentEditor'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  MoreHorizontal, 
  Reply, 
  Edit, 
  Trash2, 
  Clock,
  MessageCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ApplicationComment, CommentType } from '@/lib/types/kanban-workflow'

interface CommentThreadProps {
  comment: ApplicationComment
  currentUserId: string
  currentUserName: string
  onReply?: (text: string, type: CommentType, parentId: string) => void
  onEdit?: (commentId: string, newText: string) => void
  onDelete?: (commentId: string) => void
  enableMentions?: boolean
  showReplies?: boolean
  depth?: number
  className?: string
}

const COMMENT_TYPE_COLORS = {
  general: 'bg-slate-100 text-slate-700',
  interview_feedback: 'bg-blue-100 text-blue-700',
  background_check: 'bg-purple-100 text-purple-700',
  manager_note: 'bg-amber-100 text-amber-700',
  system_notification: 'bg-green-100 text-green-700'
}

const COMMENT_TYPE_LABELS = {
  general: 'General',
  interview_feedback: 'Interview',
  background_check: 'Background',
  manager_note: 'Manager Note',
  system_notification: 'System'
}

export function CommentThread({
  comment,
  currentUserId,
  currentUserName,
  onReply,
  onEdit,
  onDelete,
  enableMentions = true,
  showReplies = true,
  depth = 0,
  className = ''
}: CommentThreadProps) {
  const [showReplyEditor, setShowReplyEditor] = useState(false)
  const [showEditEditor, setShowEditEditor] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  const isOwnComment = comment.author_id === currentUserId
  const hasReplies = comment.replies && comment.replies.length > 0
  const maxDepth = 3 // Maximum nesting level

  // Handle reply submission
  const handleReplySubmit = (text: string, type: CommentType) => {
    onReply?.(text, type, comment.id)
    setShowReplyEditor(false)
  }

  // Handle edit submission
  const handleEditSubmit = (text: string) => {
    onEdit?.(comment.id, text)
    setShowEditEditor(false)
  }

  // Handle delete
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      onDelete?.(comment.id)
    }
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase()
  }

  return (
    <div className={cn('space-y-2', className)} style={{ marginLeft: `${depth * 20}px` }}>
      <Card className={cn(
        'border-l-4 transition-colors hover:shadow-sm',
        depth > 0 ? 'border-l-slate-300 bg-slate-50' : 'border-l-blue-300'
      )}>
        <CardContent className="p-3">
          {/* Comment Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-slate-200">
                  {getInitials(comment.author_name || 'U')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-slate-900">
                  {comment.author_name || 'Unknown User'}
                </span>
                
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-xs px-1 py-0',
                    COMMENT_TYPE_COLORS[comment.comment_type]
                  )}
                >
                  {COMMENT_TYPE_LABELS[comment.comment_type]}
                </Badge>
                
                <div className="flex items-center text-xs text-slate-500">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                  {comment.updated_at !== comment.created_at && (
                    <span className="ml-1">(edited)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Comment Actions */}
            {(isOwnComment || onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onReply && depth < maxDepth && (
                    <DropdownMenuItem onClick={() => setShowReplyEditor(true)}>
                      <Reply className="h-3 w-3 mr-2" />
                      Reply
                    </DropdownMenuItem>
                  )}
                  {isOwnComment && onEdit && (
                    <DropdownMenuItem onClick={() => setShowEditEditor(true)}>
                      <Edit className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {isOwnComment && onDelete && (
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Comment Content */}
          {showEditEditor ? (
            <div className="mt-2">
              <CommentEditor
                initialText={comment.comment_text}
                initialType={comment.comment_type}
                onSubmit={handleEditSubmit}
                onCancel={() => setShowEditEditor(false)}
                enableMentions={enableMentions}
                placeholder="Edit your comment..."
                currentUserName={currentUserName}
                isEditing={true}
              />
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {comment.comment_text}
              </p>
            </div>
          )}

          {/* Comment Actions Bar */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-3">
              {onReply && depth < maxDepth && !showReplyEditor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplyEditor(true)}
                  className="text-xs h-6 px-2 text-slate-600 hover:text-slate-900"
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}
              
              {hasReplies && showReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs h-6 px-2 text-slate-600 hover:text-slate-900"
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  {isExpanded ? 'Hide' : 'Show'} {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reply Editor */}
      {showReplyEditor && (
        <div className="ml-4">
          <CommentEditor
            onSubmit={handleReplySubmit}
            onCancel={() => setShowReplyEditor(false)}
            enableMentions={enableMentions}
            placeholder="Write a reply..."
            currentUserName={currentUserName}
            defaultType={comment.comment_type}
          />
        </div>
      )}

      {/* Nested Replies */}
      {hasReplies && showReplies && isExpanded && (
        <div className="space-y-2">
          {comment.replies!.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              enableMentions={enableMentions}
              showReplies={showReplies}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}