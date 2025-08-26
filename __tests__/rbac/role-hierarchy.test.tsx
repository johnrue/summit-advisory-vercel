import { 
  ROLE_HIERARCHY,
  hasPermission,
  hasAnyRole,
  canAccessRoute,
  type UserRole 
} from '@/lib/auth/role-service'

describe('Role Hierarchy', () => {
  describe('ROLE_HIERARCHY', () => {
    it('should have correct hierarchy levels', () => {
      expect(ROLE_HIERARCHY.client).toBe(1)
      expect(ROLE_HIERARCHY.guard).toBe(2)
      expect(ROLE_HIERARCHY.manager).toBe(3)
      expect(ROLE_HIERARCHY.admin).toBe(4)
    })
  })

  describe('hasPermission', () => {
    it('should allow higher roles to access lower role requirements', () => {
      // Admin can access all role requirements
      expect(hasPermission('admin', 'client')).toBe(true)
      expect(hasPermission('admin', 'guard')).toBe(true)
      expect(hasPermission('admin', 'manager')).toBe(true)
      expect(hasPermission('admin', 'admin')).toBe(true)

      // Manager can access guard and client requirements
      expect(hasPermission('manager', 'client')).toBe(true)
      expect(hasPermission('manager', 'guard')).toBe(true)
      expect(hasPermission('manager', 'manager')).toBe(true)
      expect(hasPermission('manager', 'admin')).toBe(false)

      // Guard can access client requirements
      expect(hasPermission('guard', 'client')).toBe(true)
      expect(hasPermission('guard', 'guard')).toBe(true)
      expect(hasPermission('guard', 'manager')).toBe(false)
      expect(hasPermission('guard', 'admin')).toBe(false)
    })

    it('should deny access for null or undefined roles', () => {
      expect(hasPermission(null, 'guard')).toBe(false)
      expect(hasPermission(undefined as any, 'manager')).toBe(false)
    })
  })

  describe('hasAnyRole', () => {
    it('should return true if user has any of the allowed roles', () => {
      expect(hasAnyRole('admin', ['admin', 'manager'])).toBe(true)
      expect(hasAnyRole('manager', ['admin', 'manager'])).toBe(true)
      expect(hasAnyRole('guard', ['admin', 'manager'])).toBe(false)
    })

    it('should return false for empty allowed roles array', () => {
      expect(hasAnyRole('admin', [])).toBe(false)
    })

    it('should return false for null user role', () => {
      expect(hasAnyRole(null, ['admin'])).toBe(false)
    })
  })

  describe('canAccessRoute', () => {
    it('should allow access to admin routes only for admins', () => {
      expect(canAccessRoute('admin', '/dashboard/admin')).toBe(true)
      expect(canAccessRoute('manager', '/dashboard/admin')).toBe(false)
      expect(canAccessRoute('guard', '/dashboard/admin')).toBe(false)
    })

    it('should allow access to manager routes for managers and admins', () => {
      expect(canAccessRoute('admin', '/dashboard/manager')).toBe(true)
      expect(canAccessRoute('manager', '/dashboard/manager')).toBe(true)
      expect(canAccessRoute('guard', '/dashboard/manager')).toBe(false)
    })

    it('should allow access to general dashboard for all authenticated users', () => {
      expect(canAccessRoute('admin', '/dashboard')).toBe(true)
      expect(canAccessRoute('manager', '/dashboard')).toBe(true)
      expect(canAccessRoute('guard', '/dashboard')).toBe(true)
    })

    it('should allow access to routes with no specific restrictions', () => {
      expect(canAccessRoute('guard', '/some/public/route')).toBe(true)
      expect(canAccessRoute(null, '/some/public/route')).toBe(true)
    })

    it('should handle hiring and compliance routes correctly', () => {
      // Hiring routes - admin and manager only
      expect(canAccessRoute('admin', '/hiring')).toBe(true)
      expect(canAccessRoute('manager', '/hiring')).toBe(true)
      expect(canAccessRoute('guard', '/hiring')).toBe(false)

      // Compliance routes - admin and manager only
      expect(canAccessRoute('admin', '/compliance')).toBe(true)
      expect(canAccessRoute('manager', '/compliance')).toBe(true)
      expect(canAccessRoute('guard', '/compliance')).toBe(false)

      // Scheduling routes - all authenticated users
      expect(canAccessRoute('admin', '/scheduling')).toBe(true)
      expect(canAccessRoute('manager', '/scheduling')).toBe(true)
      expect(canAccessRoute('guard', '/scheduling')).toBe(true)
    })
  })
})