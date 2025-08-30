import { createLead, getLeads, updateLead, getLeadStats } from '@/lib/services/lead-management-service'
import type { LeadFormData } from '@/lib/services/lead-management-service'

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
  }
}))

describe('Lead Management Service', () => {
  const mockLeadData: LeadFormData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '(555) 123-4567',
    sourceType: 'website',
    serviceType: 'armed',
    message: 'Need security for office building',
    estimatedValue: 5000
  }

  const mockDatabaseResponse = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '(555) 123-4567',
    source_type: 'website',
    source_details: {},
    service_type: 'armed',
    message: 'Need security for office building',
    estimated_value: 5000,
    status: 'prospect',
    assigned_to: null,
    assigned_at: null,
    qualification_score: 0,
    qualification_notes: null,
    last_contact_date: null,
    next_follow_up_date: null,
    contact_count: 0,
    converted_to_contract: false,
    contract_signed_date: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createLead', () => {
    it('should create a lead successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDatabaseResponse,
          error: null
        })
      }))

      const result = await createLead(mockLeadData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.firstName).toBe('John')
      expect(result.data?.lastName).toBe('Doe')
      expect(result.data?.email).toBe('john.doe@example.com')
      expect(result.data?.status).toBe('prospect')
    })

    it('should validate required fields', async () => {
      const invalidLeadData = {
        ...mockLeadData,
        firstName: '',
      } as LeadFormData

      const result = await createLead(invalidLeadData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required field: firstName')
    })

    it('should validate email format', async () => {
      const invalidLeadData = {
        ...mockLeadData,
        email: 'invalid-email',
      } as LeadFormData

      const result = await createLead(invalidLeadData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid email format')
    })

    it('should handle database errors', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      }))

      const result = await createLead(mockLeadData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database error: Database connection failed')
    })
  })

  describe('getLeads', () => {
    it('should retrieve leads with pagination', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockDatabaseResponse],
          error: null,
          count: 1
        })
      }))

      const result = await getLeads(undefined, 1, 25)

      expect(result.success).toBe(true)
      expect(result.data?.leads).toBeDefined()
      expect(result.data?.leads.length).toBe(1)
      expect(result.data?.pagination.page).toBe(1)
      expect(result.data?.pagination.pageSize).toBe(25)
      expect(result.data?.pagination.total).toBe(1)
    })

    it('should apply filters correctly', async () => {
      const { supabase } = require('@/lib/supabase')
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockDatabaseResponse],
          error: null,
          count: 1
        })
      }
      supabase.from.mockImplementation(() => mockQuery)

      const filters = {
        status: ['prospect', 'contacted'],
        sourceType: ['website'],
        search: 'john'
      }

      const result = await getLeads(filters, 1, 25)

      expect(result.success).toBe(true)
      expect(mockQuery.in).toHaveBeenCalledWith('status', ['prospect', 'contacted'])
      expect(mockQuery.in).toHaveBeenCalledWith('source_type', ['website'])
    })
  })

  describe('updateLead', () => {
    it('should update lead successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockDatabaseResponse, status: 'contacted' },
          error: null
        })
      }))

      const result = await updateLead('123e4567-e89b-12d3-a456-426614174000', {
        status: 'contacted',
        qualificationScore: 80
      })

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('contacted')
    })

    it('should handle update errors', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Lead not found' }
        })
      }))

      const result = await updateLead('nonexistent-id', { status: 'contacted' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database error: Lead not found')
    })
  })

  describe('getLeadStats', () => {
    it('should calculate statistics correctly', async () => {
      const { supabase } = require('@/lib/supabase')
      const mockStatsData = [
        {
          status: 'prospect',
          source_type: 'website',
          estimated_value: 5000,
          qualification_score: 70
        },
        {
          status: 'contacted',
          source_type: 'website',
          estimated_value: 3000,
          qualification_score: 60
        },
        {
          status: 'won',
          source_type: 'referral',
          estimated_value: 10000,
          qualification_score: 90
        }
      ]

      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          data: mockStatsData,
          error: null
        })
      }))

      const result = await getLeadStats()

      expect(result.success).toBe(true)
      expect(result.data?.totalLeads).toBe(3)
      expect(result.data?.byStatus.prospect).toBe(1)
      expect(result.data?.byStatus.contacted).toBe(1)
      expect(result.data?.byStatus.won).toBe(1)
      expect(result.data?.bySource.website).toBe(2)
      expect(result.data?.bySource.referral).toBe(1)
      expect(result.data?.conversionRate).toBeCloseTo(33.33, 2)
      expect(result.data?.averageValue).toBe(6000)
      expect(result.data?.averageScore).toBeCloseTo(73.33, 2)
    })

    it('should handle empty data gracefully', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }))

      const result = await getLeadStats()

      expect(result.success).toBe(true)
      expect(result.data?.totalLeads).toBe(0)
      expect(result.data?.conversionRate).toBe(0)
      expect(result.data?.averageValue).toBe(0)
      expect(result.data?.averageScore).toBe(0)
    })
  })
})