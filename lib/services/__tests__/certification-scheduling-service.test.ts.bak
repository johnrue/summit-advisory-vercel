import { CertificationSchedulingService } from '../certification-scheduling-service'
import { AuditService } from '../audit-service'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: mockCertifications,
          error: null,
          single: jest.fn(() => ({
            data: mockOverride,
            error: null
          })),
          maybeSingle: jest.fn(() => ({
            data: null,
            error: null
          })),
          gt: jest.fn(() => ({
            maybeSingle: jest.fn(() => ({
              data: mockOverride,
              error: null
            }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockNewOverride,
            error: null
          }))
        }))
      })),
      count: jest.fn(() => ({
        head: true,
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            count: 2,
            error: null
          }))
        }))
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
    expiry_date: '2025-12-31',
    status: 'active'
  },
  {
    expiry_date: '2025-06-15',
    status: 'active'
  }
]

const mockOverride = {
  id: 'override-1',
  guard_id: 'guard-1',
  shift_id: 'shift-1',
  override_reason: 'Emergency coverage needed',
  authorized_by: 'manager-1',
  expires_at: '2024-02-01T00:00:00Z',
  created_at: '2024-01-15T10:00:00Z'
}

const mockNewOverride = {
  id: 'override-2',
  guard_id: 'guard-1',
  shift_id: 'shift-1',
  override_reason: 'Emergency coverage needed',
  authorized_by: 'manager-1',
  expires_at: '2024-02-01T00:00:00Z',
  created_at: new Date().toISOString()
}

const mockGuards = [
  {
    id: 'guard-1',
    first_name: 'John',
    last_name: 'Doe',
    guard_certifications: [
      {
        certification_type: 'TOPS License',
        expiry_date: '2025-12-31',
        status: 'active'
      }
    ]
  },
  {
    id: 'guard-2',
    first_name: 'Jane',
    last_name: 'Smith',
    guard_certifications: [
      {
        certification_type: 'CPR',
        expiry_date: '2024-01-01', // Expired
        status: 'active'
      }
    ]
  }
]

