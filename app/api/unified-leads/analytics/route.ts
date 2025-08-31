import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAnalytics } from '@/lib/services/unified-lead-analytics-service'
import { FilterCriteria } from '@/lib/types/unified-leads'
import { LeadStatus } from '@/lib/types'

/**
 * GET /api/unified-leads/analytics
 * Get unified analytics across both client and guard pipelines
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Parse date range
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    // Build filter criteria
    const filters: FilterCriteria = {
      dateRange: {
        start: new Date(startDate),
        end: new Date(endDate)
      },
      sources: searchParams.get('sources')?.split(',').filter(Boolean),
      statuses: searchParams.get('statuses')?.split(',').filter(Boolean) as LeadStatus[] | undefined,
      assignedManagers: searchParams.get('managers')?.split(',').filter(Boolean),
      searchTerm: searchParams.get('search') || undefined
    }

    // Get analytics type
    const analyticsType = searchParams.get('type') || 'overview'

    switch (analyticsType) {
      case 'overview':
        const result = await getUnifiedAnalytics(filters)
        
        if (!result.success) {
          return NextResponse.json(
            { error: result.error || 'Failed to fetch analytics' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: result.data,
          message: result.message
        })

      case 'trends':
        const { getConversionTrends } = await import('@/lib/services/unified-lead-analytics-service')
        const trendsResult = await getConversionTrends(filters, 'weekly')
        
        if (!trendsResult.success) {
          return NextResponse.json(
            { error: trendsResult.error || 'Failed to fetch trends' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: trendsResult.data,
          message: trendsResult.message
        })

      case 'roi':
        const { getSourceROIAnalysis } = await import('@/lib/services/unified-lead-analytics-service')
        const roiResult = await getSourceROIAnalysis(filters)
        
        if (!roiResult.success) {
          return NextResponse.json(
            { error: roiResult.error || 'Failed to fetch ROI analysis' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: roiResult.data,
          message: roiResult.message
        })

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type. Supported types: overview, trends, roi' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}