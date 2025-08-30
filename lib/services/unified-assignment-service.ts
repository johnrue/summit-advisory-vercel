import { supabase } from '@/lib/supabase'
import { UnifiedLead, FilterCriteria } from '@/lib/types/unified-leads'
import type { ApiResponse } from '@/lib/types'

export interface AssignmentRule {
  id: string
  name: string
  priority: number
  active: boolean
  criteria: {
    leadType?: 'client' | 'guard'
    sources?: string[]
    locations?: string[]
    serviceTypes?: string[]
    experienceLevel?: string[]
  }
  assignment: {
    managerId: string
    managerName: string
    maxWorkload: number
    territories?: string[]
  }
  createdAt: Date
  updatedAt: Date
}

export interface WorkloadDistribution {
  managerId: string
  managerName: string
  currentWorkload: number
  maxWorkload: number
  utilizationRate: number
  availableCapacity: number
  territories: string[]
  specializations: string[]
  averageResponseTime: number
  conversionRate: number
  currentLeads: {
    total: number
    client: number
    guard: number
    byStatus: Record<string, number>
  }
}

export interface AssignmentRecommendation {
  leadId: string
  recommendedManagerId: string
  managerName: string
  confidence: number
  reasoning: string[]
  alternativeManagers: {
    managerId: string
    managerName: string
    confidence: number
    reasoning: string
  }[]
}

/**
 * Get current workload distribution for all managers
 */
