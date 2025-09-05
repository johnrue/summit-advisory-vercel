// AI Resume Service - Story 2.2
// Client-side service for interacting with OpenAI resume parsing Edge Function

import { supabase } from '@/lib/supabase'
import type { 
  AIParsedData, 
  ApplicationData, 
  AIConfidenceScores,
  ApplicationServiceResult
} from '@/lib/types/guard-applications'

// Constants
const AI_RESUME_PARSER_FUNCTION = 'ai-resume-parser'
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7

/**
 * Trigger AI resume parsing for an uploaded document
 * @param documentPath - Path to document in Supabase Storage
 * @param applicationId - Associated application ID
 * @returns Promise with parsed data or error
 */
export async function parseResumeWithAI(
  documentPath: string,
  applicationId: string
): Promise<ApplicationServiceResult<AIParsedData>> {
  try {

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke(AI_RESUME_PARSER_FUNCTION, {
      body: {
        document_path: documentPath,
        application_id: applicationId
      }
    })

    if (error) {
      throw new Error(`AI parsing failed: ${error.message}`)
    }

    if (!data?.success) {
      throw new Error(data?.error || 'AI parsing failed')
    }

    // Transform the response to match our AIParsedData interface
    const aiParsedData: AIParsedData = {
      extraction_timestamp: new Date().toISOString(),
      processing_model: 'gpt-4',
      confidence_scores: data.data.confidence_scores,
      extracted_fields: data.data.parsed_data,
      manual_overrides: [],
      parsing_errors: [],
      processing_time_ms: data.data.processing_time_ms,
      text_extraction_success: true
    }

    return {
      success: true,
      data: aiParsedData,
      message: 'Resume parsed successfully with AI'
    }

  } catch (error) {
    
    return {
      success: false,
      data: {} as AIParsedData,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'AI resume parsing failed'
    }
  }
}

/**
 * Get AI parsed data for an application
 * @param applicationId - Application ID
 * @returns Promise with AI parsed data or null
 */
export async function getApplicationAIParsedData(
  applicationId: string
): Promise<ApplicationServiceResult<AIParsedData | null>> {
  try {
    const { data, error } = await supabase
      .from('guard_leads')
      .select('ai_parsed_data')
      .eq('id', applicationId)
      .single()

    if (error) {
      throw new Error(`Failed to retrieve AI data: ${error.message}`)
    }

    const aiParsedData = data?.ai_parsed_data ? data.ai_parsed_data as AIParsedData : null

    return {
      success: true,
      data: aiParsedData,
      message: aiParsedData ? 'AI parsed data retrieved' : 'No AI parsed data found'
    }

  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to retrieve AI parsed data'
    }
  }
}

/**
 * Update manual overrides for AI parsed data
 * @param applicationId - Application ID
 * @param fieldName - Name of the field that was manually overridden
 * @param originalValue - Original AI-parsed value
 * @param newValue - Manually corrected value
 * @returns Promise with update result
 */
