import { supabase } from '@/lib/supabase'
import type { ApiResponse } from '@/lib/types'
import type { LeadFormData } from './lead-management-service'
import { checkForDuplicates, mergeDuplicateLead } from './lead-deduplication-service'
import { createLead } from './lead-management-service'

export interface BulkImportProgress {
  id: string
  fileName: string
  totalRows: number
  processedRows: number
  successRows: number
  errorRows: number
  duplicateRows: number
  status: 'processing' | 'completed' | 'failed'
  errors: Array<{
    row: number
    field: string
    message: string
    data?: Record<string, any>
  }>
  createdAt: string
  completedAt?: string
}

export interface ImportValidationResult {
  isValid: boolean
  errors: Array<{
    row: number
    field: string
    message: string
  }>
  warnings: Array<{
    row: number
    field: string
    message: string
  }>
  validRows: number
  totalRows: number
}

const REQUIRED_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'serviceType', 'sourceType']
const OPTIONAL_FIELDS = ['message', 'estimatedValue', 'referrerName', 'eventName', 'campaignName', 'socialPlatform']

/**
 * Parse CSV content into lead data array
 * @param csvContent - Raw CSV content as string
 * @returns Array of parsed lead data objects
 */
export function parseCSVContent(csvContent: string): Array<Record<string, string>> {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must contain at least a header row and one data row')
  }

  // Parse header row
  const headers = lines[0].split(',').map(header => 
    header.trim().replace(/['"]/g, '')
  )

  // Parse data rows
  const data: Array<Record<string, string>> = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines

    const values = parseCSVLine(line)
    const rowData: Record<string, string> = {}

    headers.forEach((header, index) => {
      rowData[header] = values[index] || ''
    })

    data.push(rowData)
  }

  return data
}

/**
 * Parse a single CSV line handling quoted values
 * @param line - CSV line to parse
 * @returns Array of values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let currentValue = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(currentValue.trim())
      currentValue = ''
    } else {
      currentValue += char
    }
  }
  
  values.push(currentValue.trim())
  return values
}

/**
 * Validate imported lead data
 * @param data - Array of imported data records
 * @returns Validation result with errors and warnings
 */
