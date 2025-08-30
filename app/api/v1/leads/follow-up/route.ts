import { NextRequest, NextResponse } from 'next/server'
import { scheduleFollowUp, processFollowUps, updateFollowUpStatus } from '@/lib/services/lead-follow-up-service'
import { z } from 'zod'

const scheduleFollowUpSchema = z.object({
  leadId: z.string().uuid('Valid lead ID is required')
})

const updateFollowUpSchema = z.object({
  leadId: z.string().uuid('Valid lead ID is required'),
  status: z.enum(['completed', 'skipped', 'rescheduled']),
  notes: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId } = scheduleFollowUpSchema.parse(body)

    const result = await scheduleFollowUp(leadId)

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

    console.error('Follow-up scheduling error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to schedule follow-up'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, status, notes } = updateFollowUpSchema.parse(body)

    const result = await updateFollowUpStatus(leadId, status, notes)

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

    console.error('Follow-up update error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to update follow-up status'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to process pending follow-ups (for cron jobs)
export async function GET() {
  try {
    const result = await processFollowUps()

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
    console.error('Follow-up processing error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to process follow-ups'
      },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}