import { NextRequest, NextResponse } from 'next/server'
import { BackgroundCheckService } from '@/lib/services/background-check-service'
import { BackgroundCheckNotificationService } from '@/lib/services/background-check-notification-service'
import type { ExpiryReminderAlert } from '@/lib/types/background-check'

const backgroundCheckService = new BackgroundCheckService()
const notificationService = new BackgroundCheckNotificationService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30')
    const includeMetrics = searchParams.get('includeMetrics') === 'true'

    // TODO: Validate user authentication and manager/admin role permissions
    const expiryResult = await backgroundCheckService.getExpiringBackgroundChecks(daysAhead)
    
    if (!expiryResult.success) {
      return NextResponse.json({ error: expiryResult.error }, { status: 500 })
    }

    const response: any = {
      data: {
        expiryAlerts: expiryResult.data,
        daysAhead,
        alertCount: expiryResult.data.length
      }
    }

    // Include metrics if requested
    if (includeMetrics) {
      const metricsResult = await backgroundCheckService.getBackgroundCheckMetrics()
      if (metricsResult.success) {
        response.data.metrics = metricsResult.data
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Background check expiry GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, applicationId, daysAhead } = body

    // TODO: Validate user authentication and manager/admin role permissions

    switch (action) {
      case 'send_reminder':
        if (!applicationId) {
          return NextResponse.json({ error: 'Application ID is required for reminder' }, { status: 400 })
        }

        // Get application data for reminder
        const backgroundResult = await backgroundCheckService.getBackgroundCheckData(applicationId)
        if (!backgroundResult.success) {
          return NextResponse.json({ error: backgroundResult.error }, { status: 500 })
        }

        // Create expiry alert object
        const alert: ExpiryReminderAlert = {
          applicationId,
          applicantName: 'Applicant', // TODO: Get from application data
          currentStatus: backgroundResult.data.status,
          expiryDate: backgroundResult.data.expiryDate!,
          daysUntilExpiry: Math.ceil(
            (backgroundResult.data.expiryDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          ),
          assignedManager: backgroundResult.data.approvedBy
        }

        const reminderResult = await notificationService.sendExpiryReminder(alert)
        
        if (reminderResult.success) {
          return NextResponse.json({ 
            data: { 
              message: 'Reminder sent successfully',
              applicationId,
              sentAt: new Date().toISOString()
            }
          })
        } else {
          return NextResponse.json({ error: reminderResult.error }, { status: 500 })
        }

      case 'bulk_reminders':
        const days = daysAhead || 7
        const expiryResult = await backgroundCheckService.getExpiringBackgroundChecks(days)
        
        if (!expiryResult.success) {
          return NextResponse.json({ error: expiryResult.error }, { status: 500 })
        }

        const reminderPromises = expiryResult.data.map(alert => 
          notificationService.sendExpiryReminder(alert)
        )
        
        const results = await Promise.allSettled(reminderPromises)
        const successCount = results.filter(result => result.status === 'fulfilled').length
        
        return NextResponse.json({
          data: {
            message: 'Bulk reminders processed',
            totalAlerts: expiryResult.data.length,
            successCount,
            failureCount: results.length - successCount
          }
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Background check expiry POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}