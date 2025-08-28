"use client"

import React, { useState, useEffect } from 'react'
import { Plus, Filter, Search, Calendar, List, Grid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ShiftCreateForm } from '@/components/dashboard/shifts/ShiftCreateForm'
import { ShiftTemplateManager } from '@/components/dashboard/shifts/ShiftTemplateManager'
import { ShiftCloneDialog } from '@/components/dashboard/shifts/ShiftCloneDialog'
import { ShiftEditDialog } from '@/components/dashboard/shifts/ShiftEditDialog'
import { ShiftCancellationDialog } from '@/components/dashboard/shifts/ShiftCancellationDialog'
import { ShiftManagementService } from '@/lib/services/shift-service'
import type { Shift, ShiftFilterOptions, PaginationOptions, ShiftStatus } from '@/lib/types/shift-types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const SHIFT_STATUSES: { value: ShiftStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'open', label: 'Open', color: 'blue' },
  { value: 'assigned', label: 'Assigned', color: 'yellow' },
  { value: 'confirmed', label: 'Confirmed', color: 'green' },
  { value: 'in_progress', label: 'In Progress', color: 'purple' },
  { value: 'completed', label: 'Completed', color: 'emerald' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
  { value: 'no_show', label: 'No Show', color: 'orange' }
]

const PRIORITY_LEVELS = [
  { value: 1, label: '1 - Urgent', color: 'destructive' },
  { value: 2, label: '2 - High', color: 'orange' },
  { value: 3, label: '3 - Normal', color: 'blue' },
  { value: 4, label: '4 - Low', color: 'gray' },
  { value: 5, label: '5 - Routine', color: 'green' }
]

interface ShiftCardProps {
  shift: Shift
  onEdit: (shift: Shift) => void
  onView: (shift: Shift) => void
  onClone: (shift: Shift) => void
  onCancel: (shift: Shift) => void
}

