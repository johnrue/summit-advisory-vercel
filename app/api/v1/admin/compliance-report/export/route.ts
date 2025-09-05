import { NextRequest, NextResponse } from 'next/server'
import AIAuditService from '@/lib/services/ai-audit-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const format = searchParams.get('format') || 'json'
    const processingType = searchParams.get('processing_type')?.split(',')
    const status = searchParams.get('status')?.split(',')

    // Validate parameters
    if (!dateFrom || !dateTo) {
      return NextResponse.json({
        success: false,
        error: 'date_from and date_to parameters are required'
      }, { status: 400 })
    }

    if (!['json', 'csv', 'xlsx'].includes(format)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid format. Supported formats: json, csv, xlsx'
      }, { status: 400 })
    }

    // Build query for audit logs
    const query = {
      date_from: dateFrom,
      date_to: dateTo,
      processing_type: processingType?.filter(t => t !== 'all')?.[0], // Take first item or undefined
      status: status?.filter(s => s !== 'all')?.[0], // Take first item or undefined
      limit: 10000 // Large limit for export
    }

    // Get audit logs
    const { logs } = await AIAuditService.queryAuditLogs(query)

    // Export data based on format
    if (format === 'json') {
      const exportData = {
        export_info: {
          generated_at: new Date().toISOString(),
          date_range: { from: dateFrom, to: dateTo },
          total_entries: logs.length,
          filters: query
        },
        audit_logs: logs
      }

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="compliance-audit-${dateFrom}-to-${dateTo}.json"`
        }
      })
    }

    if (format === 'csv') {
      const csvData = await AIAuditService.exportAuditLogs(query, 'csv')
      
      if (!csvData) {
        return NextResponse.json({
          success: false,
          error: 'Failed to export CSV data'
        }, { status: 500 })
      }

      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="compliance-audit-${dateFrom}-to-${dateTo}.csv"`
        }
      })
    }

    if (format === 'xlsx') {
      // For Excel export, we'll use a simplified CSV format for now
      // In a production app, you'd want to use a library like 'exceljs'
      const csvData = await AIAuditService.exportAuditLogs(query, 'csv')
      
      if (!csvData) {
        return NextResponse.json({
          success: false,
          error: 'Failed to export Excel data'
        }, { status: 500 })
      }

      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="compliance-audit-${dateFrom}-to-${dateTo}.xlsx"`
        }
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Unsupported export format'
    }, { status: 400 })

  } catch (error) {
    console.error('Error exporting compliance report:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to export compliance report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}