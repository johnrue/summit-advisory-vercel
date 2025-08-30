import { NextRequest, NextResponse } from 'next/server'
import { createLead } from '@/lib/services/lead-management-service'
import { autoAssignLead } from '@/lib/services/lead-assignment-service'
import { checkForDuplicates } from '@/lib/services/lead-deduplication-service'
import { scheduleFollowUp } from '@/lib/services/lead-follow-up-service'
import { z } from 'zod'

const leadCaptureSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  serviceType: z.string().min(1, 'Service type is required'),
  sourceType: z.enum([
    'website_form',
    'social_media',
    'referral',
    'networking_event', 
    'digital_marketing',
    'cold_outreach',
    'phone_inquiry',
    'walk_in',
    'other'
  ]),
  sourceDetails: z.record(z.any()).optional(),
  message: z.string().optional(),
  estimatedValue: z.number().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = leadCaptureSchema.parse(body)

    // Check for duplicates
    const duplicateCheck = await checkForDuplicates({
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: validatedData.email,
      phone: validatedData.phone
    })

    if (!duplicateCheck.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: duplicateCheck.error,
          message: 'Failed to check for duplicates'
        },
        { status: 500 }
      )
    }

    if (duplicateCheck.data && duplicateCheck.data.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate lead detected',
          message: 'A similar lead already exists in the system',
          duplicates: duplicateCheck.data
        },
        { status: 409 }
      )
    }

    // Create the lead
    const leadResult = await createLead({
      first_name: validatedData.firstName,
      last_name: validatedData.lastName,
      email: validatedData.email,
      phone: validatedData.phone,
      service_type: validatedData.serviceType,
      source_type: validatedData.sourceType,
      source_details: validatedData.sourceDetails || {},
      qualification_notes: validatedData.message || '',
      estimated_value: validatedData.estimatedValue,
      priority: validatedData.priority,
      status: 'prospect'
    })

    if (!leadResult.success || !leadResult.data) {
      return NextResponse.json(
        {
          success: false,
          error: leadResult.error,
          message: 'Failed to create lead'
        },
        { status: 500 }
      )
    }

    const leadId = leadResult.data.id

    // Auto-assign the lead
    const assignmentResult = await autoAssignLead(leadId, validatedData.serviceType, validatedData.priority)
    
    if (!assignmentResult.success) {
      console.warn(`Lead created but assignment failed: ${assignmentResult.error}`)
    }

    // Schedule follow-up workflow
    const followUpResult = await scheduleFollowUp(leadId)
    
    if (!followUpResult.success) {
      console.warn(`Lead created but follow-up scheduling failed: ${followUpResult.error}`)
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: leadId,
          assignedTo: assignmentResult.data?.assignedTo || null,
          followUpScheduled: followUpResult.success
        },
        message: 'Lead captured successfully'
      },
      { status: 201 }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Invalid input data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    console.error('Lead capture error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to capture lead'
      },
      { status: 500 }
    )
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}