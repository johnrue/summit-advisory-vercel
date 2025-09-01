import { NextRequest, NextResponse } from 'next/server'
import { ComplianceReportService } from '@/lib/services/compliance-report-service'
import { PDFGenerator, CSVGenerator } from '@/lib/utils/pdf-generator'
import { EmailService } from '@/lib/utils/email-service'
import { createServerSupabaseClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { validateRequestAuth } from '@/lib/auth'
import type { ReportParameters } from '@/lib/types'

/**
 * API endpoint for TOPS compliance report generation
 * POST /api/compliance-reports
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required parameters
    const { startDate, endDate, format, generatedBy, includeSensitiveData, recipients } = body
    
    if (!startDate || !endDate || !format || !generatedBy) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate, endDate, format, generatedBy' },
        { status: 400 }
      )
    }

    // Validate date format
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    // Validate date range is reasonable (not more than 1 year for performance)
    const oneYear = 365 * 24 * 60 * 60 * 1000 // milliseconds
    if (end.getTime() - start.getTime() > oneYear) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 1 year for performance reasons' },
        { status: 400 }
      )
    }

    // Create report parameters
    const parameters: ReportParameters = {
      startDate: start,
      endDate: end,
      format: format as 'pdf' | 'csv',
      includeSensitiveData: includeSensitiveData || false,
      generatedBy,
      recipients: recipients || []
    }

    // Generate the compliance report
    const report = await ComplianceReportService.generateTOPSReport(parameters)

    let fileUrl: string
    let fileSize: number

    // Generate file based on format
    if (format === 'pdf') {
      const pdfResult = await PDFGenerator.generateTOPSReport(
        report.data,
        PDFGenerator.generateFileName(report.data)
      )
      fileUrl = pdfResult.url
      fileSize = pdfResult.size
    } else {
      const csvResult = await CSVGenerator.generateAndStoreCSV(
        report.data,
        CSVGenerator.generateFileName(report.data)
      )
      fileUrl = csvResult.url
      fileSize = csvResult.size
    }

    // Update report metadata with file information
    // This would typically update the database record
    // For now, we'll include it in the response

    // Send email if recipients are provided
    if (recipients && recipients.length > 0) {
      const pdfBuffer = await PDFGenerator.generateTOPSReportBuffer(report.data)
      
      const emailResult = await EmailService.sendComplianceReport({
        reportData: report.data,
        reportUrl: fileUrl,
        recipients,
        attachments: [{
          filename: PDFGenerator.generateFileName(report.data),
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      })

      if (!emailResult.success) {
        console.error('Email delivery failed:', emailResult.error)
        // Continue with response but note email failure
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        reportId: report.id,
        fileUrl,
        fileSize,
        format,
        reportPeriod: {
          startDate: report.data.reportPeriod.startDate,
          endDate: report.data.reportPeriod.endDate
        },
        guardsCount: report.data.guards.length,
        generatedAt: report.data.generatedAt,
        emailSent: recipients && recipients.length > 0
      }
    })

  } catch (error) {
    console.error('Error generating compliance report:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate compliance report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/compliance-reports
 * Retrieve list of generated reports
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication - only admins and managers can access reports
    const authResult = await validateRequestAuth(request, ['admin', 'manager'])
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error || 'Unauthorized',
          message: 'Access denied. Admin or manager role required.'
        },
        { status: authResult.status || 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const reportType = searchParams.get('type') || 'all'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    
    // Create Supabase client
    const cookieStore = cookies()
    const supabase = createServerSupabaseClient(cookieStore)

    // Build query for compliance reports
    let query = supabase
      .from('compliance_reports')
      .select(`
        id,
        report_type,
        start_date,
        end_date,
        generated_at,
        generated_by,
        format,
        file_url,
        file_size,
        metadata,
        users!generated_by(first_name, last_name, email)
      `)
      .order('generated_at', { ascending: false })

    // Apply filters
    if (reportType !== 'all') {
      query = query.eq('report_type', reportType)
    }

    if (startDate) {
      query = query.gte('generated_at', startDate)
    }

    if (endDate) {
      query = query.lte('generated_at', endDate)
    }

    // Get total count
    const { count } = await query.select('*', { count: 'exact', head: true })

    // Apply pagination
    const { data: reports, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Transform the data to match expected format
    const formattedReports = (reports || []).map(report => ({
      id: report.id,
      type: report.report_type,
      reportPeriod: {
        startDate: report.start_date,
        endDate: report.end_date
      },
      generatedAt: report.generated_at,
      generatedBy: report.generated_by,
      generatedByName: report.users 
        ? `${report.users.first_name} ${report.users.last_name}` 
        : 'Unknown',
      format: report.format,
      fileUrl: report.file_url,
      fileSize: report.file_size,
      guardsCount: report.metadata?.guards_count || 0,
      metadata: report.metadata
    }))

    return NextResponse.json({
      success: true,
      data: {
        reports: formattedReports,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
        pagination: {
          limit,
          offset,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      }
    })

  } catch (error) {
    console.error('Error fetching reports:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch reports',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}