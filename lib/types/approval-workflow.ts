// Story 2.7: Approval Workflow & Audit Trail Types
// Comprehensive TypeScript types for hiring decisions and audit management

// Decision types for approval workflow
export type DecisionType = 
  | 'approved'              // Applicant approved for hiring
  | 'conditionally_approved' // Approved with conditions
  | 'rejected'              // Applicant rejected
  | 'deferred'             // Decision postponed pending additional information
  | 'withdrawn'            // Applicant withdrew application

// Approval reason categorization
export type ApprovalReason = 
  | 'qualifications_met'      // All requirements satisfied
  | 'exceptional_candidate'   // Above average qualifications
  | 'conditional_approval'    // Approved with conditions
  | 'insufficient_experience' // Lacks required experience
  | 'failed_background'       // Background check issues
  | 'poor_interview'          // Interview performance concerns
  | 'cultural_fit'           // Cultural alignment issues
  | 'position_filled'        // Position no longer available
  | 'applicant_withdrew'     // Applicant withdrew
  | 'other'                  // Other reason (requires explanation)

// Manager approval authority levels
export type AuthorityLevel = 
  | 'junior_manager'    // Limited approval authority
  | 'senior_manager'    // Full approval authority
  | 'regional_director' // Cross-location approval authority
  | 'admin'            // Ultimate approval authority

// Audit event types for decision tracking
export type AuditEventType = 
  | 'decision_created'      // Initial approval/rejection decision
  | 'decision_modified'     // Decision changed after creation
  | 'decision_delegated'    // Decision authority delegated
  | 'decision_appealed'     // Applicant appealed decision
  | 'appeal_reviewed'       // Appeal review completed
  | 'profile_created'       // Guard profile created for approved applicant
  | 'compliance_review'     // Compliance review of decision
  | 'audit_export'         // Compliance audit data exported

// Core hiring decision interface
export interface HiringDecision {
  id: string
  applicationId: string
  decisionType: DecisionType
  approverId: string
  decisionReason: ApprovalReason
  decisionRationale: string
  supportingEvidence?: Record<string, any> // References to interview feedback, documents, etc.
  delegatedBy?: string // If decision was delegated
  decisionConfidence: number // 1-10 confidence scale
  createdAt: Date
  effectiveDate: Date
  digitalSignature: string // Cryptographic signature for accountability
  authorityLevel: AuthorityLevel
  complianceNotes?: string // TOPS compliance considerations
  appealsDeadline?: Date // Deadline for decision appeals
  isFinal: boolean // Whether decision can be appealed
}

// Immutable audit trail for hiring decisions
export interface DecisionAuditRecord {
  id: string
  hiringDecisionId: string
  auditEventType: AuditEventType
  actorId: string
  actorName: string
  previousState?: Record<string, any> // Previous decision state
  newState?: Record<string, any> // New decision state
  changeReason: string
  digitalSignature: string // Cryptographic audit signature
  clientIpAddress?: string // Source IP for security tracking
  userAgent?: string // Client information for audit
  createdAt: Date
  isSystemGenerated: boolean
  complianceFlag: boolean // Flag for compliance review
}

// Manager delegation for approval authority
export interface ManagerDelegation {
  id: string
  delegatingManagerId: string
  delegateManagerId: string
  authorityLevel: AuthorityLevel
  delegationReason: string
  effectiveFrom: Date
  effectiveUntil?: Date
  isActive: boolean
  createdAt: Date
  revokedAt?: Date
  revocationReason?: string
  maxDecisionsPerDay?: number // Limit for delegated decisions
  applicationsFilter?: Record<string, any> // Restrictions on which applications can be decided
}

// Secure profile creation links for approved applicants
export interface ProfileCreationToken {
  id: string
  applicationId: string
  hiringDecisionId: string
  secureToken: string
  createdAt: Date
  expiresAt: Date
  usedAt?: Date
  guardProfileId?: string // References guard profile once created
  isActive: boolean
}

// Request interfaces for approval actions
export interface ApprovalDecisionRequest {
  applicationId: string
  decisionType: DecisionType
  decisionReason: ApprovalReason
  decisionRationale: string
  supportingEvidence?: Record<string, any>
  decisionConfidence: number
  complianceNotes?: string
  conditions?: string[] // For conditional approvals
  delegatedBy?: string
}

