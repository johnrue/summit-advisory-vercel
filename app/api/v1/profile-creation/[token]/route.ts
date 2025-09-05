// Story 2.7: Profile Creation Token API
// Secure profile creation link validation and processing

import { NextRequest, NextResponse } from 'next/server'
import { profileCreationTriggerService } from '@/lib/services/profile-creation-trigger-service'
import type { GuardProfileData } from '@/lib/services/profile-creation-trigger-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Validate the profile creation token
    const result = await profileCreationTriggerService.validateCreationToken(token)
    
    if (!result.success) {
      const errorMessage = typeof result.error === 'string' ? result.error : result.error?.message;
      const errorCode = typeof result.error === 'string' ? undefined : result.error?.code;
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          code: errorCode
        },
        { status: errorCode === 'TOKEN_EXPIRED' ? 410 : 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        tokenInfo: result.data,
        message: 'Token is valid and ready for profile creation'
      }
    })
  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    // Validate the token first
    const tokenValidation = await profileCreationTriggerService.validateCreationToken(token)
    if (!tokenValidation.success) {
      const errorMessage = typeof tokenValidation.error === 'string' ? tokenValidation.error : tokenValidation.error?.message;
      const errorCode = typeof tokenValidation.error === 'string' ? undefined : tokenValidation.error?.code;
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          code: errorCode
        },
        { status: errorCode === 'TOKEN_EXPIRED' ? 410 : 404 }
      )
    }

    // Validate profile data structure
    const profileData = validateProfileData(body.profileData)
    if (!profileData.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid profile data',
          details: profileData.errors,
          code: 'INVALID_PROFILE_DATA'
        },
        { status: 400 }
      )
    }

    // Complete profile creation
    if (!tokenValidation.data) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid token data',
          code: 'INVALID_TOKEN_DATA'
        },
        { status: 400 }
      )
    }
    if (!profileData.data) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid profile data',
          code: 'INVALID_PROFILE_DATA'
        },
        { status: 400 }
      )
    }
    const result = await profileCreationTriggerService.completeProfileCreation(
      tokenValidation.data.id,
      profileData.data
    )

    if (!result.success) {
      const errorMessage = typeof result.error === 'string' ? result.error : result.error?.message;
      const errorCode = typeof result.error === 'string' ? undefined : result.error?.code;
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          code: errorCode
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: result.data,
        message: 'Guard profile created successfully'
      }
    }, { status: 201 })
  } catch (error) {
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

// Helper function to validate profile data
function validateProfileData(data: any): { 
  isValid: boolean
  data?: GuardProfileData
  errors?: string[]
} {
  const errors: string[] = []

  // Validate personal info
  if (!data?.personalInfo) {
    errors.push('Personal information is required')
  } else {
    if (!data.personalInfo.firstName) errors.push('First name is required')
    if (!data.personalInfo.lastName) errors.push('Last name is required')
    if (!data.personalInfo.email) errors.push('Email is required')
    if (!data.personalInfo.phone) errors.push('Phone number is required')
    if (!data.personalInfo.dateOfBirth) errors.push('Date of birth is required')
    
    if (!data.personalInfo.address) {
      errors.push('Address is required')
    } else {
      if (!data.personalInfo.address.street) errors.push('Street address is required')
      if (!data.personalInfo.address.city) errors.push('City is required')
      if (!data.personalInfo.address.state) errors.push('State is required')
      if (!data.personalInfo.address.zipCode) errors.push('ZIP code is required')
    }
  }

  // Validate employment info
  if (!data?.employment) {
    errors.push('Employment information is required')
  } else {
    if (!data.employment.startDate) errors.push('Start date is required')
    if (!data.employment.position) errors.push('Position is required')
    if (!data.employment.department) errors.push('Department is required')
    if (!data.employment.employmentType) errors.push('Employment type is required')
    
    if (!['full_time', 'part_time', 'contract'].includes(data.employment.employmentType)) {
      errors.push('Invalid employment type')
    }
  }

  // Validate compliance info
  if (!data?.compliance) {
    errors.push('Compliance information is required')
  } else {
    if (typeof data.compliance.backgroundCheckCompleted !== 'boolean') {
      errors.push('Background check completion status is required')
    }
    if (!data.compliance.backgroundCheckDate) {
      errors.push('Background check date is required')
    }
    if (!Array.isArray(data.compliance.trainingCompleted)) {
      errors.push('Training completed must be an array')
    }
    if (!Array.isArray(data.compliance.certificationsHeld)) {
      errors.push('Certifications held must be an array')
    }
  }

  // Validate preferences
  if (!data?.preferences) {
    errors.push('Preferences information is required')
  } else {
    if (!Array.isArray(data.preferences.availableShifts)) {
      errors.push('Available shifts must be an array')
    }
    if (!Array.isArray(data.preferences.preferredLocations)) {
      errors.push('Preferred locations must be an array')
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  // Convert date strings to Date objects
  const profileData: GuardProfileData = {
    personalInfo: {
      ...data.personalInfo,
      dateOfBirth: new Date(data.personalInfo.dateOfBirth)
    },
    employment: {
      ...data.employment,
      startDate: new Date(data.employment.startDate)
    },
    compliance: {
      ...data.compliance,
      backgroundCheckDate: new Date(data.compliance.backgroundCheckDate),
      topsExpiryDate: data.compliance.topsExpiryDate ? new Date(data.compliance.topsExpiryDate) : undefined
    },
    preferences: data.preferences
  }

  return { isValid: true, data: profileData }
}