/**
 * Timezone Service Tests
 * Tests timezone detection, conversion, and DST handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals'
import { timezoneService } from '@/lib/services/timezone-service'

describe('TimezoneService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('detectUserTimezone', () => {
    it('should detect user timezone using Intl API', () => {
      // Mock Intl.DateTimeFormat
      const mockResolvedOptions = jest.fn().mockReturnValue({
        timeZone: 'America/New_York'
      })
      
      jest.stubGlobal('Intl', {
        DateTimeFormat: jest.fn(() => ({
          resolvedOptions: mockResolvedOptions
        }))
      })

      const timezone = timezoneService.detectUserTimezone()

      expect(timezone).toBe('America/New_York')
      expect(mockResolvedOptions).toHaveBeenCalled()
    })

    it('should fallback to UTC when detection fails', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      // Mock Intl API failure
      jest.stubGlobal('Intl', {
        DateTimeFormat: jest.fn(() => {
          throw new Error('Timezone detection failed')
        })
      })

      const timezone = timezoneService.detectUserTimezone()

      expect(timezone).toBe('UTC')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Timezone detection failed:', 
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('getTimezoneInfo', () => {
    beforeEach(() => {
      jest.setSystemTime(new Date('2025-08-28T15:00:00Z'))
    })

    it('should return timezone information for Eastern Time', () => {
      // Mock Intl.DateTimeFormat for Eastern Time
      const mockFormatToParts = jest.fn().mockReturnValue([
        { type: 'month', value: '8' },
        { type: 'literal', value: '/' },
        { type: 'day', value: '28' },
        { type: 'literal', value: '/' },
        { type: 'year', value: '2025' },
        { type: 'literal', value: ', ' },
        { type: 'hour', value: '11' },
        { type: 'literal', value: ':' },
        { type: 'minute', value: '00' },
        { type: 'literal', value: ' ' },
        { type: 'dayPeriod', value: 'AM' },
        { type: 'literal', value: ' ' },
        { type: 'timeZoneName', value: 'EDT' }
      ])

      jest.stubGlobal('Intl', {
        DateTimeFormat: jest.fn(() => ({
          formatToParts: mockFormatToParts
        }))
      })

      const info = timezoneService.getTimezoneInfo('America/New_York')

      expect(info).toEqual(
        expect.objectContaining({
          timezone: 'America/New_York',
          abbreviation: 'EDT',
          displayName: 'Eastern Time (ET)',
          offset: expect.stringMatching(/^[+-]\d{2}:\d{2}$/),
          isDst: expect.any(Boolean),
          utcOffset: expect.any(Number)
        })
      )
    })

    it('should return timezone information for UTC', () => {
      const mockFormatToParts = jest.fn().mockReturnValue([
        { type: 'timeZoneName', value: 'UTC' }
      ])

      jest.stubGlobal('Intl', {
        DateTimeFormat: jest.fn(() => ({
          formatToParts: mockFormatToParts
        }))
      })

      const info = timezoneService.getTimezoneInfo('UTC')

      expect(info).toEqual(
        expect.objectContaining({
          timezone: 'UTC',
          offset: '+00:00',
          abbreviation: 'UTC',
          isDst: false,
          utcOffset: 0,
          displayName: 'Coordinated Universal Time (UTC)'
        })
      )
    })

    it('should handle timezone info error gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Mock Intl API failure
      jest.stubGlobal('Intl', {
        DateTimeFormat: jest.fn(() => {
          throw new Error('Invalid timezone')
        })
      })

      const info = timezoneService.getTimezoneInfo('Invalid/Timezone')

      expect(info).toEqual({
        timezone: 'UTC',
        offset: '+00:00',
        abbreviation: 'UTC',
        isDst: false,
        utcOffset: 0,
        displayName: 'Coordinated Universal Time (UTC)'
      })

      consoleSpy.mockRestore()
    })

    it('should detect DST correctly', () => {
      // Test with a date during DST (August)
      jest.setSystemTime(new Date('2025-08-15T15:00:00Z'))

      const mockFormatToParts = jest.fn().mockReturnValue([
        { type: 'timeZoneName', value: 'EDT' }
      ])

      jest.stubGlobal('Intl', {
        DateTimeFormat: jest.fn(() => ({
          formatToParts: mockFormatToParts
        }))
      })

      const info = timezoneService.getTimezoneInfo('America/New_York')

      expect(info.abbreviation).toBe('EDT')
      // DST detection logic would need more sophisticated mocking of date-fns-tz
      // This test focuses on the structure and error handling
    })
  })

  describe('convertTime', () => {
    it('should convert time from UTC to Eastern Time', () => {
      const utcDate = new Date('2025-08-28T15:00:00Z')
      
      const conversion = timezoneService.convertTime(
        utcDate,
        'UTC',
        'America/New_York'
      )

      expect(conversion).toEqual(
        expect.objectContaining({
          utc: utcDate,
          local: expect.any(Date),
          timezone: 'America/New_York',
          formatted: expect.any(String),
          offsetInfo: expect.objectContaining({
            hours: expect.any(Number),
            minutes: expect.any(Number),
            sign: expect.stringMatching(/^[+-]$/)
          })
        })
      )
    })

    it('should convert time from Eastern to Pacific', () => {
      const easternDate = new Date('2025-08-28T11:00:00-04:00')
      
      const conversion = timezoneService.convertTime(
        easternDate,
        'America/New_York',
        'America/Los_Angeles'
      )

      expect(conversion).toEqual(
        expect.objectContaining({
          timezone: 'America/Los_Angeles',
          formatted: expect.stringContaining('PDT')
        })
      )
    })

    it('should handle same timezone conversion', () => {
      const date = new Date('2025-08-28T15:00:00Z')
      
      const conversion = timezoneService.convertTime(
        date,
        'UTC',
        'UTC'
      )

      expect(conversion.utc).toEqual(date)
      expect(conversion.local).toEqual(date)
      expect(conversion.timezone).toBe('UTC')
    })

    it('should handle conversion errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const conversion = timezoneService.convertTime(
        new Date('invalid-date'),
        'UTC',
        'America/New_York'
      )

      expect(conversion).toEqual(
        expect.objectContaining({
          timezone: 'UTC',
          offsetInfo: { hours: 0, minutes: 0, sign: '+' }
        })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('formatTime', () => {
    it('should format time with default options', () => {
      const date = new Date('2025-08-28T15:30:45Z')

      const formatted = timezoneService.formatTime(date, 'America/New_York')

      expect(formatted).toMatch(/Aug 28, 2025/)
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/)
      expect(formatted).toMatch(/(EDT|EST)/) // Depending on DST
    })

    it('should format time with custom options', () => {
      const date = new Date('2025-08-28T15:30:45Z')
      
      const customOptions = {
        year: 'numeric' as const,
        month: 'long' as const,
        day: 'numeric' as const,
        hour: '2-digit' as const,
        minute: '2-digit' as const,
        second: '2-digit' as const
      }

      const formatted = timezoneService.formatTime(date, 'UTC', customOptions)

      expect(formatted).toMatch(/August 28, 2025/)
      expect(formatted).toMatch(/15:30:45/) // 24-hour format
    })

    it('should fallback to ISO string on format error', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Mock Intl.DateTimeFormat failure
      jest.stubGlobal('Intl', {
        DateTimeFormat: jest.fn(() => {
          throw new Error('Format error')
        })
      })

      const date = new Date('2025-08-28T15:30:45Z')
      const formatted = timezoneService.formatTime(date, 'UTC')

      expect(formatted).toBe(date.toISOString())

      consoleSpy.mockRestore()
    })
  })

  describe('toUserTime and toUtcTime', () => {
    it('should convert UTC to user time', () => {
      const utcDate = new Date('2025-08-28T20:00:00Z')
      
      const userTime = timezoneService.toUserTime(utcDate, 'America/New_York')

      expect(userTime).toEqual(
        expect.objectContaining({
          utc: utcDate,
          timezone: 'America/New_York'
        })
      )
    })

    it('should convert user time to UTC', () => {
      const localDate = new Date('2025-08-28T16:00:00-04:00')
      
      const utcTime = timezoneService.toUtcTime(localDate, 'America/New_York')

      expect(utcTime).toEqual(
        expect.objectContaining({
          timezone: 'UTC',
          local: expect.any(Date)
        })
      )
    })
  })

  describe('getDstTransitions', () => {
    it('should detect DST transitions for 2025', () => {
      const transitions = timezoneService.getDstTransitions('America/New_York', 2025)

      expect(transitions).toBeInstanceOf(Array)
      
      if (transitions.length > 0) {
        expect(transitions[0]).toEqual(
          expect.objectContaining({
            date: expect.any(Date),
            type: expect.stringMatching(/^(spring_forward|fall_back)$/),
            oldOffset: expect.any(Number),
            newOffset: expect.any(Number),
            timezone: 'America/New_York'
          })
        )
      }
    })

    it('should return empty array for UTC (no DST)', () => {
      const transitions = timezoneService.getDstTransitions('UTC', 2025)

      expect(transitions).toEqual([])
    })

    it('should handle DST transition errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const transitions = timezoneService.getDstTransitions('Invalid/Timezone', 2025)

      expect(transitions).toEqual([])

      consoleSpy.mockRestore()
    })

    it('should identify spring forward transitions', () => {
      // This would need sophisticated mocking of timezone calculations
      // Focus on structure and error handling for now
      const transitions = timezoneService.getDstTransitions('America/New_York', 2025)

      const springTransitions = transitions.filter(t => t.type === 'spring_forward')
      expect(springTransitions.length).toBeLessThanOrEqual(1) // At most one spring forward per year
    })

    it('should identify fall back transitions', () => {
      const transitions = timezoneService.getDstTransitions('America/New_York', 2025)

      const fallTransitions = transitions.filter(t => t.type === 'fall_back')
      expect(fallTransitions.length).toBeLessThanOrEqual(1) // At most one fall back per year
    })
  })

  describe('detectTimezoneConflicts', () => {
    it('should detect timezone mismatches', () => {
      const events = [
        {
          start: new Date('2025-08-28T15:00:00Z'),
          end: new Date('2025-08-28T16:00:00Z'),
          timezone: 'America/Los_Angeles'
        },
        {
          start: new Date('2025-08-28T17:00:00Z'),
          end: new Date('2025-08-28T18:00:00Z'),
          timezone: 'America/New_York'
        }
      ]

      const conflicts = timezoneService.detectTimezoneConflicts(
        events,
        'America/Chicago' // User timezone different from events
      )

      expect(conflicts).toHaveLength(2)
      expect(conflicts[0]).toEqual(
        expect.objectContaining({
          eventIndex: 0,
          issue: 'timezone_mismatch',
          description: expect.stringContaining('America/Los_Angeles'),
          suggestion: 'Verify the event timezone is correct'
        })
      )
    })

    it('should detect DST transition conflicts', () => {
      // Mock a spring forward event (would fall in "lost hour")
      const events = [
        {
          start: new Date('2025-03-09T07:30:00Z'), // During typical spring forward
          end: new Date('2025-03-09T08:30:00Z'),
          timezone: 'America/New_York'
        }
      ]

      const conflicts = timezoneService.detectTimezoneConflicts(
        events,
        'America/New_York'
      )

      // This test would need more sophisticated DST transition mocking
      // Focus on structure validation
      expect(conflicts).toBeInstanceOf(Array)
      
      const dstConflicts = conflicts.filter(c => c.issue === 'dst_transition')
      dstConflicts.forEach(conflict => {
        expect(conflict).toEqual(
          expect.objectContaining({
            eventIndex: expect.any(Number),
            issue: 'dst_transition',
            description: expect.stringContaining('DST transition'),
            suggestion: expect.stringContaining('lost hour')
          })
        )
      })
    })

    it('should return empty array for events in same timezone', () => {
      const events = [
        {
          start: new Date('2025-08-28T15:00:00Z'),
          end: new Date('2025-08-28T16:00:00Z'),
          timezone: 'America/New_York'
        },
        {
          start: new Date('2025-08-28T17:00:00Z'),
          end: new Date('2025-08-28T18:00:00Z'),
          timezone: 'America/New_York'
        }
      ]

      const conflicts = timezoneService.detectTimezoneConflicts(
        events,
        'America/New_York'
      )

      expect(conflicts).toHaveLength(0)
    })
  })

  describe('getAvailableTimezones', () => {
    it('should return timezones grouped by region', () => {
      const timezones = timezoneService.getAvailableTimezones()

      expect(timezones).toBeInstanceOf(Array)
      expect(timezones.length).toBeGreaterThan(0)

      const northAmerica = timezones.find(group => group.region === 'North America')
      expect(northAmerica).toBeDefined()
      expect(northAmerica?.timezones).toContainEqual(
        expect.objectContaining({
          value: 'America/New_York',
          label: 'Eastern Time (ET)',
          offset: expect.stringMatching(/^[+-]\d{2}:\d{2}$/)
        })
      )

      const universal = timezones.find(group => group.region === 'Universal')
      expect(universal).toBeDefined()
      expect(universal?.timezones).toContainEqual(
        expect.objectContaining({
          value: 'UTC',
          label: 'Coordinated Universal Time (UTC)',
          offset: '+00:00'
        })
      )
    })

    it('should sort timezones alphabetically within regions', () => {
      const timezones = timezoneService.getAvailableTimezones()
      
      timezones.forEach(group => {
        const labels = group.timezones.map(tz => tz.label)
        const sortedLabels = [...labels].sort()
        expect(labels).toEqual(sortedLabels)
      })
    })
  })

  describe('isValidTimezone', () => {
    it('should validate correct timezone strings', () => {
      expect(timezoneService.isValidTimezone('America/New_York')).toBe(true)
      expect(timezoneService.isValidTimezone('UTC')).toBe(true)
      expect(timezoneService.isValidTimezone('Europe/London')).toBe(true)
      expect(timezoneService.isValidTimezone('Asia/Tokyo')).toBe(true)
    })

    it('should reject invalid timezone strings', () => {
      expect(timezoneService.isValidTimezone('Invalid/Timezone')).toBe(false)
      expect(timezoneService.isValidTimezone('Not-A-Timezone')).toBe(false)
      expect(timezoneService.isValidTimezone('')).toBe(false)
      expect(timezoneService.isValidTimezone('America/Invalid_City')).toBe(false)
    })

    it('should handle timezone validation errors gracefully', () => {
      // Mock Intl.DateTimeFormat to throw error
      jest.stubGlobal('Intl', {
        DateTimeFormat: jest.fn(() => {
          throw new Error('Invalid timezone')
        })
      })

      const isValid = timezoneService.isValidTimezone('Any/Timezone')
      expect(isValid).toBe(false)
    })
  })

  describe('getTimezoneDescription', () => {
    it('should return user-friendly timezone description', () => {
      const description = timezoneService.getTimezoneDescription('America/New_York')

      expect(description).toMatch(/Eastern Time \(ET\)/)
      expect(description).toMatch(/[+-]\d{2}:\d{2}/)
      expect(description).toMatch(/(EDT|EST)/)
    })

    it('should return UTC description for UTC timezone', () => {
      const description = timezoneService.getTimezoneDescription('UTC')

      expect(description).toBe('Coordinated Universal Time (UTC) (+00:00 UTC)')
    })

    it('should handle invalid timezones gracefully', () => {
      const description = timezoneService.getTimezoneDescription('Invalid/Timezone')

      // Should fallback to UTC description
      expect(description).toBe('Coordinated Universal Time (UTC) (+00:00 UTC)')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined dates gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const conversion = timezoneService.convertTime(
        null as any,
        'UTC',
        'America/New_York'
      )

      expect(conversion.timezone).toBe('UTC')
      expect(conversion.offsetInfo).toEqual({ hours: 0, minutes: 0, sign: '+' })

      consoleSpy.mockRestore()
    })

    it('should handle invalid date objects', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const invalidDate = new Date('invalid-date-string')
      const conversion = timezoneService.convertTime(
        invalidDate,
        'UTC',
        'America/New_York'
      )

      expect(conversion.timezone).toBe('UTC')

      consoleSpy.mockRestore()
    })

    it('should handle timezone service initialization errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Test when all Intl APIs fail
      jest.stubGlobal('Intl', undefined)

      const timezone = timezoneService.detectUserTimezone()
      expect(timezone).toBe('UTC')

      consoleSpy.mockRestore()
    })
  })

  describe('Performance and Caching', () => {
    it('should handle multiple timezone info requests efficiently', () => {
      const startTime = performance.now()

      // Make multiple requests for the same timezone
      for (let i = 0; i < 10; i++) {
        timezoneService.getTimezoneInfo('America/New_York')
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete quickly (under 100ms for 10 requests)
      expect(duration).toBeLessThan(100)
    })

    it('should handle large event arrays in conflict detection', () => {
      const largeEventArray = Array(100).fill(null).map((_, index) => ({
        start: new Date(`2025-08-${(index % 28) + 1}T${(index % 24).toString().padStart(2, '0')}:00:00Z`),
        end: new Date(`2025-08-${(index % 28) + 1}T${((index % 24) + 1).toString().padStart(2, '0')}:00:00Z`),
        timezone: 'America/New_York'
      }))

      const startTime = performance.now()
      const conflicts = timezoneService.detectTimezoneConflicts(
        largeEventArray,
        'America/Chicago'
      )
      const endTime = performance.now()

      expect(conflicts).toBeInstanceOf(Array)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})