import type { GuardLead } from './guard-leads'

// Pipeline stages for Kanban workflow
export type PipelineStage = 
  | 'lead_captured'           // Initial lead from Story 2.1
  | 'application_received'    // Application submitted from Story 2.2
  | 'under_review'           // Manager reviewing with AI assistance from Story 2.3
  | 'background_check'       // Background verification process
  | 'interview_scheduled'    // Interview arranged
  | 'interview_completed'    // Interview finished, awaiting decision
  | 'approved'              // Approved for hiring
  | 'rejected'              // Not suitable for hiring
  | 'profile_created'       // Guard profile created, ready for scheduling

// Comment types for application collaboration
export type CommentType = 
  | 'general'
  | 'interview_feedback'
  | 'background_check'
  | 'manager_note'
  | 'system_notification'

// Extended GuardLead interface with Kanban workflow fields
export interface GuardApplication extends GuardLead {
  // New Kanban workflow fields
  pipeline_stage: PipelineStage
  assigned_to?: string
  priority: number // 1-10 scale (1 = highest priority)
  stage_changed_at: string
  stage_changed_by?: string
  workflow_notes?: string
  
  // Existing fields from Stories 2.2-2.3
  application_data?: Record<string, any>
  ai_parsed_data?: Record<string, any>
  documents?: Record<string, any>
  application_reference?: string
  confidence_scores?: Record<string, any>
  application_submitted_at?: string
}

// Application comment interface
export interface ApplicationComment {
  id: string
  application_id: string
  author_id?: string
  author_name?: string
  comment_text: string
  comment_type: CommentType
  parent_comment_id?: string
  created_at: string
  updated_at: string
  is_deleted: boolean
  mentions?: string[] // User IDs mentioned in comment
  replies?: ApplicationComment[] // Child comments for threading
}

// Kanban board props
export interface HiringKanbanBoardProps {
  initialFilters?: KanbanFilters
  onApplicationSelect?: (application: GuardApplication) => void
  showMetrics?: boolean
  enableRealTimeUpdates?: boolean
  className?: string
}

// Kanban column props
export interface KanbanColumnProps {
  stage: PipelineStage
  applications: GuardApplication[]
  onApplicationDrop: (applicationId: string, newStage: PipelineStage) => void
  showCount?: boolean
  maxHeight?: string
  className?: string
}

// Application card props
export interface ApplicationKanbanCardProps {
  application: GuardApplication
  onCardClick?: (application: GuardApplication) => void
  showAIConfidence?: boolean
  showPriority?: boolean
  showAssignment?: boolean
  isDragging?: boolean
  className?: string
}

// Drag and drop hook options
export interface UseDragAndDropOptions {
  onStageChange: (applicationId: string, newStage: PipelineStage) => Promise<void>
  optimisticUpdates?: boolean
  conflictResolution?: 'last-write-wins' | 'merge' | 'prompt'
}

// Kanban filters interface
export interface KanbanFilters {
  stages?: PipelineStage[]
  assignedManagers?: string[]
  priorities?: number[]
  dateRange?: {
    from: Date
    to: Date
  }
  searchQuery?: string
  showOnlyAssignedToMe?: boolean
}

// Stage transition request
export interface StageTransitionRequest {
  applicationId: string
  newStage: PipelineStage
  notes?: string
  userId?: string
}

// Stage transition response
export interface StageTransitionResponse {
  success: boolean
  data?: {
    application: GuardApplication
    previousStage: PipelineStage
  }
  error?: string
}

// Bulk actions interface
export interface BulkActionRequest {
  applicationIds: string[]
  action: 'assign' | 'stage_change' | 'priority_change' | 'email' | 'comment'
  data?: Record<string, any>
}

// Comment creation request
export interface CreateCommentRequest {
  applicationId: string
  commentText: string
  commentType: CommentType
  parentCommentId?: string
}

// Comment update request
export interface UpdateCommentRequest {
  commentText?: string
  commentType?: CommentType
}

// Comment query options
export interface CommentQueryOptions {
  includeDeleted?: boolean
  commentType?: CommentType
  limit?: number
  offset?: number
}

// Stage configuration
export interface StageConfiguration {
  stage: PipelineStage
  title: string
  description: string
  color: string
  maxItems?: number
  allowedTransitions: PipelineStage[]
  autoActions?: {
    emailTemplate?: string
    notifications?: string[]
    webhooks?: string[]
  }
}

// Default stage configurations
export const STAGE_CONFIGURATIONS: Record<PipelineStage, StageConfiguration> = {
  lead_captured: {
    stage: 'lead_captured',
    title: 'Lead Captured',
    description: 'Initial leads waiting for application',
    color: 'bg-slate-100 border-slate-300',
    allowedTransitions: ['application_received', 'rejected'],
    autoActions: {
      emailTemplate: 'application-invitation'
    }
  },
  application_received: {
    stage: 'application_received',
    title: 'Application Received',
    description: 'Applications submitted and ready for review',
    color: 'bg-blue-100 border-blue-300',
    allowedTransitions: ['under_review', 'rejected'],
    autoActions: {
      emailTemplate: 'application-received-confirmation'
    }
  },
  under_review: {
    stage: 'under_review',
    title: 'Under Review',
    description: 'Manager reviewing with AI assistance',
    color: 'bg-amber-100 border-amber-300',
    allowedTransitions: ['background_check', 'interview_scheduled', 'approved', 'rejected']
  },
  background_check: {
    stage: 'background_check',
    title: 'Background Check',
    description: 'Background verification in progress',
    color: 'bg-purple-100 border-purple-300',
    allowedTransitions: ['interview_scheduled', 'approved', 'rejected']
  },
  interview_scheduled: {
    stage: 'interview_scheduled',
    title: 'Interview Scheduled',
    description: 'Interview arranged with applicant',
    color: 'bg-indigo-100 border-indigo-300',
    allowedTransitions: ['interview_completed', 'rejected'],
    autoActions: {
      emailTemplate: 'interview-scheduled'
    }
  },
  interview_completed: {
    stage: 'interview_completed',
    title: 'Interview Complete',
    description: 'Interview finished, awaiting decision',
    color: 'bg-cyan-100 border-cyan-300',
    allowedTransitions: ['approved', 'rejected']
  },
  approved: {
    stage: 'approved',
    title: 'Approved',
    description: 'Approved for hiring',
    color: 'bg-emerald-100 border-emerald-300',
    allowedTransitions: ['profile_created'],
    autoActions: {
      emailTemplate: 'application-approved'
    }
  },
  rejected: {
    stage: 'rejected',
    title: 'Rejected',
    description: 'Application not approved',
    color: 'bg-red-100 border-red-300',
    allowedTransitions: [],
    autoActions: {
      emailTemplate: 'application-rejected'
    }
  },
  profile_created: {
    stage: 'profile_created',
    title: 'Profile Created',
    description: 'Guard profile created, ready for scheduling',
    color: 'bg-green-100 border-green-300',
    allowedTransitions: [],
    autoActions: {
      emailTemplate: 'welcome-guard'
    }
  }
}

// Priority levels configuration
export const PRIORITY_LEVELS = {
  1: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-100' },
  2: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  3: { label: 'Medium-High', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  4: { label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  5: { label: 'Normal', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  6: { label: 'Medium-Low', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  7: { label: 'Low', color: 'text-green-600', bgColor: 'bg-green-100' },
  8: { label: 'Very Low', color: 'text-teal-600', bgColor: 'bg-teal-100' },
  9: { label: 'Minimal', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  10: { label: 'Backlog', color: 'text-purple-600', bgColor: 'bg-purple-100' }
} as const