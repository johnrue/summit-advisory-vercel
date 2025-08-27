// Story 2.7: Approval Workflow Components Export
// Central export file for all approval workflow components

export { ApprovalDecisionManager } from './ApprovalDecisionManager'
export { ApprovalDecisionForm } from './ApprovalDecisionForm'
export { AuditTrailViewer } from './AuditTrailViewer'
export { RejectionWorkflow } from './RejectionWorkflow'
export { ApprovalHistoryDashboard } from './ApprovalHistoryDashboard'

// Export component prop types for external usage
export type { ApprovalDecisionManagerProps } from '@/lib/types/approval-workflow'
export type { ApprovalDecisionFormProps } from '@/lib/types/approval-workflow'
export type { AuditTrailViewerProps } from '@/lib/types/approval-workflow'
export type { ApprovalHistoryDashboardProps } from '@/lib/types/approval-workflow'

// Re-export workflow types for convenience
export type {
  HiringDecision,
  DecisionAuditRecord,
  ManagerDelegation,
  ProfileCreationToken,
  ApprovalDecisionRequest,
  RejectionDecisionRequest,
  DelegationRequest,
  ServiceResult,
  ApprovalFilters,
  ComplianceReport,
  DecisionType,
  ApprovalReason,
  AuthorityLevel,
  AuditEventType
} from '@/lib/types/approval-workflow'