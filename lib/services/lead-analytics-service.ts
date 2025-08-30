import { supabase } from '@/lib/supabase'
import type { ApiResponse } from '@/lib/types'

export interface LeadAnalytics {
  overview: {
    totalLeads: number
    thisMonth: number
    lastMonth: number
    growthRate: number
    conversionRate: number
    averageValue: number
  }
  sourcePerformance: {
    source: string
    totalLeads: number
    convertedLeads: number
    conversionRate: number
    averageValue: number
    roi: number
  }[]
  statusDistribution: {
    status: string
    count: number
    percentage: number
  }[]
  managerPerformance: {
    managerId: string
    managerName: string
    assignedLeads: number
    contactedLeads: number
    convertedLeads: number
    averageResponseTime: number
    conversionRate: number
  }[]
  timeSeriesData: {
    period: string
    totalLeads: number
    convertedLeads: number
    conversionRate: number
  }[]
  topPerformingCampaigns: {
    campaign: string
    source: string
    leads: number
    conversions: number
    conversionRate: number
    value: number
  }[]
}

export interface AnalyticsFilters {
  startDate: string
  endDate: string
  sources?: string[]
  managers?: string[]
  statuses?: string[]
}

/**
 * Get comprehensive lead analytics
 * @param filters - Date range and filter criteria
 * @returns Promise with analytics data
 */
