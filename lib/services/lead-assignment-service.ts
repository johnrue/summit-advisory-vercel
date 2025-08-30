import { supabase } from '@/lib/supabase'
import type { ApiResponse } from '@/lib/types'
import type { Lead } from './lead-management-service'
import { EmailService } from '@/lib/utils/email-service'

export interface LeadAssignmentRule {
  id: string
  name: string
  priority: number
  isActive: boolean
  conditions: {
    serviceTypes?: string[]
    sources?: string[]
    geography?: string[]
    valueRange?: {
      min?: number
      max?: number
    }
    timeWindow?: {
      startHour: number
      endHour: number
      daysOfWeek: number[]
    }
  }
  assignmentMethod: 'round_robin' | 'lowest_workload' | 'random' | 'manual'
  eligibleManagers: string[]
  createdAt: string
  updatedAt: string
}

export interface ManagerWorkload {
  managerId: string
  firstName: string
  lastName: string
  email: string
  activeLeads: number
  contactedToday: number
  responseTime: number // in minutes
  availabilityScore: number // 0-100
  lastAssigned?: string
}

export interface AssignmentResult {
  assignedTo: string
  managerName: string
  managerEmail: string
  assignmentReason: string
  ruleUsed?: string
  assignmentMethod: string
}

/**
 * Get manager workload information
 * @returns Promise with manager workload data
 */
export async function getManagerWorkloads(): Promise<ApiResponse<ManagerWorkload[]>> {
  try {
    // Get all managers with their roles
    const { data: managers, error: managersError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        users!inner(
          first_name,
          last_name,
          email
        ),
        roles!inner(name)
      `)
      .eq('roles.name', 'manager')
      .eq('status', 'active')

    if (managersError) {
      throw new Error(`Failed to fetch managers: ${managersError.message}`)
    }

    const workloads: ManagerWorkload[] = []

    for (const manager of managers || []) {
      const managerId = manager.user_id
      
      // Count active leads assigned to this manager
      const { count: activeLeads, error: activeLeadsError } = await supabase
        .from('client_leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', managerId)
        .in('status', ['prospect', 'contacted', 'qualified', 'proposal', 'negotiation'])

      if (activeLeadsError) {
        console.error(`Error fetching active leads for manager ${managerId}:`, activeLeadsError)
        continue
      }

      // Count leads contacted today
      const today = new Date().toISOString().split('T')[0]
      const { count: contactedToday, error: contactedError } = await supabase
        .from('client_leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', managerId)
        .gte('last_contact_date', `${today}T00:00:00Z`)
        .lte('last_contact_date', `${today}T23:59:59Z`)

      if (contactedError) {
        console.error(`Error fetching today's contacts for manager ${managerId}:`, contactedError)
      }

      // Calculate response time (simplified - average time between assignment and contact)
      const { data: responseData, error: responseError } = await supabase
        .from('client_leads')
        .select('assigned_at, last_contact_date')
        .eq('assigned_to', managerId)
        .not('last_contact_date', 'is', null)
        .not('assigned_at', 'is', null)
        .limit(10) // Last 10 for average calculation

      let responseTime = 0
      if (!responseError && responseData && responseData.length > 0) {
        const times = responseData.map(lead => {
          const assigned = new Date(lead.assigned_at!)
          const contacted = new Date(lead.last_contact_date!)
          return Math.max(0, (contacted.getTime() - assigned.getTime()) / (1000 * 60)) // minutes
        })
        responseTime = times.reduce((a, b) => a + b, 0) / times.length
      }

      // Get last assignment time
      const { data: lastAssignmentData } = await supabase
        .from('client_leads')
        .select('assigned_at')
        .eq('assigned_to', managerId)
        .order('assigned_at', { ascending: false })
        .limit(1)

      const lastAssigned = lastAssignmentData?.[0]?.assigned_at

      // Calculate availability score (simplified scoring based on workload and response time)
      const baseScore = 100
      const workloadPenalty = Math.min((activeLeads || 0) * 5, 50) // 5 points per active lead, max 50
      const responseTimePenalty = Math.min(responseTime / 10, 30) // 1 point per 10 min response time, max 30
      const availabilityScore = Math.max(0, baseScore - workloadPenalty - responseTimePenalty)

      workloads.push({
        managerId,
        firstName: manager.users.first_name,
        lastName: manager.users.last_name,
        email: manager.users.email,
        activeLeads: activeLeads || 0,
        contactedToday: contactedToday || 0,
        responseTime: Math.round(responseTime),
        availabilityScore: Math.round(availabilityScore),
        lastAssigned
      })
    }

    // Sort by availability score (highest first)
    workloads.sort((a, b) => b.availabilityScore - a.availabilityScore)

    return {
      success: true,
      data: workloads,
      message: 'Manager workloads calculated successfully'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to calculate manager workloads'
    }
  }
}

