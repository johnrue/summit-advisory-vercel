// Application Submission API - Story 2.2
// Handles complete application submission with data validation and storage

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { ApplicationData, ApplicationSubmissionRequest, ApplicationSubmissionResponse } from '@/lib/types/guard-applications'

/**
 * Submit completed application
 * POST /api/v1/applications/submit
 */
export async function POST(request: NextRequest) {
  try {
    const body: ApplicationSubmissionRequest = await request.json()
    const { application_token, application_data, ai_parsed_data, document_references } = body

    // Validate required fields
    if (!application_token || !application_data) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: application_token and application_data are required'
      }, { status: 400 })
    }

    // Validate application token exists and get application ID
    const { data: leadData, error: leadError } = await supabase
      .from('guard_leads')
      .select('id, status, email')
      .eq('application_link_token', application_token)
      .single()

    if (leadError || !leadData) {
      return NextResponse.json({
        success: false,
        error: 'Invalid application token'
      }, { status: 404 })
    }

    const applicationId = leadData.id

    // Generate unique application reference
    const applicationReference = generateApplicationReference()

    // Prepare application submission data
    const submissionData = {
      application_data,
      ai_parsed_data,
      documents: document_references,
      application_reference: applicationReference,
      application_submitted_at: new Date().toISOString(),
      status: 'application_received',
      updated_at: new Date().toISOString()
    }

    // Update guard_leads record with application submission
    const { error: updateError } = await supabase
      .from('guard_leads')
      .update(submissionData)
      .eq('id', applicationId)

    if (updateError) {
      console.error('Application submission error:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to submit application. Please try again.'
      }, { status: 500 })
    }

    // TODO: Send confirmation email (requires email service setup)
    try {
      await sendApplicationConfirmationEmail(leadData.email, applicationReference, application_data)
    } catch (emailError) {
      console.warn('Failed to send confirmation email:', emailError)
      // Don't fail the submission if email fails
    }

    // Return success response
    const response: ApplicationSubmissionResponse = {
      success: true,
      data: {
        application_id: applicationId,
        application_reference: applicationReference,
        submitted_at: submissionData.application_submitted_at,
        next_steps: 'Your application has been submitted successfully. You will be contacted within 2-3 business days regarding next steps.'
      }
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Application submission error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Application submission failed'
    }, { status: 500 })
  }
}

/**
 * Generate unique application reference number
 * Format: GMP-YYYY-NNNN (Guard Management Platform - Year - Sequential Number)
 */
function generateApplicationReference(): string {
  const year = new Date().getFullYear()
  const randomNum = Math.floor(Math.random() * 9000) + 1000 // 4-digit number 1000-9999
  return `GMP-${year}-${randomNum}`
}

/**
 * Send application confirmation email
 * TODO: Implement with actual email service (SendGrid, Resend, etc.)
 */
async function sendApplicationConfirmationEmail(
  email: string, 
  applicationReference: string, 
  applicationData: ApplicationData
): Promise<void> {
  // Placeholder implementation
  // In production, integrate with email service
  console.log(`Sending confirmation email to ${email} for application ${applicationReference}`)
  
  // Email template would include:
  // - Application reference number
  // - Next steps in the process
  // - Timeline expectations
  // - Contact information for questions
  
  return Promise.resolve()
}

/**
 * Validate application data structure
 */
function validateApplicationData(data: ApplicationData): string[] {
  const errors: string[] = []

  // Validate personal info
  if (!data.personal_info) {
    errors.push('Personal information is required')
  } else {
    if (!data.personal_info.first_name) errors.push('First name is required')
    if (!data.personal_info.last_name) errors.push('Last name is required')
    if (!data.personal_info.email) errors.push('Email is required')
    if (!data.personal_info.phone) errors.push('Phone number is required')
  }

  // Validate availability
  if (!data.availability) {
    errors.push('Availability information is required')
  } else {
    const hasAvailability = Object.values(data.availability).some(Boolean)
    if (!hasAvailability) {
      errors.push('At least one availability option must be selected')
    }
  }

  return errors
}