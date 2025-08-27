"use client"

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ApplicationKanbanCard } from './ApplicationKanbanCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { KanbanColumnProps, GuardApplication } from '@/lib/types/kanban-workflow'
import { STAGE_CONFIGURATIONS } from '@/lib/types/kanban-workflow'

export function KanbanColumn({
  stage,
  applications,
  onApplicationDrop,
  showCount = true,
  maxHeight = '600px',
  className = ''
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: stage
  })

  const stageConfig = STAGE_CONFIGURATIONS[stage]
  
  const handleCardClick = (application: GuardApplication) => {
    // Handle card click - could open details modal
    console.log('Card clicked:', application)
  }

  return (
    <Card 
      className={cn(
        'flex flex-col border-2 transition-colors duration-200',
        isOver ? 'border-blue-400 bg-blue-50' : stageConfig.color,
        className
      )}
      style={{ maxHeight }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900">
            {stageConfig.title}
          </CardTitle>
          {showCount && (
            <Badge variant="secondary" className="ml-2">
              {applications.length}
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-600 mt-1">
          {stageConfig.description}
        </p>
      </CardHeader>

      <CardContent className="flex-1 p-2">
        <div
          ref={setNodeRef}
          className={cn(
            'min-h-[400px] rounded-md p-2 transition-colors duration-200',
            isOver ? 'bg-blue-100/50 border-2 border-dashed border-blue-300' : 'bg-transparent'
          )}
        >
          <SortableContext 
            items={applications.map(app => app.id)} 
            strategy={verticalListSortingStrategy}
          >
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {applications.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-slate-400">
                    <div className="text-center">
                      <div className="text-sm">No applications</div>
                      <div className="text-xs">Drop applications here</div>
                    </div>
                  </div>
                ) : (
                  applications.map((application) => (
                    <ApplicationKanbanCard
                      key={application.id}
                      application={application}
                      onCardClick={handleCardClick}
                      showAIConfidence={true}
                      showPriority={true}
                      showAssignment={true}
                      isDragging={false}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </SortableContext>
        </div>
      </CardContent>
    </Card>
  )
}