// Story 2.6: Calendar Broadcast Service
// Universal ICS calendar generation with RBAC-based feeds and subscription management

import { supabase } from '@/lib/supabase'
import type {
  CalendarSubscription,
  CalendarFilters,
  SubscriptionType,
  Interview,
  ServiceResult
} from '@/lib/types/interview-types'
import { generateRandomString } from '@/lib/utils'

interface ICSCalendarEvent {
  uid: string
  summary: string
  description: string
  startTime: Date
  endTime: Date
  location?: string
  status: string
  priority: number
  categories: string[]
}

export class CalendarBroadcastService {
  
  // Create a new calendar subscription with secure access token
  async createCalendarSubscription(
    userId: string, 
    subscriptionType: SubscriptionType,
    filters?: CalendarFilters
  ): Promise<ServiceResult<CalendarSubscription>> {
    try {
      // Generate secure access token
      const accessToken = generateRandomString(32)
      
      // Set expiration to 1 year from now
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      
      const { data, error } = await supabase
        .from('calendar_subscriptions')
        .insert({
          user_id: userId,
          subscription_type: subscriptionType,
          calendar_filters: filters ? JSON.stringify(filters) : null,
          access_token: accessToken,
          expires_at: expiresAt.toISOString(),
          is_active: true
        })
        .select()
        .single()
      
      if (error) {
        console.error('Calendar subscription creation error:', error)
        return { success: false, error: { code: 'CREATE_ERROR' , message: 'Failed to create calendar subscription' }}
      }
      
      const subscription: CalendarSubscription = {
        id: data.id,
        userId: data.user_id,
        subscriptionType: data.subscription_type,
        calendarFilters: data.calendar_filters ? JSON.parse(data.calendar_filters) : undefined,
        accessToken: data.access_token,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        lastAccessed: data.last_accessed ? new Date(data.last_accessed) : undefined,
        expiresAt: data.expires_at ? new Date(data.expires_at) : undefined
      }
      
      return { success: true, data: subscription }
    } catch (error) {
      console.error('Calendar subscription service error:', error)
      return { success: false, error: { code: 'INTERNAL_ERROR' , message: 'Internal server error' }}
    }
  }
  