export function validateImportData(
  data: Array<Record<string, string>>
): ImportValidationResult {
  const errors: Array<{ row: number, field: string, message: string }> = []
  const warnings: Array<{ row: number, field: string, message: string }> = []
  let validRows = 0

  data.forEach((record, index) => {
    const rowNumber = index + 2 // Add 2 for header row and 0-based index
    let rowIsValid = true

    // Check required fields
    REQUIRED_FIELDS.forEach(field => {
      if (!record[field] || record[field].trim() === '') {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} is required`
        })
        rowIsValid = false
      }
    })

    // Validate email format
    if (record.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(record.email.trim())) {
        errors.push({
          row: rowNumber,
          field: 'email',
          message: 'Invalid email format'
        })
        rowIsValid = false
      }
    }

    // Validate phone number
    if (record.phone) {
      const cleanPhone = record.phone.replace(/\D/g, '')
      if (cleanPhone.length < 10) {
        errors.push({
          row: rowNumber,
          field: 'phone',
          message: 'Phone number must be at least 10 digits'
        })
        rowIsValid = false
      }
    }

    // Validate estimated value if provided
    if (record.estimatedValue && record.estimatedValue.trim()) {
      const value = parseFloat(record.estimatedValue)
      if (isNaN(value) || value < 0) {
        warnings.push({
          row: rowNumber,
          field: 'estimatedValue',
          message: 'Invalid estimated value, will be ignored'
        })
      }
    }

    // Validate source type
    const validSources = ['website', 'social_media', 'referral', 'networking_event', 
                         'digital_marketing', 'cold_outreach', 'phone_inquiry', 'walk_in', 'other']
    if (record.sourceType && !validSources.includes(record.sourceType)) {
      warnings.push({
        row: rowNumber,
        field: 'sourceType',
        message: 'Invalid source type, will default to "other"'
      })
    }

    // Validate service type
    const validServices = ['armed', 'unarmed', 'event', 'executive', 'commercial', 'consulting', 'other']
    if (record.serviceType && !validServices.includes(record.serviceType)) {
      warnings.push({
        row: rowNumber,
        field: 'serviceType',
        message: 'Invalid service type, will default to "other"'
      })
    }

    if (rowIsValid) {
      validRows++
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validRows,
    totalRows: data.length
  }
}

/**
 * Transform raw import data to LeadFormData format
 * @param record - Raw import record
 * @returns Formatted lead data
 */
function transformImportRecord(record: Record<string, string>): LeadFormData {
  // Build source details based on available fields
  const sourceDetails: Record<string, any> = {}
  
  if (record.referrerName) sourceDetails.referrerName = record.referrerName.trim()
  if (record.eventName) sourceDetails.eventName = record.eventName.trim()
  if (record.campaignName) sourceDetails.campaignName = record.campaignName.trim()
  if (record.socialPlatform) sourceDetails.platform = record.socialPlatform.trim()

  // Add import metadata
  sourceDetails.importedAt = new Date().toISOString()
  sourceDetails.importMethod = 'bulk_csv'

  return {
    firstName: record.firstName.trim(),
    lastName: record.lastName.trim(),
    email: record.email.trim().toLowerCase(),
    phone: record.phone.trim(),
    sourceType: record.sourceType || 'other',
    serviceType: record.serviceType || 'other',
    message: record.message?.trim() || '',
    estimatedValue: record.estimatedValue ? parseFloat(record.estimatedValue) : undefined,
    sourceDetails
  }
}

/**
 * Process bulk import of leads
 * @param csvContent - CSV content as string
 * @param fileName - Name of the uploaded file
 * @param options - Import options
 * @returns Promise with import progress result
 */
export async function processBulkImport(
  csvContent: string,
  fileName: string,
  options: {
    handleDuplicates: 'skip' | 'merge' | 'create'
    chunkSize?: number
  } = { handleDuplicates: 'skip', chunkSize: 100 }
): Promise<ApiResponse<BulkImportProgress>> {
  try {
    // Parse and validate CSV content
    const rawData = parseCSVContent(csvContent)
    const validation = validateImportData(rawData)

    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.length} errors found`,
        message: 'Import data contains validation errors'
      }
    }

    // Create import progress record
    const importProgress: BulkImportProgress = {
      id: crypto.randomUUID(),
      fileName,
      totalRows: rawData.length,
      processedRows: 0,
      successRows: 0,
      errorRows: 0,
      duplicateRows: 0,
      status: 'processing',
      errors: [],
      createdAt: new Date().toISOString()
    }

    // Process data in chunks
    const chunkSize = options.chunkSize || 100
    const chunks: Array<Record<string, string>[]> = []
    
    for (let i = 0; i < rawData.length; i += chunkSize) {
      chunks.push(rawData.slice(i, i + chunkSize))
    }

    // Process each chunk
    for (const chunk of chunks) {
      for (let i = 0; i < chunk.length; i++) {
        const record = chunk[i]
        const rowNumber = importProgress.processedRows + 1

        try {
          const leadData = transformImportRecord(record)
          
          // Check for duplicates if enabled
          if (options.handleDuplicates !== 'create') {
            const duplicateCheck = await checkForDuplicates(leadData)
            
            if (duplicateCheck.success && duplicateCheck.data?.isDuplicate) {
              importProgress.duplicateRows++
              
              if (options.handleDuplicates === 'merge' && duplicateCheck.data.existingLeadId) {
                // Merge with existing lead
                const mergeResult = await mergeDuplicateLead(
                  duplicateCheck.data.existingLeadId,
                  leadData
                )
                
                if (mergeResult.success) {
                  importProgress.successRows++
                } else {
                  importProgress.errorRows++
                  importProgress.errors.push({
                    row: rowNumber,
                    field: 'merge',
                    message: mergeResult.error || 'Failed to merge duplicate lead',
                    data: record
                  })
                }
              }
              // If 'skip', just count as duplicate and continue
              
              importProgress.processedRows++
              continue
            }
          }

          // Create new lead
          const createResult = await createLead(leadData)
          
          if (createResult.success) {
            importProgress.successRows++
          } else {
            importProgress.errorRows++
            importProgress.errors.push({
              row: rowNumber,
              field: 'create',
              message: createResult.error || 'Failed to create lead',
              data: record
            })
          }

        } catch (error) {
          importProgress.errorRows++
          importProgress.errors.push({
            row: rowNumber,
            field: 'processing',
            message: error instanceof Error ? error.message : 'Unknown processing error',
            data: record
          })
        }

        importProgress.processedRows++
      }
    }

    // Update final status
    importProgress.status = importProgress.errorRows > 0 ? 'completed' : 'completed'
    importProgress.completedAt = new Date().toISOString()

    return {
      success: true,
      data: importProgress,
      message: `Import completed: ${importProgress.successRows} created, ${importProgress.duplicateRows} duplicates, ${importProgress.errorRows} errors`
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to process bulk import'
    }
  }
}

/**
 * Generate CSV template for lead imports
 * @returns CSV template string
 */
export function generateImportTemplate(): string {
  const headers = [
    'firstName',
    'lastName', 
    'email',
    'phone',
    'sourceType',
    'serviceType',
    'message',
    'estimatedValue',
    'referrerName',
    'eventName',
    'campaignName',
    'socialPlatform'
  ]

  const sampleData = [
    'John',
    'Doe',
    'john.doe@example.com',
    '(555) 123-4567',
    'referral',
    'armed',
    'Need security for office building',
    '5000',
    'Jane Smith',
    '',
    '',
    ''
  ]

  return [
    headers.join(','),
    sampleData.join(',')
  ].join('\n')
}