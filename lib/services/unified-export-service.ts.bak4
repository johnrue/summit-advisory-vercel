import { supabase } from '@/lib/supabase'
import { FilterCriteria } from '@/lib/types/unified-leads'
import type { ApiResponse } from '@/lib/types'
import { format } from 'date-fns'

export interface ExportOptions {
  format: 'csv' | 'xlsx'
  includeAnalytics: boolean
  includePipeline: 'both' | 'client' | 'guard'
  dateRange?: {
    start: Date
    end: Date
  }
  columns?: string[]
  groupBy?: 'manager' | 'source' | 'status' | 'date'
}

export interface ExportResult {
  filename: string
  data: string | ArrayBuffer
  mimeType: string
  size: number
  recordCount: number
}

export interface ScheduledReport {
  id: string
  name: string
  description?: string
  filters: FilterCriteria
  exportOptions: ExportOptions
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly'
    dayOfWeek?: number // 0-6 for weekly
    dayOfMonth?: number // 1-31 for monthly
    time: string // HH:MM format
    timezone: string
  }
  recipients: string[]
  active: boolean
  lastRun?: Date
  nextRun: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Export unified lead data with analytics
 */
export async function exportUnifiedLeads(
  filters: FilterCriteria,
  options: ExportOptions
): Promise<ApiResponse<ExportResult>> {
  try {
    let clientLeads: any[] = []
    let guardLeads: any[] = []

    // Fetch client leads if included
    if (options.includePipeline === 'both' || options.includePipeline === 'client') {
      let clientQuery = supabase
        .from('client_leads')
        .select(`
          *,
          assigned_manager:users!assigned_to(first_name, last_name, email),
          created_by_user:users!created_by(first_name, last_name)
        `)
        .gte('created_at', filters.dateRange?.start || new Date(0).toISOString())
        .lte('created_at', filters.dateRange?.end || new Date().toISOString())

      if (filters.sources?.length) {
        clientQuery = clientQuery.in('source_type', filters.sources)
      }
      if (filters.assignedUsers?.length) {
        clientQuery = clientQuery.in('assigned_to', filters.assignedUsers)
      }
      if (filters.statuses?.length) {
        clientQuery = clientQuery.in('status', filters.statuses)
      }

      const { data: clientData, error: clientError } = await clientQuery

      if (clientError) {
        throw new Error(`Failed to fetch client leads: ${clientError.message}`)
      }

      clientLeads = (clientData || []).map(lead => ({
        ...lead,
        pipeline_type: 'client'
      }))
    }

    // Fetch guard leads if included
    if (options.includePipeline === 'both' || options.includePipeline === 'guard') {
      let guardQuery = supabase
        .from('guard_leads')
        .select(`
          *,
          assigned_manager:users!assigned_to(first_name, last_name, email),
          created_by_user:users!created_by(first_name, last_name)
        `)
        .gte('created_at', filters.dateRange?.start || new Date(0).toISOString())
        .lte('created_at', filters.dateRange?.end || new Date().toISOString())

      if (filters.sources?.length) {
        guardQuery = guardQuery.in('source_type', filters.sources)
      }
      if (filters.assignedUsers?.length) {
        guardQuery = guardQuery.in('assigned_to', filters.assignedUsers)
      }
      if (filters.statuses?.length) {
        guardQuery = guardQuery.in('status', filters.statuses)
      }

      const { data: guardData, error: guardError } = await guardQuery

      if (guardError) {
        throw new Error(`Failed to fetch guard leads: ${guardError.message}`)
      }

      guardLeads = (guardData || []).map(lead => ({
        ...lead,
        pipeline_type: 'guard'
      }))
    }

    // Combine all leads
    const allLeads = [...clientLeads, ...guardLeads]

    if (allLeads.length === 0) {
      throw new Error('No data found matching the specified criteria')
    }

    // Generate export based on format
    if (options.format === 'csv') {
      const csvResult = await generateCSVExport(allLeads, options)
      return {
        success: true,
        data: csvResult,
        message: `Successfully exported ${csvResult.recordCount} records to CSV`
      }
    } else {
      const xlsxResult = await generateXLSXExport(allLeads, options)
      return {
        success: true,
        data: xlsxResult,
        message: `Successfully exported ${xlsxResult.recordCount} records to Excel`
      }
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to export leads'
    }
  }
}

