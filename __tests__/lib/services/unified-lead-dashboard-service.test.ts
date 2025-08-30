import { getUnifiedLeads, getUnifiedDashboardData } from '@/lib/services/unified-lead-dashboard-service'
import { FilterCriteria, UnifiedLead } from '@/lib/types/unified-leads'
import * as clientLeadService from '@/lib/services/client-lead-service'
import * as guardLeadService from '@/lib/services/guard-lead-service'

// Mock the service dependencies
jest.mock('@/lib/services/client-lead-service')
jest.mock('@/lib/services/guard-lead-service')

const mockClientLeadService = clientLeadService as jest.Mocked<typeof clientLeadService>
const mockGuardLeadService = guardLeadService as jest.Mocked<typeof guardLeadService>

describe('Unified Lead Dashboard Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUnifiedLeads', () => {
    const mockClientLeads = [
      {
        id: 'client-1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '555-0001',
        company: 'Test Corp',
        status: 'new',
        source: 'website',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]

    const mockGuardLeads = [
      {
        id: 'guard-1',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        phone: '555-0002',
        status: 'new',
        source: 'referral',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]

    it('should fetch and combine client and guard leads', async () => {
      mockClientLeadService.getClientLeads.mockResolvedValue({
        success: true,
        data: mockClientLeads,
        message: 'Success'
      })

      mockGuardLeadService.getGuardLeads.mockResolvedValue({
        success: true,
        data: mockGuardLeads,
        message: 'Success'
      })

      const filters: FilterCriteria = {
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') }
      }

      const result = await getUnifiedLeads(filters)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.[0]).toMatchObject({
        type: 'client',
        firstName: 'John',
        lastName: 'Doe'
      })
      expect(result.data?.[1]).toMatchObject({
        type: 'guard',
        firstName: 'Jane',
        lastName: 'Smith'
      })
    })

    it('should filter leads by type', async () => {
      mockClientLeadService.getClientLeads.mockResolvedValue({
        success: true,
        data: mockClientLeads,
        message: 'Success'
      })

      mockGuardLeadService.getGuardLeads.mockResolvedValue({
        success: true,
        data: mockGuardLeads,
        message: 'Success'
      })

      const filters: FilterCriteria = {
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
        leadType: ['client']
      }

      const result = await getUnifiedLeads(filters)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].type).toBe('client')
    })

    it('should handle service errors gracefully', async () => {
      mockClientLeadService.getClientLeads.mockResolvedValue({
        success: false,
        data: null,
        message: 'Client service error'
      })

      mockGuardLeadService.getGuardLeads.mockResolvedValue({
        success: true,
        data: mockGuardLeads,
        message: 'Success'
      })

      const filters: FilterCriteria = {
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') }
      }

      const result = await getUnifiedLeads(filters)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].type).toBe('guard')
    })

    it('should apply custom filters correctly', async () => {
      mockClientLeadService.getClientLeads.mockResolvedValue({
        success: true,
        data: mockClientLeads,
        message: 'Success'
      })

      mockGuardLeadService.getGuardLeads.mockResolvedValue({
        success: true,
        data: mockGuardLeads,
        message: 'Success'
      })

      const filters: FilterCriteria = {
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
        sources: ['website'],
        statuses: ['new']
      }

      const result = await getUnifiedLeads(filters)

      expect(result.success).toBe(true)
      expect(mockClientLeadService.getClientLeads).toHaveBeenCalledWith(
        expect.objectContaining({
          sources: ['website'],
          statuses: ['new']
        })
      )
      expect(mockGuardLeadService.getGuardLeads).toHaveBeenCalledWith(
        expect.objectContaining({
          sources: ['website'],
          statuses: ['new']
        })
      )
    })
  })

  describe('getUnifiedDashboardData', () => {
    it('should return comprehensive dashboard data', async () => {
      const mockUnifiedLeads: UnifiedLead[] = [
        {
          id: 'client-1',
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
            securityNeeds: ['patrol', 'monitoring']
          }
        },
        {
          id: 'guard-1',
          type: 'guard',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '555-0002',
          status: 'contacted',
          source: 'referral',
          priority: 'high',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          guardInfo: {
            experience: 'senior',
            certifications: ['TOPS'],
            availability: 'full-time',
            preferredShifts: ['day']
          }
        }
      ]

      // Mock the getUnifiedLeads function
      jest.spyOn({ getUnifiedLeads }, 'getUnifiedLeads').mockResolvedValue({
        success: true,
        data: mockUnifiedLeads,
        message: 'Success'
      })

      const filters: FilterCriteria = {
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') }
      }

      const result = await getUnifiedDashboardData(filters)

      expect(result.success).toBe(true)
      expect(result.data?.leads).toHaveLength(2)
      expect(result.data?.summary).toMatchObject({
        totalLeads: 2,
        clientLeads: 1,
        guardLeads: 1,
        newLeads: 1,
        contactedLeads: 1
      })
      expect(result.data?.analytics).toBeDefined()
    })

    it('should handle empty results', async () => {
      jest.spyOn({ getUnifiedLeads }, 'getUnifiedLeads').mockResolvedValue({
        success: true,
        data: [],
        message: 'Success'
      })

      const filters: FilterCriteria = {
        dateRange: { start: new Date('2024-01-01'), end: new Date('2024-12-31') }
      }

      const result = await getUnifiedDashboardData(filters)

      expect(result.success).toBe(true)
      expect(result.data?.leads).toHaveLength(0)
      expect(result.data?.summary.totalLeads).toBe(0)
    })
  })
})