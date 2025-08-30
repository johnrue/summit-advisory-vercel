import { supabase } from '@/lib/supabase'
import type { ApiResponse, Contract, ContractFormData, ContractFilters, ContractStats } from '@/lib/types'

/**
 * Transform database contract record to application interface
 */
function transformDatabaseContract(dbContract: any): Contract {
  return {
    id: dbContract.id,
    leadId: dbContract.lead_id,
    clientName: dbContract.client_name,
    clientEmail: dbContract.client_contact_email,
    clientPhone: dbContract.client_contact_phone || '',
    companyName: dbContract.client_company,
    serviceType: dbContract.contract_type,
    status: dbContract.status,
    priority: 'medium', // Default since not in current schema
    estimatedValue: parseFloat(dbContract.contract_value),
    actualValue: parseFloat(dbContract.contract_value),
    monthlyRecurringRevenue: dbContract.monthly_value ? parseFloat(dbContract.monthly_value) : undefined,
    billingCycle: dbContract.billing_frequency || 'monthly',
    
    // Contract dates
    proposalDate: dbContract.proposal_date,
    startDate: dbContract.start_date,
    endDate: dbContract.end_date,
    renewalDate: dbContract.renewal_date,
    signedDate: dbContract.signed_date || undefined,
    
    // Assignment and ownership
    assignedManager: dbContract.assigned_manager,
    assignedAt: dbContract.stage_changed_at || dbContract.created_at,
    
    // Contract terms (using existing schema structure)
    contractTerms: {
      duration: 12, // Default 12 months
      cancellationNotice: 30,
      terminationClause: 'Standard termination clause',
      performanceStandards: [],
      serviceLevel: 'standard',
      customClauses: []
    },
    paymentTerms: {
      paymentMethod: 'check',
      paymentSchedule: dbContract.payment_terms || 'net_30',
      invoiceFrequency: dbContract.billing_frequency || 'monthly',
      lateFeePercentage: 1.5
    },
    serviceDetails: {
      sites: [], // Will be populated separately
      serviceHours: {
        schedule: [],
        holidays: [],
        specialEvents: []
      },
      guardRequirements: {
        minimumExperience: 1,
        requiredCertifications: ['TOPS License'],
        uniformRequirements: [],
        weaponRequirement: 'armed',
        backgroundCheckLevel: 'enhanced',
        languageRequirements: [],
        physicalRequirements: []
      },
      equipmentProvided: [],
      additionalServices: [],
      performanceMetrics: []
    },
    
    // Document management
    proposalDocumentUrl: undefined,
    contractDocumentUrl: undefined,
    signedDocumentUrl: undefined,
    documentVersion: 1,
    requiresSignature: true,
    
    // Renewal and expansion
    autoRenew: false,
    renewalNoticeRequired: 30,
    expansionOpportunities: [],
    
    // Analytics and tracking
    createdFrom: dbContract.lead_id ? 'lead' : 'direct',
    sourceDetails: {},
    tags: [],
    notes: dbContract.service_description || '',
    
    // Audit trail
    created_at: dbContract.created_at,
    updated_at: dbContract.updated_at,
    createdBy: dbContract.assigned_manager, // Using assigned manager as creator
    updatedBy: dbContract.stage_changed_by || dbContract.assigned_manager
  }
}

/**
 * Create a new contract
 */
