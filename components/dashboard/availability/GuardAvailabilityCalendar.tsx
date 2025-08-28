// Story 3.3: Guard Availability Calendar Component
// Main availability management interface with calendar view and pattern management

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addWeeks, subWeeks, startOfDay, endOfDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Settings,
  AlertTriangle,
  CheckCircle,
  History,
  Pattern,
  Zap
} from 'lucide-react';
import {
  GuardAvailability,
  AvailabilityPattern,
  TimeOffRequest,
  CalendarEvent,
  AvailabilityHistory
} from '@/lib/types/availability-types';
import { AvailabilityEditor } from './AvailabilityEditor';
import { RecurringPatternCreator } from './RecurringPatternCreator';
import { TimeOffRequestForm } from './TimeOffRequestForm';
import { EmergencyUnavailabilityForm } from './EmergencyUnavailabilityForm';

import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface GuardAvailabilityCalendarProps {
  guardId: string;
  className?: string;
}

export default function GuardAvailabilityCalendar({ 
  guardId, 
  className 
}: GuardAvailabilityCalendarProps) {
  // State management
  const [availability, setAvailability] = useState<GuardAvailability[]>([]);
  const [patterns, setPatterns] = useState<AvailabilityPattern[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [history, setHistory] = useState<AvailabilityHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');
  
  // Dialog states
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false);
  const [showPatternCreator, setShowPatternCreator] = useState(false);
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState<GuardAvailability | null>(null);
  
  // Error handling
  const [error, setError] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    loadAvailabilityData();
  }, [guardId, calendarDate]);

  const loadAvailabilityData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range for current view
      const startDate = view === 'month' 
        ? startOfDay(subWeeks(calendarDate, 2))
        : startOfDay(subWeeks(calendarDate, 1));
      const endDate = view === 'month'
        ? endOfDay(addWeeks(calendarDate, 6))
        : endOfDay(addWeeks(calendarDate, 2));

      // Load availability data in parallel
      const [availabilityRes, patternsRes, timeOffRes, historyRes] = await Promise.all([
        fetch(`/api/v1/guards/my-availability?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`, {
          headers: { 'x-guard-id': guardId }
        }),
        fetch('/api/v1/guards/my-availability/patterns', {
          headers: { 'x-guard-id': guardId }
        }),
        fetch(`/api/v1/guards/my-time-off-requests?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`, {
          headers: { 'x-guard-id': guardId }
        }),
        fetch('/api/v1/guards/my-availability?include_history=true', {
          headers: { 'x-guard-id': guardId }
        })
      ]);

      const [availabilityData, patternsData, timeOffData, historyData] = await Promise.all([
        availabilityRes.json(),
        patternsRes.json(),
        timeOffRes.json(),
        historyRes.json()
      ]);

      if (availabilityData.success) {
        setAvailability(availabilityData.data.availability || []);
      }

      if (patternsData.success) {
        setPatterns(patternsData.data.patterns || []);
      }

      if (timeOffData.success) {
        setTimeOffRequests(timeOffData.data.timeOffRequests || []);
      }

      if (historyData.success && historyData.data.history) {
        setHistory(historyData.data.history);
      }
    } catch (error) {
      console.error('Failed to load availability data:', error);
      setError('Failed to load availability data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Transform data for calendar display
  const calendarEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    // Add availability windows
    availability.forEach(avail => {
      events.push({
        id: avail.id,
        title: `Available (${avail.availabilityType})`,
        description: avail.notes,
        startTime: avail.availabilityWindow.start,
        endTime: avail.availabilityWindow.end,
        eventType: 'availability',
        status: 'confirmed',
        location: undefined
      });
    });

    // Add time-off requests
    timeOffRequests.forEach(request => {
      const statusColor = request.status === 'approved' ? 'success' : 
                         request.status === 'denied' ? 'destructive' : 'secondary';
      
      events.push({
        id: request.id,
        title: `Time Off: ${request.requestType}${request.status === 'pending' ? ' (Pending)' : ''}`,
        description: request.reason,
        startTime: request.dateRange.start,
        endTime: request.dateRange.end,
        eventType: 'time_off',
        status: request.status as any,
        location: undefined
      });
    });

    return events;
  }, [availability, timeOffRequests]);

  // Event styling
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad';
    let borderColor = '#3174ad';
    let color = 'white';

    if (event.eventType === 'availability') {
      backgroundColor = '#10b981'; // Green for availability
      borderColor = '#059669';
    } else if (event.eventType === 'time_off') {
      backgroundColor = event.status === 'approved' ? '#f59e0b' : // Orange for approved time-off
                       event.status === 'denied' ? '#ef4444' :   // Red for denied
                       '#6b7280'; // Gray for pending
      borderColor = backgroundColor;
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color,
        border: '1px solid ' + borderColor,
        borderRadius: '4px',
        fontSize: '12px'
      }
    };
  };

  // Handle event selection
  const handleSelectEvent = (event: CalendarEvent) => {
    if (event.eventType === 'availability') {
      const avail = availability.find(a => a.id === event.id);
      if (avail) {
        setSelectedAvailability(avail);
        setShowAvailabilityEditor(true);
      }
    }
  };

  // Handle date/time slot selection
  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedDate(start);
    setSelectedAvailability(null);
    setShowAvailabilityEditor(true);
  };

  // Get active patterns count
  const activePatterns = patterns.filter(p => p.isActive).length;

  // Get recent history
  const recentHistory = history.slice(0, 5);

  // Get upcoming time-off
  const upcomingTimeOff = timeOffRequests
    .filter(req => req.dateRange.start > new Date() && req.status === 'approved')
    .slice(0, 3);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading availability data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Availability</h1>
          <p className="text-muted-foreground">
            Manage your schedule, time-off requests, and availability patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmergencyForm(true)}
            className="text-orange-600 border-orange-200 hover:bg-orange-50"
          >
            <Zap className="h-4 w-4 mr-2" />
            Report Emergency
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTimeOffForm(true)}
          >
            <Clock className="h-4 w-4 mr-2" />
            Request Time Off
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPatternCreator(true)}
          >
            <Pattern className="h-4 w-4 mr-2" />
            Create Pattern
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Hours</p>
                <p className="text-2xl font-bold">
                  {availability.reduce((total, avail) => {
                    if (avail.availabilityType === 'available') {
                      const hours = (avail.availabilityWindow.end.getTime() - avail.availabilityWindow.start.getTime()) / (1000 * 60 * 60);
                      return total + hours;
                    }
                    return total;
                  }, 0).toFixed(0)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Patterns</p>
                <p className="text-2xl font-bold">{activePatterns}</p>
              </div>
              <Pattern className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold">
                  {timeOffRequests.filter(req => req.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recent Changes</p>
                <p className="text-2xl font-bold">{history.length}</p>
              </div>
              <History className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="requests">Time-Off Requests</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Availability Calendar
                  </CardTitle>
                  <CardDescription>
                    Click and drag to create availability windows, or click existing events to edit
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setView('day')}
                    className={view === 'day' ? 'bg-primary text-primary-foreground' : ''}
                  >
                    Day
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setView('week')}
                    className={view === 'week' ? 'bg-primary text-primary-foreground' : ''}
                  >
                    Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setView('month')}
                    className={view === 'month' ? 'bg-primary text-primary-foreground' : ''}
                  >
                    Month
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ height: '600px' }}>
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="startTime"
                  endAccessor="endTime"
                  titleAccessor="title"
                  view={view}
                  onView={setView}
                  date={calendarDate}
                  onNavigate={setCalendarDate}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  selectable
                  eventPropGetter={eventStyleGetter}
                  step={60}
                  showMultiDayTimes
                  popup
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upcoming Time Off</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingTimeOff.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingTimeOff.map(request => (
                      <div key={request.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">{request.requestType}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(request.dateRange.start, 'MMM d')} - {format(request.dateRange.end, 'MMM d')}
                          </p>
                        </div>
                        <Badge variant="secondary">Approved</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No upcoming time off</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentHistory.length > 0 ? (
                  <div className="space-y-2">
                    {recentHistory.map(item => (
                      <div key={item.id} className="flex items-start gap-2 p-2 border rounded">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                        <div>
                          <p className="text-sm font-medium">
                            {item.changeType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(item.changedAt, 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>Recurring Patterns</CardTitle>
              <CardDescription>
                Manage your recurring availability schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patterns.length > 0 ? (
                <div className="space-y-4">
                  {patterns.map(pattern => (
                    <div key={pattern.id} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{pattern.patternName}</h3>
                        <Badge variant={pattern.isActive ? "default" : "secondary"}>
                          {pattern.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {pattern.patternType.replace(/_/g, ' ')} • Effective from {format(pattern.effectiveDate, 'MMM d, yyyy')}
                        {pattern.endDate && ` until ${format(pattern.endDate, 'MMM d, yyyy')}`}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          {pattern.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Pattern className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No patterns created</h3>
                  <p className="text-muted-foreground mb-4">
                    Create recurring patterns to automatically generate your availability
                  </p>
                  <Button onClick={() => setShowPatternCreator(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Pattern
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Time-Off Requests</CardTitle>
              <CardDescription>
                View and manage your time-off requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Time-off requests content would go here */}
              <p>Time-off requests management interface</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Availability History</CardTitle>
              <CardDescription>
                Track changes to your availability and patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* History interface would go here */}
              <p>Availability history interface</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={showAvailabilityEditor} onOpenChange={setShowAvailabilityEditor}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAvailability ? 'Edit Availability' : 'Add Availability'}
            </DialogTitle>
          </DialogHeader>
          <AvailabilityEditor
            guardId={guardId}
            availability={selectedAvailability ? [selectedAvailability] : []}
            patterns={patterns}
            onSave={async () => {
              setShowAvailabilityEditor(false);
              await loadAvailabilityData();
            }}
            onCreatePattern={async () => {
              setShowAvailabilityEditor(false);
              setShowPatternCreator(true);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showPatternCreator} onOpenChange={setShowPatternCreator}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create Recurring Pattern</DialogTitle>
          </DialogHeader>
          <RecurringPatternCreator
            guardId={guardId}
            onSave={async () => {
              setShowPatternCreator(false);
              await loadAvailabilityData();
            }}
            onCancel={() => setShowPatternCreator(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showTimeOffForm} onOpenChange={setShowTimeOffForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
          </DialogHeader>
          <TimeOffRequestForm
            guardId={guardId}
            onSubmit={async () => {
              setShowTimeOffForm(false);
              await loadAvailabilityData();
            }}
            onCancel={() => setShowTimeOffForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showEmergencyForm} onOpenChange={setShowEmergencyForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Emergency Unavailability</DialogTitle>
          </DialogHeader>
          <EmergencyUnavailabilityForm
            guardId={guardId}
            onSubmit={async () => {
              setShowEmergencyForm(false);
              await loadAvailabilityData();
            }}
            onCancel={() => setShowEmergencyForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}