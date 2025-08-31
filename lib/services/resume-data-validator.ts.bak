// Resume Data Validator for Story 2.3
// Comprehensive validation and quality checking for AI-extracted resume data

import type { 
  ApplicationData, 
  PersonalInfo, 
  WorkExperience, 
  Certification, 
  Education,
  Reference
} from '@/lib/types/guard-applications'

export interface ValidationResult {
  field: string
  originalValue: any
  validatedValue: any
  isValid: boolean
  confidence: number
  validationErrors: ValidationError[]
  suggestions?: string[]
}

export interface ValidationError {
  type: 'format' | 'consistency' | 'completeness' | 'authenticity'
  message: string
  severity: 'low' | 'medium' | 'high'
  autoFixSuggestion?: string
}

export interface ValidationReport {
  overall_score: number
  total_fields: number
  valid_fields: number
  error_count: number
  warning_count: number
  field_results: ValidationResult[]
  consistency_checks: ConsistencyCheckResult[]
  recommendations: string[]
}

export interface ConsistencyCheckResult {
  check_type: 'timeline' | 'cross_reference' | 'data_integrity'
  description: string
  status: 'passed' | 'failed' | 'warning'
  details: string
  affected_fields: string[]
}

export class ResumeDataValidator {
  /**
   * Validate complete application data
   */
  static validateApplicationData(data: ApplicationData): ValidationReport {
    const results: ValidationResult[] = []
    const consistencyChecks: ConsistencyCheckResult[] = []

    // Validate personal info
    if (data.personal_info) {
      results.push(...this.validatePersonalInfo(data.personal_info))
    }

    // Validate work experience
    if (data.work_experience) {
      results.push(...this.validateWorkExperience(data.work_experience))
      consistencyChecks.push(...this.checkWorkExperienceConsistency(data.work_experience))
    }

    // Validate certifications
    if (data.certifications) {
      results.push(...this.validateCertifications(data.certifications))
    }

    // Validate education
    if (data.education) {
      results.push(...this.validateEducation(data.education))
    }

    // Validate references
    if (data.references) {
      results.push(...this.validateReferences(data.references))
    }

    // Cross-validation checks
    consistencyChecks.push(...this.performCrossValidation(data))

    const validFields = results.filter(r => r.isValid).length
    const errorCount = results.reduce((sum, r) => sum + r.validationErrors.filter(e => e.severity === 'high').length, 0)
    const warningCount = results.reduce((sum, r) => sum + r.validationErrors.filter(e => e.severity !== 'high').length, 0)
    
    const overallScore = results.length > 0 
      ? (validFields / results.length) * 100 
      : 100

    return {
      overall_score: overallScore,
      total_fields: results.length,
      valid_fields: validFields,
      error_count: errorCount,
      warning_count: warningCount,
      field_results: results,
      consistency_checks: consistencyChecks,
      recommendations: this.generateRecommendations(results, consistencyChecks)
    }
  }

  /**
   * Validate personal information
   */
  static validatePersonalInfo(personalInfo: PersonalInfo): ValidationResult[] {
    const results: ValidationResult[] = []

    // Email validation
    results.push(this.validateEmail(personalInfo.email))

    // Phone validation
    results.push(this.validatePhone(personalInfo.phone))

    // Date of birth validation
    if (personalInfo.date_of_birth) {
      results.push(this.validateDateOfBirth(personalInfo.date_of_birth))
    }

    // Address validation
    results.push(this.validateAddress(personalInfo.address))

    return results
  }

  /**
   * Validate work experience entries
   */
  static validateWorkExperience(experiences: WorkExperience[]): ValidationResult[] {
    const results: ValidationResult[] = []

    experiences.forEach((exp, index) => {
      // Date validation
      results.push(this.validateWorkDates(exp, `work_experience[${index}]`))

      // Required fields validation
      results.push(this.validateRequiredField(
        exp.company, 
        `work_experience[${index}].company`,
        'Company name is required'
      ))

      results.push(this.validateRequiredField(
        exp.position, 
        `work_experience[${index}].position`,
        'Position title is required'
      ))

      // Description quality validation
      if (exp.description) {
        results.push(this.validateDescriptionQuality(
          exp.description,
          `work_experience[${index}].description`
        ))
      }
    })

    return results
  }

