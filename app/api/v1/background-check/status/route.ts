import { NextRequest, NextResponse } from 'next/server'
import { BackgroundCheckService } from '@/lib/services/background-check-service'
import { BackgroundCheckNotificationService } from '@/lib/services/background-check-notification-service'
import type { BackgroundCheckUpdate } from '@/lib/types/background-check'

const backgroundCheckService = new BackgroundCheckService()
const notificationService = new BackgroundCheckNotificationService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('applicationId')

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 })
    }

    // TODO: Validate user authentication and permissions
    const result = await backgroundCheckService.getBackgroundCheckData(applicationId)
    
    if (result.success) {
      return NextResponse.json({ data: result.data })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error('Background check status GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicationId, update, userId } = body as {
      applicationId: string
      update: BackgroundCheckUpdate
      userId: string
    }

    if (!applicationId || !update || !userId) {
      return NextResponse.json({ 
        error: 'Missing required fields: applicationId, update, userId' 
      }, { status: 400 })
    }

    // TODO: Validate user authentication and manager/admin role
    const result = await backgroundCheckService.updateStatus(applicationId, update, userId)
    
    if (result.success) {
      // Send notifications
      try {
        await notificationService.sendStatusChangeNotification({
          applicantName: 'Applicant', // TODO: Get from application data
          applicationId,
          newStatus: update.status,
          managerName: 'Manager', // TODO: Get from auth context
          vendorConfirmation: update.vendorConfirmationNumber,
          expiryDate: update.expiryDate,
          notes: update.notes
        })
      } catch (notificationError) {
        console.error('Failed to send notifications:', notificationError)
        // Don't fail the request if notifications fail
      }

      return NextResponse.json({ data: result.data })
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
  } catch (error) {
    console.error('Background check status POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicationId, update, userId } = body as {
      applicationId: string
      update: BackgroundCheckUpdate
      userId: string
    }

    // Same logic as POST for status updates
    return await POST(request)
  } catch (error) {
    console.error('Background check status PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}