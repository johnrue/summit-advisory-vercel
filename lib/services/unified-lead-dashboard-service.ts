import { supabase } from '@/lib/supabase'
import { 
  UnifiedLead, 
  LeadAnalytics, 
  FilterCriteria, 
  UnifiedLeadResponse,
  UnifiedLeadListResponse,
  SourcePerformance,
  PipelineVelocity,
  ManagerPerformance,
  ConversionMetrics,
  SourceAttribution,
  LeadSource,
  LeadStatus
} from '@/lib/types/unified-leads'
import { ApiResponse } from '@/lib/types'

export class UnifiedLeadDashboardService {
  /**
   * Get unified leads with filtering and pagination
   */
  static async getUnifiedLeads(
    filters: FilterCriteria = {},
    page = 1,
    limit = 20
  ): Promise<ApiResponse<UnifiedLeadListResponse>> {
    try {
      const offset = (page - 1) * limit
      
      // Build the unified query combining client and guard leads
      const { clientLeads, guardLeads, totalCount } = await this.fetchLeadsFromSources(
        filters, 
        offset, 
        limit
      )
      
      // Combine and normalize leads
      const unifiedLeads = await this.normalizeLeads([...clientLeads, ...guardLeads])
      
      // Calculate analytics for the current result set
      const analytics = await this.calculateAnalytics(filters)
      
      return {
        success: true,
        data: {
          leads: unifiedLeads,
          pagination: {
            page,
            limit,
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          },
          analytics,
          filters
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch unified leads'
      }
    }
  }

  /**
   * Get detailed lead analytics
   */
  static async getLeadAnalytics(filters: FilterCriteria = {}): Promise<ApiResponse<LeadAnalytics>> {
    try {
      const analytics = await this.calculateAnalytics(filters)
      
      return {
        success: true,
        data: analytics
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate analytics'
      }
    }
  }

  /**
   * Get single unified lead by ID
   */
  static async getUnifiedLead(leadId: string, leadType: 'client' | 'guard'): Promise<ApiResponse<UnifiedLeadResponse>> {
    try {
      let lead: UnifiedLead | null = null
      
      if (leadType === 'client') {
        lead = await this.fetchClientLead(leadId)
      } else {
        lead = await this.fetchGuardLead(leadId)
      }
      
      if (!lead) {
        return {
          success: false,
          error: 'Lead not found'
        }
      }
      
      // Calculate lead-specific analytics
      const leadAnalytics = await this.calculateLeadSpecificAnalytics(lead)
      
      return {
        success: true,
        data: {
          lead,
          analytics: leadAnalytics
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch lead'
      }
    }
  }

  /**
   * Fetch leads from both client and guard sources
   */
  private static async fetchLeadsFromSources(
    filters: FilterCriteria,
    offset: number,
    limit: number
  ) {
    const clientLeadsPromise = this.fetchClientLeadsFromDatabase(filters, offset, limit)
    const guardLeadsPromise = this.fetchGuardLeadsFromDatabase(filters, offset, limit)
    
    const [clientResult, guardResult] = await Promise.all([
      clientLeadsPromise,
      guardLeadsPromise
    ])
    
    return {
      clientLeads: clientResult.leads,
      guardLeads: guardResult.leads,
      totalCount: clientResult.count + guardResult.count
    }
  }

  /**
   * Fetch client leads from consultation_requests table
   */
  private static async fetchClientLeadsFromDatabase(
    filters: FilterCriteria,
    offset: number,
    limit: number
  ) {
    let query = supabase
      .from('consultation_requests')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        service_type,
        message,
        status,
        created_at,
        updated_at
      `, { count: 'exact' })
    
    // Apply client-specific filters
    if (filters.leadType && !filters.leadType.includes('client')) {
      return { leads: [], count: 0 }
    }
    
    if (filters.statuses) {
      query = query.in('status', this.mapToClientStatuses(filters.statuses))
    }
    
    if (filters.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end)
    }
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    const { data, count, error } = await query
    
    if (error) {
      throw new Error(`Failed to fetch client leads: ${error.message}`)
    }
    
    return {
      leads: data || [],
      count: count || 0
    }
  }

  /**
   * Fetch guard leads from guard_leads table
   */
  private static async fetchGuardLeadsFromDatabase(
    filters: FilterCriteria,
    offset: number,
    limit: number
  ) {
    let query = supabase
      .from('guard_leads')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        lead_source,
        source_details,
        status,
        notes,
        assigned_manager_id,
        created_at,
        updated_at
      `, { count: 'exact' })
    
    // Apply guard-specific filters
    if (filters.leadType && !filters.leadType.includes('guard')) {
      return { leads: [], count: 0 }
    }
    
    if (filters.statuses) {
      query = query.in('status', this.mapToGuardStatuses(filters.statuses))
    }
    
    if (filters.sources) {
      query = query.in('lead_source', filters.sources)
    }
    
    if (filters.assignedUsers && filters.assignedUsers.length > 0) {
      query = query.in('assigned_manager_id', filters.assignedUsers)
    }
    
    if (filters.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end)
    }
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    const { data, count, error } = await query
    
    if (error) {
      throw new Error(`Failed to fetch guard leads: ${error.message}`)
    }
    
    return {
      leads: data || [],
      count: count || 0
    }
  }

