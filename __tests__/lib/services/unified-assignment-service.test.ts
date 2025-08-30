import { 
  assignLeadToManager,
  getAssignmentRecommendations,
  getManagerWorkload,
  bulkAssignLeads
} from '@/lib/services/unified-assignment-service'
import { UnifiedLead } from '@/lib/types/unified-leads'
import * as supabase from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        })),
        in: jest.fn(() => ({
          order: jest.fn()
        })),
        order: jest.fn()
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }
}))

describe('Unified Assignment Service', () => {
  const mockLead: UnifiedLead = {
    id: 'lead-1',
    type: 'client',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-0001',
    status: 'new',
    source: 'website',
    priority: 'high',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    clientInfo: {
      company: 'Test Corp',
      industry: 'Technology',
      employeeCount: 100,
      securityNeeds: ['patrol']
    }
  }

  const mockManager = {
    id: 'manager-1',
    first_name: 'Jane',
    last_name: 'Manager',
    email: 'jane@example.com',
    role: 'manager',
    experience_level: 'senior',
    specializations: ['technology', 'patrol']
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('assignLeadToManager', () => {
    it('should successfully assign a lead to a manager', async () => {
      const mockSupabase = supabase.supabase as jest.Mocked<typeof supabase.supabase>
      
      // Mock the database update
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: { ...mockLead, assigned_to: 'manager-1' },
                error: null
              }))
            }))
          }))
        }))
      } as any)

      const result = await assignLeadToManager('lead-1', 'client', 'manager-1')

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('client_leads')
    })

    it('should handle assignment to guard leads', async () => {
      const mockSupabase = supabase.supabase as jest.Mocked<typeof supabase.supabase>
      
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: { ...mockLead, assigned_to: 'manager-1' },
                error: null
              }))
            }))
          }))
        }))
      } as any)

      const result = await assignLeadToManager('lead-1', 'guard', 'manager-1')

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('guard_leads')
    })

    it('should handle database errors', async () => {
      const mockSupabase = supabase.supabase as jest.Mocked<typeof supabase.supabase>
      
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Database error' }
              }))
            }))
          }))
        }))
      } as any)

      const result = await assignLeadToManager('lead-1', 'client', 'manager-1')

      expect(result.success).toBe(false)
      expect(result.message).toContain('Failed to assign lead')
    })
  })

  describe('getAssignmentRecommendations', () => {
    it('should return assignment recommendations with confidence scores', async () => {
      const mockSupabase = supabase.supabase as jest.Mocked<typeof supabase.supabase>
      
      // Mock managers query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({
            data: [mockManager],
            error: null
          }))
        }))
      } as any)

      // Mock workload query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            in: jest.fn(() => Promise.resolve({
              data: [
                { assigned_to: 'manager-1', count: 5 }
              ],
              error: null
            }))
          }))
        }))
      } as any)

      const unassignedLeads = [mockLead]
      const result = await getAssignmentRecommendations(unassignedLeads)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0]).toMatchObject({
        leadId: 'lead-1',
        recommendations: expect.arrayContaining([
          expect.objectContaining({
            managerId: 'manager-1',
            managerName: 'Jane Manager',
            confidenceScore: expect.any(Number),
            reasons: expect.any(Array)
          })
        ])
      })
    })

    it('should handle empty manager list', async () => {
      const mockSupabase = supabase.supabase as jest.Mocked<typeof supabase.supabase>
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        }))
      } as any)

      const result = await getAssignmentRecommendations([mockLead])

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].recommendations).toHaveLength(0)
    })
  })

  describe('getManagerWorkload', () => {
    it('should return comprehensive manager workload data', async () => {
      const mockSupabase = supabase.supabase as jest.Mocked<typeof supabase.supabase>
      
      // Mock manager query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: mockManager,
              error: null
            }))
          }))
        }))
      } as any)

      // Mock client leads query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({
            data: [{ status: 'new' }, { status: 'contacted' }],
            error: null
          }))
        }))
      } as any)

      // Mock guard leads query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({
            data: [{ status: 'qualified' }],
            error: null
          }))
        }))
      } as any)

      const result = await getManagerWorkload('manager-1')

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        managerId: 'manager-1',
        managerName: 'Jane Manager',
        totalLeads: 3,
        clientLeads: 2,
        guardLeads: 1,
        statusDistribution: expect.objectContaining({
          new: 1,
          contacted: 1,
          qualified: 1
        })
      })
    })

    it('should handle manager not found', async () => {
      const mockSupabase = supabase.supabase as jest.Mocked<typeof supabase.supabase>
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: { code: 'PGRST116' }
            }))
          }))
        }))
      } as any)

      const result = await getManagerWorkload('nonexistent-manager')

      expect(result.success).toBe(false)
      expect(result.message).toContain('Manager not found')
    })
  })

  describe('bulkAssignLeads', () => {
    const assignments = [
      { leadId: 'lead-1', leadType: 'client', managerId: 'manager-1' },
      { leadId: 'lead-2', leadType: 'guard', managerId: 'manager-2' }
    ]

    it('should successfully perform bulk assignment', async () => {
      const mockSupabase = supabase.supabase as jest.Mocked<typeof supabase.supabase>
      
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: { assigned_to: 'manager-1' },
                error: null
              }))
            }))
          }))
        }))
      } as any)

      const result = await bulkAssignLeads(assignments)

      expect(result.success).toBe(true)
      expect(result.data?.successful).toHaveLength(2)
      expect(result.data?.failed).toHaveLength(0)
    })

    it('should handle partial failures in bulk assignment', async () => {
      const mockSupabase = supabase.supabase as jest.Mocked<typeof supabase.supabase>
      
      let callCount = 0
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => {
                callCount++
                if (callCount === 1) {
                  return Promise.resolve({
                    data: { assigned_to: 'manager-1' },
                    error: null
                  })
                } else {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'Assignment failed' }
                  })
                }
              })
            }))
          }))
        }))
      } as any)

      const result = await bulkAssignLeads(assignments)

      expect(result.success).toBe(true)
      expect(result.data?.successful).toHaveLength(1)
      expect(result.data?.failed).toHaveLength(1)
    })
  })
})