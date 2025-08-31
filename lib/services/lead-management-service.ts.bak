import { supabase } from '@/lib/supabase'
import type { ApiResponse } from '@/lib/types'

// Lead management types
export interface Lead {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  sourceType: string
  sourceDetails: Record<string, any>
  serviceType: string
  message?: string
  estimatedValue?: number
  status: 'prospect' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  assignedTo?: string
  assignedAt?: string
  qualificationScore: number
  qualificationNotes?: string
  lastContactDate?: string
  nextFollowUpDate?: string
  contactCount: number
  convertedToContract: boolean
  contractSignedDate?: string
  created_at: string
  updated_at: string
}

export interface LeadFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  sourceType: string
  sourceDetails?: Record<string, any>
  serviceType: string
  message?: string
  estimatedValue?: number
}

export interface LeadFilters {
  status?: string[]
  sourceType?: string[]
  assignedTo?: string
  dateRange?: {
    start: string
    end: string
  }
  search?: string
}

export interface LeadStats {
  totalLeads: number
  byStatus: Record<string, number>
  bySource: Record<string, number>
  conversionRate: number
  averageValue: number
  averageScore: number
}

/**
 * Create a new lead
 * @param leadData - Lead information
 * @returns Promise with success/error response
 */
export async function createLead(
  leadData: LeadFormData
): Promise<ApiResponse<Lead>> {
  try {
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'serviceType', 'sourceType']
    for (const field of requiredFields) {
      if (!leadData[field as keyof LeadFormData]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(leadData.email)) {
      throw new Error('Invalid email format')
    }

    // Prepare data for database insertion
    const insertData = {
      first_name: leadData.firstName.trim(),
      last_name: leadData.lastName.trim(),
      email: leadData.email.trim().toLowerCase(),
      phone: leadData.phone.trim(),
      source_type: leadData.sourceType,
      source_details: leadData.sourceDetails || {},
      service_type: leadData.serviceType,
      message: leadData.message?.trim() || '',
      estimated_value: leadData.estimatedValue,
      status: 'prospect' as const,
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('client_leads')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!data) {
      throw new Error('No data returned from database')
    }

    // Transform database response to match our interface
    const lead = transformDatabaseLead(data)

    return {
      success: true,
      data: lead,
      message: 'Lead created successfully',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to create lead',
    }
  }
}

/**
 * Get leads with optional filtering and pagination
 * @param filters - Optional filters
 * @param page - Page number (1-based)
 * @param pageSize - Number of items per page
 * @returns Promise with leads and pagination info
 */
export async function getLeads(
  filters?: LeadFilters,
  page: number = 1,
  pageSize: number = 25
): Promise<ApiResponse<{ leads: Lead[], pagination: { page: number, pageSize: number, total: number } }>> {
  try {
    let query = supabase
      .from('client_leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }
      
      if (filters.sourceType && filters.sourceType.length > 0) {
        query = query.in('source_type', filters.sourceType)
      }
      
      if (filters.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo)
      }
      
      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end)
      }
      
      if (filters.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`
        query = query.or(
          `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
        )
      }
    }

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Transform database response
    const leads: Lead[] = (data || []).map(transformDatabaseLead)

    return {
      success: true,
      data: {
        leads,
        pagination: {
          page,
          pageSize,
          total: count || 0
        }
      },
      message: 'Leads retrieved successfully',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to fetch leads',
    }
  }
}

/**
 * Update lead status and information
 * @param id - Lead ID
 * @param updates - Fields to update
 * @returns Promise with updated lead
 */
export async function updateLead(
  id: string,
  updates: Partial<Omit<Lead, 'id' | 'created_at' | 'updated_at'>>
): Promise<ApiResponse<Lead>> {
  try {
    // Transform updates for database
    const dbUpdates: Record<string, any> = {}
    
    if (updates.firstName) dbUpdates.first_name = updates.firstName.trim()
    if (updates.lastName) dbUpdates.last_name = updates.lastName.trim()
    if (updates.email) dbUpdates.email = updates.email.trim().toLowerCase()
    if (updates.phone) dbUpdates.phone = updates.phone.trim()
    if (updates.sourceType) dbUpdates.source_type = updates.sourceType
    if (updates.sourceDetails) dbUpdates.source_details = updates.sourceDetails
    if (updates.serviceType) dbUpdates.service_type = updates.serviceType
    if (updates.message !== undefined) dbUpdates.message = updates.message
    if (updates.estimatedValue !== undefined) dbUpdates.estimated_value = updates.estimatedValue
    if (updates.status) dbUpdates.status = updates.status
    if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo
    if (updates.assignedAt !== undefined) dbUpdates.assigned_at = updates.assignedAt
    if (updates.qualificationScore !== undefined) dbUpdates.qualification_score = updates.qualificationScore
    if (updates.qualificationNotes !== undefined) dbUpdates.qualification_notes = updates.qualificationNotes
    if (updates.lastContactDate !== undefined) dbUpdates.last_contact_date = updates.lastContactDate
    if (updates.nextFollowUpDate !== undefined) dbUpdates.next_follow_up_date = updates.nextFollowUpDate
    if (updates.contactCount !== undefined) dbUpdates.contact_count = updates.contactCount
    if (updates.convertedToContract !== undefined) dbUpdates.converted_to_contract = updates.convertedToContract
    if (updates.contractSignedDate !== undefined) dbUpdates.contract_signed_date = updates.contractSignedDate

    dbUpdates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('client_leads')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!data) {
      throw new Error('Lead not found')
    }

    const lead = transformDatabaseLead(data)

    return {
      success: true,
      data: lead,
      message: 'Lead updated successfully',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to update lead',
    }
  }
}