  /**
   * Normalize database leads to unified format
   */
  private static async normalizeLeads(rawLeads: any[]): Promise<UnifiedLead[]> {
    const normalizedLeads: UnifiedLead[] = []
    
    for (const rawLead of rawLeads) {
      const isClientLead = rawLead.service_type !== undefined
      
      const unifiedLead: UnifiedLead = {
        id: rawLead.id,
        type: isClientLead ? 'client' : 'guard',
        source: this.determineLeadSource(rawLead) as LeadSource,
        status: this.normalizeStatus(rawLead.status, isClientLead) as LeadStatus,
        priority: this.calculatePriority(rawLead),
        assignedManager: rawLead.assigned_manager_id,
        createdAt: new Date(rawLead.created_at),
        updatedAt: new Date(rawLead.updated_at),
        sourceAttribution: this.buildSourceAttribution(rawLead),
        conversionMetrics: await this.calculateConversionMetrics(rawLead),
        engagementScore: this.calculateEngagementScore(rawLead),
        responseTime: await this.calculateResponseTime(rawLead.id, isClientLead)
      }
      
      // Add type-specific information
      if (isClientLead) {
        unifiedLead.clientInfo = {
          firstName: rawLead.first_name,
          lastName: rawLead.last_name,
          email: rawLead.email,
          phone: rawLead.phone,
          serviceType: rawLead.service_type,
          message: rawLead.message
        }
        unifiedLead.serviceRequirements = {
          serviceTypes: [rawLead.service_type],
          locations: [], // Would be populated from additional client data
          startDate: undefined, // Would be populated from consultation details
          endDate: undefined
        }
        unifiedLead.estimatedValue = this.estimateClientValue(rawLead.service_type)
      } else {
        unifiedLead.guardInfo = {
          firstName: rawLead.first_name,
          lastName: rawLead.last_name,
          email: rawLead.email,
          phone: rawLead.phone,
          hasSecurityExperience: false, // Would be populated from application data
          hasLicense: false, // Would be populated from application data
          preferredShifts: [],
          preferredLocations: [],
          availability: {
            fullTime: true,
            partTime: false,
            weekdays: true,
            weekends: false,
            nights: false,
            holidays: false
          },
          transportationAvailable: true
        }
        unifiedLead.qualificationScore = await this.calculateQualificationScore(rawLead.id)
      }
      
      normalizedLeads.push(unifiedLead)
    }
    
    return normalizedLeads
  }

  /**
   * Calculate comprehensive analytics
   */
  private static async calculateAnalytics(filters: FilterCriteria): Promise<LeadAnalytics> {
    // Get base counts
    const { clientCount, guardCount, totalCount } = await this.getLeadCounts(filters)
    
    // Calculate conversion rates
    const conversionRate = await this.calculateOverallConversionRate(filters)
    
    // Get source performance
    const sourcePerformance = await this.calculateSourcePerformance(filters)
    
    // Calculate pipeline velocity
    const pipelineVelocity = await this.calculatePipelineVelocity(filters)
    
    // Get manager performance
    const managerPerformance = await this.calculateManagerPerformance(filters)
    
    // Calculate average response time
    const averageResponseTime = await this.calculateAverageResponseTime(filters)
    
    return {
      totalLeads: totalCount,
      clientLeads: clientCount,
      guardLeads: guardCount,
      conversionRate,
      averageResponseTime,
      sourcePerformance,
      pipelineVelocity,
      managerPerformance
    }
  }

