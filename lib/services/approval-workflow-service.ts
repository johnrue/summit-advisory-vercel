// Story 2.7: Approval Workflow Service
// Core approval decision operations and business logic

import { createClient } from '@/lib/supabase'
import type { 
  HiringDecision,
  DecisionAuditRecord,
  ManagerDelegation,
  ProfileCreationToken,
  ApprovalDecisionRequest,
  RejectionDecisionRequest,
  DelegationRequest,
  ServiceResult,
  ApprovalFilters,
  DecisionType,
  AuthorityLevel
} from '@/lib/types/approval-workflow'

export class ApprovalWorkflowService {
  private supabase = createClient()

  /**
   * Submit an approval decision for an applicant
   */
  async submitApprovalDecision(
    applicationId: string, 
    decision: ApprovalDecisionRequest
  ): Promise<ServiceResult<HiringDecision>> {
    try {
      // Validate manager authority
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'AUTH_REQUIRED' }
      }

      // Check if user has approval authority
      const authorityCheck = await this.validateDecisionAuthority(user.id, 'approved')
      if (!authorityCheck.success) {
        return { success: false, error: 'Insufficient approval authority', code: 'INSUFFICIENT_AUTHORITY' }
      }

      // Generate digital signature for the decision
      const digitalSignature = await this.generateDigitalSignature(user.id, decision)

      // Determine authority level based on user role
      const authorityLevel = await this.getUserAuthorityLevel(user.id)

      // Create hiring decision record
      const { data, error } = await this.supabase
        .from('hiring_decisions')
        .insert({
          application_id: applicationId,
          decision_type: decision.decisionType,
          approver_id: user.id,
          decision_reason: decision.decisionReason,
          decision_rationale: decision.decisionRationale,
          supporting_evidence: decision.supportingEvidence,
          delegated_by: decision.delegatedBy,
          decision_confidence: decision.decisionConfidence,
          digital_signature: digitalSignature,
          approval_authority_level: authorityLevel,
          compliance_notes: decision.complianceNotes,
          appeals_deadline: decision.decisionType === 'rejected' 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            : null,
          is_final: decision.decisionType !== 'deferred'
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message, code: 'DATABASE_ERROR' }
      }

      // Update application stage based on decision
      const stageUpdate = decision.decisionType === 'approved' ? 'approved' : 'rejected'
      await this.updateApplicationStage(applicationId, stageUpdate, user.id)

      // Generate profile creation token for approved applicants
      if (decision.decisionType === 'approved' || decision.decisionType === 'conditionally_approved') {
        await this.triggerProfileCreation(data.id)
      }

