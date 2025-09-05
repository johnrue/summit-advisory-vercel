"use client"

import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { 
  Activity,
  MessageSquare,
  Paperclip,
  Calendar,
  User,
  Settings,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InternalProject, ProjectCollaborationActivity } from '@/lib/types'

interface ProjectActivityProps {
  project: InternalProject
}

const ACTIVITY_ICONS = {
  comment: MessageSquare,
  status_change: CheckCircle,
  assignment: User,
  file_upload: Paperclip,
  due_date_change: Calendar,
  create: Settings,
  update: Settings
} as const

const ACTIVITY_COLORS = {
  comment: 'text-blue-500',
  status_change: 'text-green-500',
  assignment: 'text-purple-500',
  file_upload: 'text-orange-500',
  due_date_change: 'text-yellow-500',
  create: 'text-gray-500',
  update: 'text-gray-500'
} as const

export function ProjectActivity({ project }: ProjectActivityProps) {
  const [activities, setActivities] = useState<ProjectCollaborationActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/v1/projects/${project.id}/activities`)
        if (response.ok) {
          const data = await response.json()
          setActivities(data.activities || [])
        }
      } catch (error) {
      } finally {
        setIsLoading(false)
      }
    }
    
    loadActivities()
  }, [project.id])

  const loadActivities = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/v1/projects/${project.id}/activities`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      }
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No activity yet</p>
        <p className="text-sm text-muted-foreground">
          Project activity will appear here as team members interact with the project
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Recent activity for this project
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = ACTIVITY_ICONS[activity.activityType] || Activity
          const isLast = index === activities.length - 1
          
          return (
            <div key={activity.id} className="relative flex gap-3">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-4 top-8 w-px h-full bg-border" />
              )}
              
              {/* Activity icon */}
              <div className={cn(
                'w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center relative z-10',
                ACTIVITY_COLORS[activity.activityType] && 'bg-background'
              )}>
                <Icon className={cn(
                  'w-4 h-4',
                  ACTIVITY_COLORS[activity.activityType] || 'text-muted-foreground'
                )} />
              </div>

              {/* Activity content */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {activity.authorName?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{activity.authorName || 'Unknown User'}</span>
                </div>
                
                <p className="text-sm text-foreground mt-1">
                  {activity.description}
                </p>
                
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </span>

                {/* Activity metadata */}
                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
                    <pre>{JSON.stringify(activity.metadata, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}