export interface RejectionDecisionRequest {
  applicationId: string
  decisionReason: ApprovalReason
  decisionRationale: string
  feedback?: string
  appealInstructions?: string
  decisionConfidence: number
  respectfulNotification: boolean
}

export interface DelegationRequest {
  delegateManagerId: string
  authorityLevel: AuthorityLevel
  delegationReason: string
  effectiveUntil?: Date
  maxDecisionsPerDay?: number
  applicationsFilter?: Record<string, any>
}

// Component props interfaces
export interface ApprovalDecisionManagerProps {
  applicationId: string
  applicantData: Record<string, any>
  interviewSummary?: Record<string, any>
  backgroundCheckStatus?: Record<string, any>
  onDecisionSubmit?: (decision: HiringDecision) => void
  enableDelegation?: boolean
  className?: string
}

export interface ApprovalDecisionFormProps {
  applicantData: Record<string, any>
  onApprovalSubmit: (decision: ApprovalDecisionRequest) => Promise<void>
  onRejectionSubmit: (decision: RejectionDecisionRequest) => Promise<void>
  managerAuthorityLevel: AuthorityLevel
  availableDelegations?: ManagerDelegation[]
  className?: string
}

export interface ManagerDelegationInterfaceProps {
  managerId: string
  onDelegationCreate: (delegation: DelegationRequest) => Promise<void>
  activeDelegations: ManagerDelegation[]
  availableManagers: Array<{ id: string; name: string; email: string }>
  maxAuthorityLevel: AuthorityLevel
  className?: string
}

export interface ApprovalHistoryDashboardProps {
  applicationId?: string
  managerId?: string
  showExportOptions?: boolean
  enableFiltering?: boolean
  className?: string
}

export interface AuditTrailViewerProps {
  decisionId: string
  showIntegrityVerification?: boolean
  enableExport?: boolean
  className?: string
}

// Service result types
export type ServiceResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

// Approval workflow filters and query options
export interface ApprovalFilters {
  decisionTypes?: DecisionType[]
  approverIds?: string[]
  dateRange?: {
    from: Date
    to: Date
  }
  authorityLevels?: AuthorityLevel[]
  complianceFlags?: boolean[]
  searchQuery?: string
}

export interface AuditFilters {
  auditEventTypes?: AuditEventType[]
  actorIds?: string[]
  dateRange?: {
    from: Date
    to: Date
  }
  complianceFlags?: boolean[]
  systemGenerated?: boolean
}

// Compliance reporting types
export interface ComplianceReport {
  id: string
  reportType: 'approval_summary' | 'audit_trail' | 'delegation_report' | 'decision_integrity'
  generatedAt: Date
  reportPeriod: {
    from: Date
    to: Date
  }
  totalDecisions: number
  approvals: number
  rejections: number
  delegatedDecisions: number
  auditRecords: number
  complianceIssues: number
  reportData: Record<string, any>
}

export interface ComplianceFilters {
  reportType?: string[]
  dateRange?: {
    from: Date
    to: Date
  }
  includeAuditTrail?: boolean
  includeDecisionDetails?: boolean
}

// Configuration interfaces
export interface ApprovalWorkflowConfig {
  enableDigitalSignatures: boolean
  requireManagerApproval: boolean
  autoCreateProfiles: boolean
  auditRetentionDays: number
  appealPeriodDays: number
  maxDelegationsPerManager: number
  complianceReporting: {
    enabled: boolean
    schedule: 'daily' | 'weekly' | 'monthly'
    recipients: string[]
  }
}

// Email template types for notifications
export interface ApprovalNotificationData {
  decision: HiringDecision
  applicant: {
    firstName: string
    lastName: string
    email: string
  }
  approver: {
    firstName: string
    lastName: string
    email: string
  }
  profileCreationLink?: string
  appealInstructions?: string
  complianceRequirements?: string[]
}

// Profile creation progress tracking
export interface ProfileCreationProgress {
  tokenId: string
  applicationId: string
  status: 'pending' | 'in_progress' | 'completed' | 'expired'
  completionPercentage: number
  completedSteps: string[]
  remainingSteps: string[]
  lastActivity?: Date
  remindersSent: number
}

// Note: Types are already exported above