export async function getWorkloadDistribution(): Promise<ApiResponse<WorkloadDistribution[]>> {
  try {
    // Fetch all managers with their roles
    const { data: managers, error: managersError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        users!inner(first_name, last_name, email),
        role_name
      `)
      .in('role_name', ['manager', 'admin'])

    if (managersError) {
      throw new Error(`Failed to fetch managers: ${managersError.message}`)
    }

    if (!managers || managers.length === 0) {
      return {
        success: true,
        data: [],
        message: 'No managers found'
      }
    }

    const managerIds = managers.map(m => m.user_id)

    // Fetch current lead assignments for all managers
    const [clientLeadsResult, guardLeadsResult] = await Promise.all([
      supabase
        .from('client_leads')
        .select('*')
        .in('assigned_to', managerIds)
        .in('status', ['prospect', 'contacted', 'qualified', 'proposal', 'negotiation']), // Active statuses

      supabase
        .from('guard_leads')
        .select('*')
        .in('assigned_to', managerIds)
        .in('status', ['applicant', 'screening', 'interview', 'background', 'training']) // Active statuses
    ])

    if (clientLeadsResult.error) {
      throw new Error(`Failed to fetch client leads: ${clientLeadsResult.error.message}`)
    }

    if (guardLeadsResult.error) {
      throw new Error(`Failed to fetch guard leads: ${guardLeadsResult.error.message}`)
    }

    const clientLeads = clientLeadsResult.data || []
    const guardLeads = guardLeadsResult.data || []

    // Calculate workload distribution for each manager
    const distribution: WorkloadDistribution[] = managers.map(manager => {
      const managerClientLeads = clientLeads.filter(l => l.assigned_to === manager.user_id)
      const managerGuardLeads = guardLeads.filter(l => l.assigned_to === manager.user_id)
      const totalLeads = managerClientLeads.length + managerGuardLeads.length

      // Calculate status distribution
      const statusDistribution: Record<string, number> = {}
      
      managerClientLeads.forEach(lead => {
        statusDistribution[lead.status] = (statusDistribution[lead.status] || 0) + 1
      })
      
      managerGuardLeads.forEach(lead => {
        statusDistribution[lead.status] = (statusDistribution[lead.status] || 0) + 1
      })

      // Calculate average response time
      const allLeads = [...managerClientLeads, ...managerGuardLeads]
      const responseTimeLeads = allLeads
        .filter(l => l.assigned_at && l.last_contact_date)
        .map(l => {
          const assigned = new Date(l.assigned_at!)
          const contacted = new Date(l.last_contact_date!)
          return Math.max(0, (contacted.getTime() - assigned.getTime()) / (1000 * 60 * 60)) // hours
        })

      const averageResponseTime = responseTimeLeads.length > 0 
        ? responseTimeLeads.reduce((a, b) => a + b, 0) / responseTimeLeads.length 
        : 0

      // Calculate conversion rate (simplified)
      const clientConversions = managerClientLeads.filter(l => l.status === 'won').length
      const guardConversions = managerGuardLeads.filter(l => l.status === 'hired').length
      const totalConversions = clientConversions + guardConversions
      const conversionRate = totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0

      // Default max workload (could be made configurable per manager)
      const maxWorkload = 50
      const utilizationRate = (totalLeads / maxWorkload) * 100
      const availableCapacity = Math.max(0, maxWorkload - totalLeads)

      // TODO: Get territories and specializations from manager profile
      const territories: string[] = [] // Would come from manager_territories table
      const specializations: string[] = [] // Would come from manager profile

      return {
        managerId: manager.user_id,
        managerName: `${manager.users.first_name} ${manager.users.last_name}`,
        currentWorkload: totalLeads,
        maxWorkload,
        utilizationRate: Math.round(utilizationRate * 10) / 10,
        availableCapacity,
        territories,
        specializations,
        averageResponseTime: Math.round(averageResponseTime * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
        currentLeads: {
          total: totalLeads,
          client: managerClientLeads.length,
          guard: managerGuardLeads.length,
          byStatus: statusDistribution
        }
      }
    }).sort((a, b) => b.utilizationRate - a.utilizationRate)

    return {
      success: true,
      data: distribution,
      message: 'Workload distribution calculated successfully'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to get workload distribution'
    }
  }
}

/**
 * Get assignment recommendations for unassigned leads
 */
export async function getAssignmentRecommendations(
  leadIds?: string[]
): Promise<ApiResponse<AssignmentRecommendation[]>> {
  try {
    // Get workload distribution first
    const workloadResult = await getWorkloadDistribution()
    if (!workloadResult.success || !workloadResult.data) {
      throw new Error('Failed to get workload distribution')
    }

    const managers = workloadResult.data

    // Fetch unassigned leads (or specific leads if provided)
    let clientQuery = supabase
      .from('client_leads')
      .select('*')
      .is('assigned_to', null)

    let guardQuery = supabase
      .from('guard_leads')
      .select('*')
      .is('assigned_to', null)

    if (leadIds && leadIds.length > 0) {
      clientQuery = clientQuery.in('id', leadIds)
      guardQuery = guardQuery.in('id', leadIds)
    }

    const [clientResult, guardResult] = await Promise.all([clientQuery, guardQuery])

    if (clientResult.error) {
      throw new Error(`Failed to fetch client leads: ${clientResult.error.message}`)
    }

    if (guardResult.error) {
      throw new Error(`Failed to fetch guard leads: ${guardResult.error.message}`)
    }

    const allLeads = [
      ...(clientResult.data || []).map(l => ({ ...l, type: 'client' as const })),
      ...(guardResult.data || []).map(l => ({ ...l, type: 'guard' as const }))
    ]

    // Generate recommendations for each lead
    const recommendations: AssignmentRecommendation[] = allLeads.map(lead => {
      // Score managers based on various factors
      const managerScores = managers
        .filter(m => m.availableCapacity > 0) // Only managers with capacity
        .map(manager => {
          let score = 0
          const reasons: string[] = []

          // Factor 1: Available capacity (30% weight)
          const capacityScore = (manager.availableCapacity / manager.maxWorkload) * 0.3
          score += capacityScore
          if (manager.availableCapacity > 10) {
            reasons.push('High availability')
          }

          // Factor 2: Conversion rate performance (25% weight)
          const conversionScore = (manager.conversionRate / 100) * 0.25
          score += conversionScore
          if (manager.conversionRate > 20) {
            reasons.push('Strong conversion rate')
          }

          // Factor 3: Response time (20% weight)
          const responseScore = manager.averageResponseTime > 0 
            ? Math.max(0, (48 - manager.averageResponseTime) / 48) * 0.20
            : 0.20
          score += responseScore
          if (manager.averageResponseTime > 0 && manager.averageResponseTime < 4) {
            reasons.push('Fast response time')
          }

          // Factor 4: Lead type specialization (15% weight)
          const currentTypeRatio = lead.type === 'client' 
            ? manager.currentLeads.client / Math.max(manager.currentLeads.total, 1)
            : manager.currentLeads.guard / Math.max(manager.currentLeads.total, 1)
          
          // Prefer balanced distribution
          const balanceScore = (1 - Math.abs(currentTypeRatio - 0.5)) * 0.15
          score += balanceScore

          // Factor 5: Workload balance (10% weight)
          const workloadBalance = (1 - (manager.utilizationRate / 100)) * 0.10
          score += workloadBalance
          if (manager.utilizationRate < 70) {
            reasons.push('Balanced workload')
          }

          // Bonus points for specific conditions
          if (lead.type === 'client' && manager.currentLeads.client < manager.currentLeads.guard) {
            score += 0.05
            reasons.push('Client lead balance needed')
          }

          if (lead.type === 'guard' && manager.currentLeads.guard < manager.currentLeads.client) {
            score += 0.05
            reasons.push('Guard lead balance needed')
          }

          return {
            managerId: manager.managerId,
            managerName: manager.managerName,
            score,
            reasoning: reasons.join(', ') || 'Good overall fit'
          }
        })
        .sort((a, b) => b.score - a.score)

      if (managerScores.length === 0) {
        return {
          leadId: lead.id,
          recommendedManagerId: '',
          managerName: 'No available managers',
          confidence: 0,
          reasoning: ['All managers at capacity'],
          alternativeManagers: []
        }
      }

      const topManager = managerScores[0]
      const alternatives = managerScores.slice(1, 4) // Top 3 alternatives

      return {
        leadId: lead.id,
        recommendedManagerId: topManager.managerId,
        managerName: topManager.managerName,
        confidence: Math.round(topManager.score * 100),
        reasoning: [topManager.reasoning],
        alternativeManagers: alternatives.map(alt => ({
          managerId: alt.managerId,
          managerName: alt.managerName,
          confidence: Math.round(alt.score * 100),
          reasoning: alt.reasoning
        }))
      }
    })

    return {
      success: true,
      data: recommendations,
      message: `Generated ${recommendations.length} assignment recommendations`
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to generate assignment recommendations'
    }
  }
}

/**
 * Assign a lead to a manager
 */
export async function assignLead(
  leadId: string,
  leadType: 'client' | 'guard',
  managerId: string,
  assignedBy: string
): Promise<ApiResponse<{ leadId: string; managerId: string }>> {
  try {
    const tableName = leadType === 'client' ? 'client_leads' : 'guard_leads'
    
    const { error } = await supabase
      .from(tableName)
      .update({
        assigned_to: managerId,
        assigned_at: new Date().toISOString(),
        assigned_by: assignedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (error) {
      throw new Error(`Failed to assign lead: ${error.message}`)
    }

    // TODO: Create assignment history record
    // TODO: Send notification to assigned manager
    // TODO: Update workload cache if implemented

    return {
      success: true,
      data: { leadId, managerId },
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
 * Reassign a lead to a different manager
 */
export async function reassignLead(
  leadId: string,
  leadType: 'client' | 'guard',
  fromManagerId: string,
  toManagerId: string,
  reassignedBy: string,
  reason?: string
): Promise<ApiResponse<{ leadId: string; fromManagerId: string; toManagerId: string }>> {
  try {
    const tableName = leadType === 'client' ? 'client_leads' : 'guard_leads'
    
    // Update the lead assignment
    const { error } = await supabase
      .from(tableName)
      .update({
        assigned_to: toManagerId,
        assigned_at: new Date().toISOString(),
        assigned_by: reassignedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .eq('assigned_to', fromManagerId) // Ensure we're reassigning from the correct manager

    if (error) {
      throw new Error(`Failed to reassign lead: ${error.message}`)
    }

    // TODO: Create reassignment history record with reason
    // TODO: Send notifications to both managers
    // TODO: Update workload cache if implemented

    return {
      success: true,
      data: { leadId, fromManagerId, toManagerId },
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

/**
 * Auto-assign multiple leads based on recommendations
 */
export async function autoAssignLeads(
  leadIds: string[],
  assignedBy: string,
  confidenceThreshold: number = 70
): Promise<ApiResponse<{
  assigned: { leadId: string; managerId: string; managerName: string }[]
  skipped: { leadId: string; reason: string }[]
}>> {
  try {
    const recommendationsResult = await getAssignmentRecommendations(leadIds)
    
    if (!recommendationsResult.success || !recommendationsResult.data) {
      throw new Error('Failed to get assignment recommendations')
    }

    const recommendations = recommendationsResult.data
    const assigned: { leadId: string; managerId: string; managerName: string }[] = []
    const skipped: { leadId: string; reason: string }[] = []

    // Process each recommendation
    for (const recommendation of recommendations) {
      if (recommendation.confidence < confidenceThreshold) {
        skipped.push({
          leadId: recommendation.leadId,
          reason: `Low confidence score (${recommendation.confidence}%)`
        })
        continue
      }

      if (!recommendation.recommendedManagerId) {
        skipped.push({
          leadId: recommendation.leadId,
          reason: 'No available managers'
        })
        continue
      }

      // Determine lead type by checking which table it exists in
      const [clientCheck, guardCheck] = await Promise.all([
        supabase.from('client_leads').select('id').eq('id', recommendation.leadId).single(),
        supabase.from('guard_leads').select('id').eq('id', recommendation.leadId).single()
      ])

      let leadType: 'client' | 'guard'
      if (clientCheck.data && !clientCheck.error) {
        leadType = 'client'
      } else if (guardCheck.data && !guardCheck.error) {
        leadType = 'guard'
      } else {
        skipped.push({
          leadId: recommendation.leadId,
          reason: 'Lead not found'
        })
        continue
      }

      // Attempt assignment
      const assignmentResult = await assignLead(
        recommendation.leadId,
        leadType,
        recommendation.recommendedManagerId,
        assignedBy
      )

      if (assignmentResult.success) {
        assigned.push({
          leadId: recommendation.leadId,
          managerId: recommendation.recommendedManagerId,
          managerName: recommendation.managerName
        })
      } else {
        skipped.push({
          leadId: recommendation.leadId,
          reason: assignmentResult.error || 'Assignment failed'
        })
      }
    }

    return {
      success: true,
      data: { assigned, skipped },
      message: `Auto-assigned ${assigned.length} leads, skipped ${skipped.length}`
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to auto-assign leads'
    }
  }
}

/**
 * Get assignment history for a lead
 */
export async function getAssignmentHistory(
  leadId: string
): Promise<ApiResponse<{
  assignments: {
    assignedTo: string
    assignedBy: string
    assignedAt: Date
    reason?: string
  }[]
}>> {
  try {
    // This would require an assignment_history table
    // For now, return basic info from the lead record
    
    const [clientResult, guardResult] = await Promise.all([
      supabase
        .from('client_leads')
        .select(`
          id,
          assigned_to,
          assigned_at,
          assigned_by,
          users!assigned_to(first_name, last_name),
          assigner:users!assigned_by(first_name, last_name)
        `)
        .eq('id', leadId)
        .single(),
      
      supabase
        .from('guard_leads')
        .select(`
          id,
          assigned_to,
          assigned_at,
          assigned_by,
          users!assigned_to(first_name, last_name),
          assigner:users!assigned_by(first_name, last_name)
        `)
        .eq('id', leadId)
        .single()
    ])

    let leadData = null
    if (clientResult.data && !clientResult.error) {
      leadData = clientResult.data
    } else if (guardResult.data && !guardResult.error) {
      leadData = guardResult.data
    }

    if (!leadData) {
      throw new Error('Lead not found')
    }

    const assignments = []
    if (leadData.assigned_to && leadData.assigned_at) {
      assignments.push({
        assignedTo: leadData.assigned_to,
        assignedBy: leadData.assigned_by || 'System',
        assignedAt: new Date(leadData.assigned_at),
        reason: 'Current assignment'
      })
    }

    return {
      success: true,
      data: { assignments },
      message: 'Assignment history retrieved'
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to get assignment history'
    }
  }
}