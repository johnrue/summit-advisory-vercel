import { supabase } from '@/lib/supabase'
import { 
  UnifiedLead, 
  FilterCriteria, 
  LeadAnalytics,
  ConversionFunnelData,
  SourcePerformanceData,
  TimeSeriesData,
  ManagerPerformanceData,
  LeadSource
} from '@/lib/types/unified-leads'
import type { ApiResponse } from '@/lib/types'
import { getLeadAnalytics } from '@/lib/services/lead-analytics-service'

export interface UnifiedAnalytics extends LeadAnalytics {
  overview: {
    totalLeads: number
    thisMonth: number
    lastMonth: number
    growthRate: number
    conversionRate: number
    averageValue: number
  }
  statusDistribution: {
    status: string
    count: number
    percentage: number
  }[]
  managerPerformance: {
    managerId: string
    managerName: string
    totalAssigned: number
    clientLeads: number
    guardLeads: number
    totalConverted: number
    conversionRate: number
    averageResponseTime: number
    totalValue: number
    currentWorkload: number
  }[]
  timeSeriesData: {
    period: string
    totalLeads: number
    convertedLeads: number
    conversionRate: number
  }[]
  topPerformingCampaigns: any[]
  crossPipelineMetrics: {
    totalLeads: number
    clientLeads: number
    guardLeads: number
    clientConversionRate: number
    guardConversionRate: number
    overallConversionRate: number
    averageResponseTime: number
    leadVelocity: number
  }
  sourceComparison: {
    source: LeadSource
    clientLeads: number
    guardLeads: number
    clientConversions: number
    guardConversions: number
    totalROI: number
    efficiency: number
  }[]
  conversionFunnel: ConversionFunnelData[]
  managerWorkloadDistribution: {
    managerId: string
    managerName: string
    clientLeads: number
    guardLeads: number
    totalWorkload: number
    responseTime: number
    conversionRate: number
  }[]
  trendAnalysis: TimeSeriesData[]
  trendData: TimeSeriesData[]
}

/**
 * Get unified analytics across both client and guard pipelines
 */
