// TypeScript interfaces for the Summit Advisory application

// Consultation request form data
export interface ConsultationFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  serviceType: string
  message: string
}

// Database consultation request record
export interface ConsultationRequest extends ConsultationFormData {
  id: string
  created_at: string
  status: 'new' | 'contacted' | 'scheduled' | 'completed' | 'cancelled'
  updated_at: string
}

// Service types for the select dropdown
export type ServiceType = 
  | 'armed'
  | 'unarmed' 
  | 'event'
  | 'executive'
  | 'commercial'
  | 'consulting'
  | 'other'

// Response types for API operations
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Analytics event parameters
export interface AnalyticsEventParams {
  campaign?: string
  source?: string
  service?: string
  cta_name?: string
  location?: string
  error?: string
}

// Company information types (extending existing structure)
export interface ContactInfo {
  name: string
  email: {
    compliance: string
    operations: string
  }
  phone: {
    call: string
    text: string
    textNoFormatting: string
  }
  license: {
    dps: string
  }
  locations: {
    defaultState: string
    mainOffice: {
      address: string
      city: string
      state: string
      zip: string
    }
    serviceAreas: string[]
  }
  hours: {
    weekday: string
    emergency: string
  }
}

// Guard Management Types
export interface Guard {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  licenseNumber: string
  licenseExpiry: Date
  employmentStatus: 'active' | 'inactive' | 'terminated'
  employmentStartDate: Date
  ssn: string
  dateOfBirth: Date
  homeAddress: string
  emergencyContact: string
  certifications?: Certification
  backgroundChecks?: BackgroundCheck
  trainingRecords?: TrainingRecord
  created_at: string
  updated_at: string
}

export interface Certification {
  id: string
  guardId: string
  status: 'active' | 'expired' | 'pending_renewal'
  issueDate: Date
  expiryDate: Date
  certificationNumber: string
  certificationTypes: string[]
}

export interface BackgroundCheck {
  id: string
  guardId: string
  status: 'passed' | 'pending' | 'failed'
  completedAt: Date
  expiryDate: Date
  checkType: 'dps' | 'fbi' | 'both'
  notes?: string
}

export interface TrainingRecord {
  id: string
  guardId: string
  trainingType: string
  completedAt: Date
  expiryDate?: Date
  certificateNumber?: string
  instructor: string
}

// TOPS Compliance Report Types
export interface ReportParameters {
  startDate: Date
  endDate: Date
  format: 'pdf' | 'csv'
  includeSensitiveData: boolean
  generatedBy: string
  recipients?: string[]
}

export interface TOPSReportData {
  reportPeriod: {
    startDate: Date
    endDate: Date
  }
  company: {
    name: string
    license: string
    contact: string
    serviceAreas: string[]
  }
  guards: Guard[]
  generatedBy: string
  generatedAt: Date
  reportType: 'tops_compliance'
}

export interface ComplianceReport {
  id: string
  data: TOPSReportData
  metadata: any
  format: 'pdf' | 'csv'
}

// Certification Management Types
export interface GuardCertification {
  id: string
  guardId: string
  certificationType: string // 'TOPS License', 'CPR', 'First Aid', etc.
  certificateNumber?: string
  issuedDate?: Date
  expiryDate: Date
  issuingAuthority?: string
  documentUrl?: string
  status: 'active' | 'expired' | 'pending_renewal'
  createdAt: string
  updatedAt: string
}

export interface CertificationHistory {
  id: string
  guardCertificationId: string
  action: 'issued' | 'renewed' | 'expired' | 'revoked'
  previousExpiryDate?: Date
  newExpiryDate?: Date
  documentUrl?: string
  processedBy?: string
  notes?: string
  createdAt: string
}

export interface CertificationRenewalRequest {
  id: string
  guardCertificationId: string
  guardId: string
  newDocumentUrl?: string
  newExpiryDate?: Date
  requestStatus: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  reviewNotes?: string
}

export interface CertificationAlert {
  id: string
  guardCertificationId: string
  guardId: string
  alertType: '30_day' | '14_day' | '7_day' | 'expired' | 'escalation'
  alertDate: Date
  sentAt?: string
  emailSent: boolean
  escalated: boolean
  createdAt: string
}

export interface CertificationExpiryCheck {
  certification: GuardCertification
  guard: Guard
  daysUntilExpiry: number
  alertType: '30_day' | '14_day' | '7_day' | 'expired'
  shouldAlert: boolean
  canSchedule: boolean
}

export interface CertificationDashboardData {
  expiringIn30Days: CertificationExpiryCheck[]
  expiringIn14Days: CertificationExpiryCheck[]
  expiringIn7Days: CertificationExpiryCheck[]
  expired: CertificationExpiryCheck[]
  totalGuards: number
  compliantGuards: number
  nonCompliantGuards: number
  pendingRenewals: number
}