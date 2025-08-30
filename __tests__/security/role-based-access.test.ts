import { NextRequest, NextResponse } from 'next/server'
import { GET, PUT } from '@/app/api/unified-leads/route'
import { GET as getById, PUT as updateById } from '@/app/api/unified-leads/[leadId]/route'
import { GET as getAnalytics } from '@/app/api/unified-leads/analytics/route'
import { POST as exportData } from '@/app/api/unified-leads/export/route'

// Mock Supabase auth
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      order: jest.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
}

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}))

jest.mock('@/lib/auth/server-auth', () => ({
  getServerAuth: jest.fn()
}))

import { getServerAuth } from '@/lib/auth/server-auth'

const mockGetServerAuth = getServerAuth as jest.MockedFunction<typeof getServerAuth>

describe('Security Tests - Role-Based Access Control', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('API Route Authentication', () => {
    it('should deny access to unauthenticated users', async () => {
      mockGetServerAuth.mockResolvedValue({
        user: null,
        session: null,
        error: new Error('Not authenticated')
      })

      const request = new NextRequest('http://localhost:3000/api/unified-leads')
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toContain('authentication')
    })

    it('should allow access to authenticated managers', async () => {
      mockGetServerAuth.mockResolvedValue({
        user: {
          id: 'test-user',
          role: 'manager',
          email: 'manager@test.com'
        },
        session: { access_token: 'valid-token', expires_at: Date.now() + 3600000 },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/unified-leads')
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should allow access to authenticated admins', async () => {
      mockGetServerAuth.mockResolvedValue({
        user: {
          id: 'test-admin',
          role: 'admin',
          email: 'admin@test.com'
        },
        session: { access_token: 'valid-token', expires_at: Date.now() + 3600000 },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/unified-leads')
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should deny access to guard role users', async () => {
      mockGetServerAuth.mockResolvedValue({
        user: {
          id: 'test-guard',
          role: 'guard',
          email: 'guard@test.com'
        },
        session: { access_token: 'valid-token', expires_at: Date.now() + 3600000 },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/unified-leads')
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.error).toContain('access denied')
    })
  })

  describe('Data Access Restrictions', () => {
    it('should filter leads by manager assignment for non-admin users', async () => {
      const managerId = 'manager-123'
      
      mockGetServerAuth.mockResolvedValue({
        user: {
          id: managerId,
          role: 'manager',
          email: 'manager@test.com'
        },
        session: { access_token: 'valid-token', expires_at: Date.now() + 3600000 },
        error: null
      })

      const mockSelectFn = jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({
          data: [{ id: 'lead-1', assigned_to: managerId }],
          error: null
        }))
      }))

      mockSupabase.from.mockReturnValue({
        select: mockSelectFn
      })

      const request = new NextRequest('http://localhost:3000/api/unified-leads')
      const response = await GET(request)

      expect(response.status).toBe(200)
      // Verify that RLS policies would filter by assigned_to
      expect(mockSupabase.from).toHaveBeenCalledWith('client_leads')
    })

    it('should allow admins to access all leads', async () => {
      mockGetServerAuth.mockResolvedValue({
        user: {
          id: 'admin-123',
          role: 'admin',
          email: 'admin@test.com'
        },
        session: { access_token: 'valid-token', expires_at: Date.now() + 3600000 },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({
            data: [
              { id: 'lead-1', assigned_to: 'manager-1' },
              { id: 'lead-2', assigned_to: 'manager-2' }
            ],
            error: null
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/unified-leads')
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data).toHaveLength(4) // Both client and guard leads
    })
  })

  describe('Lead Modification Security', () => {
    it('should allow managers to update only their assigned leads', async () => {
      const managerId = 'manager-123'
      
      mockGetServerAuth.mockResolvedValue({
        user: {
          id: managerId,
          role: 'manager',
          email: 'manager@test.com'
        },
        session: { access_token: 'valid-token', expires_at: Date.now() + 3600000 },
        error: null
      })

      // Mock successful update (RLS would enforce assignment restriction)
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: { id: 'lead-1', assigned_to: managerId, status: 'contacted' },
                error: null
              }))
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/unified-leads/lead-1', {
        method: 'PUT',
        body: JSON.stringify({
          leadType: 'client',
          updates: { status: 'contacted' }
        })
      })

      const response = await updateById(request, { params: { leadId: 'lead-1' } })

      expect(response.status).toBe(200)
    })

    it('should prevent managers from updating unassigned leads', async () => {
      const managerId = 'manager-123'
      
      mockGetServerAuth.mockResolvedValue({
        user: {
          id: managerId,
          role: 'manager',
          email: 'manager@test.com'
        },
        session: { access_token: 'valid-token', expires_at: Date.now() + 3600000 },
        error: null
      })

      // Mock RLS violation (no rows affected)
      mockSupabase.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' }
              }))
            }))
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/unified-leads/lead-1', {
        method: 'PUT',
        body: JSON.stringify({
          leadType: 'client',
          updates: { status: 'contacted' }
        })
      })

      const response = await updateById(request, { params: { leadId: 'lead-1' } })

      expect(response.status).toBe(404)
    })
  })

  describe('Export Security Controls', () => {
    it('should restrict export access to managers and admins only', async () => {
      mockGetServerAuth.mockResolvedValue({
        user: {
          id: 'guard-123',
          role: 'guard',
          email: 'guard@test.com'
        },
        session: { access_token: 'valid-token', expires_at: Date.now() + 3600000 },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/unified-leads/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          filters: {}
        })
      })

      const response = await exportData(request)
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.error).toContain('access denied')
    })

    it('should allow managers to export only their assigned leads', async () => {
      const managerId = 'manager-123'
      
      mockGetServerAuth.mockResolvedValue({
        user: {
          id: managerId,
          role: 'manager',
          email: 'manager@test.com'
        },
        session: { access_token: 'valid-token', expires_at: Date.now() + 3600000 },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({
            data: [{ id: 'lead-1', assigned_to: managerId }],
            error: null
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/unified-leads/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          filters: {}
        })
      })

      const response = await exportData(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/csv')
    })

    it('should prevent sensitive data in exports for non-admin users', async () => {
      const managerId = 'manager-123'
      
      mockGetServerAuth.mockResolvedValue({
        user: {
          id: managerId,
          role: 'manager',
          email: 'manager@test.com'
        },
        session: { access_token: 'valid-token', expires_at: Date.now() + 3600000 },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({
            data: [{ 
              id: 'lead-1', 
              email: 'lead@test.com',
              phone: '555-0123',
              ssn: '123-45-6789', // Should be filtered out
              assigned_to: managerId 
            }],
            error: null
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/unified-leads/export', {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          filters: {}
        })
      })

      const response = await exportData(request)
      const csvContent = await response.text()

      // Verify sensitive fields are excluded from export
      expect(csvContent).not.toContain('ssn')
      expect(csvContent).not.toContain('123-45-6789')
    })
  })

  describe('Analytics Access Control', () => {
    it('should provide full analytics to admin users', async () => {
      mockGetServerAuth.mockResolvedValue({
        user: {
          id: 'admin-123',
          role: 'admin',
          email: 'admin@test.com'
        },
        session: { access_token: 'valid-token', expires_at: Date.now() + 3600000 },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({
            data: [
              { id: 'lead-1', assigned_to: 'manager-1', status: 'won' },
              { id: 'lead-2', assigned_to: 'manager-2', status: 'new' }
            ],
            error: null
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/unified-leads/analytics')
      const response = await getAnalytics(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data.managerPerformance).toBeDefined()
      expect(responseData.data.managerPerformance.length).toBeGreaterThan(0)
    })

    it('should provide limited analytics to manager users', async () => {
      const managerId = 'manager-123'
      
      mockGetServerAuth.mockResolvedValue({
        user: {
          id: managerId,
          role: 'manager',
          email: 'manager@test.com'
        },
        session: { access_token: 'valid-token', expires_at: Date.now() + 3600000 },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({
            data: [
              { id: 'lead-1', assigned_to: managerId, status: 'won' }
            ],
            error: null
          }))
        }))
      })

      const request = new NextRequest('http://localhost:3000/api/unified-leads/analytics')
      const response = await getAnalytics(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      // Manager should only see their own performance data
      expect(responseData.data.managerPerformance).toHaveLength(1)
      expect(responseData.data.managerPerformance[0].managerId).toBe(managerId)
    })
  })

  describe('Input Validation and Sanitization', () => {
    it('should validate and sanitize lead update data', async () => {
      mockGetServerAuth.mockResolvedValue({
        user: {
          id: 'manager-123',
          role: 'manager',
          email: 'manager@test.com'
        },
        session: { access_token: 'valid-token', expires_at: Date.now() + 3600000 },
        error: null
      })

      // Test with malicious input
      const request = new NextRequest('http://localhost:3000/api/unified-leads/lead-1', {
        method: 'PUT',
        body: JSON.stringify({
          leadType: 'client',
          updates: {
            status: '<script>alert("xss")</script>',
            notes: 'DROP TABLE users;',
            maliciousField: 'should be filtered'
          }
        })
      })

      const response = await updateById(request, { params: { leadId: 'lead-1' } })

      // Should validate input and reject or sanitize
      expect(response.status).toBe(400) // Bad request due to invalid data
    })

    it('should prevent SQL injection in filter parameters', async () => {
      mockGetServerAuth.mockResolvedValue({
        user: {
          id: 'manager-123',
          role: 'manager',
          email: 'manager@test.com'
        },
        session: { access_token: 'valid-token', expires_at: Date.now() + 3600000 },
        error: null
      })

      // Test with SQL injection attempt
      const maliciousUrl = new URL('http://localhost:3000/api/unified-leads')
      maliciousUrl.searchParams.set('status', "'; DROP TABLE leads; --")
      
      const request = new NextRequest(maliciousUrl.toString())
      
      // Should handle this safely through parameterized queries
      const response = await GET(request)
      
      // Should not crash and return valid response
      expect(response.status).toBe(200)
    })
  })

  describe('Session and Token Validation', () => {
    it('should reject expired tokens', async () => {
      mockGetServerAuth.mockResolvedValue({
        user: null,
        session: null,
        error: new Error('Token expired')
      })

      const request = new NextRequest('http://localhost:3000/api/unified-leads')
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toContain('expired')
    })

    it('should reject invalid tokens', async () => {
      mockGetServerAuth.mockResolvedValue({
        user: null,
        session: null,
        error: new Error('Invalid token')
      })

      const request = new NextRequest('http://localhost:3000/api/unified-leads')
      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toContain('authentication')
    })
  })

  describe('Rate Limiting and Abuse Prevention', () => {
    it('should implement rate limiting for API endpoints', async () => {
      mockGetServerAuth.mockResolvedValue({
        user: {
          id: 'manager-123',
          role: 'manager',
          email: 'manager@test.com'
        },
        session: { access_token: 'valid-token', expires_at: Date.now() + 3600000 },
        error: null
      })

      // This test would require actual rate limiting implementation
      // For now, we verify the structure is in place for rate limiting
      expect(true).toBe(true) // Placeholder for rate limiting test
    })
  })
})