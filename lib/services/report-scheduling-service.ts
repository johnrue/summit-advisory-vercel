'use client'

import { createClient } from '@/lib/supabase'

export interface ScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string // HH:MM format
  dayOfWeek?: number // 0-6 (Sunday = 0)
  dayOfMonth?: number // 1-28
  timezone?: string // e.g., 'America/New_York'
}

export interface ScheduledReport {
  id: string
  name: string
  description: string
  dataType: 'guards' | 'applications' | 'shifts' | 'compliance' | 'audit-logs'
  format: 'csv' | 'json' | 'pdf'
  fields: string[]
  filters?: Record<string, any>
  schedule: ScheduleConfig
  recipients: string[]
  isActive: boolean
  createdBy: string
  createdAt: Date
  lastRun?: Date
  nextRun?: Date
  errorCount?: number
  lastError?: string
}

export interface ReportExecution {
  id: string
  scheduledReportId: string
  executedAt: Date
  status: 'success' | 'failed' | 'partial'
  recordCount?: number
  fileSize?: string
  recipients: string[]
  error?: string
  executionTimeMs: number
}

class ReportSchedulingService {
  private supabase = createClient()

  /**
   * Create a new scheduled report
   */
  async createScheduledReport(report: Omit<ScheduledReport, 'id' | 'createdAt' | 'nextRun'>): Promise<{ success: boolean; data?: ScheduledReport; error?: string }> {
    try {
      // Validate schedule configuration
      const validation = this.validateScheduleConfig(report.schedule)
      if (!validation.isValid) {
        return { success: false, error: validation.error }
      }

      // Calculate next run time
      const nextRun = this.calculateNextRun(report.schedule)

      const scheduledReport: ScheduledReport = {
        ...report,
        id: `sched-${Date.now()}`,
        createdAt: new Date(),
        nextRun
      }

      // Store in database
      const { data, error } = await this.supabase
        .from('scheduled_reports')
        .insert(scheduledReport)
        .select()
        .single()

      if (error) {
        throw new Error(`Database insert failed: ${error.message}`)
      }

      return { success: true, data: data as ScheduledReport }
    } catch (error) {
      console.error('Create scheduled report failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create scheduled report'
      }
    }
  }

  /**
   * Update an existing scheduled report
   */
  async updateScheduledReport(id: string, updates: Partial<ScheduledReport>): Promise<{ success: boolean; data?: ScheduledReport; error?: string }> {
    try {
      // Recalculate next run if schedule changed
      if (updates.schedule) {
        const validation = this.validateScheduleConfig(updates.schedule)
        if (!validation.isValid) {
          return { success: false, error: validation.error }
        }

        updates.nextRun = this.calculateNextRun(updates.schedule)
      }

      const { data, error } = await this.supabase
        .from('scheduled_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Database update failed: ${error.message}`)
      }

      return { success: true, data: data as ScheduledReport }
    } catch (error) {
      console.error('Update scheduled report failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update scheduled report'
      }
    }
  }

