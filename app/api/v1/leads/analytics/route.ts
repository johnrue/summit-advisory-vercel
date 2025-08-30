import { NextRequest, NextResponse } from 'next/server'
import { getLeadAnalytics, getConversionFunnel } from '@/lib/services/lead-analytics-service'
import { z } from 'zod'

const analyticsFiltersSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  sources: z.array(z.string()).optional(),
  managers: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const filters = {
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      sources: searchParams.get('sources')?.split(',').filter(Boolean),
      managers: searchParams.get('managers')?.split(',').filter(Boolean),
      statuses: searchParams.get('statuses')?.split(',').filter(Boolean)
    }

    // Validate required parameters
    if (!filters.startDate || !filters.endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Start date and end date are required',
          message: 'Missing required date parameters'
        },
        { status: 400 }
      )
    }

    const validatedFilters = analyticsFiltersSchema.parse(filters)

    const result = await getLeadAnalytics(validatedFilters)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Invalid date format or parameters',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('Analytics API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch analytics data'
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}