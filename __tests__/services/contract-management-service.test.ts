import { createContract, getContracts, updateContract, getContractById, deleteContract, updateContractStatus, getContractStats, createContractFromLead } from '@/lib/services/contract-management-service'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'manager-123' } }
      })
    }
  }
}))

describe('Contract Management Service', () => {
  const mockContractData = {
    clientName: 'Acme Corporation',
    clientEmail: 'security@acme.com',
    clientPhone: '555-0123',
    companyName: 'Acme Corp',
    serviceType: 'armed',
    estimatedValue: 50000,
    startDate: '2025-09-01',
    endDate: '2026-08-31',
    notes: 'High-priority client requiring armed security'
  }

  const mockDbContract = {
    id: 'contract-123',
    client_name: 'Acme Corporation',
    client_company: 'Acme Corp',
    client_contact_email: 'security@acme.com',
    client_contact_phone: '555-0123',
    contract_title: 'Armed Security Services',
    contract_type: 'armed',
    service_description: 'High-priority client requiring armed security',
    contract_value: 50000,
    monthly_value: 4166.67,
    payment_terms: 'net_30',
    billing_frequency: 'monthly',
    start_date: '2025-09-01',
    end_date: '2026-08-31',
    renewal_date: '2026-09-30',
    status: 'prospect',
    assigned_manager: 'manager-123',
    stage_changed_at: '2025-08-30T12:00:00Z',
    stage_changed_by: 'manager-123',
    created_at: '2025-08-30T12:00:00Z',
    updated_at: '2025-08-30T12:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createContract', () => {
    it('should create a contract successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockDbContract,
              error: null
            })
          })
        })
      })

      const result = await createContract(mockContractData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.clientName).toBe('Acme Corporation')
      expect(result.data?.serviceType).toBe('armed')
      expect(result.data?.estimatedValue).toBe(50000)
    })

    it('should validate required fields', async () => {
      const incompleteData = { ...mockContractData, clientName: '' }

      const result = await createContract(incompleteData as any)

      expect(result.success).toBe(false)
      expect(result.error).toContain('clientName')
    })

    it('should validate email format', async () => {
      const invalidEmailData = { ...mockContractData, clientEmail: 'invalid-email' }

      const result = await createContract(invalidEmailData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid email format')
    })

    it('should validate date range', async () => {
      const invalidDateData = { ...mockContractData, startDate: '2025-09-01', endDate: '2025-08-01' }

      const result = await createContract(invalidDateData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Start date must be before end date')
    })

    it('should handle database errors', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database constraint violation' }
            })
          })
        })
      })

      const result = await createContract(mockContractData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database constraint violation')
    })
  })

  describe('getContracts', () => {
    it('should retrieve contracts with pagination', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: [mockDbContract],
              error: null,
              count: 1
            })
          })
        })
      })

      const result = await getContracts(undefined, 1, 25)

      expect(result.success).toBe(true)
      expect(result.data?.contracts).toHaveLength(1)
      expect(result.data?.pagination.total).toBe(1)
    })

    it('should apply filters correctly', async () => {
      const { supabase } = require('@/lib/supabase')
      
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockDbContract],
          error: null,
          count: 1
        })
      }
      
      supabase.from.mockReturnValue(mockQuery)

      const filters = {
        status: ['prospect', 'proposal'],
        serviceType: ['armed'],
        search: 'Acme'
      }

      const result = await getContracts(filters)

      expect(result.success).toBe(true)
      expect(mockQuery.in).toHaveBeenCalledWith('status', ['prospect', 'proposal'])
      expect(mockQuery.in).toHaveBeenCalledWith('contract_type', ['armed'])
      expect(mockQuery.or).toHaveBeenCalled()
    })

    it('should handle empty results', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: [],
              error: null,
              count: 0
            })
          })
        })
      })

      const result = await getContracts()

      expect(result.success).toBe(true)
      expect(result.data?.contracts).toHaveLength(0)
      expect(result.data?.pagination.total).toBe(0)
    })
  })

  describe('updateContract', () => {
    it('should update contract successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      
      const updatedContract = { ...mockDbContract, client_name: 'Updated Corporation' }
      
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedContract,
                error: null
              })
            })
          })
        })
      })

      const updates = { clientName: 'Updated Corporation' }
      const result = await updateContract('contract-123', updates)

      expect(result.success).toBe(true)
      expect(result.data?.clientName).toBe('Updated Corporation')
    })

    it('should handle contract not found', async () => {
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

      const result = await updateContract('nonexistent-id', { clientName: 'Test' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Contract not found')
    })
  })

  describe('updateContractStatus', () => {
    it('should update contract status successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      
      const updatedContract = { ...mockDbContract, status: 'proposal' }
      
      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedContract,
                error: null
              })
            })
          })
        })
      })

      const result = await updateContractStatus('contract-123', 'proposal')

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('proposal')
    })

    it('should validate status values', async () => {
      const result = await updateContractStatus('contract-123', 'invalid-status')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid status')
    })
  })

  describe('getContractStats', () => {
    it('should calculate contract statistics', async () => {
      const { supabase } = require('@/lib/supabase')
      
      const mockContracts = [
        { status: 'active', contract_type: 'armed', contract_value: 50000, monthly_value: 4000 },
        { status: 'signed', contract_type: 'unarmed', contract_value: 30000, monthly_value: 2500 },
        { status: 'lost', contract_type: 'armed', contract_value: 25000, monthly_value: 2000 }
      ]
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: mockContracts,
          error: null
        })
      })

      const result = await getContractStats()

      expect(result.success).toBe(true)
      expect(result.data?.totalContracts).toBe(3)
      expect(result.data?.totalValue).toBe(105000)
      expect(result.data?.monthlyRecurringRevenue).toBe(6500) // active + signed
      expect(result.data?.averageContractValue).toBe(35000)
      expect(result.data?.winRate).toBe(66.67) // 2 won out of 3 processed (won + lost)
    })
  })

  describe('createContractFromLead', () => {
    it('should create contract from lead successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      
      const mockLead = {
        id: 'lead-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@acme.com',
        phone: '555-0123',
        company: 'Acme Corp',
        service_type: 'armed',
        estimated_value: 50000,
        message: 'Need security services'
      }
      
      // Mock lead fetch
      supabase.from.mockImplementation((table: string) => {
        if (table === 'client_leads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockLead,
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          }
        }
        if (table === 'contracts') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockDbContract,
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          }
        }
        return {}
      })

      const result = await createContractFromLead('lead-123')

      expect(result.success).toBe(true)
      expect(result.data?.clientName).toBe('John Doe')
      expect(result.data?.serviceType).toBe('armed')
    })

    it('should handle lead not found', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Lead not found' }
            })
          })
        })
      })

      const result = await createContractFromLead('nonexistent-lead')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Lead not found')
    })
  })

  describe('deleteContract', () => {
    it('should delete contract successfully', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      })

      const result = await deleteContract('contract-123')

      expect(result.success).toBe(true)
      expect(result.message).toContain('deleted successfully')
    })

    it('should handle contract not found during deletion', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: { code: 'PGRST116' }
          })
        })
      })

      const result = await deleteContract('nonexistent-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Contract not found')
    })
  })
})