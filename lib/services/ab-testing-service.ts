// A/B Testing Service - Campaign optimization through statistical testing
// Implements form variants, email sequences, and automatic winner selection

import { supabase } from '@/lib/supabase'
import type { 
  ABTest,
  ABTestVariant,
  ABTestResults,
  ABTestType,
  ABTestStatus,
  FormVariant,
  EmailSequence,
  ApiResponse
} from '@/lib/types'

/**
 * Create new A/B test
 */
export async function createABTest(testData: {
  name: string
  description: string
  testType: ABTestType
  hypothesis: string
  successMetric: string
  campaignId?: string
  variants: Omit<ABTestVariant, 'id' | 'testId'>[]
  confidenceLevel?: number
  minimumSampleSize?: number
  minimumEffectSize?: number
}): Promise<ApiResponse<ABTest>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate traffic split adds up to 100%
    const totalTrafficSplit = testData.variants.reduce((sum, variant) => {
      return sum + Object.values(variant.config?.trafficPercentage || { default: 0 })[0]
    }, 0)

    if (Math.abs(totalTrafficSplit - 100) > 0.01) {
      return { success: false, error: 'Traffic split must add up to 100%' }
    }

    // Create the test
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const test: ABTest = {
      id: testId,
      name: testData.name,
      description: testData.description,
      campaignId: testData.campaignId,
      testType: testData.testType,
      hypothesis: testData.hypothesis,
      successMetric: testData.successMetric,
      variants: testData.variants.map((variant, index) => ({
        ...variant,
        id: `variant_${testId}_${index}`,
        testId: testId,
        visitors: 0,
        conversions: 0,
        conversionRate: 0,
        isControl: index === 0
      })),
      trafficSplit: testData.variants.reduce((split, variant, index) => {
        split[`variant_${testId}_${index}`] = Object.values(variant.config?.trafficPercentage || { default: 0 })[0]
        return split
      }, {} as Record<string, number>),
      confidenceLevel: testData.confidenceLevel || 95,
      minimumSampleSize: testData.minimumSampleSize || 100,
      minimumEffectSize: testData.minimumEffectSize || 5,
      status: 'draft',
      startDate: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Store in database
    const { error } = await supabase
      .from('ab_tests')
      .insert({
        id: test.id,
        name: test.name,
        description: test.description,
        campaign_id: test.campaignId,
        test_type: test.testType,
        hypothesis: test.hypothesis,
        success_metric: test.successMetric,
        variants: test.variants,
        traffic_split: test.trafficSplit,
        confidence_level: test.confidenceLevel,
        minimum_sample_size: test.minimumSampleSize,
        minimum_effect_size: test.minimumEffectSize,
        status: test.status,
        start_date: test.startDate,
        created_at: test.created_at,
        updated_at: test.updated_at
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: test }
  } catch (error) {
    console.error('Error creating A/B test:', error)
    return { success: false, error: 'Failed to create A/B test' }
  }
}

/**
 * Launch A/B test
 */
export async function launchABTest(testId: string): Promise<ApiResponse<ABTest>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Get test data
    const { data: test, error: fetchError } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('id', testId)
      .single()

    if (fetchError || !test) {
      return { success: false, error: 'Test not found' }
    }

    if (test.status !== 'draft' && test.status !== 'ready_to_launch') {
      return { success: false, error: 'Test cannot be launched in current status' }
    }

    // Validate test configuration
    const validationResult = await validateTestConfiguration(test)
    if (!validationResult.isValid) {
      return { success: false, error: validationResult.error }
    }

    // Launch the test
    const { error: updateError } = await supabase
      .from('ab_tests')
      .update({
        status: 'running',
        start_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', testId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Get updated test
    const { data: updatedTest, error: refetchError } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('id', testId)
      .single()

    if (refetchError) {
      return { success: false, error: refetchError.message }
    }

    return { success: true, data: updatedTest }
  } catch (error) {
    console.error('Error launching A/B test:', error)
    return { success: false, error: 'Failed to launch A/B test' }
  }
}