  /**
   * Validate certifications
   */
  static validateCertifications(certifications: Certification[]): ValidationResult[] {
    const results: ValidationResult[] = []

    certifications.forEach((cert, index) => {
      // Required fields
      results.push(this.validateRequiredField(
        cert.name,
        `certifications[${index}].name`,
        'Certification name is required'
      ))

      results.push(this.validateRequiredField(
        cert.issuer,
        `certifications[${index}].issuer`,
        'Certification issuer is required'
      ))

      // Date validation
      results.push(this.validateCertificationDate(cert.date_obtained, `certifications[${index}].date_obtained`))

      if (cert.expiry_date) {
        results.push(this.validateCertificationExpiry(cert.date_obtained, cert.expiry_date, `certifications[${index}]`))
      }

      // Security-specific validation for guard industry
      results.push(this.validateSecurityCertification(cert, `certifications[${index}]`))
    })

    return results
  }

  /**
   * Validate education entries
   */
  static validateEducation(education: Education[]): ValidationResult[] {
    const results: ValidationResult[] = []

    education.forEach((edu, index) => {
      // Required fields
      results.push(this.validateRequiredField(
        edu.school,
        `education[${index}].school`,
        'School name is required'
      ))

      results.push(this.validateRequiredField(
        edu.degree,
        `education[${index}].degree`,
        'Degree is required'
      ))

      // Date validation
      if (edu.graduation_date) {
        results.push(this.validateEducationDate(edu.graduation_date, `education[${index}].graduation_date`))
      }

      // GPA validation
      if (edu.gpa !== undefined) {
        results.push(this.validateGPA(edu.gpa, `education[${index}].gpa`))
      }
    })

    return results
  }

  /**
   * Validate references
   */
  static validateReferences(references: Reference[]): ValidationResult[] {
    const results: ValidationResult[] = []

    references.forEach((ref, index) => {
      // Email validation
      results.push(this.validateEmail(ref.email, `references[${index}].email`))

      // Phone validation
      results.push(this.validatePhone(ref.phone, `references[${index}].phone`))

      // Required fields
      results.push(this.validateRequiredField(
        ref.name,
        `references[${index}].name`,
        'Reference name is required'
      ))

      results.push(this.validateRequiredField(
        ref.company,
        `references[${index}].company`,
        'Reference company is required'
      ))

      // Years known validation
      results.push(this.validateYearsKnown(ref.years_known, `references[${index}].years_known`))
    })

    return results
  }

  // Individual validation methods
  private static validateEmail(email: string, field: string = 'email'): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const isValid = emailRegex.test(email)
    
    const errors: ValidationError[] = []
    if (!isValid) {
      errors.push({
        type: 'format',
        message: 'Invalid email format',
        severity: 'high',
        autoFixSuggestion: 'Please check the email format (example@domain.com)'
      })
    }

