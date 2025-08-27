// Validation schemas for Guard Applications - Story 2.2
// Comprehensive form validation using Zod for multi-step application form

import { z } from 'zod'

// Basic validation helpers
const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const zipRegex = /^\d{5}(-\d{4})?$/
const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/

// Personal Information Schema
const AddressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2, 'Use 2-letter state code'),
  zip_code: z.string().regex(zipRegex, 'Invalid ZIP code format'),
  country: z.string().optional().default('US'),
})

const PersonalInfoSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().regex(emailRegex, 'Invalid email format'),
  phone: z.string().regex(phoneRegex, 'Invalid phone number format'),
  address: AddressSchema,
  date_of_birth: z.string().optional(),
  social_security_number: z.string().regex(ssnRegex, 'Invalid SSN format').optional(),
})

// Work Experience Schema
const WorkExperienceSchema = z.object({
  id: z.string(),
  company: z.string().min(1, 'Company name is required'),
  position: z.string().min(1, 'Position is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  description: z.string().min(1, 'Job description is required'),
  security_related: z.boolean().default(false),
  duties: z.array(z.string()).default([]),
  supervisor_name: z.string().optional(),
  supervisor_contact: z.string().optional(),
  reason_for_leaving: z.string().optional(),
}).refine((data) => {
  // If end_date is provided, it should be after start_date
  if (data.end_date && data.start_date) {
    return new Date(data.end_date) >= new Date(data.start_date)
  }
  return true
}, {
  message: 'End date must be after start date',
  path: ['end_date']
})

// Certification Schema
const CertificationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Certification name is required'),
  issuer: z.string().min(1, 'Issuing organization is required'),
  date_obtained: z.string().min(1, 'Date obtained is required'),
  expiry_date: z.string().optional(),
  certification_number: z.string().optional(),
  certification_type: z.enum([
    'security-guard',
    'armed-security',
    'cpr-first-aid',
    'fire-safety',
    'defensive-driving',
    'surveillance',
    'crowd-control',
    'other'
  ]),
  verification_status: z.enum(['pending', 'verified', 'expired', 'invalid']).default('pending'),
})

// Education Schema
const EducationSchema = z.object({
  id: z.string(),
  school: z.string().min(1, 'School name is required'),
  degree: z.string().min(1, 'Degree is required'),
  field: z.string().min(1, 'Field of study is required'),
  graduation_date: z.string().optional(),
  gpa: z.number().min(0).max(4).optional(),
  relevant_coursework: z.array(z.string()).default([]),
})

// Reference Schema
const ReferenceSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Reference name is required'),
  company: z.string().min(1, 'Company is required'),
  position: z.string().min(1, 'Position is required'),
  phone: z.string().regex(phoneRegex, 'Invalid phone number'),
  email: z.string().regex(emailRegex, 'Invalid email format'),
  relationship: z.enum(['supervisor', 'colleague', 'mentor', 'client', 'personal']),
  years_known: z.number().min(0, 'Years known must be positive'),
  contacted: z.boolean().default(false),
  verified: z.boolean().default(false),
})

// Availability Schema
const AvailabilitySchema = z.object({
  full_time: z.boolean(),
  part_time: z.boolean(),
  weekends: z.boolean(),
  nights: z.boolean(),
  holidays: z.boolean(),
  overtime_available: z.boolean(),
  preferred_schedule: z.string().optional(),
  schedule_restrictions: z.string().optional(),
}).refine((data) => {
  // At least one availability option must be selected
  return data.full_time || data.part_time
}, {
  message: 'Must select either full-time or part-time availability',
  path: ['full_time']
})

