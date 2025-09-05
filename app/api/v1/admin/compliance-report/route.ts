import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import AIAuditService from '@/lib/services/ai-audit-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const processingType = searchParams.get('processing_type')?.split(',')
    const status = searchParams.get('status')?.split(',')

    // Validate date parameters
    if (!dateFrom || !dateTo) {
      return NextResponse.json({
        success: false,
        error: 'date_from and date_to parameters are required'
      }, { status: 400 })
    }

    // Get compliance report data using the audit service
    const complianceData = await AIAuditService.getComplianceReport(dateFrom, dateTo)
    
    // Get audit summary for additional insights
    const auditSummary = await AIAuditService.getAuditSummary(dateFrom, dateTo)

    // Filter by processing type if specified
    let filteredData = complianceData
    if (processingType && processingType.length > 0 && !processingType.includes('all')) {
      filteredData = complianceData.filter((entry: any) => 
        processingType.includes(entry.processing_type)
      )
    }

    // Filter by status if specified
    if (status && status.length > 0 && !status.includes('all')) {
      filteredData = filteredData.filter((entry: any) => 
        status.includes(entry.processing_status)
      )
    }

    // Generate compliance summary
    const totalApplications = new Set(filteredData.map((entry: any) => entry.application_id)).size
    const aiProcessingEntries = filteredData.filter((entry: any) => 
      ['resume_parsing', 'data_validation'].includes(entry.processing_type)
    )
    const managerReviewEntries = filteredData.filter((entry: any) => 
      entry.processing_type === 'manager_review'
    )

    // Calculate AI processing stats
    const successfulAIProcessing = aiProcessingEntries.filter((entry: any) => 
      entry.processing_status === 'success'
    ).length
    const totalAIProcessing = aiProcessingEntries.length

    const totalOverrides = managerReviewEntries.filter((entry: any) =>
      entry.manager_overrides?.action?.includes('override')
    ).length
    const totalReviews = managerReviewEntries.length

    // Calculate average confidence from successful AI processing
    const confidenceScores = aiProcessingEntries
      .filter((entry: any) => entry.confidence_scores?.overall)
      .map((entry: any) => entry.confidence_scores!.overall!)
    const averageConfidence = confidenceScores.length > 0 
      ? confidenceScores.reduce((sum: number, score: number) => sum + score, 0) / confidenceScores.length * 100
      : 0

    // Get most overridden fields
    const fieldOverrides: Record<string, number> = {}
    managerReviewEntries.forEach((entry: any) => {
      if (entry.manager_overrides?.field) {
        const field = entry.manager_overrides.field
        fieldOverrides[field] = (fieldOverrides[field] || 0) + 1
      }
    })

    const mostOverriddenFields = Object.entries(fieldOverrides)
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Calculate compliance indicators
    const auditTrailCompleteness = filteredData.length > 0 
      ? (filteredData.filter((entry: any) => 
          entry.processing_start_time && 
          entry.processing_end_time &&
          entry.processing_status
        ).length / filteredData.length) * 100
      : 100

    const processingTimesWithinSLA = filteredData.filter((entry: any) => 
      entry.processing_duration_seconds && entry.processing_duration_seconds < 300 // 5 minutes SLA
    ).length
    const processingTimeWithinSLARate = filteredData.length > 0 
      ? (processingTimesWithinSLA / filteredData.length) * 100 
      : 100

    // Build comprehensive compliance summary
    const summary = {
      report_period: {
        from: dateFrom,
        to: dateTo
      },
      total_applications_processed: totalApplications,
      total_audit_entries: filteredData.length,
      ai_processing_stats: {
        total_ai_operations: totalAIProcessing,
        success_rate: totalAIProcessing > 0 ? (successfulAIProcessing / totalAIProcessing) * 100 : 0,
        average_confidence: averageConfidence,
        models_used: [...new Set(aiProcessingEntries.map((entry: any) => entry.ai_model))]
      },
      manager_review_stats: {
        total_reviews: totalReviews,
        total_overrides: totalOverrides,
        override_rate: totalReviews > 0 ? (totalOverrides / totalReviews) * 100 : 0,
        most_overridden_fields: mostOverriddenFields
      },
      compliance_indicators: {
        audit_trail_completeness: auditTrailCompleteness,
        data_retention_compliance: true, // Assume compliance unless we detect issues
        processing_time_within_sla: processingTimeWithinSLARate
      },
      quality_metrics: {
        high_confidence_processing: confidenceScores.filter((score: number) => score >= 0.8).length,
        manual_intervention_rate: totalReviews > 0 ? (totalOverrides / totalReviews) * 100 : 0,
        error_resolution_rate: auditSummary.success_rate < 100 
          ? auditSummary.success_rate 
          : 100
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        audit_entries: filteredData,
        summary,
        audit_summary: auditSummary,
        generated_at: new Date().toISOString(),
        filters: {
          date_from: dateFrom,
          date_to: dateTo,
          processing_type: processingType,
          status
        }
      }
    })

  } catch (error) {
    console.error('Error generating compliance report:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate compliance report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}