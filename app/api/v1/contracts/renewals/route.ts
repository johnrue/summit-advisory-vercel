import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  getRenewalPipeline,
  createRenewalOpportunities,
  processPendingRenewalAlerts,
  updateRenewalStatus,
  getChurnRiskAnalysis
} from '@/lib/services/contract-renewal-service'

// Renewal status update schema
const updateRenewalSchema = z.object({
  renewalId: z.string().uuid(),
  status: z.enum(['in_progress', 'completed', 'declined', 'expired']),
  notes: z.string().optional()
})

/**
 * GET /api/v1/contracts/renewals
 * Get renewal pipeline, churn analysis, or process alerts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const daysAhead = parseInt(searchParams.get('daysAhead') || '180')

    if (action === 'pipeline' || !action) {
      const result = await getRenewalPipeline(daysAhead)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 400 }
        )
      }

      return NextResponse.json(result.data)
    }

    if (action === 'churn_analysis') {
      const result = await getChurnRiskAnalysis()
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 400 }
        )
      }

      return NextResponse.json(result.data)
    }

    if (action === 'process_alerts') {
      const result = await processPendingRenewalAlerts()
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 400 }
        )
      }

      return NextResponse.json(result.data)
    }

    return NextResponse.json(
      { error: 'Invalid action parameter', message: 'Action must be "pipeline", "churn_analysis", or "process_alerts"' },
      { status: 400 }
    )

  } catch (error) {
    console.error('GET /api/v1/contracts/renewals error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to process renewal request' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/contracts/renewals
 * Create renewal opportunities or update renewal status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action

    if (action === 'create_opportunities') {
      const result = await createRenewalOpportunities()
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 400 }
        )
      }

      return NextResponse.json(result.data, { status: 201 })
    }

    if (action === 'update_status') {
      // Validate renewal update data
      const validatedData = updateRenewalSchema.parse(body)

      const result = await updateRenewalStatus(
        validatedData.renewalId,
        validatedData.status,
        validatedData.notes
      )
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 400 }
        )
      }

      return NextResponse.json(result.data, { status: 200 })
    }

    return NextResponse.json(
      { error: 'Invalid action', message: 'Action must be "create_opportunities" or "update_status"' },
      { status: 400 }
    )

  } catch (error) {
    console.error('POST /api/v1/contracts/renewals error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          message: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to process renewal request' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/contracts/renewals
 * Bulk update renewal statuses
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    const bulkUpdateSchema = z.object({
      updates: z.array(z.object({
        renewalId: z.string().uuid(),
        status: z.enum(['in_progress', 'completed', 'declined', 'expired']),
        notes: z.string().optional()
      })).min(1).max(20) // Limit bulk operations
    })

    const { updates } = bulkUpdateSchema.parse(body)

    const results = []
    const errors = []

    // Process updates sequentially for data consistency
    for (const update of updates) {
      try {
        const result = await updateRenewalStatus(
          update.renewalId,
          update.status,
          update.notes
        )
        
        if (result.success) {
          results.push({ renewalId: update.renewalId, status: 'success' })
        } else {
          errors.push({ renewalId: update.renewalId, error: result.error })
        }
      } catch (error) {
        errors.push({ renewalId: update.renewalId, error: 'Failed to update renewal' })
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      updated: results.length,
      errors: errors.length,
      results,
      errorDetails: errors
    })

  } catch (error) {
    console.error('PUT /api/v1/contracts/renewals error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          message: 'Invalid bulk update data',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to process bulk renewal update' },
      { status: 500 }
    )
  }
}