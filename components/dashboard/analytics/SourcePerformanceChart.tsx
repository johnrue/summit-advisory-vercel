"use client"

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface SourcePerformanceData {
  source: string
  clientLeads: number
  guardLeads: number
  clientConversions: number
  guardConversions: number
  totalROI: number
  efficiency: number
}

interface SourcePerformanceChartProps {
  data: SourcePerformanceData[]
  isLoading?: boolean
}

const SOURCE_COLORS = {
  leads: '#8B5A3C',     // Accent color
  conversions: '#B8860B', // Gold color
  roi: '#CD853F',       // Sandy brown
  efficiency: '#DEB887'  // Burlywood
}

export function SourcePerformanceChart({ data, isLoading }: SourcePerformanceChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    return data.map(item => ({
      source: item.source.replace('_', ' ').replace('-', ' ').split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      totalLeads: item.clientLeads + item.guardLeads,
      totalConversions: item.clientConversions + item.guardConversions,
      clientLeads: item.clientLeads,
      guardLeads: item.guardLeads,
      roi: item.totalROI,
      efficiency: item.efficiency,
      conversionRate: item.efficiency // efficiency is already calculated as conversion rate
    })).sort((a, b) => b.efficiency - a.efficiency)
  }, [data])

  const averageEfficiency = useMemo(() => {
    if (chartData.length === 0) return 0
    return chartData.reduce((sum, item) => sum + item.efficiency, 0) / chartData.length
  }, [chartData])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload
      if (!data) return null

      return (
        <div className="bg-background border rounded-lg shadow-lg p-4 min-w-[280px]">
          <p className="font-semibold text-foreground mb-3">{label}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Leads:</span>
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
              <span className="text-sm text-muted-foreground">Conversions:</span>
              <span className="font-medium">{data.totalConversions}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Conversion Rate:</span>
              <span className="font-medium">{data.efficiency.toFixed(1)}%</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">ROI:</span>
              <span className="font-medium">${data.roi.toLocaleString()}</span>
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
          <CardTitle>Source Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading source performance...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Source Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No source performance data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Source Performance Analysis</CardTitle>
        <p className="text-sm text-muted-foreground">
          Lead volume, conversion rates, and ROI by source
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="source" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis 
              yAxisId="volume"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: 'Lead Volume', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="rate"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              label={{ value: 'Conversion Rate (%)', angle: 90, position: 'insideRight' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
            
            {/* Average efficiency reference line */}
            <ReferenceLine 
              yAxisId="rate"
              y={averageEfficiency} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="5 5"
              label={{
                value: `Avg: ${averageEfficiency.toFixed(1)}%`,
                position: 'topRight',
                style: { fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }
              }}
            />
            
            <Bar 
              yAxisId="volume"
              dataKey="totalLeads" 
              name="Total Leads"
              fill={SOURCE_COLORS.leads}
              radius={[2, 2, 0, 0]}
              opacity={0.8}
            />
            
            <Bar 
              yAxisId="volume"
              dataKey="totalConversions" 
              name="Conversions"
              fill={SOURCE_COLORS.conversions}
              radius={[2, 2, 0, 0]}
            />
            
            <Line 
              yAxisId="rate"
              type="monotone" 
              dataKey="efficiency" 
              name="Conversion Rate (%)"
              stroke={SOURCE_COLORS.efficiency}
              strokeWidth={3}
              dot={{ fill: SOURCE_COLORS.efficiency, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: SOURCE_COLORS.efficiency, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        
        {/* Performance insights */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="font-medium text-muted-foreground mb-1">Top Performer</div>
            <div className="font-semibold">
              {chartData[0]?.source || 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">
              {chartData[0]?.efficiency.toFixed(1)}% conversion rate
            </div>
          </div>
          
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="font-medium text-muted-foreground mb-1">Highest Volume</div>
            <div className="font-semibold">
              {chartData.reduce((max, item) => 
                item.totalLeads > max.totalLeads ? item : max
              , chartData[0] || { source: 'N/A', totalLeads: 0 }).source}
            </div>
            <div className="text-xs text-muted-foreground">
              {chartData.reduce((max, item) => 
                item.totalLeads > max.totalLeads ? item : max
              , chartData[0] || { totalLeads: 0 }).totalLeads} leads
            </div>
          </div>
          
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="font-medium text-muted-foreground mb-1">Best ROI</div>
            <div className="font-semibold">
              {chartData.reduce((max, item) => 
                item.roi > max.roi ? item : max
              , chartData[0] || { source: 'N/A', roi: 0 }).source}
            </div>
            <div className="text-xs text-muted-foreground">
              ${chartData.reduce((max, item) => 
                item.roi > max.roi ? item : max
              , chartData[0] || { roi: 0 }).roi.toLocaleString()} ROI
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}