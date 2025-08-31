// Story 2.6: Interview Scheduling System Types
// Comprehensive TypeScript types for interview management and calendar integration

export type InterviewType = 'initial' | 'technical' | 'behavioral' | 'final' | 'follow_up'
export type InterviewMode = 'video' | 'phone' | 'in_person' | 'hybrid'
export type InterviewStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'
export type RecommendationType = 'strong_hire' | 'hire' | 'maybe_hire' | 'no_hire' | 'strong_no_hire'
export type SubscriptionType = 'guard_personal' | 'manager_team' | 'manager_all'

// Core interview data structure
export interface Interview {
  id: string
  applicationId: string
  interviewType: InterviewType
  scheduledAt: Date
  durationMinutes: number
  interviewLocation?: string
  interviewMode: InterviewMode
  interviewerId: string
  status: InterviewStatus
  meetingNotes?: string
  overallRating?: number
  hiringRecommendation?: RecommendationType
  decisionRationale?: string
  createdAt: Date
  updatedAt: Date
  cancelledAt?: Date
  cancellationReason?: string
  icsUid?: string
  lastIcsBroadcast?: Date
}

// Interview feedback structure for structured ratings
export interface InterviewFeedback {
  id: string
  interviewId: string
  interviewerId: string
  technicalSkillsRating?: number
  communicationRating?: number
  culturalFitRating?: number
  experienceRelevanceRating?: number
  strengths?: string
  concerns?: string
  additionalNotes?: string
  recommendation: RecommendationType
  confidenceLevel: number
  createdAt: Date
  updatedAt: Date
}

// Calendar subscription management
export interface CalendarSubscription {
  id: string
  userId: string
  subscriptionType: SubscriptionType
  calendarFilters?: Record<string, any>
  accessToken: string
  isActive: boolean
  createdAt: Date
  lastAccessed?: Date
  expiresAt?: Date
}

// Request interfaces for API operations
export interface ScheduleInterviewRequest {
  applicationId: string
  interviewType: InterviewType
  scheduledAt: Date
  durationMinutes: number
  interviewLocation?: string
  interviewMode: InterviewMode
  interviewerId: string
  meetingNotes?: string
}

export interface UpdateInterviewRequest {
  scheduledAt?: Date
  durationMinutes?: number
  interviewLocation?: string
  interviewMode?: InterviewMode
  status?: InterviewStatus
  meetingNotes?: string
  cancellationReason?: string
}

export interface SubmitFeedbackRequest {
  interviewId: string
  technicalSkillsRating?: number
  communicationRating?: number
  culturalFitRating?: number
  experienceRelevanceRating?: number
  strengths?: string
  concerns?: string
  additionalNotes?: string
  recommendation: RecommendationType
  confidenceLevel: number
  overallRating?: number
  hiringRecommendation?: RecommendationType
  decisionRationale?: string
}

// Calendar and ICS types
export interface CalendarFilters {
  guardIds?: string[]
  interviewTypes?: InterviewType[]
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  interviewerIds?: string[]
  status?: InterviewStatus[]
}

export interface ICSCalendarConfig {
  defaultTimeZone: string
  maxEventsPerFeed: number
  feedExpirationHours: number
  enabledSubscriptionTypes: SubscriptionType[]
  reminderSettings: {
    applicantReminders: number[] // hours before interview
    interviewerReminders: number[] // hours before interview
    followUpReminders: number[] // hours after interview for feedback
  }
}

// Component props interfaces
export interface InterviewSchedulerProps {
  applicationId: string
  applicantInfo: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  onInterviewScheduled?: (interview: Interview) => void
  defaultInterviewType?: InterviewType
  className?: string
}

export interface InterviewDateTimePickerProps {
  interviewerId: string
  interviewDuration: number // in minutes
  onDateTimeSelected: (dateTime: Date) => void
  minDate?: Date
  maxDate?: Date
  className?: string
}

export interface InterviewFeedbackFormProps {
  interviewId: string
  applicantInfo: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  onFeedbackSubmit: (feedback: SubmitFeedbackRequest) => Promise<void>
  allowMultipleInterviewers?: boolean
  requiredRatings?: string[]
  className?: string
}

export interface InterviewHistoryProps {
  applicationId: string
  showAllRounds?: boolean
  enableScheduling?: boolean
  className?: string
}

// Use the main ServiceResult from lib/types
import type { ServiceResult } from '@/lib/types'

// Interview scheduling availability
export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
  conflictReason?: string
}

export interface AvailabilityRequest {
  interviewerId: string
  startDate: Date
  endDate: Date
  durationMinutes: number
}

// Email notification types
export interface InterviewNotificationData {
  interview: Interview
  applicant: {
    firstName: string
    lastName: string
    email: string
  }
  interviewer: {
    firstName: string
    lastName: string
    email: string
  }
  calendarInvite?: string
  preparationInstructions?: string
}

// Note: Types are already exported above