  // Get calendar subscription by access token
  async getSubscriptionByToken(accessToken: string): Promise<ServiceResult<CalendarSubscription>> {
    try {
      const { data, error } = await supabase
        .from('calendar_subscriptions')
        .select('*')
        .eq('access_token', accessToken)
        .eq('is_active', true)
        .single()
      
      if (error) {
        console.error('Token validation error:', error)
        return { success: false, error: { code: 'INVALID_TOKEN' , message: 'Invalid or expired calendar subscription' }}
      }
      
      // Check if subscription has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { success: false, error: { code: 'EXPIRED_TOKEN' , message: 'Calendar subscription has expired' }}
      }
      
      // Update last accessed timestamp
      await supabase
        .from('calendar_subscriptions')
        .update({ last_accessed: new Date().toISOString() })
        .eq('id', data.id)
      
      const subscription: CalendarSubscription = {
        id: data.id,
        userId: data.user_id,
        subscriptionType: data.subscription_type,
        calendarFilters: data.calendar_filters ? JSON.parse(data.calendar_filters) : undefined,
        accessToken: data.access_token,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        lastAccessed: new Date(),
        expiresAt: data.expires_at ? new Date(data.expires_at) : undefined
      }
      
      return { success: true, data: subscription }
    } catch (error) {
      console.error('Token validation service error:', error)
      return { success: false, error: { code: 'INTERNAL_ERROR' , message: 'Internal server error' }}
    }
  }
  
  // Generate ICS calendar feed for a subscription
  async generateICSFeed(subscription: CalendarSubscription): Promise<ServiceResult<string>> {
    try {
      // Build filters based on subscription type and user permissions
      const filters = this.buildFiltersForSubscription(subscription)
      
      // Fetch interviews based on subscription filters
      const interviewsResult = await this.getInterviewsForSubscription(subscription, filters)
      if (!interviewsResult.success) {
        return interviewsResult
      }
      
      // Convert interviews to ICS events
      const events = interviewsResult.data.map(interview => this.convertInterviewToICSEvent(interview))
      
      // Generate ICS calendar content
      const icsContent = this.generateICSCalendarContent(events, subscription)
      
      return { success: true, data: icsContent }
    } catch (error) {
      console.error('ICS generation error:', error)
      return { success: false, error: { code: 'GENERATION_ERROR' , message: 'Failed to generate calendar feed' }}
    }
  }
  
  // Get all subscriptions for a user
  async getUserSubscriptions(userId: string): Promise<ServiceResult<CalendarSubscription[]>> {
    try {
      const { data, error } = await supabase
        .from('calendar_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('User subscriptions error:', error)
        return { success: false, error: { code: 'FETCH_ERROR' , message: 'Failed to fetch calendar subscriptions' }}
      }
      
      const subscriptions: CalendarSubscription[] = data.map(sub => ({
        id: sub.id,
        userId: sub.user_id,
        subscriptionType: sub.subscription_type,
        calendarFilters: sub.calendar_filters ? JSON.parse(sub.calendar_filters) : undefined,
        accessToken: sub.access_token,
        isActive: sub.is_active,
        createdAt: new Date(sub.created_at),
        lastAccessed: sub.last_accessed ? new Date(sub.last_accessed) : undefined,
        expiresAt: sub.expires_at ? new Date(sub.expires_at) : undefined
      }))
      
      return { success: true, data: subscriptions }
    } catch (error) {
      console.error('User subscriptions service error:', error)
      return { success: false, error: { code: 'INTERNAL_ERROR' , message: 'Internal server error' }}
    }
  }
  
  // Deactivate a calendar subscription
  async deactivateSubscription(subscriptionId: string, userId: string): Promise<ServiceResult<boolean>> {
    try {
      const { error } = await supabase
        .from('calendar_subscriptions')
        .update({ is_active: false })
        .eq('id', subscriptionId)
        .eq('user_id', userId)
      
      if (error) {
        console.error('Subscription deactivation error:', error)
        return { success: false, error: { code: 'UPDATE_ERROR' , message: 'Failed to deactivate subscription' }}
      }
      
      return { success: true, data: true }
    } catch (error) {
      console.error('Deactivation service error:', error)
      return { success: false, error: { code: 'INTERNAL_ERROR' , message: 'Internal server error' }}
    }
  }
  
  // Update calendar subscription filters
  async updateSubscriptionFilters(
    subscriptionId: string, 
    userId: string, 
    filters: CalendarFilters
  ): Promise<ServiceResult<CalendarSubscription>> {
    try {
      const { data, error } = await supabase
        .from('calendar_subscriptions')
        .update({ calendar_filters: JSON.stringify(filters) })
        .eq('id', subscriptionId)
        .eq('user_id', userId)
        .select()
        .single()
      
      if (error) {
        console.error('Filter update error:', error)
        return { success: false, error: { code: 'UPDATE_ERROR' , message: 'Failed to update subscription filters' }}
      }
      
      const subscription: CalendarSubscription = {
        id: data.id,
        userId: data.user_id,
        subscriptionType: data.subscription_type,
        calendarFilters: data.calendar_filters ? JSON.parse(data.calendar_filters) : undefined,
        accessToken: data.access_token,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        lastAccessed: data.last_accessed ? new Date(data.last_accessed) : undefined,
        expiresAt: data.expires_at ? new Date(data.expires_at) : undefined
      }
      
      return { success: true, data: subscription }
    } catch (error) {
      console.error('Filter update service error:', error)
      return { success: false, error: { code: 'INTERNAL_ERROR' , message: 'Internal server error' }}
    }
  }
  
  // Build appropriate filters based on subscription type and RBAC
  private buildFiltersForSubscription(subscription: CalendarSubscription): CalendarFilters {
    const baseFilters = subscription.calendarFilters || {}
    
    switch (subscription.subscriptionType) {
      case 'guard_personal':
        // Guards can only see their own interviews as applicants
        return {
          ...baseFilters,
          guardIds: [subscription.userId] // Assuming guard user ID maps to application
        }
      
      case 'manager_team':
        // Managers see interviews they are conducting or assigned to their team
        return {
          ...baseFilters,
          interviewerIds: [subscription.userId]
        }
      
      case 'manager_all':
        // Admin managers see all interviews (no additional filters)
        return baseFilters
      
      default:
        return baseFilters
    }
  }
  
  // Get interviews for a specific subscription with RBAC
  private async getInterviewsForSubscription(
    subscription: CalendarSubscription, 
    filters: CalendarFilters
  ): Promise<ServiceResult<Interview[]>> {
    try {
      let query = supabase.from('interviews').select(`
        *,
        guard_leads (
          id,
          first_name,
          last_name,
          email
        )
      `)
      
      // Apply RBAC-based filters
      if (filters.guardIds?.length) {
        query = query.in('application_id', filters.guardIds)
      }
      
      if (filters.interviewerIds?.length) {
        query = query.in('interviewer_id', filters.interviewerIds)
      }
      
      if (filters.interviewTypes?.length) {
        query = query.in('interview_type', filters.interviewTypes)
      }
      
      if (filters.status?.length) {
        query = query.in('status', filters.status)
      }
      
      // Default to upcoming interviews (next 90 days)
      const now = new Date()
      const futureDate = new Date()
      futureDate.setDate(now.getDate() + 90)
      
      if (filters.dateRange) {
        query = query.gte('scheduled_at', filters.dateRange.startDate.toISOString())
                   .lte('scheduled_at', filters.dateRange.endDate.toISOString())
      } else {
        query = query.gte('scheduled_at', now.toISOString())
                   .lte('scheduled_at', futureDate.toISOString())
      }
      
      const { data, error } = await query.order('scheduled_at', { ascending: true })
      
      if (error) {
        console.error('Interview fetch error:', error)
        return { success: false, error: { code: 'FETCH_ERROR' , message: 'Failed to fetch interviews' }}
      }
      
      const interviews: Interview[] = data.map(item => ({
        id: item.id,
        applicationId: item.application_id,
        interviewType: item.interview_type,
        scheduledAt: new Date(item.scheduled_at),
        durationMinutes: item.duration_minutes,
        interviewLocation: item.interview_location,
        interviewMode: item.interview_mode,
        interviewerId: item.interviewer_id,
        status: item.status,
        meetingNotes: item.meeting_notes,
        overallRating: item.overall_rating,
        hiringRecommendation: item.hiring_recommendation,
        decisionRationale: item.decision_rationale,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        cancelledAt: item.cancelled_at ? new Date(item.cancelled_at) : undefined,
        cancellationReason: item.cancellation_reason,
        icsUid: item.ics_uid,
        lastIcsBroadcast: item.last_ics_broadcast ? new Date(item.last_ics_broadcast) : undefined
      }))
      
      return { success: true, data: interviews }
    } catch (error) {
      console.error('Subscription interviews service error:', error)
      return { success: false, error: { code: 'INTERNAL_ERROR' , message: 'Internal server error' }}
    }
  }
  
  // Convert interview to ICS calendar event
  private convertInterviewToICSEvent(interview: Interview): ICSCalendarEvent {
    const endTime = new Date(interview.scheduledAt)
    endTime.setMinutes(endTime.getMinutes() + interview.durationMinutes)
    
    const statusMap = {
      'scheduled': 'CONFIRMED',
      'confirmed': 'CONFIRMED', 
      'in_progress': 'CONFIRMED',
      'completed': 'CONFIRMED',
      'cancelled': 'CANCELLED',
      'no_show': 'CANCELLED',
      'rescheduled': 'CONFIRMED'
    }
    
    return {
      uid: interview.icsUid || `SA-INTERVIEW-${interview.id}`,
      summary: `${interview.interviewType.replace('_', ' ').toUpperCase()} Interview - Summit Advisory`,
      description: `Security Guard Interview\n\nType: ${interview.interviewType.replace('_', ' ')}\nMode: ${interview.interviewMode.replace('_', ' ')}\nDuration: ${interview.durationMinutes} minutes${interview.meetingNotes ? `\n\nNotes: ${interview.meetingNotes}` : ''}`,
      startTime: interview.scheduledAt,
      endTime: endTime,
      location: interview.interviewLocation,
      status: statusMap[interview.status] || 'CONFIRMED',
      priority: interview.interviewType === 'final' ? 9 : interview.interviewType === 'initial' ? 3 : 5,
      categories: ['INTERVIEW', 'SUMMIT_ADVISORY', interview.interviewType.toUpperCase()]
    }
  }
  
  // Generate complete ICS calendar content
  private generateICSCalendarContent(events: ICSCalendarEvent[], subscription: CalendarSubscription): string {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }
    
    const calendarName = subscription.subscriptionType === 'guard_personal' 
      ? 'My Interview Schedule - Summit Advisory'
      : subscription.subscriptionType === 'manager_team'
      ? 'Team Interview Schedule - Summit Advisory' 
      : 'All Interviews - Summit Advisory'
    
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Summit Advisory//Guard Management Platform//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${calendarName}
X-WR-CALDESC:Summit Advisory Guard Interview Schedule
X-WR-TIMEZONE:America/Chicago
REFRESH-INTERVAL;VALUE=DURATION:PT1H
X-PUBLISHED-TTL:PT1H
`
    
    // Add timezone information
    icsContent += `BEGIN:VTIMEZONE
