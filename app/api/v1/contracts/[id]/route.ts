import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  getContractById,
  updateContract,
  deleteContract,
  updateContractStatus
} from '@/lib/services/contract-management-service'

// Contract update schema
const updateContractSchema = z.object({
  clientName: z.string().min(1).max(100).optional(),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
  companyName: z.string().optional(),
  serviceType: z.enum(['armed', 'unarmed', 'event', 'executive', 'commercial']).optional(),
  estimatedValue: z.number().min(1).optional(),
  actualValue: z.number().min(0).optional(),
  monthlyRecurringRevenue: z.number().min(0).optional(),
  billingCycle: z.enum(['monthly', 'quarterly', 'annually']).optional(),
  proposalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  renewalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  signedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['prospect', 'proposal', 'negotiation', 'signed', 'active', 'renewal', 'closed', 'lost']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  autoRenew: z.boolean().optional(),
  renewalNoticeRequired: z.number().min(1).max(365).optional()
})

// Status update schema
const statusUpdateSchema = z.object({
  status: z.enum(['prospect', 'proposal', 'negotiation', 'signed', 'active', 'renewal', 'closed', 'lost'])
})

/**
 * GET /api/v1/contracts/[id]
 * Retrieve a specific contract by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id

    // Validate UUID format
    if (!contractId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { error: 'Invalid contract ID format' },
        { status: 400 }
      )
    }

    const result = await getContractById(contractId)
    
    if (!result.success) {
      const status = result.error === 'Contract not found' ? 404 : 400
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status }
      )
    }

    return NextResponse.json(result.data)

  } catch (error) {
    console.error('GET /api/v1/contracts/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve contract' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/contracts/[id]
 * Update a contract
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id
    const body = await request.json()

    // Validate UUID format
    if (!contractId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { error: 'Invalid contract ID format' },
        { status: 400 }
      )
    }

    // Validate request body
    const validatedData = updateContractSchema.parse(body)

    // Validate date logic if both start and end dates are provided
    if (validatedData.startDate && validatedData.endDate) {
      if (new Date(validatedData.startDate) >= new Date(validatedData.endDate)) {
        return NextResponse.json(
          { error: 'Start date must be before end date' },
          { status: 400 }
        )
      }
    }

    const result = await updateContract(contractId, validatedData)
    
    if (!result.success) {
      const status = result.error === 'Contract not found' ? 404 : 400
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status }
      )
    }

    return NextResponse.json(result.data)

  } catch (error) {
    console.error('PUT /api/v1/contracts/[id] error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          message: 'Invalid contract data provided',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update contract' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/contracts/[id]
 * Delete a contract
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id

    // Validate UUID format
    if (!contractId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { error: 'Invalid contract ID format' },
        { status: 400 }
      )
    }

    const result = await deleteContract(contractId)
    
    if (!result.success) {
      const status = result.error === 'Contract not found' ? 404 : 400
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status }
      )
    }

    return NextResponse.json({ message: 'Contract deleted successfully' })

  } catch (error) {
    console.error('DELETE /api/v1/contracts/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to delete contract' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/v1/contracts/[id]
 * Update contract status (for Kanban drag and drop)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id
    const body = await request.json()

    // Validate UUID format
    if (!contractId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { error: 'Invalid contract ID format' },
        { status: 400 }
      )
    }

    // Check if this is a status update
    if ('status' in body) {
      const { status } = statusUpdateSchema.parse(body)
      
      const result = await updateContractStatus(contractId, status)
      
      if (!result.success) {
        const statusCode = result.error === 'Contract not found' ? 404 : 400
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: statusCode }
        )
      }

      return NextResponse.json(result.data)
    }

    // Otherwise, treat as general update
    const validatedData = updateContractSchema.parse(body)
    const result = await updateContract(contractId, validatedData)
    
    if (!result.success) {
      const status = result.error === 'Contract not found' ? 404 : 400
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status }
      )
    }

    return NextResponse.json(result.data)

  } catch (error) {
    console.error('PATCH /api/v1/contracts/[id] error:', error)
    
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
      { error: 'Internal server error', message: 'Failed to update contract' },
      { status: 500 }
    )
  }
}