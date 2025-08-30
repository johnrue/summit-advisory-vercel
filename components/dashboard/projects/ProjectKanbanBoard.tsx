"use client"

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { ProjectColumn } from './ProjectColumn'
import { ProjectCard } from './ProjectCard'
import { ProjectCardSkeleton } from './ProjectCardSkeleton'
import { useToast } from '@/hooks/use-toast'
import type { InternalProject, ProjectStatus } from '@/lib/types'

interface ProjectKanbanBoardProps {
  projects: InternalProject[]
  onProjectUpdate: (project: InternalProject) => void
  isLoading: boolean
}

const COLUMNS: { id: ProjectStatus; title: string; description: string }[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    description: 'Projects waiting to be started'
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    description: 'Active projects currently being worked on'
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Projects completed and under review'
  },
  {
    id: 'done',
    title: 'Done',
    description: 'Completed projects'
  }
]

export function ProjectKanbanBoard({
  projects,
  onProjectUpdate,
  isLoading
}: ProjectKanbanBoardProps) {
  const [activeProject, setActiveProject] = useState<InternalProject | null>(null)
  const [draggedOverColumn, setDraggedOverColumn] = useState<ProjectStatus | null>(null)
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const project = projects.find(p => p.id === active.id)
    if (project) {
      setActiveProject(project)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (over) {
      // Extract column ID from droppable ID
      const columnId = over.id.toString().replace('column-', '') as ProjectStatus
      if (COLUMNS.find(col => col.id === columnId)) {
        setDraggedOverColumn(columnId)
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveProject(null)
    setDraggedOverColumn(null)

    if (!over) return

    const activeProject = projects.find(p => p.id === active.id)
    if (!activeProject) return

    // Extract column ID from droppable ID
    const newColumnId = over.id.toString().replace('column-', '') as ProjectStatus
    const validColumn = COLUMNS.find(col => col.id === newColumnId)
    
    if (!validColumn || activeProject.status === newColumnId) return

    // Optimistic update
    const updatedProject = {
      ...activeProject,
      status: newColumnId,
      updatedAt: new Date()
    }

    onProjectUpdate(updatedProject)

    try {
      const response = await fetch(`/api/v1/projects/${activeProject.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newColumnId,
          notes: `Status changed from ${activeProject.status} to ${newColumnId}`
        })
      })

      if (!response.ok) {
        // Revert on failure
        onProjectUpdate(activeProject)
        throw new Error('Failed to update project status')
      }

      const result = await response.json()
      onProjectUpdate(result.project)

      toast({
        title: 'Project Updated',
        description: `"${activeProject.title}" moved to ${validColumn.title}`
      })
    } catch (error) {
      console.error('Error updating project status:', error)
      toast({
        title: 'Update Failed',
        description: 'Failed to update project status. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const getProjectsByStatus = (status: ProjectStatus) => {
    return projects.filter(project => project.status === status)
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {COLUMNS.map(column => (
          <div key={column.id} className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {column.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {column.description}
              </p>
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => (
                <ProjectCardSkeleton key={index} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {COLUMNS.map(column => {
          const columnProjects = getProjectsByStatus(column.id)
          
          return (
            <ProjectColumn
              key={column.id}
              id={column.id}
              title={column.title}
              description={column.description}
              count={columnProjects.length}
              isOver={draggedOverColumn === column.id}
            >
              <SortableContext
                items={columnProjects.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {columnProjects.map(project => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onUpdate={onProjectUpdate}
                    />
                  ))}
                </div>
              </SortableContext>
            </ProjectColumn>
          )
        })}
      </div>

      <DragOverlay>
        {activeProject && (
          <div className="rotate-3 scale-105">
            <ProjectCard
              project={activeProject}
              onUpdate={() => {}}
              isDragging
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}