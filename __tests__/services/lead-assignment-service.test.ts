import { autoAssignLead, manualAssignLead, getManagerWorkloads, findMatchingRules } from '@/lib/services/lead-assignment-service'
import type { Lead } from '@/lib/services/lead-management-service'

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  }
}))

// Mock EmailService
jest.mock('@/lib/utils/email-service', () => ({
  EmailService: {
    sendLeadAssignmentNotification: jest.fn().mockResolvedValue({ success: true })
  }
}))

describe('Lead Assignment Service', () => {
  const mockLead: Lead = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '(555) 123-4567',
    sourceType: 'referral',
    sourceDetails: {},
    serviceType: 'executive',
    message: 'Need executive protection',
    estimatedValue: 15000,
    status: 'prospect',
    assignedTo: undefined,
    assignedAt: undefined,
    qualificationScore: 0,
    qualificationNotes: undefined,
    lastContactDate: undefined,
    nextFollowUpDate: undefined,
    contactCount: 0,
    convertedToContract: false,
    contractSignedDate: undefined,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  const mockManagers = [
    {
      user_id: 'manager1',
      users: {
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice@example.com'
      },
      roles: { name: 'manager' }
    },
    {
      user_id: 'manager2', 
      users: {
        first_name: 'Bob',
        last_name: 'Smith',
        email: 'bob@example.com'
      },
      roles: { name: 'manager' }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getManagerWorkloads', () => {
    it('should calculate manager workloads correctly', async () => {
      const { supabase } = require('@/lib/supabase')
      
      // Mock manager fetch
      supabase.from.mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: false,
            data: mockManagers,
            error: null
          }
        }
        if (table === 'client_leads') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            count: 5, // Mock active leads count
            data: [
              { assigned_at: '2024-01-01T00:00:00Z', last_contact_date: '2024-01-01T01:00:00Z' }
            ],
            error: null
          }
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          count: 0,
          data: [],
          error: null
        }
      })

      const result = await getManagerWorkloads()

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.length).toBe(2)
      expect(result.data?.[0].firstName).toBe('Alice')
      expect(result.data?.[0].lastName).toBe('Johnson')
    })

    it('should handle database errors gracefully', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: null,
        error: { message: 'Database connection failed' }
      }))

      const result = await getManagerWorkloads()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to fetch managers')
    })
  })

  describe('findMatchingRules', () => {
    it('should find high-value lead rule', async () => {
      const highValueLead = { ...mockLead, estimatedValue: 15000 }
      
      const result = await findMatchingRules(highValueLead)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.length).toBeGreaterThan(0)
      expect(result.data?.[0].name).toBe('High Value Leads - Round Robin')
    })

    it('should find executive protection rule', async () => {
      const executiveLead = { ...mockLead, serviceType: 'executive' }
      
      const result = await findMatchingRules(executiveLead)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.some(rule => rule.name === 'Executive Protection Specialist')).toBe(true)
    })

    it('should find referral rule', async () => {
      const referralLead = { ...mockLead, sourceType: 'referral' }
      
      const result = await findMatchingRules(referralLead)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.some(rule => rule.name === 'Referral Priority Assignment')).toBe(true)
    })

    it('should always include default rule', async () => {
      const basicLead = { ...mockLead, estimatedValue: 1000 }
      
      const result = await findMatchingRules(basicLead)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.some(rule => rule.name === 'Default Round Robin')).toBe(true)
    })
  })

  describe('autoAssignLead', () => {
    it('should successfully auto-assign a lead', async () => {
      const { supabase } = require('@/lib/supabase')
      
      // Mock lead fetch
      supabase.from.mockImplementation((table: string) => {
        if (table === 'client_leads' && supabase.select().eq().single) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: mockLead.id,
                first_name: mockLead.firstName,
                last_name: mockLead.lastName,
                email: mockLead.email,
                phone: mockLead.phone,
                source_type: mockLead.sourceType,
                service_type: mockLead.serviceType,
                estimated_value: mockLead.estimatedValue,
                assigned_to: null,
                status: 'prospect',
                created_at: mockLead.created_at,
                updated_at: mockLead.updated_at
              },
              error: null
            })
          }
        }
        if (table === 'client_leads' && supabase.update) {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ error: null })
          }
        }
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }
      })

      // Mock getManagerWorkloads (this would be called internally)
      jest.spyOn(require('@/lib/services/lead-assignment-service'), 'getManagerWorkloads')
        .mockResolvedValue({
          success: true,
          data: [
            {
              managerId: 'manager1',
              firstName: 'Alice',
              lastName: 'Johnson',
              email: 'alice@example.com',
              activeLeads: 3,
              contactedToday: 1,
              responseTime: 45,
              availabilityScore: 85,
              lastAssigned: '2024-01-01T00:00:00Z'
            },
            {
              managerId: 'manager2',
              firstName: 'Bob', 
              lastName: 'Smith',
              email: 'bob@example.com',
              activeLeads: 5,
              contactedToday: 2,
              responseTime: 60,
              availabilityScore: 75,
              lastAssigned: '2024-01-02T00:00:00Z'
            }
          ]
        })

      const result = await autoAssignLead(mockLead.id)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.assignedTo).toBeTruthy()
      expect(result.data?.managerName).toBeTruthy()
      expect(result.data?.assignmentReason).toBeTruthy()
    })

    it('should reject assignment for already assigned lead', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockLead,
            assigned_to: 'existing-manager'
          },
          error: null
        })
      }))

      const result = await autoAssignLead(mockLead.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('already assigned')
    })
  })

  describe('manualAssignLead', () => {
    it('should successfully manually assign a lead', async () => {
      const { supabase } = require('@/lib/supabase')
      
      // Mock lead and manager fetches
      supabase.from.mockImplementation((table: string) => {
        if (table === 'client_leads') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: mockLead.id,
                first_name: mockLead.firstName,
                last_name: mockLead.lastName,
                email: mockLead.email,
                phone: mockLead.phone,
                source_type: mockLead.sourceType,
                service_type: mockLead.serviceType,
                assigned_to: null
              },
              error: null
            }),
            update: jest.fn().mockReturnThis()
          }
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                user_id: 'manager1',
                users: {
                  first_name: 'Alice',
                  last_name: 'Johnson',
                  email: 'alice@example.com'
                }
              },
              error: null
            })
          }
        }
        return { error: null }
      })

      const result = await manualAssignLead(mockLead.id, 'manager1', 'High priority client')

      expect(result.success).toBe(true)
      expect(result.data?.assignedTo).toBe('manager1')
      expect(result.data?.managerName).toBe('Alice Johnson')
      expect(result.data?.assignmentReason).toContain('High priority client')
      expect(result.data?.assignmentMethod).toBe('manual')
    })

    it('should reject manual assignment to non-existent manager', async () => {
      const { supabase } = require('@/lib/supabase')
      
      supabase.from.mockImplementation((table: string) => {
        if (table === 'client_leads') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { assigned_to: null },
              error: null
            })
          }
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Manager not found' }
            })
          }
        }
        return { error: null }
      })

      const result = await manualAssignLead(mockLead.id, 'nonexistent-manager', 'Test assignment')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Manager not found')
    })
  })
})