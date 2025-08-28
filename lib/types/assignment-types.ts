// Story 3.2: Shift Assignment & Eligibility System Types
// TypeScript interfaces for assignment operations with Epic 2 integration

// Assignment Status Types
export type AssignmentStatus = 
  | 'pending'        // Assignment sent, awaiting guard response
  | 'accepted'       // Guard accepted assignment
  | 'declined'       // Guard declined assignment
  | 'expired'        // Assignment expired without response
  | 'cancelled'      // Assignment cancelled by manager
  | 'confirmed';     // Final confirmation completed

export type GuardResponse = 
  | 'accept'         // Guard accepts assignment
  | 'decline'        // Guard declines assignment
  | 'conditional';   // Guard accepts with conditions

export type AssignmentMethod = 
  | 'manual'         // Manager manually assigned
  | 'suggested'      // Manager selected from AI suggestions
  | 'batch'          // Part of batch assignment
  | 'auto';          // Automatically assigned by system

export type AvailabilityType = 
  | 'available'      // Guard is available to work
  | 'unavailable'    // Guard is not available
  | 'preferred'      // Guard prefers to work these hours
  | 'emergency_only'; // Only available for emergency shifts

export type AvailabilityStatus = 
  | 'active'         // Currently active availability rule
  | 'inactive'       // Temporarily disabled
  | 'archived';      // Historical record

// Core Assignment Interface
export interface ShiftAssignment {
  id: string;
  shiftId: string;
  guardId: string;

  // Assignment Status & Workflow
  assignmentStatus: AssignmentStatus;
  assignedBy: string; // User ID
  assignedAt: Date;

  // Guard Response
  guardResponse?: GuardResponse;
  guardRespondedAt?: Date;
  guardResponseNotes?: string;

  // Assignment Metadata
  eligibilityScore?: number; // 0.00-1.00 matching score
  assignmentMethod: AssignmentMethod;

  // Conflict & Validation
  conflictOverridden: boolean;
  overrideReason?: string;
  overrideBy?: string;
  overrideAt?: Date;

  // Assignment Notes
  assignmentNotes?: string;
  managerNotes?: string;

  // Audit Trail
  createdAt: Date;
  updatedAt: Date;
}

// Guard Availability Interface
export interface GuardAvailability {
  id: string;
  guardId: string;

  // Availability Window
  availabilityWindow: {
    start: Date;
    end: Date;
  };
  availabilityType: AvailabilityType;

  // Availability Metadata
  isRecurring: boolean;
  recurrencePattern?: any; // RRULE or custom pattern
  priority: number; // 1-5: 1=Must work, 5=Prefer not

  // Status & Notes
  status: AvailabilityStatus;
  notes?: string;

  // Location Preferences
  locationSpecific: boolean;
  preferredLocations?: string[]; // Array of location IDs

  // Audit Trail
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// Assignment Creation Data
export interface AssignmentCreateData {
  shiftId: string;
  guardId: string;
  assignmentMethod: AssignmentMethod;
  assignmentNotes?: string;
  managerNotes?: string;
  eligibilityScore?: number;
  overrideConflicts?: boolean;
  overrideReason?: string;
}

// Guard Eligibility Check Result
export interface GuardEligibilityResult {
  guardId: string;
  eligible: boolean;
  eligibilityScore: number;
  reasons: string[];
  conflicts?: AssignmentConflict[];
  certificationMatch?: CertificationMatch;
  availabilityMatch?: AvailabilityMatch;
  proximityScore?: number;
  performanceScore?: number;
}

// Assignment Conflict Detection
export interface AssignmentConflict {
  conflictType: 'time_overlap' | 'availability_conflict' | 'certification_missing' | 'location_conflict';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  details: {
    shiftId?: string;
    shiftTitle?: string;
    timeRange?: {
      start: Date;
      end: Date;
    };
    conflictingAssignmentId?: string;
    missingCertifications?: string[];
    availabilityType?: AvailabilityType;
  };
  canOverride: boolean;
  overrideRequired: boolean;
}

// Certification Matching
export interface CertificationMatch {
  required: string[];
  available: string[];
  matched: string[];
  missing: string[];
  matchPercentage: number;
  criticalMissing: string[];
}

// Availability Matching
export interface AvailabilityMatch {
  requestedWindow: {
    start: Date;
    end: Date;
  };
  availabilityWindows: GuardAvailability[];
  overlapPercentage: number;
  preferredMatch: boolean;
  emergencyOnly: boolean;
}

// Guard Response Data
export interface GuardResponseData {
  assignmentId: string;
  response: GuardResponse;
  notes?: string;
  conditionalDetails?: {
    acceptedConditions: string[];
    requestedChanges: string[];
    alternativeTimeRanges?: {
      start: Date;
      end: Date;
    }[];
  };
}

// Batch Assignment Operations
export interface BatchAssignmentRequest {
  assignments: AssignmentCreateData[];
  validateConflicts: boolean;
  allowPartialSuccess: boolean;
  notifyGuards: boolean;
  scheduledFor?: Date; // Future assignment scheduling
}

export interface BatchAssignmentResult {
  batchId: string;
  totalAssignments: number;
  successfulAssignments: number;
  failedAssignments: number;
  assignments: {
    assignment: AssignmentCreateData;
    success: boolean;
    assignmentId?: string;
    error?: string;
    conflicts?: AssignmentConflict[];
  }[];
  startedAt: Date;
  completedAt?: Date;
  status: 'processing' | 'completed' | 'failed' | 'partially_completed';
}

// Guard Matching Algorithm Result
export interface GuardMatchResult {
  guardId: string;
  matchScore: number; // Overall matching score 0-1
  ranking: number; // 1-based ranking among eligible guards
  eligibility: GuardEligibilityResult;
  
