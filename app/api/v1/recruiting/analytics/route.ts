// Recruiting Analytics API - Comprehensive funnel tracking and optimization
// Provides detailed analytics for recruiting pipeline performance and recommendations

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getRecruitingFunnelAnalytics,
  getOptimizationRecommendations,
  exportRecruitingAnalytics
} from '@/lib/services/recruiting-analytics-service'

// Validation schemas
const analyticsFiltersSchema = z.object({
  dateRange: z.object({
    start: z.string().datetime({ message: 'Invalid start date format' }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    end: z.string().datetime({ message: 'Invalid end date format' }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  }).optional(),
  campaignIds: z.array(z.string()).optional(),
  sources: z.array(z.enum([
    'direct_website',
    'job_board',
    'social_media',
    'referral',
    'recruiting_agency',
    'career_fair',
    'print_advertisement',
    'radio_advertisement',
    'cold_outreach',
    'partner_referral',
    'other'
  ])).optional(),
  locations: z.array(z.string()).optional(),
  recruiterIds: z.array(z.string()).optional()
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

const exportSchema = z.object({
  filters: analyticsFiltersSchema.optional(),
  format: z.enum(['csv', 'json']).default('csv')
})

/**
 * GET /api/v1/recruiting/analytics - Get recruiting analytics data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'funnel'

    // Parse common filters
    const rawFilters: any = {}

    // Date range
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    if (startDate && endDate) {
      rawFilters.dateRange = { start: startDate, end: endDate }
    }

    // Campaign IDs
    const campaignIds = searchParams.get('campaignIds')
    if (campaignIds) {
      rawFilters.campaignIds = campaignIds.split(',')
    }

    // Sources
    const sources = searchParams.get('sources')
    if (sources) {
      rawFilters.sources = sources.split(',')
    }

    // Locations
    const locations = searchParams.get('locations')
    if (locations) {
      rawFilters.locations = locations.split(',')
    }

    // Recruiter IDs
    const recruiterIds = searchParams.get('recruiterIds')
    if (recruiterIds) {
      rawFilters.recruiterIds = recruiterIds.split(',')
    }

    // Remove undefined values
    const filters = Object.fromEntries(
      Object.entries(rawFilters).filter(([_, value]) => value !== undefined && value !== null)
    )

    // Validate filters
    let validatedFilters = undefined
    if (Object.keys(filters).length > 0) {
      const validationResult = analyticsFiltersSchema.safeParse(filters)
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Invalid filter parameters',
          details: validationResult.error.errors
        }, { status: 400 })
      }
      validatedFilters = validationResult.data
    }

    if (action === 'funnel') {
      // Get funnel analytics
      const result = await getRecruitingFunnelAnalytics(validatedFilters)
      
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
    
    else if (action === 'recommendations') {
      // Get optimization recommendations
      const result = await getOptimizationRecommendations(validatedFilters)
      
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
        error: 'Invalid action parameter. Use: funnel or recommendations'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in GET /api/v1/recruiting/analytics:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * POST /api/v1/recruiting/analytics - Export analytics data
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action !== 'export') {
      return NextResponse.json({
        success: false,
        error: 'Invalid action parameter. Use: export'
      }, { status: 400 })
    }

    const body = await request.json()
    
    // Validate export request
    const validationResult = exportSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid export parameters',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { filters, format } = validationResult.data

    // Export analytics data
    const result = await exportRecruitingAnalytics(filters, format)
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    // Set appropriate headers for file download
    const headers = new Headers({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
      'Content-Disposition': `attachment; filename="${result.data?.filename}"`,
      'Cache-Control': 'no-cache'
    })

    return new NextResponse(result.data?.data, {
      status: 200,
      headers: headers
    })
  } catch (error) {
    console.error('Error in POST /api/v1/recruiting/analytics:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}