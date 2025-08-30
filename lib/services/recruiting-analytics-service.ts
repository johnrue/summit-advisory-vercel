// Recruiting Analytics Service - Comprehensive funnel tracking and optimization
// Provides detailed analytics for recruiting pipeline performance and ROI

import { supabase } from '@/lib/supabase'
import type { 
  RecruitingFunnelData,
  RecruitingOptimizationRecommendations,
  GuardLead,
  GuardLeadSource,
  GuardLeadStage,
  RecruitingAnalyticsFilters,
  ApiResponse
} from '@/lib/types'

/**
 * Get comprehensive recruiting funnel analytics
 */
export async function getRecruitingFunnelAnalytics(
  filters?: RecruitingAnalyticsFilters
): Promise<ApiResponse<RecruitingFunnelData>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Build base query
    let query = supabase.from('guard_leads').select('*')

    // Apply filters
    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', `${filters.dateRange.end}T23:59:59.999Z`)
    }

    if (filters?.sources && filters.sources.length > 0) {
      query = query.in('source_type', filters.sources)
    }

    if (filters?.locations && filters.locations.length > 0) {
      query = query.overlaps('preferred_locations', filters.locations)
    }

    if (filters?.recruiterIds && filters.recruiterIds.length > 0) {
      query = query.in('assigned_recruiter', filters.recruiterIds)
    }

    const { data: leads, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    if (!leads) {
      return { success: false, error: 'No data found' }
    }

    // Calculate funnel data
    const funnelData = await calculateFunnelStages(leads, filters)
    const sourcePerformance = await calculateSourcePerformance(leads, filters)
    const campaignPerformance = await calculateCampaignPerformance(leads, filters)
    const geographicData = await calculateGeographicPerformance(leads, filters)
    const timeSeriesData = await calculateTimeSeriesData(leads, filters)

    const analytics: RecruitingFunnelData = {
      totalLeads: leads.length,
      stages: funnelData,
      sourcePerformance: sourcePerformance,
      campaignPerformance: campaignPerformance,
      geographicData: geographicData,
      timeSeriesData: timeSeriesData
    }

    return { success: true, data: analytics }
  } catch (error) {
    console.error('Error getting recruiting funnel analytics:', error)
    return { success: false, error: 'Failed to get recruiting funnel analytics' }
  }
}

/**
 * Calculate funnel stage performance
 */
async function calculateFunnelStages(
  leads: GuardLead[],
  filters?: RecruitingAnalyticsFilters
): Promise<Array<{
  stage: GuardLeadStage
  count: number
  conversionRate: number
  averageDuration: number
  dropOffRate: number
}>> {
  const stages: GuardLeadStage[] = [
    'initial_contact',
    'qualification',
    'application',
    'background_check',
    'interview',
    'decision',
    'onboarding'
  ]

  const stageData = []
  let previousCount = leads.length

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i]
    
    // Count leads that reached this stage
    const leadsAtStage = leads.filter(lead => {
      return getLeadStageFromStatus(lead) >= i
    })

    const count = leadsAtStage.length
    const conversionRate = previousCount > 0 ? (count / previousCount) * 100 : 0
    const dropOffRate = previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0
    
    // Calculate average duration in stage
    const averageDuration = await calculateAverageStageDuration(leadsAtStage, stage)

    stageData.push({
      stage: stage,
      count: count,
      conversionRate: conversionRate,
      averageDuration: averageDuration,
      dropOffRate: dropOffRate
    })

    previousCount = count
  }

  return stageData
}

/**
 * Calculate source performance metrics
 */
async function calculateSourcePerformance(
  leads: GuardLead[],
  filters?: RecruitingAnalyticsFilters
): Promise<Array<{
  source: GuardLeadSource
  leads: number
  applications: number
  hires: number
  conversionRate: number
  costPerLead: number
  costPerHire: number
  averageScore: number
}>> {
  const sourceGroups = groupLeadsBySource(leads)
  const sourcePerformance = []

  for (const [source, sourceLeads] of Object.entries(sourceGroups)) {
    const applications = sourceLeads.filter(lead => 
      ['application_submitted', 'under_review', 'background_check', 'interview_scheduled',
       'interview_completed', 'reference_check', 'offer_extended', 'offer_accepted', 
       'hire_completed'].includes(lead.applicationStatus)
    ).length

    const hires = sourceLeads.filter(lead => lead.convertedToHire).length
    const conversionRate = sourceLeads.length > 0 ? (hires / sourceLeads.length) * 100 : 0

    // Get cost data from campaigns (if available)
    const costData = await getSourceCostData(source as GuardLeadSource, filters)
    
    const averageScore = sourceLeads.reduce((sum, lead) => sum + (lead.qualificationScore || 0), 0) / sourceLeads.length || 0

    sourcePerformance.push({
      source: source as GuardLeadSource,
      leads: sourceLeads.length,
      applications: applications,
      hires: hires,
      conversionRate: conversionRate,
      costPerLead: costData.costPerLead,
      costPerHire: hires > 0 ? costData.totalCost / hires : 0,
      averageScore: averageScore
    })
  }

  return sourcePerformance.sort((a, b) => b.conversionRate - a.conversionRate)
}

