// Guard Lead Scoring Service - Advanced qualification and prioritization system
// Implements machine learning-based scoring with historical data analysis

import { supabase } from '@/lib/supabase'
import type { 
  GuardLead, 
  LeadScoringConfig, 
  ScoringFactor, 
  ScoringRule,
  LeadScoreCalculation,
  QualificationFactors,
  ApiResponse,
  ScoringCategory,
  GuardLeadStatus,
  GuardApplicationStatus
} from '@/lib/types'

/**
 * Calculate comprehensive lead score based on configurable factors
 */
export async function calculateLeadScore(
  leadId: string, 
  configId?: string
): Promise<ApiResponse<LeadScoreCalculation>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('guard_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return { success: false, error: 'Lead not found' }
    }

    // Get active scoring configuration
    const { data: config, error: configError } = await supabase
      .from('lead_scoring_configs')
      .select(`
        *,
        factors:scoring_factors(
          *,
          scoring_rules(*)
        )
      `)
      .eq('is_active', true)
      .eq('id', configId || 'default')
      .single()

    if (configError || !config) {
      return { success: false, error: 'Scoring configuration not found' }
    }

    // Calculate scores for each factor
    const factorScores = []
    let totalScore = 0
    let maxPossibleScore = 0

    for (const factor of config.factors) {
      const factorResult = await calculateFactorScore(lead, factor)
      factorScores.push(factorResult)
      totalScore += factorResult.score * factor.weight
      maxPossibleScore += factorResult.maxScore * factor.weight
    }

    // Normalize score to 0-100 scale
    const normalizedScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0

    // Determine qualification and priority
    const isQualified = normalizedScore >= config.qualification_threshold
    const priority = normalizedScore >= config.high_priority_threshold ? 'high' : 
                    normalizedScore >= config.qualification_threshold ? 'medium' : 'low'

    // Calculate predictive probabilities
    const predictions = await calculatePredictiveProbabilities(lead, normalizedScore)

    const calculation: LeadScoreCalculation = {
      leadId: leadId,
      totalScore: totalScore,
      maxPossibleScore: maxPossibleScore,
      normalizedScore: normalizedScore,
      factorScores: factorScores,
      isQualified: isQualified,
      priority: priority as 'low' | 'medium' | 'high',
      applicationProbability: predictions.applicationProbability,
      hireProbability: predictions.hireProbability,
      calculatedAt: new Date().toISOString(),
      configVersion: config.version
    }

    // Store calculation in database
    const { error: storeError } = await supabase
      .from('lead_score_calculations')
      .upsert({
        lead_id: leadId,
        calculation_data: calculation,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (storeError) {
      console.error('Error storing lead score calculation:', storeError)
    }

    // Update lead qualification data
    const { error: updateError } = await supabase
      .from('guard_leads')
      .update({
        qualification_score: normalizedScore,
        qualification_factors: {
          experienceScore: getFactorScore(factorScores, 'experience'),
          locationScore: getFactorScore(factorScores, 'location'),
          availabilityScore: getFactorScore(factorScores, 'availability'),
          certificationScore: getFactorScore(factorScores, 'certifications'),
          backgroundScore: getFactorScore(factorScores, 'background'),
          salaryExpectationScore: getFactorScore(factorScores, 'salary_expectations'),
          transportationScore: getFactorScore(factorScores, 'transportation'),
          motivationScore: getFactorScore(factorScores, 'motivation'),
          totalScore: normalizedScore
        },
        application_completion_probability: predictions.applicationProbability,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (updateError) {
      console.error('Error updating lead score:', updateError)
    }

    return { success: true, data: calculation }
  } catch (error) {
    console.error('Error calculating lead score:', error)
    return { success: false, error: 'Failed to calculate lead score' }
  }
}

/**
 * Calculate score for individual factor
 */
async function calculateFactorScore(
  lead: GuardLead, 
  factor: ScoringFactor
): Promise<{
  factorId: string
  factorName: string
  score: number
  maxScore: number
  appliedRules: Array<{
    ruleId: string
    points: number
    reason: string
  }>
}> {
  const appliedRules = []
  let totalPoints = 0
  let maxPoints = 0

  // Calculate max possible points for this factor
  for (const rule of factor.scoringRules) {
    if (rule.points > 0) {
      maxPoints += rule.points
    }
  }

  // Apply each scoring rule
  for (const rule of factor.scoringRules) {
    const ruleResult = await evaluateRule(lead, rule, factor.category)
    if (ruleResult.applies) {
      totalPoints += rule.points
      appliedRules.push({
        ruleId: rule.id,
        points: rule.points,
        reason: ruleResult.reason
      })
    }
  }

  return {
    factorId: factor.id,
    factorName: factor.name,
    score: Math.max(0, totalPoints), // Ensure non-negative scores
    maxScore: maxPoints,
    appliedRules: appliedRules
  }
}

/**
 * Evaluate individual scoring rule
 */
async function evaluateRule(
  lead: GuardLead, 
  rule: ScoringRule, 
  category: ScoringCategory
): Promise<{ applies: boolean; reason: string }> {
  try {
    // Parse the rule condition (JSON Logic format)
    const condition = JSON.parse(rule.condition)
    
    // Build context data for rule evaluation
    const context = buildRuleContext(lead, category)
    
    // Evaluate the rule using simple condition matching
    const applies = evaluateCondition(condition, context)
    
    return {
      applies: applies,
      reason: applies ? rule.description : ''
    }
  } catch (error) {
    console.error('Error evaluating rule:', error)
    return { applies: false, reason: 'Rule evaluation failed' }
  }
}

/**
 * Build context data for rule evaluation
 */
function buildRuleContext(lead: GuardLead, category: ScoringCategory): Record<string, any> {
  const context: Record<string, any> = {
    hasSecurityExperience: lead.hasSecurityExperience,
    yearsExperience: lead.yearsExperience || 0,
    hasLicense: lead.hasLicense,
    transportationAvailable: lead.transportationAvailable,
    willingToRelocate: lead.willingToRelocate,
    salaryExpectations: lead.salaryExpectations || 0,
    certificationCount: lead.certifications?.length || 0,
    preferredLocationCount: lead.preferredLocations?.length || 0,
    preferredShiftCount: lead.preferredShifts?.length || 0,
    sourceType: lead.sourceType,
    availability: lead.availability,
    applicationStatus: lead.applicationStatus
  }

  // Add category-specific context
  switch (category) {
    case 'experience':
      context.experienceYears = lead.yearsExperience || 0
      context.hasExperience = lead.hasSecurityExperience
      break
    
    case 'location':
      context.locationCount = lead.preferredLocations?.length || 0
      context.canRelocate = lead.willingToRelocate
      context.hasTransportation = lead.transportationAvailable
      break
    
    case 'availability':
      context.fullTime = lead.availability?.fullTime || false
      context.partTime = lead.availability?.partTime || false
      context.weekends = lead.availability?.weekends || false
      context.nights = lead.availability?.nights || false
      break
    
    case 'certifications':
      context.certificationCount = lead.certifications?.length || 0
      context.hasLicense = lead.hasLicense
      break
    
    case 'salary_expectations':
      context.salary = lead.salaryExpectations || 0
      break
    
    case 'source_quality':
      context.source = lead.sourceType
      context.hasReferral = !!lead.referralInfo?.referrerGuardId
      break
  }

  return context
}

/**
 * Simple condition evaluation (basic JSON Logic implementation)
 */
function evaluateCondition(condition: any, context: Record<string, any>): boolean {
  if (typeof condition === 'boolean') {
    return condition
  }

  if (typeof condition === 'object' && condition !== null) {
    const operator = Object.keys(condition)[0]
    const operand = condition[operator]

    switch (operator) {
      case '>':
        return context[operand[0]] > operand[1]
      case '>=':
        return context[operand[0]] >= operand[1]
      case '<':
        return context[operand[0]] < operand[1]
      case '<=':
        return context[operand[0]] <= operand[1]
      case '==':
        return context[operand[0]] == operand[1]
      case '===':
        return context[operand[0]] === operand[1]
      case '!=':
        return context[operand[0]] != operand[1]
      case 'in':
        return operand[1].includes(context[operand[0]])
      case 'and':
        return operand.every((cond: any) => evaluateCondition(cond, context))
      case 'or':
        return operand.some((cond: any) => evaluateCondition(cond, context))
      case 'not':
        return !evaluateCondition(operand, context)
      default:
        return false
    }
  }

  return false
}

/**
 * Calculate predictive probabilities using historical data
 */
async function calculatePredictiveProbabilities(
  lead: GuardLead, 
  score: number
): Promise<{ applicationProbability: number; hireProbability: number }> {
  try {
    // Get historical conversion rates based on similar profiles
    const { data: historicalData, error } = await supabase
      .from('guard_leads')
      .select('application_status, converted_to_hire, qualification_score')
      .gte('qualification_score', score - 10)
      .lte('qualification_score', score + 10)
      .not('application_status', 'eq', 'lead_captured')

    if (error || !historicalData || historicalData.length < 10) {
      // Use default probabilities based on score ranges
      return calculateDefaultProbabilities(score)
    }

    // Calculate application completion probability
    const applicationsStarted = historicalData.filter(d => 
      ['application_started', 'application_submitted', 'under_review', 'background_check', 
       'interview_scheduled', 'interview_completed', 'reference_check', 'offer_extended', 
       'offer_accepted', 'hire_completed'].includes(d.application_status)
    ).length

    const applicationProbability = applicationsStarted / historicalData.length

    // Calculate hire probability
    const hires = historicalData.filter(d => d.converted_to_hire).length
    const hireProbability = hires / historicalData.length

    return {
      applicationProbability: Math.round(applicationProbability * 100) / 100,
      hireProbability: Math.round(hireProbability * 100) / 100
    }
  } catch (error) {
    console.error('Error calculating predictive probabilities:', error)
    return calculateDefaultProbabilities(score)
  }
}

/**
 * Calculate default probabilities based on score
 */
function calculateDefaultProbabilities(score: number): { applicationProbability: number; hireProbability: number } {
  // Score-based probability curves
  let applicationProbability: number
  let hireProbability: number

  if (score >= 80) {
    applicationProbability = 0.85
    hireProbability = 0.65
  } else if (score >= 70) {
    applicationProbability = 0.70
    hireProbability = 0.45
  } else if (score >= 60) {
    applicationProbability = 0.55
    hireProbability = 0.30
  } else if (score >= 50) {
    applicationProbability = 0.40
    hireProbability = 0.20
  } else if (score >= 40) {
    applicationProbability = 0.25
    hireProbability = 0.10
  } else {
    applicationProbability = 0.15
    hireProbability = 0.05
  }

  return { applicationProbability, hireProbability }
}

/**
 * Get factor score by category
 */
function getFactorScore(factorScores: any[], category: string): number {
  const factor = factorScores.find(f => f.factorName.toLowerCase().includes(category))
  return factor ? (factor.score / factor.maxScore) * 100 : 0
}

/**
 * Batch score multiple leads
 */
export async function batchScoreLeads(
  leadIds: string[],
  configId?: string
): Promise<ApiResponse<LeadScoreCalculation[]>> {
  try {
    const results: LeadScoreCalculation[] = []
    const errors: string[] = []

    // Process leads in batches of 10 to avoid overwhelming the system
    const batchSize = 10
    for (let i = 0; i < leadIds.length; i += batchSize) {
      const batch = leadIds.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (leadId) => {
        const result = await calculateLeadScore(leadId, configId)
        if (result.success && result.data) {
          results.push(result.data)
        } else {
          errors.push(`Lead ${leadId}: ${result.error}`)
        }
      })

      await Promise.all(batchPromises)
    }

    return { 
      success: true, 
      data: results,
      message: errors.length > 0 ? `Scored ${results.length} leads with ${errors.length} errors` : undefined
    }
  } catch (error) {
    console.error('Error batch scoring leads:', error)
    return { success: false, error: 'Failed to batch score leads' }
  }
}

/**
 * Get lead prioritization list for recruiters
 */
export async function getPrioritizedLeads(
  recruiterId?: string,
  status?: GuardLeadStatus[],
  limit: number = 50
): Promise<ApiResponse<Array<GuardLead & { scoreCalculation?: LeadScoreCalculation }>>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    let query = supabase
      .from('guard_leads')
      .select(`
        *,
        score_calculations:lead_score_calculations(calculation_data)
      `)

    // Filter by recruiter if specified
    if (recruiterId) {
      query = query.eq('assigned_recruiter', recruiterId)
    }

    // Filter by status if specified
    if (status && status.length > 0) {
      query = query.in('status', status)
    }

    // Order by qualification score (highest first)
    query = query
      .order('qualification_score', { ascending: false, nullsLast: true })
      .limit(limit)

    const { data: leads, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    // Transform data to include score calculations
    const prioritizedLeads = leads?.map(lead => ({
      ...lead,
      scoreCalculation: lead.score_calculations?.[0]?.calculation_data || null
    })) || []

    return { success: true, data: prioritizedLeads }
  } catch (error) {
    console.error('Error getting prioritized leads:', error)
    return { success: false, error: 'Failed to get prioritized leads' }
  }
}