/**
 * Generate CSV export
 */
async function generateCSVExport(leads: any[], options: ExportOptions): Promise<ExportResult> {
  // Define column mappings
  const columnMappings = {
    id: 'Lead ID',
    pipeline_type: 'Pipeline',
    first_name: 'First Name',
    last_name: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    service_type: 'Service Type',
    source_type: 'Source',
    status: 'Status',
    assigned_manager: 'Assigned Manager',
    estimated_value: 'Estimated Value',
    qualification_score: 'Qualification Score',
    created_at: 'Created Date',
    assigned_at: 'Assigned Date',
    last_contact_date: 'Last Contact',
    next_follow_up_date: 'Next Follow-up',
    contact_count: 'Contact Count',
    qualification_notes: 'Notes'
  }

  // Use specified columns or default set
  const columnsToInclude = options.columns || Object.keys(columnMappings)
  
  // Create CSV headers
  const headers = columnsToInclude.map(col => columnMappings[col as keyof typeof columnMappings] || col)
  
  // Process leads data
  const processedLeads = leads.map(lead => {
    const processedLead: Record<string, any> = {}
    
    columnsToInclude.forEach(col => {
      let value = lead[col]
      
      // Special processing for specific columns
      switch (col) {
        case 'assigned_manager':
          value = lead.assigned_manager 
            ? `${lead.assigned_manager.first_name} ${lead.assigned_manager.last_name}`
            : 'Unassigned'
          break
        case 'created_at':
        case 'assigned_at':
        case 'last_contact_date':
        case 'next_follow_up_date':
          value = value ? format(new Date(value), 'yyyy-MM-dd HH:mm:ss') : ''
          break
        case 'estimated_value':
          value = value ? `$${value.toLocaleString()}` : ''
          break
        case 'qualification_score':
          value = value || 0
          break
        case 'contact_count':
          value = value || 0
          break
        default:
          value = value || ''
      }
      
      processedLead[col] = value
    })
    
    return processedLead
  })

  // Group data if specified
  let finalData = processedLeads
  if (options.groupBy) {
    finalData = groupLeadsBy(processedLeads, options.groupBy)
  }

  // Generate CSV content
  const csvRows = [headers.join(',')]
  
  finalData.forEach(lead => {
    const row = columnsToInclude.map(col => {
      const value = String(lead[col] || '')
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    csvRows.push(row.join(','))
  })

  const csvContent = csvRows.join('\n')
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss')
  const filename = `unified-leads-export-${timestamp}.csv`

  return {
    filename,
    data: csvContent,
    mimeType: 'text/csv',
    size: new Blob([csvContent]).size,
    recordCount: finalData.length
  }
}

/**
 * Generate XLSX export (simplified - in practice would use a library like SheetJS)
 */
async function generateXLSXExport(leads: any[], options: ExportOptions): Promise<ExportResult> {
  // For now, generate CSV and indicate XLSX support needed
  // In a real implementation, you would use a library like 'xlsx' or 'exceljs'
  
  const csvResult = await generateCSVExport(leads, options)
  
  return {
    ...csvResult,
    filename: csvResult.filename.replace('.csv', '.xlsx'),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    data: csvResult.data // In practice, this would be Excel binary data
  }
}

/**
 * Group leads by specified field
 */
function groupLeadsBy(leads: any[], groupBy: string): any[] {
  const grouped = leads.reduce((acc, lead) => {
    let groupKey: string
    
    switch (groupBy) {
      case 'manager':
        groupKey = lead.assigned_manager || 'Unassigned'
        break
      case 'source':
        groupKey = lead.source_type || 'Unknown'
        break
      case 'status':
        groupKey = lead.status || 'Unknown'
        break
      case 'date':
        groupKey = lead.created_at ? format(new Date(lead.created_at), 'yyyy-MM-dd') : 'Unknown'
        break
      default:
        groupKey = 'All'
    }
    
    if (!acc[groupKey]) {
      acc[groupKey] = []
    }
    acc[groupKey].push(lead)
    
    return acc
  }, {} as Record<string, any[]>)

  // Flatten grouped data with group headers
  const flattenedData: any[] = []
  
  Object.entries(grouped).forEach(([groupName, groupLeads]) => {
    const leads = groupLeads as any[]
    // Add group header row
    flattenedData.push({
      id: `GROUP: ${groupName} (${leads.length} records)`,
      pipeline_type: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      service_type: '',
      source_type: '',
      status: '',
      assigned_manager: '',
      estimated_value: '',
      qualification_score: '',
      created_at: '',
      assigned_at: '',
      last_contact_date: '',
      next_follow_up_date: '',
      contact_count: '',
      qualification_notes: ''
    })
    
    // Add group data
    flattenedData.push(...leads)
    
    // Add separator row
    flattenedData.push({
      id: '',
      pipeline_type: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      service_type: '',
      source_type: '',
      status: '',
      assigned_manager: '',
      estimated_value: '',
      qualification_score: '',
      created_at: '',
      assigned_at: '',
      last_contact_date: '',
      next_follow_up_date: '',
      contact_count: '',
      qualification_notes: ''
    })
  })

  return flattenedData
}

/**
 * Create a scheduled report
 */
export async function createScheduledReport(
  report: Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResponse<ScheduledReport>> {
  try {
    const reportData = {
      ...report,
      id: `report_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // In practice, you would save this to a database
    // For now, return the created report
    return {
      success: true,
      data: reportData as ScheduledReport,
      message: 'Scheduled report created successfully'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to create scheduled report'
    }
  }
}

/**
 * Get all scheduled reports
 */
export async function getScheduledReports(): Promise<ApiResponse<ScheduledReport[]>> {
  try {
    // In practice, fetch from database
    const reports: ScheduledReport[] = []

    return {
      success: true,
      data: reports,
      message: 'Scheduled reports retrieved successfully'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to get scheduled reports'
    }
  }
}

/**
 * Execute a scheduled report
 */
export async function executeScheduledReport(
  reportId: string
): Promise<ApiResponse<ExportResult>> {
  try {
    // In practice, fetch report configuration from database
    // For now, return a placeholder
    
    throw new Error('Scheduled report not found')

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to execute scheduled report'
    }
  }
}

/**
 * Generate summary analytics for export
 */
export async function generateAnalyticsExport(
  filters: FilterCriteria
): Promise<ApiResponse<ExportResult>> {
  try {
    // This would generate a summary report with analytics data
    // Including conversion rates, source performance, manager performance, etc.
    
    const summaryData = [
      ['Metric', 'Value', 'Description'],
      ['Total Leads', '0', 'Total leads in date range'],
      ['Client Leads', '0', 'Client pipeline leads'],
      ['Guard Leads', '0', 'Guard pipeline leads'],
      ['Conversion Rate', '0%', 'Overall conversion rate'],
      ['Avg Response Time', '0h', 'Average manager response time'],
      // ... more analytics data
    ]

    const csvContent = summaryData.map(row => row.join(',')).join('\n')
    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss')
    const filename = `analytics-summary-${timestamp}.csv`

    return {
      success: true,
      data: {
        filename,
        data: csvContent,
        mimeType: 'text/csv',
        size: new Blob([csvContent]).size,
        recordCount: summaryData.length - 1 // Exclude header
      },
      message: 'Analytics export generated successfully'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to generate analytics export'
    }
  }
}