/**
 * Record visitor for A/B test
 */
export async function recordTestVisitor(
  testId: string,
  visitorId: string,
  userAgent?: string,
  referrer?: string
): Promise<ApiResponse<{ variantId: string; variantConfig: any }>> {
  try {
    // Get test configuration
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('id', testId)
      .single()

    if (testError || !test) {
      return { success: false, error: 'Test not found' }
    }

    if (test.status !== 'running') {
      return { success: false, error: 'Test is not currently running' }
    }

    // Check if visitor already assigned
    const { data: existingAssignment, error: assignmentError } = await supabase
      .from('test_visitor_assignments')
      .select('variant_id, variant_config')
      .eq('test_id', testId)
      .eq('visitor_id', visitorId)
      .single()

    if (existingAssignment) {
      return {
        success: true,
        data: {
          variantId: existingAssignment.variant_id,
          variantConfig: existingAssignment.variant_config
        }
      }
    }

    // Assign visitor to variant based on traffic split
    const variantId = selectVariantForVisitor(test.traffic_split, visitorId)
    const variant = test.variants.find((v: any) => v.id === variantId)

    if (!variant) {
      return { success: false, error: 'Invalid variant assignment' }
    }

    // Record visitor assignment
    const { error: recordError } = await supabase
      .from('test_visitor_assignments')
      .insert({
        test_id: testId,
        variant_id: variantId,
        visitor_id: visitorId,
        assigned_at: new Date().toISOString(),
        user_agent: userAgent,
        referrer: referrer
      })

    if (recordError) {
      return { success: false, error: recordError.message }
    }

    // Increment visitor count for variant
    const { error: updateError } = await supabase
      .from('ab_tests')
      .update({
        variants: test.variants.map((v: any) => 
          v.id === variantId 
            ? { ...v, visitors: (v.visitors || 0) + 1 }
            : v
        ),
        updated_at: new Date().toISOString()
      })
      .eq('id', testId)

    if (updateError) {
      console.error('Error updating visitor count:', updateError)
    }

    return {
      success: true,
      data: {
        variantId: variantId,
        variantConfig: variant.config
      }
    }
  } catch (error) {
    console.error('Error recording test visitor:', error)
    return { success: false, error: 'Failed to record test visitor' }
  }
}

/**
 * Record conversion for A/B test
 */
export async function recordTestConversion(
  testId: string,
  visitorId: string,
  conversionValue?: number
): Promise<ApiResponse<void>> {
  try {
    // Get visitor assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('test_visitor_assignments')
      .select('variant_id')
      .eq('test_id', testId)
      .eq('visitor_id', visitorId)
      .single()

    if (assignmentError || !assignment) {
      return { success: false, error: 'Visitor assignment not found' }
    }

    // Check if already converted
    const { data: existingConversion, error: conversionCheck } = await supabase
      .from('test_conversions')
      .select('id')
      .eq('test_id', testId)
      .eq('visitor_id', visitorId)
      .single()

    if (existingConversion) {
      return { success: true, message: 'Conversion already recorded' }
    }

    // Record conversion
    const { error: recordError } = await supabase
      .from('test_conversions')
      .insert({
        test_id: testId,
        variant_id: assignment.variant_id,
        visitor_id: visitorId,
        conversion_value: conversionValue || 1,
        converted_at: new Date().toISOString()
      })

    if (recordError) {
      return { success: false, error: recordError.message }
    }

    // Update test conversion count
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .select('variants')
      .eq('id', testId)
      .single()

    if (test) {
      const updatedVariants = test.variants.map((v: any) => {
        if (v.id === assignment.variant_id) {
          const newConversions = (v.conversions || 0) + 1
          const newConversionRate = v.visitors > 0 ? newConversions / v.visitors : 0
          return {
            ...v,
            conversions: newConversions,
            conversionRate: newConversionRate
          }
        }
        return v
      })

      await supabase
        .from('ab_tests')
        .update({
          variants: updatedVariants,
          updated_at: new Date().toISOString()
        })
        .eq('id', testId)
    }

    return { success: true }
  } catch (error) {
    console.error('Error recording test conversion:', error)
    return { success: false, error: 'Failed to record test conversion' }
  }
}

