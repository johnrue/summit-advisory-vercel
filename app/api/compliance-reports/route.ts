import { NextRequest, NextResponse } from 'next/server'
import { ComplianceReportService } from '@/lib/services/compliance-report-service'
import { PDFGenerator, CSVGenerator } from '@/lib/utils/pdf-generator'
import { EmailService } from '@/lib/utils/email-service'
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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // This would typically fetch from database
    // For now, return mock data
    const mockReports = [
      {
        id: 'report-1',
        type: 'tops_compliance',
        reportPeriod: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        generatedAt: '2024-02-01T10:00:00Z',
        generatedBy: 'admin-user-1',
        format: 'pdf',
        fileUrl: '#',
        fileSize: 125440,
        guardsCount: 15
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        reports: mockReports.slice(offset, offset + limit),
        total: mockReports.length,
        hasMore: offset + limit < mockReports.length
      }
    })

  } catch (error) {
    console.error('Error fetching reports:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch reports',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}