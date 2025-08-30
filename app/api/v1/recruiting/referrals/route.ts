// Referral Program API - Comprehensive referral management endpoints
// Handles referral creation, bonus tracking, and leaderboard management

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createReferralFromLead,
  updateReferralStatus,
  processBonusPayments,
  getReferralLeaderboard,
  getReferralAnalytics,
  createReferralProgram
} from '@/lib/services/guard-referral-service'

// Validation schemas
const createReferralSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  referralCode: z.string().optional(),
  referrerGuardId: z.string().optional()
}).refine((data) => {
  return data.referralCode || data.referrerGuardId
}, {
  message: 'Either referral code or referrer guard ID is required',
  path: ['referralCode']
})

const updateReferralSchema = z.object({
  referralId: z.string().min(1, 'Referral ID is required'),
  status: z.enum([
    'referred',
    'contacted',
    'qualified',
    'disqualified',
    'hired',
    'rejected',
    'withdrawn'
  ]),
  stage: z.enum([
    'initial_contact',
    'qualification',
    'application',
    'background_check',
    'interview',
    'decision',
    'onboarding'
  ]),
  notes: z.string().optional()
})

const processBonusSchema = z.object({
  programId: z.string().optional()
})

const leaderboardSchema = z.object({
  startDate: z.string().datetime({ message: 'Invalid start date format' }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime({ message: 'Invalid end date format' }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  programId: z.string().optional()
}).refine((data) => {
  const startDate = new Date(data.startDate)
  const endDate = new Date(data.endDate)
  return startDate <= endDate
}, {
  message: 'Start date must be before or equal to end date'
})

const analyticsFiltersSchema = z.object({
  programId: z.string().optional(),
  dateRange: z.object({
    start: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    end: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  }).optional(),
  referrerId: z.string().optional()
}).refine((data) => {
  if (data.dateRange) {
    const startDate = new Date(data.dateRange.start)
    const endDate = new Date(data.dateRange.end)
    return startDate <= endDate
  }
  return true
}, {
  message: 'Start date must be before or equal to end date',
  path: ['dateRange']
})

const createProgramSchema = z.object({
  name: z.string().min(1, 'Program name is required'),
  description: z.string(),
  isActive: z.boolean().default(true),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  referrerEligibility: z.object({
    minimumTenure: z.number().min(0, 'Minimum tenure must be 0 or greater'),
    goodStanding: z.boolean(),
    minimumPerformanceRating: z.number().min(0).max(10),
    excludedRoles: z.array(z.string()).optional()
  }),
  bonusStructure: z.object({
    type: z.enum(['flat', 'tiered', 'milestone']),
    flatAmount: z.number().min(0).optional(),
    tiers: z.array(z.object({
      minReferrals: z.number().min(0),
      maxReferrals: z.number().min(0).optional(),
      bonusAmount: z.number().min(0)
    })).optional(),
    milestones: z.array(z.object({
      milestone: z.enum(['application_submitted', '30_days', '60_days', '90_days', '6_months', '1_year']),
      percentage: z.number().min(0).max(100),
      amount: z.number().min(0).optional(),
      description: z.string()
    })).optional(),
    qualityBonus: z.object({
      scoreThreshold: z.number().min(0).max(100),
      bonusAmount: z.number().min(0)
    }).optional(),
    urgentHireBonus: z.object({
      timeToFill: z.number().min(1),
      bonusAmount: z.number().min(0)
    }).optional()
  }),
  maxReferralsPerPerson: z.number().min(1).optional(),
  maxBonusPerPerson: z.number().min(0).optional(),
  trackingPeriod: z.number().min(1, 'Tracking period must be at least 1 day').default(90)
})

/**
 * GET /api/v1/recruiting/referrals - Get referral data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'analytics'

    if (action === 'leaderboard') {
      // Get referral leaderboard
      const rawParams = {
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
        programId: searchParams.get('programId')
      }

      // Remove null values and validate required parameters
      if (!rawParams.startDate || !rawParams.endDate) {
        return NextResponse.json({
          success: false,
          error: 'Start date and end date are required for leaderboard'
        }, { status: 400 })
      }

      const params = Object.fromEntries(
        Object.entries(rawParams).filter(([_, value]) => value !== null)
      )

      const validationResult = leaderboardSchema.safeParse(params)
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Invalid leaderboard parameters',
          details: validationResult.error.errors
        }, { status: 400 })
      }

      const { startDate, endDate, programId } = validationResult.data

      const result = await getReferralLeaderboard(
        { startDate, endDate },
        programId
      )

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
    
    else if (action === 'analytics') {
      // Get referral analytics
      const rawFilters: any = {}

      // Program ID
      const programId = searchParams.get('programId')
      if (programId) {
        rawFilters.programId = programId
      }

      // Date range
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      if (startDate && endDate) {
        rawFilters.dateRange = { start: startDate, end: endDate }
      }

      // Referrer ID
      const referrerId = searchParams.get('referrerId')
      if (referrerId) {
        rawFilters.referrerId = referrerId
      }

      // Remove undefined values
      const filters = Object.fromEntries(
        Object.entries(rawFilters).filter(([_, value]) => value !== undefined && value !== null)
      )

      // Validate filters if any exist
      let validatedFilters = undefined
      if (Object.keys(filters).length > 0) {
        const validationResult = analyticsFiltersSchema.safeParse(filters)
        if (!validationResult.success) {
          return NextResponse.json({
            success: false,
            error: 'Invalid analytics parameters',
            details: validationResult.error.errors
          }, { status: 400 })
        }
        validatedFilters = validationResult.data
      }

      const result = await getReferralAnalytics(validatedFilters)

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
        error: 'Invalid action parameter. Use: leaderboard or analytics'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in GET /api/v1/recruiting/referrals:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * POST /api/v1/recruiting/referrals - Create referral or process bonuses
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'create'
    
    const body = await request.json()

    if (action === 'create') {
      // Create new referral
      const validationResult = createReferralSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Invalid referral data',
          details: validationResult.error.errors
        }, { status: 400 })
      }

      const result = await createReferralFromLead(
        validationResult.data.leadId,
        validationResult.data.referralCode,
        validationResult.data.referrerGuardId
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
        message: 'Referral created successfully'
      }, { status: 201 })
    }
    
    else if (action === 'process-bonuses') {
      // Process bonus payments
      const validationResult = processBonusSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Invalid bonus processing data',
          details: validationResult.error.errors
        }, { status: 400 })
      }

      const result = await processBonusPayments(validationResult.data.programId)

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        message: `Processed ${result.data?.processed || 0} bonus payments totaling $${result.data?.totalAmount || 0}`
      })
    }
    
    else if (action === 'create-program') {
      // Create referral program
      const validationResult = createProgramSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Invalid program data',
          details: validationResult.error.errors
        }, { status: 400 })
      }

      // Additional validation for bonus structure
      const { bonusStructure } = validationResult.data
      if (bonusStructure.type === 'flat' && !bonusStructure.flatAmount) {
        return NextResponse.json({
          success: false,
          error: 'Flat amount is required for flat bonus structure'
        }, { status: 400 })
      }

      if (bonusStructure.type === 'tiered' && (!bonusStructure.tiers || bonusStructure.tiers.length === 0)) {
        return NextResponse.json({
          success: false,
          error: 'Tiers are required for tiered bonus structure'
        }, { status: 400 })
      }

      if (bonusStructure.type === 'milestone' && (!bonusStructure.milestones || bonusStructure.milestones.length === 0)) {
        return NextResponse.json({
          success: false,
          error: 'Milestones are required for milestone bonus structure'
        }, { status: 400 })
      }

      const result = await createReferralProgram(validationResult.data)

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        message: 'Referral program created successfully'
      }, { status: 201 })
    }
    
    else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action parameter. Use: create, process-bonuses, or create-program'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in POST /api/v1/recruiting/referrals:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/v1/recruiting/referrals - Update referral status
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validationResult = updateReferralSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid referral update data',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { referralId, status, stage, notes } = validationResult.data

    // Update referral
    const result = await updateReferralStatus(referralId, status, stage, notes)
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Referral updated successfully'
    })
  } catch (error) {
    console.error('Error in PATCH /api/v1/recruiting/referrals:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}