export async function recordManualOverride(
  applicationId: string,
  fieldName: string,
  originalValue: any,
  newValue: any
): Promise<ApplicationServiceResult<boolean>> {
  try {
    // First, get the current AI parsed data
    const currentResult = await getApplicationAIParsedData(applicationId)
    
    if (!currentResult.success || !currentResult.data) {
      throw new Error('No AI parsed data found to update')
    }

    const currentData = currentResult.data
    
    // Add the manual override to the list
    const manualOverrides = currentData.manual_overrides || []
    const overrideRecord = `${fieldName}: "${originalValue}" -> "${newValue}"`
    
    if (!manualOverrides.includes(overrideRecord)) {
      manualOverrides.push(overrideRecord)
    }

    // Update the database
    const { error } = await supabase
      .from('guard_leads')
      .update({
        ai_parsed_data: {
          ...currentData,
          manual_overrides: manualOverrides
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)

    if (error) {
      throw new Error(`Failed to record manual override: ${error.message}`)
    }

    return {
      success: true,
      data: true,
      message: 'Manual override recorded successfully'
    }

  } catch (error) {
    return {
      success: false,
      data: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to record manual override'
    }
  }
}

/**
 * Validate AI confidence scores and identify fields needing review
 * @param confidenceScores - AI confidence scores
 * @param threshold - Minimum confidence threshold (default 0.7)
 * @returns Analysis of confidence levels
 */
export function analyzeConfidenceScores(
  confidenceScores: AIConfidenceScores,
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): {
  overallConfidence: number
  needsReview: boolean
  lowConfidenceFields: string[]
  highConfidenceFields: string[]
  recommendations: string[]
} {
  const fields = Object.entries(confidenceScores).filter(([key]) => key !== 'overall')
  const lowConfidenceFields: string[] = []
  const highConfidenceFields: string[] = []
  const recommendations: string[] = []

  // Analyze each field
  fields.forEach(([field, confidence]) => {
    if (confidence < threshold) {
      lowConfidenceFields.push(field)
    } else {
      highConfidenceFields.push(field)
    }
  })

  // Generate recommendations
  if (lowConfidenceFields.length > 0) {
    recommendations.push(`Review and verify: ${lowConfidenceFields.join(', ')}`)
  }

  if (confidenceScores.personal_info < threshold) {
    recommendations.push('Double-check contact information and personal details')
  }

  if (confidenceScores.work_experience < threshold) {
    recommendations.push('Verify employment dates and job descriptions')
  }

  if (confidenceScores.certifications < threshold) {
    recommendations.push('Confirm certification names, issuers, and expiration dates')
  }

  if (confidenceScores.education < threshold) {
    recommendations.push('Verify educational background and graduation dates')
  }

  return {
    overallConfidence: confidenceScores.overall,
    needsReview: confidenceScores.overall < threshold || lowConfidenceFields.length > 0,
    lowConfidenceFields,
    highConfidenceFields,
    recommendations
  }
}

/**
 * Merge AI parsed data with manually entered data
 * @param aiData - AI parsed application data
 * @param manualData - Manually entered application data
 * @returns Merged application data with AI suggestions
 */
export function mergeAIAndManualData(
  aiData: Partial<ApplicationData>,
  manualData: Partial<ApplicationData>
): {
  mergedData: ApplicationData
  suggestions: string[]
  conflicts: string[]
} {
  const suggestions: string[] = []
  const conflicts: string[] = []

  // Start with manual data as base
  const mergedData = { ...manualData } as ApplicationData

  // Personal Info merging
  if (aiData.personal_info && manualData.personal_info) {
    // Check for conflicts in personal info
    Object.entries(aiData.personal_info).forEach(([key, aiValue]) => {
      const manualValue = (manualData.personal_info as any)?.[key]
      
      if (manualValue && aiValue && manualValue !== aiValue) {
        conflicts.push(`${key}: Manual entry "${manualValue}" differs from AI suggestion "${aiValue}"`)
      } else if (!manualValue && aiValue) {
        suggestions.push(`Consider adding ${key}: ${aiValue} (from AI)`)
      }
    })
  } else if (aiData.personal_info && !manualData.personal_info) {
    mergedData.personal_info = aiData.personal_info
    suggestions.push('Personal information has been pre-filled from your resume')
  }

  // Work Experience merging
  if (aiData.work_experience && aiData.work_experience.length > 0) {
    if (!mergedData.work_experience || mergedData.work_experience.length === 0) {
      mergedData.work_experience = aiData.work_experience
      suggestions.push(`${aiData.work_experience.length} work experience entries pre-filled from resume`)
    } else {
      suggestions.push(`AI found ${aiData.work_experience.length} work experiences - review for completeness`)
    }
  }

  // Certifications merging
  if (aiData.certifications && aiData.certifications.length > 0) {
    if (!mergedData.certifications || mergedData.certifications.length === 0) {
      mergedData.certifications = aiData.certifications
      suggestions.push(`${aiData.certifications.length} certifications pre-filled from resume`)
    } else {
      suggestions.push(`AI found ${aiData.certifications.length} certifications - review for completeness`)
    }
  }

  // Education merging
  if (aiData.education && aiData.education.length > 0) {
    if (!mergedData.education || mergedData.education.length === 0) {
      mergedData.education = aiData.education
      suggestions.push(`${aiData.education.length} education entries pre-filled from resume`)
    } else {
      suggestions.push(`AI found ${aiData.education.length} education entries - review for completeness`)
    }
  }

  // References merging
  if (aiData.references && aiData.references.length > 0) {
    if (!mergedData.references || mergedData.references.length === 0) {
      mergedData.references = aiData.references
      suggestions.push(`${aiData.references.length} references pre-filled from resume`)
    } else {
      suggestions.push(`AI found ${aiData.references.length} references - review for completeness`)
    }
  }

  return {
    mergedData,
    suggestions,
    conflicts
  }
}

/**
 * Check if AI parsing is available and configured
 * @returns Boolean indicating if AI parsing is available
 */
export function isAIParsingAvailable(): boolean {
  // Check if OpenAI API key is configured (client-side check)
  // In production, this would check server configuration
  return true // For development, assume it's available
}

/**
 * Estimate processing time based on document size and type
 * @param fileSize - File size in bytes
 * @param fileType - MIME type of the file
 * @returns Estimated processing time in seconds
 */
export function estimateProcessingTime(fileSize: number, fileType: string): number {
  // Base time for AI processing
  const baseTime = 15 // seconds

  // Add time based on file size (larger files take longer to process)
  const sizeMB = fileSize / (1024 * 1024)
  const sizeMultiplier = Math.ceil(sizeMB / 2) // +1 second per 2MB

  // Add time based on file type (PDFs generally take longer than DOCX)
  const typeMultiplier = fileType === 'application/pdf' ? 1.5 : 1.0

  return Math.ceil(baseTime * typeMultiplier + sizeMultiplier)
}

// Export configuration constants
export const AI_CONFIG = {
  CONFIDENCE_THRESHOLD: DEFAULT_CONFIDENCE_THRESHOLD,
  FUNCTION_NAME: AI_RESUME_PARSER_FUNCTION,
  MAX_PROCESSING_TIME: 120, // seconds
  RETRY_ATTEMPTS: 2
} as const