"use client";

// Story 3.4: Main Shift Kanban Board Component
// Drag-and-drop interface for shift workflow management

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, AlertTriangle, Settings } from 'lucide-react';
import { toast } from 'sonner';

import { KanbanColumn } from './KanbanColumn';
import { ShiftKanbanCard } from './ShiftKanbanCard';
import { KanbanFilterPanel } from './KanbanFilterPanel';
import { BulkActionPanel } from './BulkActionPanel';
import { UrgentShiftPanel } from './UrgentShiftPanel';

import type { 
  KanbanBoardData,
  KanbanStatus,
  KanbanFilters,
  KanbanColumn as KanbanColumnType,
  KanbanActivity
} from '@/lib/types/kanban-types';

interface ShiftKanbanBoardProps {
  managerId: string;
  className?: string;
}

export function ShiftKanbanBoard({ managerId, className }: ShiftKanbanBoardProps) {
  // State management
  const [boardData, setBoardData] = useState<KanbanBoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<KanbanFilters>({});
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('board');
  
  // Drag and drop state
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance to activate
      },
    })
  );

  // Load board data
  const loadBoardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      
      if (activeFilters.dateRange) {
        params.append('start_date', activeFilters.dateRange.start.toISOString());
        params.append('end_date', activeFilters.dateRange.end.toISOString());
      }
      
      if (activeFilters.clients?.length) {
        params.append('clients', activeFilters.clients.join(','));
      }
      
      if (activeFilters.sites?.length) {
        params.append('sites', activeFilters.sites.join(','));
      }
      
      if (activeFilters.guards?.length) {
        params.append('guards', activeFilters.guards.join(','));
      }
      
      if (activeFilters.statuses?.length) {
        params.append('statuses', activeFilters.statuses.join(','));
      }
      
      if (activeFilters.priorities?.length) {
        params.append('priorities', activeFilters.priorities.join(','));
      }
      
      if (activeFilters.assignmentStatus && activeFilters.assignmentStatus !== 'all') {
        params.append('assignment_status', activeFilters.assignmentStatus);
      }
      
      if (activeFilters.urgentOnly) {
        params.append('urgent_only', 'true');
      }

      const response = await fetch(`/api/v1/shifts/kanban?${params}`, {
        headers: {
          'x-manager-id': managerId,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load board data: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setBoardData(result.data);
      } else {
        throw new Error(result.error?.message || 'Failed to load board data');
      }
    } catch (err) {
      console.error('Error loading board data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      toast.error('Failed to load Kanban board data');
    } finally {
      setLoading(false);
    }
  }, [managerId, activeFilters]);

  // Initial load and refresh
  useEffect(() => {
    loadBoardData();
  }, [loadBoardData]);

  // Group shifts by status
  const shiftsByStatus = useMemo(() => {
    if (!boardData?.shifts) return {};
    
    return boardData.shifts.reduce((acc, shift) => {
      const status = shift.status as KanbanStatus;
      if (!acc[status]) acc[status] = [];
      acc[status].push(shift);
      return acc;
    }, {} as Record<KanbanStatus, any[]>);
  }, [boardData]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveShiftId(active.id as string);
    setIsDragging(true);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveShiftId(null);
    setIsDragging(false);
    
    if (!over || !active) return;
    
    const shiftId = active.id as string;
    const newStatus = over.id as KanbanStatus;
    
    // Find current shift to get old status
    const currentShift = boardData?.shifts.find(s => s.id === shiftId);
    if (!currentShift || currentShift.status === newStatus) return;

    try {
      // Optimistic update
      setBoardData(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          shifts: prev.shifts.map(shift => 
            shift.id === shiftId 
              ? { ...shift, status: newStatus }
              : shift
          )
        };
      });

      // API call to move shift
      const response = await fetch('/api/v1/shifts/kanban', {
        method: 'POST',
        headers: {
          'x-manager-id': managerId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shiftId,
          newStatus,
          reason: `Moved from ${currentShift.status} to ${newStatus} via Kanban board`
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        // Revert optimistic update on error
        setBoardData(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            shifts: prev.shifts.map(shift => 
              shift.id === shiftId 
                ? { ...shift, status: currentShift.status }
                : shift
            )
          };
        });
        
        throw new Error(result.error?.message || 'Failed to move shift');
      }

      toast.success(`Shift moved to ${newStatus.replace('_', ' ')}`);
      
      // Refresh board data to ensure consistency
      await loadBoardData(false);
      
    } catch (err) {
      console.error('Error moving shift:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to move shift');
      
      // Reload fresh data on error
      await loadBoardData(false);
    }
  }, [boardData, managerId, loadBoardData]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: KanbanFilters) => {
    setActiveFilters(newFilters);
    // loadBoardData will be called via useEffect dependency
  }, []);

  // Handle shift selection
  const handleShiftSelection = useCallback((shiftId: string, selected: boolean) => {
    setSelectedShifts(prev => {
      const newSelection = new Set(prev);
      if (selected) {
        newSelection.add(shiftId);
      } else {
        newSelection.delete(shiftId);
      }
      return newSelection;
    });
  }, []);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedShifts(new Set());
  }, []);

  // Handle bulk action completion
  const handleBulkActionComplete = useCallback(async () => {
    clearSelection();
    await loadBoardData(false);
    toast.success('Bulk action completed');
  }, [clearSelection, loadBoardData]);

  // Get active drag overlay shift
  const activeDragShift = useMemo(() => {
    if (!activeShiftId || !boardData?.shifts) return null;
    return boardData.shifts.find(s => s.id === activeShiftId);
  }, [activeShiftId, boardData]);

  // Render loading state
  if (loading && !boardData) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Loading Kanban board...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadBoardData()} 
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!boardData) return null;

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shift Management</h1>
            <p className="text-muted-foreground">
              Manage shifts through visual workflow stages
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadBoardData()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="board">Kanban Board</TabsTrigger>
          <TabsTrigger value="alerts">
            Urgent Alerts
            {boardData.metrics.urgentAlertsCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {boardData.metrics.urgentAlertsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="space-y-6">
          {/* Filter Panel */}
          <KanbanFilterPanel
            filters={activeFilters}
            onFiltersChange={handleFiltersChange}
            availableClients={[]} // Would be populated from boardData
            availableGuards={[]}  // Would be populated from boardData
            availableSites={[]}   // Would be populated from boardData
          />

          {/* Metrics Summary */}
          {boardData.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{boardData.metrics.totalShifts}</div>
                  <p className="text-xs text-muted-foreground">Total Shifts</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{boardData.metrics.completionRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{boardData.metrics.urgentAlertsCount}</div>
                  <p className="text-xs text-muted-foreground">Urgent Alerts</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{boardData.metrics.avgTimeToAssignment.toFixed(1)}h</div>
                  <p className="text-xs text-muted-foreground">Avg Assignment Time</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Kanban Board */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-6 overflow-x-auto pb-4">
              <SortableContext items={boardData.columns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
                {boardData.columns.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    shifts={shiftsByStatus[column.id] || []}
                    selectedShifts={selectedShifts}
                    onShiftSelection={handleShiftSelection}
                    isDraggingOver={isDragging}
                  />
                ))}
              </SortableContext>
            </div>

            <DragOverlay>
              {activeDragShift && (
                <ShiftKanbanCard
                  shift={activeDragShift}
                  isSelected={false}
                  onSelectionChange={() => {}}
                  isDragOverlay={true}
                />
              )}
            </DragOverlay>
          </DndContext>

          {/* Selected Shifts Summary */}
          {selectedShifts.size > 0 && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Selected Shifts ({selectedShifts.size})
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear Selection
                  </Button>
                </CardTitle>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts">
          <UrgentShiftPanel 
            managerId={managerId}
            onAlertResolved={() => loadBoardData(false)}
          />
        </TabsContent>

        <TabsContent value="bulk">
          <BulkActionPanel
            selectedShifts={Array.from(selectedShifts)}
            managerId={managerId}
            onActionComplete={handleBulkActionComplete}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Analytics dashboard coming soon...
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}