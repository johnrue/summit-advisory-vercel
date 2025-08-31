// Story 2.7: Approval Workflow Service Tests
// Comprehensive test suite for approval workflow operations

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { ApprovalWorkflowService } from '@/lib/services/approval-workflow-service'
import type { 
  ApprovalDecisionRequest,
  RejectionDecisionRequest,
  HiringDecision,
  DecisionType,
  ApprovalReason,
  AuthorityLevel
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
        single: jest.fn(),
        order: jest.fn(() => ({
          eq: jest.fn(),
          single: jest.fn()
        }))
      })),
      order: jest.fn(() => ({
        eq: jest.fn(),
        single: jest.fn()
      })),
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
    })),
    update: jest.fn(() => ({
      eq: jest.fn()
    }))
  })),
  rpc: jest.fn()
}

jest.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabase
}))

describe('ApprovalWorkflowService', () => {
  let service: ApprovalWorkflowService
  let mockUser: any

  beforeEach(() => {
    service = new ApprovalWorkflowService()
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

  describe('submitApprovalDecision', () => {
    it('should successfully submit an approval decision', async () => {
      const applicationId = 'app-123'
      const approvalRequest: ApprovalDecisionRequest = {
        applicationId,
        decisionType: 'approved' as DecisionType,
        decisionReason: 'qualifications_met' as ApprovalReason,
        decisionRationale: 'Candidate meets all requirements and shows excellent potential',
        decisionConfidence: 8,
        supportingEvidence: {
          interviewScore: 9,
          backgroundCheckPassed: true
        }
      }

      const mockDecisionRecord = {
        id: 'decision-123',
        application_id: applicationId,
        decision_type: 'approved',
        approver_id: mockUser.id,
        decision_reason: 'qualifications_met',
        decision_rationale: approvalRequest.decisionRationale,
        decision_confidence: 8,
        digital_signature: 'mock-signature',
        approval_authority_level: 'senior_manager',
        created_at: new Date().toISOString(),
        effective_date: new Date().toISOString(),
        is_final: true
      }

      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      // Mock successful RPC call for authority validation
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      })

      // Mock successful insert
      const mockInsertChain = {
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockDecisionRecord,
            error: null
          })
        }))
      }
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue(mockInsertChain),
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockDecisionRecord,
              error: null
            }),
            order: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({
                data: [mockDecisionRecord],
                error: null
              }),
              single: jest.fn().mockResolvedValue({
                data: mockDecisionRecord,
                error: null
              })
            }))
          })),
          order: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({
              data: [mockDecisionRecord],
              error: null
            }),
            single: jest.fn().mockResolvedValue({
              data: mockDecisionRecord,
              error: null
            })
          })),
          in: jest.fn().mockResolvedValue({
            data: [mockDecisionRecord],
            error: null
          }),
          gte: jest.fn(() => ({
            lte: jest.fn().mockResolvedValue({
              data: [mockDecisionRecord],
              error: null
            })
          })),
          lte: jest.fn().mockResolvedValue({
            data: [mockDecisionRecord],
            error: null
          })
        })),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({
            data: mockDecisionRecord,
            error: null
          })
        }))
      })

      const result = await service.submitApprovalDecision(applicationId, approvalRequest)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.decisionType).toBe('approved')
      expect(result.data?.decisionReason).toBe('qualifications_met')
      expect(result.data?.decisionConfidence).toBe(8)
    })

    it('should fail when user is not authenticated', async () => {
      const applicationId = 'app-123'
      const approvalRequest: ApprovalDecisionRequest = {
        applicationId,
        decisionType: 'approved' as DecisionType,
        decisionReason: 'qualifications_met' as ApprovalReason,
        decisionRationale: 'Test rationale',
        decisionConfidence: 8
      }

      // Mock failed authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null }
      })

      const result = await service.submitApprovalDecision(applicationId, approvalRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('should fail when user has insufficient authority', async () => {
      const applicationId = 'app-123'
      const approvalRequest: ApprovalDecisionRequest = {
        applicationId,
        decisionType: 'approved' as DecisionType,
        decisionReason: 'qualifications_met' as ApprovalReason,
        decisionRationale: 'Test rationale',
        decisionConfidence: 8
      }

      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      // Mock authority validation failure
      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null
      })

      const result = await service.submitApprovalDecision(applicationId, approvalRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insufficient approval authority')
    })
  })

  describe('submitRejectionDecision', () => {
    it('should successfully submit a rejection decision', async () => {
      const applicationId = 'app-123'
      const rejectionRequest: RejectionDecisionRequest = {
        applicationId,
        decisionReason: 'insufficient_experience' as ApprovalReason,
        decisionRationale: 'Candidate lacks the required 5 years of security experience',
        decisionConfidence: 7,
        feedback: 'Consider gaining more experience in commercial security',
        respectfulNotification: true
      }

      const mockDecisionRecord = {
        id: 'decision-456',
        application_id: applicationId,
        decision_type: 'rejected',
        approver_id: mockUser.id,
        decision_reason: 'insufficient_experience',
        decision_rationale: rejectionRequest.decisionRationale,
        decision_confidence: 7,
        digital_signature: 'mock-signature',
        approval_authority_level: 'senior_manager',
        created_at: new Date().toISOString(),
        effective_date: new Date().toISOString(),
        appeals_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_final: false
      }

      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser }
      })

      // Mock successful authority validation
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      })

      // Mock successful insert
      const mockInsertChain = {
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockDecisionRecord,
            error: null
          })
        }))
      }
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue(mockInsertChain),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({
            data: mockDecisionRecord,
            error: null
          })
        }))
      })

      const result = await service.submitRejectionDecision(applicationId, rejectionRequest)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.decisionType).toBe('rejected')
      expect(result.data?.decisionReason).toBe('insufficient_experience')
      expect(result.data?.isFinal).toBe(false)
      expect(result.data?.appealsDeadline).toBeDefined()
    })
  })

  describe('getDecisionHistory', () => {
    it('should return decision history for an application', async () => {
      const applicationId = 'app-123'
      const mockDecisions = [
        {
          id: 'decision-1',
          application_id: applicationId,
          decision_type: 'approved',
          approver_id: 'manager-1',
          decision_reason: 'qualifications_met',
          decision_rationale: 'Excellent candidate',
          decision_confidence: 9,
          created_at: new Date().toISOString(),
          effective_date: new Date().toISOString(),
          digital_signature: 'signature-1',
          approval_authority_level: 'senior_manager',
          is_final: true
        }
      ]

      // Mock successful query
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({
              data: mockDecisions,
              error: null
            })
          }))
        }))
      })

      const result = await service.getDecisionHistory(applicationId)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].applicationId).toBe(applicationId)
      expect(result.data?.[0].decisionType).toBe('approved')
    })

    it('should handle database errors gracefully', async () => {
      const applicationId = 'app-123'

      // Mock database error
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' }
            })
          }))
        }))
      })

      const result = await service.getDecisionHistory(applicationId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
      expect(
        typeof result.error === 'object' && result.error?.code
      ).toBe('DATABASE_ERROR')
    })
  })

  describe('validateDecisionAuthority', () => {
    it('should validate manager authority successfully', async () => {
      const managerId = 'manager-123'
      const decisionType: DecisionType = 'approved'

      // Mock successful RPC call
      mockSupabase.rpc.mockResolvedValue({
        data: true,
        error: null
      })

      const result = await service.validateDecisionAuthority(managerId, decisionType)

      expect(result.success).toBe(true)
      expect(result.data).toBe(true)
    })

    it('should return false for insufficient authority', async () => {
      const managerId = 'junior-manager-123'
      const decisionType: DecisionType = 'approved'

      // Mock RPC call returning false
      mockSupabase.rpc.mockResolvedValue({
        data: false,
        error: null
      })

      const result = await service.validateDecisionAuthority(managerId, decisionType)

      expect(result.success).toBe(true)
      expect(result.data).toBe(false)
    })
  })

  describe('generateProfileCreationLink', () => {
    it('should generate secure profile creation link', async () => {
      const decisionId = 'decision-123'
      const mockDecision = {
        application_id: 'app-123'
      }
      const mockToken = 'secure-token-123'

      // Mock decision lookup
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockDecision,
              error: null
            })
          }))
        }))
      })

      // Mock token generation
      mockSupabase.rpc.mockResolvedValue({
        data: mockToken,
        error: null
      })

      const result = await service.generateProfileCreationLink(decisionId)

      expect(result.success).toBe(true)
      expect(result.data).toContain(mockToken)
      expect(result.data).toContain('/profile-creation/')
    })

    it('should fail when decision is not found', async () => {
      const decisionId = 'nonexistent-decision'

      // Mock decision not found
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Decision not found' }
            })
          }))
        }))
      })

      const result = await service.generateProfileCreationLink(decisionId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Decision not found')
    })
  })
})