      return { success: true, data: this.mapDatabaseToHiringDecision(data) }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'APPROVAL_ERROR' 
      }
    }
  }

  /**
   * Submit a rejection decision for an applicant
   */
  async submitRejectionDecision(
    applicationId: string, 
    decision: RejectionDecisionRequest
  ): Promise<ServiceResult<HiringDecision>> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'AUTH_REQUIRED' }
      }

      // Check if user has rejection authority
      const authorityCheck = await this.validateDecisionAuthority(user.id, 'rejected')
      if (!authorityCheck.success) {
        return { success: false, error: 'Insufficient rejection authority', code: 'INSUFFICIENT_AUTHORITY' }
      }

      // Generate digital signature for the decision
      const digitalSignature = await this.generateDigitalSignature(user.id, decision)
      const authorityLevel = await this.getUserAuthorityLevel(user.id)

      // Create hiring decision record
      const { data, error } = await this.supabase
        .from('hiring_decisions')
        .insert({
          application_id: applicationId,
          decision_type: 'rejected',
          approver_id: user.id,
          decision_reason: decision.decisionReason,
          decision_rationale: decision.decisionRationale,
          supporting_evidence: { 
            feedback: decision.feedback,
            appeal_instructions: decision.appealInstructions,
            respectful_notification: decision.respectfulNotification
          },
          decision_confidence: decision.decisionConfidence,
          digital_signature: digitalSignature,
          approval_authority_level: authorityLevel,
          appeals_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          is_final: false // Rejections can be appealed
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message, code: 'DATABASE_ERROR' }
      }

      // Update application stage to rejected
      await this.updateApplicationStage(applicationId, 'rejected', user.id)

      return { success: true, data: this.mapDatabaseToHiringDecision(data) }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'REJECTION_ERROR' 
      }
    }
  }

  /**
   * Get decision history for an application
   */
  async getDecisionHistory(applicationId: string): Promise<ServiceResult<HiringDecision[]>> {
    try {
      const { data, error } = await this.supabase
        .from('hiring_decisions')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message, code: 'DATABASE_ERROR' }
      }

      return { 
        success: true, 
        data: data.map(this.mapDatabaseToHiringDecision) 
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'HISTORY_ERROR' 
      }
    }
  }

  /**
   * Delegate approval authority to another manager
   */
  async delegateApprovalAuthority(delegation: DelegationRequest): Promise<ServiceResult<ManagerDelegation>> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'AUTH_REQUIRED' }
      }

      // Validate that user can delegate the specified authority level
      const canDelegate = await this.canDelegateAuthority(user.id, delegation.authorityLevel)
      if (!canDelegate) {
        return { success: false, error: 'Cannot delegate this authority level', code: 'DELEGATION_DENIED' }
      }

      const { data, error } = await this.supabase
        .from('manager_delegations')
        .insert({
          delegating_manager_id: user.id,
          delegate_manager_id: delegation.delegateManagerId,
          authority_level: delegation.authorityLevel,
          delegation_reason: delegation.delegationReason,
          effective_until: delegation.effectiveUntil,
          max_decisions_per_day: delegation.maxDecisionsPerDay,
          applications_filter: delegation.applicationsFilter
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message, code: 'DATABASE_ERROR' }
      }

      return { success: true, data: this.mapDatabaseToManagerDelegation(data) }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'DELEGATION_ERROR' 
      }
    }
  }

  /**
   * Generate secure profile creation link for approved applicants
   */
  async generateProfileCreationLink(decisionId: string): Promise<ServiceResult<string>> {
    try {
      const { data: decision } = await this.supabase
        .from('hiring_decisions')
        .select('application_id')
        .eq('id', decisionId)
        .single()

      if (!decision) {
        return { success: false, error: 'Decision not found', code: 'NOT_FOUND' }
      }

      // Generate secure token using database function
      const { data: tokenData, error } = await this.supabase
        .rpc('generate_profile_creation_token', {
          p_application_id: decision.application_id,
          p_hiring_decision_id: decisionId
        })

      if (error) {
        return { success: false, error: error.message, code: 'TOKEN_GENERATION_ERROR' }
      }

      const profileCreationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/profile-creation/${tokenData}`
      return { success: true, data: profileCreationUrl }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'LINK_GENERATION_ERROR' 
      }
    }
  }

  /**
   * Validate decision authority for a manager
   */
  async validateDecisionAuthority(managerId: string, decisionType: DecisionType): Promise<ServiceResult<boolean>> {
    try {
      const { data, error } = await this.supabase
        .rpc('validate_manager_authority', {
          p_manager_id: managerId,
          p_authority_level: 'senior_manager' // Default authority check
        })

      if (error) {
        return { success: false, error: error.message, code: 'AUTHORITY_CHECK_ERROR' }
      }

      return { success: true, data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'VALIDATION_ERROR' 
      }
    }
  }

  /**
   * Get filtered hiring decisions for reporting
   */
  async getHiringDecisions(filters: ApprovalFilters): Promise<ServiceResult<HiringDecision[]>> {
    try {
      let query = this.supabase
        .from('hiring_decisions')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.decisionTypes?.length) {
        query = query.in('decision_type', filters.decisionTypes)
      }

      if (filters.approverIds?.length) {
        query = query.in('approver_id', filters.approverIds)
      }

      if (filters.authorityLevels?.length) {
        query = query.in('approval_authority_level', filters.authorityLevels)
      }

      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.from.toISOString())
          .lte('created_at', filters.dateRange.to.toISOString())
      }

      const { data, error } = await query

      if (error) {
        return { success: false, error: error.message, code: 'DATABASE_ERROR' }
      }

      return { 
        success: true, 
        data: data.map(this.mapDatabaseToHiringDecision) 
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'QUERY_ERROR' 
      }
    }
  }

  // Private helper methods

  private async triggerProfileCreation(decisionId: string): Promise<void> {
    // This will be handled by the ProfileCreationTriggerService
    // For now, just generate the token
    await this.generateProfileCreationLink(decisionId)
  }

  private async updateApplicationStage(
    applicationId: string, 
    stage: string, 
    userId: string
  ): Promise<void> {
    await this.supabase
      .from('guard_leads')
      .update({ 
        pipeline_stage: stage,
        stage_changed_at: new Date().toISOString(),
        stage_changed_by: userId
      })
      .eq('id', applicationId)
  }

  private async generateDigitalSignature(userId: string, decision: any): Promise<string> {
    // Generate a cryptographic signature for the decision
    // In production, this would use proper cryptographic signing
    const signatureData = {
      userId,
      decision,
      timestamp: Date.now()
    }
    return Buffer.from(JSON.stringify(signatureData)).toString('base64')
  }

  private async getUserAuthorityLevel(userId: string): Promise<AuthorityLevel> {
    // Get user role from auth metadata or user profile
    const { data: { user } } = await this.supabase.auth.getUser()
    const userRole = user?.app_metadata?.role || 'manager'
    
    // Map user role to authority level
    switch (userRole) {
      case 'admin':
        return 'admin'
      case 'regional_director':
        return 'regional_director'
      case 'senior_manager':
        return 'senior_manager'
      default:
        return 'junior_manager'
    }
  }

  private async canDelegateAuthority(managerId: string, authorityLevel: AuthorityLevel): Promise<boolean> {
    const userAuthorityLevel = await this.getUserAuthorityLevel(managerId)
    
    // Can only delegate authority levels equal to or lower than their own
    const authorityHierarchy = {
      'junior_manager': 1,
      'senior_manager': 2,
      'regional_director': 3,
      'admin': 4
    }

    return authorityHierarchy[userAuthorityLevel] >= authorityHierarchy[authorityLevel]
  }

  private mapDatabaseToHiringDecision(dbRecord: any): HiringDecision {
    return {
      id: dbRecord.id,
      applicationId: dbRecord.application_id,
      decisionType: dbRecord.decision_type,
      approverId: dbRecord.approver_id,
      decisionReason: dbRecord.decision_reason,
      decisionRationale: dbRecord.decision_rationale,
      supportingEvidence: dbRecord.supporting_evidence,
      delegatedBy: dbRecord.delegated_by,
      decisionConfidence: dbRecord.decision_confidence,
      createdAt: new Date(dbRecord.created_at),
      effectiveDate: new Date(dbRecord.effective_date),
      digitalSignature: dbRecord.digital_signature,
      authorityLevel: dbRecord.approval_authority_level,
      complianceNotes: dbRecord.compliance_notes,
      appealsDeadline: dbRecord.appeals_deadline ? new Date(dbRecord.appeals_deadline) : undefined,
      isFinal: dbRecord.is_final
    }
  }

  private mapDatabaseToManagerDelegation(dbRecord: any): ManagerDelegation {
    return {
      id: dbRecord.id,
      delegatingManagerId: dbRecord.delegating_manager_id,
      delegateManagerId: dbRecord.delegate_manager_id,
      authorityLevel: dbRecord.authority_level,
      delegationReason: dbRecord.delegation_reason,
      effectiveFrom: new Date(dbRecord.effective_from),
      effectiveUntil: dbRecord.effective_until ? new Date(dbRecord.effective_until) : undefined,
      isActive: dbRecord.is_active,
      createdAt: new Date(dbRecord.created_at),
      revokedAt: dbRecord.revoked_at ? new Date(dbRecord.revoked_at) : undefined,
      revocationReason: dbRecord.revocation_reason,
      maxDecisionsPerDay: dbRecord.max_decisions_per_day,
      applicationsFilter: dbRecord.applications_filter
    }
  }
}

// Export singleton instance
export const approvalWorkflowService = new ApprovalWorkflowService()