export async function createContract(
  contractData: ContractFormData
): Promise<ApiResponse<Contract>> {
  try {
    // Validate required fields
    const requiredFields = ['clientName', 'clientEmail', 'serviceType', 'estimatedValue', 'startDate', 'endDate']
    for (const field of requiredFields) {
      if (!contractData[field as keyof ContractFormData]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(contractData.clientEmail)) {
      throw new Error('Invalid email format')
    }

    // Validate date range
    if (new Date(contractData.startDate) >= new Date(contractData.endDate)) {
      throw new Error('Start date must be before end date')
    }

    // Get current user for assignment
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Prepare data for database insertion (matching existing schema)
    const insertData = {
      client_name: contractData.clientName.trim(),
      client_company: contractData.companyName?.trim() || contractData.clientName.trim(),
      client_contact_email: contractData.clientEmail.trim().toLowerCase(),
      client_contact_phone: contractData.clientPhone?.trim() || '',
      contract_title: `${contractData.serviceType} Security Services`,
      contract_type: contractData.serviceType,
      service_description: contractData.notes || '',
      contract_value: contractData.estimatedValue,
      monthly_value: contractData.estimatedValue / 12, // Simple monthly calculation
      payment_terms: 'net_30',
      billing_frequency: 'monthly',
      start_date: contractData.startDate,
      end_date: contractData.endDate,
      renewal_date: new Date(new Date(contractData.endDate).getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // 30 days after end
      status: 'prospect',
      assigned_manager: user.id,
      stage_changed_at: new Date().toISOString(),
      stage_changed_by: user.id
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('contracts')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!data) {
      throw new Error('No data returned from database')
    }

    // Transform and return contract
    const contract = transformDatabaseContract(data)

    return {
      success: true,
      data: contract,
      message: 'Contract created successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to create contract'
    }
  }
}

/**
 * Get contracts with optional filtering and pagination
 */
export async function getContracts(
  filters?: ContractFilters,
  page: number = 1,
  pageSize: number = 25
): Promise<ApiResponse<{ contracts: Contract[], pagination: { page: number, pageSize: number, total: number } }>> {
  try {
    let query = supabase
      .from('contracts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }
      
      if (filters.assignedManager) {
        query = query.eq('assigned_manager', filters.assignedManager)
      }
      
      if (filters.serviceType && filters.serviceType.length > 0) {
        query = query.in('contract_type', filters.serviceType)
      }
      
      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end)
      }
      
      if (filters.valueRange) {
        if (filters.valueRange.min) {
          query = query.gte('contract_value', filters.valueRange.min)
        }
        if (filters.valueRange.max) {
          query = query.lte('contract_value', filters.valueRange.max)
        }
      }
      
      if (filters.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`
        query = query.or(
          `client_name.ilike.${searchTerm},client_company.ilike.${searchTerm},client_contact_email.ilike.${searchTerm},contract_title.ilike.${searchTerm}`
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
    const contracts: Contract[] = (data || []).map(transformDatabaseContract)

    return {
      success: true,
      data: {
        contracts,
        pagination: {
          page,
          pageSize,
          total: count || 0
        }
      },
      message: 'Contracts retrieved successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to fetch contracts'
    }
  }
}

/**
 * Update contract status and information
 */
export async function updateContract(
  id: string,
  updates: Partial<Contract>
): Promise<ApiResponse<Contract>> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Transform updates for database (matching existing schema)
    const dbUpdates: Record<string, any> = {}
    
    if (updates.clientName) dbUpdates.client_name = updates.clientName.trim()
    if (updates.companyName) dbUpdates.client_company = updates.companyName.trim()
    if (updates.clientEmail) dbUpdates.client_contact_email = updates.clientEmail.trim().toLowerCase()
    if (updates.clientPhone) dbUpdates.client_contact_phone = updates.clientPhone.trim()
    if (updates.serviceType) dbUpdates.contract_type = updates.serviceType
    if (updates.estimatedValue !== undefined) dbUpdates.contract_value = updates.estimatedValue
    if (updates.monthlyRecurringRevenue !== undefined) dbUpdates.monthly_value = updates.monthlyRecurringRevenue
    if (updates.proposalDate !== undefined) dbUpdates.proposal_date = updates.proposalDate
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate
    if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate
    if (updates.renewalDate !== undefined) dbUpdates.renewal_date = updates.renewalDate
    if (updates.notes !== undefined) dbUpdates.service_description = updates.notes
    
    if (updates.status) {
      dbUpdates.status = updates.status
      dbUpdates.stage_changed_at = new Date().toISOString()
      dbUpdates.stage_changed_by = user.id
    }

    dbUpdates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('contracts')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!data) {
      throw new Error('Contract not found')
    }

    const contract = transformDatabaseContract(data)

    return {
      success: true,
      data: contract,
      message: 'Contract updated successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to update contract'
    }
  }
}

/**
 * Get a contract by ID
 */
export async function getContractById(contractId: string): Promise<ApiResponse<Contract>> {
  try {
    const { data: dbContract, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Contract not found',
          message: 'The requested contract does not exist'
        }
      }
      throw new Error(`Database error: ${error.message}`)
    }

    return {
      success: true,
      data: transformDatabaseContract(dbContract),
      message: 'Contract retrieved successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to retrieve contract'
    }
  }
}

/**
 * Delete a contract
 */
export async function deleteContract(contractId: string): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contractId)

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Contract not found',
          message: 'The contract to delete does not exist'
        }
      }
      throw new Error(`Database error: ${error.message}`)
    }

    return {
      success: true,
      message: 'Contract deleted successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to delete contract'
    }
  }
}

/**
 * Update contract status (for Kanban drag and drop)
 */
export async function updateContractStatus(
  contractId: string,
  newStatus: string
): Promise<ApiResponse<Contract>> {
  try {
    // Validate status
    const validStatuses = ['prospect', 'proposal', 'negotiation', 'signed', 'active', 'renewal', 'closed', 'lost']
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`)
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const updates = {
      status: newStatus,
      stage_changed_at: new Date().toISOString(),
      stage_changed_by: user.id,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('contracts')
      .update(updates)
      .eq('id', contractId)
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!data) {
      throw new Error('Contract not found')
    }

    const contract = transformDatabaseContract(data)

    return {
      success: true,
      data: contract,
      message: 'Contract status updated successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to update contract status'
    }
  }
}

/**
 * Get contract statistics
 */
export async function getContractStats(
  filters?: ContractFilters
): Promise<ApiResponse<ContractStats>> {
  try {
    let query = supabase.from('contracts').select('status, contract_type, contract_value, monthly_value')

    // Apply filters
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }
      if (filters.assignedManager) {
        query = query.eq('assigned_manager', filters.assignedManager)
      }
      if (filters.serviceType && filters.serviceType.length > 0) {
        query = query.in('contract_type', filters.serviceType)
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

    const contracts = data || []
    const totalContracts = contracts.length

    // Calculate statistics
    const byStatus = contracts.reduce((acc, contract) => {
      acc[contract.status] = (acc[contract.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const byServiceType = contracts.reduce((acc, contract) => {
      acc[contract.contract_type] = (acc[contract.contract_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const totalValue = contracts.reduce((sum, contract) => sum + parseFloat(contract.contract_value || 0), 0)
    const monthlyRecurringRevenue = contracts
      .filter(c => ['signed', 'active'].includes(c.status))
      .reduce((sum, contract) => sum + parseFloat(contract.monthly_value || 0), 0)

    const averageContractValue = totalContracts > 0 ? totalValue / totalContracts : 0
    
    const signedContracts = byStatus['signed'] || 0
    const activeContracts = byStatus['active'] || 0
    const lostContracts = byStatus['lost'] || 0
    const totalProcessed = signedContracts + activeContracts + lostContracts
    const winRate = totalProcessed > 0 ? ((signedContracts + activeContracts) / totalProcessed) * 100 : 0

    const stats: ContractStats = {
      totalContracts,
      byStatus,
      byServiceType,
      totalValue,
      monthlyRecurringRevenue,
      averageContractValue,
      winRate,
      averageSalesCycle: 45, // Default placeholder - would need more complex calculation
      renewalRate: 85, // Default placeholder - would need renewal data
      expansionRevenue: 0 // Default placeholder - would need expansion tracking
    }

    return {
      success: true,
      data: stats,
      message: 'Contract statistics calculated successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to calculate contract statistics'
    }
  }
}

/**
 * Create contract from lead (conversion)
 */
export async function createContractFromLead(leadId: string): Promise<ApiResponse<Contract>> {
  try {
    // Get the lead data
    const { data: lead, error: leadError } = await supabase
      .from('client_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      throw new Error('Lead not found')
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Create contract from lead data
    const contractData: ContractFormData = {
      clientName: `${lead.first_name} ${lead.last_name}`,
      clientEmail: lead.email,
      clientPhone: lead.phone,
      companyName: lead.company || undefined,
      serviceType: lead.service_type,
      estimatedValue: lead.estimated_value || 10000,
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
      serviceDetails: {},
      contractTerms: {},
      paymentTerms: {},
      notes: lead.message || ''
    }

    const result = await createContract(contractData)
    
    if (result.success && result.data) {
      // Update the lead to mark it as converted
      await supabase
        .from('client_leads')
        .update({ 
          converted_to_contract: true,
          status: 'won',
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)

      // Link the contract to the lead
      await supabase
        .from('contracts')
        .update({ lead_id: leadId })
        .eq('id', result.data.id)
    }

    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to create contract from lead'
    }
  }
}