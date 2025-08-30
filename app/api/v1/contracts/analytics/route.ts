import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  getContractAnalytics,
  exportContractAnalytics
} from '@/lib/services/contract-analytics-service'

// Analytics filters schema
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

// Export schema
const exportSchema = z.object({
  filters: filtersSchema,
  format: z.enum(['csv', 'json']).default('csv')
})

/**
 * GET /api/v1/contracts/analytics
 * Get contract analytics data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
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

    if (action === 'export') {
      const format = searchParams.get('format') as 'csv' | 'json' || 'csv'
      
      const result = await exportContractAnalytics(validatedFilters, format)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 400 }
        )
      }

      // Set appropriate headers for file download
      const headers = new Headers()
      headers.set('Content-Type', format === 'json' ? 'application/json' : 'text/csv')
      headers.set('Content-Disposition', `attachment; filename="${result.data!.filename}"`)

      return new NextResponse(result.data!.data, { headers })
    }

    // Default: return analytics data
    const result = await getContractAnalytics(validatedFilters)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, message: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json(result.data)

  } catch (error) {
    console.error('GET /api/v1/contracts/analytics error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          message: 'Invalid filter parameters',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve contract analytics' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/contracts/analytics
 * Generate analytics report with complex filters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action

    if (action === 'generate_report') {
      // Validate request body
      const validatedData = z.object({
        filters: filtersSchema,
        includeDetails: z.boolean().default(false),
        includeForecast: z.boolean().default(false),
        compareWithPrevious: z.boolean().default(false)
      }).parse(body)

      const result = await getContractAnalytics(validatedData.filters)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 400 }
        )
      }

      let response = result.data

      // Add additional data based on options
      if (validatedData.compareWithPrevious) {
        // Get previous period data for comparison
        let previousFilters = validatedData.filters
        if (previousFilters?.dateRange) {
          const startDate = new Date(previousFilters.dateRange.start)
          const endDate = new Date(previousFilters.dateRange.end)
          const periodLength = endDate.getTime() - startDate.getTime()
          
          const previousEndDate = new Date(startDate.getTime() - 1)
          const previousStartDate = new Date(startDate.getTime() - periodLength)
          
          previousFilters = {
            ...previousFilters,
            dateRange: {
              start: previousStartDate.toISOString(),
              end: previousEndDate.toISOString()
            }
          }
        }

        const previousResult = await getContractAnalytics(previousFilters)
        if (previousResult.success) {
          response = {
            ...response,
            comparison: {
              current: result.data,
              previous: previousResult.data,
              growth: {
                totalContracts: ((result.data!.overview.totalContracts - previousResult.data!.overview.totalContracts) / Math.max(previousResult.data!.overview.totalContracts, 1)) * 100,
                totalValue: ((result.data!.overview.totalValue - previousResult.data!.overview.totalValue) / Math.max(previousResult.data!.overview.totalValue, 1)) * 100,
                winRate: result.data!.overview.winRate - previousResult.data!.overview.winRate
              }
            }
          }
        }
      }

      return NextResponse.json(response, { status: 201 })
    }

    if (action === 'export') {
      // Validate export request
      const validatedData = exportSchema.parse(body)

      const result = await exportContractAnalytics(validatedData.filters, validatedData.format)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error, message: result.message },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        filename: result.data!.filename,
        downloadUrl: `/api/v1/contracts/analytics?action=export&format=${validatedData.format}`,
        message: 'Export generated successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action', message: 'Action must be "generate_report" or "export"' },
      { status: 400 }
    )

  } catch (error) {
    console.error('POST /api/v1/contracts/analytics error:', error)
    
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
      { error: 'Internal server error', message: 'Failed to generate analytics report' },
      { status: 500 }
    )
  }
}