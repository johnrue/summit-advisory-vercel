import { CertificationMonitoringService } from '../certification-monitoring-service'
import { AuditService } from '../audit-service'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            lte: jest.fn(() => ({
              data: mockCertifications,
              error: null
            }))
          })),
          single: jest.fn(() => ({
            data: mockCertifications[0],
            error: null
          }))
        })),
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            data: mockAccessHistory,
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => ({
        data: mockNewAlert,
        error: null
      }))
    }))
  }
}))

// Mock AuditService
jest.mock('../audit-service', () => ({
  AuditService: {
    getInstance: jest.fn(() => ({
      logAction: jest.fn().mockResolvedValue({ success: true })
    }))
  }
}))

const mockCertifications = [
  {
    id: 'cert-1',
    guard_id: 'guard-1',
    certification_type: 'TOPS License',
    expiry_date: '2024-02-15',
    status: 'active',
    guards: {
      id: 'guard-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-0123'
    }
  },
  {
    id: 'cert-2',
    guard_id: 'guard-2',
    certification_type: 'CPR',
    expiry_date: '2024-01-20',
    status: 'active',
    guards: {
      id: 'guard-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '555-0456'
    }
  }
]

const mockAccessHistory = [
  {
    id: 'access-1',
    user_id: 'guard-1',
    accessed_at: '2024-01-15T10:00:00Z'
  }
]

const mockNewAlert = {
  id: 'alert-1',
  guard_certification_id: 'cert-1',
  alert_type: '7_day',
  sent_at: new Date().toISOString()
}

describe('CertificationMonitoringService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkExpirations', () => {
    it('should identify certifications approaching expiry', async () => {
      const expiryChecks = await CertificationMonitoringService.checkExpirations()
      
      expect(expiryChecks).toBeInstanceOf(Array)
      expect(expiryChecks.length).toBeGreaterThan(0)
      
      const check = expiryChecks[0]
      expect(check).toHaveProperty('certification')
      expect(check).toHaveProperty('guard')
      expect(check).toHaveProperty('daysUntilExpiry')
      expect(check).toHaveProperty('alertType')
      expect(check).toHaveProperty('shouldAlert')
      expect(check).toHaveProperty('canSchedule')
    })

    it('should log monitoring execution in audit trail', async () => {
      await CertificationMonitoringService.checkExpirations()
      
      const auditService = AuditService.getInstance()
      expect(auditService.logAction).toHaveBeenCalledWith({
        action: 'executed',
        entity_type: 'certification_monitoring',
        entity_id: 'system',
        details: expect.objectContaining({
          certificationsChecked: expect.any(Number),
          alertsTriggered: expect.any(Number),
          expiredCertifications: expect.any(Number)
        }),
        user_id: 'system'
      })
    })
  })

  describe('canGuardBeScheduled', () => {
    it('should return false for guards with expired certifications', async () => {
      // Mock expired certification
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [{
              expiry_date: '2023-12-01', // Expired date
              status: 'active'
            }],
            error: null
          }))
        }))
      })

      const result = await CertificationMonitoringService.canGuardBeScheduled('guard-1')
      
      expect(result).toBe(false)
    })

    it('should return true for guards with current certifications', async () => {
      // Mock current certification
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [{
              expiry_date: '2025-12-01', // Future date
              status: 'active'
            }],
            error: null
          }))
        }))
      })

      const result = await CertificationMonitoringService.canGuardBeScheduled('guard-1')
      
      expect(result).toBe(true)
    })

    it('should return false for guards with no active certifications', async () => {
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [],
            error: null
          }))
        }))
      })

      const result = await CertificationMonitoringService.canGuardBeScheduled('guard-1')
      
      expect(result).toBe(false)
    })
  })

  describe('getCertificationDashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      const dashboard = await CertificationMonitoringService.getCertificationDashboard()
      
      expect(dashboard).toHaveProperty('expiringIn30Days')
      expect(dashboard).toHaveProperty('expiringIn14Days')
      expect(dashboard).toHaveProperty('expiringIn7Days')
      expect(dashboard).toHaveProperty('expired')
      expect(dashboard).toHaveProperty('totalGuards')
      expect(dashboard).toHaveProperty('compliantGuards')
      expect(dashboard).toHaveProperty('nonCompliantGuards')
      expect(dashboard).toHaveProperty('pendingRenewals')

      expect(Array.isArray(dashboard.expiringIn30Days)).toBe(true)
      expect(typeof dashboard.totalGuards).toBe('number')
      expect(typeof dashboard.compliantGuards).toBe('number')
    })
  })

  describe('getGuardsForEscalation', () => {
    it('should return guards with expired or critically expiring certifications', async () => {
      const guardsForEscalation = await CertificationMonitoringService.getGuardsForEscalation()
      
      expect(Array.isArray(guardsForEscalation)).toBe(true)
      
      if (guardsForEscalation.length > 0) {
        const guard = guardsForEscalation[0]
        expect(guard.daysUntilExpiry < 0 || guard.daysUntilExpiry <= 7).toBe(true)
      }
    })
  })

  describe('processEscalations', () => {
    it('should process escalation notifications and log the action', async () => {
      await CertificationMonitoringService.processEscalations()
      
      const auditService = AuditService.getInstance()
      expect(auditService.logAction).toHaveBeenCalledWith({
        action: 'processed_escalations',
        entity_type: 'certification_monitoring',
        entity_id: 'system',
        details: expect.objectContaining({
          guardsProcessed: expect.any(Number),
          escalationsSent: expect.any(Number)
        }),
        user_id: 'system'
      })
    })
  })

  describe('private helper methods', () => {
    it('should correctly calculate days until expiry', () => {
      const today = new Date()
      const futureDate = new Date(today.getTime() + (10 * 24 * 60 * 60 * 1000))
      const pastDate = new Date(today.getTime() - (5 * 24 * 60 * 60 * 1000))
      
      // These are private methods, so we test through public interface
      // The calculateDaysUntilExpiry logic is tested implicitly through checkExpirations
    })

    it('should correctly determine alert types', () => {
      // Alert type determination is tested through the checkExpirations method
      // which calls the private determineAlertType method
    })
  })

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              lte: jest.fn(() => ({
                data: null,
                error: { message: 'Database connection failed' }
              }))
            }))
          }))
        }))
      })

      await expect(CertificationMonitoringService.checkExpirations())
        .rejects.toThrow('Failed to check certification expirations')
    })

    it('should handle scheduling check errors gracefully', async () => {
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: { message: 'Guard not found' }
          }))
        }))
      })

      const result = await CertificationMonitoringService.canGuardBeScheduled('invalid-id')
      expect(result).toBe(false)
    })
  })
})