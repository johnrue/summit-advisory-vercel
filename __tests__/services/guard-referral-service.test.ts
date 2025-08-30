import {
  createReferralFromLead,
  updateReferralStatus,
  processBonusPayments,
  getReferralLeaderboard,
  getReferralAnalytics,
  createReferralProgram
} from '@/lib/services/guard-referral-service'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}))

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis()
}

;(createClient as jest.Mock).mockReturnValue(mockSupabase)

describe('GuardReferralService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createReferralFromLead', () => {
    it('should create referral from lead with referral code', async () => {
      // Mock lead lookup
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: 'lead-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '123-456-7890'
        },
        error: null
      })

      // Mock referral code lookup
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: 'program-1',
          name: 'Employee Referral Program',
          isActive: true,
          referrerGuardId: 'guard-1'
        },
        error: null
      })

      // Mock referral creation
      mockSupabase.insert.mockResolvedValueOnce({
        data: {
          id: 'referral-1',
          leadId: 'lead-1',
          programId: 'program-1',
          referrerGuardId: 'guard-1',
          status: 'referred',
          stage: 'initial_contact'
        },
        error: null
      })

      const result = await createReferralFromLead('lead-1', 'REF123')

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'referral-1',
        leadId: 'lead-1',
        programId: 'program-1',
        referrerGuardId: 'guard-1',
        status: 'referred'
      })

      expect(mockSupabase.insert).toHaveBeenCalled()
    })

    it('should create referral with direct referrer guard ID', async () => {
      // Mock lead lookup
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: 'lead-1',
          firstName: 'Jane',
          lastName: 'Smith'
        },
        error: null
      })

      // Mock active program lookup
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: 'program-1',
          name: 'Employee Referral Program',
          isActive: true
        },
        error: null
      })

      // Mock referral creation
      mockSupabase.insert.mockResolvedValueOnce({
        data: {
          id: 'referral-2',
          leadId: 'lead-1',
          referrerGuardId: 'guard-2',
          status: 'referred'
        },
        error: null
      })

      const result = await createReferralFromLead('lead-1', undefined, 'guard-2')

      expect(result.success).toBe(true)
      expect(result.data?.referrerGuardId).toBe('guard-2')
    })

    it('should handle invalid referral code', async () => {
      // Mock lead lookup
      mockSupabase.select.mockResolvedValueOnce({
        data: { id: 'lead-1' },
        error: null
      })

      // Mock invalid referral code
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await createReferralFromLead('lead-1', 'INVALID')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid referral code or inactive program')
    })

    it('should handle non-existent lead', async () => {
      // Mock non-existent lead
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await createReferralFromLead('invalid-lead', 'REF123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Lead not found')
    })

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection timeout' }
      })

      const result = await createReferralFromLead('lead-1', 'REF123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create referral')
    })
  })

  describe('updateReferralStatus', () => {
    it('should update referral status and stage', async () => {
      const mockReferral = {
        id: 'referral-1',
        leadId: 'lead-1',
        status: 'qualified',
        stage: 'application',
        notes: 'Updated status'
      }

      mockSupabase.update.mockResolvedValueOnce({
        data: mockReferral,
        error: null
      })

      const result = await updateReferralStatus(
        'referral-1',
        'qualified',
        'application',
        'Updated status'
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockReferral)
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'qualified',
        stage: 'application',
        notes: 'Updated status',
        updated_at: expect.any(String)
      })
    })

    it('should trigger milestone bonus when hired', async () => {
      mockSupabase.update.mockResolvedValueOnce({
        data: {
          id: 'referral-1',
          status: 'hired',
          programId: 'program-1',
          referrerGuardId: 'guard-1'
        },
        error: null
      })

      // Mock bonus creation
      mockSupabase.insert.mockResolvedValueOnce({
        data: { id: 'bonus-1' },
        error: null
      })

      const result = await updateReferralStatus('referral-1', 'hired', 'onboarding')

      expect(result.success).toBe(true)
      expect(mockSupabase.insert).toHaveBeenCalled() // Bonus creation called
    })

    it('should handle update failures', async () => {
      mockSupabase.update.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' }
      })

      const result = await updateReferralStatus('referral-1', 'qualified', 'application')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update referral status')
    })
  })

  describe('processBonusPayments', () => {
    it('should process eligible bonus payments', async () => {
      // Mock eligible bonuses
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            id: 'bonus-1',
            referralId: 'referral-1',
            amount: 500,
            milestone: 'hired',
            status: 'pending',
            referrerGuardId: 'guard-1'
          },
          {
            id: 'bonus-2',
            referralId: 'referral-2',
            amount: 300,
            milestone: '30_days',
            status: 'pending',
            referrerGuardId: 'guard-2'
          }
        ],
        error: null
      })

      // Mock payment processing
      mockSupabase.update.mockResolvedValueOnce({
        data: [
          { id: 'bonus-1', status: 'paid' },
          { id: 'bonus-2', status: 'paid' }
        ],
        error: null
      })

      const result = await processBonusPayments()

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        processed: 2,
        totalAmount: 800,
        bonuses: expect.arrayContaining([
          expect.objectContaining({ id: 'bonus-1', amount: 500 }),
          expect.objectContaining({ id: 'bonus-2', amount: 300 })
        ])
      })
    })

    it('should filter by program ID when specified', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      })

      await processBonusPayments('program-1')

      expect(mockSupabase.eq).toHaveBeenCalledWith('program_id', 'program-1')
    })

    it('should handle no eligible bonuses', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await processBonusPayments()

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        processed: 0,
        totalAmount: 0,
        bonuses: []
      })
    })

    it('should handle processing errors gracefully', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Query failed' }
      })

      const result = await processBonusPayments()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to process bonus payments')
    })
  })

  describe('getReferralLeaderboard', () => {
    it('should generate leaderboard for date range', async () => {
      // Mock referral data
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            referrerGuardId: 'guard-1',
            guard: {
              firstName: 'John',
              lastName: 'Smith',
              email: 'john@example.com'
            },
            status: 'hired',
            createdAt: '2024-01-15'
          },
          {
            referrerGuardId: 'guard-1',
            guard: {
              firstName: 'John',
              lastName: 'Smith',
              email: 'john@example.com'
            },
            status: 'qualified',
            createdAt: '2024-01-10'
          },
          {
            referrerGuardId: 'guard-2',
            guard: {
              firstName: 'Jane',
              lastName: 'Doe',
              email: 'jane@example.com'
            },
            status: 'hired',
            createdAt: '2024-01-20'
          }
        ],
        error: null
      })

      // Mock bonus data
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            referrerGuardId: 'guard-1',
            amount: 800,
            status: 'paid'
          },
          {
            referrerGuardId: 'guard-2',
            amount: 500,
            status: 'paid'
          }
        ],
        error: null
      })

      const dateRange = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }

      const result = await getReferralLeaderboard(dateRange)

      expect(result.success).toBe(true)
      expect(result.data?.leaderboard).toHaveLength(2)
      expect(result.data?.leaderboard[0]).toMatchObject({
        referrerGuardId: 'guard-1',
        referrerName: 'John Smith',
        totalReferrals: 2,
        successfulReferrals: 1,
        totalBonusEarned: 800
      })
    })

    it('should filter by program ID', async () => {
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null })
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null })

      const dateRange = { startDate: '2024-01-01', endDate: '2024-01-31' }
      
      await getReferralLeaderboard(dateRange, 'program-1')

      expect(mockSupabase.eq).toHaveBeenCalledWith('program_id', 'program-1')
    })

    it('should handle empty leaderboard data', async () => {
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null })
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null })

      const dateRange = { startDate: '2024-01-01', endDate: '2024-01-31' }
      const result = await getReferralLeaderboard(dateRange)

      expect(result.success).toBe(true)
      expect(result.data?.leaderboard).toEqual([])
      expect(result.data?.summary.totalReferrals).toBe(0)
    })

    it('should calculate leaderboard metrics correctly', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            referrerGuardId: 'guard-1',
            guard: { firstName: 'John', lastName: 'Smith' },
            status: 'hired'
          },
          {
            referrerGuardId: 'guard-1',
            guard: { firstName: 'John', lastName: 'Smith' },
            status: 'qualified'
          },
          {
            referrerGuardId: 'guard-1',
            guard: { firstName: 'John', lastName: 'Smith' },
            status: 'disqualified'
          }
        ],
        error: null
      })

      mockSupabase.select.mockResolvedValueOnce({
        data: [
          { referrerGuardId: 'guard-1', amount: 1000, status: 'paid' }
        ],
        error: null
      })

      const dateRange = { startDate: '2024-01-01', endDate: '2024-01-31' }
      const result = await getReferralLeaderboard(dateRange)

      expect(result.success).toBe(true)
      expect(result.data?.leaderboard[0]).toMatchObject({
        totalReferrals: 3,
        successfulReferrals: 1,
        conversionRate: 33.33,
        totalBonusEarned: 1000
      })
    })

    it('should handle database errors', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      })

      const dateRange = { startDate: '2024-01-01', endDate: '2024-01-31' }
      const result = await getReferralLeaderboard(dateRange)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to generate referral leaderboard')
    })
  })

  describe('getReferralAnalytics', () => {
    it('should return comprehensive referral analytics', async () => {
      // Mock referral data
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          { status: 'referred', createdAt: '2024-01-01' },
          { status: 'qualified', createdAt: '2024-01-02' },
          { status: 'hired', createdAt: '2024-01-03' }
        ],
        error: null
      })

      // Mock bonus data
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          { amount: 500, status: 'paid', createdAt: '2024-01-01' },
          { amount: 300, status: 'pending', createdAt: '2024-01-02' }
        ],
        error: null
      })

      const result = await getReferralAnalytics()

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        overview: {
          totalReferrals: 3,
          successfulReferrals: 1,
          conversionRate: expect.any(Number),
          totalBonusesPaid: 500,
          totalBonusesPending: 300
        },
        statusBreakdown: expect.arrayContaining([
          expect.objectContaining({ status: 'referred', count: 1 }),
          expect.objectContaining({ status: 'qualified', count: 1 }),
          expect.objectContaining({ status: 'hired', count: 1 })
        ])
      })
    })

    it('should apply date range filters', async () => {
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null })
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null })

      const filters = {
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31'
        }
      }

      await getReferralAnalytics(filters)

      expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', '2024-01-01')
      expect(mockSupabase.lte).toHaveBeenCalledWith('created_at', '2024-01-31')
    })

    it('should filter by referrer ID', async () => {
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null })
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null })

      const filters = {
        referrerId: 'guard-1'
      }

      await getReferralAnalytics(filters)

      expect(mockSupabase.eq).toHaveBeenCalledWith('referrer_guard_id', 'guard-1')
    })

    it('should handle database errors', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Query failed' }
      })

      const result = await getReferralAnalytics()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch referral analytics')
    })
  })

  describe('createReferralProgram', () => {
    it('should create referral program with flat bonus structure', async () => {
      const programData = {
        name: 'Employee Referral Program',
        description: 'Refer qualified guards and earn bonuses',
        isActive: true,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        referrerEligibility: {
          minimumTenure: 90,
          goodStanding: true,
          minimumPerformanceRating: 7,
          excludedRoles: ['temp']
        },
        bonusStructure: {
          type: 'flat' as const,
          flatAmount: 500
        },
        trackingPeriod: 180
      }

      mockSupabase.insert.mockResolvedValueOnce({
        data: {
          id: 'program-1',
          ...programData,
          createdAt: '2024-01-01T00:00:00Z'
        },
        error: null
      })

      const result = await createReferralProgram(programData)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'program-1',
        name: 'Employee Referral Program',
        bonusStructure: {
          type: 'flat',
          flatAmount: 500
        }
      })
    })

    it('should create program with tiered bonus structure', async () => {
      const programData = {
        name: 'Tiered Referral Program',
        description: 'More referrals, bigger bonuses',
        isActive: true,
        startDate: '2024-01-01',
        referrerEligibility: {
          minimumTenure: 60,
          goodStanding: true,
          minimumPerformanceRating: 6
        },
        bonusStructure: {
          type: 'tiered' as const,
          tiers: [
            { minReferrals: 1, maxReferrals: 2, bonusAmount: 300 },
            { minReferrals: 3, maxReferrals: 5, bonusAmount: 500 },
            { minReferrals: 6, bonusAmount: 750 }
          ]
        },
        trackingPeriod: 90
      }

      mockSupabase.insert.mockResolvedValueOnce({
        data: { id: 'program-2', ...programData },
        error: null
      })

      const result = await createReferralProgram(programData)

      expect(result.success).toBe(true)
      expect(result.data?.bonusStructure.type).toBe('tiered')
      expect(result.data?.bonusStructure.tiers).toHaveLength(3)
    })

    it('should create program with milestone bonus structure', async () => {
      const programData = {
        name: 'Milestone Referral Program',
        description: 'Bonuses based on referral milestones',
        isActive: true,
        startDate: '2024-01-01',
        referrerEligibility: {
          minimumTenure: 30,
          goodStanding: true,
          minimumPerformanceRating: 5
        },
        bonusStructure: {
          type: 'milestone' as const,
          milestones: [
            {
              milestone: 'application_submitted' as const,
              percentage: 25,
              amount: 125,
              description: 'Application submitted'
            },
            {
              milestone: '90_days' as const,
              percentage: 75,
              amount: 375,
              description: '90 days employment'
            }
          ]
        },
        trackingPeriod: 120
      }

      mockSupabase.insert.mockResolvedValueOnce({
        data: { id: 'program-3', ...programData },
        error: null
      })

      const result = await createReferralProgram(programData)

      expect(result.success).toBe(true)
      expect(result.data?.bonusStructure.type).toBe('milestone')
      expect(result.data?.bonusStructure.milestones).toHaveLength(2)
    })

    it('should handle program creation failures', async () => {
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Unique constraint violation' }
      })

      const programData = {
        name: 'Test Program',
        description: 'Test',
        isActive: true,
        startDate: '2024-01-01',
        referrerEligibility: {
          minimumTenure: 0,
          goodStanding: true,
          minimumPerformanceRating: 0
        },
        bonusStructure: {
          type: 'flat' as const,
          flatAmount: 100
        },
        trackingPeriod: 90
      }

      const result = await createReferralProgram(programData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create referral program')
    })
  })
})