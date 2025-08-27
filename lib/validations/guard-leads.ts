import { z } from 'zod'

export const leadSources = [
  'website',
  'qr-code',
  'social-media', 
  'referral',
  'job-board',
  'direct-contact'
] as const

export const guardLeadCaptureSchema = z.object({
  first_name: z.string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(100, 'First name cannot exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  last_name: z.string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters') 
    .max(100, 'Last name cannot exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email cannot exceed 255 characters')
    .toLowerCase(),
  
  phone: z.string()
    .regex(/^[\d\s\-\(\)\+\.]+$/, 'Please enter a valid phone number')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number cannot exceed 20 characters')
    .optional()
    .or(z.literal('')),
  
  lead_source: z.enum(leadSources, {
    required_error: 'Please select how you heard about us'
  }),
  
  source_details: z.record(z.any()).optional()
})

export type GuardLeadCaptureFormData = z.infer<typeof guardLeadCaptureSchema>

// Transform form data for API submission
export function transformLeadFormData(data: GuardLeadCaptureFormData) {
  return {
    ...data,
    phone: data.phone || undefined, // Convert empty string to undefined
    first_name: data.first_name.trim(),
    last_name: data.last_name.trim(),
    email: data.email.trim().toLowerCase()
  }
}