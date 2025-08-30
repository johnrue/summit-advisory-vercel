import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { dataExportService, type ExportConfig } from '@/lib/services/data-export-service'

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
    
    const exportConfig: ExportConfig = {
      dataType: body.dataType,
      format: body.format,
      fields: body.fields || [],
      filters: body.filters || {},
      dateRange: body.dateRange ? {
        from: body.dateRange.from ? new Date(body.dateRange.from) : undefined,
        to: body.dateRange.to ? new Date(body.dateRange.to) : undefined
      } : undefined,
      sortBy: body.sortBy,
      sortOrder: body.sortOrder || 'asc',
      limit: body.limit
    }

    // Validate required fields
    if (!exportConfig.dataType || !exportConfig.format) {
      return NextResponse.json(
        { success: false, error: 'Data type and format are required' },
        { status: 400 }
      )
    }

    // Check user permissions for the requested data type
    const hasPermission = await checkExportPermissions(user.id, exportConfig.dataType, supabase)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions for this data type' },
        { status: 403 }
      )
    }

    // Get size estimate
    const estimate = await dataExportService.estimateExportSize(exportConfig)

    return NextResponse.json({
      success: true,
      ...estimate
    })

  } catch (error) {
    console.error('Export estimation error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

async function checkExportPermissions(
  userId: string, 
  dataType: string, 
  supabase: any
): Promise<boolean> {
  try {
    // Get user role and permissions
    const { data: userData, error } = await supabase
      .from('user_roles')
      .select('role, permissions')
      .eq('user_id', userId)
      .single()

    if (error || !userData) {
      return false
    }

    const { role, permissions } = userData

    // Admin can export everything
    if (role === 'admin') {
      return true
    }

    // Check specific permissions for data types
    const dataTypePermissions: Record<string, string[]> = {
      'guards': ['guards.view_all', 'guards.export'],
      'applications': ['applications.view_all', 'applications.export'],
      'shifts': ['shifts.view_all', 'shifts.export'],
      'compliance': ['compliance.view_all', 'compliance.export'],
      'audit-logs': ['system.view_audit_logs', 'audit.export']
    }

    const requiredPermissions = dataTypePermissions[dataType] || []
    
    // Check if user has any of the required permissions
    return requiredPermissions.some(permission => 
      permissions && permissions.includes(permission)
    )

  } catch (error) {
    console.error('Permission check error:', error)
    return false
  }
}