// Emergency Contact Schema
const EmergencyContactSchema = z.object({
  name: z.string().min(1, 'Emergency contact name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  phone: z.string().regex(phoneRegex, 'Invalid phone number'),
  email: z.string().regex(emailRegex, 'Invalid email format').optional(),
})

// Criminal History Schema
const ConvictionSchema = z.object({
  charge: z.string().min(1, 'Charge description is required'),
  date: z.string().min(1, 'Date is required'),
  disposition: z.string().min(1, 'Disposition is required'),
  location: z.string().min(1, 'Location is required'),
})

const CriminalHistorySchema = z.object({
  has_criminal_history: z.boolean(),
  details: z.string().optional(),
  convictions: z.array(ConvictionSchema).default([]),
}).refine((data) => {
  // If has criminal history, details should be provided
  if (data.has_criminal_history && !data.details) {
    return false
  }
  return true
}, {
  message: 'Please provide details about criminal history',
  path: ['details']
})

// Complete Application Data Schema
export const ApplicationDataSchema = z.object({
  personal_info: PersonalInfoSchema,
  work_experience: z.array(WorkExperienceSchema).min(1, 'At least one work experience is required'),
  certifications: z.array(CertificationSchema).default([]),
  education: z.array(EducationSchema).default([]),
  references: z.array(ReferenceSchema).min(2, 'At least 2 references are required').max(5, 'Maximum 5 references allowed'),
  availability: AvailabilitySchema,
  additional_info: z.string().optional(),
  emergency_contact: EmergencyContactSchema.optional(),
  criminal_history: CriminalHistorySchema.optional(),
})

// AI Parsed Data Schema
export const AIParsedDataSchema = z.object({
  extraction_timestamp: z.string(),
  processing_model: z.string(),
  confidence_scores: z.object({
    personal_info: z.number().min(0).max(1),
    work_experience: z.number().min(0).max(1),
    certifications: z.number().min(0).max(1),
    education: z.number().min(0).max(1),
    skills: z.number().min(0).max(1),
    overall: z.number().min(0).max(1),
  }),
  extracted_fields: ApplicationDataSchema.partial(),
  manual_overrides: z.array(z.string()).default([]),
  parsing_errors: z.array(z.string()).default([]),
  processing_time_ms: z.number().min(0),
  text_extraction_success: z.boolean(),
})

// Document Reference Schema
export const DocumentReferenceSchema = z.object({
  id: z.string(),
  filename: z.string(),
  storage_path: z.string(),
  uploaded_at: z.string(),
  file_type: z.enum(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  file_size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  virus_scan_status: z.enum(['pending', 'clean', 'infected', 'failed']).default('pending'),
  access_url: z.string().optional(),
  ai_processed: z.boolean().default(false),
})

export const DocumentReferencesSchema = z.object({
  resume: DocumentReferenceSchema.optional(),
  certifications: z.array(DocumentReferenceSchema).default([]),
  identification: DocumentReferenceSchema.optional(),
  additional_documents: z.array(DocumentReferenceSchema).default([]),
})

// API Request Schemas
export const ApplicationSubmissionRequestSchema = z.object({
  application_token: z.string().uuid('Invalid application token'),
  application_data: ApplicationDataSchema,
  ai_parsed_data: AIParsedDataSchema.optional(),
  document_references: DocumentReferencesSchema,
})

export const ResumeParsingRequestSchema = z.object({
  document_path: z.string().min(1, 'Document path is required'),
  application_id: z.string().uuid('Invalid application ID'),
})

// Form Step Validation Schemas (for multi-step form)
export const PersonalInfoStepSchema = z.object({
  personal_info: PersonalInfoSchema,
  emergency_contact: EmergencyContactSchema.optional(),
})

export const WorkExperienceStepSchema = z.object({
  work_experience: z.array(WorkExperienceSchema).min(1, 'At least one work experience is required'),
})

export const CertificationsStepSchema = z.object({
  certifications: z.array(CertificationSchema).default([]),
})

export const EducationStepSchema = z.object({
  education: z.array(EducationSchema).default([]),
})

export const ReferencesStepSchema = z.object({
  references: z.array(ReferenceSchema).min(2, 'At least 2 references are required').max(5, 'Maximum 5 references allowed'),
})

export const AvailabilityStepSchema = z.object({
  availability: AvailabilitySchema,
  criminal_history: CriminalHistorySchema.optional(),
  additional_info: z.string().optional(),
})

export const DocumentsStepSchema = z.object({
  documents: DocumentReferencesSchema,
})

// Validation helper functions
export function validateApplicationStep(step: string, data: unknown) {
  switch (step) {
    case 'personal-info':
      return PersonalInfoStepSchema.safeParse(data)
    case 'work-experience':
      return WorkExperienceStepSchema.safeParse(data)
    case 'certifications':
      return CertificationsStepSchema.safeParse(data)
    case 'education':
      return EducationStepSchema.safeParse(data)
    case 'references':
      return ReferencesStepSchema.safeParse(data)
    case 'availability':
      return AvailabilityStepSchema.safeParse(data)
    case 'documents':
      return DocumentsStepSchema.safeParse(data)
    default:
      return { success: false, error: { message: 'Invalid step' } }
  }
}

export function validateCompleteApplication(data: unknown) {
  return ApplicationDataSchema.safeParse(data)
}

export function validateAIParsedData(data: unknown) {
  return AIParsedDataSchema.safeParse(data)
}

// Export all schemas for external use
export {
  AddressSchema,
  PersonalInfoSchema,
  WorkExperienceSchema,
  CertificationSchema,
  EducationSchema,
  ReferenceSchema,
  AvailabilitySchema,
  EmergencyContactSchema,
  CriminalHistorySchema,
}