/**
 * Get lead statistics
 * @param filters - Optional filters to apply to stats
 * @returns Promise with lead statistics
 */
export async function getLeadStats(
  filters?: LeadFilters
): Promise<ApiResponse<LeadStats>> {
  try {
    let query = supabase.from('client_leads').select('status, source_type, estimated_value, qualification_score')

    // Apply filters
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }
      if (filters.sourceType && filters.sourceType.length > 0) {
        query = query.in('source_type', filters.sourceType)
      }
      if (filters.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo)
      }
      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end)
      }
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const leads = data || []
    const totalLeads = leads.length

    // Calculate statistics
    const byStatus = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const bySource = leads.reduce((acc, lead) => {
      acc[lead.source_type] = (acc[lead.source_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const wonLeads = byStatus['won'] || 0
    const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0

    const validValues = leads.filter(lead => lead.estimated_value != null).map(lead => lead.estimated_value)
    const averageValue = validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 0

    const validScores = leads.filter(lead => lead.qualification_score != null).map(lead => lead.qualification_score)
    const averageScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0

    const stats: LeadStats = {
      totalLeads,
      byStatus,
      bySource,
      conversionRate,
      averageValue,
      averageScore
    }

    return {
      success: true,
      data: stats,
      message: 'Lead statistics calculated successfully',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to calculate lead statistics',
    }
  }
}

/**
 * Transform database lead record to application interface
 * @param dbLead - Database lead record
 * @returns Lead interface
 */
function transformDatabaseLead(dbLead: any): Lead {
  return {
    id: dbLead.id,
    firstName: dbLead.first_name,
    lastName: dbLead.last_name,
    email: dbLead.email,
    phone: dbLead.phone,
    sourceType: dbLead.source_type,
    sourceDetails: dbLead.source_details || {},
    serviceType: dbLead.service_type,
    message: dbLead.message,
    estimatedValue: dbLead.estimated_value,
    status: dbLead.status,
    assignedTo: dbLead.assigned_to,
    assignedAt: dbLead.assigned_at,
    qualificationScore: dbLead.qualification_score || 0,
    qualificationNotes: dbLead.qualification_notes,
    lastContactDate: dbLead.last_contact_date,
    nextFollowUpDate: dbLead.next_follow_up_date,
    contactCount: dbLead.contact_count || 0,
    convertedToContract: dbLead.converted_to_contract || false,
    contractSignedDate: dbLead.contract_signed_date,
    created_at: dbLead.created_at,
    updated_at: dbLead.updated_at,
  }
}

/**
 * Get a lead by ID
 * @param leadId - The lead ID to retrieve
 * @returns Promise with lead data
 */
export async function getLeadById(leadId: string): Promise<ApiResponse<Lead>> {
  try {
    const { data: dbLead, error } = await supabase
      .from('client_leads')
      .select(`
        *,
        users!assigned_to(first_name, last_name, email)
      `)
      .eq('id', leadId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Lead not found',
          message: 'The requested lead does not exist'
        }
      }
      throw new Error(`Database error: ${error.message}`)
    }

    return {
      success: true,
      data: transformDatabaseLead(dbLead),
      message: 'Lead retrieved successfully'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to retrieve lead'
    }
  }
}

/**
 * Delete a lead
 * @param leadId - The lead ID to delete
 * @returns Promise with deletion result
 */
export async function deleteLead(leadId: string): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('client_leads')
      .delete()
      .eq('id', leadId)

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Lead not found',
          message: 'The lead to delete does not exist'
        }
      }
      throw new Error(`Database error: ${error.message}`)
    }

    return {
      success: true,
      message: 'Lead deleted successfully'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to delete lead'
    }
  }
}