function ShiftCard({ shift, onEdit, onView, onClone, onCancel }: ShiftCardProps) {
  const status = SHIFT_STATUSES.find(s => s.value === shift.status)
  const priority = PRIORITY_LEVELS.find(p => p.value === shift.priority)
  
  const startTime = new Date(shift.timeRange.startTime)
  const endTime = new Date(shift.timeRange.endTime)
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))

  const getStatusVariant = (color: string) => {
    switch (color) {
      case 'green': case 'emerald': return 'secondary'
      case 'red': case 'destructive': return 'destructive'
      case 'yellow': case 'orange': return 'secondary'
      case 'blue': case 'purple': return 'default'
      default: return 'outline'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onView(shift)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{shift.title}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {shift.locationData.siteName}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge variant={getStatusVariant(status?.color || 'gray')}>
              {status?.label || shift.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Priority {shift.priority}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Date & Time</span>
            <span className="font-medium">
              {startTime.toLocaleDateString()} • {duration}h
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Client</span>
            <span className="font-medium">{shift.clientInfo.clientName}</span>
          </div>
          
          {shift.assignedGuardId && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Assigned Guard</span>
              <span className="font-medium">Guard #{shift.assignedGuardId.slice(-6)}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Rate</span>
            <span className="font-medium">${shift.rateInformation.baseRate}/hr</span>
          </div>
          
          {shift.description && (
            <div className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {shift.description}
            </div>
          )}
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={(e) => {
              e.stopPropagation()
              onEdit(shift)
            }}
            disabled={shift.status === 'cancelled'}
          >
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onClone(shift)
            }}
          >
            Clone
          </Button>
          {shift.status !== 'cancelled' && shift.status !== 'completed' && (
            <Button 
              size="sm" 
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation()
                onCancel(shift)
              }}
            >
              Cancel
            </Button>
          )}
          <Button 
            size="sm" 
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onView(shift)
            }}
          >
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [showCloneDialog, setShowCloneDialog] = useState(false)
  const [shiftToClone, setShiftToClone] = useState<Shift | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [shiftToEdit, setShiftToEdit] = useState<Shift | null>(null)
  const [showCancellationDialog, setShowCancellationDialog] = useState(false)
  const [shiftToCancel, setShiftToCancel] = useState<Shift | null>(null)
  const [viewMode, setViewMode] = useState<'shifts' | 'templates'>('shifts')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ShiftStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<number | 'all'>('all')

  const service = new ShiftManagementService()

  // Load shifts
  useEffect(() => {
    loadShifts()
  }, [statusFilter, priorityFilter])

  const loadShifts = async () => {
    try {
      setIsLoading(true)
      
      const filters: ShiftFilterOptions = {}
      if (statusFilter !== 'all') {
        filters.status = [statusFilter]
      }
      if (priorityFilter !== 'all') {
        filters.priority = [priorityFilter]
      }

      const pagination: PaginationOptions = {
        page: 1,
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'desc'
      }

      const result = await service.getShifts(filters, pagination)
      if (result.success && result.data) {
        setShifts(result.data.data)
      } else {
        toast.error(result.error?.message || 'Failed to load shifts')
      }
    } catch (error) {
      console.error('Error loading shifts:', error)
      toast.error('Failed to load shifts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateShift = (shift: Shift) => {
    setShifts(prev => [shift, ...prev])
    setShowCreateForm(false)
    toast.success('Shift created successfully!')
  }

  const handleEditShift = (shift: Shift) => {
    setShiftToEdit(shift)
    setShowEditDialog(true)
  }

  const handleShiftUpdated = (updatedShift: Shift) => {
    setShifts(prev => prev.map(shift => 
      shift.id === updatedShift.id ? updatedShift : shift
    ))
  }

  const handleViewShift = (shift: Shift) => {
    setSelectedShift(shift)
    // TODO: Implement shift detail view
    toast.info('Shift detail view coming soon')
  }

  const handleCloneShift = (shift: Shift) => {
    setShiftToClone(shift)
    setShowCloneDialog(true)
  }

  const handleShiftCloned = (clonedShift: Shift) => {
    setShifts(prev => [clonedShift, ...prev])
    toast.success('Shift cloned successfully!')
  }

  const handleCancelShift = (shift: Shift) => {
    setShiftToCancel(shift)
    setShowCancellationDialog(true)
  }

  const handleShiftCancelled = (cancelledShift: Shift) => {
    setShifts(prev => prev.map(shift => 
      shift.id === cancelledShift.id ? cancelledShift : shift
    ))
  }

  // Filter shifts based on search query
  const filteredShifts = shifts.filter(shift => 
    searchQuery === '' || 
    shift.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shift.locationData.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shift.clientInfo.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Show create form
  if (showCreateForm) {
    return (
      <ShiftCreateForm
        onSubmit={handleCreateShift}
        onCancel={() => {
          setShowCreateForm(false)
          setSelectedShift(null)
        }}
        initialData={selectedShift || undefined}
        isLoading={isLoading}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shift Management</h1>
          <p className="text-muted-foreground">Create, manage, and assign security shifts</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Shift
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Shifts</CardTitle>
            <div className="text-2xl font-bold">{shifts.length}</div>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Shifts</CardTitle>
            <div className="text-2xl font-bold text-blue-600">
              {shifts.filter(s => s.status === 'open').length}
            </div>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assigned</CardTitle>
            <div className="text-2xl font-bold text-yellow-600">
              {shifts.filter(s => ['assigned', 'confirmed'].includes(s.status)).length}
            </div>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            <div className="text-2xl font-bold text-green-600">
              {shifts.filter(s => s.status === 'in_progress').length}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search shifts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value: ShiftStatus | 'all') => setStatusFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {SHIFT_STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={priorityFilter === 'all' ? 'all' : priorityFilter.toString()} onValueChange={(value) => setPriorityFilter(value === 'all' ? 'all' : parseInt(value))}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {PRIORITY_LEVELS.map(priority => (
                <SelectItem key={priority.value} value={priority.value.toString()}>
                  {priority.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'shifts' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('shifts')}
          >
            <List className="w-4 h-4 mr-2" />
            Shifts
          </Button>
          <Button
            variant={viewMode === 'templates' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('templates')}
          >
            <Grid className="w-4 h-4 mr-2" />
            Templates
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs value={viewMode} onValueChange={(value: string) => setViewMode(value as 'shifts' | 'templates')}>
        <TabsContent value="shifts">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredShifts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No shifts found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' 
                    ? 'Try adjusting your filters or search criteria.'
                    : 'Get started by creating your first shift assignment.'
                  }
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Shift
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredShifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  onEdit={handleEditShift}
                  onView={handleViewShift}
                  onClone={handleCloneShift}
                  onCancel={handleCancelShift}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="templates">
          <ShiftTemplateManager />
        </TabsContent>
      </Tabs>

      {/* Clone Shift Dialog */}
      <ShiftCloneDialog
        open={showCloneDialog}
        onOpenChange={setShowCloneDialog}
        sourceShift={shiftToClone}
        onShiftCloned={handleShiftCloned}
      />

      {/* Edit Shift Dialog */}
      <ShiftEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        shift={shiftToEdit}
        onShiftUpdated={handleShiftUpdated}
      />

      {/* Cancel Shift Dialog */}
      <ShiftCancellationDialog
        open={showCancellationDialog}
        onOpenChange={setShowCancellationDialog}
        shift={shiftToCancel}
        onShiftCancelled={handleShiftCancelled}
      />
    </div>
  )
}