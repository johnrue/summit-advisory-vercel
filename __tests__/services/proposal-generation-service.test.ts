import { 
  generateProposal, 
  getProposalTemplates, 
  getProposalHistory,
  submitForApproval,
  reviewProposal,
  calculateProposalValue 
} from '@/lib/services/proposal-generation-service'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })
    }
  }
}))

describe('Proposal Generation Service', () => {
  const mockTemplate = {
    id: 'template-123',
    name: 'Armed Security Template',
    service_type: 'armed',
    content: 'Security services for {{clientName}} at {{siteName}}',
    pricing_structure: {
      baseRate: 25,
      rateType: 'hourly' as const,
      modifiers: [
        { type: 'armed', multiplier: 1.5, description: 'Armed guard premium' },
        { type: 'night', multiplier: 1.2, description: 'Night shift premium' }
      ],
      minimumHours: 4
    },
    required_variables: ['clientName', 'siteName', 'hours'],
    sections: [
      { title: 'Service Overview', content: 'Professional security services', order: 1 },
      { title: 'Pricing', content: 'Based on hourly rates', order: 2 }
    ],
    is_active: true,
    created_by: 'user-123',
    created_at: '2025-08-30T12:00:00Z',
    updated_at: '2025-08-30T12:00:00Z'
  }

  const mockContract = {
    id: 'contract-123',
    client_name: 'Acme Corporation',
    client_company: 'Acme Corp',
    contract_type: 'armed',
    estimated_value: 50000,
    start_date: '2025-09-01',
    end_date: '2026-08-31'
  }

  const mockProposalGeneration = {
    id: 'proposal-123',
    contract_id: 'contract-123',
    template_id: 'template-123',
    generated_content: 'Security services for Acme Corporation at Main Office',
    pricing_breakdown: {
      baseRate: 25,
      totalHours: 2080,
      modifiers: [{ type: 'armed', amount: 26000 }],
      subtotal: 78000,
      total: 78000
    },
    variables: { clientName: 'Acme Corporation', siteName: 'Main Office', hours: '2080' },
    status: 'draft',
    approval_status: null,
    created_by: 'user-123',
    created_at: '2025-08-30T12:00:00Z',
    updated_at: '2025-08-30T12:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getProposalTemplates', () => {
    it('should retrieve all templates when no service type specified', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [mockTemplate],
              error: null
            })
          })
        })
      })

      const result = await getProposalTemplates()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].name).toBe('Armed Security Template')
    })

    it('should filter templates by service type', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [mockTemplate],
                error: null
              })
            })
          })
        })
      })

      const result = await getProposalTemplates('armed')

      expect(result.success).toBe(true)
      expect(supabase.from().select().eq).toHaveBeenCalledWith('service_type', 'armed')
    })
  })

  describe('generateProposal', () => {
    it('should generate proposal successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      
      // Mock contract and template fetch
      supabase.from.mockImplementation((table: string) => {
        if (table === 'contracts') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockContract,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'proposal_templates') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockTemplate,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'proposal_generations') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProposalGeneration,
                  error: null
                })
              })
            })
          }
        }
        return {}
      })

      const proposalData = {
        contractId: 'contract-123',
        templateId: 'template-123',
        variables: {
          clientName: 'Acme Corporation',
          siteName: 'Main Office',
          hours: '2080'
        }
      }

      const result = await generateProposal(proposalData)

      expect(result.success).toBe(true)
      expect(result.data?.generatedContent).toContain('Acme Corporation')
      expect(result.data?.pricingBreakdown.total).toBe(78000)
    })

    it('should validate required variables', async () => {
      const proposalData = {
        contractId: 'contract-123',
        templateId: 'template-123',
        variables: {
          clientName: 'Acme Corporation'
          // Missing required variables
        }
      }

      const result = await generateProposal(proposalData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required variables')
    })

    it('should handle contract not found', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Contract not found' }
            })
          })
        })
      })

      const proposalData = {
        contractId: 'nonexistent-contract',
        templateId: 'template-123',
        variables: {}
      }

      const result = await generateProposal(proposalData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Contract not found')
    })
  })

  describe('calculateProposalValue', () => {
    it('should calculate basic hourly pricing', () => {
      const pricingStructure = {
        baseRate: 25,
        rateType: 'hourly' as const,
        modifiers: [],
        minimumHours: 4
      }

      const variables = {
        hours: '100'
      }

      const result = calculateProposalValue(pricingStructure, variables)

      expect(result.baseRate).toBe(25)
      expect(result.totalHours).toBe(100)
      expect(result.subtotal).toBe(2500)
      expect(result.total).toBe(2500)
    })

    it('should apply modifiers correctly', () => {
      const pricingStructure = {
        baseRate: 25,
        rateType: 'hourly' as const,
        modifiers: [
          { type: 'armed', multiplier: 1.5, description: 'Armed premium' },
          { type: 'night', multiplier: 1.2, description: 'Night premium' }
        ],
        minimumHours: 4
      }

      const variables = {
        hours: '100',
        armed: 'true',
        night: 'true'
      }

      const result = calculateProposalValue(pricingStructure, variables)

      expect(result.modifiers).toHaveLength(2)
      expect(result.total).toBeGreaterThan(result.subtotal)
    })

    it('should apply minimum hours', () => {
      const pricingStructure = {
        baseRate: 25,
        rateType: 'hourly' as const,
        modifiers: [],
        minimumHours: 10
      }

      const variables = {
        hours: '5' // Less than minimum
      }

      const result = calculateProposalValue(pricingStructure, variables)

      expect(result.totalHours).toBe(10) // Should use minimum
      expect(result.subtotal).toBe(250) // 10 hours * $25
    })
  })

  describe('getProposalHistory', () => {
    it('should retrieve proposal history for specific contract', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [mockProposalGeneration],
                error: null
              })
            })
          })
        })
      })

      const result = await getProposalHistory('contract-123')

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(supabase.from().select().eq).toHaveBeenCalledWith('contract_id', 'contract-123')
    })

    it('should retrieve all proposal history when no contract specified', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [mockProposalGeneration],
              error: null
            })
          })
        })
      })

      const result = await getProposalHistory()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
    })
  })

  describe('submitForApproval', () => {
    it('should submit proposal for approval successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      })

      const result = await submitForApproval('proposal-123', 'Ready for review')

      expect(result.success).toBe(true)
      expect(result.message).toContain('submitted for approval')
    })

    it('should handle proposal not found', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { code: 'PGRST116' }
          })
        })
      })

      const result = await submitForApproval('nonexistent-proposal')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Proposal not found')
    })
  })

  describe('reviewProposal', () => {
    it('should approve proposal successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      })

      const result = await reviewProposal('proposal-123', 'approve', 'Looks good')

      expect(result.success).toBe(true)
      expect(result.message).toContain('approved')
    })

    it('should reject proposal successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      })

      const result = await reviewProposal('proposal-123', 'reject', 'Needs changes')

      expect(result.success).toBe(true)
      expect(result.message).toContain('rejected')
    })

    it('should validate review action', async () => {
      const result = await reviewProposal('proposal-123', 'invalid' as any)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid action')
    })
  })
})