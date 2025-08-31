import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/services/notification-service'
import { NotificationPreferences } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const notificationService = NotificationService.getInstance()
    const preferences = await notificationService.getUserPreferences(userId)

    return NextResponse.json({ 
      preferences,
      success: true 
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
    const { userId, preferences } = body

    if (!userId || !preferences) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, preferences' },
        { status: 400 }
      )
    }

    // Validate preference values
    const validatedPreferences: Partial<NotificationPreferences> = {}

    // Boolean preferences
    const booleanFields = [
      'inAppNotifications',
      'emailNotifications', 
      'smsNotifications',
      'scheduleNotifications',
      'availabilityNotifications',
      'assignmentNotifications',
      'systemNotifications',
      'complianceNotifications',
      'emergencyNotifications',
      'weekendNotifications',
      'emailDigestEnabled'
    ]

    booleanFields.forEach(field => {
      if (field in preferences && typeof preferences[field] === 'boolean') {
        (validatedPreferences as any)[field] = preferences[field]
      }
    })

    // Enum preferences
    const validFrequencies = ['immediate', 'hourly', 'daily', 'weekly', 'disabled']
    const validPriorities = ['low', 'normal', 'high', 'critical']

    if (preferences.notificationFrequency && validFrequencies.includes(preferences.notificationFrequency)) {
      validatedPreferences.notificationFrequency = preferences.notificationFrequency
    }

    if (preferences.emailDigestFrequency && validFrequencies.includes(preferences.emailDigestFrequency)) {
      validatedPreferences.emailDigestFrequency = preferences.emailDigestFrequency
    }

    if (preferences.minimumPriority && validPriorities.includes(preferences.minimumPriority)) {
      validatedPreferences.minimumPriority = preferences.minimumPriority
    }

    // Time preferences (validate HH:MM format)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/

    if (preferences.quietHoursStart && timeRegex.test(preferences.quietHoursStart)) {
      validatedPreferences.quietHoursStart = preferences.quietHoursStart
    }

    if (preferences.quietHoursEnd && timeRegex.test(preferences.quietHoursEnd)) {
      validatedPreferences.quietHoursEnd = preferences.quietHoursEnd
    }

    const notificationService = NotificationService.getInstance()
    const result = await notificationService.updateUserPreferences(userId, validatedPreferences)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      preferences: result.data,
      success: true 
    })

  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}