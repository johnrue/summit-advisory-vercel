import { useState, useCallback } from 'react'
import { DragEndEvent } from '@dnd-kit/core'
import type { 
  GuardApplication, 
  PipelineStage, 
  UseDragAndDropOptions 
} from '@/lib/types/kanban-workflow'

interface DragAndDropState {
  isDragging: boolean
  draggedItem: GuardApplication | null
  isProcessing: boolean
  error: string | null
}

/**
 * Custom hook for managing drag-and-drop state and operations
 */
export function useDragAndDrop(options: UseDragAndDropOptions) {
  const [state, setState] = useState<DragAndDropState>({
    isDragging: false,
    draggedItem: null,
    isProcessing: false,
    error: null
  })

  // Handle drag start
  const handleDragStart = useCallback((application: GuardApplication) => {
    setState(prev => ({
      ...prev,
      isDragging: true,
      draggedItem: application,
      error: null
    }))
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    setState(prev => ({
      ...prev,
      isDragging: false,
      draggedItem: null
    }))

    if (!over || !active) {
      return
    }

    const applicationId = active.id as string
    const newStage = over.id as PipelineStage

    // If dropped on the same column, do nothing
    if (state.draggedItem?.pipeline_stage === newStage) {
      return
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }))

    try {
      await options.onStageChange(applicationId, newStage)
      setState(prev => ({ ...prev, isProcessing: false }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to move application'
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: errorMessage 
      }))

      // Handle conflict resolution if specified
      if (options.conflictResolution === 'prompt') {
        // This would show a modal or prompt to the user
        console.warn('Drag and drop conflict detected:', errorMessage)
      }
    }
  }, [state.draggedItem, options])

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDragging: false,
      draggedItem: null,
      error: null
    }))
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    clearError
  }
}