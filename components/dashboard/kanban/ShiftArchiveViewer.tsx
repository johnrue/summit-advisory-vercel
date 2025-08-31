"use client";

// Story 3.4: Shift Archive Viewer Component
// Historical shift reporting and search interface

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Download, 
  Filter,
  BarChart3,
  TrendingUp,
  Users,
  MapPin,
  DollarSign,
  Clock,
  FileX,
  Archive,
  Loader2,
  RefreshCw,
  Star
} from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import type { 
  ArchiveSearchQuery, 
  ArchiveSearchResult,
  ShiftArchive,
  ArchiveReason,
  ArchiveMetrics
} from '@/lib/types/archive-types';

interface ShiftArchiveViewerProps {
  managerId: string;
  className?: string;
}

export function ShiftArchiveViewer({ managerId, className }: ShiftArchiveViewerProps) {
  const [searchQuery, setSearchQuery] = useState<ArchiveSearchQuery>({});
  const [searchResults, setSearchResults] = useState<ArchiveSearchResult | null>(null);
  const [metrics, setMetrics] = useState<ArchiveMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'analytics'>('search');
  const [selectedArchive, setSelectedArchive] = useState<ShiftArchive | null>(null);

  // Archive reason options
  const reasonOptions: Array<{ value: ArchiveReason; label: string; color: string }> = [
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
    { value: 'no_show', label: 'No Show', color: 'bg-red-100 text-red-800' },
    { value: 'issue_resolved', label: 'Issue Resolved', color: 'bg-orange-100 text-orange-800' },
    { value: 'administrative', label: 'Administrative', color: 'bg-blue-100 text-blue-800' }
  ];

  // Search archived shifts
  const searchArchives = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();

      if (searchQuery.keywords?.length) {
        params.append('keywords', searchQuery.keywords.join(','));
      }

      if (searchQuery.clientNames?.length) {
        params.append('client_names', searchQuery.clientNames.join(','));
      }

      if (searchQuery.guardNames?.length) {
        params.append('guard_names', searchQuery.guardNames.join(','));
      }

      if (searchQuery.siteNames?.length) {
        params.append('site_names', searchQuery.siteNames.join(','));
      }

      if (searchQuery.dateRange) {
        params.append('start_date', searchQuery.dateRange.start.toISOString().split('T')[0]);
        params.append('end_date', searchQuery.dateRange.end.toISOString().split('T')[0]);
      }

      if (searchQuery.archiveReasons?.length) {
        params.append('archive_reasons', searchQuery.archiveReasons.join(','));
      }

      if (searchQuery.satisfactionRange) {
        params.append('min_satisfaction', searchQuery.satisfactionRange.min.toString());
        params.append('max_satisfaction', searchQuery.satisfactionRange.max.toString());
      }

      if (searchQuery.revenueRange) {
        params.append('min_revenue', searchQuery.revenueRange.min.toString());
        params.append('max_revenue', searchQuery.revenueRange.max.toString());
      }

      if (searchQuery.hasIncidents !== undefined) {
        params.append('has_incidents', searchQuery.hasIncidents.toString());
      }

      if (searchQuery.sortBy) {
        params.append('sort_by', searchQuery.sortBy);
      }

      if (searchQuery.sortOrder) {
        params.append('sort_order', searchQuery.sortOrder);
      }

      if (searchQuery.limit) {
        params.append('limit', searchQuery.limit.toString());
      }

      if (searchQuery.offset) {
        params.append('offset', searchQuery.offset.toString());
      }

      const response = await fetch(`/api/v1/shifts/archive?${params}`, {
        headers: {
          'x-manager-id': managerId,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setSearchResults(result.data);
      } else {
        throw new Error(result.error?.message || 'Search failed');
      }

    } catch (err) {
      console.error('Error searching archives:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      toast.error('Failed to search archived shifts');
    } finally {
      setLoading(false);
    }
  }, [managerId, searchQuery]);

  // Load archive metrics
  const loadMetrics = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (searchQuery.dateRange) {
        params.append('start_date', searchQuery.dateRange.start.toISOString());
        params.append('end_date', searchQuery.dateRange.end.toISOString());
      }

      const response = await fetch(`/api/v1/shifts/archive/analytics?${params}`, {
        headers: {
          'x-manager-id': managerId,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load metrics: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setMetrics(result.data?.metrics || null);
      } else {
        throw new Error(result.error?.message || 'Failed to load metrics');
      }

    } catch (err) {
      console.error('Error loading metrics:', err);
      toast.error('Failed to load archive metrics');
    }
  }, [managerId, searchQuery.dateRange]);

  // Update search query
  const updateSearchQuery = useCallback(<K extends keyof ArchiveSearchQuery>(
    key: K,
    value: ArchiveSearchQuery[K]
  ) => {
    setSearchQuery(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery({});
    setSearchResults(null);
    setError(null);
  }, []);

  // Set date range presets
  const setDateRangePreset = useCallback((preset: string) => {
    const today = new Date();
    let start: Date;
    const end: Date = today;

    switch (preset) {
      case 'last7days':
        start = subDays(today, 7);
        break;
      case 'last30days':
        start = subDays(today, 30);
        break;
      case 'last3months':
        start = subMonths(today, 3);
        break;
      case 'last6months':
        start = subMonths(today, 6);
        break;
      case 'lastyear':
        start = subMonths(today, 12);
        break;
      default:
        return;
    }

    updateSearchQuery('dateRange', { start, end });
  }, [updateSearchQuery]);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }, []);

  // Render archived shift card
  const renderArchiveCard = useCallback((archive: ShiftArchive) => {
    const completionMetrics = archive.completionMetrics;
    const reasonOption = reasonOptions.find(r => r.value === archive.archiveReason);

    return (
      <Card 
        key={archive.id}
        className="cursor-pointer hover:shadow-md transition-all duration-200"
        onClick={() => setSelectedArchive(archive)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-sm mb-1">
                Shift on {format(archive.shiftDate, 'MMM d, yyyy')}
              </h4>
              <div className="flex items-center gap-2">
                <Badge className={cn('text-xs', reasonOption?.color || 'bg-gray-100 text-gray-800')}>
                  {reasonOption?.label || archive.archiveReason}
                </Badge>
                {archive.clientSatisfactionScore && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span className="text-xs">{archive.clientSatisfactionScore}/5</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-medium">
                {formatCurrency(completionMetrics?.revenueGenerated || 0)}
              </div>
              <div className="text-xs text-muted-foreground">
                {archive.shiftDurationHours}h
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span>{archive.clientName}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span>{archive.siteName}</span>
            </div>

            {archive.guardName && (
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span>Guard: {archive.guardName}</span>
              </div>
            )}

            {completionMetrics?.incidentReports > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <FileX className="h-3 w-3" />
                <span>{completionMetrics.incidentReports} incident(s)</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <span className="text-xs text-muted-foreground">
              Archived {formatDistanceToNow(archive.archivedAt, { addSuffix: true })}
            </span>
            
            {completionMetrics?.onTimeStart && completionMetrics?.onTimeEnd && (
              <Badge variant="outline" className="text-xs">
                On Time
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }, [reasonOptions, formatCurrency]);

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Shift Archive
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={activeTab === 'search' ? searchArchives : loadMetrics}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {activeTab === 'search' ? 'Search' : 'Refresh'}
              </Button>

              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search">Search & Browse</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="mt-6">
              <div className="space-y-6">
                {/* Search Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Keywords */}
                  <div className="space-y-2">
                    <Label className="text-sm">Keywords</Label>
                    <Input
                      placeholder="Search shifts..."
                      value={searchQuery.keywords?.join(', ') || ''}
                      onChange={(e) => {
                        const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k);
                        updateSearchQuery('keywords', keywords.length > 0 ? keywords : undefined);
                      }}
                    />
                  </div>

                  {/* Date Range */}
                  <div className="space-y-2">
                    <Label className="text-sm">Date Range</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {searchQuery.dateRange 
                            ? `${format(searchQuery.dateRange.start, 'MMM d')} - ${format(searchQuery.dateRange.end, 'MMM d')}`
                            : 'Select dates'
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" onClick={() => setDateRangePreset('last7days')}>
                              Last 7 Days
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setDateRangePreset('last30days')}>
                              Last 30 Days
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setDateRangePreset('last3months')}>
                              Last 3 Months
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setDateRangePreset('lastyear')}>
                              Last Year
                            </Button>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => updateSearchQuery('dateRange', undefined)}
                          >
                            Clear
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Archive Reason */}
                  <div className="space-y-2">
                    <Label className="text-sm">Archive Reason</Label>
                    <Select
                      value={searchQuery.archiveReasons?.[0] || ''}
                      onValueChange={(value) => {
                        updateSearchQuery('archiveReasons', value ? [value as ArchiveReason] : undefined);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All reasons" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All reasons</SelectItem>
                        {reasonOptions.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Advanced Filters */}
                <details className="group">
                  <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                    <Filter className="h-4 w-4" />
                    Advanced Filters
                  </summary>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    {/* Client & Guard Names */}
                    <div className="space-y-2">
                      <Label className="text-sm">Client Name</Label>
                      <Input
                        placeholder="Enter client name..."
                        value={searchQuery.clientNames?.[0] || ''}
                        onChange={(e) => {
                          updateSearchQuery('clientNames', e.target.value ? [e.target.value] : undefined);
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Guard Name</Label>
                      <Input
                        placeholder="Enter guard name..."
                        value={searchQuery.guardNames?.[0] || ''}
                        onChange={(e) => {
                          updateSearchQuery('guardNames', e.target.value ? [e.target.value] : undefined);
                        }}
                      />
                    </div>

                    {/* Revenue Range */}
                    <div className="space-y-2">
                      <Label className="text-sm">Min Revenue ($)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={searchQuery.revenueRange?.min || ''}
                        onChange={(e) => {
                          const min = parseFloat(e.target.value) || 0;
                          updateSearchQuery('revenueRange', {
                            min,
                            max: searchQuery.revenueRange?.max || 10000
                          });
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Max Revenue ($)</Label>
                      <Input
                        type="number"
                        placeholder="10000"
                        value={searchQuery.revenueRange?.max || ''}
                        onChange={(e) => {
                          const max = parseFloat(e.target.value) || 10000;
                          updateSearchQuery('revenueRange', {
                            min: searchQuery.revenueRange?.min || 0,
                            max
                          });
                        }}
                      />
                    </div>
                  </div>
                </details>

                {/* Search Results */}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="flex flex-col items-center space-y-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <p className="text-sm text-muted-foreground">Searching archives...</p>
                    </div>
                  </div>
                ) : searchResults ? (
                  <div className="space-y-4">
                    {/* Results Summary */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {searchResults.totalCount} results found
                        {searchResults.aggregations.totalRevenue > 0 && (
                          <span className="ml-2">
                            • Total Revenue: {formatCurrency(searchResults.aggregations.totalRevenue)}
                          </span>
                        )}
                      </div>
                      
                      <Select
                        value={`${searchQuery.sortBy || 'date'}-${searchQuery.sortOrder || 'desc'}`}
                        onValueChange={(value) => {
                          const [sortBy, sortOrder] = value.split('-');
                          updateSearchQuery('sortBy', sortBy as any);
                          updateSearchQuery('sortOrder', sortOrder as 'asc' | 'desc');
                        }}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                          <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                          <SelectItem value="revenue-desc">Revenue (High to Low)</SelectItem>
                          <SelectItem value="revenue-asc">Revenue (Low to High)</SelectItem>
                          <SelectItem value="satisfaction-desc">Satisfaction (High to Low)</SelectItem>
                          <SelectItem value="duration-desc">Duration (Long to Short)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Results Grid */}
                    {searchResults.results.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {searchResults.results.map(renderArchiveCard)}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No archived shifts found</p>
                        <Button variant="outline" onClick={clearSearch} className="mt-2">
                          Clear Search
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Enter search criteria to find archived shifts</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Archive Analytics</h3>
                  <Button onClick={loadMetrics} disabled={loading}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Load Analytics
                  </Button>
                </div>

                {metrics ? (
                  <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Archive className="h-4 w-4 text-blue-500" />
                            <div>
                              <div className="text-2xl font-bold">{metrics.totalArchivedShifts}</div>
                              <div className="text-xs text-muted-foreground">Total Archived</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-green-500" />
                            <div>
                              <div className="text-2xl font-bold">{metrics.averageShiftDuration.toFixed(1)}h</div>
                              <div className="text-xs text-muted-foreground">Avg Duration</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <div>
                              <div className="text-2xl font-bold">{formatCurrency(metrics.averageRevenue)}</div>
                              <div className="text-xs text-muted-foreground">Avg Revenue</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <div>
                              <div className="text-2xl font-bold">{metrics.averageClientSatisfaction.toFixed(1)}</div>
                              <div className="text-xs text-muted-foreground">Avg Satisfaction</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Archive Reasons Breakdown */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Archive Reasons</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(metrics.archivesByReason).map(([reason, count]) => {
                            const reasonOption = reasonOptions.find(r => r.value === reason);
                            const percentage = (count / metrics.totalArchivedShifts) * 100;
                            
                            return (
                              <div key={reason} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className={cn('text-xs', reasonOption?.color)}>
                                    {reasonOption?.label || reason}
                                  </Badge>
                                  <span className="text-sm">{count} shifts</span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Click "Load Analytics" to view archive metrics</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Archive Detail Modal would go here */}
    </div>
  );
}