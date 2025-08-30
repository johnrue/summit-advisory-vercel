"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { UnifiedLead, FilterCriteria } from '@/lib/types/unified-leads'
import { UnifiedLeadDashboardService } from '@/lib/services/unified-lead-dashboard-service'
import { getWorkloadDistribution, WorkloadDistribution } from '@/lib/services/unified-assignment-service'
import { TrendingUp, Users, Target, Clock, Calendar, CheckCircle, AlertCircle } from 'lucide-react'

interface ManagerDashboardViewProps {
  managerId: string
  managerName: string
  filters: FilterCriteria
  refreshTrigger?: number
}

interface ManagerMetrics {
  totalAssignedLeads: number
  activeLeads: number
  completedLeads: number
  responseTime: number
  conversionRate: number
  thisWeekLeads: number
  pendingFollowUps: number
  overdueFollowUps: number
}

export function ManagerDashboardView({ managerId, managerName, filters, refreshTrigger }: ManagerDashboardViewProps) {
  const [leads, setLeads] = useState<UnifiedLead[]>([])
  const [metrics, setMetrics] = useState<ManagerMetrics | null>(null)
  const [workload, setWorkload] = useState<WorkloadDistribution | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchManagerData()
  }, [managerId, filters, refreshTrigger])

  const fetchManagerData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Filter leads for this specific manager
      const managerFilters = {
        ...filters,
        assignedManagers: [managerId]
      }

      // Fetch manager's leads
      const leadsResult = await UnifiedLeadDashboardService.getUnifiedLeads(managerFilters)
      
      if (!leadsResult.success || !leadsResult.data) {
        throw new Error(leadsResult.error || 'Failed to fetch leads')
      }

      const managerLeads = leadsResult.data.leads

      // Fetch workload distribution
      const workloadResult = await getWorkloadDistribution()
      
      if (workloadResult.success && workloadResult.data) {
        const managerWorkload = workloadResult.data.find(w => w.managerId === managerId)
        setWorkload(managerWorkload || null)
      }

      // Calculate metrics
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const activeLeads = managerLeads.filter(l => 
        !['won', 'hired', 'closed'].includes(l.status)
      )
      
      const completedLeads = managerLeads.filter(l => 
        ['won', 'hired'].includes(l.status)
      )
      
      const thisWeekLeads = managerLeads.filter(l => 
        new Date(l.createdAt) >= weekAgo
      )

      const pendingFollowUps = managerLeads.filter(l => 
        l.nextFollowUpDate && new Date(l.nextFollowUpDate) >= now
      )

      const overdueFollowUps = managerLeads.filter(l => 
        l.nextFollowUpDate && new Date(l.nextFollowUpDate) < now && 
        !['won', 'hired', 'closed'].includes(l.status)
      )

      // Calculate response time
      const responseTimeLeads = managerLeads.filter(l => 
        l.assignedAt && l.lastContactDate
      ).map(l => {
        const assigned = new Date(l.assignedAt!)
        const contacted = new Date(l.lastContactDate!)
        return Math.max(0, (contacted.getTime() - assigned.getTime()) / (1000 * 60 * 60)) // hours
      })

      const avgResponseTime = responseTimeLeads.length > 0 
        ? responseTimeLeads.reduce((a, b) => a + b, 0) / responseTimeLeads.length 
        : 0

      // Calculate conversion rate
      const conversionRate = managerLeads.length > 0 
        ? (completedLeads.length / managerLeads.length) * 100 
        : 0

      setLeads(managerLeads)
      setMetrics({
        totalAssignedLeads: managerLeads.length,
        activeLeads: activeLeads.length,
        completedLeads: completedLeads.length,
        responseTime: Math.round(avgResponseTime * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
        thisWeekLeads: thisWeekLeads.length,
        pendingFollowUps: pendingFollowUps.length,
        overdueFollowUps: overdueFollowUps.length
      })

    } catch (err) {
      setError('Failed to load manager dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manager Dashboard - {managerName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <LoadingSpinner size="lg" />
            <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manager Dashboard - {managerName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchManagerData}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'prospect': return 'bg-gray-500'
      case 'contacted': return 'bg-blue-500'
      case 'qualified': return 'bg-yellow-500'
      case 'proposal': return 'bg-orange-500'
      case 'negotiation': return 'bg-purple-500'
      case 'won': return 'bg-green-500'
      case 'hired': return 'bg-green-500'
      case 'closed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Manager Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Manager Dashboard - {managerName}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Personal metrics and assigned leads overview
              </p>
            </div>
            {workload && (
              <Badge variant={workload.utilizationRate >= 90 ? 'destructive' : 'outline'}>
                {workload.utilizationRate.toFixed(1)}% utilized
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Total Leads</span>
              </div>
              <div className="text-2xl font-bold">{metrics.totalAssignedLeads}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.activeLeads} active, {metrics.completedLeads} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Conversion Rate</span>
              </div>
              <div className="text-2xl font-bold">{metrics.conversionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {metrics.completedLeads} conversions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Avg Response</span>
              </div>
              <div className="text-2xl font-bold">
                {metrics.responseTime > 0 ? `${metrics.responseTime}h` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Time to first contact
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">This Week</span>
              </div>
              <div className="text-2xl font-bold">{metrics.thisWeekLeads}</div>
              <p className="text-xs text-muted-foreground">
                New assignments
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">My Leads</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Workload Progress */}
          {workload && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workload Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Current Workload</span>
                    <span>{workload.currentWorkload} / {workload.maxWorkload} leads</span>
                  </div>
                  <Progress value={workload.utilizationRate} className="h-2" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Client Leads:</span>
                      <span className="ml-2 font-medium">{workload.currentLeads.client}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Guard Leads:</span>
                      <span className="ml-2 font-medium">{workload.currentLeads.guard}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(
                  leads.reduce((acc, lead) => {
                    acc[lead.status] = (acc[lead.status] || 0) + 1
                    return acc
                  }, {} as Record<string, number>)
                ).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                      <span className="text-sm capitalize">{status}</span>
                    </div>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned Leads ({leads.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {leads.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No leads assigned to you yet
                  </p>
                ) : (
                  leads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={lead.type === 'client' ? 'default' : 'secondary'}>
                          {lead.type}
                        </Badge>
                        <div>
                          <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                          <p className="text-sm text-muted-foreground">{lead.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          {lead.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followups" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pending Follow-ups */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Pending Follow-ups ({metrics?.pendingFollowUps || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leads
                    .filter(l => l.nextFollowUpDate && new Date(l.nextFollowUpDate) >= new Date())
                    .slice(0, 5)
                    .map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between text-sm">
                        <span>{lead.firstName} {lead.lastName}</span>
                        <span className="text-muted-foreground">
                          {new Date(lead.nextFollowUpDate!).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  {(metrics?.pendingFollowUps || 0) === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No pending follow-ups
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Overdue Follow-ups */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Overdue Follow-ups ({metrics?.overdueFollowUps || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leads
                    .filter(l => l.nextFollowUpDate && 
                      new Date(l.nextFollowUpDate) < new Date() && 
                      !['won', 'hired', 'closed'].includes(l.status)
                    )
                    .slice(0, 5)
                    .map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between text-sm">
                        <span>{lead.firstName} {lead.lastName}</span>
                        <span className="text-red-600">
                          {new Date(lead.nextFollowUpDate!).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  {(metrics?.overdueFollowUps || 0) === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No overdue follow-ups
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {workload && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Response Time:</span>
                    <span className="font-medium">{workload.averageResponseTime.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conversion Rate:</span>
                    <span className="font-medium">{workload.conversionRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available Capacity:</span>
                    <span className="font-medium">{workload.availableCapacity} leads</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utilization Rate:</span>
                    <span className="font-medium">{workload.utilizationRate.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lead Pipeline Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Leads:</span>
                    <span className="font-medium">{metrics?.activeLeads || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">This Week:</span>
                    <span className="font-medium">{metrics?.thisWeekLeads || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="font-medium text-green-600">{metrics?.completedLeads || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overdue:</span>
                    <span className="font-medium text-red-600">{metrics?.overdueFollowUps || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}