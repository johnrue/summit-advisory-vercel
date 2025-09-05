// API Route: Resume Parsing for Guard Applications
// POST /api/v1/applications/parse-resume
// Triggers AI resume parsing via Supabase Edge Function

import { NextRequest, NextResponse } from 'next/server'
import { parseResumeWithAI } from '@/lib/services/ai-resume-service'
import { ResumeParsingRequestSchema } from '@/lib/validations/guard-applications'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    
    // Validate request data
    const validation = ResumeParsingRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { document_path, application_id } = validation.data

    // Trigger AI resume parsing
    const result = await parseResumeWithAI(document_path, application_id)

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

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        parsed_data: result.data.extracted_fields,
        confidence_scores: result.data.confidence_scores,
        processing_time_ms: result.data.processing_time_ms
      },
      message: result.message
    })

  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: 'Resume parsing request failed'
      },
      { status: 500 }
    )
  }
}