export async function getUnifiedAnalytics(filters: FilterCriteria): Promise<ApiResponse<UnifiedAnalytics>> {
  try {
    // Fetch client leads data
    const clientQuery = supabase
      .from('client_leads')
      .select(`
        *,
        users!assigned_to(first_name, last_name)
      `)
    
    if (filters.dateRange) {
      clientQuery.gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end)
    }

    if (filters.sources?.length) {
      clientQuery.in('source_type', filters.sources)
    }
    if (filters.assignedUsers?.length) {
      clientQuery.in('assigned_to', filters.assignedUsers)
    }
    if (filters.statuses?.length) {
      clientQuery.in('status', filters.statuses)
    }

    // Fetch guard leads data
    const guardQuery = supabase
      .from('guard_leads')
      .select(`
        *,
        users!assigned_to(first_name, last_name)
      `)
    
    if (filters.dateRange) {
      guardQuery.gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end)
    }

    if (filters.sources?.length) {
      guardQuery.in('source_type', filters.sources)
    }
    if (filters.assignedUsers?.length) {
      guardQuery.in('assigned_to', filters.assignedUsers)
    }
    if (filters.statuses?.length) {
      guardQuery.in('status', filters.statuses)
    }

    const [clientResult, guardResult] = await Promise.all([
      clientQuery,
      guardQuery
    ])

    if (clientResult.error) {
      throw new Error(`Failed to fetch client leads: ${clientResult.error.message}`)
    }

    if (guardResult.error) {
      throw new Error(`Failed to fetch guard leads: ${guardResult.error.message}`)
    }

    const clientLeads = clientResult.data || []
    const guardLeads = guardResult.data || []

    // Calculate cross-pipeline metrics
    const totalLeads = clientLeads.length + guardLeads.length
    const clientConversions = clientLeads.filter(l => l.status === 'won').length
    const guardConversions = guardLeads.filter(l => l.status === 'hired').length
    const totalConversions = clientConversions + guardConversions

    const clientConversionRate = clientLeads.length > 0 ? (clientConversions / clientLeads.length) * 100 : 0
    const guardConversionRate = guardLeads.length > 0 ? (guardConversions / guardLeads.length) * 100 : 0
    const overallConversionRate = totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0

    // Calculate average response time across both pipelines
    const allResponseTimes = [
      ...clientLeads
        .filter(l => l.assigned_at && l.last_contact_date)
        .map(l => {
          const assigned = new Date(l.assigned_at!)
          const contacted = new Date(l.last_contact_date!)
          return Math.max(0, (contacted.getTime() - assigned.getTime()) / (1000 * 60 * 60)) // hours
        }),
      ...guardLeads
        .filter(l => l.assigned_at && l.last_contact_date)
        .map(l => {
          const assigned = new Date(l.assigned_at!)
          const contacted = new Date(l.last_contact_date!)
          return Math.max(0, (contacted.getTime() - assigned.getTime()) / (1000 * 60 * 60)) // hours
        })
    ]

    const averageResponseTime = allResponseTimes.length > 0 
      ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length 
      : 0

    // Calculate lead velocity (leads per day in the date range)
    const daysDiff = filters.dateRange 
      ? Math.ceil((
          (typeof filters.dateRange.end === 'string' ? new Date(filters.dateRange.end) : filters.dateRange.end).getTime() - 
          (typeof filters.dateRange.start === 'string' ? new Date(filters.dateRange.start) : filters.dateRange.start).getTime()
        ) / (1000 * 60 * 60 * 24))
      : 1
    const leadVelocity = daysDiff > 0 ? totalLeads / daysDiff : 0

    const crossPipelineMetrics = {
      totalLeads,
      clientLeads: clientLeads.length,
      guardLeads: guardLeads.length,
      clientConversionRate,
      guardConversionRate,
      overallConversionRate,
      averageResponseTime: Math.round(averageResponseTime * 10) / 10,
      leadVelocity: Math.round(leadVelocity * 10) / 10
    }

    // Calculate source comparison
    const allSources = [...new Set([
      ...clientLeads.map(l => l.source_type),
      ...guardLeads.map(l => l.source_type)
    ])]

    const sourceComparison = allSources.map(source => {
      const sourceClientLeads = clientLeads.filter(l => l.source_type === source)
      const sourceGuardLeads = guardLeads.filter(l => l.source_type === source)
      
      const clientConv = sourceClientLeads.filter(l => l.status === 'won').length
      const guardConv = sourceGuardLeads.filter(l => l.status === 'hired').length

      // Calculate ROI (simplified - would need actual cost data)
      const clientValue = sourceClientLeads
        .filter(l => l.estimated_value)
        .reduce((sum, l) => sum + (l.estimated_value || 0), 0)
      
      const guardValue = sourceGuardLeads.length * 2500 // Average guard placement value
      const totalValue = clientValue + guardValue
      const totalSourceLeads = sourceClientLeads.length + sourceGuardLeads.length
      const totalROI = totalSourceLeads > 0 ? totalValue / totalSourceLeads : 0

      // Calculate efficiency (conversions per lead)
      const efficiency = totalSourceLeads > 0 ? ((clientConv + guardConv) / totalSourceLeads) * 100 : 0

      return {
        source: source as LeadSource,
        clientLeads: sourceClientLeads.length,
        guardLeads: sourceGuardLeads.length,
        clientConversions: clientConv,
        guardConversions: guardConv,
        totalROI: Math.round(totalROI),
        efficiency: Math.round(efficiency * 10) / 10
      }
    }).sort((a, b) => b.efficiency - a.efficiency)

    // Calculate conversion funnel
    const clientStatuses = ['prospect', 'contacted', 'qualified', 'proposal', 'negotiation', 'won']
    const guardStatuses = ['applicant', 'screening', 'interview', 'background', 'training', 'hired']

    const funnelData: ConversionFunnelData[] = []
    
    // Client pipeline funnel
    clientStatuses.forEach(status => {
      const count = clientLeads.filter(l => l.status === status).length
      funnelData.push({
        stageName: status.charAt(0).toUpperCase() + status.slice(1),
        stageCount: count,
        conversionRate: clientLeads.length > 0 ? (count / clientLeads.length) * 100 : 0,
        averageTimeInStage: 24, // TODO: Calculate actual time
        dropOffReasons: []
      })
    })

    // Guard pipeline funnel
    guardStatuses.forEach(status => {
      const count = guardLeads.filter(l => l.status === status).length
      funnelData.push({
        stageName: status.charAt(0).toUpperCase() + status.slice(1),
        stageCount: count,
        conversionRate: guardLeads.length > 0 ? (count / guardLeads.length) * 100 : 0,
        averageTimeInStage: 24, // TODO: Calculate actual time
        dropOffReasons: []
      })
    })

    // Calculate manager workload distribution
    const allManagers = [...new Set([
      ...clientLeads.filter(l => l.assigned_to).map(l => l.assigned_to!),
      ...guardLeads.filter(l => l.assigned_to).map(l => l.assigned_to!)
    ])]

    const managerWorkloadDistribution = allManagers.map(managerId => {
      const managerClientLeads = clientLeads.filter(l => l.assigned_to === managerId)
      const managerGuardLeads = guardLeads.filter(l => l.assigned_to === managerId)
      const totalWorkload = managerClientLeads.length + managerGuardLeads.length

      const clientConv = managerClientLeads.filter(l => l.status === 'won').length
      const guardConv = managerGuardLeads.filter(l => l.status === 'hired').length
      const conversionRate = totalWorkload > 0 ? ((clientConv + guardConv) / totalWorkload) * 100 : 0

      // Calculate manager response time
      const managerResponseTimes = [
        ...managerClientLeads
          .filter(l => l.assigned_at && l.last_contact_date)
          .map(l => {
            const assigned = new Date(l.assigned_at!)
            const contacted = new Date(l.last_contact_date!)
            return Math.max(0, (contacted.getTime() - assigned.getTime()) / (1000 * 60 * 60))
          }),
        ...managerGuardLeads
          .filter(l => l.assigned_at && l.last_contact_date)
          .map(l => {
            const assigned = new Date(l.assigned_at!)
            const contacted = new Date(l.last_contact_date!)
            return Math.max(0, (contacted.getTime() - assigned.getTime()) / (1000 * 60 * 60))
          })
      ]

      const responseTime = managerResponseTimes.length > 0 
        ? managerResponseTimes.reduce((a, b) => a + b, 0) / managerResponseTimes.length 
        : 0

      // Get manager name
      const manager = [...clientLeads, ...guardLeads]
        .find(l => l.assigned_to === managerId && l.users)?.users

      return {
        managerId,
        managerName: manager 
          ? `${manager.first_name} ${manager.last_name}`
          : 'Unknown Manager',
        clientLeads: managerClientLeads.length,
        guardLeads: managerGuardLeads.length,
        totalWorkload,
        responseTime: Math.round(responseTime * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10
      }
    }).sort((a, b) => b.conversionRate - a.conversionRate)

    // Generate time series data (weekly buckets)
    const trendAnalysis: TimeSeriesData[] = []
    
    if (filters.dateRange) {
      const currentDate = new Date(filters.dateRange.start)
      const endDate = new Date(filters.dateRange.end)

      while (currentDate <= endDate) {
      const weekStart = new Date(currentDate)
      const weekEnd = new Date(currentDate)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      if (weekEnd > endDate) {
        weekEnd.setTime(endDate.getTime())
      }

      const weekClientLeads = clientLeads.filter(l => {
        const leadDate = new Date(l.created_at)
        return leadDate >= weekStart && leadDate <= weekEnd
      })

      const weekGuardLeads = guardLeads.filter(l => {
        const leadDate = new Date(l.created_at)
        return leadDate >= weekStart && leadDate <= weekEnd
      })

      const weekClientConversions = weekClientLeads.filter(l => l.status === 'won').length
      const weekGuardConversions = weekGuardLeads.filter(l => l.status === 'hired').length
      const weekTotalLeads = weekClientLeads.length + weekGuardLeads.length
      const weekTotalConversions = weekClientConversions + weekGuardConversions

      trendAnalysis.push({
        period: weekStart.toISOString().split('T')[0],
        totalLeads: weekTotalLeads,
        clientLeads: weekClientLeads.length,
        guardLeads: weekGuardLeads.length,
        conversions: weekTotalConversions,
        conversionRate: weekTotalLeads > 0 ? (weekTotalConversions / weekTotalLeads) * 100 : 0
      })

      currentDate.setDate(currentDate.getDate() + 7)
      }
    }

    const analytics: UnifiedAnalytics = {
      // Base LeadAnalytics properties
      totalLeads,
      clientLeads: clientLeads.length,
      guardLeads: guardLeads.length,
      conversionRate: overallConversionRate,
      averageResponseTime: Math.round(averageResponseTime * 10) / 10,
      sourcePerformance: sourceComparison.map(s => ({
        source: s.source,
        totalLeads: s.clientLeads + s.guardLeads,
        clientLeads: s.clientLeads,
        guardLeads: s.guardLeads,
        conversionRate: s.efficiency,
        averageValue: s.totalROI,
        averageScore: 0, // Added missing property
        roi: s.totalROI
      })),
      pipelineVelocity: {
        averageStageTransition: {},
        bottleneckStages: [],
        averageConversionTime: averageResponseTime,
        stageConversionRates: {}
      },
      managerPerformance: managerWorkloadDistribution.map(m => ({
        managerId: m.managerId,
        managerName: m.managerName,
        totalAssigned: m.totalWorkload,
        clientLeads: m.clientLeads,
        guardLeads: m.guardLeads,
        totalConverted: 0, // Would need conversion tracking
        conversionRate: m.conversionRate,
        averageResponseTime: m.responseTime,
        totalValue: 0, // Would need value calculation
        currentWorkload: m.totalWorkload
      })),
      
      // Extended UnifiedAnalytics properties
      overview: {
        totalLeads,
        thisMonth: totalLeads, // Simplified for current period
        lastMonth: 0, // Would need previous period calculation
        growthRate: 0, // Would need previous period calculation
        conversionRate: overallConversionRate,
        averageValue: 0 // Would need value calculation
      },
      statusDistribution: [], // Would need detailed status breakdown
      timeSeriesData: trendAnalysis.map(t => ({
        period: t.period,
        totalLeads: t.totalLeads,
        convertedLeads: t.conversions,
        conversionRate: t.conversionRate
      })),
      topPerformingCampaigns: [], // Would need campaign data
      
      // Unified analytics specific data
      crossPipelineMetrics,
      sourceComparison,
      conversionFunnel: funnelData,
      managerWorkloadDistribution,
      trendAnalysis,
      trendData: trendAnalysis
    }

    return {
      success: true,
      data: analytics,
      message: 'Unified analytics calculated successfully'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to calculate unified analytics'
    }
  }
}

