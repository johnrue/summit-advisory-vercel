import { pdf } from '@react-pdf/renderer'
import { put } from '@vercel/blob'
import { TOPSReportPDF } from '@/lib/templates/tops-report-template'
import type { TOPSReportData } from '@/lib/types'

/**
 * PDF Generator utility for TOPS compliance reports
 * Uses @react-pdf/renderer and Vercel Blob storage
 */
export class PDFGenerator {
  
  /**
   * Generate PDF report and store in Vercel Blob
   */
  static async generateTOPSReport(
    reportData: TOPSReportData,
    fileName: string = `tops-report-${Date.now()}.pdf`
  ): Promise<{ url: string; size: number }> {
    try {
      // Generate PDF using React PDF renderer
      const pdfDocument = pdf(TOPSReportPDF({ data: reportData }))
      const pdfBuffer = await pdfDocument.toBuffer()

      // Upload to Vercel Blob storage
      const blob = await put(fileName, pdfBuffer, {
        access: 'public',
        contentType: 'application/pdf',
      })

      return {
        url: blob.url,
        size: pdfBuffer.length
      }

    } catch (error) {
      console.error('Error generating PDF report:', error)
      throw new Error('Failed to generate PDF report')
    }
  }

  /**
   * Generate PDF buffer without storing (for email attachments)
   */
  static async generateTOPSReportBuffer(reportData: TOPSReportData): Promise<Buffer> {
    try {
      const pdfDocument = pdf(TOPSReportPDF({ data: reportData }))
      return await pdfDocument.toBuffer()
    } catch (error) {
      console.error('Error generating PDF buffer:', error)
      throw new Error('Failed to generate PDF buffer')
    }
  }

  /**
   * Generate filename based on report parameters
   */
  static generateFileName(reportData: TOPSReportData): string {
    const startDate = reportData.reportPeriod.startDate.toISOString().split('T')[0]
    const endDate = reportData.reportPeriod.endDate.toISOString().split('T')[0]
    const timestamp = Date.now()
    
    return `tops-compliance-report_${startDate}_to_${endDate}_${timestamp}.pdf`
  }
}

/**
 * CSV Generator utility for data analysis exports
 */
export class CSVGenerator {
  
  /**
   * Generate CSV export of guard roster data
   */
  static generateGuardRosterCSV(reportData: TOPSReportData): string {
    const headers = [
      'First Name',
      'Last Name',
      'License Number',
      'License Expiry',
      'Certification Status',
      'Certification Expiry',
      'Background Check Status',
      'Background Check Date',
      'Employment Status',
      'Employment Start Date',
      'Training Completion',
      'Phone',
      'Email'
    ]

    const rows = reportData.guards.map(guard => [
      guard.firstName,
      guard.lastName,
      guard.licenseNumber,
      guard.licenseExpiry ? new Date(guard.licenseExpiry).toLocaleDateString() : '',
      guard.certifications?.status || '',
      guard.certifications?.expiryDate ? new Date(guard.certifications.expiryDate).toLocaleDateString() : '',
      guard.backgroundChecks?.status || '',
      guard.backgroundChecks?.completedAt ? new Date(guard.backgroundChecks.completedAt).toLocaleDateString() : '',
      guard.employmentStatus,
      guard.employmentStartDate ? new Date(guard.employmentStartDate).toLocaleDateString() : '',
      guard.trainingRecords?.completedAt ? new Date(guard.trainingRecords.completedAt).toLocaleDateString() : '',
      guard.phone,
      guard.email
    ])

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n')

    return csvContent
  }

  /**
   * Generate CSV buffer and upload to Vercel Blob
   */
  static async generateAndStoreCSV(
    reportData: TOPSReportData,
    fileName: string = `tops-report-${Date.now()}.csv`
  ): Promise<{ url: string; size: number }> {
    try {
      const csvContent = this.generateGuardRosterCSV(reportData)
      const csvBuffer = Buffer.from(csvContent, 'utf-8')

      // Upload to Vercel Blob storage
      const blob = await put(fileName, csvBuffer, {
        access: 'public',
        contentType: 'text/csv',
      })

      return {
        url: blob.url,
        size: csvBuffer.length
      }

    } catch (error) {
      console.error('Error generating CSV report:', error)
      throw new Error('Failed to generate CSV report')
    }
  }

  /**
   * Generate CSV filename based on report parameters
   */
  static generateFileName(reportData: TOPSReportData): string {
    const startDate = reportData.reportPeriod.startDate.toISOString().split('T')[0]
    const endDate = reportData.reportPeriod.endDate.toISOString().split('T')[0]
    const timestamp = Date.now()
    
    return `tops-compliance-data_${startDate}_to_${endDate}_${timestamp}.csv`
  }
}