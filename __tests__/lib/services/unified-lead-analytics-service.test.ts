import { getUnifiedAnalytics } from '@/lib/services/unified-lead-analytics-service'
import { FilterCriteria } from '@/lib/types/unified-leads'
import * as unifiedDashboardService from '@/lib/services/unified-lead-dashboard-service'

// Mock the dashboard service
jest.mock('@/lib/services/unified-lead-dashboard-service')

const mockUnifiedDashboardService = unifiedDashboardService as jest.Mocked<typeof unifiedDashboardService>

describe('Unified Lead Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUnifiedAnalytics', () => {
    it('should calculate comprehensive analytics from unified leads', async () => {
      const mockLeads = [
        {
          id: 'client-1',
          type: 'client',
          status: 'won',
          source: 'website',
          priority: 'high',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          estimatedValue: 50000,
          assignedManager: 'manager-1',
          clientInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '555-0001',
            serviceType: 'patrol',
            companyName: 'Test Corp'
          },
          sourceAttribution: {
            originalSource: 'website',
            sourceDetails: {}
          },
          conversionMetrics: {
            contactCount: 0
          },
          engagementScore: 50,
          responseTime: 24
        },
        {
          id: 'guard-1',
          type: 'guard',
          status: 'hired',
          source: 'referral',
          priority: 'medium',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-10'),
          assignedManager: 'manager-1',
          guardInfo: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            phone: '555-0002',
            hasSecurityExperience: true,
            hasLicense: true,
            preferredShifts: ['day'],
            preferredLocations: ['downtown'],
            availability: {
              fullTime: true,
              partTime: false,
              weekdays: true,
              weekends: false,
              nights: false,
              holidays: false
            },
            transportationAvailable: true
          },
          sourceAttribution: {
            originalSource: 'referral',
            sourceDetails: {}
          },
          conversionMetrics: {
            contactCount: 0
          },
          engagementScore: 70,
          responseTime: 12
        },
        {
          id: 'client-2',
          type: 'client',
          status: 'new',
          source: 'referral',
          priority: 'low',
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-03'),
          clientInfo: {
            firstName: 'Bob',
            lastName: 'Johnson',
            email: 'bob@example.com',
            phone: '555-0003',
            serviceType: 'monitoring',
            companyName: 'Another Corp'
          },
          sourceAttribution: {
            originalSource: 'referral',
            sourceDetails: {}
          },
          conversionMetrics: {
            contactCount: 0
          },
          engagementScore: 30,
          responseTime: 48
        }
      ]

      mockUnifiedDashboardService.getUnifiedLeads.mockResolvedValue({
        success: true,
        data: mockLeads,
        message: 'Success'
      })

      const filters: FilterCriteria = {
        dateRange: { start: '2024-01-01T00:00:00.000Z', end: '2024-01-31T23:59:59.999Z' }
      }

      const result = await getUnifiedAnalytics(filters)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        totalLeads: 3,
        clientLeads: 2,
        guardLeads: 1,
        conversionRate: expect.any(Number),
        averageResponseTime: expect.any(Number)
      })

      // Verify conversion rate calculation (2 converted out of 3 total = 66.67%)
      expect(result.data?.conversionRate).toBeCloseTo(66.67, 1)

      // Verify source performance
      expect(result.data?.sourcePerformance).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source: 'website',
            totalLeads: 1,
            conversions: 1,
            conversionRate: 100
          }),
          expect.objectContaining({
            source: 'referral',
            totalLeads: 2,
            conversions: 1,
            conversionRate: 50
          })
        ])
      )

      // Verify manager performance
      expect(result.data?.managerPerformance).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            managerId: 'manager-1',
            totalLeads: 2,
            conversions: 2,
            conversionRate: 100,
            averageResponseTime: expect.any(Number)
          })
        ])
      )
    })

    it('should handle lead type filtering', async () => {
      const mockClientLeads = [
        {
          id: 'client-1',
          type: 'client',
          status: 'won',
          source: 'website',
          priority: 'high',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          estimatedValue: 50000,
          clientInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '555-0001',
            serviceType: 'patrol',
            companyName: 'Test Corp'
          },
          sourceAttribution: {
            originalSource: 'website',
            sourceDetails: {}
          },
          conversionMetrics: {
            contactCount: 0
          },
          engagementScore: 50,
          responseTime: 24
        }
      ]

      mockUnifiedDashboardService.getUnifiedLeads.mockResolvedValue({
        success: true,
        data: mockClientLeads,
        message: 'Success'
      })

      const filters: FilterCriteria = {
        dateRange: { start: '2024-01-01T00:00:00.000Z', end: '2024-01-31T23:59:59.999Z' },
        leadType: ['client']
      }

      const result = await getUnifiedAnalytics(filters)

      expect(result.success).toBe(true)
      expect(result.data?.totalLeads).toBe(1)
      expect(result.data?.clientLeads).toBe(1)
      expect(result.data?.guardLeads).toBe(0)
    })

    it('should calculate trend data correctly', async () => {
      const mockLeads = [
        {
          id: 'lead-1',
          type: 'client',
          status: 'new',
          source: 'website',
          priority: 'medium',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          clientInfo: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '555-0001',
            serviceType: 'patrol',
            companyName: 'Test Corp'
          },
          sourceAttribution: {
            originalSource: 'website',
            sourceDetails: {}
          },
          conversionMetrics: {
            contactCount: 0
          },
          engagementScore: 50,
          responseTime: 24
        },
        {
          id: 'lead-2',
          type: 'guard',
          status: 'hired',
          source: 'referral',
          priority: 'high',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-20'),
          guardInfo: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            phone: '555-0002',
            hasSecurityExperience: true,
            hasLicense: true,
            preferredShifts: ['day'],
            preferredLocations: ['downtown'],
            availability: {
              fullTime: true,
              partTime: false,
              weekdays: true,
              weekends: false,
              nights: false,
              holidays: false
            },
            transportationAvailable: true
          },
          sourceAttribution: {
            originalSource: 'referral',
            sourceDetails: {}
          },
          conversionMetrics: {
            contactCount: 0
          },
          engagementScore: 70,
          responseTime: 12
        }
      ]

      mockUnifiedDashboardService.getUnifiedLeads.mockResolvedValue({
        success: true,
        data: mockLeads,
        message: 'Success'
      })

      const filters: FilterCriteria = {
        dateRange: { start: '2024-01-01T00:00:00.000Z', end: '2024-01-31T23:59:59.999Z' }
      }

      const result = await getUnifiedAnalytics(filters)

      expect(result.success).toBe(true)
      expect(result.data?.trendData).toBeDefined()
      expect(result.data?.trendData?.length).toBeGreaterThan(0)
    })

    it('should handle empty dataset gracefully', async () => {
      mockUnifiedDashboardService.getUnifiedLeads.mockResolvedValue({
        success: true,
        data: [],
        message: 'Success'
      })

      const filters: FilterCriteria = {
        dateRange: { start: '2024-01-01T00:00:00.000Z', end: '2024-01-31T23:59:59.999Z' }
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
    })

    it('should handle service errors', async () => {
      mockUnifiedDashboardService.getUnifiedLeads.mockResolvedValue({
        success: false,
        data: null,
        message: 'Service error'
      })

      const filters: FilterCriteria = {
        dateRange: { start: '2024-01-01T00:00:00.000Z', end: '2024-01-31T23:59:59.999Z' }
      }

      const result = await getUnifiedAnalytics(filters)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to fetch unified leads')
    })
  })
})