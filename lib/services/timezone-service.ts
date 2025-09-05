/**
 * Timezone Service
 * Handles timezone detection, conversion, and display for calendar events
 */

import { format, fromZonedTime, toZonedTime } from 'date-fns-tz'
import { addDays, subDays, isAfter, isBefore, parseISO } from 'date-fns'

export interface TimezoneInfo {
  timezone: string
  offset: string
  abbreviation: string
  isDst: boolean
  utcOffset: number
  displayName: string
}

export interface TimeConversion {
  utc: Date
  local: Date
  timezone: string
  formatted: string
  offsetInfo: {
    hours: number
    minutes: number
    sign: '+' | '-'
  }
}

export interface DstTransition {
  date: Date
  type: 'spring_forward' | 'fall_back'
  oldOffset: number
  newOffset: number
  timezone: string
}

class TimezoneService {
  private readonly commonTimezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)', region: 'North America' },
    { value: 'America/Chicago', label: 'Central Time (CT)', region: 'North America' },
    { value: 'America/Denver', label: 'Mountain Time (MT)', region: 'North America' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', region: 'North America' },
    { value: 'America/Phoenix', label: 'Arizona Time (MST)', region: 'North America' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKST)', region: 'North America' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)', region: 'Pacific' },
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)', region: 'Universal' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)', region: 'Europe' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)', region: 'Europe' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', region: 'Asia' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEST)', region: 'Australia' }
  ]

  // Detect user's timezone
  detectUserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch (error) {
      return 'UTC'
    }
  }

  // Get timezone information
  getTimezoneInfo(timezone: string, date: Date = new Date()): TimezoneInfo {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short'
      })

      const parts = formatter.formatToParts(date)
      const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || ''

      // Calculate offset
      const utcDate = new Date(date.toISOString())
      const zonedDate = toZonedTime(utcDate, timezone)
      const offsetMs = zonedDate.getTime() - utcDate.getTime()
      const offsetHours = offsetMs / (1000 * 60 * 60)

      // Determine if DST is active
      const january = new Date(date.getFullYear(), 0, 1)
      const july = new Date(date.getFullYear(), 6, 1)
      const januaryOffset = this.getTimezoneOffset(timezone, january)
      const julyOffset = this.getTimezoneOffset(timezone, july)
      const isDst = offsetHours !== Math.max(januaryOffset, julyOffset)

      // Format offset string
      const offsetSign = offsetHours >= 0 ? '+' : '-'
      const offsetHoursAbs = Math.abs(Math.floor(offsetHours))
      const offsetMinutes = Math.abs((offsetHours % 1) * 60)
      const offsetString = `${offsetSign}${offsetHoursAbs.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`

      // Get display name
      const displayName = this.commonTimezones.find(tz => tz.value === timezone)?.label || timezone

      return {
        timezone,
        offset: offsetString,
        abbreviation: timeZoneName,
        isDst,
        utcOffset: offsetHours,
        displayName
      }

    } catch (error) {
      return {
        timezone: 'UTC',
        offset: '+00:00',
        abbreviation: 'UTC',
        isDst: false,
        utcOffset: 0,
        displayName: 'Coordinated Universal Time (UTC)'
      }
    }
  }

  // Convert time between timezones
  convertTime(
    date: Date, 
    fromTimezone: string, 
    toTimezone: string
  ): TimeConversion {
    try {
      // Convert to UTC first
      const utcDate = fromTimezone === 'UTC' ? date : fromZonedTime(date, fromTimezone)
      
      // Convert to target timezone
      const localDate = toTimezone === 'UTC' ? utcDate : toZonedTime(utcDate, toTimezone)
      
      // Format the time
      const formatted = this.formatTime(localDate, toTimezone)
      
      // Calculate offset info
      const offsetInfo = this.getOffsetInfo(toTimezone, localDate)

      return {
        utc: utcDate,
        local: localDate,
        timezone: toTimezone,
        formatted,
        offsetInfo
      }

    } catch (error) {
      
      // Fallback to UTC
      return {
        utc: date,
        local: date,
        timezone: 'UTC',
        formatted: this.formatTime(date, 'UTC'),
        offsetInfo: { hours: 0, minutes: 0, sign: '+' }
      }
    }
  }

  // Format time for display
  formatTime(
    date: Date, 
    timezone: string, 
    formatOptions?: Intl.DateTimeFormatOptions
  ): string {
    try {
      const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
        timeZoneName: 'short'
      }

      const options = { ...defaultOptions, ...formatOptions }
      
      return new Intl.DateTimeFormat('en-US', options).format(date)

    } catch (error) {
      return date.toISOString()
    }
  }

  // Convert UTC to user's preferred timezone
  toUserTime(utcDate: Date, userTimezone: string): TimeConversion {
    return this.convertTime(utcDate, 'UTC', userTimezone)
  }

  // Convert user time to UTC for storage
  toUtcTime(localDate: Date, userTimezone: string): TimeConversion {
    return this.convertTime(localDate, userTimezone, 'UTC')
  }

  // Check for DST transitions
  getDstTransitions(timezone: string, year: number): DstTransition[] {
    try {
      const transitions: DstTransition[] = []
      
      // Check each month for DST transitions
      for (let month = 0; month < 12; month++) {
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        
        const firstOffset = this.getTimezoneOffset(timezone, firstDay)
        const lastOffset = this.getTimezoneOffset(timezone, lastDay)
        
        if (firstOffset !== lastOffset) {
          // Find exact transition date
          const transitionDate = this.findTransitionDate(timezone, firstDay, lastDay)
          
          if (transitionDate) {
            transitions.push({
              date: transitionDate,
              type: firstOffset < lastOffset ? 'spring_forward' : 'fall_back',
              oldOffset: firstOffset,
              newOffset: lastOffset,
              timezone
            })
          }
        }
      }
      
      return transitions

    } catch (error) {
      return []
    }
  }

  // Handle calendar event timezone conflicts
  detectTimezoneConflicts(
    events: Array<{ start: Date; end: Date; timezone: string }>,
    userTimezone: string
  ): Array<{
    eventIndex: number
    issue: 'dst_transition' | 'timezone_mismatch' | 'invalid_time'
    description: string
    suggestion: string
  }> {
    const conflicts: Array<{
      eventIndex: number
      issue: 'dst_transition' | 'timezone_mismatch' | 'invalid_time'
      description: string
      suggestion: string
    }> = []

    events.forEach((event, index) => {
      // Check for invalid times during DST transitions
      const dstTransitions = this.getDstTransitions(event.timezone, event.start.getFullYear())
      
      for (const transition of dstTransitions) {
        if (transition.type === 'spring_forward') {
          // Check if event falls in the "lost hour"
          const transitionStart = transition.date
          const transitionEnd = addDays(transition.date, 1)
          
          if (isAfter(event.start, transitionStart) && isBefore(event.start, transitionEnd)) {
            conflicts.push({
              eventIndex: index,
              issue: 'dst_transition',
              description: 'Event occurs during DST transition (spring forward)',
              suggestion: 'Adjust event time to avoid the lost hour'
            })
          }
        }
      }

      // Check for timezone mismatches
      if (event.timezone !== userTimezone) {
        const userTime = this.toUserTime(event.start, userTimezone)
        const eventTime = this.formatTime(event.start, event.timezone)
        
        conflicts.push({
          eventIndex: index,
          issue: 'timezone_mismatch',
          description: `Event is in ${event.timezone} (${eventTime}), your timezone is ${userTimezone} (${userTime.formatted})`,
          suggestion: 'Verify the event timezone is correct'
        })
      }
    })

    return conflicts
  }

  // Get all available timezones grouped by region
  getAvailableTimezones(): Array<{ region: string; timezones: Array<{ value: string; label: string; offset: string }> }> {
    const regions = new Map<string, Array<{ value: string; label: string; offset: string }>>()
    
    this.commonTimezones.forEach(tz => {
      const info = this.getTimezoneInfo(tz.value)
      
      if (!regions.has(tz.region)) {
        regions.set(tz.region, [])
      }
      
      regions.get(tz.region)!.push({
        value: tz.value,
        label: tz.label,
        offset: info.offset
      })
    })

    return Array.from(regions.entries()).map(([region, timezones]) => ({
      region,
      timezones: timezones.sort((a, b) => a.label.localeCompare(b.label))
    }))
  }

  // Validate timezone string
  isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone })
      return true
    } catch {
      return false
    }
  }

  // Get user-friendly timezone description
  getTimezoneDescription(timezone: string): string {
    const info = this.getTimezoneInfo(timezone)
    return `${info.displayName} (${info.offset} ${info.abbreviation})`
  }

  // Helper methods
  private getTimezoneOffset(timezone: string, date: Date): number {
    try {
      const utcDate = new Date(date.toISOString())
      const zonedDate = toZonedTime(utcDate, timezone)
      return (zonedDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60)
    } catch {
      return 0
    }
  }

  private getOffsetInfo(timezone: string, date: Date): { hours: number; minutes: number; sign: '+' | '-' } {
    const offset = this.getTimezoneOffset(timezone, date)
    const sign = offset >= 0 ? '+' : '-'
    const absOffset = Math.abs(offset)
    const hours = Math.floor(absOffset)
    const minutes = (absOffset % 1) * 60

    return { hours, minutes, sign }
  }

  private findTransitionDate(timezone: string, start: Date, end: Date): Date | null {
    try {
      const maxIterations = 31 // Max days in a month
      let current = start
      let iterations = 0
      
      const startOffset = this.getTimezoneOffset(timezone, start)
      
      while (current <= end && iterations < maxIterations) {
        const currentOffset = this.getTimezoneOffset(timezone, current)
        
        if (currentOffset !== startOffset) {
          return current
        }
        
        current = addDays(current, 1)
        iterations++
      }
      
      return null
    } catch {
      return null
    }
  }
}

export const timezoneService = new TimezoneService()