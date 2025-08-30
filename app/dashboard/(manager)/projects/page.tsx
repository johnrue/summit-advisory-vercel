"use client"

import { useState, useEffect } from 'react'
import { ProjectKanbanBoard } from '@/components/dashboard/projects/ProjectKanbanBoard'
import { ProjectFilters } from '@/components/dashboard/projects/ProjectFilters'
import { CreateProjectDialog } from '@/components/dashboard/projects/CreateProjectDialog'
import { ProjectStats } from '@/components/dashboard/projects/ProjectStats'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { InternalProject, ProjectFilters as ProjectFiltersType } from '@/lib/types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<InternalProject[]>([])
  const [filters, setFilters] = useState<ProjectFiltersType>({})
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [filters])

  const loadProjects = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/v1/projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to load projects')
      }

      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProjectUpdate = (updatedProject: InternalProject) => {
    setProjects(prev => 
      prev.map(project => 
        project.id === updatedProject.id ? updatedProject : project
      )
    )
  }

  const handleProjectCreate = (newProject: InternalProject) => {
    setProjects(prev => [...prev, newProject])
    setShowCreateDialog(false)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Internal Projects</h1>
          <p className="text-muted-foreground">
            Manage and track internal company projects and initiatives
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Stats Overview */}
      <ProjectStats projects={projects} />

      {/* Filters */}
      <ProjectFilters 
        filters={filters}
        onFiltersChange={setFilters}
        projects={projects}
      />

      {/* Kanban Board */}
      <ProjectKanbanBoard 
        projects={projects}
        onProjectUpdate={handleProjectUpdate}
        isLoading={isLoading}
      />

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onProjectCreate={handleProjectCreate}
      />
    </div>
  )
}