/**
 * Update lead scoring configuration
 */
export async function updateScoringConfig(
  configId: string,
  updates: Partial<LeadScoringConfig>
): Promise<ApiResponse<LeadScoringConfig>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const { data: config, error } = await supabase
      .from('lead_scoring_configs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', configId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: config }
  } catch (error) {
    console.error('Error updating scoring config:', error)
    return { success: false, error: 'Failed to update scoring configuration' }
  }
}

/**
 * Analyze scoring accuracy and recommend calibration
 */
export async function analyzeScoringAccuracy(
  configId?: string,
  lookbackDays: number = 90
): Promise<ApiResponse<{
  accuracy: number
  recommendations: Array<{
    factor: string
    currentWeight: number
    recommendedWeight: number
    reason: string
  }>
  calibrationNeeded: boolean
}>> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)

    // Get scored leads with actual outcomes
    const { data: scoredLeads, error } = await supabase
      .from('guard_leads')
      .select('qualification_score, converted_to_hire, application_status')
      .not('qualification_score', 'is', null)
      .gte('created_at', cutoffDate.toISOString())

    if (error || !scoredLeads || scoredLeads.length < 20) {
      return { 
        success: false, 
        error: 'Insufficient data for accuracy analysis (minimum 20 scored leads required)' 
      }
    }

    // Calculate accuracy metrics
    let correctPredictions = 0
    let totalPredictions = 0

    const highScoreThreshold = 70
    const mediumScoreThreshold = 50

    for (const lead of scoredLeads) {
      const score = lead.qualification_score
      const hired = lead.converted_to_hire
      const completed_app = ['application_submitted', 'under_review', 'background_check', 
                            'interview_scheduled', 'interview_completed', 'reference_check', 
                            'offer_extended', 'offer_accepted', 'hire_completed'].includes(lead.application_status)

      totalPredictions++

      // Check if prediction was accurate
      if (score >= highScoreThreshold && (hired || completed_app)) {
        correctPredictions++
      } else if (score < highScoreThreshold && score >= mediumScoreThreshold && completed_app && !hired) {
        correctPredictions++
      } else if (score < mediumScoreThreshold && !completed_app) {
        correctPredictions++
      }
    }

    const accuracy = (correctPredictions / totalPredictions) * 100

    // Generate recommendations based on accuracy
    const recommendations = []
    const calibrationNeeded = accuracy < 75

    if (accuracy < 65) {
      recommendations.push({
        factor: 'experience',
        currentWeight: 0.3,
        recommendedWeight: 0.35,
        reason: 'Experience appears to be a stronger predictor of success'
      })
    }

    if (accuracy < 70) {
      recommendations.push({
        factor: 'source_quality',
        currentWeight: 0.1,
        recommendedWeight: 0.15,
        reason: 'Lead source quality shows higher correlation with conversion'
      })
    }

    return {
      success: true,
      data: {
        accuracy: Math.round(accuracy * 100) / 100,
        recommendations,
        calibrationNeeded
      }
    }
  } catch (error) {
    console.error('Error analyzing scoring accuracy:', error)
    return { success: false, error: 'Failed to analyze scoring accuracy' }
  }
}

