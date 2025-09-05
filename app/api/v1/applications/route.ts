import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const statusFilter = searchParams.get('status_filter')?.split(',')
    const confidenceThreshold = parseFloat(searchParams.get('confidence_threshold') || '0')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const hasAIData = searchParams.get('has_ai_data') === 'true'

    const offset = (page - 1) * limit

    // Base query for applications (guard_leads with application data)
    let query = supabase
      .from('guard_leads')
      .select(`
        *,
        application_data,
        ai_parsed_data,
        documents,
        application_reference,
        confidence_scores
      `)

    // Filter for applications that have been submitted (not just leads)
    query = query.not('application_data', 'is', null)

    // Filter for applications with AI data if requested
    if (hasAIData) {
      query = query.not('ai_parsed_data', 'is', null)
    }

    // Apply status filter
    if (statusFilter && statusFilter.length > 0) {
      query = query.in('status', statusFilter)
    }

    // Apply confidence threshold filter
    if (confidenceThreshold > 0 && hasAIData) {
      query = query.gte('confidence_scores->overall', confidenceThreshold)
    }

    // Apply date range filters
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('guard_leads')
      .select('*', { count: 'exact', head: true })
      .not('application_data', 'is', null)
    
    // Apply same filters to count query
    if (hasAIData) {
      countQuery = countQuery.not('ai_parsed_data', 'is', null)
    }
    if (statusFilter && statusFilter.length > 0) {
      countQuery = countQuery.in('status', statusFilter)
    }
    if (confidenceThreshold > 0 && hasAIData) {
      countQuery = countQuery.gte('confidence_scores->overall', confidenceThreshold)
    }
    if (dateFrom) {
      countQuery = countQuery.gte('created_at', dateFrom)
    }
    if (dateTo) {
      countQuery = countQuery.lte('created_at', dateTo)
    }
    
    const { count } = await countQuery

    // Apply pagination and ordering
    const { data: applications, error } = await query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch applications',
        details: error.message
      }, { status: 500 })
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit)

    // Generate summary statistics
    const summary = {
      total: count || 0,
      by_status: {} as Record<string, number>
    }

    // Get status counts
    if (applications && applications.length > 0) {
      const { data: statusCounts } = await supabase
        .from('guard_leads')
        .select('status')
        .not('application_data', 'is', null)

      if (statusCounts) {
        statusCounts.forEach(item => {
          summary.by_status[item.status] = (summary.by_status[item.status] || 0) + 1
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        applications: applications || [],
        pagination: {
          total: count || 0,
          page,
          pages: totalPages
        },
        summary
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}