TZID:America/Chicago
BEGIN:DAYLIGHT
DTSTART:20210314T080000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
TZNAME:CDT
TZOFFSETFROM:-0600
TZOFFSETTO:-0500
END:DAYLIGHT
BEGIN:STANDARD
DTSTART:20211107T070000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
TZNAME:CST
TZOFFSETFROM:-0500
TZOFFSETTO:-0600
END:STANDARD
END:VTIMEZONE
`
    
    // Add events
    events.forEach(event => {
      icsContent += `BEGIN:VEVENT
UID:${event.uid}
DTSTART:${formatDate(event.startTime)}
DTEND:${formatDate(event.endTime)}
SUMMARY:${event.summary}
DESCRIPTION:${event.description.replace(/\n/g, '\\n')}
${event.location ? `LOCATION:${event.location}` : ''}
STATUS:${event.status}
PRIORITY:${event.priority}
CATEGORIES:${event.categories.join(',')}
CLASS:PRIVATE
TRANSP:OPAQUE
SEQUENCE:0
CREATED:${formatDate(new Date())}
LAST-MODIFIED:${formatDate(new Date())}
BEGIN:VALARM
TRIGGER:-PT2H
ACTION:DISPLAY
DESCRIPTION:Interview in 2 hours: ${event.summary}
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1D
ACTION:DISPLAY
DESCRIPTION:Interview tomorrow: ${event.summary}
END:VALARM
END:VEVENT
`
    })
    
    icsContent += `END:VCALENDAR`
    
    return icsContent
  }
  
  // Generate public calendar feed URL
  generateCalendarFeedURL(accessToken: string, baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'): string {
    return `${baseUrl}/api/v1/calendar/feed/${accessToken}.ics`
  }
  
  // Generate subscription management URL
  generateSubscriptionManagementURL(userId: string, baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'): string {
    return `${baseUrl}/dashboard/calendar-subscriptions`
  }
}