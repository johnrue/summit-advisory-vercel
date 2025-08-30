import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  generateProposal,
  getProposalTemplates,
  getProposalHistory,
  submitForApproval,
  reviewProposal
} from '@/lib/services/proposal-generation-service'

// Proposal generation schema
const generateProposalSchema = z.object({
  contractId: z.string().uuid('Valid contract ID is required'),
  templateId: z.string().uuid('Valid template ID is required'),
  variables: z.record(z.any()).optional(),
  customSections: z.array(z.object({
    title: z.string(),
    content: z.string(),
    position: z.number()
  })).optional(),
  pricingOverrides: z.object({
    baseRate: z.number().optional(),
    rateType: z.enum(['hourly', 'monthly', 'annual']).optional(),
    modifiers: z.array(z.any()).optional(),
    discounts: z.array(z.any()).optional()
  }).optional(),
  approvalRequired: z.boolean().default(false),
  validUntil: z.string().optional()
})

// Approval submission schema
const submitApprovalSchema = z.object({
  proposalGenerationId: z.string().uuid(),
  notes: z.string().optional()
})

// Review schema
const reviewProposalSchema = z.object({
  proposalGenerationId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  reviewNotes: z.string().optional()
})

/**
 * GET /api/v1/contracts/proposals
 * Get proposal templates or proposal history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const serviceType = searchParams.get('serviceType')
    const contractId = searchParams.get('contractId')
    const limit = parseInt(searchParams.get('limit') || '25')

    if (action === 'templates') {
      const result = await getProposalTemplates(serviceType || undefined)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 400 }
        )
      }

      return NextResponse.json(result.data)
    }

    if (action === 'history') {
      const result = await getProposalHistory(contractId || undefined, limit)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 400 }
        )
      }

      return NextResponse.json(result.data)
    }

    return NextResponse.json(
      { error: 'Invalid action parameter', message: 'Action must be "templates" or "history"' },
      { status: 400 }
    )

  } catch (error) {
    console.error('GET /api/v1/contracts/proposals error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to process request' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/contracts/proposals
 * Generate a new proposal or submit for approval
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action

    if (action === 'generate') {
      // Validate proposal generation data
      const validatedData = generateProposalSchema.parse(body)

      const result = await generateProposal(validatedData)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 400 }
        )
      }

      return NextResponse.json(result.data, { status: 201 })
    }

    if (action === 'submit_approval') {
      // Validate approval submission data
      const validatedData = submitApprovalSchema.parse(body)

      const result = await submitForApproval(
        validatedData.proposalGenerationId,
        validatedData.notes
      )
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { message: result.message },
        { status: 200 }
      )
    }

    if (action === 'review') {
      // Validate review data
      const validatedData = reviewProposalSchema.parse(body)

      const result = await reviewProposal(
        validatedData.proposalGenerationId,
        validatedData.action,
        validatedData.reviewNotes
      )
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { message: result.message },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { error: 'Invalid action', message: 'Action must be "generate", "submit_approval", or "review"' },
      { status: 400 }
    )

  } catch (error) {
    console.error('POST /api/v1/contracts/proposals error:', error)
    
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
      { error: 'Internal server error', message: 'Failed to process proposal request' },
      { status: 500 }
    )
  }
}