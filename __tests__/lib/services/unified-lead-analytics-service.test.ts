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
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0001',
          status: 'won',
          source: 'website',
          priority: 'high',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          estimatedValue: 50000,
          assignedManager: 'manager-1',
          clientInfo: {
            company: 'Test Corp',
            industry: 'Technology',
            employeeCount: 100,
            securityNeeds: ['patrol']
          }
        },
        {
          id: 'guard-1',
          type: 'guard',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '555-0002',
          status: 'hired',
          source: 'referral',
          priority: 'medium',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-10'),
          assignedManager: 'manager-1',
          guardInfo: {
            experience: 'senior',
            certifications: ['TOPS'],
            availability: 'full-time',
            preferredShifts: ['day']
          }
        },
        {
          id: 'client-2',
          type: 'client',
          firstName: 'Bob',
          lastName: 'Johnson',
          email: 'bob@example.com',
          phone: '555-0003',
          status: 'new',
          source: 'referral',
          priority: 'low',
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-03'),
          clientInfo: {
            company: 'Another Corp',
            industry: 'Healthcare',
            employeeCount: 50,
            securityNeeds: ['monitoring']
          }
        }
      ]

      mockUnifiedDashboardService.getUnifiedLeads.mockResolvedValue({
        success: true,
        data: mockLeads,
        message: 'Success'
      })

      const filters: FilterCriteria = {
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-01-31') }
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
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0001',
          status: 'won',
          source: 'website',
          priority: 'high',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          estimatedValue: 50000,
          clientInfo: {
            company: 'Test Corp',
            industry: 'Technology',
            employeeCount: 100,
            securityNeeds: ['patrol']
          }
        }
      ]

      mockUnifiedDashboardService.getUnifiedLeads.mockResolvedValue({
        success: true,
        data: mockClientLeads,
        message: 'Success'
      })

      const filters: FilterCriteria = {
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
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
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0001',
          status: 'new',
          source: 'website',
          priority: 'medium',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          clientInfo: {
            company: 'Test Corp',
            industry: 'Technology',
            employeeCount: 100,
            securityNeeds: ['patrol']
          }
        },
        {
          id: 'lead-2',
          type: 'guard',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '555-0002',
          status: 'hired',
          source: 'referral',
          priority: 'high',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-20'),
          guardInfo: {
            experience: 'senior',
            certifications: ['TOPS'],
            availability: 'full-time',
            preferredShifts: ['day']
          }
        }
      ]

      mockUnifiedDashboardService.getUnifiedLeads.mockResolvedValue({
        success: true,
        data: mockLeads,
        message: 'Success'
      })

      const filters: FilterCriteria = {
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-01-31') }
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
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-01-31') }
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
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-01-31') }
      }

      const result = await getUnifiedAnalytics(filters)

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to fetch unified leads')
    })
  })
})