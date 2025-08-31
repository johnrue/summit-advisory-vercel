import { NextRequest, NextResponse } from 'next/server'
import { exportUnifiedLeads, generateAnalyticsExport } from '@/lib/services/unified-export-service'
import { FilterCriteria } from '@/lib/types/unified-leads'

/**
 * POST /api/unified-leads/export
 * Export unified leads data with various options
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { filters, options, exportType = 'leads' } = body

    // Validate required fields
    if (!filters || !filters.dateRange || !filters.dateRange.start || !filters.dateRange.end) {
      return NextResponse.json(
        { error: 'filters with dateRange (start, end) is required' },
        { status: 400 }
      )
    }

    // Build filter criteria
    const filterCriteria: FilterCriteria = {
      dateRange: {
        start: filters.dateRange.start,
        end: filters.dateRange.end
      },
      sources: filters.sources,
      statuses: filters.statuses,
      assignedUsers: filters.assignedManagers
    }

    // Default export options
    const exportOptions = {
      format: 'csv',
      includeAnalytics: false,
      includePipeline: 'both',
      columns: undefined,
      groupBy: undefined,
      ...options
    }

    // Validate export options
    if (!['csv', 'xlsx'].includes(exportOptions.format)) {
      return NextResponse.json(
        { error: 'format must be either "csv" or "xlsx"' },
        { status: 400 }
      )
    }

    if (!['both', 'client', 'guard'].includes(exportOptions.includePipeline)) {
      return NextResponse.json(
        { error: 'includePipeline must be "both", "client", or "guard"' },
        { status: 400 }
      )
    }

    let result
    
    switch (exportType) {
      case 'leads':
        result = await exportUnifiedLeads(filterCriteria, exportOptions)
        break
        
      case 'analytics':
        result = await generateAnalyticsExport(filterCriteria)
        break
        
      default:
        return NextResponse.json(
          { error: 'exportType must be "leads" or "analytics"' },
          { status: 400 }
        )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate export' },
        { status: 500 }
      )
    }

    // Return the export data as a downloadable response
    const headers = new Headers()
    headers.set('Content-Type', result.data!.mimeType)
    headers.set('Content-Disposition', `attachment; filename="${result.data!.filename}"`)
    headers.set('Content-Length', result.data!.size.toString())

    return new NextResponse(result.data!.data, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/unified-leads/export
 * Get export metadata or scheduled reports
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'metadata'

    switch (type) {
      case 'metadata':
        // Return export configuration options
        return NextResponse.json({
          success: true,
          data: {
            availableFormats: ['csv', 'xlsx'],
            availablePipelines: ['both', 'client', 'guard'],
            availableColumns: [
              'id',
              'pipeline_type',
              'first_name',
              'last_name',
              'email',
              'phone',
              'service_type',
              'source_type',
              'status',
              'assigned_manager',
              'estimated_value',
              'qualification_score',
              'created_at',
              'assigned_at',
              'last_contact_date',
              'next_follow_up_date',
              'contact_count',
              'qualification_notes'
            ],
            availableGroupBy: ['manager', 'source', 'status', 'date']
          },
          message: 'Export metadata retrieved successfully'
        })

      case 'scheduled-reports':
        const { getScheduledReports } = await import('@/lib/services/unified-export-service')
        const reportsResult = await getScheduledReports()
        
        if (!reportsResult.success) {
          return NextResponse.json(
            { error: reportsResult.error || 'Failed to fetch scheduled reports' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: reportsResult.data,
          message: reportsResult.message
        })

      default:
        return NextResponse.json(
          { error: 'Invalid type. Supported types: metadata, scheduled-reports' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Export GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}