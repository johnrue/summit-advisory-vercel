import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  createContract, 
  getContracts, 
  getContractStats 
} from '@/lib/services/contract-management-service'

// Contract creation schema
const createContractSchema = z.object({
  clientName: z.string().min(1, 'Client name is required').max(100),
  clientEmail: z.string().email('Valid email is required'),
  clientPhone: z.string().optional(),
  companyName: z.string().optional(),
  serviceType: z.enum(['armed', 'unarmed', 'event', 'executive', 'commercial']),
  estimatedValue: z.number().min(1, 'Contract value must be positive'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  notes: z.string().optional()
})

// Contract filters schema
const filtersSchema = z.object({
  status: z.array(z.string()).optional(),
  assignedManager: z.string().uuid().optional(),
  serviceType: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  valueRange: z.object({
    min: z.number().optional(),
    max: z.number().optional()
  }).optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional()
}).optional()

/**
 * GET /api/v1/contracts
 * Retrieve contracts with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '25'), 100)
    const includeStats = searchParams.get('includeStats') === 'true'
    
    // Parse filters from query params
    const filters: any = {}
    
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')!.split(',')
    }
    
    if (searchParams.get('assignedManager')) {
      filters.assignedManager = searchParams.get('assignedManager')
    }
    
    if (searchParams.get('serviceType')) {
      filters.serviceType = searchParams.get('serviceType')!.split(',')
    }
    
    if (searchParams.get('priority')) {
      filters.priority = searchParams.get('priority')!.split(',')
    }
    
    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')
    }
    
    if (searchParams.get('tags')) {
      filters.tags = searchParams.get('tags')!.split(',')
    }
    
    // Parse date range
    if (searchParams.get('dateStart') && searchParams.get('dateEnd')) {
      filters.dateRange = {
        start: searchParams.get('dateStart'),
        end: searchParams.get('dateEnd')
      }
    }
    
    // Parse value range
    if (searchParams.get('minValue') || searchParams.get('maxValue')) {
      filters.valueRange = {}
      if (searchParams.get('minValue')) {
        filters.valueRange.min = parseFloat(searchParams.get('minValue')!)
      }
      if (searchParams.get('maxValue')) {
        filters.valueRange.max = parseFloat(searchParams.get('maxValue')!)
      }
    }

    // Validate filters
    const validatedFilters = filtersSchema.parse(Object.keys(filters).length > 0 ? filters : undefined)

    // Get contracts
    const result = await getContracts(validatedFilters, page, pageSize)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 400 }
      )
    }

    let response: any = result.data

    // Include stats if requested
    if (includeStats) {
      const statsResult = await getContractStats(validatedFilters)
      if (statsResult.success) {
        response = {
          ...response,
          stats: statsResult.data
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('GET /api/v1/contracts error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          message: 'Invalid request parameters',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve contracts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/contracts
 * Create a new contract
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = createContractSchema.parse(body)

    // Create contract
    const result = await createContract(validatedData)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json(result.data, { status: 201 })

  } catch (error) {
    console.error('POST /api/v1/contracts error:', error)
    
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
      { error: 'Internal server error', message: 'Failed to create contract' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/v1/contracts/bulk
 * Bulk update contract statuses (for Kanban operations)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    
    const bulkUpdateSchema = z.object({
      updates: z.array(z.object({
        id: z.string().uuid(),
        status: z.enum(['prospect', 'proposal', 'negotiation', 'signed', 'active', 'renewal', 'closed', 'lost'])
      })).min(1).max(50) // Limit bulk operations
    })

    const { updates } = bulkUpdateSchema.parse(body)

    const results = []
    const errors = []

    // Process updates (in a real app, you'd want to do this in a transaction)
    for (const update of updates) {
      try {
        const { updateContractStatus } = await import('@/lib/services/contract-management-service')
        const result = await updateContractStatus(update.id, update.status)
        
        if (result.success) {
          results.push({ id: update.id, status: 'success' })
        } else {
          errors.push({ id: update.id, error: result.error })
        }
      } catch (error) {
        errors.push({ id: update.id, error: 'Failed to update contract' })
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
    console.error('PATCH /api/v1/contracts/bulk error:', error)
    
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
      { error: 'Internal server error', message: 'Failed to process bulk update' },
      { status: 500 }
    )
  }
}