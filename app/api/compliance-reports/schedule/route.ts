import { NextRequest, NextResponse } from 'next/server'
import { ReportSchedulerService } from '@/lib/services/report-scheduler-service'
import type { ReportSchedule } from '@/lib/services/report-scheduler-service'

/**
 * API endpoint for report scheduling management
 * POST /api/compliance-reports/schedule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required parameters
    const { name, description, frequency, recipients, createdBy, parameters } = body
    
    if (!name || !frequency || !recipients || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required parameters: name, frequency, recipients, createdBy' },
        { status: 400 }
      )
    }

    // Validate frequency
    const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency. Must be one of: ' + validFrequencies.join(', ') },
        { status: 400 }
      )
    }

    // Calculate next run date based on frequency
    const now = new Date()
    let nextRunDate = new Date()
    
    switch (frequency) {
      case 'daily':
        nextRunDate.setDate(now.getDate() + 1)
        nextRunDate.setHours(9, 0, 0, 0) // 9 AM next day
        break
      case 'weekly':
        nextRunDate.setDate(now.getDate() + 7)
        nextRunDate.setHours(9, 0, 0, 0)
        break
      case 'monthly':
        nextRunDate.setMonth(now.getMonth() + 1, 1)
        nextRunDate.setHours(9, 0, 0, 0)
        break
      case 'quarterly':
        const currentQuarter = Math.floor(now.getMonth() / 3)
        const nextQuarter = (currentQuarter + 1) % 4
        const nextYear = nextQuarter === 0 ? now.getFullYear() + 1 : now.getFullYear()
        nextRunDate = new Date(nextYear, nextQuarter * 3, 1, 9, 0, 0, 0)
        break
      case 'yearly':
        nextRunDate = new Date(now.getFullYear() + 1, 0, 1, 9, 0, 0, 0)
        break
    }

    // Create schedule
    const scheduleData: Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt'> = {
      name,
      description: description || '',
      frequency,
      startDate: now,
      nextRunDate,
      parameters: parameters || {
        format: 'pdf',
        includeSensitiveData: true,
        generatedBy: createdBy
      },
      recipients: Array.isArray(recipients) ? recipients : [recipients],
      isActive: body.isActive !== false, // Default to true
      createdBy
    }

    const schedule = await ReportSchedulerService.createSchedule(scheduleData)

    return NextResponse.json({
      success: true,
      data: {
        scheduleId: schedule.id,
        name: schedule.name,
        frequency: schedule.frequency,
        nextRunDate: schedule.nextRunDate,
        isActive: schedule.isActive,
        recipients: schedule.recipients
      }
    })

  } catch (error) {
    console.error('Error creating report schedule:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create report schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/compliance-reports/schedule
 * Retrieve active report schedules
 */
export async function GET(request: NextRequest) {
  try {
    const schedules = await ReportSchedulerService.getActiveSchedules()

    const formattedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      name: schedule.name,
      description: schedule.description,
      frequency: schedule.frequency,
      nextRunDate: schedule.nextRunDate,
      lastRunAt: schedule.lastRunAt,
      lastRunStatus: schedule.lastRunStatus,
      isActive: schedule.isActive,
      recipients: schedule.recipients,
      createdBy: schedule.createdBy,
      createdAt: schedule.createdAt
    }))

    return NextResponse.json({
      success: true,
      data: {
        schedules: formattedSchedules,
        total: formattedSchedules.length
      }
    })

  } catch (error) {
    console.error('Error fetching schedules:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch schedules',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Process due schedules - typically called by cron job
 * POST /api/compliance-reports/schedule/process
 */
export async function PATCH(request: NextRequest) {
  try {
    // This endpoint would typically be secured to only allow cron job access
    // For security, you might check for a specific header or API key
    
    const result = await ReportSchedulerService.processDueSchedules()

    return NextResponse.json({
      success: true,
      data: {
        processed: result.processed,
        successful: result.successful,
        failed: result.failed
      }
    })

  } catch (error) {
    console.error('Error processing due schedules:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process due schedules',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}