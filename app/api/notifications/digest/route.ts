import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification-service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const frequency = searchParams.get('frequency') as 'daily' | 'weekly' || 'daily'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Calculate date range based on frequency if not provided
    let start: Date
    let end: Date = new Date()

    if (startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
    } else {
      const now = new Date()
      if (frequency === 'daily') {
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago
      } else {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      }
    }

    const notificationService = NotificationService.getInstance()
    const result = await notificationService.createNotificationDigest(userId, start, end, frequency)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      digest: result.data,
      success: true 
    })

  } catch (error) {
    console.error('Error creating notification digest:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, frequency, recipients } = body

    if (!userId || !frequency) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, frequency' },
        { status: 400 }
      )
    }

    // Calculate date range based on frequency
    const end = new Date()
    const start = frequency === 'daily' 
      ? new Date(end.getTime() - 24 * 60 * 60 * 1000)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)

    const notificationService = NotificationService.getInstance()
    const result = await notificationService.createNotificationDigest(userId, start, end, frequency)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    const digest = result.data!

    // In a full implementation, this would send the digest via email
    // For now, we'll just return the digest data
    console.log('Digest would be sent to:', recipients || [userId])
    console.log('Digest summary:', {
      recipientId: digest.recipientId,
      notificationCount: digest.notifications.length,
      period: digest.period,
      deliverySchedule: digest.deliverySchedule
    })

    return NextResponse.json({ 
      digest,
      message: 'Digest created and would be sent to recipients',
      success: true 
    }, { status: 201 })

  } catch (error) {
    console.error('Error sending notification digest:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}