describe('CertificationSchedulingService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('canGuardBeScheduled', () => {
    it('should return true for guards with valid certifications', async () => {
      const result = await CertificationSchedulingService.canGuardBeScheduled('guard-1')
      
      expect(result).toEqual({
        canSchedule: true,
        reasons: [],
        expiredCertifications: [],
        expiringWithin7Days: []
      })
    })

    it('should return false for guards with expired certifications', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)

      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [{
              expiry_date: pastDate.toISOString().split('T')[0],
              status: 'active',
              certification_type: 'TOPS License'
            }],
            error: null
          }))
        }))
      })

      const result = await CertificationSchedulingService.canGuardBeScheduled('guard-2')
      
      expect(result.canSchedule).toBe(false)
      expect(result.reasons.length).toBeGreaterThan(0)
      expect(result.expiredCertifications.length).toBeGreaterThan(0)
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

      const result = await CertificationSchedulingService.canGuardBeScheduled('guard-3')
      
      expect(result.canSchedule).toBe(false)
      expect(result.reasons).toContain('No active certifications found')
    })

    it('should identify certifications expiring within 7 days', async () => {
      const soonDate = new Date()
      soonDate.setDate(soonDate.getDate() + 5)

      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [{
              expiry_date: soonDate.toISOString().split('T')[0],
              status: 'active',
              certification_type: 'CPR',
              id: 'cert-1',
              guard_id: 'guard-1'
            }],
            error: null
          }))
        }))
      })

      const result = await CertificationSchedulingService.canGuardBeScheduled('guard-1')
      
      expect(result.canSchedule).toBe(true) // Still schedulable
      expect(result.expiringWithin7Days.length).toBeGreaterThan(0)
    })

    it('should handle database errors gracefully', async () => {
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: { message: 'Database error' }
          }))
        }))
      })

      const result = await CertificationSchedulingService.canGuardBeScheduled('guard-1')
      
      expect(result.canSchedule).toBe(false)
      expect(result.reasons).toContain('Error checking certification status')
    })
  })

  describe('createEmergencyOverride', () => {
    it('should successfully create an emergency override', async () => {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 1)

      const overrideId = await CertificationSchedulingService.createEmergencyOverride({
        guardId: 'guard-1',
        shiftId: 'shift-1',
        reason: 'Emergency coverage needed',
        authorizedBy: 'manager-1',
        expiryDate
      })

      expect(overrideId).toBe('override-2')

      // Verify audit log was created
      const auditService = AuditService.getInstance()
      expect(auditService.logAction).toHaveBeenCalledWith({
        action: 'emergency_override_created',
        entity_type: 'certification_scheduling',
        entity_id: 'override-2',
        details: {
          guardId: 'guard-1',
          shiftId: 'shift-1',
          reason: 'Emergency coverage needed',
          expiryDate: expiryDate.toISOString()
        },
        user_id: 'manager-1'
      })
    })

    it('should handle database insertion errors', async () => {
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: 'Insert failed' }
            }))
          }))
        }))
      })

      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 1)

      await expect(CertificationSchedulingService.createEmergencyOverride({
        guardId: 'guard-1',
        shiftId: 'shift-1',
        reason: 'Emergency coverage needed',
        authorizedBy: 'manager-1',
        expiryDate
      })).rejects.toThrow('Failed to create emergency scheduling override')
    })
  })

  describe('validateShiftAssignment', () => {
    it('should validate assignment for guard with valid certifications', async () => {
      const result = await CertificationSchedulingService.validateShiftAssignment('guard-1', 'shift-1')
      
      expect(result).toEqual({
        isValid: true,
        warnings: [],
        errors: [],
        hasActiveOverride: false
      })
    })

    it('should return errors for guards with expired certifications and no override', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)

      require('@/lib/supabase').supabase.from.mockImplementation((table) => {
        if (table === 'guard_certifications') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: [{
                  expiry_date: pastDate.toISOString().split('T')[0],
                  status: 'active',
                  certification_type: 'TOPS License'
                }],
                error: null
              }))
            }))
          }
        }
        if (table === 'certification_overrides') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gt: jest.fn(() => ({
                  maybeSingle: jest.fn(() => ({
                    data: null,
                    error: null
                  }))
                }))
              }))
            }))
          }
        }
        return {}
      })

      const result = await CertificationSchedulingService.validateShiftAssignment('guard-2', 'shift-1')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.hasActiveOverride).toBe(false)
    })

    it('should allow assignment with active emergency override', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)

      require('@/lib/supabase').supabase.from.mockImplementation((table) => {
        if (table === 'guard_certifications') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: [{
                  expiry_date: pastDate.toISOString().split('T')[0],
                  status: 'active',
                  certification_type: 'TOPS License'
                }],
                error: null
              }))
            }))
          }
        }
        if (table === 'certification_overrides') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gt: jest.fn(() => ({
                  maybeSingle: jest.fn(() => ({
                    data: {
                      ...mockOverride,
                      expires_at: futureDate.toISOString()
                    },
                    error: null
                  }))
                }))
              }))
            }))
          }
        }
        return {}
      })

      const result = await CertificationSchedulingService.validateShiftAssignment('guard-1', 'shift-1')
      
      expect(result.isValid).toBe(true)
      expect(result.hasActiveOverride).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('getAvailableGuards', () => {
    it('should return available guards with certification status', async () => {
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: mockGuards,
            error: null
          }))
        }))
      })

      const guards = await CertificationSchedulingService.getAvailableGuards()
      
      expect(Array.isArray(guards)).toBe(true)
      expect(guards.length).toBe(2)
      
      const compliantGuard = guards.find(g => g.guardId === 'guard-1')
      expect(compliantGuard?.canSchedule).toBe(true)
      expect(compliantGuard?.certificationStatus).toBe('compliant')
      
      const nonCompliantGuard = guards.find(g => g.guardId === 'guard-2')
      expect(nonCompliantGuard?.canSchedule).toBe(false)
      expect(nonCompliantGuard?.certificationStatus).toBe('expired')
    })

    it('should handle database errors gracefully', async () => {
      require('@/lib/supabase').supabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: { message: 'Database error' }
          }))
        }))
      })

      const guards = await CertificationSchedulingService.getAvailableGuards()
      expect(guards).toEqual([])
    })
  })

  describe('getSchedulingRestrictionsReport', () => {
    it('should generate comprehensive restrictions report', async () => {
      require('@/lib/supabase').supabase.from.mockImplementation((table) => {
        if (table === 'guards') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: mockGuards,
                error: null
              }))
            }))
          }
        }
        if (table === 'certification_overrides') {
          return {
            select: jest.fn(() => ({
              count: 'exact',
              head: true,
              gte: jest.fn(() => ({
                lte: jest.fn(() => ({
                  count: 2,
                  error: null
                }))
              }))
            }))
          }
        }
        return {}
      })

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      
      const report = await CertificationSchedulingService.getSchedulingRestrictionsReport(startDate, endDate)
      
      expect(report).toEqual({
        totalGuards: 2,
        availableGuards: 1,
        restrictedGuards: 1,
        emergencyOverrides: 2,
        restrictionReasons: {
          'Expired Certifications': 1
        }
      })
    })
  })

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      require('@/lib/supabase').supabase.from.mockImplementation(() => {
        throw new Error('Service unavailable')
      })

      const result = await CertificationSchedulingService.canGuardBeScheduled('guard-1')
      
      expect(result.canSchedule).toBe(false)
      expect(result.reasons).toContain('Error checking certification status')
    })
  })
})