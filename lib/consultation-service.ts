import { supabase } from '@/lib/supabase'
import { ConsultationFormData, ConsultationRequest, ApiResponse } from '@/lib/types'

/**
 * Submit a consultation request to Supabase
 * @param formData - The form data from the contact form
 * @returns Promise with success/error response
 */
export async function submitConsultationRequest(
  formData: ConsultationFormData
): Promise<ApiResponse<ConsultationRequest>> {
  try {
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'serviceType']
    for (const field of requiredFields) {
      if (!formData[field as keyof ConsultationFormData]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      throw new Error('Invalid email format')
    }

    // Prepare data for database insertion
    const requestData = {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      service_type: formData.serviceType,
      message: formData.message?.trim() || '',
      status: 'new' as const,
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('consultation_requests')
      .insert([requestData])
      .select()
      .single()

    if (error) {
      console.error('Supabase insertion error:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    if (!data) {
      throw new Error('No data returned from database')
    }

    // Transform database response to match our interface
    const consultationRequest: ConsultationRequest = {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      phone: data.phone,
      serviceType: data.service_type,
      message: data.message,
      created_at: data.created_at,
      status: data.status,
      updated_at: data.updated_at,
    }

    return {
      success: true,
      data: consultationRequest,
      message: 'Consultation request submitted successfully',
    }
  } catch (error) {
    console.error('Error submitting consultation request:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to submit consultation request',
    }
  }
}

/**
 * Get all consultation requests (for future admin dashboard)
 * @param status - Optional status filter
 * @returns Promise with consultation requests
 */
export async function getConsultationRequests(
  status?: string
): Promise<ApiResponse<ConsultationRequest[]>> {
  try {
    let query = supabase
      .from('consultation_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Transform database response
    const consultationRequests: ConsultationRequest[] = (data || []).map(item => ({
      id: item.id,
      firstName: item.first_name,
      lastName: item.last_name,
      email: item.email,
      phone: item.phone,
      serviceType: item.service_type,
      message: item.message,
      created_at: item.created_at,
      status: item.status,
      updated_at: item.updated_at,
    }))

    return {
      success: true,
      data: consultationRequests,
      message: 'Consultation requests retrieved successfully',
    }
  } catch (error) {
    console.error('Error fetching consultation requests:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to fetch consultation requests',
    }
  }
}

/**
 * Update consultation request status (for future admin functionality)
 * @param id - Request ID
 * @param status - New status
 * @returns Promise with updated request
 */
export async function updateConsultationRequestStatus(
  id: string,
  status: ConsultationRequest['status']
): Promise<ApiResponse<ConsultationRequest>> {
  try {
    const { data, error } = await supabase
      .from('consultation_requests')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!data) {
      throw new Error('Request not found')
    }

    // Transform database response
    const consultationRequest: ConsultationRequest = {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      phone: data.phone,
      serviceType: data.service_type,
      message: data.message,
      created_at: data.created_at,
      status: data.status,
      updated_at: data.updated_at,
    }

    return {
      success: true,
      data: consultationRequest,
      message: 'Request status updated successfully',
    }
  } catch (error) {
    console.error('Error updating consultation request:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to update request status',
    }
  }
}