import { NextRequest, NextResponse } from 'next/server'
import { NotificationPreferencesService } from '@/lib/services/notification-preferences-service'
import type { UpdatePreferencesRequest } from '@/lib/services/notification-preferences-service'

const preferencesService = NotificationPreferencesService.getInstance()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // TODO: Get user ID from auth context/JWT token
    const userId = searchParams.get('userId') || 'current-user-id'

    const result = await preferencesService.getPreferences(userId)
    
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
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // TODO: Get user ID from auth context/JWT token
    const userId = body.userId || 'current-user-id'
    
    // Remove userId from updates to prevent conflicts
    const { userId: _, ...updates } = body

    const result = await preferencesService.updatePreferences(userId, updates as UpdatePreferencesRequest)
    
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
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // TODO: Get user ID from auth context/JWT token
    const userId = body.userId || 'current-user-id'
    
    if (body.action === 'test_notification') {
      const { deliveryChannel } = body
      
      if (!deliveryChannel || !['in_app', 'email', 'sms'].includes(deliveryChannel)) {
        return NextResponse.json(
          { error: 'Invalid delivery channel. Must be: in_app, email, or sms' },
          { status: 400 }
        )
      }

      const result = await preferencesService.testNotificationDelivery(userId, deliveryChannel)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          message: `Test ${deliveryChannel} notification sent successfully`
        }
      })
    }

    if (body.action === 'reset_defaults') {
      const result = await preferencesService.resetToDefaults(userId)
      
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

    if (body.action === 'export') {
      const result = await preferencesService.exportPreferences(userId)
      
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

    if (body.action === 'import') {
      const { preferences } = body
      
      if (!preferences) {
        return NextResponse.json(
          { error: 'Preferences data is required for import' },
          { status: 400 }
        )
      }

      const result = await preferencesService.importPreferences(userId, preferences)
      
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
      { error: 'Invalid action. Supported actions: test_notification, reset_defaults, export, import' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error processing preferences action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}