import { supabase } from '@/lib/supabase'
import type { ApiResponse } from '@/lib/types'
import type { LeadFormData } from './lead-management-service'

export interface DuplicateCheckResult {
  isDuplicate: boolean
  existingLeadId?: string
  matchType?: 'email' | 'phone' | 'name_phone'
  confidence: number
  existingLead?: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    status: string
    created_at: string
  }
}

export interface DeduplicationStats {
  totalChecked: number
  duplicatesFound: number
  duplicatesByType: Record<string, number>
  preventedDuplicates: number
}

/**
 * Check if a lead already exists in the database
 * @param leadData - Lead data to check for duplicates
 * @returns Promise with duplicate check result
 */
export async function checkForDuplicates(
  leadData: LeadFormData
): Promise<ApiResponse<DuplicateCheckResult>> {
  try {
    const { email, phone, firstName, lastName } = leadData

    // Clean phone number for comparison
    const cleanPhone = phone.replace(/\D/g, '')
    
    // Check for exact email match
    const { data: emailMatches, error: emailError } = await supabase
      .from('client_leads')
      .select('id, first_name, last_name, email, phone, status, created_at')
      .eq('email', email.toLowerCase())

    if (emailError) {
      throw new Error(`Database error: ${emailError.message}`)
    }

    if (emailMatches && emailMatches.length > 0) {
      const existingLead = emailMatches[0]
      return {
        success: true,
        data: {
          isDuplicate: true,
          existingLeadId: existingLead.id,
          matchType: 'email',
          confidence: 100,
          existingLead: {
            id: existingLead.id,
            firstName: existingLead.first_name,
            lastName: existingLead.last_name,
            email: existingLead.email,
            phone: existingLead.phone,
            status: existingLead.status,
            created_at: existingLead.created_at,
          }
        },
        message: 'Exact email match found'
      }
    }

    // Check for phone number match
    const { data: phoneMatches, error: phoneError } = await supabase
      .from('client_leads')
      .select('id, first_name, last_name, email, phone, status, created_at')
      .like('phone', `%${cleanPhone.slice(-10)}%`) // Match last 10 digits

    if (phoneError) {
      throw new Error(`Database error: ${phoneError.message}`)
    }

    if (phoneMatches && phoneMatches.length > 0) {
      // Check if any phone matches have similar names
      for (const match of phoneMatches) {
        const nameMatch = calculateNameSimilarity(
          `${firstName} ${lastName}`.toLowerCase(),
          `${match.first_name} ${match.last_name}`.toLowerCase()
        )
        
        if (nameMatch > 0.8) {
          return {
            success: true,
            data: {
              isDuplicate: true,
              existingLeadId: match.id,
              matchType: 'name_phone',
              confidence: Math.round(nameMatch * 100),
              existingLead: {
                id: match.id,
                firstName: match.first_name,
                lastName: match.last_name,
                email: match.email,
                phone: match.phone,
                status: match.status,
                created_at: match.created_at,
              }
            },
            message: 'Similar name and phone number match found'
          }
        }
      }

      // Phone match without name similarity
      const phoneMatch = phoneMatches[0]
      return {
        success: true,
        data: {
          isDuplicate: true,
          existingLeadId: phoneMatch.id,
          matchType: 'phone',
          confidence: 85,
          existingLead: {
            id: phoneMatch.id,
            firstName: phoneMatch.first_name,
            lastName: phoneMatch.last_name,
            email: phoneMatch.email,
            phone: phoneMatch.phone,
            status: phoneMatch.status,
            created_at: phoneMatch.created_at,
          }
        },
        message: 'Phone number match found'
      }
    }

    // No duplicates found
    return {
      success: true,
      data: {
        isDuplicate: false,
        confidence: 0
      },
      message: 'No duplicates found'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to check for duplicates'
    }
  }
}

/**
 * Merge duplicate lead information
 * @param existingLeadId - ID of the existing lead to update
 * @param newLeadData - New lead data to merge
 * @returns Promise with merge result
 */
