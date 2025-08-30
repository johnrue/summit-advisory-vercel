"use client"

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { ProjectStatus } from '@/lib/types'

interface ProjectColumnProps {
  id: ProjectStatus
  title: string
  description: string
  count: number
  children: React.ReactNode
  isOver?: boolean
}

const COLUMN_COLORS = {
  backlog: 'bg-slate-50 border-slate-200',
  in_progress: 'bg-blue-50 border-blue-200',
  review: 'bg-yellow-50 border-yellow-200',
  done: 'bg-green-50 border-green-200'
} as const

const COLUMN_BADGE_COLORS = {
  backlog: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  in_progress: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  review: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  done: 'bg-green-100 text-green-700 hover:bg-green-200'
} as const

export function ProjectColumn({
  id,
  title,
  description,
  count,
  children,
  isOver
}: ProjectColumnProps) {
  const { setNodeRef } = useDroppable({
    id: `column-${id}`
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[600px] rounded-lg border transition-all duration-200',
        COLUMN_COLORS[id],
        isOver && 'ring-2 ring-primary ring-opacity-50 scale-[1.02]'
      )}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide">
            {title}
          </h3>
          <Badge 
            variant="outline"
            className={cn(
              'text-xs',
              COLUMN_BADGE_COLORS[id]
            )}
          >
            {count}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      </div>

      {/* Column Content */}
      <div className="p-4">
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <div className="w-8 h-8 rounded-full bg-muted-foreground/20" />
            </div>
            <p className="text-sm text-muted-foreground">
              No projects in {title.toLowerCase()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Drag projects here to update their status
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}