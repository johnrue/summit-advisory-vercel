"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  DollarSign,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react'
import { getLeadAnalytics, exportLeadData, getConversionFunnel, type LeadAnalytics, type AnalyticsFilters } from '@/lib/services/lead-analytics-service'
import { toast } from 'sonner'
import { DateRange } from 'react-day-picker'

const COLORS = ['#d4af37', '#b8941f', '#9c7b15', '#80620c', '#644902', '#483003']

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  trend?: 'up' | 'down'
}

function MetricCard({ title, value, change, icon, trend }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' || change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {Math.abs(change).toFixed(1)}% from last period
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function LeadAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null)
  const [funnelData, setFunnelData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  })
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedManagers, setSelectedManagers] = useState<string[]>([])

  const fetchAnalytics = async () => {
    if (!dateRange?.from || !dateRange?.to) return

    setLoading(true)
    try {
      const filters: AnalyticsFilters = {
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        sources: selectedSources.length > 0 ? selectedSources : undefined,
        managers: selectedManagers.length > 0 ? selectedManagers : undefined
      }

      const [analyticsResult, funnelResult] = await Promise.all([
        getLeadAnalytics(filters),
        getConversionFunnel(filters)
      ])

      if (analyticsResult.success && analyticsResult.data) {
        setAnalytics(analyticsResult.data)
      } else {
        toast.error('Failed to fetch analytics data')
      }

      if (funnelResult.success && funnelResult.data) {
        setFunnelData(funnelResult.data)
      }

    } catch (error) {
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = async () => {
    if (!dateRange?.from || !dateRange?.to) return

    try {
      const filters: AnalyticsFilters = {
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        sources: selectedSources.length > 0 ? selectedSources : undefined,
        managers: selectedManagers.length > 0 ? selectedManagers : undefined
      }

      const result = await exportLeadData(filters, 'csv')
      
      if (result.success && result.data) {
        // Create and download file
        const blob = new Blob([result.data.data], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.data.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        toast.success('Data exported successfully')
      } else {
        toast.error(result.error || 'Failed to export data')
      }
    } catch (error) {
      toast.error('Failed to export data')
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange, selectedSources, selectedManagers])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">No analytics data available</h3>
        <p className="text-muted-foreground">Try adjusting your filters or date range.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics Filters</CardTitle>
          <CardDescription>Customize your analytics view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <DatePickerWithRange
                date={dateRange}
                setDate={setDateRange}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchAnalytics} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleExportData} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Leads"
          value={analytics.overview.totalLeads}
          change={analytics.overview.growthRate}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${analytics.overview.conversionRate.toFixed(1)}%`}
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Average Value"
          value={`$${analytics.overview.averageValue.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="This Period"
          value={analytics.overview.thisMonth}
          change={analytics.overview.growthRate}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Source Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources Performance</CardTitle>
            <CardDescription>Conversion rates by lead source</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.sourcePerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'conversionRate' ? `${value.toFixed(1)}%` : value,
                    name === 'conversionRate' ? 'Conversion Rate' : 'Total Leads'
                  ]}
                />
                <Legend />
                <Bar dataKey="totalLeads" fill="#d4af37" name="Total Leads" />
                <Bar dataKey="conversionRate" fill="#b8941f" name="Conversion Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Status Distribution</CardTitle>
            <CardDescription>Current status of all leads</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percentage }) => `${status}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                >
                  {analytics.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Generation Trends</CardTitle>
          <CardDescription>Weekly lead generation and conversion trends</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={analytics.timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="totalLeads" 
                stroke="#d4af37" 
                name="Total Leads" 
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="convertedLeads" 
                stroke="#b8941f" 
                name="Converted Leads" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Manager Performance & Conversion Funnel */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Manager Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Manager Performance</CardTitle>
            <CardDescription>Lead conversion by assigned manager</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.managerPerformance.slice(0, 5).map((manager, index) => (
                <div key={manager.managerId} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{manager.managerName}</div>
                    <div className="text-sm text-muted-foreground">
                      {manager.assignedLeads} assigned • {manager.convertedLeads} converted • {manager.averageResponseTime}min avg response
                    </div>
                  </div>
                  <Badge variant="outline">
                    {manager.conversionRate.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Lead progression through sales stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnelData.map((stage, index) => (
                <div key={stage.stage} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{stage.stage}</span>
                      <span className="text-sm text-muted-foreground">
                        {stage.count} ({stage.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stage.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Campaigns */}
      {analytics.topPerformingCampaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Campaigns</CardTitle>
            <CardDescription>Best converting campaigns and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {analytics.topPerformingCampaigns.slice(0, 6).map((campaign, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-2">
                    <div className="font-medium truncate">{campaign.campaign}</div>
                    <div className="text-sm text-muted-foreground">
                      Source: {campaign.source.replace('_', ' ')}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">
                        {campaign.leads} leads • {campaign.conversions} conversions
                      </span>
                      <Badge variant="outline">
                        {campaign.conversionRate.toFixed(1)}%
                      </Badge>
                    </div>
                    {campaign.value > 0 && (
                      <div className="text-sm font-medium text-green-600">
                        ${campaign.value.toLocaleString()} total value
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}