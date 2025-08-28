import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification-service'

const notificationService = NotificationService.getInstance()

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    
    // TODO: Get user ID from auth context/JWT token
    const userId = body.userId || 'current-user-id'
    
    if (body.action === 'mark_all_read') {
      const result = await notificationService.markAllAsRead(userId)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          marked_count: result.data,
          message: `${result.data} notifications marked as read`
        }
      })
    }

    if (body.action === 'cleanup_expired') {
      const result = await notificationService.cleanupExpiredNotifications()
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          deleted_count: result.data,
          message: `${result.data} expired notifications cleaned up`
        }
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: mark_all_read, cleanup_expired' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error processing bulk notification action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}