'use client'

import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { reportAccessControl } from './report-access-control'

export type ExportFormat = 'csv' | 'json' | 'pdf'
export type ExportDataType = 'guards' | 'applications' | 'shifts' | 'compliance' | 'audit-logs'

export interface ExportConfig {
  dataType: ExportDataType
  format: ExportFormat
  fields: string[]
  filters?: Record<string, any>
  dateRange?: {
    from?: Date
    to?: Date
  }
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  limit?: number
  userId?: string // Add userId for access control
}

export interface ExportResult {
  success: boolean
  data?: any
  fileName?: string
  downloadUrl?: string
  recordCount?: number
  error?: string
  fileSize?: string
}

export interface ExportProgress {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  fileName?: string
  downloadUrl?: string
  error?: string
  createdAt: Date
  completedAt?: Date
}

class DataExportService {
  private supabase = createClient()

  /**
   * Generate data export based on configuration
   */
  async generateExport(config: ExportConfig): Promise<ExportResult> {
    try {
      // Validate configuration
      const validation = this.validateConfig(config)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Fetch data based on configuration
      const data = await this.fetchData(config)
      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'No data found for the specified criteria'
        }
      }

      // Apply data masking if userId is provided
      let maskedData = data
      if (config.userId) {
        maskedData = await reportAccessControl.applyDataMasking(
          config.userId, 
          data, 
          config.dataType
        )
      }

      // Generate export file based on format
      const exportResult = await this.createExportFile(maskedData, config)
      