  // Scoring Components
  certificationScore: number;
  availabilityScore: number;
  proximityScore: number;
  performanceScore: number;
  preferenceScore: number;
  
  // Detailed Analysis
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  
  // Assignment Confidence
  confidence: 'high' | 'medium' | 'low';
  recommendedAction: 'auto_assign' | 'manager_review' | 'not_recommended';
}

// Assignment Dashboard Data
export interface AssignmentDashboardData {
  // Summary Statistics
  totalShifts: number;
  assignedShifts: number;
  unassignedShifts: number;
  pendingResponses: number;
  confirmedAssignments: number;
  
  // Assignment Pipeline
  recentAssignments: ShiftAssignment[];
  pendingAssignments: ShiftAssignment[];
  upcomingDeadlines: {
    assignmentId: string;
    shiftTitle: string;
    guardName: string;
    deadline: Date;
    responseTime: number; // Hours remaining
  }[];
  
  // Conflicts & Issues
  activeConflicts: AssignmentConflict[];
  expiredAssignments: ShiftAssignment[];
  requiringAttention: {
    assignmentId: string;
    issue: string;
    priority: 'high' | 'medium' | 'low';
    actionRequired: string;
  }[];
  
  // Performance Metrics
  assignmentSuccessRate: number;
  averageResponseTime: number; // Hours
  guardAcceptanceRate: number;
  conflictResolutionRate: number;
}

// Assignment Notification Types
export interface AssignmentNotification {
  id: string;
  type: 'assignment_created' | 'guard_response' | 'assignment_confirmed' | 'assignment_expired' | 'conflict_detected';
  assignmentId: string;
  recipientId: string; // User or Guard ID
  recipientType: 'manager' | 'guard' | 'admin';
  
  // Notification Content
  title: string;
  message: string;
  actionRequired: boolean;
  actionUrl?: string;
  
  // Delivery Settings
  deliveryMethods: ('email' | 'in_app' | 'sms' | 'push')[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // Status Tracking
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  actionTakenAt?: Date;
  
  // Metadata
  metadata: {
    shiftTitle?: string;
    guardName?: string;
    managerName?: string;
    shiftTime?: {
      start: Date;
      end: Date;
    };
    responseDeadline?: Date;
  };
}

// Service Result Pattern (consistent with Story 3.1)
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: Date;
    source: string;
    version: string;
  };
}

// API Response Types
export type AssignmentListResponse = ServiceResult<{
  assignments: ShiftAssignment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}>;

export type EligibilityCheckResponse = ServiceResult<{
  shiftId: string;
  eligibleGuards: GuardEligibilityResult[];
  totalGuards: number;
  eligibleCount: number;
  suggestedMatches: GuardMatchResult[];
}>;

export type ConflictCheckResponse = ServiceResult<{
  hasConflicts: boolean;
  conflicts: AssignmentConflict[];
  canProceed: boolean;
  requiresOverride: boolean;
}>;

export type BatchAssignmentResponse = ServiceResult<BatchAssignmentResult>;

// Form Validation Types
export interface AssignmentFormData {
  shiftId: string;
  guardId: string;
  assignmentMethod: AssignmentMethod;
  assignmentNotes?: string;
  managerNotes?: string;
  overrideConflicts: boolean;
  overrideReason?: string;
}

export interface GuardResponseFormData {
  response: GuardResponse;
  notes?: string;
  conditionalAcceptance?: boolean;
  alternativeTimeRanges?: {
    start: string; // ISO string for forms
    end: string;
  }[];
  requestedChanges?: string[];
}

export interface AvailabilityFormData {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  availabilityType: AvailabilityType;
  priority: number;
  isRecurring: boolean;
  recurrencePattern?: any;
  notes?: string;
  locationSpecific: boolean;
  preferredLocations?: string[];
}

// Error Codes for Assignment Operations
export enum AssignmentErrorCodes {
  SHIFT_NOT_FOUND = 'SHIFT_NOT_FOUND',
  GUARD_NOT_FOUND = 'GUARD_NOT_FOUND',
  GUARD_NOT_ELIGIBLE = 'GUARD_NOT_ELIGIBLE',
  TIME_CONFLICT = 'TIME_CONFLICT',
  CERTIFICATION_MISSING = 'CERTIFICATION_MISSING',
  ASSIGNMENT_EXISTS = 'ASSIGNMENT_EXISTS',
  ASSIGNMENT_NOT_FOUND = 'ASSIGNMENT_NOT_FOUND',
  INVALID_ASSIGNMENT_STATUS = 'INVALID_ASSIGNMENT_STATUS',
  RESPONSE_DEADLINE_PASSED = 'RESPONSE_DEADLINE_PASSED',
  UNAUTHORIZED_OPERATION = 'UNAUTHORIZED_OPERATION',
  BATCH_OPERATION_FAILED = 'BATCH_OPERATION_FAILED',
  CONFLICT_OVERRIDE_REQUIRED = 'CONFLICT_OVERRIDE_REQUIRED',
  INVALID_GUARD_RESPONSE = 'INVALID_GUARD_RESPONSE',
  AVAILABILITY_NOT_FOUND = 'AVAILABILITY_NOT_FOUND',
  NOTIFICATION_DELIVERY_FAILED = 'NOTIFICATION_DELIVERY_FAILED'
}