export async function getLeadAnalytics(filters: AnalyticsFilters): Promise<ApiResponse<LeadAnalytics>> {
  try {
    // Build base query with filters
    let baseQuery = supabase
      .from('client_leads')
      .select('*')
      .gte('created_at', filters.startDate)
      .lte('created_at', filters.endDate)

    if (filters.sources && filters.sources.length > 0) {
      baseQuery = baseQuery.in('source_type', filters.sources)
    }
    if (filters.managers && filters.managers.length > 0) {
      baseQuery = baseQuery.in('assigned_to', filters.managers)
    }
    if (filters.statuses && filters.statuses.length > 0) {
      baseQuery = baseQuery.in('status', filters.statuses)
    }

    const { data: leads, error } = await baseQuery

    if (error) {
      throw new Error(`Failed to fetch leads: ${error.message}`)
    }

    if (!leads) {
      throw new Error('No leads data returned')
    }

    // Calculate overview metrics
    const totalLeads = leads.length
    const convertedLeads = leads.filter(l => l.status === 'won').length
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
    
    const validValues = leads.filter(l => l.estimated_value != null).map(l => l.estimated_value)
    const averageValue = validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 0

    // Get previous month data for comparison
    const startDate = new Date(filters.startDate)
    const endDate = new Date(filters.endDate)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24))
    
    const prevStartDate = new Date(startDate)
    prevStartDate.setDate(prevStartDate.getDate() - daysDiff)
    const prevEndDate = new Date(startDate)

    const { data: prevLeads } = await supabase
      .from('client_leads')
      .select('*')
      .gte('created_at', prevStartDate.toISOString())
      .lte('created_at', prevEndDate.toISOString())

    const thisMonth = totalLeads
    const lastMonth = prevLeads?.length || 0
    const growthRate = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0

    // Calculate source performance
    const sourceGroups = leads.reduce((acc, lead) => {
      if (!acc[lead.source_type]) {
        acc[lead.source_type] = []
      }
      acc[lead.source_type].push(lead)
      return acc
    }, {} as Record<string, any[]>)

    const sourcePerformance = Object.entries(sourceGroups).map(([source, sourceLeads]) => {
      const converted = sourceLeads.filter(l => l.status === 'won').length
      const convRate = sourceLeads.length > 0 ? (converted / sourceLeads.length) * 100 : 0
      const values = sourceLeads.filter(l => l.estimated_value != null).map(l => l.estimated_value)
      const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
      
      // Simplified ROI calculation (would need cost data in real implementation)
      const roi = converted > 0 ? (converted * avgValue) / sourceLeads.length : 0

      return {
        source,
        totalLeads: sourceLeads.length,
        convertedLeads: converted,
        conversionRate: convRate,
        averageValue: avgValue,
        roi
      }
    }).sort((a, b) => b.conversionRate - a.conversionRate)

    // Calculate status distribution
    const statusGroups = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const statusDistribution = Object.entries(statusGroups).map(([status, count]) => ({
      status,
      count,
      percentage: totalLeads > 0 ? (count / totalLeads) * 100 : 0
    })).sort((a, b) => b.count - a.count)

    // Get manager performance data
    const managersWithLeads = leads.filter(l => l.assigned_to)
    const managerGroups = managersWithLeads.reduce((acc, lead) => {
      if (!acc[lead.assigned_to]) {
        acc[lead.assigned_to] = []
      }
      acc[lead.assigned_to].push(lead)
      return acc
    }, {} as Record<string, any[]>)

    // Fetch manager details
    const managerIds = Object.keys(managerGroups)
    const { data: managers } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        users!inner(first_name, last_name)
      `)
      .in('user_id', managerIds)

    const managerPerformance = Object.entries(managerGroups).map(([managerId, managerLeads]) => {
      const manager = managers?.find(m => m.user_id === managerId)
      const contacted = managerLeads.filter(l => l.last_contact_date != null).length
      const converted = managerLeads.filter(l => l.status === 'won').length
      const convRate = managerLeads.length > 0 ? (converted / managerLeads.length) * 100 : 0
      
      // Calculate average response time
      const responseTimes = managerLeads
        .filter(l => l.assigned_at && l.last_contact_date)
        .map(l => {
          const assigned = new Date(l.assigned_at!)
          const contacted = new Date(l.last_contact_date!)
          return Math.max(0, (contacted.getTime() - assigned.getTime()) / (1000 * 60)) // minutes
        })
      
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0

      return {
        managerId,
        managerName: manager 
          ? `${manager.users.first_name} ${manager.users.last_name}`
          : 'Unknown Manager',
        assignedLeads: managerLeads.length,
        contactedLeads: contacted,
        convertedLeads: converted,
        averageResponseTime: Math.round(avgResponseTime),
        conversionRate: convRate
      }
    }).sort((a, b) => b.conversionRate - a.conversionRate)

    // Generate time series data (weekly buckets)
    const timeSeriesData: { period: string, totalLeads: number, convertedLeads: number, conversionRate: number }[] = []
    const currentDate = new Date(filters.startDate)
    const endDateObj = new Date(filters.endDate)

    while (currentDate <= endDateObj) {
      const weekStart = new Date(currentDate)
      const weekEnd = new Date(currentDate)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      if (weekEnd > endDateObj) {
        weekEnd.setTime(endDateObj.getTime())
      }

      const weekLeads = leads.filter(l => {
        const leadDate = new Date(l.created_at)
        return leadDate >= weekStart && leadDate <= weekEnd
      })

      const weekConverted = weekLeads.filter(l => l.status === 'won').length
      const weekConvRate = weekLeads.length > 0 ? (weekConverted / weekLeads.length) * 100 : 0

      timeSeriesData.push({
        period: weekStart.toISOString().split('T')[0],
        totalLeads: weekLeads.length,
        convertedLeads: weekConverted,
        conversionRate: weekConvRate
      })

      currentDate.setDate(currentDate.getDate() + 7)
    }

    // Analyze campaigns from source details
    const campaignLeads = leads.filter(l => 
      l.source_details && 
      (l.source_details.campaignName || l.source_details.eventName)
    )

    const campaignGroups = campaignLeads.reduce((acc, lead) => {
      const campaign = lead.source_details.campaignName || lead.source_details.eventName || 'Unknown'
      const key = `${campaign}_${lead.source_type}`
      
      if (!acc[key]) {
        acc[key] = {
          campaign,
          source: lead.source_type,
          leads: [],
          conversions: 0,
          totalValue: 0
        }
      }
      
      acc[key].leads.push(lead)
      if (lead.status === 'won') {
        acc[key].conversions++
      }
      if (lead.estimated_value) {
        acc[key].totalValue += lead.estimated_value
      }
      
      return acc
    }, {} as Record<string, any>)

    const topPerformingCampaigns = Object.values(campaignGroups)
      .map((campaign: any) => ({
        campaign: campaign.campaign,
        source: campaign.source,
        leads: campaign.leads.length,
        conversions: campaign.conversions,
        conversionRate: campaign.leads.length > 0 ? (campaign.conversions / campaign.leads.length) * 100 : 0,
        value: campaign.totalValue
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 10)

    const analytics: LeadAnalytics = {
      overview: {
        totalLeads,
        thisMonth,
        lastMonth,
        growthRate,
        conversionRate,
        averageValue
      },
      sourcePerformance,
      statusDistribution,
      managerPerformance,
      timeSeriesData,
      topPerformingCampaigns
    }

    return {
      success: true,
      data: analytics,
      message: 'Analytics calculated successfully'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to calculate analytics'
    }
  }
}

/**
 * Export lead data for reporting
 * @param filters - Filter criteria for export
 * @param format - Export format
 * @returns Promise with export data
 */
export async function exportLeadData(
  filters: AnalyticsFilters,
  format: 'csv' | 'xlsx' = 'csv'
): Promise<ApiResponse<{ data: string, filename: string }>> {
  try {
    let query = supabase
      .from('client_leads')
      .select(`
        *,
        users!assigned_to(first_name, last_name)
      `)
      .gte('created_at', filters.startDate)
      .lte('created_at', filters.endDate)

    if (filters.sources && filters.sources.length > 0) {
      query = query.in('source_type', filters.sources)
    }
    if (filters.managers && filters.managers.length > 0) {
      query = query.in('assigned_to', filters.managers)
    }
    if (filters.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses)
    }

    const { data: leads, error } = await query

    if (error) {
      throw new Error(`Failed to fetch leads for export: ${error.message}`)
    }

    if (!leads || leads.length === 0) {
      throw new Error('No leads found for export')
    }

    // Generate CSV data
    const headers = [
      'ID',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Service Type',
      'Source',
      'Status',
      'Estimated Value',
      'Assigned To',
      'Created Date',
      'Last Contact',
      'Contact Count',
      'Qualification Score',
      'Notes'
    ]

    const csvRows = [headers.join(',')]

    for (const lead of leads) {
      const row = [
        lead.id,
        `"${lead.first_name}"`,
        `"${lead.last_name}"`,
        `"${lead.email}"`,
        `"${lead.phone}"`,
        `"${lead.service_type}"`,
        `"${lead.source_type}"`,
        `"${lead.status}"`,
        lead.estimated_value || '',
        lead.users ? `"${lead.users.first_name} ${lead.users.last_name}"` : '',
        new Date(lead.created_at).toLocaleDateString(),
        lead.last_contact_date ? new Date(lead.last_contact_date).toLocaleDateString() : '',
        lead.contact_count || 0,
        lead.qualification_score || 0,
        `"${lead.qualification_notes || ''}"`
      ]
      csvRows.push(row.join(','))
    }

    const csvData = csvRows.join('\n')
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `leads_export_${timestamp}.csv`

    return {
      success: true,
      data: { data: csvData, filename },
      message: `Exported ${leads.length} leads successfully`
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to export lead data'
    }
  }
}

/**
 * Get lead conversion funnel data
 * @param filters - Filter criteria
 * @returns Promise with funnel data
 */
export async function getConversionFunnel(
  filters: AnalyticsFilters
): Promise<ApiResponse<{ stage: string, count: number, percentage: number }[]>> {
  try {
    let query = supabase
      .from('client_leads')
      .select('status')
      .gte('created_at', filters.startDate)
      .lte('created_at', filters.endDate)

    if (filters.sources && filters.sources.length > 0) {
      query = query.in('source_type', filters.sources)
    }

    const { data: leads, error } = await query

    if (error) {
      throw new Error(`Failed to fetch funnel data: ${error.message}`)
    }

    const totalLeads = leads?.length || 0
    const statusOrder = ['prospect', 'contacted', 'qualified', 'proposal', 'negotiation', 'won']
    
    const statusCounts = leads?.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const funnelData = statusOrder.map(status => ({
      stage: status.charAt(0).toUpperCase() + status.slice(1),
      count: statusCounts[status] || 0,
      percentage: totalLeads > 0 ? ((statusCounts[status] || 0) / totalLeads) * 100 : 0
    }))

    return {
      success: true,
      data: funnelData,
      message: 'Conversion funnel calculated successfully'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to calculate conversion funnel'
    }
  }
}