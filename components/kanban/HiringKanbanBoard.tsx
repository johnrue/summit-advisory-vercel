"use client"

import { useEffect, useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { ApplicationKanbanCard } from './ApplicationKanbanCard'
import { useDragAndDrop } from '@/hooks/use-drag-and-drop'
import { KanbanWorkflowService } from '@/lib/services/kanban-workflow-service'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import type { 
  HiringKanbanBoardProps,
  GuardApplication, 
  PipelineStage,
  KanbanFilters
} from '@/lib/types/kanban-workflow'
import { STAGE_CONFIGURATIONS } from '@/lib/types/kanban-workflow'

export function HiringKanbanBoard({
  initialFilters,
  onApplicationSelect,
  showMetrics = true,
  enableRealTimeUpdates = true,
  className = ''
}: HiringKanbanBoardProps) {
  const [applications, setApplications] = useState<Record<PipelineStage, GuardApplication[]>>({
    lead_captured: [],
    application_received: [],
    under_review: [],
    background_check: [],
    interview_scheduled: [],
    interview_completed: [],
    approved: [],
    rejected: [],
    profile_created: []
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<KanbanFilters>(initialFilters || {})
  const [metrics, setMetrics] = useState<any>(null)

  // Setup drag and drop
  const handleStageChange = useCallback(async (applicationId: string, newStage: PipelineStage) => {
    const result = await KanbanWorkflowService.moveApplicationToStage({
      applicationId,
      newStage,
      userId: 'current-user-id' // TODO: Get from auth context
    })

    if (!result.success) {
      throw new Error(result.error || 'Failed to move application')
    }

    // Optimistic update
    const updatedApp = result.data?.application
    if (updatedApp) {
      setApplications(prev => {
        const newApps = { ...prev }
        
        // Remove from old stage
        Object.keys(newApps).forEach(stage => {
          newApps[stage as PipelineStage] = newApps[stage as PipelineStage].filter(
            app => app.id !== applicationId
          )
        })
        
        // Add to new stage
        newApps[newStage].push(updatedApp)
        
        return newApps
      })
    }
  }, [])

  const dragAndDrop = useDragAndDrop({
    onStageChange: handleStageChange,
    optimisticUpdates: true,
    conflictResolution: 'last-write-wins'
  })

  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Load applications
  const loadApplications = useCallback(async () => {
    try {
      setIsLoading(true)
      const appsData = await KanbanWorkflowService.getApplicationsByStage(filters)
      setApplications(appsData)
      
      // Load metrics if requested
      if (showMetrics) {
        const metricsData = await KanbanWorkflowService.getWorkflowMetrics(filters.dateRange)
        if (metricsData.success) {
          setMetrics(metricsData.data)
        }
      }
    } catch (error) {
      console.error('Error loading applications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filters, showMetrics])

  // Initial load
  useEffect(() => {
    loadApplications()
  }, [loadApplications])

  // Handle card click
  const handleCardClick = useCallback((application: GuardApplication) => {
    onApplicationSelect?.(application)
  }, [onApplicationSelect])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading Kanban board...</span>
      </div>
    )
  }

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      {/* Error Display */}
      {dragAndDrop.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {dragAndDrop.error}
            <button 
              onClick={dragAndDrop.clearError}
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Processing Indicator */}
      {dragAndDrop.isProcessing && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Moving application...
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Dashboard */}
      {showMetrics && metrics && (
        <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{metrics.totalApplications}</div>
            <div className="text-sm text-slate-600">Total Applications</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{metrics.conversionRate}%</div>
            <div className="text-sm text-slate-600">Approval Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{metrics.averageProcessingTime}</div>
            <div className="text-sm text-slate-600">Avg Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">
              {applications.under_review.length + applications.background_check.length}
            </div>
            <div className="text-sm text-slate-600">In Progress</div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }) => {
          const app = Object.values(applications)
            .flat()
            .find(app => app.id === active.id)
          if (app) {
            dragAndDrop.handleDragStart(app)
          }
        }}
        onDragEnd={dragAndDrop.handleDragEnd}
        onDragCancel={dragAndDrop.handleDragCancel}
      >
        <div className="flex space-x-4 overflow-x-auto pb-4 min-h-[600px]">
          {Object.entries(STAGE_CONFIGURATIONS).map(([stage, config]) => (
            <KanbanColumn
              key={stage}
              stage={stage as PipelineStage}
              applications={applications[stage as PipelineStage]}
              onApplicationDrop={handleStageChange}
              showCount={true}
              className="flex-shrink-0 w-80"
            />
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {dragAndDrop.draggedItem ? (
            <ApplicationKanbanCard
              application={dragAndDrop.draggedItem}
              onCardClick={handleCardClick}
              showAIConfidence={true}
              showPriority={true}
              showAssignment={true}
              isDragging={true}
              className="rotate-3 opacity-90"
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}