"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { getWorkloadDistribution, WorkloadDistribution } from '@/lib/services/unified-assignment-service'
import { Users, Clock, Target, TrendingUp, AlertTriangle } from 'lucide-react'

interface WorkloadDistributionViewProps {
  refreshTrigger?: number
  onManagerSelect?: (managerId: string) => void
}

export function WorkloadDistributionView({ refreshTrigger, onManagerSelect }: WorkloadDistributionViewProps) {
  const [workloads, setWorkloads] = useState<WorkloadDistribution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWorkloadDistribution()
  }, [refreshTrigger])

  const fetchWorkloadDistribution = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await getWorkloadDistribution()
      
      if (result.success && result.data) {
        setWorkloads(result.data)
      } else {
        setError(result.error || 'Failed to fetch workload distribution')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return 'bg-red-500'
    if (rate >= 75) return 'bg-yellow-500' 
    if (rate >= 50) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getUtilizationBadge = (rate: number) => {
    if (rate >= 90) return { variant: 'destructive' as const, label: 'Overloaded' }
    if (rate >= 75) return { variant: 'secondary' as const, label: 'High Load' }
    if (rate >= 50) return { variant: 'default' as const, label: 'Balanced' }
    return { variant: 'outline' as const, label: 'Available' }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manager Workload Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
            <span className="ml-2 text-muted-foreground">Loading workload data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manager Workload Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load workload data</p>
            <p className="text-xs mt-1">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={fetchWorkloadDistribution}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (workloads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manager Workload Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Users className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No managers found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate summary stats
  const totalLeads = workloads.reduce((sum, w) => sum + w.currentWorkload, 0)
  const averageUtilization = workloads.reduce((sum, w) => sum + w.utilizationRate, 0) / workloads.length
  const overloadedManagers = workloads.filter(w => w.utilizationRate >= 90).length
  const availableManagers = workloads.filter(w => w.availableCapacity > 5).length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total Active Leads</span>
            </div>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">Across all managers</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Avg Utilization</span>
            </div>
            <div className="text-2xl font-bold">{averageUtilization.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Team average</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Overloaded</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{overloadedManagers}</div>
            <p className="text-xs text-muted-foreground">Managers at 90%+</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Available</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{availableManagers}</div>
            <p className="text-xs text-muted-foreground">Managers with 5+ capacity</p>
          </CardContent>
        </Card>
      </div>

      {/* Manager Workload List */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Manager Workloads</CardTitle>
          <p className="text-sm text-muted-foreground">
            Current workload distribution and availability for lead assignments
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workloads.map((manager) => {
              const badge = getUtilizationBadge(manager.utilizationRate)
              
              return (
                <div 
                  key={manager.managerId}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-medium">{manager.managerName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {manager.currentLeads.client} client • {manager.currentLeads.guard} guard
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={badge.variant} className="text-xs">
                        {badge.label}
                      </Badge>
                      {onManagerSelect && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onManagerSelect(manager.managerId)}
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium">
                        {manager.currentWorkload} / {manager.maxWorkload} leads
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {manager.utilizationRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={manager.utilizationRate} 
                      className="h-2"
                      indicatorClassName={getUtilizationColor(manager.utilizationRate)}
                    />
                  </div>

                  {/* Performance metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Response Time:</span>
                      <span className="font-medium">
                        {manager.averageResponseTime > 0 
                          ? `${manager.averageResponseTime}h` 
                          : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Target className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Conversion Rate:</span>
                      <span className="font-medium">
                        {manager.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Available Capacity:</span>
                      <span className={`font-medium ${
                        manager.availableCapacity > 10 
                          ? 'text-green-600' 
                          : manager.availableCapacity > 5 
                            ? 'text-yellow-600' 
                            : 'text-red-600'
                      }`}>
                        {manager.availableCapacity} leads
                      </span>
                    </div>
                  </div>

                  {/* Status breakdown */}
                  {Object.keys(manager.currentLeads.byStatus).length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Current Lead Status:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(manager.currentLeads.byStatus).map(([status, count]) => (
                          <Badge key={status} variant="outline" className="text-xs">
                            {status}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}