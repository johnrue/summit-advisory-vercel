// TypeScript interfaces for Guard Profile Management

import type { Database } from './database'

// Database enum types
export type EmploymentStatus = 'pending' | 'active' | 'inactive' | 'terminated'
export type ProfileStatus = 'draft' | 'under_review' | 'approved' | 'rejected'
export type DocumentStatus = 'active' | 'expiring_soon' | 'expired' | 'renewed'
export type AuditType = 'profile_access' | 'tops_link_access' | 'compliance_check' | 'document_verification'
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'pending_review'

// Branded ID types for type safety
export type GuardProfileId = string & { readonly __brand: unique symbol }
export type ApplicationId = string & { readonly __brand: unique symbol }
export type DocumentId = string & { readonly __brand: unique symbol }

// Address structure for current_address JSONB field
export interface AddressData {
  street: string
  city: string
  state: string
  zipCode: string
  country?: string
  isVerified?: boolean
  lastUpdated?: string
}

// Document reference structure
export interface DocumentReference {
  id: string
  name: string
  type: string
  url: string
  uploadedAt: string
  size: number
  mimeType: string
  expiryDate?: string
  isRequired: boolean
  status: DocumentStatus
}

// Document checklist structure
export interface DocumentChecklist {
  governmentId: boolean
  drugTestResults: boolean
  educationCertificates: boolean
  securityTraining: boolean
  policyAcknowledgment: boolean
  topsDocumentation: boolean
  photograph: boolean
  [key: string]: boolean
}

// AI parsed data structure
export interface AIParsedData {
  fullName?: {
    value: string
    confidence: number
    source: string
  }
  address?: {
    value: AddressData
    confidence: number
    source: string
  }
  workExperience?: {
    value: Array<{
      company: string
      position: string
      startDate: string
      endDate?: string
    }>
    confidence: number
    source: string
  }
  education?: {
    value: Array<{
      institution: string
      degree: string
      year: string
    }>
    confidence: number
    source: string
  }
  contactInfo?: {
    value: {
      email: string
      phone: string
    }
    confidence: number
    source: string
  }
}

// AI completion assistance log entry
export interface CompletionAssistanceLogEntry {
  timestamp: string
  fieldName: string
  originalValue: string
  suggestedValue: string
  accepted: boolean
  confidence: number
  reasoning: string
}

// Policy agreement structure
export interface PolicyAgreement {
  policyType: string
  policyVersion: string
  agreementDate: string
  digitalSignature: string
  ipAddress: string
  userAgent: string
}

// Certification status structure
export interface CertificationStatus {
  securityTraining: {
    completed: boolean
    completionDate?: string
    expiryDate?: string
    certificateUrl?: string
  }
  continuingEducation: {
    hoursCompleted: number
    lastUpdate: string
    certificates: DocumentReference[]
  }
  licenseStatus: {
    hasLicense: boolean
    licenseNumber?: string
    issueDate?: string
    expiryDate?: string
  }
}

// Main Guard Profile interface
export interface GuardProfile {
  id: string
  applicationId: string
  
  // Basic Information
  legalName: string
  dateOfBirth: string // Will be encrypted
  placeOfBirth: string
  ssnLastSix: string // Will be encrypted
  company: string
  currentAddress: AddressData
  
  // TOPS Compliance
  topsProfileUrl?: string
  licenseNumber?: string
  licenseExpiry?: string
  
  // Employment Information
  firstEmploymentDate?: string
  lastEmploymentDate?: string
  employeeNumber?: string
  employmentStatus: EmploymentStatus
  
  // Document Management
  photographUrl?: string
  documents: DocumentReference[]
  documentChecklist: DocumentChecklist
  
  // AI Integration
  aiParsedData: AIParsedData
  completionAssistanceLog: CompletionAssistanceLogEntry[]
  
  // Profile Status
  profileStatus: ProfileStatus
  completionPercentage: number
  isSchedulable: boolean
  
  // Compliance Tracking
  policyAgreements: PolicyAgreement[]
  certificationStatus: CertificationStatus
  complianceScore: number
  
  // Audit Trail
  createdAt: string
  updatedAt: string
  approvedBy?: string
  approvedAt?: string
}

// Form data for profile creation (subset of GuardProfile)
export interface GuardProfileCreateData {
  applicationId: string
  legalName: string
  dateOfBirth: string
  placeOfBirth: string
  ssnLastSix: string
  currentAddress: AddressData
  topsProfileUrl?: string
  licenseNumber?: string
  licenseExpiry?: string
  photographUrl?: string
}

