import { reportAccessControl, type ReportPermission, type DataSensitivityLevel } from '../report-access-control'

// Mock Supabase client
const mockSupabaseData = {
  admin: {
    role: 'admin',
    permissions: [
      'reports.view_all',
      'reports.create',
      'reports.edit',
      'reports.delete',
      'reports.export_data',
      'reports.view_sensitive_data',
      'reports.schedule_automated',
      'reports.manage_all_schedules',
      'reports.access_audit_logs',
      'reports.view_system_metrics'
    ]
  },
  manager: {
    role: 'manager',
    permissions: [
      'reports.view_all',
      'reports.create',
      'reports.edit',
      'reports.export_data',
      'reports.schedule_automated'
    ]
  },
  guard: {
    role: 'guard',
    permissions: [
      'reports.view_all'
    ]
  }
}

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => ({ data: null, error: null }))
    }))
  })
}))

describe('ReportAccessControlService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock the getUserContext method to return test data
    const originalGetUserContext = (reportAccessControl as any).getUserContext
    ;(reportAccessControl as any).getUserContext = jest.fn((userId: string) => {
      const userData = mockSupabaseData[userId as keyof typeof mockSupabaseData]
      if (userData) {
        return Promise.resolve({ success: true, data: userData })
      }
      return Promise.resolve({ success: false, error: 'User not found' })
    })
  })

  describe('checkReportAccess', () => {
    it('should grant admin access to all resources', async () => {
      const result = await reportAccessControl.checkReportAccess('admin', 'audit-logs', 'read')
      
      expect(result.hasAccess).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should grant manager access to guards data', async () => {
      const result = await reportAccessControl.checkReportAccess('manager', 'guards', 'read')
      
      expect(result.hasAccess).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should deny guard access to applications data', async () => {
      const result = await reportAccessControl.checkReportAccess('guard', 'applications', 'read')
      
      expect(result.hasAccess).toBe(false)
      expect(result.error).toContain('Insufficient role permissions')
    })

    it('should deny manager access to audit logs', async () => {
      const result = await reportAccessControl.checkReportAccess('manager', 'audit-logs', 'read')
      
      expect(result.hasAccess).toBe(false)
      expect(result.error).toContain('Insufficient role permissions')
    })

    it('should deny manager export access to applications (restricted)', async () => {
      const result = await reportAccessControl.checkReportAccess('manager', 'applications', 'export')
      
      expect(result.hasAccess).toBe(false)
      expect(result.error).toContain('Insufficient role permissions')
    })

    it('should return allowed fields when specified in access rule', async () => {
      const result = await reportAccessControl.checkReportAccess('manager', 'guards', 'export')
      
      expect(result.hasAccess).toBe(true)
      expect(result.allowedFields).toEqual([
        'id', 'full_name', 'email', 'phone', 'status', 'hire_date'
      ])
    })

    it('should handle non-existent user', async () => {
      const result = await reportAccessControl.checkReportAccess('non-existent', 'guards', 'read')
      
      expect(result.hasAccess).toBe(false)
      expect(result.error).toBe('User not found')
    })

    it('should handle non-existent resource/action combination', async () => {
      const result = await reportAccessControl.checkReportAccess('admin', 'unknown-resource', 'read')
      
      expect(result.hasAccess).toBe(false)
      expect(result.error).toContain('No access rule defined')
    })
  })

  describe('applyDataMasking', () => {
    const testData = [
      {
        id: '1',
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567',
        ssn: '123-45-6789',
        license_number: 'LIC123456789',
        salary: 50000
      },
      {
        id: '2',
        full_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '+1-555-987-6543',
        ssn: '987-65-4321',
        license_number: 'LIC987654321',
        salary: 55000
      }
    ]

    it('should not mask data for admin with full permissions', async () => {
      const result = await reportAccessControl.applyDataMasking('admin', testData, 'guards')
      
      expect(result).toHaveLength(2)
      expect(result[0].ssn).toBe('123-45-6789')
      expect(result[0].phone).toBe('+1-555-123-4567')
      expect(result[0].salary).toBe(50000)
    })

    it('should mask sensitive data for manager', async () => {
      const result = await reportAccessControl.applyDataMasking('manager', testData, 'guards')
      
      expect(result).toHaveLength(2)
      expect(result[0].ssn).toBe('+1***4567') // Partial masking
      expect(result[0].license_number).toBe('***6789') // Hash masking
      expect(result[0].salary).toBe('[REDACTED]') // Redacted
      expect(result[0].full_name).toBe('John Doe') // Not masked
    })

    it('should mask even more data for guard role', async () => {
      const result = await reportAccessControl.applyDataMasking('guard', testData, 'guards')
      
      expect(result).toHaveLength(2)
      expect(result[0].email).toBe('jo***@example.com') // Partial masking for guards
      expect(result[0].phone).toBe('+1***4567') // Partial masking
      expect(result[0].license_number).toBe('***6789') // Hash masking
      expect(result[0].salary).toBe('[REDACTED]') // Redacted
    })

    it('should handle null and undefined values', async () => {
      const testDataWithNulls = [
        {
          id: '1',
          full_name: 'John Doe',
          phone: null,
          ssn: undefined,
          salary: 50000
        }
      ]

      const result = await reportAccessControl.applyDataMasking('manager', testDataWithNulls, 'guards')
      
      expect(result[0].phone).toBeNull()
      expect(result[0].ssn).toBeUndefined()
      expect(result[0].salary).toBe('[REDACTED]')
    })

    it('should return original data on error', async () => {
      // Force an error by mocking getUserContext to throw
      ;(reportAccessControl as any).getUserContext = jest.fn(() => {
        throw new Error('Database error')
      })

      const result = await reportAccessControl.applyDataMasking('admin', testData, 'guards')
      
      expect(result).toEqual(testData) // Should return original data
    })
  })

  describe('getAllowedExportFields', () => {
    it('should return restricted fields for manager guards export', async () => {
      const result = await reportAccessControl.getAllowedExportFields('manager', 'guards')
      
      expect(result.success).toBe(true)
      expect(result.fields).toEqual([
        'id', 'full_name', 'email', 'phone', 'status', 'hire_date'
      ])
    })

    it('should deny guard access to applications export', async () => {
      const result = await reportAccessControl.getAllowedExportFields('guard', 'applications')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient role permissions')
    })

    it('should allow admin access to all fields for compliance export', async () => {
      const result = await reportAccessControl.getAllowedExportFields('admin', 'compliance')
      
      expect(result.success).toBe(true)
      expect(result.fields).toBeDefined()
      expect(result.fields!.length).toBeGreaterThan(0)
    })
  })

  describe('canManageScheduledReports', () => {
    it('should allow admin to manage scheduled reports', async () => {
      const result = await reportAccessControl.canManageScheduledReports('admin')
      
      expect(result).toBe(true)
    })

    it('should deny guard access to manage scheduled reports', async () => {
      const result = await reportAccessControl.canManageScheduledReports('guard')
      
      expect(result).toBe(false)
    })

    it('should deny manager access without specific permission', async () => {
      const result = await reportAccessControl.canManageScheduledReports('manager')
      
      expect(result).toBe(false)
    })
  })

  describe('getDataFilters', () => {
    it('should return empty filters for admin (can see all data)', async () => {
      const result = await reportAccessControl.getDataFilters('admin', 'guards')
      
      expect(result).toEqual({})
    })

    it('should return empty filters for manager (can see all data)', async () => {
      const result = await reportAccessControl.getDataFilters('manager', 'guards')
      
      expect(result).toEqual({})
    })

    it('should return user-specific filters for guard', async () => {
      const result = await reportAccessControl.getDataFilters('guard', 'guards')
      
      expect(result).toEqual({ guard_id: 'guard' })
    })

    it('should return shift-specific filters for guard viewing shifts', async () => {
      const result = await reportAccessControl.getDataFilters('guard', 'shifts')
      
      expect(result).toEqual({ 
        guard_id: 'guard',
        assigned_guard: 'guard'
      })
    })
  })

  describe('data masking functions', () => {
    const service = reportAccessControl as any

    it('should mask values correctly based on masking type', () => {
      expect(service.maskValue('1234567890', 'full')).toBe('**********')
      expect(service.maskValue('1234567890', 'partial')).toBe('12****7890')
      expect(service.maskValue('123', 'partial')).toBe('***')
      expect(service.maskValue('1234567890', 'hash')).toBe('***7890')
      expect(service.maskValue('sensitive data', 'redact')).toBe('[REDACTED]')
    })

    it('should handle null and undefined values', () => {
      expect(service.maskValue(null, 'full')).toBeNull()
      expect(service.maskValue(undefined, 'partial')).toBeUndefined()
    })

    it('should convert non-string values to strings', () => {
      expect(service.maskValue(12345, 'partial')).toBe('1***5')
      expect(service.maskValue(true, 'hash')).toBe('***e')
    })
  })

  describe('permission validation', () => {
    it('should validate multiple permissions correctly', async () => {
      // Test that admin has all required permissions for restricted access
      const result = await reportAccessControl.checkReportAccess('admin', 'applications', 'export')
      
      expect(result.hasAccess).toBe(true)
    })

    it('should fail when missing any required permission', async () => {
      // Manager missing view_sensitive_data permission for applications export
      const result = await reportAccessControl.checkReportAccess('manager', 'applications', 'export')
      
      expect(result.hasAccess).toBe(false)
      expect(result.error).toContain('Insufficient role permissions')
    })
  })
})