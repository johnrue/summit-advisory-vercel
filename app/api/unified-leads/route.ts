import { NextRequest, NextResponse } from 'next/server'
import { UnifiedLeadDashboardService } from '@/lib/services/unified-lead-dashboard-service'
import { FilterCriteria } from '@/lib/types/unified-leads'

/**
 * GET /api/unified-leads
 * Fetch unified leads with filtering and pagination
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
      statuses: searchParams.get('statuses')?.split(',').filter(Boolean),
      assignedManagers: searchParams.get('managers')?.split(',').filter(Boolean),
      searchTerm: searchParams.get('search') || undefined,
      pagination: {
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '50')
      }
    }

    // Fetch unified leads
    const result = await UnifiedLeadDashboardService.getUnifiedLeads(filters)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch leads' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message
    })

  } catch (error) {
    console.error('Unified leads API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/unified-leads
 * Create a new lead (either client or guard)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { leadType, leadData } = body

    if (!leadType || !leadData) {
      return NextResponse.json(
        { error: 'leadType and leadData are required' },
        { status: 400 }
      )
    }

    if (!['client', 'guard'].includes(leadType)) {
      return NextResponse.json(
        { error: 'leadType must be either "client" or "guard"' },
        { status: 400 }
      )
    }

    // Create lead based on type
    let result
    if (leadType === 'client') {
      // Use existing client lead service
      const { createClientLead } = await import('@/lib/services/lead-management-service')
      result = await createClientLead(leadData)
    } else {
      // Use guard lead service (would need to be implemented)
      return NextResponse.json(
        { error: 'Guard lead creation not yet implemented' },
        { status: 501 }
      )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create lead' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message
    }, { status: 201 })

  } catch (error) {
    console.error('Create lead API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/unified-leads
 * Update unified leads
 */
export async function PUT(request: NextRequest) {
  try {
    // Placeholder implementation for security testing
    return NextResponse.json({ message: 'PUT method not implemented' }, { status: 501 })
  } catch (error) {
    console.error('Error in PUT /api/unified-leads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}