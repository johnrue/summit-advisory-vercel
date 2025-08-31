import { getUnifiedAnalytics } from '@/lib/services/unified-lead-analytics-service'
import { UnifiedLead, FilterCriteria } from '@/lib/types/unified-leads'

// Mock data for analytics accuracy testing
const createMockLead = (overrides: Partial<UnifiedLead> = {}): UnifiedLead => ({
  id: 'test-lead',
  type: 'client',
  status: 'new',
  source: 'website',
  priority: 'medium',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  clientInfo: {
    firstName: 'Test',
    lastName: 'Lead',
    email: 'test@example.com',
    phone: '555-0000',
    serviceType: 'armed'
  },
  sourceAttribution: {
    originalSource: 'website',
    sourceDetails: {}
  },
  conversionMetrics: {
    contactCount: 0
  },
  engagementScore: 50,
  responseTime: 24,
  ...overrides
})

describe('Analytics Accuracy Tests - Conversion Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Conversion Rate Calculations', () => {
    it('should calculate client lead conversion rate accurately', async () => {
      const mockLeads: UnifiedLead[] = [
        createMockLead({ id: 'client-1', type: 'client', status: 'new' }),
        createMockLead({ id: 'client-2', type: 'client', status: 'contacted' }),
        createMockLead({ id: 'client-3', type: 'client', status: 'converted' }),
        createMockLead({ id: 'client-4', type: 'client', status: 'converted' }),
        createMockLead({ id: 'client-5', type: 'client', status: 'lost' }),
      ]

      // Mock the service to return our test data
      jest.doMock('@/lib/services/unified-lead-dashboard-service', () => ({
        getUnifiedLeads: jest.fn().mockResolvedValue({
          success: true,
          data: mockLeads,
          message: 'Success'
        })
      }))

      const { getUnifiedAnalytics } = await import('@/lib/services/unified-lead-analytics-service')
      
      const filters: FilterCriteria = {
        dateRange: { start: '2024-01-01', end: '2024-01-31' },
        leadType: ['client']
      }

      const result = await getUnifiedAnalytics(filters)

      expect(result.success).toBe(true)
      expect(result.data?.totalLeads).toBe(5)
      expect(result.data?.clientLeads).toBe(5)
      expect(result.data?.guardLeads).toBe(0)
      
      // 2 won out of 5 total = 40% conversion rate
      expect(result.data?.conversionRate).toBeCloseTo(40.0, 1)
    })

    it('should calculate guard lead conversion rate accurately', async () => {
      const mockLeads: UnifiedLead[] = [
        createMockLead({ id: 'guard-1', type: 'guard', status: 'new' }),
        createMockLead({ id: 'guard-2', type: 'guard', status: 'contacted' }),
        createMockLead({ id: 'guard-3', type: 'guard', status: 'qualified' }),
        createMockLead({ id: 'guard-4', type: 'guard', status: 'hired' }),
      ]

      jest.doMock('@/lib/services/unified-lead-dashboard-service', () => ({
        getUnifiedLeads: jest.fn().mockResolvedValue({
          success: true,
          data: mockLeads,
          message: 'Success'
        })
      }))

      const { getUnifiedAnalytics } = await import('@/lib/services/unified-lead-analytics-service')
      
      const filters: FilterCriteria = {
        dateRange: { start: '2024-01-01', end: '2024-01-31' },
        leadType: ['guard']
      }

      const result = await getUnifiedAnalytics(filters)

      expect(result.success).toBe(true)
      expect(result.data?.totalLeads).toBe(4)
      expect(result.data?.guardLeads).toBe(4)
      
      // 1 hired out of 4 total = 25% conversion rate
      expect(result.data?.conversionRate).toBeCloseTo(25.0, 1)
    })

    it('should calculate cross-pipeline conversion rate accurately', async () => {
      const mockLeads: UnifiedLead[] = [
        // Client leads: 3 total, 1 converted
        createMockLead({ id: 'client-1', type: 'client', status: 'new' }),
        createMockLead({ id: 'client-2', type: 'client', status: 'contacted' }),
        createMockLead({ id: 'client-3', type: 'client', status: 'converted' }),
        
        // Guard leads: 4 total, 2 converted
        createMockLead({ id: 'guard-1', type: 'guard', status: 'new' }),
        createMockLead({ id: 'guard-2', type: 'guard', status: 'contacted' }),
        createMockLead({ id: 'guard-3', type: 'guard', status: 'hired' }),
        createMockLead({ id: 'guard-4', type: 'guard', status: 'hired' }),
      ]

      jest.doMock('@/lib/services/unified-lead-dashboard-service', () => ({
        getUnifiedLeads: jest.fn().mockResolvedValue({
          success: true,
          data: mockLeads,
          message: 'Success'
        })
      }))

      const { getUnifiedAnalytics } = await import('@/lib/services/unified-lead-analytics-service')
      
      const filters: FilterCriteria = {
        dateRange: { start: '2024-01-01', end: '2024-01-31' }
      }

      const result = await getUnifiedAnalytics(filters)

      expect(result.success).toBe(true)
      expect(result.data?.totalLeads).toBe(7)
      expect(result.data?.clientLeads).toBe(3)
      expect(result.data?.guardLeads).toBe(4)
      
      // 3 converted out of 7 total = 42.86% conversion rate
      expect(result.data?.conversionRate).toBeCloseTo(42.86, 1)
    })
  })

  describe('Source Performance Accuracy', () => {
    it('should calculate source conversion rates correctly', async () => {
      const mockLeads: UnifiedLead[] = [
        // Website: 4 leads, 2 conversions = 50%
        createMockLead({ id: 'web-1', source: 'website', status: 'new' }),
        createMockLead({ id: 'web-2', source: 'website', status: 'converted' }),
        createMockLead({ id: 'web-3', source: 'website', status: 'hired', type: 'guard' }),
        createMockLead({ id: 'web-4', source: 'website', status: 'contacted' }),
        
        // Referral: 3 leads, 1 conversion = 33.33%
        createMockLead({ id: 'ref-1', source: 'referral', status: 'new' }),
        createMockLead({ id: 'ref-2', source: 'referral', status: 'converted' }),
        createMockLead({ id: 'ref-3', source: 'referral', status: 'contacted' }),
        
        // LinkedIn: 2 leads, 0 conversions = 0%
        createMockLead({ id: 'li-1', source: 'social-media', status: 'new' }),
        createMockLead({ id: 'li-2', source: 'social-media', status: 'qualified' }),
      ]

      jest.doMock('@/lib/services/unified-lead-dashboard-service', () => ({
        getUnifiedLeads: jest.fn().mockResolvedValue({
          success: true,
          data: mockLeads,
          message: 'Success'
        })
      }))

      const { getUnifiedAnalytics } = await import('@/lib/services/unified-lead-analytics-service')
      
      const filters: FilterCriteria = {
        dateRange: { start: '2024-01-01', end: '2024-01-31' }
      }

      const result = await getUnifiedAnalytics(filters)

      expect(result.success).toBe(true)
      expect(result.data?.sourcePerformance).toHaveLength(3)

      const websitePerf = result.data?.sourcePerformance?.find(s => s.source === 'website')
      expect(websitePerf).toMatchObject({
        source: 'website',
        totalLeads: 4,
        conversions: 2,
        conversionRate: 50
      })

      const referralPerf = result.data?.sourcePerformance?.find(s => s.source === 'referral')
      expect(referralPerf).toMatchObject({
        source: 'referral',
        totalLeads: 3,
        conversions: 1,
        conversionRate: 33.33
      })

      const socialMediaPerf = result.data?.sourcePerformance?.find(s => s.source === 'social-media')
      expect(socialMediaPerf).toMatchObject({
        source: 'social-media',
        totalLeads: 2,
        conversions: 0,
        conversionRate: 0
      })
    })
  })

  describe('Response Time Calculations', () => {
    it('should calculate average response time accurately', async () => {
      const mockLeads: UnifiedLead[] = [
        createMockLead({
          id: 'lead-1',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T14:00:00Z') // 4 hours
        }),
        createMockLead({
          id: 'lead-2',
          createdAt: new Date('2024-01-02T09:00:00Z'),
          updatedAt: new Date('2024-01-02T15:00:00Z') // 6 hours
        }),
        createMockLead({
          id: 'lead-3',
          createdAt: new Date('2024-01-03T11:00:00Z'),
          updatedAt: new Date('2024-01-03T13:00:00Z') // 2 hours
        }),
      ]

      jest.doMock('@/lib/services/unified-lead-dashboard-service', () => ({
        getUnifiedLeads: jest.fn().mockResolvedValue({
          success: true,
          data: mockLeads,
          message: 'Success'
        })
      }))

      const { getUnifiedAnalytics } = await import('@/lib/services/unified-lead-analytics-service')
      
      const filters: FilterCriteria = {
        dateRange: { start: '2024-01-01', end: '2024-01-31' }
      }

      const result = await getUnifiedAnalytics(filters)

      expect(result.success).toBe(true)
      // Average: (4 + 6 + 2) / 3 = 4 hours
      expect(result.data?.averageResponseTime).toBeCloseTo(4.0, 1)
    })
  })

  describe('Manager Performance Metrics', () => {
    it('should calculate manager performance accurately', async () => {
      const mockLeads: UnifiedLead[] = [
        // Manager 1: 4 leads, 2 conversions = 50%
        createMockLead({ 
          id: 'mgr1-1', 
          assignedManager: 'mgr-1', 
          status: 'new',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T14:00:00Z')
        }),
        createMockLead({ 
          id: 'mgr1-2', 
          assignedManager: 'mgr-1', 
          status: 'converted',
          createdAt: new Date('2024-01-01T09:00:00Z'),
          updatedAt: new Date('2024-01-01T15:00:00Z')
        }),
        createMockLead({ 
          id: 'mgr1-3', 
          assignedManager: 'mgr-1', 
          type: 'guard',
          status: 'hired',
          createdAt: new Date('2024-01-01T11:00:00Z'),
          updatedAt: new Date('2024-01-01T13:00:00Z')
        }),
        createMockLead({ 
          id: 'mgr1-4', 
          assignedManager: 'mgr-1', 
          status: 'contacted',
          createdAt: new Date('2024-01-01T08:00:00Z'),
          updatedAt: new Date('2024-01-01T16:00:00Z')
        }),
        
        // Manager 2: 2 leads, 0 conversions = 0%
        createMockLead({ 
          id: 'mgr2-1', 
          assignedManager: 'mgr-2', 
          status: 'new',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T12:00:00Z')
        }),
        createMockLead({ 
          id: 'mgr2-2', 
          assignedManager: 'mgr-2', 
          status: 'qualified',
          createdAt: new Date('2024-01-01T11:00:00Z'),
          updatedAt: new Date('2024-01-01T14:00:00Z')
        }),
      ]

      jest.doMock('@/lib/services/unified-lead-dashboard-service', () => ({
        getUnifiedLeads: jest.fn().mockResolvedValue({
          success: true,
          data: mockLeads,
          message: 'Success'
        })
      }))

      const { getUnifiedAnalytics } = await import('@/lib/services/unified-lead-analytics-service')
      
      const filters: FilterCriteria = {
        dateRange: { start: '2024-01-01', end: '2024-01-31' }
      }

      const result = await getUnifiedAnalytics(filters)

      expect(result.success).toBe(true)
      expect(result.data?.managerPerformance).toHaveLength(2)

      const mgr1Perf = result.data?.managerPerformance?.find(m => m.managerId === 'mgr-1')
      expect(mgr1Perf).toMatchObject({
        managerId: 'mgr-1',
        totalLeads: 4,
        conversions: 2,
        conversionRate: 50,
        averageResponseTime: expect.any(Number)
      })

      const mgr2Perf = result.data?.managerPerformance?.find(m => m.managerId === 'mgr-2')
      expect(mgr2Perf).toMatchObject({
        managerId: 'mgr-2',
        totalLeads: 2,
        conversions: 0,
        conversionRate: 0,
        averageResponseTime: expect.any(Number)
      })
    })
  })

  describe('Trend Data Accuracy', () => {
    it('should generate accurate daily trend data', async () => {
      const mockLeads: UnifiedLead[] = [
        // Day 1: 2 client, 1 guard, 1 conversion
        createMockLead({ id: 'day1-1', type: 'client', status: 'new', createdAt: new Date('2024-01-01') }),
        createMockLead({ id: 'day1-2', type: 'client', status: 'converted', createdAt: new Date('2024-01-01') }),
        createMockLead({ id: 'day1-3', type: 'guard', status: 'new', createdAt: new Date('2024-01-01') }),
        
        // Day 2: 1 client, 2 guard, 2 conversions
        createMockLead({ id: 'day2-1', type: 'client', status: 'converted', createdAt: new Date('2024-01-02') }),
        createMockLead({ id: 'day2-2', type: 'guard', status: 'hired', createdAt: new Date('2024-01-02') }),
        createMockLead({ id: 'day2-3', type: 'guard', status: 'contacted', createdAt: new Date('2024-01-02') }),
      ]

      jest.doMock('@/lib/services/unified-lead-dashboard-service', () => ({
        getUnifiedLeads: jest.fn().mockResolvedValue({
          success: true,
          data: mockLeads,
          message: 'Success'
        })
      }))

      const { getUnifiedAnalytics } = await import('@/lib/services/unified-lead-analytics-service')
      
      const filters: FilterCriteria = {
        dateRange: { start: '2024-01-01', end: '2024-01-02' }
      }

      const result = await getUnifiedAnalytics(filters)

      expect(result.success).toBe(true)
      expect(result.data?.trendData).toHaveLength(2)

      const day1Trend = result.data?.trendData?.find(t => t.date === '2024-01-01')
      expect(day1Trend).toMatchObject({
        date: '2024-01-01',
        clientLeads: 2,
        guardLeads: 1,
        conversions: 1
      })

      const day2Trend = result.data?.trendData?.find(t => t.date === '2024-01-02')
      expect(day2Trend).toMatchObject({
        date: '2024-01-02',
        clientLeads: 1,
        guardLeads: 2,
        conversions: 2
      })
    })
  })

  describe('Edge Cases and Data Integrity', () => {
    it('should handle empty datasets without errors', async () => {
      jest.doMock('@/lib/services/unified-lead-dashboard-service', () => ({
        getUnifiedLeads: jest.fn().mockResolvedValue({
          success: true,
          data: [],
          message: 'Success'
        })
      }))

      const { getUnifiedAnalytics } = await import('@/lib/services/unified-lead-analytics-service')
      
      const filters: FilterCriteria = {
        dateRange: { start: '2024-01-01', end: '2024-01-31' }
      }

      const result = await getUnifiedAnalytics(filters)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        totalLeads: 0,
        clientLeads: 0,
        guardLeads: 0,
        conversionRate: 0,
        averageResponseTime: 0
      })
      expect(result.data?.sourcePerformance).toHaveLength(0)
      expect(result.data?.managerPerformance).toHaveLength(0)
      expect(result.data?.trendData).toHaveLength(0)
    })

    it('should handle division by zero gracefully', async () => {
      const mockLeads: UnifiedLead[] = [
        createMockLead({ 
          id: 'lead-1', 
          status: 'new', // No conversions
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T10:00:00Z') // Same time = 0 response time
        }),
      ]

      jest.doMock('@/lib/services/unified-lead-dashboard-service', () => ({
        getUnifiedLeads: jest.fn().mockResolvedValue({
          success: true,
          data: mockLeads,
          message: 'Success'
        })
      }))

      const { getUnifiedAnalytics } = await import('@/lib/services/unified-lead-analytics-service')
      
      const filters: FilterCriteria = {
        dateRange: { start: '2024-01-01', end: '2024-01-31' }
      }

      const result = await getUnifiedAnalytics(filters)

      expect(result.success).toBe(true)
      expect(result.data?.conversionRate).toBe(0)
      expect(result.data?.averageResponseTime).toBe(0)
    })
  })
})