/**
 * Find matching assignment rules for a lead
 * @param lead - Lead data to find rules for
 * @returns Promise with matching rules
 */
export async function findMatchingRules(lead: Lead): Promise<ApiResponse<LeadAssignmentRule[]>> {
  try {
    // For now, we'll implement a simple rule system
    // In a real implementation, you'd store rules in the database
    
    const defaultRules: LeadAssignmentRule[] = [
      {
        id: 'high-value-round-robin',
        name: 'High Value Leads - Round Robin',
        priority: 1,
        isActive: true,
        conditions: {
          valueRange: { min: 10000 }
        },
        assignmentMethod: 'round_robin',
        eligibleManagers: [], // Will be populated with all managers
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'executive-protection-specialist',
        name: 'Executive Protection Specialist',
        priority: 2,
        isActive: true,
        conditions: {
          serviceTypes: ['executive']
        },
        assignmentMethod: 'lowest_workload',
        eligibleManagers: [], // Would be populated with specialist managers
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'referral-priority',
        name: 'Referral Priority Assignment',
        priority: 3,
        isActive: true,
        conditions: {
          sources: ['referral']
        },
        assignmentMethod: 'lowest_workload',
        eligibleManagers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'default-round-robin',
        name: 'Default Round Robin',
        priority: 99,
        isActive: true,
        conditions: {},
        assignmentMethod: 'round_robin',
        eligibleManagers: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    // Filter rules that match the lead
    const matchingRules = defaultRules.filter(rule => {
      if (!rule.isActive) return false

      const { conditions } = rule

      // Check service type match
      if (conditions.serviceTypes && conditions.serviceTypes.length > 0) {
        if (!conditions.serviceTypes.includes(lead.serviceType)) return false
      }

      // Check source match
      if (conditions.sources && conditions.sources.length > 0) {
        if (!conditions.sources.includes(lead.sourceType)) return false
      }

      // Check value range
      if (conditions.valueRange) {
        const value = lead.estimatedValue || 0
        if (conditions.valueRange.min && value < conditions.valueRange.min) return false
        if (conditions.valueRange.max && value > conditions.valueRange.max) return false
      }

      return true
    })

    // Sort by priority
    matchingRules.sort((a, b) => a.priority - b.priority)

    return {
      success: true,
      data: matchingRules,
      message: 'Matching rules found successfully'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to find matching rules'
    }
  }
}

/**
 * Assign manager using round-robin method
 * @param eligibleManagers - List of eligible managers
 * @returns Selected manager ID
 */
async function assignRoundRobin(eligibleManagers: ManagerWorkload[]): Promise<string> {
  if (eligibleManagers.length === 0) {
    throw new Error('No eligible managers for round robin assignment')
  }

  // Sort by last assignment time (oldest first)
  const sortedManagers = [...eligibleManagers].sort((a, b) => {
    if (!a.lastAssigned && !b.lastAssigned) return 0
    if (!a.lastAssigned) return -1 // Never assigned goes first
    if (!b.lastAssigned) return 1
    return new Date(a.lastAssigned).getTime() - new Date(b.lastAssigned).getTime()
  })

  return sortedManagers[0].managerId
}

/**
 * Assign manager using lowest workload method
 * @param eligibleManagers - List of eligible managers
 * @returns Selected manager ID
 */
async function assignLowestWorkload(eligibleManagers: ManagerWorkload[]): Promise<string> {
  if (eligibleManagers.length === 0) {
    throw new Error('No eligible managers for lowest workload assignment')
  }

  // Sort by availability score (highest first, which means lowest workload)
  const sortedManagers = [...eligibleManagers].sort((a, b) => b.availabilityScore - a.availabilityScore)
  
  return sortedManagers[0].managerId
}

/**
 * Assign manager using random method
 * @param eligibleManagers - List of eligible managers
 * @returns Selected manager ID
 */
async function assignRandom(eligibleManagers: ManagerWorkload[]): Promise<string> {
  if (eligibleManagers.length === 0) {
    throw new Error('No eligible managers for random assignment')
  }

  const randomIndex = Math.floor(Math.random() * eligibleManagers.length)
  return eligibleManagers[randomIndex].managerId
}

/**
 * Automatically assign a lead to a manager
 * @param leadId - ID of the lead to assign
 * @returns Promise with assignment result
 */
export async function autoAssignLead(leadId: string): Promise<ApiResponse<AssignmentResult>> {
  try {
    // Get lead data
    const { data: leadData, error: leadError } = await supabase
      .from('client_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !leadData) {
      throw new Error(`Lead not found: ${leadError?.message || 'Unknown error'}`)
    }

    if (leadData.assigned_to) {
      throw new Error('Lead is already assigned')
    }

    const lead: Lead = {
      id: leadData.id,
      firstName: leadData.first_name,
      lastName: leadData.last_name,
      email: leadData.email,
      phone: leadData.phone,
      sourceType: leadData.source_type,
      sourceDetails: leadData.source_details || {},
      serviceType: leadData.service_type,
      message: leadData.message,
      estimatedValue: leadData.estimated_value,
      status: leadData.status,
      assignedTo: leadData.assigned_to,
      assignedAt: leadData.assigned_at,
      qualificationScore: leadData.qualification_score || 0,
      qualificationNotes: leadData.qualification_notes,
      lastContactDate: leadData.last_contact_date,
      nextFollowUpDate: leadData.next_follow_up_date,
      contactCount: leadData.contact_count || 0,
      convertedToContract: leadData.converted_to_contract || false,
      contractSignedDate: leadData.contract_signed_date,
      created_at: leadData.created_at,
      updated_at: leadData.updated_at,
    }

    // Get manager workloads
    const workloadsResult = await getManagerWorkloads()
    if (!workloadsResult.success || !workloadsResult.data) {
      throw new Error('Failed to get manager workloads')
    }

    const allManagers = workloadsResult.data

    // Find matching assignment rules
    const rulesResult = await findMatchingRules(lead)
    if (!rulesResult.success || !rulesResult.data) {
      throw new Error('Failed to find matching rules')
    }

    const matchingRules = rulesResult.data
    let selectedManagerId: string
    let assignmentReason: string
    let ruleUsed: string | undefined
    let assignmentMethod: string

    // Apply the first matching rule
    if (matchingRules.length > 0) {
      const rule = matchingRules[0]
      ruleUsed = rule.name
      assignmentMethod = rule.assignmentMethod

      // Filter eligible managers (if specific managers are defined for the rule)
      let eligibleManagers = allManagers
      if (rule.eligibleManagers.length > 0) {
        eligibleManagers = allManagers.filter(m => rule.eligibleManagers.includes(m.managerId))
      }

      // Apply assignment method
      switch (rule.assignmentMethod) {
        case 'round_robin':
          selectedManagerId = await assignRoundRobin(eligibleManagers)
          assignmentReason = `Assigned using round-robin method via rule: ${rule.name}`
          break
        case 'lowest_workload':
          selectedManagerId = await assignLowestWorkload(eligibleManagers)
          assignmentReason = `Assigned to manager with lowest workload via rule: ${rule.name}`
          break
        case 'random':
          selectedManagerId = await assignRandom(eligibleManagers)
          assignmentReason = `Assigned randomly via rule: ${rule.name}`
          break
        case 'manual':
          throw new Error('Manual assignment required - cannot auto-assign')
        default:
          throw new Error(`Unknown assignment method: ${rule.assignmentMethod}`)
      }
    } else {
      // Fallback to round-robin if no rules match
      selectedManagerId = await assignRoundRobin(allManagers)
      assignmentReason = 'Assigned using default round-robin method'
      assignmentMethod = 'round_robin'
    }

    // Get selected manager info
    const selectedManager = allManagers.find(m => m.managerId === selectedManagerId)
    if (!selectedManager) {
      throw new Error('Selected manager not found in workload data')
    }

    // Update lead with assignment
    const { error: updateError } = await supabase
      .from('client_leads')
      .update({
        assigned_to: selectedManagerId,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (updateError) {
      throw new Error(`Failed to update lead assignment: ${updateError.message}`)
    }

    // Send assignment notification email to manager
    await EmailService.sendLeadAssignmentNotification(
      {
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        serviceType: lead.serviceType,
        sourceType: lead.sourceType,
        id: lead.id
      },
      {
        firstName: selectedManager.firstName,
        lastName: selectedManager.lastName,
        email: selectedManager.email
      }
    )

    const result: AssignmentResult = {
      assignedTo: selectedManagerId,
      managerName: `${selectedManager.firstName} ${selectedManager.lastName}`,
      managerEmail: selectedManager.email,
      assignmentReason,
      ruleUsed,
      assignmentMethod
    }

    return {
      success: true,
      data: result,
      message: 'Lead assigned successfully'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to assign lead'
    }
  }
}

/**
 * Manually assign a lead to a specific manager
 * @param leadId - ID of the lead to assign
 * @param managerId - ID of the manager to assign to
 * @param reason - Reason for manual assignment
 * @returns Promise with assignment result
 */
export async function manualAssignLead(
  leadId: string,
  managerId: string,
  reason: string
): Promise<ApiResponse<AssignmentResult>> {
  try {
    // Verify lead exists and is not already assigned
    const { data: leadData, error: leadError } = await supabase
      .from('client_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !leadData) {
      throw new Error(`Lead not found: ${leadError?.message || 'Unknown error'}`)
    }

    if (leadData.assigned_to) {
      throw new Error('Lead is already assigned')
    }

    // Verify manager exists and is active
    const { data: managerData, error: managerError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        users!inner(
          first_name,
          last_name,
          email
        ),
        roles!inner(name)
      `)
      .eq('user_id', managerId)
      .eq('roles.name', 'manager')
      .eq('status', 'active')
      .single()

    if (managerError || !managerData) {
      throw new Error('Manager not found or not active')
    }

    // Update lead assignment
    const { error: updateError } = await supabase
      .from('client_leads')
      .update({
        assigned_to: managerId,
        assigned_at: new Date().toISOString(),
        qualification_notes: reason ? `Manual assignment: ${reason}` : 'Manual assignment',
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (updateError) {
      throw new Error(`Failed to update lead assignment: ${updateError.message}`)
    }

    // Send assignment notification email
    await EmailService.sendLeadAssignmentNotification(
      {
        firstName: leadData.first_name,
        lastName: leadData.last_name,
        email: leadData.email,
        phone: leadData.phone,
        serviceType: leadData.service_type,
        sourceType: leadData.source_type,
        id: leadData.id
      },
      {
        firstName: managerData.users.first_name,
        lastName: managerData.users.last_name,
        email: managerData.users.email
      }
    )

    const result: AssignmentResult = {
      assignedTo: managerId,
      managerName: `${managerData.users.first_name} ${managerData.users.last_name}`,
      managerEmail: managerData.users.email,
      assignmentReason: reason || 'Manual assignment',
      assignmentMethod: 'manual'
    }

    return {
      success: true,
      data: result,
      message: 'Lead assigned manually'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to manually assign lead'
    }
  }
}

/**
 * Reassign a lead to a different manager
 * @param leadId - ID of the lead to reassign
 * @param newManagerId - ID of the new manager
 * @param reason - Reason for reassignment
 * @returns Promise with assignment result
 */
export async function reassignLead(
  leadId: string,
  newManagerId: string,
  reason: string
): Promise<ApiResponse<AssignmentResult>> {
  try {
    // Get current lead data
    const { data: leadData, error: leadError } = await supabase
      .from('client_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !leadData) {
      throw new Error(`Lead not found: ${leadError?.message || 'Unknown error'}`)
    }

    // Update assignment (similar to manual assign but allows changing existing assignment)
    const { error: updateError } = await supabase
      .from('client_leads')
      .update({
        assigned_to: newManagerId,
        assigned_at: new Date().toISOString(),
        qualification_notes: leadData.qualification_notes 
          ? `${leadData.qualification_notes}\n\nReassigned: ${reason}`
          : `Reassigned: ${reason}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (updateError) {
      throw new Error(`Failed to reassign lead: ${updateError.message}`)
    }

    // Get new manager info for notification
    const { data: managerData, error: managerError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        users!inner(
          first_name,
          last_name,
          email
        )
      `)
      .eq('user_id', newManagerId)
      .single()

    if (managerError || !managerData) {
      throw new Error('New manager not found')
    }

    // Send notification to new manager
    await EmailService.sendLeadAssignmentNotification(
      {
        firstName: leadData.first_name,
        lastName: leadData.last_name,
        email: leadData.email,
        phone: leadData.phone,
        serviceType: leadData.service_type,
        sourceType: leadData.source_type,
        id: leadData.id
      },
      {
        firstName: managerData.users.first_name,
        lastName: managerData.users.last_name,
        email: managerData.users.email
      }
    )

    const result: AssignmentResult = {
      assignedTo: newManagerId,
      managerName: `${managerData.users.first_name} ${managerData.users.last_name}`,
      managerEmail: managerData.users.email,
      assignmentReason: `Reassignment: ${reason}`,
      assignmentMethod: 'reassignment'
    }

    return {
      success: true,
      data: result,
      message: 'Lead reassigned successfully'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to reassign lead'
    }
  }
}