  /**
   * Delete a scheduled report
   */
  async deleteScheduledReport(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', id)

      if (error) {
        throw new Error(`Database delete failed: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Delete scheduled report failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete scheduled report'
      }
    }
  }

  /**
   * Get all scheduled reports for current user
   */
  async getScheduledReports(): Promise<{ success: boolean; data?: ScheduledReport[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('scheduled_reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Database query failed: ${error.message}`)
      }

      return { success: true, data: data as ScheduledReport[] }
    } catch (error) {
      console.error('Get scheduled reports failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scheduled reports'
      }
    }
  }

  /**
   * Get report execution history
   */
  async getReportExecutions(scheduledReportId: string, limit = 50): Promise<{ success: boolean; data?: ReportExecution[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('report_executions')
        .select('*')
        .eq('scheduled_report_id', scheduledReportId)
        .order('executed_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Database query failed: ${error.message}`)
      }

      return { success: true, data: data as ReportExecution[] }
    } catch (error) {
      console.error('Get report executions failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get report executions'
      }
    }
  }

  /**
   * Toggle scheduled report active status
   */
  async toggleScheduledReport(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const updates: Partial<ScheduledReport> = { isActive }
      
      // If activating, recalculate next run
      if (isActive) {
        const { data: reportData } = await this.supabase
          .from('scheduled_reports')
          .select('schedule')
          .eq('id', id)
          .single()

        if (reportData?.schedule) {
          updates.nextRun = this.calculateNextRun(reportData.schedule)
        }
      }

      const { error } = await this.supabase
        .from('scheduled_reports')
        .update(updates)
        .eq('id', id)

      if (error) {
        throw new Error(`Database update failed: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Toggle scheduled report failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle scheduled report'
      }
    }
  }

  /**
   * Execute a scheduled report manually
   */
  async executeReportNow(id: string): Promise<{ success: boolean; execution?: ReportExecution; error?: string }> {
    try {
      // This would trigger the Edge Function to execute the report
      const response = await fetch('/api/v1/reports/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scheduledReportId: id })
      })

      const result = await response.json()
      
      if (!result.success) {
        return { success: false, error: result.error }
      }

      return { success: true, execution: result.execution }
    } catch (error) {
      console.error('Execute report now failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute report'
      }
    }
  }

  /**
   * Validate schedule configuration
   */
  private validateScheduleConfig(schedule: ScheduleConfig): { isValid: boolean; error?: string } {
    if (!schedule.frequency || !['daily', 'weekly', 'monthly'].includes(schedule.frequency)) {
      return { isValid: false, error: 'Invalid frequency. Must be daily, weekly, or monthly.' }
    }

    if (!schedule.time || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.time)) {
      return { isValid: false, error: 'Invalid time format. Must be HH:MM in 24-hour format.' }
    }

    if (schedule.frequency === 'weekly') {
      if (schedule.dayOfWeek === undefined || schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
        return { isValid: false, error: 'Weekly reports require valid dayOfWeek (0-6).' }
      }
    }

    if (schedule.frequency === 'monthly') {
      if (schedule.dayOfMonth === undefined || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 28) {
        return { isValid: false, error: 'Monthly reports require valid dayOfMonth (1-28).' }
      }
    }

    return { isValid: true }
  }

  /**
   * Calculate next run time based on schedule configuration
   */
  private calculateNextRun(schedule: ScheduleConfig): Date {
    const now = new Date()
    const [hours, minutes] = schedule.time.split(':').map(Number)
    
    let nextRun = new Date()
    nextRun.setHours(hours, minutes, 0, 0)

    switch (schedule.frequency) {
      case 'daily':
        // If time has passed today, schedule for tomorrow
        if (nextRun <= now) {
          nextRun = new Date(nextRun.getTime() + 24 * 60 * 60 * 1000) // Add 1 day
        }
        break

      case 'weekly':
        // Set to the specified day of week
        const targetDay = schedule.dayOfWeek || 0
        const currentDay = nextRun.getDay()
        let daysUntilTarget = (targetDay - currentDay + 7) % 7

        // If it's the target day but time has passed, wait until next week
        if (daysUntilTarget === 0 && nextRun <= now) {
          daysUntilTarget = 7
        }

        nextRun = new Date(nextRun.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000)
        break

      case 'monthly':
        // Set to the specified day of month
        const targetDate = schedule.dayOfMonth || 1
        const tempDate = new Date(nextRun)
        tempDate.setDate(targetDate)

        // If date has passed this month, move to next month
        if (tempDate <= now) {
          tempDate.setMonth(tempDate.getMonth() + 1)
          tempDate.setDate(targetDate)
        }
        
        nextRun = tempDate
        break
    }

    return nextRun
  }

  /**
   * Get reports that are due to run
   */
  async getDueReports(): Promise<ScheduledReport[]> {
    try {
      const now = new Date()
      
      const { data, error } = await this.supabase
        .from('scheduled_reports')
        .select('*')
        .eq('is_active', true)
        .lte('next_run', now.toISOString())

      if (error) {
        console.error('Get due reports failed:', error)
        return []
      }

      return data as ScheduledReport[]
    } catch (error) {
      console.error('Get due reports failed:', error)
      return []
    }
  }

  /**
   * Update report after execution
   */
  async updateReportAfterExecution(
    reportId: string, 
    execution: Omit<ReportExecution, 'id'>,
    newNextRun?: Date
  ): Promise<void> {
    try {
      // Record the execution
      const { error: insertError } = await this.supabase
        .from('report_executions')
        .insert({
          ...execution,
          id: `exec-${Date.now()}`
        })

      if (insertError) {
        console.error('Failed to record execution:', insertError)
      }

      // Update the scheduled report
      const updates: Partial<ScheduledReport> = {
        lastRun: execution.executedAt
      }

      if (execution.status === 'failed') {
        updates.errorCount = (updates.errorCount || 0) + 1
        updates.lastError = execution.error
      } else {
        updates.errorCount = 0
        updates.lastError = undefined
      }

      if (newNextRun) {
        updates.nextRun = newNextRun
      }

      const { error: updateError } = await this.supabase
        .from('scheduled_reports')
        .update(updates)
        .eq('id', reportId)

      if (updateError) {
        console.error('Failed to update scheduled report:', updateError)
      }
    } catch (error) {
      console.error('Update report after execution failed:', error)
    }
  }

  /**
   * Format schedule description for display
   */
  getScheduleDescription(schedule: ScheduleConfig): string {
    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    switch (schedule.frequency) {
      case 'daily':
        return `Daily at ${schedule.time}`
      case 'weekly':
        const dayName = schedule.dayOfWeek !== undefined ? weekDays[schedule.dayOfWeek] : 'Sunday'
        return `Weekly on ${dayName} at ${schedule.time}`
      case 'monthly':
        const day = schedule.dayOfMonth || 1
        const suffix = this.getOrdinalSuffix(day)
        return `Monthly on the ${day}${suffix} at ${schedule.time}`
      default:
        return 'Unknown schedule'
    }
  }

  /**
   * Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
   */
  private getOrdinalSuffix(num: number): string {
    const j = num % 10
    const k = num % 100
    
    if (j === 1 && k !== 11) return 'st'
    if (j === 2 && k !== 12) return 'nd'
    if (j === 3 && k !== 13) return 'rd'
    return 'th'
  }
}

// Export singleton instance
export const reportSchedulingService = new ReportSchedulingService()
export default reportSchedulingService