export async function mergeDuplicateLead(
  existingLeadId: string,
  newLeadData: LeadFormData
): Promise<ApiResponse<void>> {
  try {
    // Get existing lead data
    const { data: existingLead, error: fetchError } = await supabase
      .from('client_leads')
      .select('*')
      .eq('id', existingLeadId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch existing lead: ${fetchError.message}`)
    }

    if (!existingLead) {
      throw new Error('Existing lead not found')
    }

    // Merge data - prioritize non-empty values from new data
    const mergedData: Record<string, any> = {}
    
    // Update contact info if new data provides better information
    if (newLeadData.firstName && newLeadData.firstName !== existingLead.first_name) {
      mergedData.first_name = newLeadData.firstName
    }
    if (newLeadData.lastName && newLeadData.lastName !== existingLead.last_name) {
      mergedData.last_name = newLeadData.lastName
    }
    if (newLeadData.phone && newLeadData.phone !== existingLead.phone) {
      mergedData.phone = newLeadData.phone
    }

    // Update estimated value if new value is higher
    if (newLeadData.estimatedValue && 
        (!existingLead.estimated_value || newLeadData.estimatedValue > existingLead.estimated_value)) {
      mergedData.estimated_value = newLeadData.estimatedValue
    }

    // Append new message to existing notes
    if (newLeadData.message) {
      const existingMessage = existingLead.message || ''
      const separator = existingMessage ? '\n\n---\n\n' : ''
      mergedData.message = `${existingMessage}${separator}Additional info (${new Date().toLocaleDateString()}): ${newLeadData.message}`
    }

    // Update source details with new source information
    const existingSourceDetails = existingLead.source_details || {}
    const newSourceDetails = newLeadData.sourceDetails || {}
    
    if (Object.keys(newSourceDetails).length > 0) {
      mergedData.source_details = {
        ...existingSourceDetails,
        duplicateSource: {
          sourceType: newLeadData.sourceType,
          details: newSourceDetails,
          mergedAt: new Date().toISOString()
        }
      }
    }

    // Increment contact count to reflect the additional touchpoint
    mergedData.contact_count = (existingLead.contact_count || 0) + 1
    mergedData.updated_at = new Date().toISOString()

    // Update the existing lead
    const { error: updateError } = await supabase
      .from('client_leads')
      .update(mergedData)
      .eq('id', existingLeadId)

    if (updateError) {
      throw new Error(`Failed to merge lead data: ${updateError.message}`)
    }

    return {
      success: true,
      message: 'Lead data merged successfully'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to merge duplicate lead'
    }
  }
}

/**
 * Get deduplication statistics
 * @param dateRange - Optional date range filter
 * @returns Promise with deduplication stats
 */
export async function getDeduplicationStats(
  dateRange?: { start: string, end: string }
): Promise<ApiResponse<DeduplicationStats>> {
  try {
    let query = supabase
      .from('client_leads')
      .select('source_details, created_at')

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
    }

    const { data: leads, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const totalChecked = leads?.length || 0
    let duplicatesFound = 0
    const duplicatesByType: Record<string, number> = {
      email: 0,
      phone: 0,
      name_phone: 0
    }

    // Analyze source_details for duplicate merge information
    leads?.forEach(lead => {
      if (lead.source_details?.duplicateSource) {
        duplicatesFound++
        // This is simplified - in a real scenario you'd track the match type
        duplicatesByType.email++
      }
    })

    const stats: DeduplicationStats = {
      totalChecked,
      duplicatesFound,
      duplicatesByType,
      preventedDuplicates: duplicatesFound // Simplified - tracks merges as prevented duplicates
    }

    return {
      success: true,
      data: stats,
      message: 'Deduplication stats calculated successfully'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to calculate deduplication stats'
    }
  }
}

/**
 * Calculate name similarity using Levenshtein distance
 * @param name1 - First name to compare
 * @param name2 - Second name to compare
 * @returns Similarity score between 0 and 1
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  if (!name1 || !name2) return 0
  if (name1 === name2) return 1

  const matrix: number[][] = []
  const len1 = name1.length
  const len2 = name2.length

  // Create distance matrix
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j
  }

  // Calculate Levenshtein distance
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (name2.charAt(i - 1) === name1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  const distance = matrix[len2][len1]
  const maxLength = Math.max(len1, len2)
  
  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength
}