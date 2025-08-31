import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import type { 
  GuardLead, 
  GuardLeadCaptureRequest,
  GuardLeadCaptureResponse,
  LeadListRequest,
  LeadListResponse,
  LeadStatus 
} from '@/lib/types/guard-leads'

export interface ServiceResult<T> {
  success: boolean
  data: T
  error?: string
  message: string
}

/**
 * Submit a guard lead capture request to Supabase
 * @param leadData - The lead data from the capture form
 * @returns Promise with success/error response
 */
export async function submitGuardLead(
  leadData: GuardLeadCaptureRequest
): Promise<ServiceResult<{ id: string; application_link?: string; estimated_contact_time: string }>> {
  try {
    // Validate required fields
    const requiredFields = ['first_name', 'last_name', 'email', 'lead_source']
    for (const field of requiredFields) {
      if (!leadData[field as keyof GuardLeadCaptureRequest]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(leadData.email)) {
      throw new Error('Invalid email format')
    }

    // Generate application link token
    const applicationToken = uuidv4()
    const applicationExpiry = new Date()
    applicationExpiry.setDate(applicationExpiry.getDate() + 7) // 7 days from now

    // Prepare data for database insertion
    const requestData = {
      first_name: leadData.first_name.trim(),
      last_name: leadData.last_name.trim(),
      email: leadData.email.trim().toLowerCase(),
      phone: leadData.phone?.trim() || null,
      lead_source: leadData.lead_source,
      source_details: leadData.source_details ? JSON.stringify(leadData.source_details) : null,
      status: 'new' as const,
      application_link_token: applicationToken,
      application_link_expires_at: applicationExpiry.toISOString(),
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('guard_leads')
      .insert([requestData])
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!data) {
      throw new Error('No data returned from database')
    }

    return {
      success: true,
      data: {
        id: data.id,
        application_link: `/applications/${applicationToken}`,
        estimated_contact_time: 'within 24 hours'
      },
      message: 'Guard lead submitted successfully',
    }
  } catch (error) {
    return {
      success: false,
      data: { 
        id: '', 
        estimated_contact_time: '' 
      },
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to submit guard lead',
    }
  }
}

/**
 * Get all guard leads (for manager/admin dashboard)
 * @param filters - Optional filtering parameters
 * @returns Promise with guard leads list
 */
export async function getGuardLeads(
  filters: LeadListRequest = {}
): Promise<ServiceResult<{ leads: GuardLead[]; pagination: { total: number; page: number; pages: number } }>> {
  try {
    const {
      page = 1,
      limit = 25,
      source_filter,
      status_filter,
      date_from,
      date_to
    } = filters

    const offset = (page - 1) * limit

    let query = supabase
      .from('guard_leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (source_filter && source_filter.length > 0) {
      query = query.in('lead_source', source_filter)
    }

    if (status_filter && status_filter.length > 0) {
      query = query.in('status', status_filter)
    }

    if (date_from) {
      query = query.gte('created_at', date_from)
    }

    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Transform database response
    const leads: GuardLead[] = (data || []).map(item => ({
      id: item.id,
      first_name: item.first_name,
      last_name: item.last_name,
      email: item.email,
      phone: item.phone,
      lead_source: item.lead_source,
      source_details: item.source_details,
      status: item.status,
      notes: item.notes,
      assigned_manager_id: item.assigned_manager_id,
      application_link_token: item.application_link_token,
      application_link_expires_at: item.application_link_expires_at,
      last_reminder_sent_at: item.last_reminder_sent_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }))

    const total = count || 0
    const pages = Math.ceil(total / limit)

    return {
      success: true,
      data: {
        leads,
        pagination: {
          total,
          page,
          pages
        }
      },
      message: 'Guard leads retrieved successfully',
    }
  } catch (error) {
    return {
      success: false,
      data: { 
        leads: [], 
        pagination: { total: 0, page: 1, pages: 0 } 
      },
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to fetch guard leads',
    }
  }
}

/**
 * Update guard lead status
 * @param id - Lead ID
 * @param status - New status
 * @param notes - Optional notes
 * @returns Promise with updated lead
 */
export async function updateGuardLeadStatus(
  id: string,
  status: LeadStatus,
  notes?: string
): Promise<ServiceResult<GuardLead>> {
  try {
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    }
    
    if (notes !== undefined) {
      updateData.notes = notes
    }

    const { data, error } = await supabase
      .from('guard_leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!data) {
      throw new Error('Lead not found')
    }

    // Transform database response
    const lead: GuardLead = {
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      lead_source: data.lead_source,
      source_details: data.source_details,
      status: data.status,
      notes: data.notes,
      assigned_manager_id: data.assigned_manager_id,
      application_link_token: data.application_link_token,
      application_link_expires_at: data.application_link_expires_at,
      last_reminder_sent_at: data.last_reminder_sent_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return {
      success: true,
      data: lead,
      message: 'Lead status updated successfully',
    }
  } catch (error) {
    return {
      success: false,
      data: {} as GuardLead,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to update lead status',
    }
  }
}

/**
 * Assign lead to manager
 * @param leadId - Lead ID
 * @param managerId - Manager user ID
 * @returns Promise with updated lead
 */
export async function assignLeadToManager(
  leadId: string,
  managerId: string
): Promise<ServiceResult<GuardLead>> {
  try {
    const { data, error } = await supabase
      .from('guard_leads')
      .update({ 
        assigned_manager_id: managerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!data) {
      throw new Error('Lead not found')
    }

    // Transform database response
    const lead: GuardLead = {
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      lead_source: data.lead_source,
      source_details: data.source_details,
      status: data.status,
      notes: data.notes,
      assigned_manager_id: data.assigned_manager_id,
      application_link_token: data.application_link_token,
      application_link_expires_at: data.application_link_expires_at,
      last_reminder_sent_at: data.last_reminder_sent_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return {
      success: true,
      data: lead,
      message: 'Lead assigned to manager successfully',
    }
  } catch (error) {
    return {
      success: false,
      data: {} as GuardLead,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to assign lead to manager',
    }
  }
}