/**
 * Calculate campaign performance metrics
 */
async function calculateCampaignPerformance(
  leads: GuardLead[],
  filters?: RecruitingAnalyticsFilters
): Promise<Array<{
  campaignId: string
  campaignName: string
  leads: number
  applications: number
  hires: number
  spent: number
  roi: number
  conversionRate: number
}>> {
  // Get campaign data
  const { data: campaigns, error } = await supabase
    .from('recruiting_campaigns')
    .select('*')

  if (error || !campaigns) {
    return []
  }

  const campaignPerformance = []

  for (const campaign of campaigns) {
    const campaignLeads = leads.filter(lead => lead.campaignId === campaign.id)
    
    if (campaignLeads.length === 0) continue

    const applications = campaignLeads.filter(lead => 
      ['application_submitted', 'under_review', 'background_check', 'interview_scheduled',
       'interview_completed', 'reference_check', 'offer_extended', 'offer_accepted', 
       'hire_completed'].includes(lead.applicationStatus)
    ).length

    const hires = campaignLeads.filter(lead => lead.convertedToHire).length
    const conversionRate = campaignLeads.length > 0 ? (hires / campaignLeads.length) * 100 : 0

    // Calculate ROI (simplified)
    const averageSalary = 35000 // Average guard salary
    const revenue = hires * averageSalary * 0.1 // 10% commission assumption
    const roi = campaign.budget_spent > 0 ? ((revenue - campaign.budget_spent) / campaign.budget_spent) * 100 : 0

    campaignPerformance.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      leads: campaignLeads.length,
      applications: applications,
      hires: hires,
      spent: campaign.budget_spent || 0,
      roi: roi,
      conversionRate: conversionRate
    })
  }

  return campaignPerformance.sort((a, b) => b.roi - a.roi)
}

/**
 * Calculate geographic performance data
 */
async function calculateGeographicPerformance(
  leads: GuardLead[],
  filters?: RecruitingAnalyticsFilters
): Promise<Array<{
  location: string
  leads: number
  hires: number
  averageScore: number
  competitionLevel: 'low' | 'medium' | 'high'
}>> {
  const locationGroups: Record<string, GuardLead[]> = {}

  // Group leads by location
  leads.forEach(lead => {
    const locations = lead.preferredLocations || ['Unknown']
    locations.forEach(location => {
      if (!locationGroups[location]) {
        locationGroups[location] = []
      }
      locationGroups[location].push(lead)
    })
  })

  const geographicData = []

  for (const [location, locationLeads] of Object.entries(locationGroups)) {
    const hires = locationLeads.filter(lead => lead.convertedToHire).length
    const averageScore = locationLeads.reduce((sum, lead) => sum + (lead.qualificationScore || 0), 0) / locationLeads.length || 0
    
    // Determine competition level based on lead volume and conversion rates
    const conversionRate = locationLeads.length > 0 ? hires / locationLeads.length : 0
    let competitionLevel: 'low' | 'medium' | 'high' = 'medium'
    
    if (locationLeads.length > 50 && conversionRate < 0.15) {
      competitionLevel = 'high'
    } else if (locationLeads.length < 20 && conversionRate > 0.25) {
      competitionLevel = 'low'
    }

    geographicData.push({
      location: location,
      leads: locationLeads.length,
      hires: hires,
      averageScore: averageScore,
      competitionLevel: competitionLevel
    })
  }

  return geographicData.sort((a, b) => b.leads - a.leads)
}

/**
 * Calculate time series data
 */
