// A/B Testing API - Campaign optimization endpoints
// Handles test creation, visitor assignment, conversion tracking, and results analysis

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createABTest,
  launchABTest,
  recordTestVisitor,
  recordTestConversion,
  calculateTestResults,
  stopTestAndSelectWinner,
  getTestsForCampaign,
  getRunningTestsSummary
} from '@/lib/services/ab-testing-service'

// Validation schemas
const createTestSchema = z.object({
  name: z.string().min(1, 'Test name is required'),
  description: z.string(),
  testType: z.enum([
    'landing_page',
    'form_variant',
    'email_subject',
    'email_content',
    'call_to_action',
    'headline',
    'pricing',
    'application_flow'
  ]),
  hypothesis: z.string().min(1, 'Hypothesis is required'),
  successMetric: z.string().min(1, 'Success metric is required'),
  campaignId: z.string().optional(),
  variants: z.array(z.object({
    name: z.string().min(1, 'Variant name is required'),
    description: z.string(),
    config: z.record(z.any()),
    isControl: z.boolean().default(false)
  })).min(2, 'At least 2 variants required'),
  confidenceLevel: z.number().min(80).max(99).default(95),
  minimumSampleSize: z.number().min(50).default(100),
  minimumEffectSize: z.number().min(1).max(50).default(5)
})

const visitorAssignmentSchema = z.object({
  testId: z.string().min(1, 'Test ID is required'),
  visitorId: z.string().min(1, 'Visitor ID is required'),
  userAgent: z.string().optional(),
  referrer: z.string().optional()
})

const conversionTrackingSchema = z.object({
  testId: z.string().min(1, 'Test ID is required'),
  visitorId: z.string().min(1, 'Visitor ID is required'),
  conversionValue: z.number().min(0).optional()
})

const stopTestSchema = z.object({
  testId: z.string().min(1, 'Test ID is required'),
  reason: z.string().optional()
})

const campaignFiltersSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID is required'),
  status: z.enum([
    'draft',
    'ready_to_launch',
    'running',
    'paused',
    'completed',
    'stopped',
    'inconclusive'
  ]).optional()
})

/**
 * GET /api/v1/recruiting/ab-testing - Get tests or test summary
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'summary') {
      // Get running tests summary
      const result = await getRunningTestsSummary()
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        count: result.data?.length || 0
      })
    }
    
    else if (action === 'campaign') {
      // Get tests for specific campaign
      const rawParams = {
        campaignId: searchParams.get('campaignId'),
        status: searchParams.get('status')
      }

      const params = Object.fromEntries(
        Object.entries(rawParams).filter(([_, value]) => value !== undefined && value !== null)
      )

      const validationResult = campaignFiltersSchema.safeParse(params)
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Invalid campaign parameters',
          details: validationResult.error.errors
        }, { status: 400 })
      }

      const result = await getTestsForCampaign(
        validationResult.data.campaignId,
        validationResult.data.status
      )

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        count: result.data?.length || 0
      })
    }
    
    else if (action === 'results') {
      // Calculate test results
      const testId = searchParams.get('testId')
      if (!testId) {
        return NextResponse.json({
          success: false,
          error: 'Test ID is required for results calculation'
        }, { status: 400 })
      }

      const result = await calculateTestResults(testId)
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    }
    
    else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action parameter. Use: summary, campaign, or results'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in GET /api/v1/recruiting/ab-testing:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * POST /api/v1/recruiting/ab-testing - Create test, assign visitor, or track conversion
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'create'
    
    const body = await request.json()

    if (action === 'create') {
      // Create new A/B test
      const validationResult = createTestSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Invalid test data',
          details: validationResult.error.errors
        }, { status: 400 })
      }

      // Validate traffic split adds up to 100%
      const totalSplit = validationResult.data.variants.reduce((sum, variant) => {
        const trafficPercentage = variant.config?.trafficPercentage || 0
        return sum + (typeof trafficPercentage === 'number' ? trafficPercentage : 0)
      }, 0)

      if (Math.abs(totalSplit - 100) > 0.01 && totalSplit > 0) {
        return NextResponse.json({
          success: false,
          error: 'Variant traffic percentages must add up to 100%'
        }, { status: 400 })
      }

      // Ensure exactly one control variant
      const controlCount = validationResult.data.variants.filter(v => v.isControl).length
      if (controlCount !== 1) {
        return NextResponse.json({
          success: false,
          error: 'Exactly one variant must be marked as control'
        }, { status: 400 })
      }

      const result = await createABTest(validationResult.data)
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        message: 'A/B test created successfully'
      }, { status: 201 })
    }
    
    else if (action === 'assign') {
      // Assign visitor to test variant
      const validationResult = visitorAssignmentSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Invalid visitor assignment data',
          details: validationResult.error.errors
        }, { status: 400 })
      }

      const result = await recordTestVisitor(
        validationResult.data.testId,
        validationResult.data.visitorId,
        validationResult.data.userAgent,
        validationResult.data.referrer
      )

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        message: 'Visitor assigned to test variant'
      })
    }
    
    else if (action === 'convert') {
      // Track conversion
      const validationResult = conversionTrackingSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Invalid conversion tracking data',
          details: validationResult.error.errors
        }, { status: 400 })
      }

      const result = await recordTestConversion(
        validationResult.data.testId,
        validationResult.data.visitorId,
        validationResult.data.conversionValue
      )

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: 'Conversion recorded successfully'
      })
    }
    
    else if (action === 'launch') {
      // Launch test
      const testId = body.testId
      if (!testId) {
        return NextResponse.json({
          success: false,
          error: 'Test ID is required to launch test'
        }, { status: 400 })
      }

      const result = await launchABTest(testId)
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        message: 'A/B test launched successfully'
      })
    }
    
    else if (action === 'stop') {
      // Stop test and select winner
      const validationResult = stopTestSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Invalid stop test data',
          details: validationResult.error.errors
        }, { status: 400 })
      }

      const result = await stopTestAndSelectWinner(
        validationResult.data.testId,
        validationResult.data.reason
      )

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        message: 'Test stopped and winner selected'
      })
    }
    
    else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action parameter. Use: create, assign, convert, launch, or stop'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in POST /api/v1/recruiting/ab-testing:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}