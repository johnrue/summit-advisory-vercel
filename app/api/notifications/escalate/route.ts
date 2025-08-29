import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      originalNotificationId, 
      recipientId, 
      escalationLevel, 
      reason, 
      escalatedTo 
    } = body

    if (!originalNotificationId || !recipientId || !escalationLevel || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: originalNotificationId, recipientId, escalationLevel, reason' },
        { status: 400 }
      )
    }

    // Validate escalation level
    if (typeof escalationLevel !== 'number' || escalationLevel < 1 || escalationLevel > 5) {
      return NextResponse.json(
        { error: 'Escalation level must be a number between 1 and 5' },
        { status: 400 }
      )
    }

    const notificationService = NotificationService.getInstance()
    const result = await notificationService.createEscalation(
      originalNotificationId,
      recipientId,
      escalationLevel,
      reason,
      escalatedTo
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      escalation: result.data,
      success: true 
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating escalation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}