/**
 * Calculate test results and significance
 */
export async function calculateTestResults(testId: string): Promise<ApiResponse<ABTestResults>> {
  try {
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('id', testId)
      .single()

    if (testError || !test) {
      return { success: false, error: 'Test not found' }
    }

    // Get detailed conversion data
    const { data: conversions, error: conversionError } = await supabase
      .from('test_conversions')
      .select('variant_id, conversion_value')
      .eq('test_id', testId)

    if (conversionError) {
      return { success: false, error: conversionError.message }
    }

    const totalVisitors = test.variants.reduce((sum: number, v: any) => sum + (v.visitors || 0), 0)
    const totalConversions = conversions?.length || 0

    // Calculate results for each variant
    const variantResults = test.variants.map((variant: any) => {
      const variantConversions = conversions?.filter(c => c.variant_id === variant.id).length || 0
      const conversionRate = variant.visitors > 0 ? variantConversions / variant.visitors : 0

      return {
        variantId: variant.id,
        visitors: variant.visitors || 0,
        conversions: variantConversions,
        conversionRate: conversionRate,
        confidenceInterval: calculateConfidenceInterval(variantConversions, variant.visitors || 0, 0.95)
      }
    })

    // Find control variant (first variant)
    const controlVariant = variantResults.find(v => 
      test.variants.find((tv: any) => tv.id === v.variantId)?.isControl
    )

    if (!controlVariant) {
      return { success: false, error: 'Control variant not found' }
    }

    // Calculate lift for non-control variants
    const variantResultsWithLift = variantResults.map(variant => {
      if (variant.variantId === controlVariant.variantId) {
        return variant
      }

      const lift = controlVariant.conversionRate > 0 
        ? ((variant.conversionRate - controlVariant.conversionRate) / controlVariant.conversionRate) * 100
        : 0

      return {
        ...variant,
        lift
      }
    })

    // Calculate statistical significance
    const significance = calculateStatisticalSignificance(variantResultsWithLift, controlVariant)

    // Determine recommended action
    const recommendedAction = determineRecommendedAction(
      significance, 
      variantResultsWithLift,
      test.minimum_effect_size,
      test.minimum_sample_size,
      totalVisitors
    )

    const results: ABTestResults = {
      testId: testId,
      totalVisitors: totalVisitors,
      totalConversions: totalConversions,
      pValue: significance.pValue,
      isSignificant: significance.isSignificant,
      confidenceLevel: test.confidence_level,
      variantResults: variantResultsWithLift,
      recommendedAction: recommendedAction.action,
      expectedImpact: recommendedAction.expectedImpact,
      calculatedAt: new Date().toISOString()
    }

    // Store results
    const { error: storeError } = await supabase
      .from('ab_tests')
      .update({
        results: results,
        updated_at: new Date().toISOString()
      })
      .eq('id', testId)

    if (storeError) {
      console.error('Error storing test results:', storeError)
    }

    return { success: true, data: results }
  } catch (error) {
    console.error('Error calculating test results:', error)
    return { success: false, error: 'Failed to calculate test results' }
  }
}

/**
 * Stop test and select winner
 */
