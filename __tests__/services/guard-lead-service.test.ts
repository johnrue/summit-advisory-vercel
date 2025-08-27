import { submitGuardLead, getGuardLeads, updateGuardLeadStatus } from '@/lib/services/guard-lead-service'
import type { GuardLeadCaptureRequest } from '@/lib/types/guard-leads'

// Mock Supabase client
const mockInsert = jest.fn()
const mockSelect = jest.fn()
const mockSingle = jest.fn()
const mockFrom = jest.fn()
const mockUpdate = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()
const mockRange = jest.fn()
const mockIn = jest.fn()
const mockGte = jest.fn()
const mockLte = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}))

// Mock UUID generation
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-token')
}))

describe('Guard Lead Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock chain
    mockFrom.mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      order: mockOrder,
      range: mockRange,
      in: mockIn,
      gte: mockGte,
      lte: mockLte,
      eq: mockEq
    })
    
    mockInsert.mockReturnValue({
      select: mockSelect
    })
    
    mockSelect.mockReturnValue({
      single: mockSingle,
      order: mockOrder,
      range: mockRange,
      in: mockIn,
      gte: mockGte,
      lte: mockLte,
      eq: mockEq
    })
    
    mockUpdate.mockReturnValue({
      eq: mockEq
    })
    
    mockEq.mockReturnValue({
      select: mockSelect
    })
    
    mockOrder.mockReturnValue({
      range: mockRange
    })
    
    mockRange.mockReturnValue({
      in: mockIn,
      gte: mockGte,
      lte: mockLte
    })
  })

  describe('submitGuardLead', () => {
    const validLeadData: GuardLeadCaptureRequest = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '(555) 123-4567',
      lead_source: 'website'
    }

    it('should successfully submit a valid lead', async () => {
      const mockLeadResponse = {
        id: 'lead-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        lead_source: 'website',
        status: 'new',
        created_at: '2023-01-01T00:00:00Z'
      }

      mockSingle.mockResolvedValue({
        data: mockLeadResponse,
        error: null
      })

      const result = await submitGuardLead(validLeadData)

      expect(result.success).toBe(true)
      expect(result.data.id).toBe('lead-123')
      expect(result.data.application_link).toBe('/applications/mocked-uuid-token')
      expect(mockFrom).toHaveBeenCalledWith('guard_leads')
      expect(mockInsert).toHaveBeenCalled()
    })

    it('should fail validation for invalid email', async () => {
      const invalidLeadData = {
        ...validLeadData,
        email: 'invalid-email'
      }

      const result = await submitGuardLead(invalidLeadData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid email format')
    })

    it('should fail validation for missing required fields', async () => {
      const invalidLeadData = {
        ...validLeadData,
        first_name: ''
      }

      const result = await submitGuardLead(invalidLeadData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required field: first_name')
    })

    it('should handle database errors gracefully', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      const result = await submitGuardLead(validLeadData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database error: Database connection failed')
    })
  })

  describe('getGuardLeads', () => {
    it('should successfully fetch leads with default parameters', async () => {
      const mockLeadsResponse = [
        {
          id: 'lead-1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          lead_source: 'website',
          status: 'new',
          created_at: '2023-01-01T00:00:00Z'
        }
      ]

      mockRange.mockResolvedValue({
        data: mockLeadsResponse,
        error: null,
        count: 1
      })

      const result = await getGuardLeads()

      expect(result.success).toBe(true)
      expect(result.data.leads).toHaveLength(1)
      expect(result.data.pagination.total).toBe(1)
      expect(mockFrom).toHaveBeenCalledWith('guard_leads')
    })

    it('should apply filters correctly', async () => {
      mockRange.mockResolvedValue({
        data: [],
        error: null,
        count: 0
      })

      const filters = {
        page: 1,
        limit: 10,
        source_filter: ['website'],
        status_filter: ['new']
      }

      await getGuardLeads(filters)

      expect(mockIn).toHaveBeenCalledWith('lead_source', ['website'])
      expect(mockIn).toHaveBeenCalledWith('status', ['new'])
    })
  })

  describe('updateGuardLeadStatus', () => {
    it('should successfully update lead status', async () => {
      const mockUpdatedLead = {
        id: 'lead-123',
        status: 'contacted',
        notes: 'Called and left message'
      }

      mockSingle.mockResolvedValue({
        data: mockUpdatedLead,
        error: null
      })

      const result = await updateGuardLeadStatus('lead-123', 'contacted', 'Called and left message')

      expect(result.success).toBe(true)
      expect(result.data.status).toBe('contacted')
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'lead-123')
    })

    it('should handle lead not found error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      })

      const result = await updateGuardLeadStatus('non-existent-lead', 'contacted')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database error: No rows returned')
    })
  })
})