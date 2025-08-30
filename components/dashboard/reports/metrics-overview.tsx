'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, TrendingUp, TrendingDown, Users, Calendar, Shield, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCard {
  title: string
  value: string
  change: number
  icon: React.ComponentType<{ className?: string }>
  description: string
}

interface ChartData {
  name: string
  value: number
  fill?: string
}

const chartConfig = {
  hired: { label: 'Hired', color: 'hsl(var(--primary))' },
  pending: { label: 'Pending', color: 'hsl(var(--muted))' },
  rejected: { label: 'Rejected', color: 'hsl(var(--destructive))' },
  scheduled: { label: 'Scheduled', color: 'hsl(var(--primary))' },
  completed: { label: 'Completed', color: 'hsl(var(--success))' },
  cancelled: { label: 'Cancelled', color: 'hsl(var(--destructive))' },
  compliant: { label: 'Compliant', color: 'hsl(var(--success))' },
  expiring: { label: 'Expiring Soon', color: 'hsl(var(--warning))' },
  expired: { label: 'Expired', color: 'hsl(var(--destructive))' }
}

export function MetricsOverview() {
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Mock data - replace with real API calls
  const metrics: MetricCard[] = [
    {
      title: 'Active Guards',
      value: '156',
      change: 12.5,
      icon: Users,
      description: 'Total active security guards'
    },
    {
      title: 'Hiring Conversion',
      value: '68%',
      change: 5.2,
      icon: TrendingUp,
      description: 'Application to hire ratio'
    },
    {
      title: 'Scheduling Efficiency',
      value: '94%',
      change: -2.1,
      icon: Calendar,
      description: 'Successful shift completion rate'
    },
    {
      title: 'Compliance Status',
      value: '92%',
      change: 1.8,
      icon: Shield,
      description: 'Guards with up-to-date certifications'
    }
  ]

  const hiringTrendData: ChartData[] = [
    { name: 'Jan', value: 42 },
    { name: 'Feb', value: 38 },
    { name: 'Mar', value: 51 },
    { name: 'Apr', value: 45 },
    { name: 'May', value: 67 },
    { name: 'Jun', value: 58 }
  ]

  const shiftStatusData: ChartData[] = [
    { name: 'Completed', value: 875, fill: 'hsl(var(--success))' },
    { name: 'Scheduled', value: 156, fill: 'hsl(var(--primary))' },
    { name: 'Cancelled', value: 23, fill: 'hsl(var(--destructive))' }
  ]

  const complianceStatusData: ChartData[] = [
    { name: 'Compliant', value: 143, fill: 'hsl(var(--success))' },
    { name: 'Expiring Soon', value: 18, fill: 'hsl(var(--warning))' },
    { name: 'Expired', value: 7, fill: 'hsl(var(--destructive))' }
  ]

  const handleRefresh = async () => {
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLastUpdated(new Date())
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Operational Metrics</h2>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <div className={cn(
                  'flex items-center',
                  metric.change > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {metric.change > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(metric.change)}%
                </div>
                <span className="ml-2">{metric.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Hiring Trends */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Hiring Trends</CardTitle>
            <CardDescription>Monthly hiring volume over the past 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <LineChart data={hiringTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Shift Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Status</CardTitle>
            <CardDescription>Current month shift distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <PieChart>
                <Pie
                  data={shiftStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                >
                  {shiftStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Compliance Overview */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Compliance Status</CardTitle>
            <CardDescription>Guard certification compliance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <BarChart data={complianceStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Key Performance Indicators */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Key Performance Indicators</CardTitle>
            <CardDescription>Critical metrics requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Average Response Time</span>
              <Badge variant="success">2.3 hrs</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Client Satisfaction</span>
              <Badge variant="success">4.8/5.0</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">License Expiry Alerts</span>
              <Badge variant="warning">7 guards</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Background Check Pending</span>
              <Badge variant="secondary">12 applications</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Revenue This Month</span>
              <Badge variant="outline">
                <DollarSign className="h-3 w-3 mr-1" />
                $247,500
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}