// Form data for profile updates
export interface GuardProfileUpdateData {
  legalName?: string
  dateOfBirth?: string
  placeOfBirth?: string
  ssnLastSix?: string
  currentAddress?: AddressData
  topsProfileUrl?: string
  licenseNumber?: string
  licenseExpiry?: string
  firstEmploymentDate?: string
  lastEmploymentDate?: string
  employeeNumber?: string
  employmentStatus?: EmploymentStatus
  photographUrl?: string
  profileStatus?: ProfileStatus
  isSchedulable?: boolean
}

// Document expiry tracking
export interface GuardDocumentExpiry {
  id: string
  guardProfileId: string
  documentType: string
  documentName: string
  expiryDate: string
  renewalReminderSentAt: string[]
  status: DocumentStatus
  createdAt: string
  updatedAt: string
}

// TOPS compliance audit entry
export interface TopsComplianceAudit {
  id: string
  guardProfileId: string
  auditType: AuditType
  accessedBy: string
  accessDetails: {
    action: string
    timestamp: string
    ipAddress?: string
    userAgent?: string
    fieldAccessed?: string
    previousValue?: any
    newValue?: any
  }
  complianceStatus: ComplianceStatus
  createdAt: string
}

// Use the main ServiceResult from lib/types
import type { ServiceResult } from '@/lib/types'

// Re-export for consumers
export type { ServiceResult }

// Completion suggestion structure
export interface CompletionSuggestion {
  fieldName: string
  suggestedValue: string
  confidence: number
  reasoning: string
  source: string
}

// Compliance validation result
export interface ComplianceValidation {
  isCompliant: boolean
  score: number
  missingFields: string[]
  expiringDocuments: DocumentReference[]
  recommendations: string[]
}

// Compliance check result for TOPS compliance service
export interface ComplianceCheck {
  isCompliant: boolean
  overallScore: number
  requirements: string[]
  missingRequirements: string[]
  criticalIssues: string[]
  recommendations: string[]
  lastAssessed: string
  nextReviewDate: string
}

// TOPS validation result
export interface TopsValidation {
  isValid: boolean
  isAccessible: boolean
  profileData?: {
    name: string
    license: string
    status: string
  }
  error?: string
}

// Document upload metadata
export interface DocumentUpload {
  file: File
  documentType: string
  expiryDate?: string
  isRequired: boolean
}

// Compliance score breakdown
export interface ComplianceScore {
  overall: number
  breakdown: {
    basicInfo: number
    documents: number
    topsCompliance: number
    certifications: number
  }
  recommendations: string[]
}

// Compliance report data
export interface ComplianceReport {
  guardProfiles: Array<{
    id: string
    name: string
    employeeNumber: string
    complianceScore: number
    status: ProfileStatus
    expiringDocuments: number
  }>
  summary: {
    totalProfiles: number
    compliantProfiles: number
    nonCompliantProfiles: number
    averageScore: number
    expiringDocuments: number
  }
  generatedAt: string
  generatedBy: string
}

// Expiry alert structure
export interface ExpiryAlert {
  guardProfileId: string
  guardName: string
  documentType: string
  documentName: string
  expiryDate: string
  daysUntilExpiry: number
  priority: 'high' | 'medium' | 'low'
}

// Digital signature data
export interface DigitalSignature {
  signatureId: string
  documentId: string
  signerId: string
  signatureData: string
  timestamp: string
  ipAddress: string
  userAgent: string
  isValid: boolean
}

// Signature verification result
export interface SignatureVerification {
  isValid: boolean
  signedAt: string
  signedBy: string
  documentHash: string
  verifiedAt: string
}

// Expiring document notification
export interface ExpiringDocument {
  guardProfileId: string
  guardName: string
  documentId: string
  documentName: string
  documentType: string
  expiryDate: string
  daysUntilExpiry: number
  remindersSent: number
  lastReminderSent?: string
}

// Reminder result for batch operations
export interface ReminderResult {
  totalProcessed: number
  remindersSent: number
  errors: Array<{
    guardProfileId: string
    error: string
  }>
}

// Compliance filters for reporting
export interface ComplianceFilters {
  employmentStatus?: EmploymentStatus[]
  profileStatus?: ProfileStatus[]
  complianceScoreMin?: number
  complianceScoreMax?: number
  dateRange?: {
    startDate: string
    endDate: string
  }
  documentTypes?: string[]
  expiryDateRange?: {
    startDate: string
    endDate: string
  }
}

// Error codes for consistent error handling
export enum GuardProfileErrorCode {
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  APPLICATION_NOT_APPROVED = 'APPLICATION_NOT_APPROVED',
  INVALID_TOPS_URL = 'INVALID_TOPS_URL',
  DOCUMENT_UPLOAD_FAILED = 'DOCUMENT_UPLOAD_FAILED',
  COMPLIANCE_CHECK_FAILED = 'COMPLIANCE_CHECK_FAILED',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE'
}