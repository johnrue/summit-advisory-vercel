// Story 2.6: Calendar Subscriptions API
// CRUD operations for managing calendar subscriptions with RBAC

import { NextRequest, NextResponse } from 'next/server'
import { CalendarBroadcastService } from '@/lib/services/calendar-broadcast-service'
import type { SubscriptionType, CalendarFilters } from '@/lib/types/interview-types'

const calendarService = new CalendarBroadcastService()

// Helper function to extract user ID from request (would integrate with actual auth)
function getCurrentUserId(request: NextRequest): string | null {
  // In a real implementation, this would extract user ID from JWT or session
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  
  // Mock implementation - in reality would validate JWT
  return 'current-user-id'
}

// GET /api/v1/calendar/subscriptions - Get all subscriptions for current user
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = getCurrentUserId(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const result = await calendarService.getUserSubscriptions(userId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
    
    // Generate feed URLs for each subscription
    const subscriptionsWithUrls = result.data.map(subscription => ({
      ...subscription,
      feedUrl: calendarService.generateCalendarFeedURL(subscription.accessToken),
      managementUrl: calendarService.generateSubscriptionManagementURL(userId)
    }))
    
    return NextResponse.json({
      success: true,
      data: subscriptionsWithUrls
    })
    
  } catch (error) {
    console.error('Get subscriptions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/v1/calendar/subscriptions - Create new calendar subscription
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = getCurrentUserId(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { subscriptionType, filters }: { 
      subscriptionType: SubscriptionType
      filters?: CalendarFilters 
    } = body
    
    // Validate subscription type
    const validTypes: SubscriptionType[] = ['guard_personal', 'manager_team', 'manager_all']
    if (!validTypes.includes(subscriptionType)) {
      return NextResponse.json(
        { error: 'Invalid subscription type' },
        { status: 400 }
      )
    }
    
    // TODO: Add role-based validation
    // - Guards can only create 'guard_personal' subscriptions
    // - Managers can create 'manager_team' subscriptions  
    // - Admins can create any subscription type
    
    const result = await calendarService.createCalendarSubscription(
      userId,
      subscriptionType,
      filters
    )
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
    
    // Add feed URL to response
    const subscriptionWithUrl = {
      ...result.data,
      feedUrl: calendarService.generateCalendarFeedURL(result.data.accessToken),
      managementUrl: calendarService.generateSubscriptionManagementURL(userId)
    }
    
    return NextResponse.json({
      success: true,
      data: subscriptionWithUrl
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create subscription API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/v1/calendar/subscriptions/[id] - Update subscription filters
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = getCurrentUserId(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const url = new URL(request.url)
    const subscriptionId = url.pathname.split('/').pop()
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscription ID' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { filters }: { filters: CalendarFilters } = body
    
    const result = await calendarService.updateSubscriptionFilters(
      subscriptionId,
      userId,
      filters
    )
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.code === 'UPDATE_ERROR' ? 404 : 500 }
      )
    }
    
    // Add feed URL to response
    const subscriptionWithUrl = {
      ...result.data,
      feedUrl: calendarService.generateCalendarFeedURL(result.data.accessToken)
    }
    
    return NextResponse.json({
      success: true,
      data: subscriptionWithUrl
    })
    
  } catch (error) {
    console.error('Update subscription API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/calendar/subscriptions/[id] - Deactivate subscription
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = getCurrentUserId(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const url = new URL(request.url)
    const subscriptionId = url.pathname.split('/').pop()
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscription ID' },
        { status: 400 }
      )
    }
    
    const result = await calendarService.deactivateSubscription(subscriptionId, userId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.code === 'UPDATE_ERROR' ? 404 : 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: { message: 'Calendar subscription deactivated successfully' }
    })
    
  } catch (error) {
    console.error('Delete subscription API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}