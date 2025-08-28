"use client";

// Story 3.4: Kanban Column Component
// Individual workflow column with drop zone functionality

import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

import { ShiftKanbanCard } from './ShiftKanbanCard';
import type { KanbanColumn as KanbanColumnType } from '@/lib/types/kanban-types';

interface KanbanColumnProps {
  column: KanbanColumnType;
  shifts: any[];
  selectedShifts: Set<string>;
  onShiftSelection: (shiftId: string, selected: boolean) => void;
  isDraggingOver?: boolean;
  className?: string;
}

export function KanbanColumn({
  column,
  shifts,
  selectedShifts,
  onShiftSelection,
  isDraggingOver = false,
  className
}: KanbanColumnProps) {
  // Set up drop zone
  const { isOver, setNodeRef } = useDroppable({
    id: column.id
  });

  // Calculate column statistics
  const columnStats = useMemo(() => {
    const totalShifts = shifts.length;
    const urgentShifts = shifts.filter(shift => 
      shift.shift_urgency_alerts && shift.shift_urgency_alerts.length > 0
    ).length;
    
    const highPriorityShifts = shifts.filter(shift => shift.priority >= 4).length;
    
    // Calculate total hours
    const totalHours = shifts.reduce((sum, shift) => {
      return sum + (shift.estimated_hours || 0);
    }, 0);

    // Calculate total revenue estimate
    const totalRevenue = shifts.reduce((sum, shift) => {
      const rateInfo = shift.rate_information || {};
      const clientRate = rateInfo.clientRate || 0;
      const hours = shift.estimated_hours || 0;
      return sum + (clientRate * hours);
    }, 0);

    return {
      totalShifts,
      urgentShifts,
      highPriorityShifts,
      totalHours,
      totalRevenue
    };
  }, [shifts]);

  // Sort shifts by priority and urgency
  const sortedShifts = useMemo(() => {
    return [...shifts].sort((a, b) => {
      // First sort by urgent alerts
      const aUrgent = a.shift_urgency_alerts && a.shift_urgency_alerts.length > 0;
      const bUrgent = b.shift_urgency_alerts && b.shift_urgency_alerts.length > 0;
      
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      
      // Then by priority
      const aPriority = a.priority || 1;
      const bPriority = b.priority || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      // Finally by shift start time
      const aTime = new Date(a.time_range?.split(',')[0]?.replace('[', '')?.replace('"', '') || 0);
      const bTime = new Date(b.time_range?.split(',')[0]?.replace('[', '')?.replace('"', '') || 0);
      
      return aTime.getTime() - bTime.getTime();
    });
  }, [shifts]);

  // Column styling based on status and state
  const columnClasses = cn(
    'flex flex-col h-full min-w-80 transition-all duration-200',
    column.color,
    {
      'ring-2 ring-primary ring-offset-2': isOver,
      'opacity-75': isDraggingOver && !isOver,
      'scale-[1.02]': isOver
    },
    className
  );

  const headerClasses = cn(
    'pb-3 border-b',
    {
      'bg-primary/5': isOver
    }
  );

  return (
    <Card ref={setNodeRef} className={columnClasses}>
      <CardHeader className={headerClasses}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {column.title}
              <Badge variant="secondary" className="text-xs">
                {columnStats.totalShifts}
              </Badge>
            </CardTitle>
            {column.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {column.description}
              </p>
            )}
          </div>
        </div>

        {/* Column Statistics */}
        {columnStats.totalShifts > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {columnStats.urgentShifts > 0 && (
              <Badge variant="destructive" className="text-xs">
                {columnStats.urgentShifts} urgent
              </Badge>
            )}
            {columnStats.highPriorityShifts > 0 && (
              <Badge variant="outline" className="text-xs">
                {columnStats.highPriorityShifts} high priority
              </Badge>
            )}
            {columnStats.totalHours > 0 && (
              <Badge variant="outline" className="text-xs">
                {columnStats.totalHours.toFixed(1)}h total
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-3">
        <ScrollArea className="h-full">
          <SortableContext items={sortedShifts.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sortedShifts.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <p className="text-sm">No shifts</p>
                    {isOver && (
                      <p className="text-xs mt-1 text-primary">
                        Drop shift here
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                sortedShifts.map((shift) => (
                  <ShiftKanbanCard
                    key={shift.id}
                    shift={shift}
                    isSelected={selectedShifts.has(shift.id)}
                    onSelectionChange={(selected) => onShiftSelection(shift.id, selected)}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </ScrollArea>

        {/* Drop zone indicator */}
        {isOver && (
          <div className="absolute inset-x-3 bottom-3 h-12 border-2 border-dashed border-primary bg-primary/10 rounded-md flex items-center justify-center">
            <p className="text-sm text-primary font-medium">
              Drop shift in {column.title}
            </p>
          </div>
        )}

        {/* Column limits warning */}
        {column.maxItems && columnStats.totalShifts >= column.maxItems && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-800">
              Column limit reached ({column.maxItems} max)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}