async function calculateTimeSeriesData(
  leads: GuardLead[],
  filters?: RecruitingAnalyticsFilters
): Promise<Array<{
  date: string
  leads: number
  applications: number
  hires: number
  costPerLead: number
  averageScore: number
}>> {
  // Group leads by date
  const dateGroups: Record<string, GuardLead[]> = {}

  leads.forEach(lead => {
    const date = new Date(lead.created_at).toISOString().split('T')[0]
    if (!dateGroups[date]) {
      dateGroups[date] = []
    }
    dateGroups[date].push(lead)
  })

  const timeSeriesData = []

  for (const [date, dateLeads] of Object.entries(dateGroups)) {
    const applications = dateLeads.filter(lead => 
      ['application_submitted', 'under_review', 'background_check', 'interview_scheduled',
       'interview_completed', 'reference_check', 'offer_extended', 'offer_accepted', 
       'hire_completed'].includes(lead.applicationStatus)
    ).length

    const hires = dateLeads.filter(lead => lead.convertedToHire).length
    const averageScore = dateLeads.reduce((sum, lead) => sum + (lead.qualificationScore || 0), 0) / dateLeads.length || 0
    
    // Simplified cost calculation
    const costPerLead = await getDailyCostPerLead(date)

    timeSeriesData.push({
      date: date,
      leads: dateLeads.length,
      applications: applications,
      hires: hires,
      costPerLead: costPerLead,
      averageScore: averageScore
    })
  }

  return timeSeriesData.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Generate optimization recommendations
 */
export async function getOptimizationRecommendations(
  filters?: RecruitingAnalyticsFilters
): Promise<ApiResponse<RecruitingOptimizationRecommendations>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Get funnel data
    const funnelResponse = await getRecruitingFunnelAnalytics(filters)
    if (!funnelResponse.success || !funnelResponse.data) {
      return { success: false, error: 'Failed to get funnel data for recommendations' }
    }

    const funnelData = funnelResponse.data

    // Generate source recommendations
    const sourceRecommendations = generateSourceRecommendations(funnelData.sourcePerformance)
    
    // Generate campaign recommendations
    const campaignRecommendations = generateCampaignRecommendations(funnelData.campaignPerformance)
    
    // Generate bottleneck analysis
    const bottleneckAnalysis = generateBottleneckAnalysis(funnelData.stages)
    
    // Generate scoring recommendations (placeholder)
    const scoringRecommendations = [
      {
        factor: 'experience' as const,
        currentWeight: 0.25,
        recommendedWeight: 0.30,
        reason: 'Experience shows strong correlation with hire success rate'
      }
    ]

    const recommendations: RecruitingOptimizationRecommendations = {
      topPerformingSources: sourceRecommendations,
      campaignRecommendations: campaignRecommendations,
      bottleneckAnalysis: bottleneckAnalysis,
      scoringRecommendations: scoringRecommendations,
      generatedAt: new Date().toISOString()
    }

    return { success: true, data: recommendations }
  } catch (error) {
    console.error('Error getting optimization recommendations:', error)
    return { success: false, error: 'Failed to get optimization recommendations' }
  }
}

/**
 * Export recruiting analytics data
 */
export async function exportRecruitingAnalytics(
  filters?: RecruitingAnalyticsFilters,
  format: 'csv' | 'json' = 'csv'
): Promise<ApiResponse<{ data: string; filename: string }>> {
  try {
    const analyticsResponse = await getRecruitingFunnelAnalytics(filters)
    if (!analyticsResponse.success || !analyticsResponse.data) {
      return { success: false, error: 'Failed to get analytics data for export' }
    }

    const analytics = analyticsResponse.data
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    
    if (format === 'csv') {
      const csvData = generateCSVData(analytics)
      return {
        success: true,
        data: {
          data: csvData,
          filename: `recruiting-analytics-${timestamp}.csv`
        }
      }
    } else {
      const jsonData = JSON.stringify(analytics, null, 2)
      return {
        success: true,
        data: {
          data: jsonData,
          filename: `recruiting-analytics-${timestamp}.json`
        }
      }
    }
  } catch (error) {
    console.error('Error exporting recruiting analytics:', error)
    return { success: false, error: 'Failed to export recruiting analytics' }
  }
}

// Helper functions

/**
 * Map lead application status to funnel stage
 */
function getLeadStageFromStatus(lead: GuardLead): number {
  const stageMap: Record<string, number> = {
    'lead_captured': 0,
    'application_started': 1,
    'application_submitted': 2,
    'under_review': 2,
    'background_check': 3,
    'interview_scheduled': 4,
    'interview_completed': 4,
    'reference_check': 5,
    'offer_extended': 5,
    'offer_accepted': 6,
    'hire_completed': 6
  }

  return stageMap[lead.applicationStatus] || 0
}

