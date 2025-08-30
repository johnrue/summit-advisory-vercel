import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

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

    // Parse request body
    const body = await request.json()
    const { scheduledReportId, action } = body

    // Validate request
    if (!scheduledReportId && action !== 'execute_due_reports') {
      return NextResponse.json(
        { success: false, error: 'Scheduled report ID is required for single report execution' },
        { status: 400 }
      )
    }

    // Check user permissions (admin or manager only)
    const { data: userData } = await supabase
      .from('user_roles')
      .select('role, permissions')
      .eq('user_id', user.id)
      .single()

    if (!userData || !['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Admin or Manager role required.' },
        { status: 403 }
      )
    }

    // If executing a specific report, verify ownership/access
    if (scheduledReportId) {
      const { data: reportData, error: reportError } = await supabase
        .from('scheduled_reports')
        .select('id, created_by, name')
        .eq('id', scheduledReportId)
        .single()

      if (reportError || !reportData) {
        return NextResponse.json(
          { success: false, error: 'Scheduled report not found' },
          { status: 404 }
        )
      }

      // Non-admin users can only execute their own reports
      if (userData.role !== 'admin' && reportData.created_by !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Can only execute your own reports' },
          { status: 403 }
        )
      }
    }

    // Call the Supabase Edge Function
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scheduled-reports`
    const edgeFunctionKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!edgeFunctionKey) {
      return NextResponse.json(
        { success: false, error: 'Edge Function not configured' },
        { status: 500 }
      )
    }

    const executionPayload = scheduledReportId 
      ? { action: 'execute_single_report', scheduledReportId }
      : { action: 'execute_due_reports' }

    const edgeResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${edgeFunctionKey}`
      },
      body: JSON.stringify(executionPayload)
    })

    const edgeResult = await edgeResponse.json()

    if (!edgeResponse.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: edgeResult.error || 'Report execution failed' 
        },
        { status: edgeResponse.status }
      )
    }

    // Log the execution request
    await logReportExecutionRequest(user.id, scheduledReportId, action, edgeResult, supabase)

    return NextResponse.json({
      success: true,
      ...edgeResult
    })

  } catch (error) {
    console.error('Report execution error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

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

    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
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
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get execution history for the report
    const { data: executions, error } = await supabase
      .from('report_executions')
      .select('*')
      .eq('scheduled_report_id', reportId)
      .order('executed_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to get execution history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      executions: executions || []
    })

  } catch (error) {
    console.error('Get execution history error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

async function logReportExecutionRequest(
  userId: string,
  scheduledReportId: string | undefined,
  action: string,
  result: any,
  supabase: any
): Promise<void> {
  try {
    const auditEntry = {
      user_id: userId,
      action: 'report_execution_requested',
      resource_type: 'scheduled_report',
      resource_id: scheduledReportId || 'all-due-reports',
      details: {
        action,
        success: result.success,
        executedReports: result.executedReports,
        errors: result.errors?.slice(0, 5) || [] // Limit error details
      },
      timestamp: new Date().toISOString()
    }

    await supabase.from('audit_logs').insert(auditEntry)
  } catch (error) {
    console.error('Failed to log report execution request:', error)
    // Don't throw error as this shouldn't fail the execution
  }
}