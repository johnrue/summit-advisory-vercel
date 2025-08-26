import { renderHook, waitFor } from '@testing-library/react'
import { useUserRole, hasPermission, hasAnyRole } from '@/hooks/use-user-role'

// Mock the auth context
const mockUser = {
  id: 'user-123',
  email: 'admin@test.com',
  user_metadata: { role: 'admin' }
}

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: jest.fn(() => ({
    user: mockUser,
  })),
}))

// Mock the Supabase client
jest.mock('@/lib/auth/supabase', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => 
            Promise.resolve({ 
              data: { role: 'admin' }, 
              error: null 
            })
          )
        }))
      }))
    }))
  }))
}))

describe('useUserRole', () => {
  it('should fetch user role from database', async () => {
    const { result } = renderHook(() => useUserRole())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.role).toBe('admin')
    expect(result.current.error).toBe(null)
  })

  it('should fallback to metadata when database query fails', async () => {
    // Mock database error
    const { createClient } = require('@/lib/auth/supabase')
    createClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => 
              Promise.resolve({ 
                data: null, 
                error: { code: 'PGRST116', message: 'Not found' }
              })
            )
          }))
        }))
      }))
    })

    const { result } = renderHook(() => useUserRole())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.role).toBe('admin') // From metadata
  })
})

describe('hasPermission', () => {
  it('should return true when user has required role or higher', () => {
    expect(hasPermission('admin', 'guard')).toBe(true)
    expect(hasPermission('manager', 'guard')).toBe(true)
    expect(hasPermission('guard', 'guard')).toBe(true)
  })

  it('should return false when user has lower role', () => {
    expect(hasPermission('guard', 'admin')).toBe(false)
    expect(hasPermission('client', 'guard')).toBe(false)
  })

  it('should return false when user role is null', () => {
    expect(hasPermission(null, 'guard')).toBe(false)
  })
})

describe('hasAnyRole', () => {
  it('should return true when user has any of the allowed roles', () => {
    expect(hasAnyRole('admin', ['admin', 'manager'])).toBe(true)
    expect(hasAnyRole('manager', ['admin', 'manager'])).toBe(true)
  })

  it('should return false when user does not have any allowed roles', () => {
    expect(hasAnyRole('guard', ['admin', 'manager'])).toBe(false)
  })

  it('should return false when user role is null', () => {
    expect(hasAnyRole(null, ['admin', 'manager'])).toBe(false)
  })
})