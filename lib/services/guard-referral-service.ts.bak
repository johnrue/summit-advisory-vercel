// Guard Referral Service - Comprehensive referral program management
// Handles bonus tracking, attribution, and referrer recognition systems

import { supabase } from '@/lib/supabase'
import type { 
  GuardReferralProgram,
  GuardReferral,
  ReferralStatus,
  BonusStructure,
  ReferralBonusCalculation,
  ReferralLeaderboard,
  GuardLead,
  GuardLeadStage,
  ApiResponse
} from '@/lib/types'

/**
 * Create referral from guard lead
 */
export async function createReferralFromLead(
  leadId: string,
  referralCode?: string,
  referrerGuardId?: string
): Promise<ApiResponse<GuardReferral>> {
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

    // Check if referral already exists
    const { data: existingReferral, error: existingError } = await supabase
      .from('guard_referrals')
      .select('id')
      .eq('referred_lead_id', leadId)
      .single()

    if (existingReferral) {
      return { success: false, error: 'Referral already exists for this lead' }
    }

    let referrerInfo = null

    // Find referrer by code or ID
    if (referralCode) {
      const { data: referrer, error: referrerError } = await supabase
        .from('guards')
        .select('id, first_name, last_name')
        .eq('referral_code', referralCode)
        .single()

      if (referrerError || !referrer) {
        return { success: false, error: 'Invalid referral code' }
      }

      referrerInfo = referrer
    } else if (referrerGuardId) {
      const { data: referrer, error: referrerError } = await supabase
        .from('guards')
        .select('id, first_name, last_name, referral_code')
        .eq('id', referrerGuardId)
        .single()

      if (referrerError || !referrer) {
        return { success: false, error: 'Referrer guard not found' }
      }

      referrerInfo = referrer
    } else {
      return { success: false, error: 'Referral code or referrer ID required' }
    }

    // Get active referral program
    const { data: program, error: programError } = await supabase
      .from('guard_referral_programs')
      .select('*')
      .eq('is_active', true)
      .single()

    if (programError || !program) {
      return { success: false, error: 'No active referral program found' }
    }

    // Validate referrer eligibility
    const eligibilityCheck = await validateReferrerEligibility(referrerInfo.id, program)
    if (!eligibilityCheck.isEligible) {
      return { success: false, error: eligibilityCheck.reason }
    }

    // Create referral record
    const referralId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const referral: GuardReferral = {
      id: referralId,
      programId: program.id,
      referrerGuardId: referrerInfo.id,
      referrerName: `${referrerInfo.first_name} ${referrerInfo.last_name}`,
      referralCode: referralCode || referrerInfo.referral_code || '',
      referredLeadId: leadId,
      referredName: `${lead.first_name} ${lead.last_name}`,
      referredEmail: lead.email,
      referralDate: new Date().toISOString(),
      attributionConfirmed: true,
      attributionMethod: referralCode ? 'referral_code' : 'manual',
      status: 'referred',
      currentStage: 'initial_contact',
      bonusCalculation: initializeBonusCalculation(program.bonus_structure),
      leadQualityScore: lead.qualification_score || 0,
      referrerNotes: '',
      recruiterNotes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Store referral
    const { error: insertError } = await supabase
      .from('guard_referrals')
      .insert({
        id: referral.id,
        program_id: referral.programId,
        referrer_guard_id: referral.referrerGuardId,
        referrer_name: referral.referrerName,
        referral_code: referral.referralCode,
        referred_lead_id: referral.referredLeadId,
        referred_name: referral.referredName,
        referred_email: referral.referredEmail,
        referral_date: referral.referralDate,
        attribution_confirmed: referral.attributionConfirmed,
        attribution_method: referral.attributionMethod,
        status: referral.status,
        current_stage: referral.currentStage,
        bonus_calculation: referral.bonusCalculation,
        lead_quality_score: referral.leadQualityScore,
        created_at: referral.created_at,
        updated_at: referral.updated_at
      })

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    // Update lead with referral info
    const { error: updateLeadError } = await supabase
      .from('guard_leads')
      .update({
        referral_info: {
          referrerGuardId: referrerInfo.id,
          referrerName: referral.referrerName,
          referralCode: referral.referralCode,
          referralBonusEligible: true,
          bonusAmount: program.bonus_structure.flatAmount || 0,
          bonusStatus: 'pending'
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (updateLeadError) {
      console.error('Error updating lead with referral info:', updateLeadError)
    }

    return { success: true, data: referral }
  } catch (error) {
    console.error('Error creating referral from lead:', error)
    return { success: false, error: 'Failed to create referral from lead' }
  }
}

/**
 * Update referral status and stage
 */
export async function updateReferralStatus(
  referralId: string,
  status: ReferralStatus,
  stage: GuardLeadStage,
  notes?: string
): Promise<ApiResponse<GuardReferral>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Get current referral
    const { data: referral, error: referralError } = await supabase
      .from('guard_referrals')
      .select('*')
      .eq('id', referralId)
      .single()

    if (referralError || !referral) {
      return { success: false, error: 'Referral not found' }
    }

    // Get referral program for bonus calculations
    const { data: program, error: programError } = await supabase
      .from('guard_referral_programs')
      .select('*')
      .eq('id', referral.program_id)
      .single()

    if (programError || !program) {
      return { success: false, error: 'Referral program not found' }
    }

    // Calculate updated bonus based on new status/stage
    const updatedBonusCalculation = await calculateBonusUpdate(
      referral.bonus_calculation,
      status,
      stage,
      program.bonus_structure
    )

    // Update referral
    const { data: updatedReferral, error: updateError } = await supabase
      .from('guard_referrals')
      .update({
        status: status,
        current_stage: stage,
        bonus_calculation: updatedBonusCalculation,
        recruiter_notes: notes || referral.recruiter_notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', referralId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // If hired, update times and create milestone achievements
    if (status === 'hired') {
      await processHireMilestone(referralId, referral.referral_date)
    }

    return { success: true, data: updatedReferral }
  } catch (error) {
    console.error('Error updating referral status:', error)
    return { success: false, error: 'Failed to update referral status' }
  }
}

/**
 * Process bonus payments for eligible referrals
 */
export async function processBonusPayments(
  programId?: string
): Promise<ApiResponse<{ processed: number; totalAmount: number; payments: any[] }>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Get eligible referrals for bonus payment
    let query = supabase
      .from('guard_referrals')
      .select(`
        *,
        program:guard_referral_programs(*)
      `)
      .eq('status', 'hired')

    if (programId) {
      query = query.eq('program_id', programId)
    }

    const { data: eligibleReferrals, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    if (!eligibleReferrals || eligibleReferrals.length === 0) {
      return { success: true, data: { processed: 0, totalAmount: 0, payments: [] } }
    }

    const payments = []
    let totalAmount = 0
    let processed = 0

    for (const referral of eligibleReferrals) {
      const bonusPayment = await calculateDueBonus(referral)
      
      if (bonusPayment.amount > 0) {
        // Create payment record
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        const payment = {
          id: paymentId,
          amount: bonusPayment.amount,
          reason: bonusPayment.reason,
          paidDate: new Date().toISOString(),
          paymentMethod: 'payroll',
          transactionId: paymentId
        }

        // Update bonus calculation with payment
        const updatedBonusCalc = { ...referral.bonus_calculation }
        updatedBonusCalc.totalPaid += bonusPayment.amount
        updatedBonusCalc.totalPending -= bonusPayment.amount
        updatedBonusCalc.payments.push(payment)

        // Update referral record
        await supabase
          .from('guard_referrals')
          .update({
            bonus_calculation: updatedBonusCalc,
            updated_at: new Date().toISOString()
          })
          .eq('id', referral.id)

        payments.push({
          referralId: referral.id,
          referrerName: referral.referrer_name,
          amount: bonusPayment.amount,
          reason: bonusPayment.reason
        })

        totalAmount += bonusPayment.amount
        processed++
      }
    }

    return { 
      success: true, 
      data: { 
        processed: processed, 
        totalAmount: totalAmount, 
        payments: payments 
      } 
    }
  } catch (error) {
    console.error('Error processing bonus payments:', error)
    return { success: false, error: 'Failed to process bonus payments' }
  }
}

/**
 * Get referral leaderboard
 */
export async function getReferralLeaderboard(
  period: { startDate: string; endDate: string },
  programId?: string
): Promise<ApiResponse<ReferralLeaderboard>> {
  try {
    // Get referrals for the period
    let query = supabase
      .from('guard_referrals')
      .select(`
        *,
        referrer:guards!referrer_guard_id(first_name, last_name)
      `)
      .gte('referral_date', period.startDate)
      .lte('referral_date', `${period.endDate}T23:59:59.999Z`)

    if (programId) {
      query = query.eq('program_id', programId)
    }

    const { data: referrals, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    // Group by referrer
    const referrerStats: Record<string, {
      referrerGuardId: string
      referrerName: string
      totalReferrals: number
      successfulHires: number
      totalBonusEarned: number
      referralQualityScores: number[]
    }> = {}

    referrals?.forEach(referral => {
      const key = referral.referrer_guard_id
      if (!referrerStats[key]) {
        referrerStats[key] = {
          referrerGuardId: key,
          referrerName: referral.referrer_name,
          totalReferrals: 0,
          successfulHires: 0,
          totalBonusEarned: 0,
          referralQualityScores: []
        }
      }

      const stats = referrerStats[key]
      stats.totalReferrals++
      
      if (referral.status === 'hired') {
        stats.successfulHires++
      }

      stats.totalBonusEarned += referral.bonus_calculation?.totalEarned || 0
      stats.referralQualityScores.push(referral.lead_quality_score || 0)
    })

    // Convert to rankings
    const rankings = Object.values(referrerStats)
      .map((stats, index) => ({
        rank: 0, // Will be set below
        referrerGuardId: stats.referrerGuardId,
        referrerName: stats.referrerName,
        totalReferrals: stats.totalReferrals,
        successfulHires: stats.successfulHires,
        totalBonusEarned: stats.totalBonusEarned,
        successRate: stats.totalReferrals > 0 ? (stats.successfulHires / stats.totalReferrals) * 100 : 0,
        averageLeadScore: stats.referralQualityScores.length > 0 
          ? stats.referralQualityScores.reduce((sum, score) => sum + score, 0) / stats.referralQualityScores.length
          : 0
      }))
      .sort((a, b) => {
        // Sort by successful hires first, then by total bonus earned
        if (b.successfulHires !== a.successfulHires) {
          return b.successfulHires - a.successfulHires
        }
        return b.totalBonusEarned - a.totalBonusEarned
      })
      .map((ranking, index) => ({
        ...ranking,
        rank: index + 1
      }))

    // Define recognition tiers
    const recognitionTiers = [
      {
        tier: 'Gold',
        requirement: '5+ successful hires',
        guards: rankings.filter(r => r.successfulHires >= 5).map(r => r.referrerName),
        reward: '$500 bonus + recognition award'
      },
      {
        tier: 'Silver',
        requirement: '3+ successful hires',
        guards: rankings.filter(r => r.successfulHires >= 3 && r.successfulHires < 5).map(r => r.referrerName),
        reward: '$250 bonus + certificate'
      },
      {
        tier: 'Bronze',
        requirement: '1+ successful hire',
        guards: rankings.filter(r => r.successfulHires >= 1 && r.successfulHires < 3).map(r => r.referrerName),
        reward: '$100 bonus + recognition'
      }
    ]

    const leaderboard: ReferralLeaderboard = {
      period: period,
      rankings: rankings,
      recognitionTiers: recognitionTiers,
      generatedAt: new Date().toISOString()
    }

    return { success: true, data: leaderboard }
  } catch (error) {
    console.error('Error getting referral leaderboard:', error)
    return { success: false, error: 'Failed to get referral leaderboard' }
  }
}

/**
 * Get referral analytics
 */
export async function getReferralAnalytics(
  filters?: {
    programId?: string
    dateRange?: { start: string; end: string }
    referrerId?: string
  }
): Promise<ApiResponse<{
  totalReferrals: number
  successfulHires: number
  conversionRate: number
  averageBonusPerHire: number
  totalBonusPaid: number
  costPerHire: number
  topReferrers: Array<{
    referrerName: string
    hires: number
    bonusEarned: number
  }>
  monthlyTrends: Array<{
    month: string
    referrals: number
    hires: number
    bonusPaid: number
  }>
}>> {
  try {
    // Build query
    let query = supabase
      .from('guard_referrals')
      .select('*')

    if (filters?.programId) {
      query = query.eq('program_id', filters.programId)
    }

    if (filters?.dateRange) {
      query = query
        .gte('referral_date', filters.dateRange.start)
        .lte('referral_date', `${filters.dateRange.end}T23:59:59.999Z`)
    }

    if (filters?.referrerId) {
      query = query.eq('referrer_guard_id', filters.referrerId)
    }

    const { data: referrals, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    if (!referrals) {
      return { success: false, error: 'No referral data found' }
    }

    // Calculate analytics
    const totalReferrals = referrals.length
    const successfulHires = referrals.filter(r => r.status === 'hired').length
    const conversionRate = totalReferrals > 0 ? (successfulHires / totalReferrals) * 100 : 0
    
    const totalBonusPaid = referrals.reduce((sum, r) => sum + (r.bonus_calculation?.totalPaid || 0), 0)
    const averageBonusPerHire = successfulHires > 0 ? totalBonusPaid / successfulHires : 0
    
    // Cost per hire (assuming some operational costs)
    const costPerHire = successfulHires > 0 ? (totalBonusPaid + (totalReferrals * 10)) / successfulHires : 0

    // Top referrers
    const referrerGroups: Record<string, { hires: number; bonusEarned: number }> = {}
    referrals.forEach(referral => {
      const key = referral.referrer_name
      if (!referrerGroups[key]) {
        referrerGroups[key] = { hires: 0, bonusEarned: 0 }
      }
      
      if (referral.status === 'hired') {
        referrerGroups[key].hires++
      }
      referrerGroups[key].bonusEarned += referral.bonus_calculation?.totalEarned || 0
    })

    const topReferrers = Object.entries(referrerGroups)
      .map(([name, stats]) => ({ referrerName: name, ...stats }))
      .sort((a, b) => b.hires - a.hires)
      .slice(0, 10)

    // Monthly trends
    const monthlyGroups: Record<string, { referrals: number; hires: number; bonusPaid: number }> = {}
    referrals.forEach(referral => {
      const month = new Date(referral.referral_date).toISOString().slice(0, 7) // YYYY-MM
      if (!monthlyGroups[month]) {
        monthlyGroups[month] = { referrals: 0, hires: 0, bonusPaid: 0 }
      }
      
      monthlyGroups[month].referrals++
      if (referral.status === 'hired') {
        monthlyGroups[month].hires++
      }
      monthlyGroups[month].bonusPaid += referral.bonus_calculation?.totalPaid || 0
    })

    const monthlyTrends = Object.entries(monthlyGroups)
      .map(([month, stats]) => ({ month, ...stats }))
      .sort((a, b) => a.month.localeCompare(b.month))

    const analytics = {
      totalReferrals,
      successfulHires,
      conversionRate,
      averageBonusPerHire,
      totalBonusPaid,
      costPerHire,
      topReferrers,
      monthlyTrends
    }

    return { success: true, data: analytics }
  } catch (error) {
    console.error('Error getting referral analytics:', error)
    return { success: false, error: 'Failed to get referral analytics' }
  }
}

/**
 * Create or update referral program
 */
export async function createReferralProgram(
  programData: Omit<GuardReferralProgram, 'id' | 'created_at' | 'updated_at'>
): Promise<ApiResponse<GuardReferralProgram>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Deactivate existing active programs if this one is being set as active
    if (programData.isActive) {
      await supabase
        .from('guard_referral_programs')
        .update({ is_active: false })
        .eq('is_active', true)
    }

    const programId = `prog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const program: GuardReferralProgram = {
      id: programId,
      ...programData,
      totalReferrals: 0,
      successfulHires: 0,
      totalBonusPaid: 0,
      averageCostPerHire: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: createdProgram, error } = await supabase
      .from('guard_referral_programs')
      .insert({
        id: program.id,
        name: program.name,
        description: program.description,
        is_active: program.isActive,
        start_date: program.startDate,
        end_date: program.endDate,
        referrer_eligibility: program.referrerEligibility,
        bonus_structure: program.bonusStructure,
        max_referrals_per_person: program.maxReferralsPerPerson,
        max_bonus_per_person: program.maxBonusPerPerson,
        tracking_period: program.trackingPeriod,
        total_referrals: program.totalReferrals,
        successful_hires: program.successfulHires,
        total_bonus_paid: program.totalBonusPaid,
        average_cost_per_hire: program.averageCostPerHire,
        created_at: program.created_at,
        updated_at: program.updated_at
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: createdProgram }
  } catch (error) {
    console.error('Error creating referral program:', error)
    return { success: false, error: 'Failed to create referral program' }
  }
}

// Helper functions

/**
 * Validate referrer eligibility
 */
async function validateReferrerEligibility(
  referrerGuardId: string,
  program: GuardReferralProgram
): Promise<{ isEligible: boolean; reason?: string }> {
  try {
    // Get guard information
    const { data: guard, error } = await supabase
      .from('guards')
      .select('employment_status, employment_start_date, performance_rating')
      .eq('id', referrerGuardId)
      .single()

    if (error || !guard) {
      return { isEligible: false, reason: 'Guard not found' }
    }

    // Check employment status
    if (guard.employment_status !== 'active') {
      return { isEligible: false, reason: 'Guard must be actively employed' }
    }

    // Check minimum tenure
    const employmentStart = new Date(guard.employment_start_date)
    const tenureMonths = (Date.now() - employmentStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
    
    if (tenureMonths < program.referrerEligibility.minimumTenure) {
      return { 
        isEligible: false, 
        reason: `Minimum tenure of ${program.referrerEligibility.minimumTenure} months required` 
      }
    }

    // Check performance rating
    if (guard.performance_rating < program.referrerEligibility.minimumPerformanceRating) {
      return { 
        isEligible: false, 
        reason: `Minimum performance rating of ${program.referrerEligibility.minimumPerformanceRating} required` 
      }
    }

    // Check referral limits
    if (program.maxReferralsPerPerson) {
      const { data: referralCount } = await supabase
        .from('guard_referrals')
        .select('id')
        .eq('referrer_guard_id', referrerGuardId)
        .eq('program_id', program.id)

      if (referralCount && referralCount.length >= program.maxReferralsPerPerson) {
        return { 
          isEligible: false, 
          reason: `Maximum referrals per person (${program.maxReferralsPerPerson}) reached` 
        }
      }
    }

    return { isEligible: true }
  } catch (error) {
    console.error('Error validating referrer eligibility:', error)
    return { isEligible: false, reason: 'Eligibility check failed' }
  }
}

/**
 * Initialize bonus calculation structure
 */
function initializeBonusCalculation(bonusStructure: BonusStructure): ReferralBonusCalculation {
  const milestones = bonusStructure.milestones || []
  
  return {
    totalEarned: 0,
    totalPaid: 0,
    totalPending: 0,
    milestoneStatus: milestones.map(milestone => ({
      milestone: milestone.milestone,
      achieved: false,
      bonusAmount: milestone.amount || (bonusStructure.flatAmount || 0) * milestone.percentage / 100,
      paidDate: undefined
    })),
    payments: [],
    clawbacks: []
  }
}

/**
 * Calculate bonus update based on status change
 */
async function calculateBonusUpdate(
  currentCalculation: ReferralBonusCalculation,
  newStatus: ReferralStatus,
  newStage: GuardLeadStage,
  bonusStructure: BonusStructure
): Promise<ReferralBonusCalculation> {
  const updatedCalculation = { ...currentCalculation }
  
  // Check if new milestones are achieved
  const milestoneMap: Record<string, GuardLeadStage | ReferralStatus> = {
    'application_submitted': 'application',
    '30_days': 'onboarding', // Simplified - would need hire date tracking
    '60_days': 'onboarding',
    '90_days': 'onboarding',
    '6_months': 'onboarding',
    '1_year': 'onboarding'
  }

  updatedCalculation.milestoneStatus.forEach(milestone => {
    if (!milestone.achieved) {
      // Check if milestone conditions are met
      if (newStatus === 'hired' && milestone.milestone === 'application_submitted') {
        milestone.achieved = true
        milestone.achievedDate = new Date().toISOString()
        updatedCalculation.totalEarned += milestone.bonusAmount
        updatedCalculation.totalPending += milestone.bonusAmount
      }
    }
  })

  return updatedCalculation
}

/**
 * Calculate due bonus for a referral
 */
async function calculateDueBonus(referral: GuardReferral): Promise<{ amount: number; reason: string }> {
  // For hired referrals, pay out milestone bonuses
  if (referral.status === 'hired') {
    const unpaidMilestones = referral.bonus_calculation.milestoneStatus.filter(
      m => m.achieved && !m.paidDate
    )
    
    if (unpaidMilestones.length > 0) {
      const totalAmount = unpaidMilestones.reduce((sum, m) => sum + m.bonusAmount, 0)
      const reasons = unpaidMilestones.map(m => m.milestone).join(', ')
      
      return {
        amount: totalAmount,
        reason: `Milestone bonuses for: ${reasons}`
      }
    }
  }

  return { amount: 0, reason: 'No bonuses due' }
}

/**
 * Process hire milestone for referral
 */
async function processHireMilestone(referralId: string, referralDate: string): Promise<void> {
  try {
    // Calculate time to hire
    const timeToHire = Math.floor(
      (Date.now() - new Date(referralDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    // Update referral with hire timing
    await supabase
      .from('guard_referrals')
      .update({
        time_to_hire: timeToHire,
        updated_at: new Date().toISOString()
      })
      .eq('id', referralId)
  } catch (error) {
    console.error('Error processing hire milestone:', error)
  }
}