"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ConversionFunnelChart } from './ConversionFunnelChart'
import { SourcePerformanceChart } from './SourcePerformanceChart'
import { TrendAnalysisChart } from './TrendAnalysisChart'
import { ManagerWorkloadChart } from './ManagerWorkloadChart'
import { getUnifiedAnalytics, UnifiedAnalytics } from '@/lib/services/unified-lead-analytics-service'
import { FilterCriteria } from '@/lib/types/unified-leads'
import { TrendingUp, TrendingDown, Users, Target, Clock, DollarSign } from 'lucide-react'

interface UnifiedAnalyticsDashboardProps {
  filters: FilterCriteria
  refreshTrigger?: number
}

export function UnifiedAnalyticsDashboard({ filters, refreshTrigger }: UnifiedAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<UnifiedAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [filters, refreshTrigger])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await getUnifiedAnalytics(filters)
      
      if (result.success && result.data) {
        setAnalytics(result.data)
      } else {
        setError(result.error || 'Failed to fetch analytics')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Failed to load analytics</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const OverviewMetrics = () => {
    if (!analytics) return null

    const metrics = [
      {
        title: 'Total Leads',
        value: analytics.crossPipelineMetrics.totalLeads,
        change: 0, // Would need previous period data
        icon: Users,
        description: `${analytics.crossPipelineMetrics.clientLeads} client, ${analytics.crossPipelineMetrics.guardLeads} guard`
      },
      {
        title: 'Overall Conversion',
        value: `${analytics.crossPipelineMetrics.overallConversionRate.toFixed(1)}%`,
        change: 0, // Would need previous period data
        icon: Target,
        description: `Client: ${analytics.crossPipelineMetrics.clientConversionRate.toFixed(1)}%, Guard: ${analytics.crossPipelineMetrics.guardConversionRate.toFixed(1)}%`
      },
      {
        title: 'Avg Response Time',
        value: `${analytics.crossPipelineMetrics.averageResponseTime}h`,
        change: 0, // Would need previous period data
        icon: Clock,
        description: 'Average time to first contact'
      },
      {
        title: 'Lead Velocity',
        value: `${analytics.crossPipelineMetrics.leadVelocity}/day`,
        change: 0, // Would need previous period data
        icon: TrendingUp,
        description: 'New leads per day'
      }
    ]

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <metric.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </span>
                </div>
                {metric.change !== 0 && (
                  <Badge variant={metric.change > 0 ? "default" : "destructive"} className="text-xs">
                    {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                  </Badge>
                )}
              </div>
              
              <div className="text-2xl font-bold mb-1">
                {metric.value}
              </div>
              
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-48">
              <LoadingSpinner size="lg" />
              <span className="ml-2 text-muted-foreground">Loading analytics...</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <OverviewMetrics />
          
          <Tabs defaultValue="trends" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="funnel">Funnel</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="managers">Managers</TabsTrigger>
            </TabsList>
            
            <TabsContent value="trends" className="mt-6">
              <TrendAnalysisChart 
                data={analytics?.trendAnalysis || []} 
                isLoading={isLoading}
              />
            </TabsContent>
            
            <TabsContent value="funnel" className="mt-6">
              <ConversionFunnelChart 
                data={analytics?.conversionFunnel || []} 
                isLoading={isLoading}
              />
            </TabsContent>
            
            <TabsContent value="sources" className="mt-6">
              <SourcePerformanceChart 
                data={analytics?.sourceComparison || []} 
                isLoading={isLoading}
              />
            </TabsContent>
            
            <TabsContent value="managers" className="mt-6">
              <ManagerWorkloadChart 
                data={analytics?.managerWorkloadDistribution || []} 
                isLoading={isLoading}
              />
            </TabsContent>
          </Tabs>
          
          {/* Additional insights section */}
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Performing Source</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.sourceComparison.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {analytics.sourceComparison[0].source.replace('_', ' ').replace('-', ' ')
                            .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </span>
                        <Badge variant="default">
                          {analytics.sourceComparison[0].efficiency.toFixed(1)}% conversion
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {analytics.sourceComparison[0].clientLeads + analytics.sourceComparison[0].guardLeads} leads, 
                        {' '}{analytics.sourceComparison[0].clientConversions + analytics.sourceComparison[0].guardConversions} conversions
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">ROI: </span>
                        <span className="font-medium">${analytics.sourceComparison[0].totalROI.toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No source data available</p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pipeline Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Client Pipeline</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-muted rounded">
                          <div 
                            className="h-full bg-accent rounded"
                            style={{ 
                              width: analytics.crossPipelineMetrics.totalLeads > 0 
                                ? `${(analytics.crossPipelineMetrics.clientLeads / analytics.crossPipelineMetrics.totalLeads) * 100}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {analytics.crossPipelineMetrics.clientLeads}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Guard Pipeline</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-muted rounded">
                          <div 
                            className="h-full bg-primary rounded"
                            style={{ 
                              width: analytics.crossPipelineMetrics.totalLeads > 0 
                                ? `${(analytics.crossPipelineMetrics.guardLeads / analytics.crossPipelineMetrics.totalLeads) * 100}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {analytics.crossPipelineMetrics.guardLeads}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}