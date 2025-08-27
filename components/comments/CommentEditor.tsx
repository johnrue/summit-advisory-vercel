"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  X, 
  AtSign, 
  MessageSquare,
  AlertCircle,
  FileText,
  UserCheck,
  Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommentType } from '@/lib/types/kanban-workflow'

interface CommentEditorProps {
  onSubmit: (text: string, type: CommentType, parentId?: string) => void
  onCancel: () => void
  isSubmitting?: boolean
  enableMentions?: boolean
  placeholder?: string
  currentUserName: string
  initialText?: string
  initialType?: CommentType
  defaultType?: CommentType
  isEditing?: boolean
  className?: string
}

const COMMENT_TYPE_OPTIONS = [
  {
    value: 'general' as CommentType,
    label: 'General Comment',
    icon: MessageSquare,
    description: 'General feedback or discussion'
  },
  {
    value: 'interview_feedback' as CommentType,
    label: 'Interview Feedback',
    icon: UserCheck,
    description: 'Notes from interview process'
  },
  {
    value: 'background_check' as CommentType,
    label: 'Background Check',
    icon: FileText,
    description: 'Background verification notes'
  },
  {
    value: 'manager_note' as CommentType,
    label: 'Manager Note',
    icon: AlertCircle,
    description: 'Internal manager observations'
  },
  {
    value: 'system_notification' as CommentType,
    label: 'System Notification',
    icon: Bell,
    description: 'Automated system updates'
  }
]

export function CommentEditor({
  onSubmit,
  onCancel,
  isSubmitting = false,
  enableMentions = true,
  placeholder = 'Add a comment...',
  currentUserName,
  initialText = '',
  initialType = 'general',
  defaultType = 'general',
  isEditing = false,
  className = ''
}: CommentEditorProps) {
  const [text, setText] = useState(initialText)
  const [commentType, setCommentType] = useState<CommentType>(initialType || defaultType)
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      if (initialText) {
        textareaRef.current.setSelectionRange(initialText.length, initialText.length)
      }
    }
  }, [initialText])

  // Handle text changes and mention detection
  const handleTextChange = (value: string) => {
    setText(value)
    
    if (enableMentions) {
      const cursorPos = textareaRef.current?.selectionStart || 0
      setCursorPosition(cursorPos)
      
      // Check for @ mention at cursor position
      const textBeforeCursor = value.substring(0, cursorPos)
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/)
      
      if (mentionMatch) {
        setMentionQuery(mentionMatch[1])
        setShowMentionDropdown(true)
      } else {
        setShowMentionDropdown(false)
        setMentionQuery('')
      }
    }
  }

  // Handle submit
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    
    const trimmedText = text.trim()
    if (!trimmedText) {
      return
    }
    
    onSubmit(trimmedText, commentType)
  }

  // Handle key shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow new line with Shift+Enter
        return
      } else if (e.ctrlKey || e.metaKey) {
        // Submit with Ctrl+Enter or Cmd+Enter
        e.preventDefault()
        handleSubmit()
      }
    }
    
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  // Insert mention
  const insertMention = (username: string) => {
    const beforeCursor = text.substring(0, cursorPosition)
    const afterCursor = text.substring(cursorPosition)
    
    // Replace the partial mention with the full mention
    const mentionStart = beforeCursor.lastIndexOf('@')
    const newText = beforeCursor.substring(0, mentionStart) + `@${username} ` + afterCursor
    
    setText(newText)
    setShowMentionDropdown(false)
    
    // Focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  const selectedTypeOption = COMMENT_TYPE_OPTIONS.find(opt => opt.value === commentType)

  return (
    <Card className={cn('border border-slate-200', className)}>
      <CardContent className="p-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Comment Type Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-600">Type:</span>
              <Select value={commentType} onValueChange={(value: CommentType) => setCommentType(value)}>
                <SelectTrigger className="w-40 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        <option.icon className="h-3 w-3" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedTypeOption && (
              <Badge variant="outline" className="text-xs">
                {selectedTypeOption.description}
              </Badge>
            )}
          </div>

          {/* Text Input */}
          <div ref={editorRef} className="relative">
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isSubmitting}
              className="min-h-[80px] text-sm resize-none focus:ring-1"
              rows={3}
            />
            
            {/* Mention Dropdown */}
            {showMentionDropdown && enableMentions && (
              <div className="absolute top-full left-0 z-50 w-64 mt-1 bg-white border rounded-md shadow-lg">
                <div className="p-2">
                  <div className="text-xs text-slate-600 mb-2">
                    Mention users: (Type to search)
                  </div>
                  <div className="space-y-1">
                    {/* Mock users - in real implementation, this would be dynamic */}
                    {['john.smith', 'jane.doe', 'admin'].filter(user => 
                      user.toLowerCase().includes(mentionQuery.toLowerCase())
                    ).map(user => (
                      <button
                        key={user}
                        type="button"
                        onClick={() => insertMention(user)}
                        className="w-full text-left px-2 py-1 text-xs hover:bg-slate-100 rounded flex items-center space-x-2"
                      >
                        <AtSign className="h-3 w-3" />
                        <span>{user}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Editor Help */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center space-x-3">
              {enableMentions && (
                <span>💡 Type @ to mention users</span>
              )}
              <span>⌘ + Enter to submit</span>
            </div>
            <span className="text-slate-400">
              {text.length} characters
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
            
            <Button
              type="submit"
              size="sm"
              disabled={!text.trim() || isSubmitting}
              className="text-xs"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                  {isEditing ? 'Updating...' : 'Posting...'}
                </>
              ) : (
                <>
                  <Send className="h-3 w-3 mr-1" />
                  {isEditing ? 'Update' : 'Post'} Comment
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}