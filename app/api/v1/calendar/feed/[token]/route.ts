// Story 2.6: ICS Calendar Feed API Endpoint
// Public endpoint for accessing ICS calendar feeds with RBAC-based token authentication

import { NextRequest, NextResponse } from 'next/server'
import { CalendarBroadcastService } from '@/lib/services/calendar-broadcast-service'

const calendarService = new CalendarBroadcastService()

// GET /api/v1/calendar/feed/[token].ics - Serve ICS calendar feed
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
): Promise<NextResponse> {
  try {
    // Extract token from filename (remove .ics extension)
    const accessToken = params.token.replace('.ics', '')
    
    if (!accessToken) {
      return new NextResponse('Missing access token', { 
        status: 400,
        headers: {
          'Content-Type': 'text/plain',
        }
      })
    }
    
    // Validate access token and get subscription
    const subscriptionResult = await calendarService.getSubscriptionByToken(accessToken)
    
    if (!subscriptionResult.success) {
      const statusCode = subscriptionResult.code === 'INVALID_TOKEN' || subscriptionResult.code === 'EXPIRED_TOKEN' ? 401 : 500
      
      return new NextResponse(subscriptionResult.error, {
        status: statusCode,
        headers: {
          'Content-Type': 'text/plain',
        }
      })
    }
    
    // Generate ICS calendar feed
    const icsResult = await calendarService.generateICSFeed(subscriptionResult.data)
    
    if (!icsResult.success) {
      console.error('ICS generation failed:', icsResult.error)
      return new NextResponse('Failed to generate calendar feed', {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
        }
      })
    }
    
    // Set appropriate cache headers for calendar feeds
    const headers = new Headers({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="summit-advisory-interviews.ics"',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'X-Robots-Tag': 'noindex, nofollow, nosnippet, noarchive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    })
    
    return new NextResponse(icsResult.data, {
      status: 200,
      headers
    })
    
  } catch (error) {
    console.error('Calendar feed API error:', error)
    return new NextResponse('Internal server error', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      }
    })
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // 24 hours
    }
  })
}