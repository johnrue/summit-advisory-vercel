import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ResumeDataValidator from '@/lib/services/resume-data-validator'
import AIAuditService from '@/lib/services/ai-audit-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params

    // Get application data
    const { data: application, error } = await supabase
      .from('guard_leads')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !application) {
      return NextResponse.json({
        success: false,
        error: 'Application not found'
      }, { status: 404 })
    }

    // Check if validation report exists
    const { data: existingValidation } = await supabase
      .from('ai_processing_audit')
      .select('validation_results')
      .eq('application_id', id)
      .eq('processing_type', 'data_validation')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingValidation && existingValidation.validation_results) {
      return NextResponse.json({
        success: true,
        data: existingValidation.validation_results,
        cached: true
      })
    }

    return NextResponse.json({
      success: true,
      data: null,
      message: 'No validation report available. Run validation to generate report.'
    })

  } catch (error) {
    console.error('Error fetching validation report:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}