/**
 * Group leads by source
 */
function groupLeadsBySource(leads: GuardLead[]): Record<string, GuardLead[]> {
  return leads.reduce((groups, lead) => {
    const source = lead.sourceType || 'unknown'
    if (!groups[source]) {
      groups[source] = []
    }
    groups[source].push(lead)
    return groups
  }, {} as Record<string, GuardLead[]>)
}

/**
 * Calculate average duration in stage (placeholder implementation)
 */
async function calculateAverageStageDuration(
  leads: GuardLead[],
  stage: GuardLeadStage
): Promise<number> {
  // In a real implementation, you'd track stage transition timestamps
  // For now, return estimated durations based on stage
  const estimatedDurations: Record<GuardLeadStage, number> = {
    'initial_contact': 1,
    'qualification': 2,
    'application': 3,
    'background_check': 7,
    'interview': 5,
    'decision': 3,
    'onboarding': 14
  }

  return estimatedDurations[stage] || 3
}

/**
 * Get source cost data (placeholder implementation)
 */
async function getSourceCostData(
  source: GuardLeadSource,
  filters?: RecruitingAnalyticsFilters
): Promise<{ costPerLead: number; totalCost: number }> {
  // In a real implementation, you'd fetch actual cost data from campaigns
  const estimatedCosts: Record<GuardLeadSource, number> = {
    'direct_website': 5,
    'job_board': 25,
    'social_media': 15,
    'referral': 100,
    'recruiting_agency': 500,
    'career_fair': 200,
    'print_advertisement': 50,
    'radio_advertisement': 75,
    'cold_outreach': 30,
    'partner_referral': 150,
    'other': 40
  }

  const costPerLead = estimatedCosts[source] || 25
  return { costPerLead, totalCost: costPerLead * 10 } // Assuming 10 leads
}

/**
 * Get daily cost per lead (placeholder implementation)
 */
async function getDailyCostPerLead(date: string): Promise<number> {
  // In a real implementation, you'd sum up campaign costs for the date
  return 20 // Average daily cost per lead
}

/**
 * Generate source performance recommendations
 */
function generateSourceRecommendations(
  sourcePerformance: Array<{
    source: GuardLeadSource
    leads: number
    applications: number
    hires: number
    conversionRate: number
    costPerLead: number
    costPerHire: number
    averageScore: number
  }>
): Array<{
  source: GuardLeadSource
  recommendation: string
  expectedImpact: string
  priority: 'high' | 'medium' | 'low'
}> {
  const recommendations = []

  // Sort by ROI (conversion rate / cost per hire)
  const sortedSources = sourcePerformance
    .map(source => ({
      ...source,
      roi: source.costPerHire > 0 ? source.conversionRate / source.costPerHire * 1000 : 0
    }))
    .sort((a, b) => b.roi - a.roi)

  // Top performer - increase investment
  if (sortedSources.length > 0) {
    const topSource = sortedSources[0]
    recommendations.push({
      source: topSource.source,
      recommendation: `Increase budget allocation for ${topSource.source} - showing highest ROI`,
      expectedImpact: `Potential 25-40% increase in quality leads`,
      priority: 'high' as const
    })
  }

  // Poor performers - optimize or pause
  const poorPerformers = sortedSources.filter(source => source.conversionRate < 5 && source.leads > 10)
  poorPerformers.forEach(source => {
    recommendations.push({
      source: source.source,
      recommendation: `Review and optimize ${source.source} strategy - low conversion rate`,
      expectedImpact: `Cost reduction of $${Math.round(source.costPerLead * source.leads * 0.3)}`,
      priority: 'medium' as const
    })
  })

  return recommendations
}

/**
 * Generate campaign optimization recommendations
 */