export async function stopTestAndSelectWinner(
  testId: string,
  reason?: string
): Promise<ApiResponse<{ winner: ABTestVariant; results: ABTestResults }>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Calculate current results
    const resultsResponse = await calculateTestResults(testId)
    if (!resultsResponse.success || !resultsResponse.data) {
      return { success: false, error: 'Failed to calculate test results' }
    }

    const results = resultsResponse.data

    // Find winning variant (highest conversion rate with significance)
    let winner: any
    if (results.isSignificant) {
      winner = results.variantResults.reduce((best, current) => 
        current.conversionRate > best.conversionRate ? current : best
      )
    } else {
      // If not significant, use control variant as winner
      winner = results.variantResults.find(v => 
        results.variantResults.find(r => r.variantId === v.variantId)
      )
    }

    // Get full variant data
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('id', testId)
      .single()

    if (testError || !test) {
      return { success: false, error: 'Test not found' }
    }

    const winningVariant = test.variants.find((v: any) => v.id === winner.variantId)

    // Update test status
    const { error: updateError } = await supabase
      .from('ab_tests')
      .update({
        status: 'completed',
        actual_end_date: new Date().toISOString(),
        winner: winner.variantId,
        results: results,
        analysis_notes: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', testId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return {
      success: true,
      data: {
        winner: winningVariant,
        results: results
      }
    }
  } catch (error) {
    console.error('Error stopping test and selecting winner:', error)
    return { success: false, error: 'Failed to stop test and select winner' }
  }
}

/**
 * Get all tests for a campaign
 */
export async function getTestsForCampaign(
  campaignId: string,
  status?: ABTestStatus
): Promise<ApiResponse<ABTest[]>> {
  try {
    let query = supabase
      .from('ab_tests')
      .select('*')
      .eq('campaign_id', campaignId)

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false })

    const { data: tests, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: tests || [] }
  } catch (error) {
    console.error('Error getting tests for campaign:', error)
    return { success: false, error: 'Failed to get tests for campaign' }
  }
}

/**
 * Get running tests summary
 */
