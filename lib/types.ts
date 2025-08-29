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