function generateCampaignRecommendations(
  campaignPerformance: Array<{
    campaignId: string
    campaignName: string
    leads: number
    applications: number
    hires: number
    spent: number
    roi: number
    conversionRate: number
  }>
): Array<{
  campaignId: string
  type: 'budget_increase' | 'budget_decrease' | 'pause' | 'optimize_targeting' | 'test_creative'
  description: string
  expectedImpact: string
}> {
  const recommendations = []

  campaignPerformance.forEach(campaign => {
    if (campaign.roi > 50 && campaign.conversionRate > 10) {
      recommendations.push({
        campaignId: campaign.campaignId,
        type: 'budget_increase',
        description: `Increase budget for high-performing campaign: ${campaign.campaignName}`,
        expectedImpact: `Potential 30-50% increase in hires`
      })
    } else if (campaign.roi < -20 && campaign.spent > 1000) {
      recommendations.push({
        campaignId: campaign.campaignId,
        type: 'pause',
        description: `Pause underperforming campaign: ${campaign.campaignName}`,
        expectedImpact: `Save $${Math.round(campaign.spent * 0.5)} monthly`
      })
    } else if (campaign.conversionRate < 5 && campaign.leads > 20) {
      recommendations.push({
        campaignId: campaign.campaignId,
        type: 'optimize_targeting',
        description: `Optimize targeting for ${campaign.campaignName} - low conversion rate`,
        expectedImpact: `Improve conversion rate by 2-5%`
      })
    }
  })

  return recommendations
}

/**
 * Generate bottleneck analysis
 */
function generateBottleneckAnalysis(
  stages: Array<{
    stage: GuardLeadStage
    count: number
    conversionRate: number
    averageDuration: number
    dropOffRate: number
  }>
): Array<{
  stage: GuardLeadStage
  issue: string
  solution: string
  priority: 'high' | 'medium' | 'low'
}> {
  const bottlenecks = []

  stages.forEach(stage => {
    if (stage.dropOffRate > 40) {
      bottlenecks.push({
        stage: stage.stage,
        issue: `High drop-off rate (${stage.dropOffRate.toFixed(1)}%) at ${stage.stage}`,
        solution: getBottleneckSolution(stage.stage),
        priority: stage.dropOffRate > 60 ? 'high' as const : 'medium' as const
      })
    }

    if (stage.averageDuration > getExpectedDuration(stage.stage) * 2) {
      bottlenecks.push({
        stage: stage.stage,
        issue: `Excessive time in ${stage.stage} stage (${stage.averageDuration} days)`,
        solution: `Streamline ${stage.stage} process and add automated reminders`,
        priority: 'medium' as const
      })
    }
  })

  return bottlenecks
}

/**
 * Get expected duration for stage
 */
function getExpectedDuration(stage: GuardLeadStage): number {
  const expectedDurations: Record<GuardLeadStage, number> = {
    'initial_contact': 1,
    'qualification': 2,
    'application': 3,
    'background_check': 7,
    'interview': 5,
    'decision': 3,
    'onboarding': 10
  }

  return expectedDurations[stage] || 3
}

/**
 * Get solution for bottleneck stage
 */
function getBottleneckSolution(stage: GuardLeadStage): string {
  const solutions: Record<GuardLeadStage, string> = {
    'initial_contact': 'Implement automated lead response system within 1 hour',
    'qualification': 'Create qualification scorecard and train recruiters',
    'application': 'Simplify application process and add progress indicators',
    'background_check': 'Partner with faster background check providers',
    'interview': 'Offer flexible interview scheduling and video options',
    'decision': 'Create decision framework and expedite approval process',
    'onboarding': 'Digitize onboarding process and provide self-service options'
  }

  return solutions[stage] || 'Review and optimize process workflow'
}

/**
 * Generate CSV data from analytics
 */
function generateCSVData(analytics: RecruitingFunnelData): string {
  const rows = []
  
  // Header
  rows.push(['Type', 'Name', 'Leads', 'Applications', 'Hires', 'Conversion Rate', 'Cost Per Lead', 'Average Score'])
  
  // Source performance data
  analytics.sourcePerformance.forEach(source => {
    rows.push([
      'Source',
      source.source,
      source.leads.toString(),
      source.applications.toString(),
      source.hires.toString(),
      `${source.conversionRate.toFixed(2)}%`,
      `$${source.costPerLead.toFixed(2)}`,
      source.averageScore.toFixed(1)
    ])
  })

  // Campaign performance data
  analytics.campaignPerformance.forEach(campaign => {
    rows.push([
      'Campaign',
      campaign.campaignName,
      campaign.leads.toString(),
      campaign.applications.toString(),
      campaign.hires.toString(),
      `${campaign.conversionRate.toFixed(2)}%`,
      campaign.spent > 0 ? `$${(campaign.spent / campaign.leads).toFixed(2)}` : '$0',
      '-'
    ])
  })

  return rows.map(row => row.join(',')).join('\n')
}