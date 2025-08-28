"use client";

// Story 3.4: Kanban Analytics Dashboard Component
// Workflow performance metrics and operational insights

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  Users, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Calendar,
  Target,
  Zap,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import type { 
  KanbanMetrics,
  WorkflowAnalytics,
  KanbanStatus 
} from '@/lib/types/kanban-types';

interface KanbanAnalyticsDashboardProps {
  managerId: string;
  className?: string;
}

interface AnalyticsData {
  metrics: KanbanMetrics;
  analytics: WorkflowAnalytics;
  trends: {
    completionRateChange: number;
    assignmentSpeedChange: number;
    urgentAlertsChange: number;
    throughputChange: number;
  };
  recommendations: string[];
}

export function KanbanAnalyticsDashboard({ managerId, className }: KanbanAnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '6m'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'workflow' | 'performance' | 'insights'>('overview');

  // Load analytics data
  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date();
      let startDate: Date;

      switch (timeRange) {
        case '7d':
          startDate = subDays(endDate, 7);
          break;
        case '30d':
          startDate = subDays(endDate, 30);
          break;
        case '90d':
          startDate = subDays(endDate, 90);
          break;
        case '6m':
          startDate = subMonths(endDate, 6);
          break;
        default:
          startDate = subDays(endDate, 30);
      }

      // Mock analytics data (would come from API)
      const mockData: AnalyticsData = {
        metrics: {
          totalShifts: 156,
          shiftsByStatus: {
            unassigned: 12,
            assigned: 28,
            confirmed: 34,
            in_progress: 8,
            completed: 68,
            issue_logged: 4,
            archived: 2
          } as Record<KanbanStatus, number>,
          avgTimeToAssignment: 4.2,
          avgTimeToConfirmation: 8.7,
          completionRate: 87.2,
          urgentAlertsCount: 7,
          workflowBottlenecks: [
            { status: 'assigned' as KanbanStatus, avgDwellTime: 18.5, shiftCount: 28 },
            { status: 'confirmed' as KanbanStatus, avgDwellTime: 24.3, shiftCount: 34 }
          ]
        },
        analytics: {
          date: new Date(),
          period: 'monthly',
          metrics: {
            totalShifts: 156,
            shiftsByStatus: {
              unassigned: 12,
              assigned: 28,
              confirmed: 34,
              in_progress: 8,
              completed: 68,
              issue_logged: 4,
              archived: 2
            } as Record<KanbanStatus, number>,
            avgTimeToAssignment: 4.2,
            avgTimeToConfirmation: 8.7,
            completionRate: 87.2,
            urgentAlertsCount: 7,
            workflowBottlenecks: []
          },
          trends: {
            completionRateChange: 5.3,
            assignmentSpeedChange: -12.4,
            urgentAlertsChange: -22.1
          },
          recommendations: []
        },
        trends: {
          completionRateChange: 5.3,
          assignmentSpeedChange: -12.4,
          urgentAlertsChange: -22.1,
          throughputChange: 8.9
        },
        recommendations: [
          'Consider implementing automated assignment rules to reduce bottleneck in "Assigned" status',
          'Guard confirmation time has improved by 12.4% - current training initiatives are effective',
          'Urgent alerts decreased by 22.1% indicating improved operational planning',
          'Workflow throughput increased by 8.9% - consider capacity expansion opportunities'
        ]
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setAnalyticsData(mockData);
      toast.success('Analytics updated successfully');

    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // Load analytics on mount and time range change
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Get status color
  const getStatusColor = useCallback((status: KanbanStatus) => {
    const colors: Record<KanbanStatus, string> = {
      unassigned: 'bg-red-100 text-red-800',
      assigned: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      issue_logged: 'bg-orange-100 text-orange-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.unassigned;
  }, []);

  // Get trend direction and color
  const getTrendDisplay = useCallback((value: number) => {
    const isPositive = value > 0;
    const isNeutral = Math.abs(value) < 1;
    
    return {
      icon: isNeutral ? Activity : isPositive ? TrendingUp : TrendingDown,
      color: isNeutral ? 'text-gray-500' : isPositive ? 'text-green-500' : 'text-red-500',
      value: `${isPositive ? '+' : ''}${value.toFixed(1)}%`
    };
  }, []);

  // Calculate workflow efficiency
  const workflowEfficiency = useMemo(() => {
    if (!analyticsData) return 0;
    
    const metrics = analyticsData.metrics;
    const totalTime = metrics.avgTimeToAssignment + metrics.avgTimeToConfirmation;
    const idealTime = 6; // hours
    
    return Math.max(0, Math.min(100, ((idealTime / totalTime) * 100)));
  }, [analyticsData]);

  if (loading && !analyticsData) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadAnalytics} 
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!analyticsData) return null;

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Kanban Analytics
            </CardTitle>

            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={loadAnalytics}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={(tab: any) => setActiveTab(tab)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="text-2xl font-bold">{analyticsData.metrics.totalShifts}</div>
                            <div className="text-xs text-muted-foreground">Total Shifts</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {(() => {
                            const trend = getTrendDisplay(analyticsData.trends.throughputChange);
                            const TrendIcon = trend.icon;
                            return (
                              <div className="flex items-center gap-1">
                                <TrendIcon className={cn('h-3 w-3', trend.color)} />
                                <span className={cn('text-xs', trend.color)}>{trend.value}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="text-2xl font-bold">{analyticsData.metrics.completionRate.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">Completion Rate</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {(() => {
                            const trend = getTrendDisplay(analyticsData.trends.completionRateChange);
                            const TrendIcon = trend.icon;
                            return (
                              <div className="flex items-center gap-1">
                                <TrendIcon className={cn('h-3 w-3', trend.color)} />
                                <span className={cn('text-xs', trend.color)}>{trend.value}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <div>
                            <div className="text-2xl font-bold">{analyticsData.metrics.avgTimeToAssignment.toFixed(1)}h</div>
                            <div className="text-xs text-muted-foreground">Avg Assignment Time</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {(() => {
                            const trend = getTrendDisplay(analyticsData.trends.assignmentSpeedChange);
                            const TrendIcon = trend.icon;
                            return (
                              <div className="flex items-center gap-1">
                                <TrendIcon className={cn('h-3 w-3', trend.color)} />
                                <span className={cn('text-xs', trend.color)}>{trend.value}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <div>
                            <div className="text-2xl font-bold">{analyticsData.metrics.urgentAlertsCount}</div>
                            <div className="text-xs text-muted-foreground">Urgent Alerts</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {(() => {
                            const trend = getTrendDisplay(analyticsData.trends.urgentAlertsChange);
                            const TrendIcon = trend.icon;
                            return (
                              <div className="flex items-center gap-1">
                                <TrendIcon className={cn('h-3 w-3', trend.color)} />
                                <span className={cn('text-xs', trend.color)}>{trend.value}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Workflow Efficiency */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Workflow Efficiency
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Overall Efficiency</span>
                        <span className="text-sm font-medium">{workflowEfficiency.toFixed(1)}%</span>
                      </div>
                      <Progress value={workflowEfficiency} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Based on assignment speed and confirmation times compared to optimal benchmarks
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="workflow" className="mt-6">
              <div className="space-y-6">
                {/* Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(analyticsData.metrics.shiftsByStatus).map(([status, count]) => {
                        const percentage = (count / analyticsData.metrics.totalShifts) * 100;
                        return (
                          <div key={status} className="text-center">
                            <div className="text-2xl font-bold">{count}</div>
                            <Badge className={cn('text-xs mb-2', getStatusColor(status as KanbanStatus))}>
                              {status.replace('_', ' ')}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {percentage.toFixed(1)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Workflow Bottlenecks */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Workflow Bottlenecks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.metrics.workflowBottlenecks.length > 0 ? (
                        analyticsData.metrics.workflowBottlenecks.map((bottleneck) => (
                          <div key={bottleneck.status} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge className={cn('text-xs', getStatusColor(bottleneck.status))}>
                                  {bottleneck.status.replace('_', ' ')}
                                </Badge>
                                <span className="text-sm">{bottleneck.shiftCount} shifts</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {bottleneck.avgDwellTime.toFixed(1)}h avg dwell time
                              </span>
                            </div>
                            <Progress 
                              value={(bottleneck.avgDwellTime / 48) * 100} // 48h max for visualization
                              className="h-1" 
                            />
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm font-medium">No significant bottlenecks detected</p>
                          <p className="text-xs text-muted-foreground">
                            Workflow is operating efficiently
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="mt-6">
              <div className="space-y-6">
                {/* Performance Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Assignment Speed</span>
                      </div>
                      <div className="text-2xl font-bold">{analyticsData.metrics.avgTimeToAssignment.toFixed(1)}h</div>
                      <div className="flex items-center gap-1 mt-1">
                        {(() => {
                          const trend = getTrendDisplay(analyticsData.trends.assignmentSpeedChange);
                          const TrendIcon = trend.icon;
                          return (
                            <>
                              <TrendIcon className={cn('h-3 w-3', trend.color)} />
                              <span className={cn('text-xs', trend.color)}>{trend.value}</span>
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Confirmation Speed</span>
                      </div>
                      <div className="text-2xl font-bold">{analyticsData.metrics.avgTimeToConfirmation.toFixed(1)}h</div>
                      <div className="flex items-center gap-1 mt-1">
                        {(() => {
                          // Invert the trend for confirmation speed (lower is better)
                          const trend = getTrendDisplay(-analyticsData.trends.assignmentSpeedChange);
                          const TrendIcon = trend.icon;
                          return (
                            <>
                              <TrendIcon className={cn('h-3 w-3', trend.color)} />
                              <span className={cn('text-xs', trend.color)}>{trend.value}</span>
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">Success Rate</span>
                      </div>
                      <div className="text-2xl font-bold">{analyticsData.metrics.completionRate.toFixed(1)}%</div>
                      <div className="flex items-center gap-1 mt-1">
                        {(() => {
                          const trend = getTrendDisplay(analyticsData.trends.completionRateChange);
                          const TrendIcon = trend.icon;
                          return (
                            <>
                              <TrendIcon className={cn('h-3 w-3', trend.color)} />
                              <span className={cn('text-xs', trend.color)}>{trend.value}</span>
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Timeline Placeholder */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <LineChart className="h-4 w-4" />
                      Performance Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Calendar className="h-12 w-12 mx-auto mb-4" />
                        <p>Performance timeline chart coming soon...</p>
                        <p className="text-xs mt-2">Will show trends over selected time period</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="mt-6">
              <div className="space-y-6">
                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.recommendations.map((recommendation, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">{index + 1}</span>
                          </div>
                          <p className="text-sm leading-relaxed">{recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Optimization Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button variant="outline" className="h-auto p-4">
                        <div className="text-left">
                          <div className="font-medium">Configure Auto-Assignment</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Reduce assignment bottlenecks with automated rules
                          </div>
                        </div>
                      </Button>

                      <Button variant="outline" className="h-auto p-4">
                        <div className="text-left">
                          <div className="font-medium">Alert Threshold Settings</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Customize urgent alert triggers and escalation
                          </div>
                        </div>
                      </Button>

                      <Button variant="outline" className="h-auto p-4">
                        <div className="text-left">
                          <div className="font-medium">Performance Reports</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Generate detailed performance analysis
                          </div>
                        </div>
                      </Button>

                      <Button variant="outline" className="h-auto p-4">
                        <div className="text-left">
                          <div className="font-medium">Workflow Optimization</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Review and optimize current workflow stages
                          </div>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}