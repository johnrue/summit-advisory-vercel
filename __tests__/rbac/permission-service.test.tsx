import { PermissionService } from '@/lib/auth/permission-service'
import type { UserRole, PermissionMatrix } from '@/lib/auth/permission-service'

describe('PermissionService', () => {
  describe('getDefaultPermissions', () => {
    it('should return correct permissions for admin role', () => {
      const adminPermissions = PermissionService.getDefaultPermissions('admin')
      
      expect(adminPermissions.users.view_all).toBe(true)
      expect(adminPermissions.users.create).toBe(true)
      expect(adminPermissions.users.edit).toBe(true)
      expect(adminPermissions.users.delete).toBe(true)
      expect(adminPermissions.system.manage_roles).toBe(true)
      expect(adminPermissions.system.view_audit_logs).toBe(true)
    })

    it('should return correct permissions for manager role', () => {
      const managerPermissions = PermissionService.getDefaultPermissions('manager')
      
      expect(managerPermissions.users.view_all).toBe(false)
      expect(managerPermissions.users.create).toBe(false)
      expect(managerPermissions.guards.view_all).toBe(true)
      expect(managerPermissions.guards.edit_profiles).toBe(true)
      expect(managerPermissions.shifts.view_all).toBe(true)
      expect(managerPermissions.system.manage_roles).toBe(false)
    })

    it('should return correct permissions for guard role', () => {
      const guardPermissions = PermissionService.getDefaultPermissions('guard')
      
      expect(guardPermissions.users.view_all).toBe(false)
      expect(guardPermissions.guards.view_all).toBe(false)
      expect(guardPermissions.shifts.view_all).toBe(false)
      expect(guardPermissions.system.manage_roles).toBe(false)
    })

    it('should return correct permissions for client role', () => {
      const clientPermissions = PermissionService.getDefaultPermissions('client')
      
      expect(clientPermissions.users.view_all).toBe(false)
      expect(clientPermissions.guards.view_all).toBe(false)
      expect(clientPermissions.shifts.view_all).toBe(false)
      expect(clientPermissions.system.manage_roles).toBe(false)
    })
  })
})