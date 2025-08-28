export type ShiftStatus = 
  | 'draft'           // Initial creation state
  | 'open'            // Ready for assignment
  | 'assigned'        // Guard assigned, awaiting confirmation
  | 'confirmed'       // Guard confirmed assignment
  | 'in_progress'     // Shift currently active
  | 'completed'       // Shift finished successfully
  | 'cancelled'       // Shift cancelled
  | 'no_show'         // Guard failed to show up

export type SyncStatus = 
  | 'pending'         // Awaiting sync
  | 'synced'          // Successfully synced
  | 'failed'          // Sync failed
  | 'retry'           // Scheduled for retry

export type ChangeReason = 
  | 'correction'      // Data correction
  | 'client_request'  // Client requested change
  | 'operational'     // Operational necessity
  | 'guard_request'   // Guard requested change
  | 'emergency'       // Emergency situation

export type ApprovalStatus = 
  | 'draft'           // Template in creation
  | 'pending'         // Awaiting approval
  | 'approved'        // Approved for use
  | 'rejected'        // Rejected, needs changes
  | 'archived'        // No longer active

export interface ContactInfo {
  name: string
  phone: string
  email: string
  role?: string
}

export interface LocationData {
  siteName: string
  address: string
  contactInfo: ContactInfo
  specialInstructions?: string
}

export interface TimeRange {
  startTime: string // ISO 8601 with timezone
  endTime: string   // ISO 8601 with timezone
}

export interface GuardRequirements {
  minimumExperience?: number // months
  requiredSkills?: string[]
  languageRequirements?: string[]
  specificProtocols?: string[]
}

export interface ClientInfo {
  clientId: string
  clientName: string
  billingRate: number
  contractReference?: string
}

export interface RateInformation {
  baseRate: number
  overtimeMultiplier: number
  specialRates?: Record<string, number>
}

export interface CalendarSync {
  googleCalendarId?: string
  outlookCalendarId?: string
  lastSyncAt?: string
  syncEnabled: boolean
}

export interface Shift {
  id: string
  title: string
  description?: string
  locationData: LocationData
  timeRange: TimeRange
  estimatedHours: number
  
  // Guard Assignment
  assignedGuardId?: string
  requiredCertifications: string[]
  guardRequirements: GuardRequirements
  
  // Client & Business Information
  clientInfo: ClientInfo
  priority: 1 | 2 | 3 | 4 | 5
  rateInformation: RateInformation
  
  // Operational Status
  status: ShiftStatus
  specialRequirements?: string
  
  // Template & Cloning Support
  templateId?: string
  clonedFrom?: string
  
  // Integration & Sync
  calendarSync: CalendarSync
  payrollSyncStatus: SyncStatus
  
  // Audit Trail
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ShiftCreateData {
  title: string
  description?: string
  locationData: LocationData
  timeRange: TimeRange
  requiredCertifications: string[]
  guardRequirements: GuardRequirements
  clientInfo: ClientInfo
  priority: 1 | 2 | 3 | 4 | 5
  rateInformation: RateInformation
  specialRequirements?: string
}

export interface ShiftUpdateData extends Partial<ShiftCreateData> {
  changeReason: ChangeReason
  changeDescription?: string
  managerSignature: string
}

export interface ShiftTemplate {
  id: string
  name: string
  description?: string
  category: string
  templateData: Omit<ShiftCreateData, 'clientInfo'>
  
  // Access Control & Approval
  createdBy: string
  approvedBy?: string
  approvalStatus: ApprovalStatus
  isShared: boolean
  
  // Usage Analytics
  usageCount: number
  lastUsedAt?: string
  
  // Version Control
  version: number
  parentTemplateId?: string
  
  // Audit Trail
  createdAt: string
  updatedAt: string
}

export interface ShiftTemplateCreateData {
  name: string
  description?: string
  category: string
  templateData: Omit<ShiftCreateData, 'clientInfo'>
  isShared: boolean
}

export interface ShiftChangeHistoryEntry {
  id: string
  shiftId: string
  changedField: string
  previousValue?: any
  newValue?: any
  changeReason: ChangeReason
  changeDescription?: string
  
  // Manager Accountability
  changedBy: string
  managerSignature?: string
  requiresGuardNotification: boolean
  
  // Notification Tracking
  notificationsSent: NotificationRecord[]
  guardAcknowledgedAt?: string
  
  createdAt: string
}

export interface NotificationRecord {
  type: 'email' | 'sms' | 'in_app'
  recipientId: string
  sentAt: string
  acknowledged?: boolean
  acknowledgedAt?: string
}

export interface ShiftFilterOptions {
  status?: ShiftStatus[]
  assignedGuardId?: string
  clientId?: string
  dateRange?: {
    start: string
    end: string
  }
  priority?: number[]
  requiredCertifications?: string[]
}

export interface PaginationOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  warnings?: string[]
}

// Error Codes for Shift Management
export enum ShiftErrorCodes {
  INVALID_GUARD_ELIGIBILITY = 'SHIFT_001',
  SCHEDULING_CONFLICT = 'SHIFT_002',
  MISSING_CERTIFICATIONS = 'SHIFT_003',
  UNAUTHORIZED_MANAGER = 'SHIFT_004',
  INVALID_TIME_RANGE = 'SHIFT_005',
  CLIENT_CONTRACT_VIOLATION = 'SHIFT_006',
  PAYROLL_INTEGRATION_FAILED = 'SHIFT_007',
  TEMPLATE_NOT_FOUND = 'SHIFT_008'
}

export interface GuardSuggestion {
  guardId: string
  guardName: string
  eligibilityScore: number
  matchingFactors: MatchingFactor[]
  estimatedTravelTime?: number
  availabilityStatus: 'available' | 'busy' | 'unavailable'
}

export interface MatchingFactor {
  factor: string
  score: number
  description: string
}

export interface EligibilityCheck {
  guardId: string
  isEligible: boolean
  reasons: string[]
  certificationStatus: CertificationMatch[]
  availabilityStatus: AvailabilityStatus
  proximityScore?: number
}

export interface CertificationMatch {
  certificationId: string
  certificationName: string
  hasMatch: boolean
  expiryDate?: string
  status: 'valid' | 'expiring' | 'expired' | 'missing'
}

export interface AvailabilityStatus {
  isAvailable: boolean
  conflicts: ScheduleConflict[]
  nextAvailableTime?: string
}

export interface ScheduleConflict {
  conflictingShiftId: string
  conflictingTimeRange: TimeRange
  conflictType: 'overlap' | 'adjacent' | 'travel_time'
}

export interface CostCalculation {
  regularHours: number
  overtimeHours: number
  regularPay: number
  overtimePay: number
  specialRatePay: number
  totalGuardPay: number
  clientBillingAmount: number
  profitMargin: number
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  code: string
  message: string
}

export interface ValidationWarning {
  field: string
  message: string
}

export interface ConflictCheck {
  hasConflicts: boolean
  conflicts: ScheduleConflict[]
  recommendations: string[]
}

export interface CancellationResult {
  cancelled: boolean
  replacementSuggestions: GuardSuggestion[]
  financialImpact: {
    cancellationFee?: number
    refundAmount?: number
    billingAdjustment?: number
  }
  notificationsSent: NotificationRecord[]
}

export interface Assignment {
  shiftId: string
  guardId: string
  assignedAt: string
  assignedBy: string
  confirmationRequired: boolean
  confirmedAt?: string
  notes?: string
}