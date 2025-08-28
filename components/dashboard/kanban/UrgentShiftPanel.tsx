"use client";

// Story 3.4: Urgent Shift Alert Panel Component
// Real-time urgent alert monitoring with escalation management

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  MapPin, 
  Calendar,
  Bell,
  BellRing,
  Loader2,
  RefreshCw,
  Eye,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import type { 
  UrgentShiftAlert, 
  AlertMetrics,
  UrgencyAlertType,
  AlertPriority,
  AlertStatus 
} from '@/lib/types/urgency-types';

interface UrgentShiftPanelProps {
  managerId: string;
  onAlertResolved?: () => void;
  className?: string;
}

interface AlertWithShift extends UrgentShiftAlert {
  shift?: {
    title: string;
    clientName: string;
    siteName: string;
    startTime: Date;
    guardName?: string;
  };
}

export function UrgentShiftPanel({ 
  managerId, 
  onAlertResolved,
  className 
}: UrgentShiftPanelProps) {
  const [alerts, setAlerts] = useState<AlertWithShift[]>([]);
  const [metrics, setMetrics] = useState<AlertMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'active' | 'metrics' | 'history'>('active');

  // Load alerts and metrics
  const loadAlerts = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await fetch('/api/v1/shifts/urgent-alerts', {
        headers: {
          'x-manager-id': managerId,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load alerts: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        const alertsData = result.data?.alerts || [];
        
        // Enhance alerts with shift information (mock for now)
        const enhancedAlerts: AlertWithShift[] = alertsData.map((alert: UrgentShiftAlert) => ({
          ...alert,
          shift: {
            title: `Shift ${alert.shiftId.slice(0, 8)}`,
            clientName: 'ABC Corp', // Would be fetched from shift data
            siteName: 'Downtown Office', // Would be fetched from shift data
            startTime: new Date(Date.now() + alert.hoursUntilShift * 60 * 60 * 1000),
            guardName: alert.alertType === 'unassigned_24h' ? undefined : 'John Doe'
          }
        }));

        setAlerts(enhancedAlerts);
        setMetrics(result.data?.metrics || null);
      } else {
        throw new Error(result.error?.message || 'Failed to load alerts');
      }
    } catch (err) {
      console.error('Error loading alerts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      toast.error('Failed to load urgent alerts');
    } finally {
      setLoading(false);
    }
  }, [managerId]);

  // Auto-refresh alerts every 30 seconds
  useEffect(() => {
    loadAlerts();
    const interval = setInterval(() => loadAlerts(false), 30000);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  // Handle alert acknowledgment
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      setProcessingActions(prev => new Set(prev).add(alertId));

      const response = await fetch(`/api/v1/shifts/urgent-alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          'x-manager-id': managerId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'acknowledge',
          notes: actionNotes
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to acknowledge alert');
      }

      toast.success('Alert acknowledged');
      setActionNotes('');
      await loadAlerts(false);

    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to acknowledge alert');
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  }, [managerId, actionNotes, loadAlerts]);

  // Handle alert resolution
  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      setProcessingActions(prev => new Set(prev).add(alertId));

      const response = await fetch(`/api/v1/shifts/urgent-alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          'x-manager-id': managerId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'resolve',
          resolutionNotes: actionNotes
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to resolve alert');
      }

      toast.success('Alert resolved');
      setActionNotes('');
      onAlertResolved?.();
      await loadAlerts(false);

    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to resolve alert');
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  }, [managerId, actionNotes, loadAlerts, onAlertResolved]);

  // Trigger manual alert monitoring
  const triggerAlertScan = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/v1/shifts/urgent-alerts', {
        method: 'POST',
        headers: {
          'x-manager-id': managerId,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        const newAlerts = result.data?.generatedAlerts || [];
        toast.success(`Alert scan complete: ${newAlerts.length} new alerts generated`);
        await loadAlerts(false);
      } else {
        throw new Error(result.error?.message || 'Failed to trigger alert scan');
      }
    } catch (error) {
      console.error('Error triggering alert scan:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to trigger alert scan');
    } finally {
      setLoading(false);
    }
  }, [managerId, loadAlerts]);

  // Get alert priority styling
  const getAlertPriorityStyle = useCallback((priority: AlertPriority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 border-red-500 text-red-800';
      case 'high':
        return 'bg-orange-100 border-orange-500 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'low':
        return 'bg-blue-100 border-blue-500 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  }, []);

  // Get alert type display name
  const getAlertTypeDisplayName = useCallback((type: UrgencyAlertType) => {
    switch (type) {
      case 'unassigned_24h': return 'Unassigned (24h)';
      case 'unconfirmed_12h': return 'Unconfirmed (12h)';
      case 'no_show_risk': return 'No-Show Risk';
      case 'understaffed': return 'Understaffed';
      case 'certification_gap': return 'Cert. Gap';
      default: return type.replace('_', ' ');
    }
  }, []);

  // Group alerts by priority
  const alertsByPriority = useMemo(() => {
    const groups: Record<AlertPriority, AlertWithShift[]> = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    alerts.forEach(alert => {
      groups[alert.alertPriority].push(alert);
    });

    return groups;
  }, [alerts]);

  // Render single alert
  const renderAlert = useCallback((alert: AlertWithShift) => {
    const isProcessing = processingActions.has(alert.id);
    const isSelected = selectedAlert === alert.id;

    return (
      <Card 
        key={alert.id} 
        className={cn(
          'transition-all duration-200 cursor-pointer hover:shadow-md',
          getAlertPriorityStyle(alert.alertPriority),
          { 'ring-2 ring-primary ring-offset-2': isSelected }
        )}
        onClick={() => setSelectedAlert(isSelected ? null : alert.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <div>
                <div className="font-medium text-sm">
                  {getAlertTypeDisplayName(alert.alertType)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Created {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Level {alert.escalationLevel}
              </Badge>
              <Badge 
                variant={alert.alertPriority === 'critical' ? 'destructive' : 'outline'}
                className="text-xs"
              >
                {alert.alertPriority}
              </Badge>
            </div>
          </div>

          {/* Shift Information */}
          {alert.shift && (
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{alert.shift.title}</span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{alert.shift.clientName}</span>
                <Separator orientation="vertical" className="h-3" />
                <MapPin className="h-3 w-3" />
                <span>{alert.shift.siteName}</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>
                  {format(alert.shift.startTime, 'MMM d, h:mm a')} 
                  {alert.hoursUntilShift > 0 && (
                    <span className="text-red-600 ml-2 font-medium">
                      ({alert.hoursUntilShift.toFixed(1)}h remaining)
                    </span>
                  )}
                </span>
              </div>

              {alert.shift.guardName && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>Assigned: {alert.shift.guardName}</span>
                </div>
              )}
            </div>
          )}

          {/* Time Progress Bar */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between items-center text-xs">
              <span>Time until shift</span>
              <span className={cn('font-medium', {
                'text-red-600': alert.hoursUntilShift <= 2,
                'text-orange-600': alert.hoursUntilShift <= 6,
                'text-yellow-600': alert.hoursUntilShift <= 12
              })}>
                {alert.hoursUntilShift.toFixed(1)}h
              </span>
            </div>
            <Progress 
              value={Math.max(0, 100 - (alert.hoursUntilShift / 24) * 100)} 
              className="h-1"
            />
          </div>

          {/* Alert Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {alert.alertStatus === 'acknowledged' ? (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <Eye className="h-3 w-3" />
                  Acknowledged
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-orange-600">
                  <Bell className="h-3 w-3" />
                  Active
                </div>
              )}
            </div>

            {isSelected && (
              <div className="flex gap-1">
                {alert.alertStatus !== 'acknowledged' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      acknowledgeAlert(alert.id);
                    }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    resolveAlert(alert.id);
                  }}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3 w-3" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Action Notes (when selected) */}
          {isSelected && (
            <div className="mt-3 pt-3 border-t space-y-2">
              <Label className="text-xs">Action Notes</Label>
              <Textarea
                placeholder="Add notes about actions taken..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="min-h-16 text-xs"
                disabled={isProcessing}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }, [
    processingActions, 
    selectedAlert, 
    getAlertPriorityStyle, 
    getAlertTypeDisplayName, 
    actionNotes, 
    acknowledgeAlert, 
    resolveAlert
  ]);

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Urgent Shift Alerts
              {alerts.length > 0 && (
                <Badge variant="destructive">
                  {alerts.length} active
                </Badge>
              )}
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadAlerts()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={triggerAlertScan}
                disabled={loading}
              >
                <Bell className="h-4 w-4 mr-2" />
                Scan Now
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">
                Active Alerts
                {alerts.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {alerts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-6">
              {loading && alerts.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading alerts...</p>
                  </div>
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : alerts.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium">No urgent alerts</p>
                    <p className="text-xs text-muted-foreground">All shifts are properly staffed</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Critical Alerts */}
                  {alertsByPriority.critical.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-red-600">Critical Alerts</h3>
                        <Badge variant="destructive" className="text-xs">
                          {alertsByPriority.critical.length}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {alertsByPriority.critical.map(renderAlert)}
                      </div>
                    </div>
                  )}

                  {/* High Priority Alerts */}
                  {alertsByPriority.high.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-orange-600">High Priority</h3>
                        <Badge variant="outline" className="text-xs">
                          {alertsByPriority.high.length}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {alertsByPriority.high.map(renderAlert)}
                      </div>
                    </div>
                  )}

                  {/* Medium & Low Priority Alerts */}
                  {(alertsByPriority.medium.length > 0 || alertsByPriority.low.length > 0) && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-muted-foreground">Other Alerts</h3>
                        <Badge variant="outline" className="text-xs">
                          {alertsByPriority.medium.length + alertsByPriority.low.length}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {[...alertsByPriority.medium, ...alertsByPriority.low].map(renderAlert)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="metrics" className="mt-6">
              {metrics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <div>
                          <div className="text-2xl font-bold">{metrics.totalActiveAlerts}</div>
                          <div className="text-xs text-muted-foreground">Active Alerts</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="text-2xl font-bold">{metrics.avgResolutionTime.toFixed(1)}h</div>
                          <div className="text-xs text-muted-foreground">Avg Resolution</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="text-2xl font-bold">{metrics.newAlertsLast24h}</div>
                          <div className="text-xs text-muted-foreground">New (24h)</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="text-2xl font-bold">{metrics.resolvedAlertsLast24h}</div>
                          <div className="text-xs text-muted-foreground">Resolved (24h)</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No metrics data available</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Alert history view coming soon...</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}