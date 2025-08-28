// Story 3.3: Guard Availability Management - Type Definitions
// Comprehensive TypeScript interfaces for availability management system

// Core availability types
export type AvailabilityType = 'available' | 'unavailable' | 'preferred' | 'emergency_only';
export type AvailabilityStatus = 'active' | 'inactive' | 'archived';

// Time-off request types
export type TimeOffType = 'vacation' | 'sick' | 'personal' | 'emergency' | 'other';
export type TimeOffStatus = 'pending' | 'approved' | 'denied' | 'cancelled' | 'expired';

// Availability pattern types  
export type PatternType = 'weekly_recurring' | 'bi_weekly' | 'monthly' | 'custom';

// Availability change tracking
export type AvailabilityChangeType = 
  | 'pattern_created' 
  | 'pattern_modified' 
  | 'pattern_deleted'
  | 'override_added'
  | 'override_removed'
  | 'emergency_unavailable'
  | 'time_off_approved'
  | 'time_off_denied';

// Day of week for scheduling patterns
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0, Monday = 1, etc.

// Core interfaces
export interface GuardAvailability {
  id: string;
  guardId: string;
  availabilityWindow: {
    start: Date;
    end: Date;
  };
  availabilityType: AvailabilityType;
  availabilityStatus: AvailabilityStatus;
  notes?: string;
  isRecurring: boolean;
  patternId?: string;
  overrideReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeOffRequest {
  id: string;
  guardId: string;
  requestType: TimeOffType;
  dateRange: {
    start: Date;
    end: Date;
  };
  reason?: string;
  status: TimeOffStatus;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  approvalNotes?: string;
  hasConflicts: boolean;
  conflictingShifts: string[]; // Array of shift IDs
  replacementRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilityPattern {
  id: string;
  guardId: string;
  patternName: string;
  patternType: PatternType;
  weeklySchedule: WeeklySchedule;
  isActive: boolean;
  effectiveDate: Date;
  endDate?: Date;
  dateOverrides: DateOverride[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklySchedule {
  [key: string]: DaySchedule; // '0' through '6' for days of week
}

export interface DaySchedule {
  isAvailable: boolean;
  timeSlots: TimeSlot[];
  availabilityType: AvailabilityType;
  notes?: string;
}

export interface TimeSlot {
  start: string; // Time in HH:MM format (24-hour)
  end: string;   // Time in HH:MM format (24-hour)
  availabilityType: AvailabilityType;
}

export interface DateOverride {
  date: Date;
  overrideType: 'unavailable' | 'available' | 'custom';
  timeSlots?: TimeSlot[];
  reason?: string;
}

export interface AvailabilityHistory {
  id: string;
  guardId: string;
  changeType: AvailabilityChangeType;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  changeReason?: string;
  affectedDateRange?: {
    start: Date;
    end: Date;
  };
  assignmentImpact: string[]; // Array of affected assignment IDs
  changedAt: Date;
}

// UI and form interfaces
export interface AvailabilityEditorProps {
  guardId: string;
  availability?: GuardAvailability[];
  patterns?: AvailabilityPattern[];
  onSave: (availability: Partial<GuardAvailability>[]) => Promise<void>;
  onCreatePattern: (pattern: Partial<AvailabilityPattern>) => Promise<void>;
}

export interface TimeOffRequestFormData {
  requestType: TimeOffType;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface RecurringPatternFormData {
  patternName: string;
  patternType: PatternType;
  weeklySchedule: WeeklySchedule;
  effectiveDate: Date;
  endDate?: Date;
}

export interface EmergencyUnavailabilityData {
  startTime: Date;
  endTime?: Date;
  reason: string;
  isImmediate: boolean;
  affectedShifts?: string[];
  requestReplacement: boolean;
}

// Analytics and insights
export interface AvailabilityInsights {
  guardId: string;
  timeframe: {
    start: Date;
    end: Date;
  };
  totalAvailableHours: number;
  averageAvailabilityPerWeek: number;
  preferredTimeSlots: TimeSlotAnalysis[];
  assignmentAcceptanceRate: number;
  timeOffRequestFrequency: TimeOffAnalysis;
  availabilityPatternOptimization: PatternOptimization[];
}

export interface TimeSlotAnalysis {
  timeSlot: TimeSlot;
  frequencyPercent: number;
  assignmentSuccessRate: number;
}

export interface TimeOffAnalysis {
  totalRequests: number;
  approvedRequests: number;
  deniedRequests: number;
  averageRequestDays: number;
  mostCommonType: TimeOffType;
}

export interface PatternOptimization {
  currentPattern: string;
  suggestedImprovement: string;
  potentialImpact: string;
  confidenceScore: number;
}

// Manager oversight interfaces
export interface TeamAvailabilityOverview {
  teamId: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  guardAvailability: GuardAvailabilityStatus[];
  availabilityGaps: AvailabilityGap[];
  timeOffRequests: TimeOffRequestSummary[];
  staffingRecommendations: StaffingRecommendation[];
}

export interface GuardAvailabilityStatus {
  guardId: string;
  guardName: string;
  totalAvailableHours: number;
  currentAvailability: GuardAvailability[];
  upcomingTimeOff: TimeOffRequest[];
  availabilityScore: number;
}

export interface AvailabilityGap {
  timeSlot: TimeSlot;
  date: Date;
  requiredGuards: number;
  availableGuards: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedActions: string[];
}

export interface TimeOffRequestSummary {
  id: string;
  guardName: string;
  requestType: TimeOffType;
  dateRange: {
    start: Date;
    end: Date;
  };
  status: TimeOffStatus;
  hasConflicts: boolean;
  urgency: 'low' | 'medium' | 'high';
}

export interface StaffingRecommendation {
  date: Date;
  timeSlot: TimeSlot;
  recommendationType: 'hire_temp' | 'overtime' | 'reschedule' | 'cancel';
  details: string;
  estimatedCost?: number;
}

// Calendar integration interfaces
export interface CalendarExportOptions {
  format: 'ics' | 'google' | 'outlook' | 'json';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeTimeOff: boolean;
  includeShiftAssignments: boolean;
  timezone: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  eventType: 'availability' | 'time_off' | 'shift_assignment';
  status: 'confirmed' | 'tentative' | 'cancelled';
  location?: string;
}

export interface AvailabilitySubscription {
  id: string;
  guardId: string;
  subscriptionType: 'personal_calendar' | 'manager_dashboard' | 'shift_planning';
  feedUrl: string;
  isActive: boolean;
  lastUpdated: Date;
  refreshInterval: number; // minutes
}

// API response interfaces
export interface AvailabilityApiResponse {
  success: boolean;
  data?: {
    availability?: GuardAvailability[];
    patterns?: AvailabilityPattern[];
    timeOffRequests?: TimeOffRequest[];
    insights?: AvailabilityInsights;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// Service result pattern (consistent with Stories 3.1 & 3.2)
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// Conflict detection interfaces (integration with Story 3.2)
export interface AvailabilityConflict {
  type: 'shift_overlap' | 'time_off_conflict' | 'pattern_mismatch' | 'emergency_override';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  conflictingItems: string[]; // IDs of conflicting items
  resolutionOptions: ConflictResolution[];
  canAutoResolve: boolean;
}

export interface ConflictResolution {
  type: 'modify_availability' | 'cancel_time_off' | 'find_replacement' | 'override';
  description: string;
  impact: string;
  recommendationScore: number;
}

// Notification interfaces
export interface AvailabilityNotification {
  id: string;
  type: 'time_off_approved' | 'time_off_denied' | 'emergency_coverage_needed' | 'pattern_conflict';
  recipientId: string;
  title: string;
  message: string;
  actionRequired: boolean;
  actionUrl?: string;
  createdAt: Date;
  readAt?: Date;
}