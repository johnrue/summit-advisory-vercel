"use client"

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { 
  User, 
  Clock, 
  FileText, 
  Star, 
  AlertCircle,
  CheckCircle,
  GripVertical
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { ApplicationKanbanCardProps } from '@/lib/types/kanban-workflow'
import { PRIORITY_LEVELS } from '@/lib/types/kanban-workflow'

export function ApplicationKanbanCard({
  application,
  onCardClick,
  showAIConfidence = true,
  showPriority = true,
  showAssignment = true,
  isDragging = false,
  className = ''
}: ApplicationKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging
  } = useSortable({ id: application.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const isBeingDragged = isDragging || isSortableDragging

  // Get AI confidence score
  const aiConfidence = application.confidence_scores?.overall || 0
  const hasAIData = application.ai_parsed_data && Object.keys(application.ai_parsed_data).length > 0

  // Get priority configuration
  const priorityConfig = PRIORITY_LEVELS[application.priority as keyof typeof PRIORITY_LEVELS]

  // Format application reference or fallback
  const displayReference = application.application_reference || 
    `${application.first_name.charAt(0)}${application.last_name.charAt(0)}-${application.id.slice(0, 8)}`

  const handleClick = () => {
    if (!isBeingDragged) {
      onCardClick?.(application)
    }
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md border-l-4',
        isBeingDragged ? 'shadow-lg scale-105 rotate-2 opacity-90 z-50' : 'hover:scale-[1.02]',
        priorityConfig ? `border-l-${priorityConfig.color.replace('text-', '')}` : 'border-l-gray-300',
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        {/* Drag Handle */}
        <div 
          {...listeners}
          className="flex items-center justify-between mb-2 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center space-x-1">
            <GripVertical className="h-3 w-3 text-slate-400" />
            <span className="text-xs font-mono text-slate-600">
              {displayReference}
            </span>
          </div>
          
          {/* Priority Badge */}
          {showPriority && priorityConfig && (
            <Badge 
              variant="secondary" 
              className={cn(
                'text-xs px-1 py-0',
                priorityConfig.bgColor,
                priorityConfig.color
              )}
            >
              P{application.priority}
            </Badge>
          )}
        </div>

        {/* Applicant Info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 truncate">
                {application.first_name} {application.last_name}
              </h4>
              <p className="text-xs text-slate-600 truncate">
                {application.email}
              </p>
              {application.phone && (
                <p className="text-xs text-slate-500 truncate">
                  {application.phone}
                </p>
              )}
            </div>

            {/* AI Confidence Indicator */}
            {showAIConfidence && hasAIData && (
              <div className="flex items-center space-x-1 ml-2">
                {aiConfidence > 0.8 ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : aiConfidence > 0.6 ? (
                  <AlertCircle className="h-3 w-3 text-yellow-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-red-500" />
                )}
                <span className="text-xs text-slate-600">
                  {Math.round(aiConfidence * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Application Details */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(application.stage_changed_at), { addSuffix: true })}
              </span>
            </div>

            {/* Document Count */}
            {application.documents && (
              <div className="flex items-center space-x-1">
                <FileText className="h-3 w-3" />
                <span>{Object.keys(application.documents).length}</span>
              </div>
            )}
          </div>

          {/* Assignment Info */}
          {showAssignment && application.assigned_to && (
            <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-xs bg-slate-200">
                  {/* This would normally come from user data */}
                  M
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-slate-600">
                Assigned to Manager
              </span>
            </div>
          )}

          {/* Quick Stats */}
          {application.application_data && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <div className="flex items-center space-x-3 text-xs text-slate-500">
                {application.application_data.experience_years && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3" />
                    <span>{application.application_data.experience_years}y exp</span>
                  </div>
                )}
                
                {application.application_data.certifications && (
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Certified</span>
                  </div>
                )}
              </div>

              {/* Source Badge */}
              <Badge variant="outline" className="text-xs px-1 py-0">
                {application.lead_source}
              </Badge>
            </div>
          )}

          {/* Workflow Notes Preview */}
          {application.workflow_notes && (
            <div className="pt-1 border-t border-slate-100">
              <p className="text-xs text-slate-600 truncate">
                💬 {application.workflow_notes}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}