import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/unified-leads/[leadId]
 * Get a specific lead by ID (searches both client and guard tables)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      )
    }

    // Search in both client and guard leads tables
    const [clientResult, guardResult] = await Promise.all([
      supabase
        .from('client_leads')
        .select(`
          *,
          assigned_manager:users!assigned_to(first_name, last_name, email),
          created_by_user:users!created_by(first_name, last_name)
        `)
        .eq('id', leadId)
        .single(),
      
      supabase
        .from('guard_leads')
        .select(`
          *,
          assigned_manager:users!assigned_to(first_name, last_name, email),
          created_by_user:users!created_by(first_name, last_name)
        `)
        .eq('id', leadId)
        .single()
    ])

    let leadData = null
    let leadType = null

    if (clientResult.data && !clientResult.error) {
      leadData = { ...clientResult.data, pipeline_type: 'client' }
      leadType = 'client'
    } else if (guardResult.data && !guardResult.error) {
      leadData = { ...guardResult.data, pipeline_type: 'guard' }
      leadType = 'guard'
    }

    if (!leadData) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        lead: leadData,
        type: leadType
      },
      message: 'Lead retrieved successfully'
    })

  } catch (error) {
    console.error('Get lead API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/unified-leads/[leadId]
 * Update a specific lead
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params
    const body = await request.json()

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      )
    }

    const { leadType, updates } = body

    if (!leadType || !updates) {
      return NextResponse.json(
        { error: 'leadType and updates are required' },
        { status: 400 }
      )
    }

    if (!['client', 'guard'].includes(leadType)) {
      return NextResponse.json(
        { error: 'leadType must be either "client" or "guard"' },
        { status: 400 }
      )
    }

    // Update the appropriate table
    const tableName = leadType === 'client' ? 'client_leads' : 'guard_leads'
    
    const { data, error } = await supabase
      .from(tableName)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        )
      }
      
      throw new Error(`Failed to update lead: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      data: { ...data, pipeline_type: leadType },
      message: 'Lead updated successfully'
    })

  } catch (error) {
    console.error('Update lead API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/unified-leads/[leadId]
 * Delete a specific lead
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params
    const searchParams = request.nextUrl.searchParams
    const leadType = searchParams.get('type')

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      )
    }

    if (!leadType) {
      return NextResponse.json(
        { error: 'leadType query parameter is required' },
        { status: 400 }
      )
    }

    if (!['client', 'guard'].includes(leadType)) {
      return NextResponse.json(
        { error: 'leadType must be either "client" or "guard"' },
        { status: 400 }
      )
    }

    // Delete from the appropriate table
    const tableName = leadType === 'client' ? 'client_leads' : 'guard_leads'
    
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', leadId)

    if (error) {
      throw new Error(`Failed to delete lead: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully'
    })

  } catch (error) {
    console.error('Delete lead API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}