  /**
   * Helper methods for data processing
   */
  private static determineLeadSource(rawLead: any): string {
    if (rawLead.lead_source) {
      return rawLead.lead_source
    }
    // For client leads from consultation requests, default to website
    return 'website'
  }

  private static normalizeStatus(status: string, isClientLead: boolean): string {
    const statusMappings = {
      client: {
        'new': 'new',
        'contacted': 'contacted',
        'scheduled': 'qualified',
        'completed': 'converted',
        'cancelled': 'lost'
      },
      guard: {
        'new': 'new',
        'contacted': 'contacted',
        'application-sent': 'qualified',
        'hired': 'converted',
        'rejected': 'lost',
        'unresponsive': 'lost'
      }
    }
    
    const mappings = isClientLead ? statusMappings.client : statusMappings.guard
    return (mappings as Record<string, string>)[status] || status
  }

  private static calculatePriority(rawLead: any): 'low' | 'medium' | 'high' | 'critical' {
    // Business logic for priority calculation
    const createdAt = new Date(rawLead.created_at)
    const hoursOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
    
    if (hoursOld < 1) return 'critical'
    if (hoursOld < 24) return 'high'
    if (hoursOld < 72) return 'medium'
    return 'low'
  }

  private static buildSourceAttribution(rawLead: any): SourceAttribution {
    return {
      originalSource: this.determineLeadSource(rawLead) as LeadSource,
      sourceDetails: rawLead.source_details ? JSON.parse(rawLead.source_details) : {},
      utmParameters: rawLead.utm_parameters ? JSON.parse(rawLead.utm_parameters) : undefined,
      campaignId: rawLead.campaign_id,
      referralPath: []
    }
  }

  private static async calculateConversionMetrics(rawLead: any): Promise<ConversionMetrics> {
    // Placeholder - would calculate based on interaction history
    return {
      contactCount: 0,
      timeToFirstContact: undefined,
      timeToConversion: undefined,
      emailOpens: 0,
      emailClicks: 0,
      formViews: 1,
      formCompletions: 1
    }
  }

  private static calculateEngagementScore(rawLead: any): number {
    // Placeholder engagement scoring logic
    let score = 50 // Base score
    
    if (rawLead.phone) score += 10
    if (rawLead.message && rawLead.message.length > 50) score += 20
    if (rawLead.assigned_manager_id) score += 15
    
    return Math.min(100, score)
  }

  private static async calculateResponseTime(leadId: string, isClientLead: boolean): Promise<number> {
    // Placeholder - would calculate based on first manager contact
    return 0
  }

  private static estimateClientValue(serviceType: string): number {
    const valueMappings: Record<string, number> = {
      'armed': 50000,
      'unarmed': 30000,
      'event': 15000,
      'executive': 75000,
      'commercial': 40000,
      'consulting': 25000
    }
    
    return valueMappings[serviceType] || 30000
  }

  private static async calculateQualificationScore(guardLeadId: string): Promise<number> {
    // Placeholder - would use the existing guard lead scoring service
    return 75
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

  /**
   * Analytics calculation methods (placeholders for now)
   */
  private static async getLeadCounts(filters: FilterCriteria) {
    // Would implement actual count queries
    return { clientCount: 0, guardCount: 0, totalCount: 0 }
  }

  private static async calculateOverallConversionRate(filters: FilterCriteria): Promise<number> {
    return 15.5 // Placeholder
  }

  private static async calculateSourcePerformance(filters: FilterCriteria): Promise<SourcePerformance[]> {
    return [] // Placeholder
  }

  private static async calculatePipelineVelocity(filters: FilterCriteria): Promise<PipelineVelocity> {
    return {
      averageStageTransition: {},
      bottleneckStages: [],
      averageConversionTime: 0,
      stageConversionRates: {}
    }
  }

  private static async calculateManagerPerformance(filters: FilterCriteria): Promise<ManagerPerformance[]> {
    return [] // Placeholder
  }

  private static async calculateAverageResponseTime(filters: FilterCriteria): Promise<number> {
    return 2.5 // Placeholder - hours
  }

  private static async fetchClientLead(leadId: string): Promise<UnifiedLead | null> {
    // Would fetch and normalize single client lead
    return null
  }

  private static async fetchGuardLead(leadId: string): Promise<UnifiedLead | null> {
    // Would fetch and normalize single guard lead
    return null
  }

  private static async calculateLeadSpecificAnalytics(lead: UnifiedLead) {
    // Would calculate lead-specific metrics
    return {}
  }
}