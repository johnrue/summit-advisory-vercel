import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { reportSchedulingService } from '@/lib/services/report-scheduling-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check user permissions
    const { data: userData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userData || !['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Admin or Manager role required.' },
        { status: 403 }
      )
    }

    // Get scheduled reports
    const result = await reportSchedulingService.getScheduledReports()
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      reports: result.data || []
    })

  } catch (error) {
    console.error('Get scheduled reports error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check user permissions
    const { data: userData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userData || !['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Admin or Manager role required.' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['name', 'dataType', 'format', 'schedule']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Prepare scheduled report data
    const scheduledReportData = {
      name: body.name,
      description: body.description || '',
      dataType: body.dataType,
      format: body.format,
      fields: body.fields || [],
      filters: body.filters || {},
      schedule: body.schedule,
      recipients: body.recipients || [],
      isActive: body.isActive !== false, // Default to true
      createdBy: user.id
    }

    // Create scheduled report
    const result = await reportSchedulingService.createScheduledReport(scheduledReportData)
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // Log the creation
    await logScheduledReportActivity(
      user.id, 
      'scheduled_report_created',
      result.data!.id,
      scheduledReportData,
      supabase
    )

    return NextResponse.json({
      success: true,
      report: result.data
    })

  } catch (error) {
    console.error('Create scheduled report error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      )
    }

    // Check user permissions and ownership
    const { data: reportData } = await supabase
      .from('scheduled_reports')
      .select('created_by')
      .eq('id', id)
      .single()

    const { data: userData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userData || !['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Non-admin users can only update their own reports
    if (userData.role !== 'admin' && reportData?.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Can only update your own reports' },
        { status: 403 }
      )
    }

    // Update scheduled report
    const result = await reportSchedulingService.updateScheduledReport(id, updates)
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // Log the update
    await logScheduledReportActivity(
      user.id,
      'scheduled_report_updated',
      id,
      updates,
      supabase
    )

    return NextResponse.json({
      success: true,
      report: result.data
    })

  } catch (error) {
    console.error('Update scheduled report error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      )
    }

    // Check user permissions and ownership
    const { data: reportData } = await supabase
      .from('scheduled_reports')
      .select('created_by, name')
      .eq('id', id)
      .single()

    const { data: userData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userData || !['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Non-admin users can only delete their own reports
    if (userData.role !== 'admin' && reportData?.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Can only delete your own reports' },
        { status: 403 }
      )
    }

    // Delete scheduled report
    const result = await reportSchedulingService.deleteScheduledReport(id)
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // Log the deletion
    await logScheduledReportActivity(
      user.id,
      'scheduled_report_deleted',
      id,
      { name: reportData?.name },
      supabase
    )

    return NextResponse.json({
      success: true,
      message: 'Scheduled report deleted successfully'
    })

  } catch (error) {
    console.error('Delete scheduled report error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

async function logScheduledReportActivity(
  userId: string,
  action: string,
  reportId: string,
  details: any,
  supabase: any
): Promise<void> {
  try {
    const auditEntry = {
      user_id: userId,
      action,
      resource_type: 'scheduled_report',
      resource_id: reportId,
      details,
      timestamp: new Date().toISOString()
    }

    await supabase.from('audit_logs').insert(auditEntry)
  } catch (error) {
    console.error('Failed to log scheduled report activity:', error)
    // Don't throw error as this shouldn't fail the main operation
  }
}