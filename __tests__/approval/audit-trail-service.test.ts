// Story 2.7: Audit Trail Service Tests
// Comprehensive test suite for audit trail operations and integrity verification

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { AuditTrailService } from '@/lib/services/audit-trail-service'
import type { CreateAuditRecordRequest } from '@/lib/services/audit-trail-service'
import type { 
  AuditIntegrityReport,
  AuditFilters,
  DecisionAuditRecord,
  AuditEventType
} from '@/lib/types/approval-workflow'

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(),
        single: jest.fn()
      })),
      order: jest.fn(),
      in: jest.fn(() => ({
        order: jest.fn(),
        gte: jest.fn(() => ({
          lte: jest.fn()
        }))
      })),
      gte: jest.fn(() => ({
        lte: jest.fn()
      })),
      lte: jest.fn()
    }))
  })),
  rpc: jest.fn()
}

jest.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabase
}))

describe('AuditTrailService', () => {
  let service: AuditTrailService
  let mockUser: any

  beforeEach(() => {
    service = new AuditTrailService()
    mockUser = {
      id: 'manager-123',
      email: 'manager@summitadvisoryfirm.com',
      app_metadata: { role: 'manager' }
    }
    
    // Reset all mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createAuditRecord', () => {
    it('should successfully create an audit record', async () => {
      const auditRequest: CreateAuditRecordRequest = {
        hiringDecisionId: 'decision-123',
        auditEventType: 'decision_created',
        changeReason: 'Initial hiring decision created',
        newState: { 
          decisionType: 'approved',
          decisionReason: 'qualifications_met'
        },
        isSystemGenerated: false,
        complianceFlag: true
      }

      const mockAuditRecord = {
        id: 'audit-123',
        hiring_decision_id: auditRequest.hiringDecisionId,
        audit_event_type: auditRequest.auditEventType,
        actor_id: mockUser.id,
        new_state: auditRequest.newState,
        change_reason: auditRequest.changeReason,
        digital_signature: 'mock-signature',
        created_at: new Date().toISOString(),
        is_system_generated: false,
        compliance_flag: true,
        actor: {
          id: mockUser.id,
          email: mockUser.email,
          raw_user_meta_data: { full_name: 'Test Manager' }
        }
      }

      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      // Mock successful insert
      const mockInsertChain = {
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockAuditRecord,
            error: null
          })
        }))
      }
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue(mockInsertChain)
      })

      const result = await service.createAuditRecord(auditRequest)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.hiringDecisionId).toBe(auditRequest.hiringDecisionId)
      expect(result.data?.auditEventType).toBe(auditRequest.auditEventType)
      expect(result.data?.complianceFlag).toBe(true)
    })

    it('should fail when user is not authenticated', async () => {
      const auditRequest: CreateAuditRecordRequest = {
        hiringDecisionId: 'decision-123',
        auditEventType: 'decision_created',
        changeReason: 'Test audit record'
      }

      // Mock failed authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null }
      })

      const result = await service.createAuditRecord(auditRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('should handle database errors gracefully', async () => {
      const auditRequest: CreateAuditRecordRequest = {
        hiringDecisionId: 'decision-123',
        auditEventType: 'decision_created',
        changeReason: 'Test audit record'
      }

      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      // Mock database error
      const mockInsertChain = {
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database constraint violation' }
          })
        }))
      }
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue(mockInsertChain)
      })

      const result = await service.createAuditRecord(auditRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database constraint violation')
    })
  })

  describe('getAuditTrail', () => {
    it('should return audit trail for a decision', async () => {
      const decisionId = 'decision-123'
      const mockAuditRecords = [
        {
          id: 'audit-1',
          hiring_decision_id: decisionId,
          audit_event_type: 'decision_created',
          actor_id: 'manager-1',
          change_reason: 'Initial decision',
          digital_signature: 'signature-1',
          created_at: new Date().toISOString(),
          is_system_generated: false,
          compliance_flag: true,
          actor: {
            id: 'manager-1',
            email: 'manager@company.com',
            raw_user_meta_data: { full_name: 'Manager One' }
          }
        },
        {
          id: 'audit-2',
          hiring_decision_id: decisionId,
          audit_event_type: 'decision_modified',
          actor_id: 'manager-2',
          change_reason: 'Updated decision rationale',
          digital_signature: 'signature-2',
          created_at: new Date().toISOString(),
          is_system_generated: false,
          compliance_flag: false,
          actor: {
            id: 'manager-2',
            email: 'manager2@company.com',
            raw_user_meta_data: { full_name: 'Manager Two' }
          }
        }
      ]

      // Mock successful query
      const mockQueryChain = {
        eq: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({
            data: mockAuditRecords,
            error: null
          })
        }))
      }
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQueryChain)
      })

      const result = await service.getAuditTrail(decisionId)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.[0].hiringDecisionId).toBe(decisionId)
      expect(result.data?.[0].auditEventType).toBe('decision_created')
      expect(result.data?.[1].auditEventType).toBe('decision_modified')
    })

    it('should apply filters correctly', async () => {
      const decisionId = 'decision-123'
      const filters = {
        auditEventTypes: ['decision_created' as AuditEventType],
        complianceFlags: [true]
      }

      // Mock successful query with filters
      const mockQueryChain = {
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            in: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            }))
          }))
        }))
      }
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQueryChain)
      })

      const result = await service.getAuditTrail(decisionId, filters)

      expect(result.success).toBe(true)
      // Verify that filter methods were called
      expect(mockQueryChain.eq).toHaveBeenCalled()
      expect(mockQueryChain.order).toHaveBeenCalled()
    })
  })

  describe('validateAuditIntegrity', () => {
    it('should validate audit integrity and return report', async () => {
      const decisionId = 'decision-123'
      const mockAuditRecords: DecisionAuditRecord[] = [
        {
          id: 'audit-1',
          hiringDecisionId: decisionId,
          auditEventType: 'decision_created',
          actorId: 'manager-1',
          actorName: 'Manager One',
          changeReason: 'Initial decision',
          digitalSignature: 'valid-signature-1',
          createdAt: new Date(),
          isSystemGenerated: false,
          complianceFlag: true
        },
        {
          id: 'audit-2',
          hiringDecisionId: decisionId,
          auditEventType: 'decision_modified',
          actorId: 'manager-2',
          actorName: 'Manager Two',
          changeReason: 'Updated decision',
          digitalSignature: 'valid-signature-2',
          createdAt: new Date(),
          isSystemGenerated: false,
          complianceFlag: false
        }
      ]

      // Mock successful audit trail retrieval
      jest.spyOn(service, 'getAuditTrail').mockResolvedValue({
        success: true,
        data: mockAuditRecords
      })

      const result = await service.validateAuditIntegrity(decisionId)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.decisionId).toBe(decisionId)
      expect(result.data?.totalRecords).toBe(2)
      expect(result.data?.integrityScore).toBeGreaterThan(0)
    })

    it('should detect suspicious activities', async () => {
      const decisionId = 'decision-123'
      const suspiciousTime = new Date()
      const mockAuditRecords: DecisionAuditRecord[] = [
        {
          id: 'audit-1',
          hiringDecisionId: decisionId,
          auditEventType: 'decision_created',
          actorId: 'manager-1',
          actorName: 'Manager One',
          changeReason: 'Initial decision',
          digitalSignature: 'signature-1',
          createdAt: suspiciousTime,
          isSystemGenerated: true, // Suspicious: system-generated with human actor
          complianceFlag: true
        },
        {
          id: 'audit-2',
          hiringDecisionId: decisionId,
          auditEventType: 'decision_modified',
          actorId: 'manager-1',
          actorName: 'Manager One',
          changeReason: 'Rapid change 1',
          digitalSignature: 'signature-2',
          createdAt: new Date(suspiciousTime.getTime() + 30000), // 30 seconds later
          isSystemGenerated: false,
          complianceFlag: false
        },
        {
          id: 'audit-3',
          hiringDecisionId: decisionId,
          auditEventType: 'decision_modified',
          actorId: 'manager-1',
          actorName: 'Manager One',
          changeReason: 'Rapid change 2',
          digitalSignature: 'signature-3',
          createdAt: new Date(suspiciousTime.getTime() + 45000), // 45 seconds later
          isSystemGenerated: false,
          complianceFlag: false
        }
      ]

      // Mock successful audit trail retrieval
      jest.spyOn(service, 'getAuditTrail').mockResolvedValue({
        success: true,
        data: mockAuditRecords
      })

      const result = await service.validateAuditIntegrity(decisionId)

      expect(result.success).toBe(true)
      expect(result.data?.suspiciousActivities).toBeDefined()
      expect(result.data?.suspiciousActivities.length).toBeGreaterThan(0)
    })
  })

  describe('exportAuditData', () => {
    it('should export audit data successfully', async () => {
      const filters: AuditFilters = {
        decisionIds: ['decision-123'],
        format: 'json',
        includeSystemGenerated: true
      }

      const mockAuditData = [
        {
          id: 'audit-1',
          hiring_decision_id: 'decision-123',
          audit_event_type: 'decision_created',
          actor_id: 'manager-1',
          created_at: new Date().toISOString(),
          hiring_decision: {
            application_id: 'app-123',
            decision_type: 'approved',
            approver_id: 'manager-1'
          },
          actor: {
            id: 'manager-1',
            email: 'manager@company.com'
          }
        }
      ]

      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      // Mock successful query
      const mockQueryChain = {
        order: jest.fn(() => ({
          in: jest.fn().mockResolvedValue({
            data: mockAuditData,
            error: null
          })
        }))
      }
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQueryChain)
      })

      // Mock audit record creation
      jest.spyOn(service, 'createAuditRecord').mockResolvedValue({
        success: true,
        data: {} as DecisionAuditRecord
      })

      const result = await service.exportAuditData(filters)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.format).toBe('json')
      expect(result.data?.recordCount).toBe(1)
      expect(result.data?.exportId).toBeDefined()
    })

    it('should fail when user is not authenticated', async () => {
      const filters: AuditFilters = {
        decisionIds: ['decision-123'],
        format: 'json',
        includeSystemGenerated: true
      }

      // Mock failed authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null }
      })

      const result = await service.exportAuditData(filters)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })
  })

  describe('generateComplianceReport', () => {
    it('should generate compliance report successfully', async () => {
      const reportType = 'approval_summary'
      const filters = {
        dateRange: {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: new Date()
        }
      }

      const result = await service.generateComplianceReport(reportType, filters)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.reportType).toBe(reportType)
      expect(result.data?.reportPeriod).toEqual(filters.dateRange)
      expect(result.data?.id).toBeDefined()
    })

    it('should handle different report types', async () => {
      const reportTypes = ['approval_summary', 'audit_trail', 'delegation_report', 'decision_integrity'] as const
      
      for (const reportType of reportTypes) {
        const result = await service.generateComplianceReport(reportType, {})
        expect(result.success).toBe(true)
        expect(result.data?.reportType).toBe(reportType)
      }
    })
  })
})