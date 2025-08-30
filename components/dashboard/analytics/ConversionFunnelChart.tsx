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
  Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConversionFunnelData } from '@/lib/types/unified-leads'

interface ConversionFunnelChartProps {
  data: ConversionFunnelData[]
  isLoading?: boolean
}

const PIPELINE_COLORS = {
  client: '#8B5A3C', // Accent color for client pipeline
  guard: '#B8860B'   // Gold color for guard pipeline
}

export function ConversionFunnelChart({ data, isLoading }: ConversionFunnelChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    // Group by stage and combine pipeline data
    const stageMap = new Map<string, { stage: string; client: number; guard: number; clientPercentage: number; guardPercentage: number }>()

    data.forEach(item => {
      const existing = stageMap.get(item.stage) || {
        stage: item.stage,
        client: 0,
        guard: 0,
        clientPercentage: 0,
        guardPercentage: 0
      }

      if (item.pipeline === 'client') {
        existing.client = item.count
        existing.clientPercentage = item.percentage
      } else {
        existing.guard = item.count
        existing.guardPercentage = item.percentage
      }

      stageMap.set(item.stage, existing)
    })

    return Array.from(stageMap.values()).sort((a, b) => {
      // Sort by total count descending (typical funnel pattern)
      return (b.client + b.guard) - (a.client + a.guard)
    })
  }, [data])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[200px]">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm capitalize">{item.dataKey}</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{item.value}</div>
                <div className="text-xs text-muted-foreground">
                  {item.dataKey === 'client' 
                    ? `${item.payload.clientPercentage.toFixed(1)}%`
                    : `${item.payload.guardPercentage.toFixed(1)}%`
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading funnel data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No funnel data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <p className="text-sm text-muted-foreground">
          Lead progression through client and guard pipelines
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="stage" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
            <Bar 
              dataKey="client" 
              name="Client Pipeline"
              fill={PIPELINE_COLORS.client}
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="guard" 
              name="Guard Pipeline"
              fill={PIPELINE_COLORS.guard}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}