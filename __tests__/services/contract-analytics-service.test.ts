import { 
  getContractAnalytics,
  exportContractAnalytics,
  calculateOverviewStats,
  calculatePipelineVelocity,
  calculateRevenueForecasting 
} from '@/lib/services/contract-analytics-service'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })
    }
  }
}))

describe('Contract Analytics Service', () => {
  const mockContracts = [
    {
      id: 'contract-1',
      status: 'active',
      contract_type: 'armed',
      contract_value: 60000,
      monthly_value: 5000,
      assigned_manager: 'manager-1',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      created_at: '2024-12-01T00:00:00Z',
      stage_changed_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 'contract-2', 
      status: 'signed',
      contract_type: 'unarmed',
      contract_value: 36000,
      monthly_value: 3000,
      assigned_manager: 'manager-1',
      start_date: '2025-02-01',
      end_date: '2026-01-31',
      created_at: '2025-01-15T00:00:00Z',
      stage_changed_at: '2025-02-01T00:00:00Z'
    },
    {
      id: 'contract-3',
      status: 'prospect',
      contract_type: 'armed',
      contract_value: 48000,
      monthly_value: 4000,
      assigned_manager: 'manager-2',
      start_date: '2025-03-01',
      end_date: '2026-02-28',
      created_at: '2025-02-01T00:00:00Z',
      stage_changed_at: '2025-02-01T00:00:00Z'
    },
    {
      id: 'contract-4',
      status: 'lost',
      contract_type: 'unarmed',
      contract_value: 24000,
      monthly_value: 2000,
      assigned_manager: 'manager-2',
      start_date: '2025-04-01',
      end_date: '2026-03-31',
      created_at: '2025-01-20T00:00:00Z',
      stage_changed_at: '2025-02-15T00:00:00Z'
    }
  ]

  const mockManagers = [
    { id: 'manager-1', first_name: 'John', last_name: 'Smith' },
    { id: 'manager-2', first_name: 'Jane', last_name: 'Doe' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getContractAnalytics', () => {
    it('should return comprehensive analytics with no filters', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockImplementation((table: string) => {
        if (table === 'contracts') {
          return {
            select: jest.fn().mockResolvedValue({
              data: mockContracts,
              error: null
            })
          }
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockManagers,
                error: null
              })
            })
          }
        }
        return {}
      })

      const result = await getContractAnalytics()

      expect(result.success).toBe(true)
      expect(result.data?.overview.totalContracts).toBe(4)
      expect(result.data?.overview.totalValue).toBe(168000)
      expect(result.data?.overview.monthlyRecurringRevenue).toBe(8000) // active + signed
      expect(result.data?.overview.averageContractValue).toBe(42000)
      expect(result.data?.overview.winRate).toBe(66.67) // 2 won out of 3 decided (won + lost)
    })

    it('should apply status filters correctly', async () => {
      const { supabase } = require('@/lib/supabase')
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis()
      }
      mockQuery.select.mockResolvedValue({
        data: mockContracts.filter(c => c.status === 'active'),
        error: null
      })
      
      supabase.from.mockReturnValue(mockQuery)

      const filters = { status: ['active'] }
      const result = await getContractAnalytics(filters)

      expect(result.success).toBe(true)
      expect(mockQuery.in).toHaveBeenCalledWith('status', ['active'])
    })

    it('should apply date range filters correctly', async () => {
      const { supabase } = require('@/lib/supabase')
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      }
      mockQuery.select.mockResolvedValue({
        data: mockContracts.slice(0, 2),
        error: null
      })
      
      supabase.from.mockReturnValue(mockQuery)

      const filters = {
        dateRange: {
          start: '2025-01-01',
          end: '2025-01-31'
        }
      }
      const result = await getContractAnalytics(filters)

      expect(result.success).toBe(true)
      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', '2025-01-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('created_at', '2025-01-31T23:59:59.999Z')
    })

    it('should apply value range filters correctly', async () => {
      const { supabase } = require('@/lib/supabase')
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      }
      mockQuery.select.mockResolvedValue({
        data: mockContracts.filter(c => c.contract_value >= 40000),
        error: null
      })
      
      supabase.from.mockReturnValue(mockQuery)

      const filters = {
        valueRange: {
          min: 40000,
          max: 100000
        }
      }
      const result = await getContractAnalytics(filters)

      expect(result.success).toBe(true)
      expect(mockQuery.gte).toHaveBeenCalledWith('contract_value', 40000)
      expect(mockQuery.lte).toHaveBeenCalledWith('contract_value', 100000)
    })
  })

  describe('calculateOverviewStats', () => {
    it('should calculate overview statistics correctly', () => {
      const stats = calculateOverviewStats(mockContracts)

      expect(stats.totalContracts).toBe(4)
      expect(stats.totalValue).toBe(168000)
      expect(stats.monthlyRecurringRevenue).toBe(8000) // active + signed only
      expect(stats.averageContractValue).toBe(42000)
      expect(stats.winRate).toBe(66.67) // 2 won (active + signed) out of 3 decided (won + lost)
    })

    it('should handle empty contract array', () => {
      const stats = calculateOverviewStats([])

      expect(stats.totalContracts).toBe(0)
      expect(stats.totalValue).toBe(0)
      expect(stats.monthlyRecurringRevenue).toBe(0)
      expect(stats.averageContractValue).toBe(0)
      expect(stats.winRate).toBe(0)
    })

    it('should handle no won or lost contracts for win rate', () => {
      const prospectsOnly = mockContracts.filter(c => c.status === 'prospect')
      const stats = calculateOverviewStats(prospectsOnly)

      expect(stats.winRate).toBe(0) // No decided contracts
    })
  })

  describe('calculatePipelineVelocity', () => {
    it('should calculate pipeline velocity correctly', () => {
      const velocity = calculatePipelineVelocity(mockContracts)

      expect(velocity.prospectToProposal).toBeGreaterThan(0)
      expect(velocity.proposalToSigned).toBeGreaterThan(0)
      expect(velocity.signedToActive).toBeGreaterThan(0)
      expect(velocity.overallVelocity).toBeGreaterThan(0)
    })

    it('should handle contracts without stage transitions', () => {
      const singleStageContracts = [
        {
          ...mockContracts[0],
          created_at: '2025-01-01T00:00:00Z',
          stage_changed_at: '2025-01-01T00:00:00Z'
        }
      ]

      const velocity = calculatePipelineVelocity(singleStageContracts)

      expect(velocity.prospectToProposal).toBe(0)
      expect(velocity.proposalToSigned).toBe(0)
      expect(velocity.signedToActive).toBe(0)
      expect(velocity.overallVelocity).toBe(0)
    })
  })

  describe('calculateRevenueForecasting', () => {
    it('should forecast revenue based on historical data', () => {
      const forecast = calculateRevenueForecasting(mockContracts, 6)

      expect(forecast.nextMonthProjection).toBeGreaterThan(0)
      expect(forecast.quarterProjection).toBeGreaterThan(0)
      expect(forecast.yearProjection).toBeGreaterThan(0)
      expect(forecast.forecastAccuracy).toBeGreaterThanOrEqual(0)
      expect(forecast.forecastAccuracy).toBeLessThanOrEqual(100)
      expect(forecast.trendDirection).toMatch(/^(up|down|stable)$/)
    })

    it('should handle insufficient historical data', () => {
      const limitedContracts = mockContracts.slice(0, 1)
      const forecast = calculateRevenueForecasting(limitedContracts, 2)

      expect(forecast.nextMonthProjection).toBeGreaterThanOrEqual(0)
      expect(forecast.forecastAccuracy).toBe(50) // Default for limited data
    })
  })

  describe('exportContractAnalytics', () => {
    it('should export analytics data as CSV', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: mockContracts,
          error: null
        })
      })

      const result = await exportContractAnalytics(undefined, 'csv')

      expect(result.success).toBe(true)
      expect(result.data?.filename).toContain('.csv')
      expect(result.data?.data).toContain('Contract ID,Status,Type')
      expect(result.data?.data).toContain('contract-1,active,armed')
    })

    it('should export analytics data as JSON', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: mockContracts,
          error: null
        })
      })

      const result = await exportContractAnalytics(undefined, 'json')

      expect(result.success).toBe(true)
      expect(result.data?.filename).toContain('.json')
      
      const exportedData = JSON.parse(result.data?.data || '{}')
      expect(exportedData.analytics).toBeDefined()
      expect(exportedData.contracts).toHaveLength(4)
    })

    it('should handle export with filters', async () => {
      const { supabase } = require('@/lib/supabase')
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis()
      }
      mockQuery.select.mockResolvedValue({
        data: mockContracts.filter(c => c.status === 'active'),
        error: null
      })
      
      supabase.from.mockReturnValue(mockQuery)

      const filters = { status: ['active'] }
      const result = await exportContractAnalytics(filters, 'json')

      expect(result.success).toBe(true)
      expect(mockQuery.in).toHaveBeenCalledWith('status', ['active'])
    })

    it('should handle database errors during export', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      })

      const result = await exportContractAnalytics(undefined, 'csv')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })
})