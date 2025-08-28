"use client";

// Story 3.4: Shift Kanban Card Component
// Individual shift card with drag functionality and information display

import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Clock, 
  MapPin, 
  User, 
  AlertTriangle, 
  Phone,
  Calendar,
  DollarSign,
  Shield,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface ShiftKanbanCardProps {
  shift: any; // Full shift object from API
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  isDragOverlay?: boolean;
  className?: string;
}

export function ShiftKanbanCard({
  shift,
  isSelected,
  onSelectionChange,
  isDragOverlay = false,
  className
}: ShiftKanbanCardProps) {
  // Set up drag functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: shift.id,
    disabled: isDragOverlay
  });

  // Calculate derived properties
  const shiftInfo = useMemo(() => {
    // Parse time range
    const timeRange = shift.time_range || '';
    let startTime: Date | null = null;
    let endTime: Date | null = null;
    
    if (timeRange) {
      try {
        const [start, end] = timeRange.split(',');
        startTime = new Date(start.replace('[', '').replace('"', ''));
        endTime = new Date(end.replace(']', '').replace('"', ''));
      } catch (error) {
        console.warn('Failed to parse time range:', timeRange);
      }
    }

    // Extract client and location info
    const clientInfo = shift.client_info || {};
    const locationData = shift.location_data || {};
    const clientName = clientInfo.name || 'Unknown Client';
    const siteName = locationData.siteName || locationData.address || 'Unknown Site';

    // Guard information
    const guardAssignment = shift.shift_assignments?.[0];
    const guardProfile = guardAssignment?.guard_profiles;
    const guardName = guardProfile 
      ? `${guardProfile.first_name} ${guardProfile.last_name}`
      : shift.assigned_guard_id 
        ? 'Assigned Guard'
        : null;

    // Urgency information
    const urgentAlerts = shift.shift_urgency_alerts || [];
    const hasUrgentAlerts = urgentAlerts.length > 0;
    const highestPriorityAlert = urgentAlerts.reduce((highest: any, alert: any) => {
      const priorities = { low: 1, medium: 2, high: 3, critical: 4 };
      const currentPriority = priorities[alert.alert_priority as keyof typeof priorities] || 0;
      const highestPriority = priorities[highest?.alert_priority as keyof typeof priorities] || 0;
      return currentPriority > highestPriority ? alert : highest;
    }, null);

    // Financial information
    const rateInfo = shift.rate_information || {};
    const clientRate = rateInfo.clientRate || 0;
    const estimatedRevenue = clientRate * (shift.estimated_hours || 0);

    // Required certifications
    const requiredCerts = shift.required_certifications || [];
    const hasCertRequirements = Array.isArray(requiredCerts) && requiredCerts.length > 0;

    return {
      startTime,
      endTime,
      clientName,
      siteName,
      guardName,
      hasUrgentAlerts,
      highestPriorityAlert,
      estimatedRevenue,
      hasCertRequirements,
      requiredCerts: hasCertRequirements ? requiredCerts : [],
      priority: shift.priority || 1,
      status: shift.status
    };
  }, [shift]);

  // Get priority styling
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5: return 'bg-red-500';
      case 4: return 'bg-orange-500';
      case 3: return 'bg-yellow-500';
      case 2: return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'unassigned': return 'destructive';
      case 'assigned': return 'secondary';
      case 'confirmed': return 'default';
      case 'in_progress': return 'default';
      case 'completed': return 'default';
      case 'issue_logged': return 'destructive';
      default: return 'outline';
    }
  };

  // Drag styling
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Card classes
  const cardClasses = cn(
    'cursor-pointer transition-all duration-200 hover:shadow-md group relative',
    {
      'opacity-50 scale-95': isDragging && !isDragOverlay,
      'shadow-lg scale-105': isDragOverlay,
      'ring-2 ring-primary ring-offset-2': isSelected,
      'border-red-500 shadow-red-100': shiftInfo.hasUrgentAlerts,
    },
    className
  );

  return (
    <Card 
      ref={setNodeRef} 
      style={style}
      className={cardClasses}
      {...attributes}
    >
      <CardContent className="p-4">
        {/* Header with selection and drag handle */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Priority indicator */}
            <div 
              className={cn(
                'w-2 h-2 rounded-full',
                getPriorityColor(shiftInfo.priority)
              )}
              title={`Priority ${shiftInfo.priority}`}
            />
          </div>

          <div className="flex items-center space-x-1">
            {/* Urgent alert indicator */}
            {shiftInfo.hasUrgentAlerts && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Urgent
              </Badge>
            )}
            
            {/* Drag handle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Shift Title */}
        <div className="mb-3">
          <h4 className="font-medium text-sm line-clamp-2 mb-1">
            {shift.title || 'Untitled Shift'}
          </h4>
          <Badge variant={getStatusVariant(shiftInfo.status)} className="text-xs">
            {shiftInfo.status?.replace('_', ' ')}
          </Badge>
        </div>

        {/* Client and Location */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center text-xs text-muted-foreground">
            <User className="h-3 w-3 mr-2" />
            <span className="truncate">{shiftInfo.clientName}</span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 mr-2" />
            <span className="truncate">{shiftInfo.siteName}</span>
          </div>
        </div>

        {/* Time Information */}
        {shiftInfo.startTime && (
          <div className="space-y-1 mb-3">
            <div className="flex items-center text-xs">
              <Calendar className="h-3 w-3 mr-2 text-muted-foreground" />
              <span>{format(shiftInfo.startTime, 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center text-xs">
              <Clock className="h-3 w-3 mr-2 text-muted-foreground" />
              <span>
                {format(shiftInfo.startTime, 'h:mm a')}
                {shiftInfo.endTime && ` - ${format(shiftInfo.endTime, 'h:mm a')}`}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(shiftInfo.startTime, { addSuffix: true })}
            </div>
          </div>
        )}

        {/* Guard Assignment */}
        <div className="mb-3">
          {shiftInfo.guardName ? (
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {shiftInfo.guardName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">{shiftInfo.guardName}</span>
            </div>
          ) : (
            <div className="flex items-center text-xs text-muted-foreground">
              <User className="h-3 w-3 mr-2" />
              <span>Unassigned</span>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-between text-xs">
          {/* Revenue */}
          {shiftInfo.estimatedRevenue > 0 && (
            <div className="flex items-center text-green-600">
              <DollarSign className="h-3 w-3 mr-1" />
              <span>${shiftInfo.estimatedRevenue.toFixed(0)}</span>
            </div>
          )}

          {/* Certification requirements */}
          {shiftInfo.hasCertRequirements && (
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              {shiftInfo.requiredCerts.length} certs
            </Badge>
          )}
        </div>

        {/* Urgent Alert Details */}
        {shiftInfo.highestPriorityAlert && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-red-800">
                {shiftInfo.highestPriorityAlert.alert_type?.replace('_', ' ')}
              </span>
              <Badge variant="destructive" className="text-xs">
                {shiftInfo.highestPriorityAlert.alert_priority}
              </Badge>
            </div>
            {shiftInfo.highestPriorityAlert.hours_until_shift && (
              <p className="text-xs text-red-700 mt-1">
                {shiftInfo.highestPriorityAlert.hours_until_shift.toFixed(1)} hours until shift
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}