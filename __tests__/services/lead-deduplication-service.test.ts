import { checkForDuplicates } from '@/lib/services/lead-deduplication-service'

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis()
  }
}))

describe('Lead Deduplication Service', () => {
  const mockLeadData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-0123'
  }

  const mockExistingLeads = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-0123',
      created_at: '2025-08-30T12:00:00Z'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getLevenshteinDistance', () => {
    it('should calculate distance correctly for identical strings', () => {
      const result = getLevenshteinDistance('hello', 'hello')
      expect(result).toBe(0)
    })

    it('should calculate distance correctly for different strings', () => {
      const result = getLevenshteinDistance('kitten', 'sitting')
      expect(result).toBe(3)
    })

    it('should handle empty strings', () => {
      const result1 = getLevenshteinDistance('', 'hello')
      const result2 = getLevenshteinDistance('hello', '')
      expect(result1).toBe(5)
      expect(result2).toBe(5)
    })

    it('should be case insensitive', () => {
      const result = getLevenshteinDistance('Hello', 'hello')
      expect(result).toBe(0)
    })
  })

  describe('checkForDuplicates', () => {
    it('should find exact email match', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockExistingLeads,
          error: null
        })
      }))

      const result = await checkForDuplicates(mockLeadData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.length).toBe(1)
      expect(result.data?.[0].matchType).toBe('exact_email')
      expect(result.data?.[0].confidence).toBe(100)
    })

    it('should find exact phone match', async () => {
      const phoneMatchLead = [
        {
          ...mockExistingLeads[0],
          email: 'different@example.com',
          phone: '555-0123'
        }
      ]

      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: phoneMatchLead,
          error: null
        })
      }))

      const result = await checkForDuplicates({
        ...mockLeadData,
        email: 'different@example.com'
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.length).toBe(1)
      expect(result.data?.[0].matchType).toBe('exact_phone')
      expect(result.data?.[0].confidence).toBe(100)
    })

    it('should find similar name matches', async () => {
      const similarNameLead = [
        {
          ...mockExistingLeads[0],
          first_name: 'Jon', // Similar to John
          last_name: 'Doe',
          email: 'different@example.com',
          phone: '555-9999'
        }
      ]

      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: similarNameLead,
          error: null
        })
      }))

      const result = await checkForDuplicates({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.different@example.com',
        phone: '555-1234'
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.length).toBe(1)
      expect(result.data?.[0].matchType).toBe('similar_name')
      expect(result.data?.[0].confidence).toBeGreaterThan(80)
    })

    it('should return no duplicates when none found', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }))

      const result = await checkForDuplicates({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '555-7890'
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.length).toBe(0)
    })

    it('should handle database errors', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      }))

      const result = await checkForDuplicates(mockLeadData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database connection failed')
    })

    it('should validate input data', async () => {
      const result = await checkForDuplicates({
        firstName: '',
        lastName: '',
        email: 'invalid-email',
        phone: '123'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation failed')
    })

    it('should rank duplicates by confidence score', async () => {
      const multipleDuplicates = [
        {
          id: '1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com', // Exact email match
          phone: '555-9999',
          created_at: '2025-08-30T12:00:00Z'
        },
        {
          id: '2',
          first_name: 'Jon',
          last_name: 'Doe',
          email: 'different@example.com',
          phone: '555-0123', // Exact phone match
          created_at: '2025-08-30T12:00:00Z'
        },
        {
          id: '3',
          first_name: 'Johnny',
          last_name: 'Doe',
          email: 'another@example.com',
          phone: '555-8888', // Similar name only
          created_at: '2025-08-30T12:00:00Z'
        }
      ]

      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: multipleDuplicates,
          error: null
        })
      }))

      const result = await checkForDuplicates(mockLeadData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.length).toBe(3)
      
      // Should be sorted by confidence (highest first)
      expect(result.data?.[0].confidence).toBe(100) // Exact email match
      expect(result.data?.[1].confidence).toBe(100) // Exact phone match
      expect(result.data?.[2].confidence).toBeLessThan(100) // Similar name only
    })
  })
})