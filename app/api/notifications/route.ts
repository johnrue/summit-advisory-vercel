import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification-service'
import { CreateNotificationData } from '@/lib/types'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const notificationService = NotificationService.getInstance()
    // Build filter object more robustly
    const filter: any = {
      limit,
      offset
    }

    if (unreadOnly) {
      filter.is_read = false
    }

    if (priority && ['low', 'normal', 'high', 'critical'].includes(priority)) {
      filter.priority = [priority]
    }

    if (category && ['scheduling', 'compliance', 'hiring', 'emergency', 'system'].includes(category)) {
      filter.category = [category]
    }

    const result = await notificationService.getNotifications(userId, filter)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      notifications: result.data,
      success: true 
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const notificationData: CreateNotificationData = {
      recipientId: body.recipientId,
      senderId: body.senderId,
      type: body.type,
      title: body.title,
      message: body.message,
      priority: body.priority,
      category: body.category,
      channels: body.channels,
      actionData: body.actionData,
      entityType: body.entityType,
      entityId: body.entityId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined
    }

    // Validate required fields
    if (!notificationData.recipientId || !notificationData.type || !notificationData.title || !notificationData.message) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientId, type, title, message' },
        { status: 400 }
      )
    }

    const notificationService = NotificationService.getInstance()
    const result = await notificationService.sendWithPreferences(notificationData)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      notification: result.data,
      success: true 
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationId, action, userId } = body

    if (!notificationId || !action || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: notificationId, action, userId' },
        { status: 400 }
      )
    }

    const notificationService = NotificationService.getInstance()
    let result

    switch (action) {
      case 'read':
        result = await notificationService.markAsRead(notificationId)
        break
      case 'acknowledge':
        result = await notificationService.acknowledgeNotification(notificationId)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: read, acknowledge' },
          { status: 400 }
        )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      notification: result.data,
      success: true 
    })

  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}