import { z } from 'zod'

// Password validation schema with complexity requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)')

// Email validation schema
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required')
  .transform(email => email.trim().toLowerCase())

// Login form schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

// Registration form schema
export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name must be less than 50 characters'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  role: z.enum(['guard', 'manager', 'admin']).optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Password reset request schema
export const passwordResetSchema = z.object({
  email: emailSchema
})

// Update password schema
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Password reset confirmation schema
export const resetPasswordConfirmSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Type exports for TypeScript
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>
export type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>
export type ResetPasswordConfirmFormData = z.infer<typeof resetPasswordConfirmSchema>

// Password strength calculator
export function calculatePasswordStrength(password: string): {
  score: number
  feedback: string[]
  strength: 'weak' | 'fair' | 'good' | 'strong'
} {
  let score = 0
  const feedback: string[] = []

  if (password.length >= 8) score += 1
  else feedback.push('Use at least 8 characters')

  if (/[a-z]/.test(password)) score += 1
  else feedback.push('Add lowercase letters')

  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('Add uppercase letters')

  if (/\d/.test(password)) score += 1
  else feedback.push('Add numbers')

  if (/[@$!%*?&]/.test(password)) score += 1
  else feedback.push('Add special characters (@$!%*?&)')

  if (password.length >= 12) score += 1

  let strength: 'weak' | 'fair' | 'good' | 'strong'
  if (score <= 2) strength = 'weak'
  else if (score <= 3) strength = 'fair'
  else if (score <= 4) strength = 'good'
  else strength = 'strong'

  return { score, feedback, strength }
}

// Rate limiting helper for client-side tracking
export class RateLimitTracker {
  private attempts: Map<string, number[]> = new Map()

  isRateLimited(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    
    // Remove attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs)
    
    this.attempts.set(key, validAttempts)
    
    return validAttempts.length >= maxAttempts
  }

  recordAttempt(key: string): void {
    const attempts = this.attempts.get(key) || []
    attempts.push(Date.now())
    this.attempts.set(key, attempts)
  }

  getRemainingAttempts(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): number {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    const validAttempts = attempts.filter(time => now - time < windowMs)
    
    return Math.max(0, maxAttempts - validAttempts.length)
  }

  getTimeUntilReset(key: string, windowMs = 15 * 60 * 1000): number {
    const attempts = this.attempts.get(key) || []
    if (attempts.length === 0) return 0
    
    const oldestAttempt = Math.min(...attempts)
    const timeElapsed = Date.now() - oldestAttempt
    return Math.max(0, windowMs - timeElapsed)
  }
}

export const rateLimitTracker = new RateLimitTracker()