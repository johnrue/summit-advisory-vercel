"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Search,
  Filter,
  X,
  Calendar as CalendarIcon,
  RotateCcw
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ProjectFilters as ProjectFiltersType, InternalProject, ProjectStatus, ProjectPriority } from '@/lib/types'

interface ProjectFiltersProps {
  filters: ProjectFiltersType
  onFiltersChange: (filters: ProjectFiltersType) => void
  projects: InternalProject[]
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' }
]

const PRIORITY_OPTIONS: { value: ProjectPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
]

export function ProjectFilters({ filters, onFiltersChange, projects }: ProjectFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  // Get unique categories and owners from projects
  const categories = [...new Set(projects.map(p => ({ id: p.category.id, name: p.category.name })))]
  const owners = [...new Set(projects.map(p => p.ownerId))]

  const activeFilterCount = Object.values(filters).filter(value => {
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0
    return value !== undefined && value !== ''
  }).length

  const updateFilter = (key: keyof ProjectFiltersType, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleArrayFilter = (key: keyof ProjectFiltersType, value: string) => {
    const currentArray = filters[key] as string[] || []
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value]
    
    updateFilter(key, newArray.length > 0 ? newArray : undefined)
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const removeFilter = (key: keyof ProjectFiltersType) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    onFiltersChange(newFilters)
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search projects..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value || undefined)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.status && filters.status.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status.join(', ')}
              <button
                onClick={() => removeFilter('status')}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.priority && filters.priority.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Priority: {filters.priority.join(', ')}
              <button
                onClick={() => removeFilter('priority')}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.category && filters.category.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Category: {filters.category.map(id => 
                categories.find(c => c.id === id)?.name || id
              ).join(', ')}
              <button
                onClick={() => removeFilter('category')}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.dateRange && (
            <Badge variant="secondary" className="gap-1">
              Date: {filters.dateRange.start} - {filters.dateRange.end}
              <button
                onClick={() => removeFilter('dateRange')}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${option.value}`}
                        checked={filters.status?.includes(option.value) || false}
                        onCheckedChange={() => toggleArrayFilter('status', option.value)}
                      />
                      <label
                        htmlFor={`status-${option.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <div className="space-y-2">
                  {PRIORITY_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`priority-${option.value}`}
                        checked={filters.priority?.includes(option.value) || false}
                        onCheckedChange={() => toggleArrayFilter('priority', option.value)}
                      />
                      <label
                        htmlFor={`priority-${option.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={filters.category?.includes(category.id) || false}
                        onCheckedChange={() => toggleArrayFilter('category', category.id)}
                      />
                      <label
                        htmlFor={`category-${category.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Filters */}
              <div className="space-y-3">
                {/* Owner Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Owner</label>
                  <Select
                    value={filters.ownerId || ''}
                    onValueChange={(value) => updateFilter('ownerId', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any owner</SelectItem>
                      {owners.map((ownerId) => (
                        <SelectItem key={ownerId} value={ownerId}>
                          Owner {ownerId.slice(-4)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Recurring Projects */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recurring"
                    checked={filters.isRecurring === true}
                    onCheckedChange={(checked) => 
                      updateFilter('isRecurring', checked ? true : undefined)
                    }
                  />
                  <label htmlFor="recurring" className="text-sm font-normal cursor-pointer">
                    Recurring projects only
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}