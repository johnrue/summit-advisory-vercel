// Guard Application Types for Story 2.2: Online Application Submission
// Extending the guard-leads system with comprehensive application data models

import type { GuardLead } from './guard-leads'
import type { ApplicationStatus } from '../types'

// Personal Information
export interface PersonalInfo {
  first_name: string
  last_name: string
  email: string
  phone: string
  address: Address
  date_of_birth?: string
  social_security_number?: string // Encrypted/hashed storage
}

export interface Address {
  street: string
  city: string
  state: string
  zip_code: string
  country?: string
}

// Work Experience
export interface WorkExperience {
  id: string
  company: string
  position: string
  start_date: string
  end_date?: string // null for current position
  description: string
  security_related: boolean
  duties: string[]
  supervisor_name?: string
  supervisor_contact?: string
  reason_for_leaving?: string
}

// Certifications
export interface Certification {
  id: string
  name: string
  issuer: string
  date_obtained: string
  expiry_date?: string
  certification_number?: string
  certification_type: CertificationType
  verification_status: 'pending' | 'verified' | 'expired' | 'invalid'
}

export type CertificationType = 
  | 'security-guard'
  | 'armed-security'
  | 'cpr-first-aid'
  | 'fire-safety'
  | 'defensive-driving'
  | 'surveillance'
  | 'crowd-control'
  | 'other'

// Education
export interface Education {
  id: string
  school: string
  degree: string
  field: string
  graduation_date?: string
  gpa?: number
  relevant_coursework?: string[]
}

// References
export interface Reference {
  id: string
  name: string
  company: string
  position: string
  phone: string
  email: string
  relationship: ReferenceRelationship
  years_known: number
  contacted: boolean
  verified: boolean
}

export type ReferenceRelationship =
  | 'supervisor'
  | 'colleague'
  | 'mentor'
  | 'client'
  | 'personal'

// Availability
export interface Availability {
  full_time: boolean
  part_time: boolean
  weekends: boolean
  nights: boolean
  holidays: boolean
  overtime_available: boolean
  preferred_schedule?: string
  schedule_restrictions?: string
}

// Comprehensive Application Data
export interface ApplicationData {
  personal_info: PersonalInfo
  work_experience: WorkExperience[]
  certifications: Certification[]
  education: Education[]
  references: Reference[]
  availability: Availability
  additional_info?: string
  emergency_contact?: EmergencyContact
  criminal_history?: CriminalHistory
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
}

export interface CriminalHistory {
  has_criminal_history: boolean
  details?: string
  convictions?: Conviction[]
}

export interface Conviction {
  charge: string
  date: string
  disposition: string
  location: string
}

// AI Parsing Results
export interface AIParsedData {
  extraction_timestamp: string
  processing_model: string
  confidence_scores: AIConfidenceScores
  extracted_fields: Partial<ApplicationData>
  manual_overrides: string[] // Fields manually corrected
  parsing_errors?: string[]
  processing_time_ms: number
  text_extraction_success: boolean
}

export interface AIConfidenceScores {
  personal_info: number
  work_experience: number
  certifications: number
  education: number
  skills: number
  overall: number
}

// Document Management
export interface DocumentReferences {
  resume?: DocumentReference
  certifications?: DocumentReference[]
  identification?: DocumentReference
  additional_documents?: DocumentReference[]
}

export interface DocumentReference {
  id: string
  filename: string
  storage_path: string
  uploaded_at: string
  file_type: string
  file_size: number
  virus_scan_status: 'pending' | 'clean' | 'infected' | 'failed'
  access_url?: string // Signed URL for temporary access
  ai_processed: boolean
}

// Application Status Tracking - now imported from main types file

// Extended Guard Lead with Application Data
export interface GuardApplication extends Omit<GuardLead, 'status'> {
  status: ApplicationStatus
  application_data?: ApplicationData
  ai_parsed_data?: AIParsedData
  documents?: DocumentReferences
  application_reference?: string
  confidence_scores?: AIConfidenceScores
  application_submitted_at?: string
  status: ApplicationStatus
}

// API Request/Response Types
export interface ApplicationSubmissionRequest {
  application_token: string // From lead capture
  application_data: ApplicationData
  ai_parsed_data?: AIParsedData
  document_references: DocumentReferences
}

export interface ApplicationSubmissionResponse {
  success: boolean
  data: {
    application_id: string
    application_reference: string
    submitted_at: string
    next_steps: string
  }
  error?: string
}

export interface ResumeParsingRequest {
  document_path: string
  application_id: string
}

export interface ResumeParsingResponse {
  success: boolean
  data: {
    parsed_data: Partial<ApplicationData>
    confidence_scores: AIConfidenceScores
    processing_time_ms: number
  }
  error?: string
}

// Manager Interface Types
export interface ApplicationListRequest {
  page?: number
  limit?: number
  status_filter?: ApplicationStatus[]
  date_from?: string
  date_to?: string
  search?: string
  confidence_threshold?: number
}

export interface ApplicationListResponse {
  success: boolean
  data: {
    applications: GuardApplication[]
    pagination: {
      total: number
      page: number
      pages: number
    }
    summary: {
      total: number
      by_status: Record<ApplicationStatus, number>
    }
  }
}

// Form Component Props
export interface GuardApplicationFormProps {
  applicationToken: string
  onSuccess?: (applicationId: string) => void
  onError?: (error: string) => void
  enableAIAssist?: boolean
  className?: string
}

export interface AIDataReviewStepProps {
  aiParsedData: AIParsedData
  originalFormData: Partial<ApplicationData>
  onDataConfirm: (confirmedData: ApplicationData) => void
  onManualEdit: (field: string, value: any) => void
  showConfidenceIndicators?: boolean
  className?: string
}

export interface DocumentUploadComponentProps {
  acceptedTypes: string[]
  maxFileSize: number
  onUploadComplete: (fileInfo: DocumentReference) => void
  onUploadError: (error: string) => void
  enableResumeAI?: boolean
  className?: string
}

export interface ApplicationReviewInterfaceProps {
  applicationId: string
  application?: GuardApplication
  onStatusChange?: (status: ApplicationStatus) => void
  onNotesUpdate?: (notes: string) => void
  canEdit?: boolean
  className?: string
}

// Validation Types
export interface ApplicationValidationResult {
  isValid: boolean
  errors: ApplicationValidationError[]
  warnings: ApplicationValidationWarning[]
}

export interface ApplicationValidationError {
  field: string
  message: string
  type: 'required' | 'format' | 'length' | 'custom'
}

export interface ApplicationValidationWarning {
  field: string
  message: string
  type: 'incomplete' | 'verification' | 'recommendation'
}

// Service Response Types
export interface ApplicationServiceResult<T> {
  success: boolean
  data: T
  error?: string
  message: string
  validation?: ApplicationValidationResult
}