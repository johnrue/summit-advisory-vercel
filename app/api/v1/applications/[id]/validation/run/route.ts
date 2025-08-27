import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ResumeDataValidator from '@/lib/services/resume-data-validator'
import AIAuditService from '@/lib/services/ai-audit-service'
import type { ApplicationData } from '@/lib/types/guard-applications'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auditId = await AIAuditService.logProcessingStart(
    params.id,
    'data_validation',
    'resume_data_validator_v1',
    'system',
    `validation_session_${Date.now()}`
  )

  try {
    const { id } = params

    // Get application data
    const { data: application, error } = await supabase
      .from('guard_leads')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !application) {
      if (auditId) {
        await AIAuditService.logProcessingEnd(auditId, 'failure', {
          error_details: 'Application not found'
        })
      }
      return NextResponse.json({
        success: false,
        error: 'Application not found'
      }, { status: 404 })
    }

    // Check if we have application data to validate
    if (!application.application_data) {
      if (auditId) {
        await AIAuditService.logProcessingEnd(auditId, 'failure', {
          error_details: 'No application data available for validation'
        })
      }
      return NextResponse.json({
        success: false,
        error: 'No application data available for validation'
      }, { status: 400 })
    }

    const applicationData = application.application_data as ApplicationData

    // Run validation
    const validationReport = ResumeDataValidator.validateApplicationData(applicationData)

    // Generate confidence scores for validation results
    const validationConfidenceScores = {
      personal_info: calculateCategoryConfidence(validationReport.field_results, 'personal_info'),
      work_experience: calculateCategoryConfidence(validationReport.field_results, 'work_experience'),
      education: calculateCategoryConfidence(validationReport.field_results, 'education'),
      certifications: calculateCategoryConfidence(validationReport.field_results, 'certifications'),
      references: calculateCategoryConfidence(validationReport.field_results, 'references'),
      overall: validationReport.overall_score / 100
    }

    // Log successful validation completion
    if (auditId) {
      await AIAuditService.logProcessingEnd(auditId, 'success', {
        confidence_scores: validationConfidenceScores,
        validation_results: validationReport
      })
    }

    return NextResponse.json({
      success: true,
      data: validationReport,
      confidence_scores: validationConfidenceScores,
      message: 'Validation completed successfully'
    })

  } catch (error) {
    console.error('Error running validation:', error)
    
    if (auditId) {
      await AIAuditService.logProcessingEnd(auditId, 'failure', {
        error_details: error instanceof Error ? error.message : 'Unknown validation error'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function calculateCategoryConfidence(results: any[], category: string): number {
  const categoryResults = results.filter(r => 
    r.field.includes(category) || 
    (category === 'personal_info' && (r.field.includes('email') || r.field.includes('phone') || r.field.includes('address')))
  )

  if (categoryResults.length === 0) return 1.0

  const totalConfidence = categoryResults.reduce((sum, result) => sum + result.confidence, 0)
  return totalConfidence / categoryResults.length
}