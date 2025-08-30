// Lead Scoring API - Advanced qualification and prioritization endpoints
// Handles lead scoring calculations and configuration management

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  calculateLeadScore,
  batchScoreLeads,
  getPrioritizedLeads,
  updateScoringConfig,
  analyzeScoringAccuracy,
  getDefaultScoringConfig
} from '@/lib/services/guard-lead-scoring-service'

// Validation schemas
const calculateScoreSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  configId: z.string().optional()
})

const batchScoreSchema = z.object({
  leadIds: z.array(z.string()).min(1, 'At least one lead ID is required').max(100, 'Maximum 100 leads allowed'),
  configId: z.string().optional()
})

const prioritizedLeadsSchema = z.object({
  recruiterId: z.string().optional(),
  status: z.array(z.enum([
    'new',
    'contacted', 
    'qualified',
    'disqualified',
    'nurturing',
    'application_pending',
    'converted',
    'lost'
  ])).optional(),
  limit: z.number().min(1).max(100).default(50)
})

const updateConfigSchema = z.object({
  configId: z.string().min(1, 'Config ID is required'),
  name: z.string().optional(),
  description: z.string().optional(),
  qualificationThreshold: z.number().min(0).max(100).optional(),
  highPriorityThreshold: z.number().min(0).max(100).optional(),
  factors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.enum([
      'experience',
      'location',
      'availability',
      'certifications',
      'background',
      'salary_expectations',
      'transportation',
      'motivation',
      'source_quality'
    ]),
    weight: z.number().min(0).max(1),
    isActive: z.boolean(),
    scoringRules: z.array(z.object({
      id: z.string(),
      condition: z.string(),
      points: z.number(),
      description: z.string()
    }))
  })).optional()
})

const accuracyAnalysisSchema = z.object({
  configId: z.string().optional(),
  lookbackDays: z.number().min(7).max(365).default(90)
})

/**
 * GET /api/v1/recruiting/lead-scoring - Get scoring configuration or prioritized leads
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'prioritized') {
      // Get prioritized leads
      const rawParams = {
        recruiterId: searchParams.get('recruiterId'),
        status: searchParams.get('status')?.split(','),
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
      }

      // Remove undefined values
      const params = Object.fromEntries(
        Object.entries(rawParams).filter(([_, value]) => value !== undefined && value !== null)
      )

      const validationResult = prioritizedLeadsSchema.safeParse(params)
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        }, { status: 400 })
      }

      const result = await getPrioritizedLeads(
        validationResult.data.recruiterId,
        validationResult.data.status,
        validationResult.data.limit
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
    
    else if (action === 'config') {
      // Get scoring configuration
      const result = await getDefaultScoringConfig()
      
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
    
    else if (action === 'accuracy') {
      // Get scoring accuracy analysis
      const rawParams = {
        configId: searchParams.get('configId'),
        lookbackDays: searchParams.get('lookbackDays') ? parseInt(searchParams.get('lookbackDays')!) : undefined
      }

      const params = Object.fromEntries(
        Object.entries(rawParams).filter(([_, value]) => value !== undefined && value !== null)
      )

      const validationResult = accuracyAnalysisSchema.safeParse(params)
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Invalid analysis parameters',
          details: validationResult.error.errors
        }, { status: 400 })
      }

      const result = await analyzeScoringAccuracy(
        validationResult.data.configId,
        validationResult.data.lookbackDays
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
    
    else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action parameter. Use: prioritized, config, or accuracy'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in GET /api/v1/recruiting/lead-scoring:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * POST /api/v1/recruiting/lead-scoring - Calculate lead scores
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'single'

    const body = await request.json()

    if (action === 'batch') {
      // Batch score multiple leads
      const validationResult = batchScoreSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Invalid batch scoring data',
          details: validationResult.error.errors
        }, { status: 400 })
      }

      const result = await batchScoreLeads(
        validationResult.data.leadIds,
        validationResult.data.configId
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
        message: result.message || `Scored ${result.data?.length || 0} leads successfully`,
        count: result.data?.length || 0
      })
    } 
    
    else if (action === 'single') {
      // Calculate single lead score
      const validationResult = calculateScoreSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Invalid scoring data',
          details: validationResult.error.errors
        }, { status: 400 })
      }

      const result = await calculateLeadScore(
        validationResult.data.leadId,
        validationResult.data.configId
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
        message: 'Lead score calculated successfully'
      })
    }
    
    else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action parameter. Use: single or batch'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in POST /api/v1/recruiting/lead-scoring:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/v1/recruiting/lead-scoring - Update scoring configuration
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validationResult = updateConfigSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid configuration data',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { configId, ...updates } = validationResult.data

    // Update scoring configuration
    const result = await updateScoringConfig(configId, updates)
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Scoring configuration updated successfully'
    })
  } catch (error) {
    console.error('Error in PATCH /api/v1/recruiting/lead-scoring:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}