/**
 * Get conversion rates by time period for trend analysis
 */
export async function getConversionTrends(
  filters: FilterCriteria,
  period: 'daily' | 'weekly' | 'monthly' = 'weekly'
): Promise<ApiResponse<TimeSeriesData[]>> {
  try {
    const analytics = await getUnifiedAnalytics(filters)
    
    if (!analytics.success || !analytics.data) {
      return {
        success: false,
        error: 'Failed to get analytics data',
        message: 'Could not calculate conversion trends'
      }
    }

    return {
      success: true,
      data: analytics.data.trendAnalysis,
      message: 'Conversion trends calculated successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to calculate conversion trends'
    }
  }
}

/**
 * Get source ROI analysis for marketing optimization
 */
export async function getSourceROIAnalysis(filters: FilterCriteria): Promise<ApiResponse<SourcePerformanceData[]>> {
  try {
    const analytics = await getUnifiedAnalytics(filters)
    
    if (!analytics.success || !analytics.data) {
      return {
        success: false,
        error: 'Failed to get analytics data',
        message: 'Could not calculate source ROI'
      }
    }

    const sourceROI = analytics.data.sourceComparison.map(source => ({
      source: source.source,
      totalLeads: source.clientLeads + source.guardLeads,
      clientLeads: source.clientLeads,
      guardLeads: source.guardLeads,
      conversionRate: source.efficiency,
      averageValue: source.totalROI > 0 ? source.totalROI / Math.max(1, source.clientConversions + source.guardConversions) : 0,
      averageScore: source.efficiency,
      costPerLead: 0, // Would need cost data
      roi: source.totalROI,
      trend: 'stable' as const, // TODO: Calculate actual trend
      percentChange: 0 // TODO: Calculate actual percentage change
    }))

    return {
      success: true,
      data: sourceROI,
      message: 'Source ROI analysis calculated successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to calculate source ROI analysis'
    }
  }
}