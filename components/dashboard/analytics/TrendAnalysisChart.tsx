"use client"

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
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
import { TimeSeriesData } from '@/lib/types/unified-leads'
import { format, parseISO } from 'date-fns'

interface TrendAnalysisChartProps {
  data: TimeSeriesData[]
  isLoading?: boolean
}

const TREND_COLORS = {
  clientLeads: '#8B5A3C',    // Accent color
  guardLeads: '#B8860B',     // Gold color
  conversions: '#CD853F',    // Sandy brown
  conversionRate: '#DEB887'  // Burlywood
}

export function TrendAnalysisChart({ data, isLoading }: TrendAnalysisChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    return data.map(item => ({
      ...item,
      formattedPeriod: format(parseISO(item.period), 'MMM dd'),
      fullDate: item.period,
      totalLeads: item.clientLeads + item.guardLeads
    })).sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime())
  }, [data])

  const averageConversionRate = useMemo(() => {
    if (chartData.length === 0) return 0
    const totalConversions = chartData.reduce((sum, item) => sum + item.conversions, 0)
    const totalLeads = chartData.reduce((sum, item) => sum + item.totalLeads, 0)
    return totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0
  }, [chartData])

  const totalLeadsGrowth = useMemo(() => {
    if (chartData.length < 2) return 0
    const first = chartData[0].totalLeads
    const last = chartData[chartData.length - 1].totalLeads
    return first > 0 ? ((last - first) / first) * 100 : 0
  }, [chartData])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload
      if (!data) return null

      return (
        <div className="bg-background border rounded-lg shadow-lg p-4 min-w-[280px]">
          <p className="font-semibold text-foreground mb-3">
            Week of {format(parseISO(data.fullDate), 'MMM dd, yyyy')}
          </p>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Lead Breakdown:</span>
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
              <span className="text-sm text-muted-foreground">Total Leads:</span>
              <span className="font-medium">{data.totalLeads}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Conversions:</span>
              <span className="font-medium">{data.conversions}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Conversion Rate:</span>
              <span className="font-medium">{data.conversionRate.toFixed(1)}%</span>
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
          <CardTitle>Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading trend data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No trend data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Generation Trends</CardTitle>
        <p className="text-sm text-muted-foreground">
          Weekly performance across both pipelines with conversion tracking
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="clientGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TREND_COLORS.clientLeads} stopOpacity={0.8} />
                <stop offset="95%" stopColor={TREND_COLORS.clientLeads} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="guardGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TREND_COLORS.guardLeads} stopOpacity={0.8} />
                <stop offset="95%" stopColor={TREND_COLORS.guardLeads} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="formattedPeriod" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
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
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
            
            {/* Average conversion rate reference line */}
            <ReferenceLine 
              yAxisId="rate"
              y={averageConversionRate} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="5 5"
              label={{
                value: `Avg: ${averageConversionRate.toFixed(1)}%`,
                position: 'topRight',
                style: { fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }
              }}
            />
            
            <Area
              yAxisId="volume"
              type="monotone"
              dataKey="clientLeads"
              name="Client Leads"
              stackId="leads"
              stroke={TREND_COLORS.clientLeads}
              fill="url(#clientGradient)"
            />
            
            <Area
              yAxisId="volume"
              type="monotone"
              dataKey="guardLeads"
              name="Guard Leads"
              stackId="leads"
              stroke={TREND_COLORS.guardLeads}
              fill="url(#guardGradient)"
            />
            
            <Line 
              yAxisId="rate"
              type="monotone" 
              dataKey="conversionRate" 
              name="Conversion Rate (%)"
              stroke={TREND_COLORS.conversionRate}
              strokeWidth={3}
              dot={{ fill: TREND_COLORS.conversionRate, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: TREND_COLORS.conversionRate, strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        
        {/* Trend insights */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="font-medium text-muted-foreground mb-1">Total Period</div>
            <div className="font-semibold">
              {chartData.reduce((sum, item) => sum + item.totalLeads, 0)} leads
            </div>
            <div className="text-xs text-muted-foreground">
              {chartData.reduce((sum, item) => sum + item.conversions, 0)} conversions
            </div>
          </div>
          
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="font-medium text-muted-foreground mb-1">Avg Conversion</div>
            <div className="font-semibold">
              {averageConversionRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              across all weeks
            </div>
          </div>
          
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="font-medium text-muted-foreground mb-1">Lead Growth</div>
            <div className={`font-semibold ${totalLeadsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalLeadsGrowth >= 0 ? '+' : ''}{totalLeadsGrowth.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              period over period
            </div>
          </div>
          
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="font-medium text-muted-foreground mb-1">Best Week</div>
            <div className="font-semibold">
              {chartData.reduce((max, item) => 
                item.totalLeads > max.totalLeads ? item : max
              , chartData[0] || { formattedPeriod: 'N/A', totalLeads: 0 }).formattedPeriod}
            </div>
            <div className="text-xs text-muted-foreground">
              {chartData.reduce((max, item) => 
                item.totalLeads > max.totalLeads ? item : max
              , chartData[0] || { totalLeads: 0 }).totalLeads} leads
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}