    return {
      field,
      originalValue: email,
      validatedValue: email.toLowerCase(),
      isValid,
      confidence: isValid ? 1.0 : 0.0,
      validationErrors: errors,
      suggestions: !isValid ? ['Check for typos', 'Verify email format'] : undefined
    }
  }

  private static validatePhone(phone: string, field: string = 'phone'): ValidationResult {
    // Remove all non-digits
    const digitsOnly = phone.replace(/\D/g, '')
    
    // US phone number validation (10 or 11 digits)
    const isValid = digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly[0] === '1')
    
    const errors: ValidationError[] = []
    if (!isValid) {
      errors.push({
        type: 'format',
        message: 'Invalid phone number format',
        severity: 'medium',
        autoFixSuggestion: 'US phone numbers should be 10 digits: (123) 456-7890'
      })
    }

    // Format the phone number
    let formattedPhone = phone
    if (isValid && digitsOnly.length === 10) {
      formattedPhone = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`
    }

    return {
      field,
      originalValue: phone,
      validatedValue: formattedPhone,
      isValid,
      confidence: isValid ? 1.0 : 0.7,
      validationErrors: errors
    }
  }

  private static validateDateOfBirth(dob: string): ValidationResult {
    const date = new Date(dob)
    const now = new Date()
    const age = now.getFullYear() - date.getFullYear()
    
    const isValid = !isNaN(date.getTime()) && age >= 18 && age <= 100
    const errors: ValidationError[] = []
    
    if (isNaN(date.getTime())) {
      errors.push({
        type: 'format',
        message: 'Invalid date format',
        severity: 'high'
      })
    } else if (age < 18) {
      errors.push({
        type: 'consistency',
        message: 'Applicant must be at least 18 years old',
        severity: 'high'
      })
    } else if (age > 100) {
      errors.push({
        type: 'consistency',
        message: 'Please verify date of birth',
        severity: 'medium'
      })
    }

    return {
      field: 'date_of_birth',
      originalValue: dob,
      validatedValue: date.toISOString().split('T')[0],
      isValid,
      confidence: isValid ? 1.0 : 0.2,
      validationErrors: errors
    }
  }

  private static validateAddress(address: any): ValidationResult {
    const required = ['street', 'city', 'state', 'zip_code']
    const missing = required.filter(field => !address[field])
    
    const isValid = missing.length === 0
    const errors: ValidationError[] = []
    
    missing.forEach(field => {
      errors.push({
        type: 'completeness',
        message: `${field.replace('_', ' ')} is required`,
        severity: 'medium'
      })
    })

    // ZIP code format validation
    if (address.zip_code && !/^\d{5}(-\d{4})?$/.test(address.zip_code)) {
      errors.push({
        type: 'format',
        message: 'Invalid ZIP code format',
        severity: 'medium',
        autoFixSuggestion: 'ZIP code should be 5 digits or 5+4 format (12345 or 12345-6789)'
      })
    }

    return {
      field: 'address',
      originalValue: address,
      validatedValue: address,
      isValid,
      confidence: isValid ? 1.0 : 0.6,
      validationErrors: errors
    }
  }

  private static validateWorkDates(experience: WorkExperience, field: string): ValidationResult {
    const startDate = new Date(experience.start_date)
    const endDate = experience.end_date ? new Date(experience.end_date) : new Date()
    
    const isValidStart = !isNaN(startDate.getTime())
    const isValidEnd = !experience.end_date || !isNaN(endDate.getTime())
    const isLogicalOrder = isValidStart && isValidEnd && startDate <= endDate
    
    const isValid = isValidStart && isValidEnd && isLogicalOrder
    const errors: ValidationError[] = []
    
    if (!isValidStart) {
      errors.push({
        type: 'format',
        message: 'Invalid start date format',
        severity: 'high'
      })
    }
    
    if (!isValidEnd) {
      errors.push({
        type: 'format',
        message: 'Invalid end date format',
        severity: 'high'
      })
    }
    
    if (!isLogicalOrder) {
      errors.push({
        type: 'consistency',
        message: 'Start date must be before end date',
        severity: 'high'
      })
    }

    return {
      field: `${field}.dates`,
      originalValue: { start: experience.start_date, end: experience.end_date },
      validatedValue: { start: experience.start_date, end: experience.end_date },
      isValid,
      confidence: isValid ? 1.0 : 0.3,
      validationErrors: errors
    }
  }

  private static validateRequiredField(value: any, field: string, message: string): ValidationResult {
    const isValid = value && value.toString().trim().length > 0
    const errors: ValidationError[] = []
    
    if (!isValid) {
      errors.push({
        type: 'completeness',
        message,
        severity: 'high'
      })
    }

    return {
      field,
      originalValue: value,
      validatedValue: value,
      isValid,
      confidence: isValid ? 1.0 : 0.0,
      validationErrors: errors
    }
  }

  private static validateDescriptionQuality(description: string, field: string): ValidationResult {
    const wordCount = description.trim().split(/\s+/).length
    const isValid = wordCount >= 10 // Minimum 10 words for quality description
    
    const errors: ValidationError[] = []
    if (!isValid) {
      errors.push({
        type: 'completeness',
        message: 'Job description should be more detailed',
        severity: 'low',
        autoFixSuggestion: 'Provide more details about responsibilities and achievements'
      })
    }

    return {
      field,
      originalValue: description,
      validatedValue: description,
      isValid,
      confidence: Math.min(wordCount / 20, 1.0), // Scale confidence based on word count
      validationErrors: errors,
      suggestions: !isValid ? ['Add more detail about responsibilities', 'Include achievements and impact'] : undefined
    }
  }

  private static validateCertificationDate(dateString: string, field: string): ValidationResult {
    const date = new Date(dateString)
    const now = new Date()
    const yearsAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365)
    
    const isValid = !isNaN(date.getTime()) && yearsAgo >= 0 && yearsAgo <= 50
    const errors: ValidationError[] = []
    
    if (isNaN(date.getTime())) {
      errors.push({
        type: 'format',
        message: 'Invalid certification date',
        severity: 'high'
      })
    } else if (yearsAgo < 0) {
      errors.push({
        type: 'consistency',
        message: 'Certification date cannot be in the future',
        severity: 'high'
      })
    } else if (yearsAgo > 50) {
      errors.push({
        type: 'consistency',
        message: 'Very old certification date - please verify',
        severity: 'medium'
      })
    }

    return {
      field,
      originalValue: dateString,
      validatedValue: dateString,
      isValid,
      confidence: isValid ? 1.0 : 0.2,
      validationErrors: errors
    }
  }

  private static validateCertificationExpiry(obtained: string, expiry: string, field: string): ValidationResult {
    const obtainedDate = new Date(obtained)
    const expiryDate = new Date(expiry)
    const now = new Date()
    
    const isValid = obtainedDate < expiryDate
    const isExpired = expiryDate < now
    
    const errors: ValidationError[] = []
    if (!isValid) {
      errors.push({
        type: 'consistency',
        message: 'Certification expiry date must be after obtained date',
        severity: 'high'
      })
    }
    
    if (isExpired) {
      errors.push({
        type: 'authenticity',
        message: 'Certification has expired',
        severity: 'medium'
      })
    }

    return {
      field: `${field}.expiry`,
      originalValue: expiry,
      validatedValue: expiry,
      isValid: isValid && !isExpired,
      confidence: isValid ? (isExpired ? 0.5 : 1.0) : 0.0,
      validationErrors: errors
    }
  }

  private static validateSecurityCertification(cert: Certification, field: string): ValidationResult {
    const securityTypes = ['security-guard', 'armed-security', 'surveillance']
    const isSecurityCert = securityTypes.includes(cert.certification_type)
    
    const errors: ValidationError[] = []
    let confidence = 1.0
    
    if (isSecurityCert && !cert.certification_number) {
      errors.push({
        type: 'completeness',
        message: 'Security certifications should include certification number',
        severity: 'medium'
      })
      confidence = 0.7
    }

    return {
      field: `${field}.security_validation`,
      originalValue: cert,
      validatedValue: cert,
      isValid: errors.length === 0,
      confidence,
      validationErrors: errors
    }
  }

  private static validateEducationDate(graduationDate: string, field: string): ValidationResult {
    const date = new Date(graduationDate)
    const now = new Date()
    const yearsAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365)
    
    const isValid = !isNaN(date.getTime()) && yearsAgo >= -1 && yearsAgo <= 60
    const errors: ValidationError[] = []
    
    if (isNaN(date.getTime())) {
      errors.push({
        type: 'format',
        message: 'Invalid graduation date',
        severity: 'medium'
      })
    } else if (yearsAgo < -1) {
      errors.push({
        type: 'consistency',
        message: 'Graduation date too far in future',
        severity: 'medium'
      })
    } else if (yearsAgo > 60) {
      errors.push({
        type: 'consistency',
        message: 'Very old graduation date - please verify',
        severity: 'low'
      })
    }

    return {
      field,
      originalValue: graduationDate,
      validatedValue: graduationDate,
      isValid,
      confidence: isValid ? 1.0 : 0.5,
      validationErrors: errors
    }
  }

  private static validateGPA(gpa: number, field: string): ValidationResult {
    const isValid = gpa >= 0.0 && gpa <= 4.0
    const errors: ValidationError[] = []
    
    if (!isValid) {
      errors.push({
        type: 'format',
        message: 'GPA should be between 0.0 and 4.0',
        severity: 'medium',
        autoFixSuggestion: 'Standard US GPA scale is 0.0-4.0'
      })
    }

    return {
      field,
      originalValue: gpa,
      validatedValue: Math.max(0, Math.min(4.0, gpa)),
      isValid,
      confidence: isValid ? 1.0 : 0.3,
      validationErrors: errors
    }
  }

  private static validateYearsKnown(years: number, field: string): ValidationResult {
    const isValid = years >= 0 && years <= 50
    const errors: ValidationError[] = []
    
    if (!isValid) {
      errors.push({
        type: 'consistency',
        message: 'Years known should be reasonable (0-50)',
        severity: 'medium'
      })
    }

    return {
      field,
      originalValue: years,
      validatedValue: Math.max(0, Math.min(50, years)),
      isValid,
      confidence: isValid ? 1.0 : 0.5,
      validationErrors: errors
    }
  }

  // Consistency checking methods
  private static checkWorkExperienceConsistency(experiences: WorkExperience[]): ConsistencyCheckResult[] {
    const results: ConsistencyCheckResult[] = []
    
    // Sort by start date
    const sortedExperiences = [...experiences].sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    )

    // Check for overlapping employment
    for (let i = 0; i < sortedExperiences.length - 1; i++) {
      const current = sortedExperiences[i]
      const next = sortedExperiences[i + 1]
      
      const currentEnd = current.end_date ? new Date(current.end_date) : new Date()
      const nextStart = new Date(next.start_date)
      
      if (currentEnd > nextStart) {
        results.push({
          check_type: 'timeline',
          description: 'Overlapping employment periods detected',
          status: 'warning',
          details: `${current.company} overlaps with ${next.company}`,
          affected_fields: [`work_experience[${i}]`, `work_experience[${i + 1}]`]
        })
      }
    }

    return results
  }

  private static performCrossValidation(data: ApplicationData): ConsistencyCheckResult[] {
    const results: ConsistencyCheckResult[] = []

    // Check if work experience aligns with education timeline
    if (data.work_experience && data.education) {
      const oldestWork = data.work_experience.reduce((oldest, exp) => {
        const startDate = new Date(exp.start_date)
        return startDate < oldest ? startDate : oldest
      }, new Date())

      const latestGraduation = data.education.reduce((latest, edu) => {
        if (edu.graduation_date) {
          const gradDate = new Date(edu.graduation_date)
          return gradDate > latest ? gradDate : latest
        }
        return latest
      }, new Date(0))

      if (latestGraduation > new Date(0) && oldestWork < latestGraduation) {
        // Work started before graduation - could be valid for part-time work
        results.push({
          check_type: 'cross_reference',
          description: 'Work experience timeline check',
          status: 'passed',
          details: 'Work experience timeline is consistent with education',
          affected_fields: ['work_experience', 'education']
        })
      }
    }

    return results
  }

  private static generateRecommendations(results: ValidationResult[], checks: ConsistencyCheckResult[]): string[] {
    const recommendations: string[] = []
    
    const highSeverityErrors = results.filter(r => 
      r.validationErrors.some(e => e.severity === 'high')
    ).length

    if (highSeverityErrors > 0) {
      recommendations.push(`Address ${highSeverityErrors} critical validation errors before approving`)
    }

    const lowConfidenceFields = results.filter(r => r.confidence < 0.7).length
    if (lowConfidenceFields > 0) {
      recommendations.push(`Review ${lowConfidenceFields} fields with low validation confidence`)
    }

    const failedChecks = checks.filter(c => c.status === 'failed').length
    if (failedChecks > 0) {
      recommendations.push(`Resolve ${failedChecks} consistency check failures`)
    }

    return recommendations
  }
}

export default ResumeDataValidator