// Import necessary modules from edge runtime
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

// Edge Function Environment Variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

interface ScheduledReport {
  id: string
  name: string
  description: string
  dataType: string
  format: string
  fields: string[]
  filters?: Record<string, any>
  schedule: {
    frequency: string
    time: string
    dayOfWeek?: number
    dayOfMonth?: number
  }
  recipients: string[]
  isActive: boolean
  createdBy: string
  createdAt: string
  nextRun?: string
}

interface ReportExecution {
  id: string
  scheduledReportId: string
  executedAt: string
  status: 'success' | 'failed' | 'partial'
  recordCount?: number
  fileSize?: string
  recipients: string[]
  error?: string
  executionTimeMs: number
}

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req: Request) => {
  try {
    const { method } = req

    if (method === 'GET') {
      // Health check endpoint
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Scheduled reports function is running',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (method !== 'POST') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { action, scheduledReportId } = body

    if (action === 'execute_due_reports') {
      // Execute all reports that are due
      const result = await executeDueReports()
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      })
    } else if (action === 'execute_single_report' && scheduledReportId) {
      // Execute a specific report
      const result = await executeSpecificReport(scheduledReportId)
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      })
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid action or missing parameters' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function executeDueReports(): Promise<{ success: boolean; executedReports: number; errors: string[] }> {
  const errors: string[] = []
  let executedReports = 0

  try {
    // Get reports that are due to run
    const { data: dueReports, error: queryError } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('is_active', true)
      .lte('next_run', new Date().toISOString())

    if (queryError) {
      throw new Error(`Failed to query due reports: ${queryError.message}`)
    }

    if (!dueReports || dueReports.length === 0) {
      return { success: true, executedReports: 0, errors: [] }
    }

    // Execute each due report
    for (const report of dueReports) {
      try {
        await executeReport(report as ScheduledReport)
        executedReports++
      } catch (error) {
        const errorMsg = `Report ${report.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
      }
    }

    return {
      success: true,
      executedReports,
      errors
    }

  } catch (error) {
    return {
      success: false,
      executedReports,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    }
  }
}

async function executeSpecificReport(reportId: string): Promise<{ success: boolean; execution?: ReportExecution; error?: string }> {
  try {
    // Get the specific report
    const { data: reportData, error: queryError } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (queryError || !reportData) {
      throw new Error(`Report not found: ${reportId}`)
    }

    const execution = await executeReport(reportData as ScheduledReport)
    
    return {
      success: true,
      execution
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function executeReport(report: ScheduledReport): Promise<ReportExecution> {
  const startTime = Date.now()
  const executionId = `exec-${Date.now()}`
  
  try {
    // Generate the report data
    const reportData = await generateReportData(report)
    
    if (!reportData.success) {
      throw new Error(reportData.error || 'Report generation failed')
    }

    // Send email with the report
    await sendReportEmail(report, reportData.data, reportData.fileName)

    // Calculate next run time
    const nextRun = calculateNextRun(report.schedule)

    // Create execution record
    const execution: ReportExecution = {
      id: executionId,
      scheduledReportId: report.id,
      executedAt: new Date().toISOString(),
      status: 'success',
      recordCount: reportData.recordCount,
      fileSize: reportData.fileSize,
      recipients: report.recipients,
      executionTimeMs: Date.now() - startTime
    }

    // Update the scheduled report with execution info
    await updateScheduledReport(report.id, execution, nextRun)

    return execution

  } catch (error) {
    // Create failed execution record
    const execution: ReportExecution = {
      id: executionId,
      scheduledReportId: report.id,
      executedAt: new Date().toISOString(),
      status: 'failed',
      recipients: report.recipients,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTimeMs: Date.now() - startTime
    }

    // Update the scheduled report with error info
    await updateScheduledReport(report.id, execution)

    throw error
  }
}

async function generateReportData(report: ScheduledReport): Promise<{
  success: boolean
  data?: any
  fileName?: string
  recordCount?: number
  fileSize?: string
  error?: string
}> {
  try {
    // Build query based on report configuration
    let query = supabase.from(getTableName(report.dataType))

    // Apply field selection
    if (report.fields.length > 0) {
      query = query.select(report.fields.join(', '))
    } else {
      query = query.select('*')
    }

    // Apply filters
    if (report.filters) {
      Object.entries(report.filters).forEach(([field, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          query = query.eq(field, value)
        }
      })
    }

    // Execute query
    const { data, error } = await query

    if (error) {
      throw new Error(`Data query failed: ${error.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error('No data found for report criteria')
    }

    // Format data based on export format
    const formattedData = formatDataForExport(data, report.format, report.fields)
    const fileName = `${report.dataType}-${report.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.${report.format}`

    return {
      success: true,
      data: formattedData,
      fileName,
      recordCount: data.length,
      fileSize: formatFileSize(JSON.stringify(formattedData).length)
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function sendReportEmail(report: ScheduledReport, reportData: any, fileName: string): Promise<void> {
  if (!RESEND_API_KEY || report.recipients.length === 0) {
    return
  }

  try {
    const emailData = {
      from: 'reports@summitadvisory.com',
      to: report.recipients,
      subject: `Scheduled Report: ${report.name}`,
      html: `
        <h2>${report.name}</h2>
        <p>${report.description}</p>
        
        <h3>Report Details:</h3>
        <ul>
          <li><strong>Data Type:</strong> ${report.dataType}</li>
          <li><strong>Format:</strong> ${report.format.toUpperCase()}</li>
          <li><strong>Generated:</strong> ${new Date().toLocaleString()}</li>
          <li><strong>Records:</strong> ${reportData.length || 0}</li>
        </ul>
        
        <p>The report data is attached as ${fileName}.</p>
        
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          This is an automated report from Summit Advisory Guard Management Platform.
        </p>
      `,
      attachments: [
        {
          filename: fileName,
          content: Buffer.from(
            report.format === 'json' ? JSON.stringify(reportData, null, 2) : 
            report.format === 'csv' ? convertToCSV(reportData) :
            JSON.stringify(reportData, null, 2)
          ).toString('base64')
        }
      ]
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Email send failed: ${error}`)
    }

  } catch (error) {
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function updateScheduledReport(
  reportId: string, 
  execution: ReportExecution, 
  nextRun?: Date
): Promise<void> {
  try {
    // Record the execution
    const { error: insertError } = await supabase
      .from('report_executions')
      .insert(execution)

    if (insertError) {
    }

    // Update the scheduled report
    const updates: any = {
      last_run: execution.executedAt
    }

    if (execution.status === 'failed') {
      updates.error_count = (updates.error_count || 0) + 1
      updates.last_error = execution.error
    } else {
      updates.error_count = 0
      updates.last_error = null
    }

    if (nextRun) {
      updates.next_run = nextRun.toISOString()
    }

    const { error: updateError } = await supabase
      .from('scheduled_reports')
      .update(updates)
      .eq('id', reportId)

    if (updateError) {
    }

  } catch (error) {
  }
}

function calculateNextRun(schedule: any): Date {
  const now = new Date()
  const [hours, minutes] = schedule.time.split(':').map(Number)
  
  let nextRun = new Date()
  nextRun.setHours(hours, minutes, 0, 0)

  switch (schedule.frequency) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1)
      }
      break

    case 'weekly':
      const targetDay = schedule.dayOfWeek || 0
      const currentDay = nextRun.getDay()
      let daysUntilTarget = (targetDay - currentDay + 7) % 7

      if (daysUntilTarget === 0 && nextRun <= now) {
        daysUntilTarget = 7
      }

      nextRun.setDate(nextRun.getDate() + daysUntilTarget)
      break

    case 'monthly':
      const targetDate = schedule.dayOfMonth || 1
      nextRun.setDate(targetDate)

      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1)
        nextRun.setDate(targetDate)
      }
      break
  }

  return nextRun
}

function getTableName(dataType: string): string {
  const tableMap: Record<string, string> = {
    'guards': 'guards',
    'applications': 'applications', 
    'shifts': 'shifts',
    'compliance': 'compliance_records',
    'audit-logs': 'audit_logs'
  }

  return tableMap[dataType] || dataType
}

function formatDataForExport(data: any[], format: string, fields: string[]): any {
  if (format === 'json') {
    return data.map(record => {
      if (fields.length > 0) {
        const filteredRecord: any = {}
        fields.forEach(field => {
          filteredRecord[field] = record[field]
        })
        return filteredRecord
      }
      return record
    })
  }

  return data
}

function convertToCSV(data: any[]): string {
  if (!data.length) return ''

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value
      }).join(',')
    )
  ]

  return csvRows.join('\n')
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}