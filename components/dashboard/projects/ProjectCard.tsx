"use client"

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Calendar,
  Clock,
  DollarSign,
  MessageSquare,
  Paperclip,
  MoreVertical,
  User,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectDetailDialog } from './ProjectDetailDialog'
import type { InternalProject } from '@/lib/types'

interface ProjectCardProps {
  project: InternalProject
  onUpdate: (project: InternalProject) => void
  isDragging?: boolean
}

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  medium: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  high: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
  critical: 'bg-red-100 text-red-700 hover:bg-red-200'
} as const

const PRIORITY_DOTS = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
} as const

export function ProjectCard({ project, onUpdate, isDragging }: ProjectCardProps) {
  const [showDetail, setShowDetail] = useState(false)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: project.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isOverdue = project.dueDate && new Date(project.dueDate) < new Date()
  const commentCount = project.comments?.length || 0
  const attachmentCount = project.attachments?.length || 0

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open detail if clicking on interactive elements
    if ((e.target as Element).closest('button, [role="button"]')) {
      return
    }
    setShowDetail(true)
  }

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-md',
          'border border-border/50 bg-background',
          (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-3',
          isOverdue && 'border-red-200 bg-red-50'
        )}
        onClick={handleCardClick}
        {...attributes}
        {...listeners}
      >
        <CardHeader className="pb-2">
          {/* Priority and Actions */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  PRIORITY_DOTS[project.priority]
                )}
              />
              <Badge 
                variant="outline" 
                className={cn('text-xs', PRIORITY_COLORS[project.priority])}
              >
                {project.priority}
              </Badge>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  setShowDetail(true)
                }}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>Edit Project</DropdownMenuItem>
                <DropdownMenuItem>Clone Project</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  Archive Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title */}
          <h4 className="font-semibold text-sm leading-tight line-clamp-2">
            {project.title}
          </h4>

          {/* Category */}
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: project.category.color }}
            />
            <span className="text-xs text-muted-foreground truncate">
              {project.category.name}
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Description */}
          <p className="text-xs text-muted-foreground line-clamp-2">
            {project.description}
          </p>

          {/* Due Date */}
          {project.dueDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className={cn(
                'text-xs',
                isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
              )}>
                Due {formatDistanceToNow(new Date(project.dueDate), { addSuffix: true })}
              </span>
            </div>
          )}

          {/* Budget */}
          {project.budget && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                ${project.budget.toLocaleString()}
                {project.actualCost && (
                  <span className="text-green-600 ml-1">
                    (${project.actualCost.toLocaleString()} spent)
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Hours */}
          {project.estimatedHours && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {project.estimatedHours}h estimated
                {project.actualHours && (
                  <span className="text-blue-600 ml-1">
                    ({project.actualHours}h actual)
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Assigned Members */}
          {project.assignedMembers && project.assignedMembers.length > 0 && (
            <div className="flex items-center gap-1.5">
              {project.assignedMembers.length === 1 ? (
                <User className="h-3 w-3 text-muted-foreground" />
              ) : (
                <Users className="h-3 w-3 text-muted-foreground" />
              )}
              <div className="flex -space-x-1">
                {project.assignedMembers.slice(0, 3).map((memberId, index) => (
                  <Avatar key={memberId} className="h-5 w-5 border border-background">
                    <AvatarFallback className="text-[8px] bg-primary/10">
                      {String.fromCharCode(65 + index)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {project.assignedMembers.length > 3 && (
                  <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center">
                    <span className="text-[8px] text-muted-foreground">
                      +{project.assignedMembers.length - 3}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer - Comments and Attachments */}
          {(commentCount > 0 || attachmentCount > 0) && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-3">
                {commentCount > 0 && (
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{commentCount}</span>
                  </div>
                )}
                {attachmentCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{attachmentCount}</span>
                  </div>
                )}
              </div>
              
              {/* Created Date */}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <ProjectDetailDialog
        project={project}
        open={showDetail}
        onOpenChange={setShowDetail}
        onUpdate={onUpdate}
      />
    </>
  )
}