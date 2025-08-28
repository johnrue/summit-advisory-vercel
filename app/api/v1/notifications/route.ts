import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification-service'
import type { CreateNotificationRequest, NotificationFilter } from '@/lib/types/notification-types'

const notificationService = NotificationService.getInstance()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // TODO: Get user ID from auth context/JWT token
    const userId = searchParams.get('userId') || 'current-user-id'
    
    // Parse filter parameters
    const filter: NotificationFilter = {
      category: searchParams.get('category')?.split(',') as any || undefined,
      priority: searchParams.get('priority')?.split(',') as any || undefined,
      is_read: searchParams.get('is_read') ? searchParams.get('is_read') === 'true' : undefined,
      from_date: searchParams.get('from_date') || undefined,
      to_date: searchParams.get('to_date') || undefined,
      entity_type: searchParams.get('entity_type') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0')
    }

    const result = await notificationService.getNotifications(userId, filter)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        limit: filter.limit,
        offset: filter.offset,
        total: result.data.length
      }
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
    const body: CreateNotificationRequest = await request.json()
    
    // Validate required fields
    if (!body.recipient_id || !body.title || !body.message || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields: recipient_id, title, message, category' },
        { status: 400 }
      )
    }

    const result = await notificationService.createNotification(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}