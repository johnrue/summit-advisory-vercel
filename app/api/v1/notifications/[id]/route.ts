import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification-service'

const notificationService = NotificationService.getInstance()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    
    if (body.action === 'mark_read') {
      const result = await notificationService.markAsRead(id)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    }
    
    if (body.action === 'acknowledge') {
      const result = await notificationService.acknowledgeNotification(id)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: mark_read, acknowledge' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}