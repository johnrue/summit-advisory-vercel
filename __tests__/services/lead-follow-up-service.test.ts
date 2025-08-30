import { scheduleFollowUp, processFollowUps, updateFollowUpStatus } from '@/lib/services/lead-follow-up-service'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis()
  }
}))

jest.mock('@/lib/utils/email-service', () => ({
  EmailService: {
    sendLeadFollowUpEmail: jest.fn(),
    sendLeadEscalationEmail: jest.fn()
  }
}))

describe('Lead Follow-up Service', () => {
  const mockLead = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-0123',
    service_type: 'armed',
    source_type: 'website_form',
    status: 'prospect',
    assigned_to: 'manager-123',
    created_at: '2025-08-30T12:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('scheduleFollowUp', () => {
    it('should successfully schedule follow-up workflow', async () => {
      const { supabase } = require('@/lib/supabase')
      
      // Mock lead fetch
      supabase.from.mockImplementation((table: string) => {
        if (table === 'client_leads') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockLead,
              error: null
            })
          }
        }
        if (table === 'lead_follow_ups') {
          return {
            insert: jest.fn().mockResolvedValue({
              error: null
            })
          }
        }
        return {}
      })

      const result = await scheduleFollowUp(mockLead.id)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.scheduledCount).toBe(4) // Should schedule 4 follow-ups
      expect(result.message).toContain('Follow-up workflow scheduled')
    })

    it('should handle lead not found', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      }))

      const result = await scheduleFollowUp('nonexistent-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Lead not found')
    })

    it('should not schedule for already contacted leads', async () => {
      const contactedLead = {
        ...mockLead,
        status: 'contacted',
        last_contact_date: '2025-08-30T13:00:00Z'
      }

      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: contactedLead,
          error: null
        })
      }))

      const result = await scheduleFollowUp(contactedLead.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('already been contacted')
    })

    it('should handle database errors during scheduling', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockImplementation((table: string) => {
        if (table === 'client_leads') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockLead,
              error: null
            })
          }
        }
        if (table === 'lead_follow_ups') {
          return {
            insert: jest.fn().mockResolvedValue({
              error: { message: 'Database error' }
            })
          }
        }
        return {}
      })

      const result = await scheduleFollowUp(mockLead.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database error')
    })
  })

  describe('processFollowUps', () => {
    it('should process pending follow-ups successfully', async () => {
      const mockPendingFollowUps = [
        {
          id: 'followup-1',
          lead_id: mockLead.id,
          follow_up_type: 'immediate',
          scheduled_for: '2025-08-30T12:05:00Z',
          status: 'pending',
          client_leads: mockLead
        },
        {
          id: 'followup-2',
          lead_id: mockLead.id,
          follow_up_type: '2_hour',
          scheduled_for: '2025-08-30T14:00:00Z',
          status: 'pending',
          client_leads: mockLead
        }
      ]

      const { supabase } = require('@/lib/supabase')
      const { EmailService } = require('@/lib/utils/email-service')

      supabase.from.mockImplementation((table: string) => {
        if (table === 'lead_follow_ups') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            lte: jest.fn().mockResolvedValue({
              data: mockPendingFollowUps,
              error: null
            }),
            update: jest.fn().mockReturnThis()
          }
        }
        return {}
      })

      // Mock successful email sending
      EmailService.sendLeadFollowUpEmail.mockResolvedValue({ success: true })

      const result = await processFollowUps()

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.processed).toBe(2)
      expect(result.data?.emailsSent).toBe(2)
      expect(result.data?.errors).toBe(0)

      // Should have sent emails for both follow-ups
      expect(EmailService.sendLeadFollowUpEmail).toHaveBeenCalledTimes(2)
    })

    it('should handle email sending failures', async () => {
      const mockPendingFollowUps = [
        {
          id: 'followup-1',
          lead_id: mockLead.id,
          follow_up_type: 'immediate',
          scheduled_for: '2025-08-30T12:05:00Z',
          status: 'pending',
          client_leads: mockLead
        }
      ]

      const { supabase } = require('@/lib/supabase')
      const { EmailService } = require('@/lib/utils/email-service')

      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lte: jest.fn().mockResolvedValue({
          data: mockPendingFollowUps,
          error: null
        }),
        update: jest.fn().mockReturnThis()
      }))

      // Mock email sending failure
      EmailService.sendLeadFollowUpEmail.mockResolvedValue({ 
        success: false, 
        error: 'SMTP error' 
      })

      const result = await processFollowUps()

      expect(result.success).toBe(true)
      expect(result.data?.processed).toBe(1)
      expect(result.data?.emailsSent).toBe(0)
      expect(result.data?.errors).toBe(1)
      expect(result.data?.errorDetails).toContain('SMTP error')
    })

    it('should handle escalation follow-ups', async () => {
      const escalationFollowUp = [
        {
          id: 'followup-escalation',
          lead_id: mockLead.id,
          follow_up_type: 'escalation',
          scheduled_for: '2025-08-30T12:05:00Z',
          status: 'pending',
          client_leads: mockLead
        }
      ]

      const { supabase } = require('@/lib/supabase')
      const { EmailService } = require('@/lib/utils/email-service')

      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lte: jest.fn().mockResolvedValue({
          data: escalationFollowUp,
          error: null
        }),
        update: jest.fn().mockReturnThis()
      }))

      EmailService.sendLeadEscalationEmail.mockResolvedValue({ success: true })

      const result = await processFollowUps()

      expect(result.success).toBe(true)
      expect(EmailService.sendLeadEscalationEmail).toHaveBeenCalledTimes(1)
    })

    it('should handle no pending follow-ups', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lte: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }))

      const result = await processFollowUps()

      expect(result.success).toBe(true)
      expect(result.data?.processed).toBe(0)
      expect(result.message).toContain('No pending follow-ups found')
    })
  })

  describe('updateFollowUpStatus', () => {
    it('should successfully update follow-up status to completed', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null
        })
      }))

      const result = await updateFollowUpStatus(mockLead.id, 'completed', 'Lead responded positively')

      expect(result.success).toBe(true)
      expect(result.message).toContain('Follow-up status updated')
    })

    it('should successfully update follow-up status to skipped', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null
        })
      }))

      const result = await updateFollowUpStatus(mockLead.id, 'skipped', 'Lead not interested')

      expect(result.success).toBe(true)
      expect(result.message).toContain('Follow-up status updated')
    })

    it('should handle update errors', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Update failed' }
        })
      }))

      const result = await updateFollowUpStatus(mockLead.id, 'completed')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Update failed')
    })

    it('should validate status parameter', async () => {
      const result = await updateFollowUpStatus(mockLead.id, 'invalid-status' as any)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid status')
    })
  })

  describe('follow-up workflow timing', () => {
    it('should calculate correct follow-up times', async () => {
      const { supabase } = require('@/lib/supabase')

      let insertedFollowUps: any[] = []
      
      supabase.from.mockImplementation((table: string) => {
        if (table === 'client_leads') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockLead,
              error: null
            })
          }
        }
        if (table === 'lead_follow_ups') {
          return {
            insert: jest.fn().mockImplementation((data) => {
              insertedFollowUps = data
              return Promise.resolve({ error: null })
            })
          }
        }
        return {}
      })

      await scheduleFollowUp(mockLead.id)

      expect(insertedFollowUps).toHaveLength(4)
      
      // Check that follow-up times are properly spaced
      const immediateFollowUp = insertedFollowUps.find(f => f.follow_up_type === 'immediate')
      const twoHourFollowUp = insertedFollowUps.find(f => f.follow_up_type === '2_hour')
      const oneDayFollowUp = insertedFollowUps.find(f => f.follow_up_type === '24_hour')
      const threeDayFollowUp = insertedFollowUps.find(f => f.follow_up_type === '3_day')

      expect(immediateFollowUp).toBeDefined()
      expect(twoHourFollowUp).toBeDefined()
      expect(oneDayFollowUp).toBeDefined()
      expect(threeDayFollowUp).toBeDefined()

      // Verify timing intervals
      const leadCreatedTime = new Date(mockLead.created_at).getTime()
      const immediateTime = new Date(immediateFollowUp.scheduled_for).getTime()
      const twoHourTime = new Date(twoHourFollowUp.scheduled_for).getTime()

      expect(immediateTime - leadCreatedTime).toBe(5 * 60 * 1000) // 5 minutes
      expect(twoHourTime - leadCreatedTime).toBe(2 * 60 * 60 * 1000) // 2 hours
    })
  })
})