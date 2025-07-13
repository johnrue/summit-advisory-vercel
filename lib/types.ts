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