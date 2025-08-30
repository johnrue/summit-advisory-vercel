import { getLeadAnalytics, exportLeadData, getConversionFunnel } from '@/lib/services/lead-analytics-service'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis()
  }
}))

describe('Lead Analytics Service', () => {
  const mockFilters = {
    startDate: '2025-08-01T00:00:00Z',
    endDate: '2025-08-31T23:59:59Z',
    sources: ['website_form', 'referral'],
    managers: ['manager1', 'manager2']
  }

  const mockLeadsData = [
    {
      id: '1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '555-0123',
      service_type: 'armed',
      source_type: 'website_form',
      status: 'won',
      estimated_value: 5000,
      assigned_to: 'manager1',
      assigned_at: '2025-08-15T10:00:00Z',
      last_contact_date: '2025-08-15T11:30:00Z',
      created_at: '2025-08-15T09:00:00Z',
      source_details: { campaignName: 'Summer Security' }
    },
    {
      id: '2',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      phone: '555-0124',
      service_type: 'unarmed',
      source_type: 'referral',
      status: 'prospect',
      estimated_value: 3000,
      assigned_to: 'manager2',
      assigned_at: '2025-08-20T14:00:00Z',
      last_contact_date: null,
      created_at: '2025-08-20T13:00:00Z',
      source_details: { campaignName: 'Referral Program' }
    },
    {
      id: '3',
      first_name: 'Bob',
      last_name: 'Johnson',
      email: 'bob@example.com',
      phone: '555-0125',
      service_type: 'executive',
      source_type: 'website_form',
      status: 'contacted',
      estimated_value: 15000,
      assigned_to: 'manager1',
      assigned_at: '2025-08-25T16:00:00Z',
      last_contact_date: '2025-08-25T17:00:00Z',
      created_at: '2025-08-25T15:00:00Z',
      source_details: { eventName: 'Corporate Event' }
    }
  ]

  const mockManagersData = [
    {
      user_id: 'manager1',
      users: { first_name: 'Alice', last_name: 'Manager' }
    },
    {
      user_id: 'manager2',
      users: { first_name: 'Bob', last_name: 'Manager' }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getLeadAnalytics', () => {
    it('should calculate comprehensive analytics correctly', async () => {
      const { supabase } = require('@/lib/supabase')

      // Mock the main leads query
      supabase.from.mockImplementation((table: string) => {
        if (table === 'client_leads') {
          return {
            select: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            data: mockLeadsData,
            error: null
          }
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            data: mockManagersData,
            error: null
          }
        }
        return { data: [], error: null }
      })

      const result = await getLeadAnalytics(mockFilters)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()

      const analytics = result.data!

      // Test overview metrics
      expect(analytics.overview.totalLeads).toBe(3)
      expect(analytics.overview.conversionRate).toBeCloseTo(33.33, 2) // 1 won out of 3
      expect(analytics.overview.averageValue).toBeCloseTo(7666.67, 2) // Average of 5000, 3000, 15000

      // Test source performance
      expect(analytics.sourcePerformance).toHaveLength(2)
      expect(analytics.sourcePerformance[0].source).toBe('website_form')
      expect(analytics.sourcePerformance[0].totalLeads).toBe(2)
      expect(analytics.sourcePerformance[0].convertedLeads).toBe(1)
      expect(analytics.sourcePerformance[0].conversionRate).toBe(50)

      // Test status distribution
      expect(analytics.statusDistribution).toHaveLength(3)
      expect(analytics.statusDistribution.find(s => s.status === 'won')?.count).toBe(1)
      expect(analytics.statusDistribution.find(s => s.status === 'prospect')?.count).toBe(1)
      expect(analytics.statusDistribution.find(s => s.status === 'contacted')?.count).toBe(1)

      // Test manager performance
      expect(analytics.managerPerformance).toHaveLength(2)
      const manager1Perf = analytics.managerPerformance.find(m => m.managerId === 'manager1')
      expect(manager1Perf?.assignedLeads).toBe(2)
      expect(manager1Perf?.convertedLeads).toBe(1)
      expect(manager1Perf?.conversionRate).toBe(50)
      expect(manager1Perf?.managerName).toBe('Alice Manager')

      // Test time series data generation
      expect(analytics.timeSeriesData).toBeInstanceOf(Array)
      expect(analytics.timeSeriesData.length).toBeGreaterThan(0)

      // Test top performing campaigns
      expect(analytics.topPerformingCampaigns).toBeInstanceOf(Array)
      expect(analytics.topPerformingCampaigns.length).toBe(2)
    })

    it('should handle empty data gracefully', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        data: [],
        error: null
      }))

      const result = await getLeadAnalytics(mockFilters)

      expect(result.success).toBe(true)
      expect(result.data?.overview.totalLeads).toBe(0)
      expect(result.data?.overview.conversionRate).toBe(0)
      expect(result.data?.overview.averageValue).toBe(0)
      expect(result.data?.sourcePerformance).toHaveLength(0)
      expect(result.data?.statusDistribution).toHaveLength(0)
      expect(result.data?.managerPerformance).toHaveLength(0)
    })

    it('should handle database errors', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        data: null,
        error: { message: 'Database connection failed' }
      }))

      const result = await getLeadAnalytics(mockFilters)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database connection failed')
    })

    it('should calculate growth rates correctly', async () => {
      const { supabase } = require('@/lib/supabase')

      // Mock current period with 3 leads
      const currentPeriodMock = jest.fn()
        .mockResolvedValueOnce({ data: mockLeadsData, error: null })
        // Mock previous period with 2 leads
        .mockResolvedValueOnce({ data: mockLeadsData.slice(0, 2), error: null })
        .mockResolvedValue({ data: [], error: null })

      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        then: currentPeriodMock
      }))

      const result = await getLeadAnalytics(mockFilters)

      expect(result.success).toBe(true)
      expect(result.data?.overview.growthRate).toBe(50) // (3-2)/2 * 100 = 50%
    })

    it('should calculate manager response times correctly', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockImplementation((table: string) => {
        if (table === 'client_leads') {
          return {
            select: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            data: mockLeadsData,
            error: null
          }
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            data: mockManagersData,
            error: null
          }
        }
        return { data: [], error: null }
      })

      const result = await getLeadAnalytics(mockFilters)

      expect(result.success).toBe(true)
      
      const manager1 = result.data?.managerPerformance.find(m => m.managerId === 'manager1')
      expect(manager1?.averageResponseTime).toBe(90) // 1.5 hours = 90 minutes
    })
  })

  describe('exportLeadData', () => {
    it('should export lead data as CSV successfully', async () => {
      const { supabase } = require('@/lib/supabase')

      const mockExportData = [
        {
          ...mockLeadsData[0],
          users: { first_name: 'Alice', last_name: 'Manager' }
        },
        {
          ...mockLeadsData[1],
          users: { first_name: 'Bob', last_name: 'Manager' }
        }
      ]

      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        data: mockExportData,
        error: null
      }))

      const result = await exportLeadData(mockFilters, 'csv')

      expect(result.success).toBe(true)
      expect(result.data?.data).toBeDefined()
      expect(result.data?.filename).toMatch(/leads_export_\d{4}-\d{2}-\d{2}\.csv/)
      
      // Verify CSV content
      const csvContent = result.data!.data
      expect(csvContent).toContain('ID,First Name,Last Name,Email,Phone')
      expect(csvContent).toContain('john@example.com')
      expect(csvContent).toContain('jane@example.com')
    })

    it('should handle empty export data', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        data: [],
        error: null
      }))

      const result = await exportLeadData(mockFilters, 'csv')

      expect(result.success).toBe(false)
      expect(result.error).toBe('No leads found for export')
    })

    it('should handle export database errors', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        data: null,
        error: { message: 'Export query failed' }
      }))

      const result = await exportLeadData(mockFilters, 'csv')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Export query failed')
    })
  })

  describe('getConversionFunnel', () => {
    it('should calculate conversion funnel correctly', async () => {
      const { supabase } = require('@/lib/supabase')

      const mockFunnelData = [
        { status: 'prospect' },
        { status: 'contacted' },
        { status: 'qualified' },
        { status: 'qualified' },
        { status: 'won' }
      ]

      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        data: mockFunnelData,
        error: null
      }))

      const result = await getConversionFunnel(mockFilters)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.length).toBe(6) // All funnel stages

      const prospectStage = result.data?.find(stage => stage.stage === 'Prospect')
      const qualifiedStage = result.data?.find(stage => stage.stage === 'Qualified')
      const wonStage = result.data?.find(stage => stage.stage === 'Won')

      expect(prospectStage?.count).toBe(1)
      expect(prospectStage?.percentage).toBe(20) // 1/5 * 100

      expect(qualifiedStage?.count).toBe(2)
      expect(qualifiedStage?.percentage).toBe(40) // 2/5 * 100

      expect(wonStage?.count).toBe(1)
      expect(wonStage?.percentage).toBe(20) // 1/5 * 100
    })

    it('should handle empty funnel data', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        data: [],
        error: null
      }))

      const result = await getConversionFunnel(mockFilters)

      expect(result.success).toBe(true)
      expect(result.data?.length).toBe(6) // All funnel stages should be present
      
      result.data?.forEach(stage => {
        expect(stage.count).toBe(0)
        expect(stage.percentage).toBe(0)
      })
    })

    it('should handle funnel database errors', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        data: null,
        error: { message: 'Funnel query failed' }
      }))

      const result = await getConversionFunnel(mockFilters)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Funnel query failed')
    })
  })

  describe('time series analysis', () => {
    it('should generate weekly time series data correctly', async () => {
      const { supabase } = require('@/lib/supabase')

      // Mock data spanning multiple weeks
      const timeSeriesData = [
        { ...mockLeadsData[0], created_at: '2025-08-01T09:00:00Z' },
        { ...mockLeadsData[1], created_at: '2025-08-08T09:00:00Z' },
        { ...mockLeadsData[2], created_at: '2025-08-15T09:00:00Z' }
      ]

      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        data: timeSeriesData,
        error: null
      }))

      const result = await getLeadAnalytics({
        startDate: '2025-08-01T00:00:00Z',
        endDate: '2025-08-31T23:59:59Z'
      })

      expect(result.success).toBe(true)
      expect(result.data?.timeSeriesData).toBeDefined()
      expect(result.data?.timeSeriesData.length).toBeGreaterThan(3) // Should have multiple weeks
    })
  })
})