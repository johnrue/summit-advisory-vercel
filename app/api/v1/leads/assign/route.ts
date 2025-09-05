import { NextRequest, NextResponse } from 'next/server'
import { autoAssignLead, manualAssignLead } from '@/lib/services/lead-assignment-service'
import { z } from 'zod'

const assignLeadSchema = z.object({
  leadId: z.string().uuid('Valid lead ID is required'),
  managerId: z.string().uuid().optional(),
  serviceType: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, managerId, serviceType, priority } = assignLeadSchema.parse(body)

    let result

    if (managerId) {
      // Manual assignment to specific manager
      result = await manualAssignLead(leadId, managerId, 'Manual assignment')
    } else {
      // Auto-assignment using service type and priority
      if (!serviceType || !priority) {
        return NextResponse.json(
          {
            success: false,
            error: 'Service type and priority are required for auto-assignment',
            message: 'Missing required parameters for auto-assignment'
          },
          { status: 400 }
        )
      }
      result = await autoAssignLead(leadId)
    }

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message
    })

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

    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to assign lead'
      },
      { status: 500 }
    )
  }
}

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