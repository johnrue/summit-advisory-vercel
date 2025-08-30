import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { dataExportService, type ExportConfig } from '@/lib/services/data-export-service'
import { reportAccessControl } from '@/lib/services/report-access-control'

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
      limit: body.limit,
      userId: user.id // Add userId for access control and data masking
    }

    // Validate required fields
    if (!exportConfig.dataType || !exportConfig.format) {
      return NextResponse.json(
        { success: false, error: 'Data type and format are required' },
        { status: 400 }
      )
    }

    // Check user permissions using access control service
    const accessCheck = await reportAccessControl.checkReportAccess(
      user.id, 
      exportConfig.dataType, 
      'export'
    )
    
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { success: false, error: accessCheck.error },
        { status: 403 }
      )
    }

    // Apply field restrictions if specified
    if (accessCheck.allowedFields) {
      exportConfig.fields = exportConfig.fields.filter(field => 
        accessCheck.allowedFields!.includes(field)
      )
    }

    // Apply data filters based on user role
    const dataFilters = await reportAccessControl.getDataFilters(user.id, exportConfig.dataType)
    exportConfig.filters = { ...exportConfig.filters, ...dataFilters }

    // Generate the export
    const exportResult = await dataExportService.generateExport(exportConfig)
    
    if (!exportResult.success) {
      return NextResponse.json(
        { success: false, error: exportResult.error },
        { status: 400 }
      )
    }

    // Apply data masking to the exported data if needed
    // Note: This would be applied within the data export service for actual data
    // Here we just log the masking for audit purposes

    // Log the export activity
    await logExportActivity(user.id, exportConfig, exportResult, supabase)
    
    // Log report access for security audit
    await reportAccessControl.logReportAccess(
      user.id,
      'data_export',
      exportConfig.dataType,
      {
        format: exportConfig.format,
        fieldCount: exportConfig.fields.length,
        recordCount: exportResult.recordCount,
        success: true
      }
    )

    return NextResponse.json({
      success: true,
      fileName: exportResult.fileName,
      downloadUrl: exportResult.downloadUrl,
      recordCount: exportResult.recordCount,
      fileSize: exportResult.fileSize
    })

  } catch (error) {
    console.error('Export generation error:', error)
    
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
    const dataType = searchParams.get('dataType') as any
    
    if (!dataType) {
      return NextResponse.json(
        { success: false, error: 'Data type is required' },
        { status: 400 }
      )
    }

    // Check permissions
    const hasPermission = await checkExportPermissions(user.id, dataType, supabase)
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions for this data type' },
        { status: 403 }
      )
    }

    // Get available fields for the data type
    const availableFields = dataExportService.getAvailableFields(dataType)
    
    return NextResponse.json({
      success: true,
      dataType,
      availableFields,
      supportedFormats: ['csv', 'json', 'pdf']
    })

  } catch (error) {
    console.error('Export info error:', error)
    
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

async function logExportActivity(
  userId: string,
  config: ExportConfig,
  result: any,
  supabase: any
): Promise<void> {
  try {
    const auditEntry = {
      user_id: userId,
      action: 'export_generated',
      resource_type: 'data_export',
      resource_id: `export-${Date.now()}`,
      details: {
        dataType: config.dataType,
        format: config.format,
        fields: config.fields,
        filters: config.filters,
        dateRange: config.dateRange,
        recordCount: result.recordCount,
        fileSize: result.fileSize,
        success: result.success
      },
      timestamp: new Date().toISOString()
    }

    await supabase.from('audit_logs').insert(auditEntry)
  } catch (error) {
    console.error('Failed to log export activity:', error)
    // Don't throw error as this shouldn't fail the export
  }
}