import {
  getRenewalPipeline,
  createRenewalOpportunities,
  processPendingRenewalAlerts,
  updateRenewalStatus,
  getChurnRiskAnalysis
} from '@/lib/services/contract-renewal-service'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })
    }
  }
}))

describe('Contract Renewal Service', () => {
  const mockContracts = [
    {
      id: 'contract-1',
      client_name: 'Acme Corp',
      status: 'active',
      contract_value: 60000,
      monthly_value: 5000,
      start_date: '2024-01-01',
      end_date: '2025-12-31',
      renewal_date: '2025-12-31',
      assigned_manager: 'manager-1'
    },
    {
      id: 'contract-2',
      client_name: 'TechCorp',
      status: 'active', 
      contract_value: 48000,
      monthly_value: 4000,
      start_date: '2024-06-01',
      end_date: '2025-05-31',
      renewal_date: '2025-05-31',
      assigned_manager: 'manager-2'
    }
  ]

  const mockRenewalOpportunities = [
    {
      id: 'renewal-1',
      contract_id: 'contract-1',
      renewal_date: '2025-12-31',
      current_value: 60000,
      projected_value: 66000,
      expansion_opportunities: ['additional_sites', 'premium_services'],
      risk_level: 'low',
      status: 'identified',
      assigned_manager: 'manager-1',
      created_at: '2025-08-30T00:00:00Z'
    },
    {
      id: 'renewal-2', 
      contract_id: 'contract-2',
      renewal_date: '2025-05-31',
      current_value: 48000,
      projected_value: 52800,
      expansion_opportunities: ['armed_upgrade'],
      risk_level: 'medium',
      status: 'in_progress',
      assigned_manager: 'manager-2',
      created_at: '2025-08-30T00:00:00Z'
    }
  ]

  const mockRenewalAlerts = [
    {
      id: 'alert-1',
      contract_id: 'contract-1',
      alert_type: '90_day_notice',
      scheduled_date: '2025-10-01',
      status: 'pending',
      message: '90-day renewal notice for Acme Corp contract'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getRenewalPipeline', () => {
    it('should retrieve renewal pipeline within specified days', async () => {
      const { supabase } = require('@/lib/supabase')
      
      // Mock the complex join query
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockRenewalOpportunities.map(renewal => ({
                  ...renewal,
                  contract: mockContracts.find(c => c.id === renewal.contract_id)
                })),
                error: null
              })
            })
          })
        })
      })

      const result = await getRenewalPipeline(180)

      expect(result.success).toBe(true)
      expect(result.data?.totalOpportunities).toBe(2)
      expect(result.data?.totalValue).toBe(108000) // Current values
      expect(result.data?.totalProjectedValue).toBe(118800) // Projected values
      expect(result.data?.opportunitiesByStatus.identified).toBe(1)
      expect(result.data?.opportunitiesByStatus.in_progress).toBe(1)
    })

    it('should handle empty renewal pipeline', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      })

      const result = await getRenewalPipeline(90)

      expect(result.success).toBe(true)
      expect(result.data?.totalOpportunities).toBe(0)
      expect(result.data?.totalValue).toBe(0)
      expect(result.data?.opportunities).toHaveLength(0)
    })
  })

  describe('createRenewalOpportunities', () => {
    it('should create renewal opportunities for expiring contracts', async () => {
      const { supabase } = require('@/lib/supabase')
      
      // Mock contracts query and renewal opportunity creation
      supabase.from.mockImplementation((table: string) => {
        if (table === 'contracts') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockResolvedValue({
                    data: mockContracts,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'contract_renewals') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [], // No existing renewals
                error: null
              })
            }),
            insert: jest.fn().mockResolvedValue({
              data: mockRenewalOpportunities,
              error: null
            })
          }
        }
        return {}
      })

      const result = await createRenewalOpportunities()

      expect(result.success).toBe(true)
      expect(result.data?.created).toBe(2)
      expect(result.data?.opportunities).toHaveLength(2)
    })

    it('should skip contracts that already have renewal opportunities', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockImplementation((table: string) => {
        if (table === 'contracts') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockResolvedValue({
                    data: mockContracts,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'contract_renewals') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [mockRenewalOpportunities[0]], // One existing renewal
                error: null
              })
            }),
            insert: jest.fn().mockResolvedValue({
              data: [mockRenewalOpportunities[1]], // Only create one new
              error: null
            })
          }
        }
        return {}
      })

      const result = await createRenewalOpportunities()

      expect(result.success).toBe(true)
      expect(result.data?.created).toBe(1) // Only one new opportunity
      expect(result.data?.skipped).toBe(1) // One already existed
    })
  })

  describe('processPendingRenewalAlerts', () => {
    it('should process pending renewal alerts successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      
      // Mock notification system response
      const mockNotificationResponse = { success: true, sent: 1 }
      
      supabase.from.mockImplementation((table: string) => {
        if (table === 'renewal_alerts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: mockRenewalAlerts,
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                error: null
              })
            })
          }
        }
        return {}
      })

      // Mock the notification service call
      const mockSendNotification = jest.fn().mockResolvedValue(mockNotificationResponse)
      
      const result = await processPendingRenewalAlerts()

      expect(result.success).toBe(true)
      expect(result.data?.processed).toBe(1)
      expect(result.data?.alerts).toHaveLength(1)
    })

    it('should handle no pending alerts', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      const result = await processPendingRenewalAlerts()

      expect(result.success).toBe(true)
      expect(result.data?.processed).toBe(0)
      expect(result.data?.alerts).toHaveLength(0)
    })
  })

  describe('updateRenewalStatus', () => {
    it('should update renewal status successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      
      const updatedRenewal = { ...mockRenewalOpportunities[0], status: 'completed' }
      
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedRenewal,
                error: null
              })
            })
          })
        })
      })

      const result = await updateRenewalStatus('renewal-1', 'completed', 'Contract renewed successfully')

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('completed')
    })

    it('should validate renewal status values', async () => {
      const result = await updateRenewalStatus('renewal-1', 'invalid_status' as any)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid status')
    })

    it('should handle renewal not found', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        })
      })

      const result = await updateRenewalStatus('nonexistent-renewal', 'completed')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Renewal opportunity not found')
    })
  })

  describe('getChurnRiskAnalysis', () => {
    it('should analyze churn risk for active contracts', async () => {
      const { supabase } = require('@/lib/supabase')
      
      // Mock contracts with various risk indicators
      const contractsWithRisk = [
        {
          ...mockContracts[0],
          support_tickets: 15, // High tickets = risk
          payment_delays: 2,   // Payment issues = risk
          service_quality_score: 6.5, // Lower score = risk
          last_contact_date: '2025-06-01' // Old contact = risk
        },
        {
          ...mockContracts[1],
          support_tickets: 3,  // Low tickets = good
          payment_delays: 0,   // No payment issues = good
          service_quality_score: 9.2, // High score = good
          last_contact_date: '2025-08-25' // Recent contact = good
        }
      ]

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: contractsWithRisk,
            error: null
          })
        })
      })

      const result = await getChurnRiskAnalysis()

      expect(result.success).toBe(true)
      expect(result.data?.totalContracts).toBe(2)
      expect(result.data?.riskDistribution.high).toBeGreaterThanOrEqual(0)
      expect(result.data?.riskDistribution.medium).toBeGreaterThanOrEqual(0)
      expect(result.data?.riskDistribution.low).toBeGreaterThanOrEqual(0)
      expect(result.data?.highRiskContracts).toBeDefined()
      expect(result.data?.recommendations).toBeDefined()
    })

    it('should handle no active contracts for churn analysis', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      const result = await getChurnRiskAnalysis()

      expect(result.success).toBe(true)
      expect(result.data?.totalContracts).toBe(0)
      expect(result.data?.riskDistribution.high).toBe(0)
      expect(result.data?.riskDistribution.medium).toBe(0)
      expect(result.data?.riskDistribution.low).toBe(0)
      expect(result.data?.highRiskContracts).toHaveLength(0)
    })

    it('should provide retention strategies for high-risk contracts', async () => {
      const { supabase } = require('@/lib/supabase')
      
      const highRiskContract = {
        ...mockContracts[0],
        support_tickets: 20,
        payment_delays: 5,
        service_quality_score: 4.0,
        last_contact_date: '2025-01-01'
      }

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [highRiskContract],
            error: null
          })
        })
      })

      const result = await getChurnRiskAnalysis()

      expect(result.success).toBe(true)
      expect(result.data?.riskDistribution.high).toBe(1)
      expect(result.data?.highRiskContracts).toHaveLength(1)
      expect(result.data?.recommendations).toContain('Immediate manager contact')
      expect(result.data?.retentionStrategies).toBeDefined()
      expect(result.data?.retentionStrategies.length).toBeGreaterThan(0)
    })
  })
})