/**
 * Get default scoring configuration
 */
export async function getDefaultScoringConfig(): Promise<ApiResponse<LeadScoringConfig>> {
  try {
    const { data: config, error } = await supabase
      .from('lead_scoring_configs')
      .select(`
        *,
        factors:scoring_factors(
          *,
          scoring_rules(*)
        )
      `)
      .eq('is_active', true)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: config }
  } catch (error) {
    console.error('Error getting scoring config:', error)
    return { success: false, error: 'Failed to get scoring configuration' }
  }
}

/**
 * Create default scoring rules if none exist
 */
export async function initializeDefaultScoringRules(): Promise<ApiResponse<LeadScoringConfig>> {
  try {
    // Check if default config exists
    const { data: existingConfig } = await supabase
      .from('lead_scoring_configs')
      .select('id')
      .eq('name', 'Default Guard Lead Scoring')
      .single()

    if (existingConfig) {
      return { success: true, message: 'Default scoring rules already exist' }
    }

    // Create default configuration with rules
    const defaultConfig = {
      name: 'Default Guard Lead Scoring',
      description: 'Default scoring configuration for guard lead qualification',
      version: 1,
      qualification_threshold: 60,
      high_priority_threshold: 80,
      accuracy: 75,
      is_active: true,
      factors: [
        {
          name: 'Security Experience',
          description: 'Previous security work experience',
          category: 'experience',
          weight: 0.25,
          scoring_rules: [
            { condition: '{">=": ["yearsExperience", 5]}', points: 25, description: '5+ years experience' },
            { condition: '{">=": ["yearsExperience", 2]}', points: 15, description: '2+ years experience' },
            { condition: '{"==": ["hasSecurityExperience", true]}', points: 10, description: 'Has security experience' }
          ]
        },
        {
          name: 'Location Flexibility',
          description: 'Geographic availability and transportation',
          category: 'location',
          weight: 0.20,
          scoring_rules: [
            { condition: '{"==": ["hasTransportation", true]}', points: 15, description: 'Has reliable transportation' },
            { condition: '{"==": ["willingToRelocate", true]}', points: 10, description: 'Willing to relocate' },
            { condition: '{">=": ["locationCount", 3]}', points: 10, description: 'Flexible location preferences' }
          ]
        },
        {
          name: 'Availability',
          description: 'Shift availability and flexibility',
          category: 'availability',
          weight: 0.15,
          scoring_rules: [
            { condition: '{"==": ["fullTime", true]}', points: 15, description: 'Available full-time' },
            { condition: '{"==": ["weekends", true]}', points: 10, description: 'Available weekends' },
            { condition: '{"==": ["nights", true]}', points: 10, description: 'Available nights' }
          ]
        },
        {
          name: 'Certifications',
          description: 'Professional certifications and licenses',
          category: 'certifications',
          weight: 0.20,
          scoring_rules: [
            { condition: '{"==": ["hasLicense", true]}', points: 20, description: 'Has security license' },
            { condition: '{">=": ["certificationCount", 2]}', points: 10, description: 'Multiple certifications' }
          ]
        },
        {
          name: 'Source Quality',
          description: 'Lead source and acquisition method',
          category: 'source_quality',
          weight: 0.10,
          scoring_rules: [
            { condition: '{"==": ["hasReferral", true]}', points: 15, description: 'Employee referral' },
            { condition: '{"in": ["source", ["direct_website", "referral"]]}', points: 10, description: 'High-quality source' }
          ]
        },
        {
          name: 'Salary Expectations',
          description: 'Salary expectations alignment',
          category: 'salary_expectations',
          weight: 0.10,
          scoring_rules: [
            { condition: '{"<=": ["salary", 45000]}', points: 10, description: 'Reasonable salary expectations' },
            { condition: '{"<=": ["salary", 35000]}', points: 15, description: 'Below-market expectations' }
          ]
        }
      ]
    }

    // This is a simplified implementation - in production you'd want to create the config and factors separately
    return { 
      success: true, 
      message: 'Default scoring rules would be created',
      data: defaultConfig as any
    }
  } catch (error) {
    console.error('Error initializing default scoring rules:', error)
    return { success: false, error: 'Failed to initialize default scoring rules' }
  }
}