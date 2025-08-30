"use client"

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ManagerWorkloadData {
  managerId: string
  managerName: string
  clientLeads: number
  guardLeads: number
  totalWorkload: number
  responseTime: number
  conversionRate: number
}

interface ManagerWorkloadChartProps {
  data: ManagerWorkloadData[]
  isLoading?: boolean
}

const WORKLOAD_COLORS = {
  client: '#8B5A3C',     // Accent color
  guard: '#B8860B',      // Gold color
  performance: '#CD853F', // Sandy brown
  scatter: '#DEB887'     // Burlywood
}

export function ManagerWorkloadChart({ data, isLoading }: ManagerWorkloadChartProps) {
  const workloadData = useMemo(() => {
    if (!data || data.length === 0) return []

    return data
      .map(item => ({
        ...item,
        shortName: item.managerName.split(' ').map(n => n.charAt(0)).join('') || item.managerName.substring(0, 3),
        efficiency: (item.conversionRate * item.totalWorkload) / Math.max(item.responseTime, 1) // Efficiency metric
      }))
      .sort((a, b) => b.totalWorkload - a.totalWorkload)
  }, [data])

  const scatterData = useMemo(() => {
    return workloadData.map(item => ({
      ...item,
      x: item.totalWorkload,
      y: item.conversionRate,
      z: item.responseTime
    }))
  }, [workloadData])

  const averageWorkload = useMemo(() => {
    if (workloadData.length === 0) return 0
    return workloadData.reduce((sum, item) => sum + item.totalWorkload, 0) / workloadData.length
  }, [workloadData])

  const averageConversionRate = useMemo(() => {
    if (workloadData.length === 0) return 0
    return workloadData.reduce((sum, item) => sum + item.conversionRate, 0) / workloadData.length
  }, [workloadData])

  const CustomWorkloadTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload
      if (!data) return null

      return (
        <div className="bg-background border rounded-lg shadow-lg p-4 min-w-[280px]">
          <p className="font-semibold text-foreground mb-3">{data.managerName}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Workload Breakdown:</span>
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-xs">
                  Client: {data.clientLeads}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Guard: {data.guardLeads}
                </Badge>
              </div>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Workload:</span>
              <span className="font-medium">{data.totalWorkload} leads</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Conversion Rate:</span>
              <span className="font-medium">{data.conversionRate.toFixed(1)}%</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Avg Response Time:</span>
              <span className="font-medium">{data.responseTime.toFixed(1)} hours</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload
      if (!data) return null

      return (
        <div className="bg-background border rounded-lg shadow-lg p-4 min-w-[250px]">
          <p className="font-semibold text-foreground mb-3">{data.managerName}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Workload:</span>
              <span className="font-medium">{data.totalWorkload} leads</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Conversion Rate:</span>
              <span className="font-medium">{data.conversionRate.toFixed(1)}%</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Response Time:</span>
              <span className="font-medium">{data.responseTime.toFixed(1)} hours</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Efficiency Score:</span>
              <span className="font-medium">{data.efficiency.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manager Workload Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading workload data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (workloadData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Manager Workload Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center text-muted-foreground">
            No workload data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manager Workload Analysis</CardTitle>
        <p className="text-sm text-muted-foreground">
          Workload distribution and performance metrics across managers
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="workload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="workload">Workload Distribution</TabsTrigger>
            <TabsTrigger value="performance">Performance Matrix</TabsTrigger>
          </TabsList>
          
          <TabsContent value="workload" className="mt-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={workloadData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="shortName" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Lead Count', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomWorkloadTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="rect"
                />
                
                <Bar 
                  dataKey="clientLeads" 
                  name="Client Leads"
                  stackId="workload"
                  fill={WORKLOAD_COLORS.client}
                  radius={[0, 0, 0, 0]}
                />
                
                <Bar 
                  dataKey="guardLeads" 
                  name="Guard Leads"
                  stackId="workload"
                  fill={WORKLOAD_COLORS.guard}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="performance" className="mt-6">
            <div className="mb-4 text-sm text-muted-foreground">
              Bubble size represents response time (larger = slower response)
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart
                data={scatterData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  type="number"
                  dataKey="x"
                  name="Workload"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Total Workload (leads)', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  type="number"
                  dataKey="y"
                  name="Conversion Rate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 'dataMax + 5']}
                />
                <ZAxis 
                  type="number" 
                  dataKey="z" 
                  range={[50, 400]} 
                  name="Response Time"
                />
                <Tooltip content={<CustomScatterTooltip />} />
                
                <Scatter 
                  name="Manager Performance"
                  data={scatterData} 
                  fill={WORKLOAD_COLORS.scatter}
                  fillOpacity={0.7}
                  stroke={WORKLOAD_COLORS.performance}
                  strokeWidth={2}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
        
        {/* Manager insights */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="font-medium text-muted-foreground mb-1">Most Loaded</div>
            <div className="font-semibold">
              {workloadData[0]?.managerName.split(' ')[0] || 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">
              {workloadData[0]?.totalWorkload || 0} leads
            </div>
          </div>
          
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="font-medium text-muted-foreground mb-1">Top Performer</div>
            <div className="font-semibold">
              {workloadData.reduce((max, item) => 
                item.conversionRate > max.conversionRate ? item : max
              , workloadData[0] || { managerName: 'N/A', conversionRate: 0 }).managerName.split(' ')[0]}
            </div>
            <div className="text-xs text-muted-foreground">
              {workloadData.reduce((max, item) => 
                item.conversionRate > max.conversionRate ? item : max
              , workloadData[0] || { conversionRate: 0 }).conversionRate.toFixed(1)}% conversion
            </div>
          </div>
          
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="font-medium text-muted-foreground mb-1">Fastest Response</div>
            <div className="font-semibold">
              {workloadData.reduce((min, item) => 
                item.responseTime < min.responseTime && item.responseTime > 0 ? item : min
              , workloadData[0] || { managerName: 'N/A', responseTime: 0 }).managerName.split(' ')[0]}
            </div>
            <div className="text-xs text-muted-foreground">
              {workloadData.reduce((min, item) => 
                item.responseTime < min.responseTime && item.responseTime > 0 ? item : min
              , workloadData[0] || { responseTime: 0 }).responseTime.toFixed(1)}h avg
            </div>
          </div>
          
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="font-medium text-muted-foreground mb-1">Avg Workload</div>
            <div className="font-semibold">
              {averageWorkload.toFixed(0)} leads
            </div>
            <div className="text-xs text-muted-foreground">
              {averageConversionRate.toFixed(1)}% avg conversion
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}