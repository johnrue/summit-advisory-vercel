import { supabase } from '@/lib/supabase'
import { 
  LeadAnalytics,
  SourcePerformance, 
  PipelineVelocity,
  ManagerPerformance,
  FilterCriteria,
  UnifiedLead
} from '@/lib/types/unified-leads'
import { ApiResponse } from '@/lib/types'

export class CrossPipelineAnalyticsService {
  /**
   * Calculate comprehensive cross-pipeline analytics
   */
  static async calculateCrossPipelineAnalytics(
    filters: FilterCriteria = {},
    includeHistoricalTrends: boolean = false
  ): Promise<ApiResponse<LeadAnalytics & { historicalTrends?: any }>> {
    try {
      // Run all analytics calculations in parallel
      const [
        leadCounts,
        conversionRates,
        sourcePerformance,
        pipelineVelocity,
        managerPerformance,
        responseMetrics,
        historicalTrends
      ] = await Promise.all([
        this.calculateLeadCounts(filters),
        this.calculateConversionRates(filters),
        this.calculateSourcePerformance(filters),
        this.calculatePipelineVelocity(filters),
        this.calculateManagerPerformance(filters),
        this.calculateResponseMetrics(filters),
        includeHistoricalTrends ? this.calculateHistoricalTrends(filters) : Promise.resolve(null)
      ])

      const analytics: LeadAnalytics = {
        totalLeads: leadCounts.total,
        clientLeads: leadCounts.client,
        guardLeads: leadCounts.guard,
        conversionRate: conversionRates.overall,
        averageResponseTime: responseMetrics.averageResponseTime,
        sourcePerformance,
        pipelineVelocity,
        managerPerformance
      }

      return {
        success: true,
        data: {
          ...analytics,
          ...(historicalTrends && { historicalTrends })
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate analytics'
      }
    }
  }

  /**
   * Calculate lead counts across both pipelines
   */
  private static async calculateLeadCounts(filters: FilterCriteria) {
    const clientCountPromise = this.getClientLeadCount(filters)
    const guardCountPromise = this.getGuardLeadCount(filters)

    const [clientCount, guardCount] = await Promise.all([
      clientCountPromise,
      guardCountPromise
    ])

    return {
      client: clientCount,
      guard: guardCount,
      total: clientCount + guardCount
    }
  }

  /**
   * Calculate conversion rates for both pipelines
   */
  private static async calculateConversionRates(filters: FilterCriteria) {
    const [clientRates, guardRates] = await Promise.all([
      this.calculateClientConversionRate(filters),
      this.calculateGuardConversionRate(filters)
    ])

    // Weight by lead volume for overall rate
    const totalLeads = clientRates.totalLeads + guardRates.totalLeads
    const overallRate = totalLeads > 0 
      ? ((clientRates.rate * clientRates.totalLeads) + (guardRates.rate * guardRates.totalLeads)) / totalLeads
      : 0

    return {
      overall: overallRate,
      client: clientRates.rate,
      guard: guardRates.rate
    }
  }

  /**
   * Calculate source performance across both pipelines
   */
  private static async calculateSourcePerformance(filters: FilterCriteria): Promise<SourcePerformance[]> {
    const [clientSourceData, guardSourceData] = await Promise.all([
      this.getClientSourcePerformance(filters),
      this.getGuardSourcePerformance(filters)
    ])

    // Combine and aggregate source data
    const combinedSources = new Map<string, SourcePerformance>()

    // Process client sources
    clientSourceData.forEach(source => {
      combinedSources.set(source.source, {
        source: source.source,
        totalLeads: source.clientLeads,
        clientLeads: source.clientLeads,
        guardLeads: 0,
        conversionRate: source.conversionRate,
        averageValue: source.averageValue,
        averageScore: source.averageScore,
        costPerLead: source.costPerLead,
        roi: source.roi
      })
    })

    // Process guard sources and merge
    guardSourceData.forEach(source => {
      const existing = combinedSources.get(source.source)
      if (existing) {
        existing.totalLeads += source.guardLeads
        existing.guardLeads = source.guardLeads
        // Weighted average for rates and scores
        existing.conversionRate = (existing.conversionRate + source.conversionRate) / 2
        existing.averageScore = (existing.averageScore + source.averageScore) / 2
        existing.costPerLead = existing.costPerLead || source.costPerLead
      } else {
        combinedSources.set(source.source, {
          source: source.source,
          totalLeads: source.guardLeads,
          clientLeads: 0,
          guardLeads: source.guardLeads,
          conversionRate: source.conversionRate,
          averageValue: 0, // Guards don't have direct value
          averageScore: source.averageScore,
          costPerLead: source.costPerLead,
          roi: source.roi
        })
      }
    })

    return Array.from(combinedSources.values()).sort((a, b) => b.totalLeads - a.totalLeads)
  }

  /**
   * Calculate pipeline velocity metrics
   */
  private static async calculatePipelineVelocity(filters: FilterCriteria): Promise<PipelineVelocity> {
    const [clientVelocity, guardVelocity] = await Promise.all([
      this.calculateClientPipelineVelocity(filters),
      this.calculateGuardPipelineVelocity(filters)
    ])

    // Combine velocity metrics
    const combinedStageTransitions: Record<string, number> = {}
    const combinedConversionRates: Record<string, number> = {}
    const allBottlenecks = [...clientVelocity.bottleneckStages, ...guardVelocity.bottleneckStages]

    // Merge stage transitions
    Object.entries(clientVelocity.averageStageTransition).forEach(([stage, duration]) => {
      combinedStageTransitions[`client_${stage}`] = duration
    })
    Object.entries(guardVelocity.averageStageTransition).forEach(([stage, duration]) => {
      combinedStageTransitions[`guard_${stage}`] = duration
    })

    // Merge conversion rates
    Object.entries(clientVelocity.stageConversionRates).forEach(([stage, rate]) => {
      combinedConversionRates[`client_${stage}`] = rate
    })
    Object.entries(guardVelocity.stageConversionRates).forEach(([stage, rate]) => {
      combinedConversionRates[`guard_${stage}`] = rate
    })

    return {
      averageStageTransition: combinedStageTransitions,
      bottleneckStages: Array.from(new Set(allBottlenecks)),
      averageConversionTime: (clientVelocity.averageConversionTime + guardVelocity.averageConversionTime) / 2,
      stageConversionRates: combinedConversionRates
    }
  }

  /**
   * Calculate manager performance across both pipelines
   */
  private static async calculateManagerPerformance(filters: FilterCriteria): Promise<ManagerPerformance[]> {
    // Get all active managers
    const { data: managers, error } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        users!inner(
          first_name,
          last_name
        ),
        roles!inner(name)
      `)
      .eq('roles.name', 'manager')
      .eq('status', 'active')

    if (error || !managers) {
      throw new Error('Failed to fetch managers')
    }

    // Calculate performance for each manager
    const managerPerformance = await Promise.all(
      managers.map(async (manager) => {
        const [clientMetrics, guardMetrics, responseTime] = await Promise.all([
          this.calculateManagerClientMetrics(manager.user_id, filters),
          this.calculateManagerGuardMetrics(manager.user_id, filters),
          this.calculateManagerResponseTime(manager.user_id, filters)
        ])

        return {
          managerId: manager.user_id,
          managerName: `${manager.users.first_name} ${manager.users.last_name}`,
          totalAssigned: clientMetrics.totalAssigned + guardMetrics.totalAssigned,
          clientLeads: clientMetrics.totalAssigned,
          guardLeads: guardMetrics.totalAssigned,
          totalConverted: clientMetrics.totalConverted + guardMetrics.totalConverted,
          conversionRate: this.calculateWeightedConversionRate(clientMetrics, guardMetrics),
          averageResponseTime: responseTime,
          totalValue: clientMetrics.totalValue,
          currentWorkload: clientMetrics.currentWorkload + guardMetrics.currentWorkload
        }
      })
    )

    return managerPerformance.sort((a, b) => b.conversionRate - a.conversionRate)
  }

  /**
   * Calculate response metrics
   */
  private static async calculateResponseMetrics(filters: FilterCriteria) {
    const [clientResponseTime, guardResponseTime] = await Promise.all([
      this.calculateClientResponseTime(filters),
      this.calculateGuardResponseTime(filters)
    ])

    return {
      averageResponseTime: (clientResponseTime + guardResponseTime) / 2,
      clientResponseTime,
      guardResponseTime
    }
  }

  /**
   * Calculate historical trends
   */
  private static async calculateHistoricalTrends(filters: FilterCriteria) {
    const endDate = filters.dateRange?.end ? new Date(filters.dateRange.end) : new Date()
    const startDate = filters.dateRange?.start ? new Date(filters.dateRange.start) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days ago

    const timeSeriesData = await this.generateTimeSeriesData(startDate, endDate, filters)

    return {
      timeSeriesData,
      trends: this.calculateTrendMetrics(timeSeriesData)
    }
  }

  /**
   * Helper methods for specific calculations
   */
  private static async getClientLeadCount(filters: FilterCriteria): Promise<number> {
    let query = supabase
      .from('consultation_requests')
      .select('id', { count: 'exact', head: true })

    query = this.applyClientFilters(query, filters)

    const { count, error } = await query

    if (error) {
      throw new Error(`Failed to count client leads: ${error.message}`)
    }

    return count || 0
  }

  private static async getGuardLeadCount(filters: FilterCriteria): Promise<number> {
    let query = supabase
      .from('guard_leads')
      .select('id', { count: 'exact', head: true })

    query = this.applyGuardFilters(query, filters)

    const { count, error } = await query

    if (error) {
      throw new Error(`Failed to count guard leads: ${error.message}`)
    }

    return count || 0
  }

  private static async calculateClientConversionRate(filters: FilterCriteria) {
    // Get total client leads
    const totalQuery = supabase
      .from('consultation_requests')
      .select('id', { count: 'exact', head: true })

    const totalResult = await this.applyClientFilters(totalQuery, filters)

    // Get converted client leads
    const convertedQuery = supabase
      .from('consultation_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['completed'])

    const convertedResult = await this.applyClientFilters(convertedQuery, filters)

    const [totalData, convertedData] = await Promise.all([totalResult, convertedResult])

    const totalLeads = totalData.count || 0
    const convertedLeads = convertedData.count || 0

    return {
      totalLeads,
      convertedLeads,
      rate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
    }
  }

  private static async calculateGuardConversionRate(filters: FilterCriteria) {
    // Get total guard leads
    const totalQuery = supabase
      .from('guard_leads')
      .select('id', { count: 'exact', head: true })

    const totalResult = await this.applyGuardFilters(totalQuery, filters)

    // Get converted guard leads (hired)
    const convertedQuery = supabase
      .from('guard_leads')
      .select('id', { count: 'exact', head: true })
      .in('status', ['hired'])

    const convertedResult = await this.applyGuardFilters(convertedQuery, filters)

    const [totalData, convertedData] = await Promise.all([totalResult, convertedResult])

    const totalLeads = totalData.count || 0
    const convertedLeads = convertedData.count || 0

    return {
      totalLeads,
      convertedLeads,
      rate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
    }
  }

  private static async getClientSourcePerformance(filters: FilterCriteria): Promise<SourcePerformance[]> {
    // Client leads are primarily from website, implement source tracking
    return [{
      source: 'website',
      totalLeads: 0,
      clientLeads: 0,
      guardLeads: 0,
      conversionRate: 0,
      averageValue: 0,
      averageScore: 0
    }]
  }

  private static async getGuardSourcePerformance(filters: FilterCriteria): Promise<SourcePerformance[]> {
    const { data, error } = await supabase
      .from('guard_leads')
      .select('lead_source, status')

    if (error) {
      throw new Error(`Failed to get guard source performance: ${error.message}`)
    }

    // Group by source and calculate metrics
    const sourceGroups = (data || []).reduce((acc, lead) => {
      const source = lead.lead_source
      if (!acc[source]) {
        acc[source] = { total: 0, converted: 0 }
      }
      acc[source].total++
      if (lead.status === 'hired') {
        acc[source].converted++
      }
      return acc
    }, {} as Record<string, { total: number, converted: number }>)

    return Object.entries(sourceGroups).map(([source, metrics]) => ({
      source: source as any,
      totalLeads: metrics.total,
      clientLeads: 0,
      guardLeads: metrics.total,
      conversionRate: metrics.total > 0 ? (metrics.converted / metrics.total) * 100 : 0,
      averageValue: 0,
      averageScore: 75, // Placeholder
      costPerLead: 50, // Placeholder
      roi: 200 // Placeholder
    }))
  }

  private static async calculateClientPipelineVelocity(filters: FilterCriteria): Promise<PipelineVelocity> {
    return {
      averageStageTransition: {
        'new_to_contacted': 24, // hours
        'contacted_to_scheduled': 72,
        'scheduled_to_completed': 168
      },
      bottleneckStages: ['contacted_to_scheduled'],
      averageConversionTime: 7, // days
      stageConversionRates: {
        'new_to_contacted': 85,
        'contacted_to_scheduled': 65,
        'scheduled_to_completed': 90
      }
    }
  }

  private static async calculateGuardPipelineVelocity(filters: FilterCriteria): Promise<PipelineVelocity> {
    return {
      averageStageTransition: {
        'new_to_contacted': 12, // hours
        'contacted_to_application': 48,
        'application_to_interview': 120,
        'interview_to_hired': 72
      },
      bottleneckStages: ['application_to_interview'],
      averageConversionTime: 14, // days
      stageConversionRates: {
        'new_to_contacted': 90,
        'contacted_to_application': 70,
        'application_to_interview': 60,
        'interview_to_hired': 80
      }
    }
  }

  private static async calculateManagerClientMetrics(managerId: string, filters: FilterCriteria) {
    return {
      totalAssigned: 0,
      totalConverted: 0,
      totalValue: 0,
      currentWorkload: 0
    }
  }

  private static async calculateManagerGuardMetrics(managerId: string, filters: FilterCriteria) {
    const { data, error } = await supabase
      .from('guard_leads')
      .select('status')
      .eq('assigned_manager_id', managerId)

    if (error) {
      return { totalAssigned: 0, totalConverted: 0, currentWorkload: 0 }
    }

    const leads = data || []
    const totalAssigned = leads.length
    const totalConverted = leads.filter(lead => lead.status === 'hired').length
    const currentWorkload = leads.filter(lead => !['hired', 'rejected'].includes(lead.status)).length

    return {
      totalAssigned,
      totalConverted,
      currentWorkload
    }
  }

  private static async calculateManagerResponseTime(managerId: string, filters: FilterCriteria): Promise<number> {
    // Placeholder - would calculate based on actual response data
    return 2.5 // hours
  }

  private static calculateWeightedConversionRate(clientMetrics: any, guardMetrics: any): number {
    const totalAssigned = clientMetrics.totalAssigned + guardMetrics.totalAssigned
    const totalConverted = clientMetrics.totalConverted + guardMetrics.totalConverted
    
    return totalAssigned > 0 ? (totalConverted / totalAssigned) * 100 : 0
  }

  private static async calculateClientResponseTime(filters: FilterCriteria): Promise<number> {
    // Placeholder - would calculate based on actual client response data
    return 3.0 // hours
  }

  private static async calculateGuardResponseTime(filters: FilterCriteria): Promise<number> {
    // Placeholder - would calculate based on actual guard response data
    return 2.0 // hours
  }

  private static async generateTimeSeriesData(startDate: Date, endDate: Date, filters: FilterCriteria) {
    // Generate daily data points between start and end date
    const timeSeriesData = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      
      // Get lead counts for this date
      const dayFilters = {
        ...filters,
        dateRange: {
          start: dateStr,
          end: dateStr
        }
      }

      const [clientCount, guardCount] = await Promise.all([
        this.getClientLeadCount(dayFilters),
        this.getGuardLeadCount(dayFilters)
      ])

      timeSeriesData.push({
        date: dateStr,
        clientLeads: clientCount,
        guardLeads: guardCount,
        totalLeads: clientCount + guardCount
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return timeSeriesData
  }

  private static calculateTrendMetrics(timeSeriesData: any[]) {
    if (timeSeriesData.length < 2) {
      return {
        clientLeadTrend: 0,
        guardLeadTrend: 0,
        totalLeadTrend: 0
      }
    }

    const first = timeSeriesData[0]
    const last = timeSeriesData[timeSeriesData.length - 1]

    return {
      clientLeadTrend: this.calculatePercentageChange(first.clientLeads, last.clientLeads),
      guardLeadTrend: this.calculatePercentageChange(first.guardLeads, last.guardLeads),
      totalLeadTrend: this.calculatePercentageChange(first.totalLeads, last.totalLeads)
    }
  }

  private static calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0
    return ((newValue - oldValue) / oldValue) * 100
  }

  /**
   * Filter application helpers
   */
  private static applyClientFilters(query: any, filters: FilterCriteria): any {
    if (filters.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end)
    }

    if (filters.statuses) {
      const clientStatuses = this.mapToClientStatuses(filters.statuses)
      query = query.in('status', clientStatuses)
    }

    return query
  }

  private static applyGuardFilters(query: any, filters: FilterCriteria): any {
    if (filters.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end)
    }

    if (filters.statuses) {
      const guardStatuses = this.mapToGuardStatuses(filters.statuses)
      query = query.in('status', guardStatuses)
    }

    if (filters.sources) {
      query = query.in('lead_source', filters.sources)
    }

    if (filters.assignedUsers && filters.assignedUsers.length > 0) {
      query = query.in('assigned_manager_id', filters.assignedUsers)
    }

    return query
  }

  private static mapToClientStatuses(unifiedStatuses: string[]): string[] {
    const mappings: Record<string, string> = {
      'new': 'new',
      'contacted': 'contacted',
      'qualified': 'scheduled',
      'converted': 'completed',
      'lost': 'cancelled'
    }
    
    return unifiedStatuses.map(status => mappings[status] || status)
  }

  private static mapToGuardStatuses(unifiedStatuses: string[]): string[] {
    const mappings: Record<string, string> = {
      'new': 'new',
      'contacted': 'contacted', 
      'qualified': 'application-sent',
      'converted': 'hired',
      'lost': 'rejected'
    }
    
    return unifiedStatuses.map(status => mappings[status] || status)
  }
}