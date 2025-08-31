import { supabase } from '@/lib/supabase'
import { ComplianceReportService } from './compliance-report-service'
import { PDFGenerator, CSVGenerator } from '@/lib/utils/pdf-generator'
import { EmailService } from '@/lib/utils/email-service'
import type { ReportParameters } from '@/lib/types'

export interface ReportSchedule {
  id: string
  name: string
  description: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  startDate: Date
  nextRunDate: Date
  parameters: ReportParameters
  recipients: string[]
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
  lastRunAt?: Date
  lastRunStatus?: 'success' | 'failed'
  lastRunError?: string
}

/**
 * Report Scheduler Service for automated TOPS compliance reporting
 * Manages scheduled report generation and delivery
 */
export class ReportSchedulerService {
  
  /**
   * Create a new report schedule
   */
  static async createSchedule(schedule: Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportSchedule> {
    try {
      const { data, error } = await supabase
        .from('report_schedules')
        .insert([{
          ...schedule,
          next_run_date: schedule.nextRunDate.toISOString(),
          start_date: schedule.startDate.toISOString(),
          parameters: JSON.stringify(schedule.parameters),
          recipients: schedule.recipients,
          created_by: schedule.createdBy,
          is_active: schedule.isActive
        }])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create schedule: ${error.message}`)
      }

      return this.mapDatabaseRecord(data)

    } catch (error) {
      console.error('Error creating report schedule:', error)
      throw new Error('Failed to create report schedule')
    }
  }

  /**
   * Get all active report schedules
   */
  static async getActiveSchedules(): Promise<ReportSchedule[]> {
    try {
      const { data, error } = await supabase
        .from('report_schedules')
        .select('*')
        .eq('is_active', true)
        .order('next_run_date', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch schedules: ${error.message}`)
      }

      return data?.map(this.mapDatabaseRecord) || []

    } catch (error) {
      console.error('Error fetching active schedules:', error)
      throw new Error('Failed to fetch active schedules')
    }
  }

  /**
   * Get schedules due for execution
   */
  static async getDueSchedules(): Promise<ReportSchedule[]> {
    try {
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('report_schedules')
        .select('*')
        .eq('is_active', true)
        .lte('next_run_date', now)
        .order('next_run_date', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch due schedules: ${error.message}`)
      }

      return data?.map(this.mapDatabaseRecord) || []

    } catch (error) {
      console.error('Error fetching due schedules:', error)
      throw new Error('Failed to fetch due schedules')
    }
  }

  /**
   * Execute a scheduled report
   */
  static async executeSchedule(schedule: ReportSchedule): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Executing scheduled report: ${schedule.name}`)

      // Calculate date range based on frequency
      const dateRange = this.calculateDateRange(schedule.frequency)
      
      // Update parameters with calculated date range
      const parameters: ReportParameters = {
        ...schedule.parameters,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }

      // Generate the report
      const report = await ComplianceReportService.generateTOPSReport(parameters)

      // Generate PDF and store in blob
      const pdfResult = await PDFGenerator.generateTOPSReport(
        report.data,
        PDFGenerator.generateFileName(report.data)
      )

      // Generate PDF buffer for email attachment
      const pdfBuffer = await PDFGenerator.generateTOPSReportBuffer(report.data)

      // Send email with report
      const emailResult = await EmailService.sendComplianceReport({
        reportData: report.data,
        reportUrl: pdfResult.url,
        recipients: schedule.recipients,
        attachments: [{
          filename: PDFGenerator.generateFileName(report.data),
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      })

      if (!emailResult.success) {
        throw new Error(`Email delivery failed: ${emailResult.error}`)
      }

      // Update schedule with successful execution
      await this.updateScheduleAfterExecution(schedule.id, {
        success: true,
        nextRunDate: this.calculateNextRunDate(schedule.frequency, new Date())
      })

      console.log(`Successfully executed scheduled report: ${schedule.name}`)
      return { success: true }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error(`Error executing scheduled report ${schedule.name}:`, error)

      // Update schedule with failure
      await this.updateScheduleAfterExecution(schedule.id, {
        success: false,
        error: errorMessage,
        nextRunDate: this.calculateNextRunDate(schedule.frequency, new Date())
      })

      // Send failure notification
      await EmailService.sendReportFailureNotification(
        errorMessage,
        schedule.parameters,
        schedule.recipients
      )

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Update schedule after execution
   */
  private static async updateScheduleAfterExecution(
    scheduleId: string,
    execution: { success: boolean; error?: string; nextRunDate: Date }
  ): Promise<void> {
    const updateData = {
      last_run_at: new Date().toISOString(),
      last_run_status: execution.success ? 'success' : 'failed',
      last_run_error: execution.error || null,
      next_run_date: execution.nextRunDate.toISOString(),
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('report_schedules')
      .update(updateData)
      .eq('id', scheduleId)

    if (error) {
      console.error('Error updating schedule after execution:', error)
    }
  }

  /**
   * Calculate date range based on frequency
   */
  private static calculateDateRange(frequency: ReportSchedule['frequency']): { startDate: Date; endDate: Date } {
    const now = new Date()
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // End of previous day
    let startDate: Date

    switch (frequency) {
      case 'daily':
        startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 1)
        break
      case 'weekly':
        startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 7)
        break
      case 'monthly':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1)
        endDate.setDate(0) // Last day of previous month
        break
      case 'quarterly':
        const currentQuarter = Math.floor(now.getMonth() / 3)
        const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1
        const year = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear()
        startDate = new Date(year, prevQuarter * 3, 1)
        endDate.setFullYear(year, prevQuarter * 3 + 3, 0) // Last day of previous quarter
        break
      case 'yearly':
        startDate = new Date(now.getFullYear() - 1, 0, 1)
        endDate.setFullYear(now.getFullYear() - 1, 11, 31) // Last day of previous year
        break
      default:
        throw new Error(`Unsupported frequency: ${frequency}`)
    }

    return { startDate, endDate }
  }

  /**
   * Calculate next run date based on frequency
   */
  private static calculateNextRunDate(frequency: ReportSchedule['frequency'], fromDate: Date): Date {
    const nextRun = new Date(fromDate)

    switch (frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1)
        break
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7)
        break
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1)
        break
      case 'quarterly':
        nextRun.setMonth(nextRun.getMonth() + 3)
        break
      case 'yearly':
        nextRun.setFullYear(nextRun.getFullYear() + 1)
        break
    }

    return nextRun
  }

  /**
   * Map database record to ReportSchedule interface
   */
  private static mapDatabaseRecord(record: any): ReportSchedule {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      frequency: record.frequency,
      startDate: new Date(record.start_date),
      nextRunDate: new Date(record.next_run_date),
      parameters: typeof record.parameters === 'string' ? JSON.parse(record.parameters) : record.parameters,
      recipients: record.recipients,
      isActive: record.is_active,
      createdBy: record.created_by,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      lastRunAt: record.last_run_at ? new Date(record.last_run_at) : undefined,
      lastRunStatus: record.last_run_status,
      lastRunError: record.last_run_error
    }
  }

  /**
   * Process all due schedules (to be called by cron job)
   */
  static async processDueSchedules(): Promise<{ processed: number; successful: number; failed: number }> {
    const dueSchedules = await this.getDueSchedules()
    let successful = 0
    let failed = 0

    for (const schedule of dueSchedules) {
      const result = await this.executeSchedule(schedule)
      if (result.success) {
        successful++
      } else {
        failed++
      }
    }

    return {
      processed: dueSchedules.length,
      successful,
      failed
    }
  }
}