export async function getRunningTestsSummary(): Promise<ApiResponse<Array<{
  testId: string
  name: string
  testType: ABTestType
  startDate: string
  visitors: number
  conversions: number
  isSignificant: boolean
  leadingVariant?: string
}>>> {
  try {
    const { data: runningTests, error } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('status', 'running')
      .order('start_date', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    const summary = runningTests?.map(test => {
      const totalVisitors = test.variants?.reduce((sum: number, v: any) => sum + (v.visitors || 0), 0) || 0
      const totalConversions = test.variants?.reduce((sum: number, v: any) => sum + (v.conversions || 0), 0) || 0
      
      const leadingVariant = test.variants?.reduce((leader: any, current: any) => 
        (current.conversionRate || 0) > (leader.conversionRate || 0) ? current : leader
      )

      return {
        testId: test.id,
        name: test.name,
        testType: test.test_type,
        startDate: test.start_date,
        visitors: totalVisitors,
        conversions: totalConversions,
        isSignificant: test.results?.isSignificant || false,
        leadingVariant: leadingVariant?.name
      }
    }) || []

    return { success: true, data: summary }
  } catch (error) {
    console.error('Error getting running tests summary:', error)
    return { success: false, error: 'Failed to get running tests summary' }
  }
}

// Helper functions

/**
 * Validate test configuration before launch
 */
async function validateTestConfiguration(test: any): Promise<{ isValid: boolean; error?: string }> {
  // Check minimum number of variants
  if (!test.variants || test.variants.length < 2) {
    return { isValid: false, error: 'Test must have at least 2 variants' }
  }

  // Check traffic split
  const totalSplit = Object.values(test.traffic_split).reduce((sum: number, split: any) => sum + split, 0)
  if (Math.abs(totalSplit - 100) > 0.01) {
    return { isValid: false, error: 'Traffic split must add up to 100%' }
  }

  // Check for control variant
  const hasControl = test.variants.some((v: any) => v.isControl)
  if (!hasControl) {
    return { isValid: false, error: 'Test must have a control variant' }
  }

  return { isValid: true }
}

/**
 * Select variant for visitor based on traffic split and deterministic assignment
 */
function selectVariantForVisitor(trafficSplit: Record<string, number>, visitorId: string): string {
  // Use hash of visitor ID to ensure consistent assignment
  const hash = simpleHash(visitorId)
  const randomValue = (hash % 100) + 1 // 1-100

  let cumulativePercentage = 0
  for (const [variantId, percentage] of Object.entries(trafficSplit)) {
    cumulativePercentage += percentage
    if (randomValue <= cumulativePercentage) {
      return variantId
    }
  }

  // Fallback to first variant
  return Object.keys(trafficSplit)[0]
}

/**
 * Simple hash function for visitor ID
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Calculate confidence interval for conversion rate
 */
function calculateConfidenceInterval(
  conversions: number,
  visitors: number,
  confidence: number = 0.95
): { lower: number; upper: number } {
  if (visitors === 0) return { lower: 0, upper: 0 }

  const rate = conversions / visitors
  const z = confidence === 0.95 ? 1.96 : 2.58 // 95% or 99% confidence
  
  const margin = z * Math.sqrt((rate * (1 - rate)) / visitors)
  
  return {
    lower: Math.max(0, rate - margin),
    upper: Math.min(1, rate + margin)
  }
}

/**
 * Calculate statistical significance between variants
 */
function calculateStatisticalSignificance(
  variants: any[],
  control: any
): { pValue: number; isSignificant: boolean } {
  // Simplified chi-square test implementation
  // In production, you'd want a more robust statistical library
  
  if (variants.length < 2 || control.visitors < 30) {
    return { pValue: 1.0, isSignificant: false }
  }

  // Find the best performing variant (excluding control)
  const testVariants = variants.filter(v => v.variantId !== control.variantId)
  if (testVariants.length === 0) {
    return { pValue: 1.0, isSignificant: false }
  }

  const bestVariant = testVariants.reduce((best, current) => 
    current.conversionRate > best.conversionRate ? current : best
  )

  // Calculate z-score for proportion test
  const p1 = control.conversionRate
  const p2 = bestVariant.conversionRate
  const n1 = control.visitors
  const n2 = bestVariant.visitors

  if (n1 < 30 || n2 < 30) {
    return { pValue: 1.0, isSignificant: false }
  }

  const pooledP = (control.conversions + bestVariant.conversions) / (n1 + n2)
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2))
  
  if (se === 0) {
    return { pValue: 1.0, isSignificant: false }
  }

  const zScore = Math.abs(p1 - p2) / se
  
  // Approximate p-value calculation
  const pValue = 2 * (1 - normalCDF(zScore))
  
  return {
    pValue: pValue,
    isSignificant: pValue < 0.05
  }
}

/**
 * Approximate normal CDF (for p-value calculation)
 */
function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)))
}

/**
 * Approximate error function
 */
function erf(x: number): number {
  // Abramowitz and Stegun approximation
  const a1 =  0.254829592
  const a2 = -0.284496736
  const a3 =  1.421413741
  const a4 = -1.453152027
  const a5 =  1.061405429
  const p  =  0.3275911
  
  const sign = x >= 0 ? 1 : -1
  x = Math.abs(x)
  
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  
  return sign * y
}

/**
 * Determine recommended action based on test results
 */
function determineRecommendedAction(
  significance: { pValue: number; isSignificant: boolean },
  variants: any[],
  minimumEffectSize: number,
  minimumSampleSize: number,
  totalVisitors: number
): { action: 'implement_winner' | 'continue_testing' | 'redesign' | 'inconclusive'; expectedImpact?: number } {
  
  if (totalVisitors < minimumSampleSize) {
    return { action: 'continue_testing' }
  }

  if (!significance.isSignificant) {
    return { action: 'inconclusive' }
  }

  const winner = variants.reduce((best, current) => 
    current.conversionRate > best.conversionRate ? current : best
  )

  const bestLift = winner.lift || 0

  if (bestLift >= minimumEffectSize) {
    return {
      action: 'implement_winner',
      expectedImpact: bestLift
    }
  }

  if (bestLift < 0) {
    return { action: 'redesign' }
  }

  return { action: 'continue_testing' }
}