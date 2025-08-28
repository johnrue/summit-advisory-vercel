"use client";

// Story 3.4: Kanban Filter Panel Component
// Advanced filtering system for shift Kanban board

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { 
  Filter, 
  X, 
  Calendar as CalendarIcon, 
  Users, 
  MapPin, 
  Building2,
  AlertTriangle,
  Star,
  Shield,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import type { KanbanFilters, KanbanStatus } from '@/lib/types/kanban-types';

interface KanbanFilterPanelProps {
  filters: KanbanFilters;
  onFiltersChange: (filters: KanbanFilters) => void;
  availableClients: Array<{ id: string; name: string; count: number }>;
  availableGuards: Array<{ id: string; name: string; count: number }>;
  availableSites: Array<{ id: string; name: string; count: number }>;
  className?: string;
}

export function KanbanFilterPanel({
  filters,
  onFiltersChange,
  availableClients = [],
  availableGuards = [],
  availableSites = [],
  className
}: KanbanFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState<'start' | 'end' | null>(null);

  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.dateRange) count++;
    if (filters.clients?.length) count++;
    if (filters.sites?.length) count++;
    if (filters.guards?.length) count++;
    if (filters.statuses?.length) count++;
    if (filters.priorities?.length) count++;
    if (filters.certificationRequirements?.length) count++;
    if (filters.assignmentStatus && filters.assignmentStatus !== 'all') count++;
    if (filters.urgentOnly) count++;
    return count;
  }, [filters]);

  // Handle filter updates
  const updateFilter = useCallback(<K extends keyof KanbanFilters>(
    key: K,
    value: KanbanFilters[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  }, [filters, onFiltersChange]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  // Status options
  const statusOptions: Array<{ value: KanbanStatus; label: string; color: string }> = [
    { value: 'unassigned', label: 'Unassigned', color: 'bg-red-100 text-red-800' },
    { value: 'assigned', label: 'Assigned', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-purple-100 text-purple-800' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
    { value: 'issue_logged', label: 'Issue Logged', color: 'bg-orange-100 text-orange-800' },
  ];

  // Priority options
  const priorityOptions = [
    { value: 1, label: 'Low (1)', color: 'bg-gray-100 text-gray-800' },
    { value: 2, label: 'Medium (2)', color: 'bg-blue-100 text-blue-800' },
    { value: 3, label: 'Normal (3)', color: 'bg-yellow-100 text-yellow-800' },
    { value: 4, label: 'High (4)', color: 'bg-orange-100 text-orange-800' },
    { value: 5, label: 'Critical (5)', color: 'bg-red-100 text-red-800' },
  ];

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="h-7"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7"
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', {
                'rotate-180': isExpanded
              })} />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Quick Filters - Always Visible */}
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Urgent Only Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="urgent-only"
              checked={filters.urgentOnly || false}
              onCheckedChange={(checked) => updateFilter('urgentOnly', checked as boolean)}
            />
            <Label 
              htmlFor="urgent-only" 
              className="text-sm cursor-pointer flex items-center gap-1"
            >
              <AlertTriangle className="h-3 w-3 text-red-500" />
              Urgent Only
            </Label>
          </div>

          {/* Assignment Status Quick Filter */}
          <Select
            value={filters.assignmentStatus || 'all'}
            onValueChange={(value) => updateFilter('assignmentStatus', value as any)}
          >
            <SelectTrigger className="h-8 w-36">
              <Users className="h-3 w-3 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shifts</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Quick Access */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <CalendarIcon className="h-3 w-3 mr-2" />
                {filters.dateRange 
                  ? `${format(filters.dateRange.start, 'MMM d')} - ${format(filters.dateRange.end, 'MMM d')}`
                  : 'All Dates'
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Quick Ranges</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        updateFilter('dateRange', {
                          start: today,
                          end: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                        });
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
                        updateFilter('dateRange', {
                          start: tomorrow,
                          end: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
                        });
                      }}
                    >
                      Tomorrow
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                        updateFilter('dateRange', {
                          start: today,
                          end: weekEnd
                        });
                      }}
                    >
                      Next 7 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateFilter('dateRange', undefined)}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Advanced Filters - Collapsible */}
        {isExpanded && (
          <>
            <Separator className="mb-4" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {statusOptions.map((status) => (
                    <div key={status.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={filters.statuses?.includes(status.value) || false}
                        onCheckedChange={(checked) => {
                          const currentStatuses = filters.statuses || [];
                          if (checked) {
                            updateFilter('statuses', [...currentStatuses, status.value]);
                          } else {
                            updateFilter('statuses', currentStatuses.filter(s => s !== status.value));
                          }
                        }}
                      />
                      <Label 
                        htmlFor={`status-${status.value}`}
                        className="text-sm cursor-pointer flex items-center gap-2"
                      >
                        <span className={cn('px-2 py-1 rounded-full text-xs', status.color)}>
                          {status.label}
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Priority</Label>
                <div className="space-y-2">
                  {priorityOptions.map((priority) => (
                    <div key={priority.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`priority-${priority.value}`}
                        checked={filters.priorities?.includes(priority.value) || false}
                        onCheckedChange={(checked) => {
                          const currentPriorities = filters.priorities || [];
                          if (checked) {
                            updateFilter('priorities', [...currentPriorities, priority.value]);
                          } else {
                            updateFilter('priorities', currentPriorities.filter(p => p !== priority.value));
                          }
                        }}
                      />
                      <Label 
                        htmlFor={`priority-${priority.value}`}
                        className="text-sm cursor-pointer flex items-center gap-2"
                      >
                        <Star className={`h-3 w-3 ${priority.value >= 4 ? 'text-orange-500' : 'text-gray-400'}`} />
                        <span className={cn('px-2 py-1 rounded-full text-xs', priority.color)}>
                          {priority.label}
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Client Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Clients</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableClients.length > 0 ? (
                    availableClients.map((client) => (
                      <div key={client.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`client-${client.id}`}
                          checked={filters.clients?.includes(client.id) || false}
                          onCheckedChange={(checked) => {
                            const currentClients = filters.clients || [];
                            if (checked) {
                              updateFilter('clients', [...currentClients, client.id]);
                            } else {
                              updateFilter('clients', currentClients.filter(c => c !== client.id));
                            }
                          }}
                        />
                        <Label 
                          htmlFor={`client-${client.id}`}
                          className="text-sm cursor-pointer flex items-center justify-between flex-1"
                        >
                          <span className="flex items-center gap-2">
                            <Building2 className="h-3 w-3" />
                            {client.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {client.count}
                          </Badge>
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No clients available</p>
                  )}
                </div>
              </div>

              {/* Sites Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sites</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableSites.length > 0 ? (
                    availableSites.map((site) => (
                      <div key={site.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`site-${site.id}`}
                          checked={filters.sites?.includes(site.id) || false}
                          onCheckedChange={(checked) => {
                            const currentSites = filters.sites || [];
                            if (checked) {
                              updateFilter('sites', [...currentSites, site.id]);
                            } else {
                              updateFilter('sites', currentSites.filter(s => s !== site.id));
                            }
                          }}
                        />
                        <Label 
                          htmlFor={`site-${site.id}`}
                          className="text-sm cursor-pointer flex items-center justify-between flex-1"
                        >
                          <span className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            {site.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {site.count}
                          </Badge>
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No sites available</p>
                  )}
                </div>
              </div>

              {/* Guards Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Guards</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableGuards.length > 0 ? (
                    availableGuards.map((guard) => (
                      <div key={guard.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`guard-${guard.id}`}
                          checked={filters.guards?.includes(guard.id) || false}
                          onCheckedChange={(checked) => {
                            const currentGuards = filters.guards || [];
                            if (checked) {
                              updateFilter('guards', [...currentGuards, guard.id]);
                            } else {
                              updateFilter('guards', currentGuards.filter(g => g !== guard.id));
                            }
                          }}
                        />
                        <Label 
                          htmlFor={`guard-${guard.id}`}
                          className="text-sm cursor-pointer flex items-center justify-between flex-1"
                        >
                          <span className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            {guard.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {guard.count}
                          </Badge>
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No guards available</p>
                  )}
                </div>
              </div>

              {/* Certification Requirements */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Required Certifications</Label>
                <Input
                  placeholder="Enter certification name..."
                  className="h-8"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      const cert = e.currentTarget.value.trim();
                      const currentCerts = filters.certificationRequirements || [];
                      if (!currentCerts.includes(cert)) {
                        updateFilter('certificationRequirements', [...currentCerts, cert]);
                      }
                      e.currentTarget.value = '';
                    }
                  }}
                />
                {filters.certificationRequirements && filters.certificationRequirements.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {filters.certificationRequirements.map((cert) => (
                      <Badge key={cert} variant="outline" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        {cert}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                          onClick={() => {
                            updateFilter(
                              'certificationRequirements',
                              filters.certificationRequirements?.filter(c => c !== cert)
                            );
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Active Filters Summary */}
        {activeFilterCount > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <Label className="text-sm font-medium">Active Filters</Label>
              <div className="flex flex-wrap gap-2">
                {filters.dateRange && (
                  <Badge variant="secondary" className="text-xs">
                    📅 {format(filters.dateRange.start, 'MMM d')} - {format(filters.dateRange.end, 'MMM d')}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                      onClick={() => updateFilter('dateRange', undefined)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                
                {filters.urgentOnly && (
                  <Badge variant="destructive" className="text-xs">
                    🚨 Urgent Only
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                      onClick={() => updateFilter('urgentOnly', false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {filters.assignmentStatus && filters.assignmentStatus !== 'all' && (
                  <Badge variant="outline" className="text-xs">
                    👤 {filters.assignmentStatus}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                      onClick={() => updateFilter('assignmentStatus', 'all')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}

                {filters.statuses && filters.statuses.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    📊 {filters.statuses.length} status{filters.statuses.length > 1 ? 'es' : ''}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                      onClick={() => updateFilter('statuses', [])}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}