      return {
        success: true,
        ...exportResult
      }
    } catch (error) {
      console.error('Export generation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export generation failed'
      }
    }
  }

  /**
   * Fetch data from database based on export configuration
   */
  private async fetchData(config: ExportConfig): Promise<any[]> {
    let query = this.supabase.from(this.getTableName(config.dataType))

    // Apply field selection
    if (config.fields.length > 0) {
      query = query.select(config.fields.join(', '))
    } else {
      query = query.select('*')
    }

    // Apply date range filters
    if (config.dateRange) {
      const dateColumn = this.getDateColumn(config.dataType)
      
      if (config.dateRange.from) {
        query = query.gte(dateColumn, config.dateRange.from.toISOString())
      }
      
      if (config.dateRange.to) {
        query = query.lte(dateColumn, config.dateRange.to.toISOString())
      }
    }

    // Apply custom filters
    if (config.filters) {
      Object.entries(config.filters).forEach(([field, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            query = query.in(field, value)
          } else {
            query = query.eq(field, value)
          }
        }
      })
    }

    // Apply sorting
    if (config.sortBy) {
      query = query.order(config.sortBy, { ascending: config.sortOrder === 'asc' })
    }

    // Apply limit
    if (config.limit) {
      query = query.limit(config.limit)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Data fetch failed: ${error.message}`)
    }

    return data || []
  }

  /**
   * Create export file in the specified format
   */
  private async createExportFile(data: any[], config: ExportConfig): Promise<Partial<ExportResult>> {
    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss')
    const fileName = `${config.dataType}-export-${timestamp}.${config.format}`

    switch (config.format) {
      case 'csv':
        return this.createCSVExport(data, fileName, config)
      case 'json':
        return this.createJSONExport(data, fileName, config)
      case 'pdf':
        return this.createPDFExport(data, fileName, config)
      default:
        throw new Error(`Unsupported export format: ${config.format}`)
    }
  }

  /**
   * Create CSV export
   */
  private async createCSVExport(data: any[], fileName: string, config: ExportConfig): Promise<Partial<ExportResult>> {
    if (!data.length) {
      throw new Error('No data to export')
    }

    // Get headers from first record or specified fields
    const headers = config.fields.length > 0 ? config.fields : Object.keys(data[0])
    
    // Create CSV content
    const csvRows: string[] = []
    
    // Add header row
    csvRows.push(headers.map(header => this.escapeCSVField(this.formatFieldName(header))).join(','))
    
    // Add data rows
    data.forEach(record => {
      const row = headers.map(field => {
        const value = record[field]
        return this.escapeCSVField(this.formatFieldValue(value))
      })
      csvRows.push(row.join(','))
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const downloadUrl = URL.createObjectURL(blob)

    return {
      fileName,
      downloadUrl,
      recordCount: data.length,
      fileSize: this.formatFileSize(blob.size)
    }
  }

  /**
   * Create JSON export
   */
  private async createJSONExport(data: any[], fileName: string, config: ExportConfig): Promise<Partial<ExportResult>> {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        dataType: config.dataType,
        recordCount: data.length,
        fields: config.fields.length > 0 ? config.fields : Object.keys(data[0] || {}),
        filters: config.filters || {},
        dateRange: config.dateRange
      },
      data: data.map(record => {
        if (config.fields.length > 0) {
          // Only include specified fields
          const filteredRecord: any = {}
          config.fields.forEach(field => {
            filteredRecord[field] = record[field]
          })
          return filteredRecord
        }
        return record
      })
    }

    const jsonContent = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const downloadUrl = URL.createObjectURL(blob)

    return {
      fileName,
      downloadUrl,
      recordCount: data.length,
      fileSize: this.formatFileSize(blob.size)
    }
  }

  /**
   * Create PDF export (placeholder - would need full PDF generation library)
   */
  private async createPDFExport(data: any[], fileName: string, config: ExportConfig): Promise<Partial<ExportResult>> {
    // This is a simplified PDF export
    // In a real implementation, you would use @react-pdf/renderer or similar
    
    const pdfContent = this.generateSimplePDFContent(data, config)
    const blob = new Blob([pdfContent], { type: 'application/pdf' })
    const downloadUrl = URL.createObjectURL(blob)

    return {
      fileName,
      downloadUrl,
      recordCount: data.length,
      fileSize: this.formatFileSize(blob.size)
    }
  }

  /**
   * Generate simple PDF content (placeholder)
   */
  private generateSimplePDFContent(data: any[], config: ExportConfig): string {
    // This would be replaced with actual PDF generation using @react-pdf/renderer
    const content = [
      `Data Export Report - ${config.dataType}`,
      `Generated: ${new Date().toLocaleString()}`,
      `Records: ${data.length}`,
      '',
      'Data:',
      ...data.map(record => JSON.stringify(record, null, 2))
    ].join('\n')

    return content
  }

  /**
   * Validate export configuration
   */
  private validateConfig(config: ExportConfig): { isValid: boolean; error?: string } {
    if (!config.dataType) {
      return { isValid: false, error: 'Data type is required' }
    }

    if (!config.format) {
      return { isValid: false, error: 'Export format is required' }
    }

    if (!['csv', 'json', 'pdf'].includes(config.format)) {
      return { isValid: false, error: 'Invalid export format' }
    }

    if (!['guards', 'applications', 'shifts', 'compliance', 'audit-logs'].includes(config.dataType)) {
      return { isValid: false, error: 'Invalid data type' }
    }

    return { isValid: true }
  }

  /**
   * Get table name for data type
   */
  private getTableName(dataType: ExportDataType): string {
    const tableMap: Record<ExportDataType, string> = {
      'guards': 'guards',
      'applications': 'applications',
      'shifts': 'shifts',
      'compliance': 'compliance_records',
      'audit-logs': 'audit_logs'
    }

    return tableMap[dataType]
  }

  /**
   * Get date column for filtering
   */
  private getDateColumn(dataType: ExportDataType): string {
    const dateColumnMap: Record<ExportDataType, string> = {
      'guards': 'created_at',
      'applications': 'applied_date',
      'shifts': 'created_at',
      'compliance': 'created_at',
      'audit-logs': 'timestamp'
    }

    return dateColumnMap[dataType]
  }

  /**
   * Escape CSV field to handle commas, quotes, and newlines
   */
  private escapeCSVField(field: string): string {
    if (field === null || field === undefined) {
      return ''
    }

    const stringField = String(field)
    
    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`
    }

    return stringField
  }

  /**
   * Format field name for display
   */
  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase())
  }

  /**
   * Format field value for export
   */
  private formatFieldValue(value: any): string {
    if (value === null || value === undefined) {
      return ''
    }

    if (value instanceof Date) {
      return value.toISOString()
    }

    if (typeof value === 'object') {
      return JSON.stringify(value)
    }

    return String(value)
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Get available fields for a data type
   */
  getAvailableFields(dataType: ExportDataType): string[] {
    const fieldMap: Record<ExportDataType, string[]> = {
      'guards': ['id', 'full_name', 'email', 'phone', 'status', 'license_number', 'hire_date', 'created_at'],
      'applications': ['id', 'applicant_name', 'email', 'status', 'pipeline_stage', 'applied_date', 'ai_score', 'created_at'],
      'shifts': ['id', 'title', 'location', 'start_time', 'end_time', 'status', 'assigned_guard', 'hourly_rate', 'created_at'],
      'compliance': ['id', 'guard_id', 'certification_type', 'issue_date', 'expiry_date', 'status', 'created_at'],
      'audit-logs': ['id', 'timestamp', 'user_id', 'action', 'resource_type', 'resource_id', 'ip_address', 'details']
    }

    return fieldMap[dataType] || []
  }

  /**
   * Estimate export size
   */
  async estimateExportSize(config: ExportConfig): Promise<{ recordCount: number; estimatedSize: string }> {
    try {
      // Get count without fetching all data
      let query = this.supabase.from(this.getTableName(config.dataType))

      // Apply same filters as export but only count
      if (config.dateRange) {
        const dateColumn = this.getDateColumn(config.dataType)
        
        if (config.dateRange.from) {
          query = query.gte(dateColumn, config.dateRange.from.toISOString())
        }
        
        if (config.dateRange.to) {
          query = query.lte(dateColumn, config.dateRange.to.toISOString())
        }
      }

      if (config.filters) {
        Object.entries(config.filters).forEach(([field, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            if (Array.isArray(value)) {
              query = query.in(field, value)
            } else {
              query = query.eq(field, value)
            }
          }
        })
      }

      const { count, error } = await query.select('*', { count: 'exact', head: true })

      if (error) {
        throw new Error(`Count query failed: ${error.message}`)
      }

      const recordCount = count || 0
      
      // Rough estimate: avg 200 bytes per record
      const estimatedBytes = recordCount * 200
      const estimatedSize = this.formatFileSize(estimatedBytes)

      return {
        recordCount,
        estimatedSize
      }
    } catch (error) {
      console.error('Size estimation failed:', error)
      return {
        recordCount: 0,
        estimatedSize: '0 Bytes'
      }
    }
  }
}

// Export singleton instance
export const dataExportService = new DataExportService()
export default dataExportService