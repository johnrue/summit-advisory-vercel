import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, field, value, confidence_threshold } = body

    // Get current application data
    const { data: application, error: fetchError } = await supabase
      .from('guard_leads')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !application) {
      return NextResponse.json({
        success: false,
        error: 'Application not found',
        details: fetchError?.message
      }, { status: 404 })
    }

    let updateData: any = {}
    let auditLogEntry: any = {
      application_id: id,
      processing_type: 'manager_review',
      ai_model: application.ai_parsed_data?.processing_model || 'unknown',
      processing_start_time: new Date().toISOString(),
      processing_status: 'success',
      manager_overrides: {}
    }

    switch (action) {
      case 'approve_field':
        // Mark field as approved in ai_parsed_data
        const currentData = application.ai_parsed_data || {}
        const approvedFields = currentData.approved_fields || []
        
        if (!approvedFields.includes(field)) {
          approvedFields.push(field)
        }

        updateData = {
          ai_parsed_data: {
            ...currentData,
            approved_fields: approvedFields
          }
        }

        auditLogEntry.manager_overrides = {
          action: 'field_approved',
          field: field,
          timestamp: new Date().toISOString()
        }
        break

      case 'override_field':
        // Update field with manual override
        const currentAIData = application.ai_parsed_data || {}
        const manualOverrides = currentAIData.manual_overrides || []
        
        if (!manualOverrides.includes(field)) {
          manualOverrides.push(field)
        }

        // Update the extracted fields with the new value
        const extractedFields = currentAIData.extracted_fields || {}
        
        // Use dot notation to update nested fields
        const fieldParts = field.split('.')
        let target = extractedFields
        
        for (let i = 0; i < fieldParts.length - 1; i++) {
          if (!target[fieldParts[i]]) {
            target[fieldParts[i]] = {}
          }
          target = target[fieldParts[i]]
        }
        
        target[fieldParts[fieldParts.length - 1]] = value

        updateData = {
          ai_parsed_data: {
            ...currentAIData,
            extracted_fields: extractedFields,
            manual_overrides: manualOverrides,
            last_override_timestamp: new Date().toISOString()
          }
        }

        auditLogEntry.manager_overrides = {
          action: 'field_overridden',
          field: field,
          original_value: application.ai_parsed_data?.extracted_fields?.[field],
          new_value: value,
          timestamp: new Date().toISOString()
        }
        break

      case 'bulk_approve':
        // Approve all fields above the confidence threshold
        const threshold = confidence_threshold || 0.8
        const confidenceScores = application.confidence_scores || {}
        const currentAI = application.ai_parsed_data || {}
        const approved = currentAI.approved_fields || []

        // Add high-confidence fields to approved list
        Object.entries(confidenceScores).forEach(([fieldName, score]) => {
          if (typeof score === 'number' && score >= threshold && !approved.includes(fieldName)) {
            approved.push(fieldName)
          }
        })

        updateData = {
          ai_parsed_data: {
            ...currentAI,
            approved_fields: approved
          }
        }

        auditLogEntry.manager_overrides = {
          action: 'bulk_approved',
          confidence_threshold: threshold,
          approved_fields: approved,
          timestamp: new Date().toISOString()
        }
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          details: `Action '${action}' is not supported`
        }, { status: 400 })
    }

    // Update the application
    const { data: updatedApplication, error: updateError } = await supabase
      .from('guard_leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating application:', updateError)
      return NextResponse.json({
        success: false,
        error: 'Failed to update application',
        details: updateError.message
      }, { status: 500 })
    }

    // Log the audit entry
    auditLogEntry.processing_end_time = new Date().toISOString()
    
    const { error: auditError } = await supabase
      .from('ai_processing_audit')
      .insert(auditLogEntry)

    if (auditError) {
      console.error('Error logging audit entry:', auditError)
      // Don't fail the request for audit logging errors
    }

    return NextResponse.json({
      success: true,
      data: updatedApplication,
      message: `Successfully ${action.replace('_', ' ')}${field ? ` for field: ${field}` : ''}`
    })

  } catch (error) {
    console.error('Error in AI review API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}