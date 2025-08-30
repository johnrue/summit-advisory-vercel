import { supabase } from '@/lib/supabase'
import type { ApiResponse, ProposalTemplate, ProposalGeneration, PricingStructure } from '@/lib/types'

/**
 * Get all proposal templates
 */
export async function getProposalTemplates(
  serviceType?: string
): Promise<ApiResponse<ProposalTemplate[]>> {
  try {
    let query = supabase
      .from('proposal_templates')
      .select('*')
      .eq('is_active', true)
      .order('service_type', { ascending: true })

    if (serviceType) {
      query = query.eq('service_type', serviceType)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const templates: ProposalTemplate[] = (data || []).map(template => ({
      id: template.id,
      name: template.name,
      serviceType: template.service_type,
      description: template.description,
      template: template.template,
      variables: template.variables || [],
      pricingStructure: template.pricing_structure || {
        baseRate: 25,
        rateType: 'hourly',
        modifiers: [],
        discounts: []
      },
      isActive: template.is_active,
      created_at: template.created_at,
      updated_at: template.updated_at
    }))

    return {
      success: true,
      data: templates,
      message: 'Proposal templates retrieved successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to retrieve proposal templates'
    }
  }
}

/**
 * Generate a proposal from template
 */
export async function generateProposal(
  proposalData: ProposalGeneration
): Promise<ApiResponse<{ proposalContent: string, estimatedValue: number, validUntil: string }>> {
  try {
    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('proposal_templates')
      .select('*')
      .eq('id', proposalData.templateId)
      .eq('is_active', true)
      .single()

    if (templateError || !template) {
      throw new Error('Proposal template not found')
    }

    // Get contract details if contractId provided
    let contractData: any = {}
    if (proposalData.contractId) {
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', proposalData.contractId)
        .single()

      if (!contractError && contract) {
        contractData = {
          clientName: contract.client_name,
          clientCompany: contract.client_company,
          clientEmail: contract.client_contact_email,
          clientPhone: contract.client_contact_phone,
          serviceType: contract.contract_type,
          contractValue: contract.contract_value,
          startDate: contract.start_date,
          endDate: contract.end_date,
          serviceDescription: contract.service_description
        }
      }
    }

    // Merge variables with contract data and user-provided variables
    const allVariables = {
      ...contractData,
      ...proposalData.variables,
      generatedDate: new Date().toLocaleDateString(),
      validUntil: proposalData.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
    }

    // Replace template variables
    let proposalContent = template.template
    Object.entries(allVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      proposalContent = proposalContent.replace(regex, String(value))
    })

    // Add custom sections
    if (proposalData.customSections && proposalData.customSections.length > 0) {
      const customSectionsHtml = proposalData.customSections
        .sort((a, b) => a.position - b.position)
        .map(section => `
          <div class="custom-section">
            <h3>${section.title}</h3>
            <div>${section.content}</div>
          </div>
        `)
        .join('\n')
      
      proposalContent += `\n\n<div class="custom-sections">\n${customSectionsHtml}\n</div>`
    }

    // Calculate pricing
    const pricingStructure = proposalData.pricingOverrides || template.pricing_structure
    const estimatedValue = calculateProposalValue(pricingStructure, allVariables)

    // Log proposal generation for analytics
    await supabase.from('proposal_generations').insert({
      contract_id: proposalData.contractId,
      template_id: proposalData.templateId,
      generated_content: proposalContent,
      variables_used: allVariables,
      estimated_value: estimatedValue,
      valid_until: proposalData.validUntil,
      requires_approval: proposalData.approvalRequired
    })

    return {
      success: true,
      data: {
        proposalContent,
        estimatedValue,
        validUntil: allVariables.validUntil
      },
      message: 'Proposal generated successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to generate proposal'
    }
  }
}

/**
 * Calculate proposal value based on pricing structure
 */
function calculateProposalValue(
  pricingStructure: PricingStructure, 
  variables: Record<string, any>
): number {
  let baseValue = pricingStructure.baseRate

  // Apply rate type multipliers
  const hoursPerMonth = variables.hoursPerMonth || 160
  const contractMonths = variables.contractMonths || 12

  switch (pricingStructure.rateType) {
    case 'hourly':
      baseValue = baseValue * hoursPerMonth * contractMonths
      break
    case 'monthly':
      baseValue = baseValue * contractMonths
      break
    case 'annual':
      baseValue = baseValue * (contractMonths / 12)
      break
  }

  // Apply modifiers
  pricingStructure.modifiers?.forEach(modifier => {
    if (evaluateCondition(modifier.condition, variables)) {
      if (modifier.type === 'percentage') {
        baseValue *= (1 + modifier.value / 100)
      } else {
        baseValue += modifier.value
      }
    }
  })

  // Apply discounts
  pricingStructure.discounts?.forEach(discount => {
    if (baseValue >= discount.minimumValue) {
      const discountExpired = discount.validUntil && new Date(discount.validUntil) < new Date()
      if (!discountExpired) {
        baseValue *= (1 - discount.percentage / 100)
      }
    }
  })

  return Math.round(baseValue)
}

/**
 * Evaluate pricing condition
 */
function evaluateCondition(condition: string, variables: Record<string, any>): boolean {
  try {
    // Simple condition evaluation - in production, use a proper expression parser
    // For now, support basic conditions like "serviceType === 'armed'"
    const cleanCondition = condition.replace(/['"]/g, '')
    const [variable, operator, value] = cleanCondition.split(/\s*(===|==|>|<|>=|<=)\s/)
    
    const variableValue = variables[variable?.trim()]
    const comparisonValue = isNaN(Number(value)) ? value?.trim() : Number(value)
    
    switch (operator) {
      case '===':
      case '==':
        return variableValue == comparisonValue
      case '>':
        return Number(variableValue) > Number(comparisonValue)
      case '<':
        return Number(variableValue) < Number(comparisonValue)
      case '>=':
        return Number(variableValue) >= Number(comparisonValue)
      case '<=':
        return Number(variableValue) <= Number(comparisonValue)
      default:
        return false
    }
  } catch {
    return false
  }
}

/**
 * Create or update a proposal template
 */
export async function saveProposalTemplate(
  templateData: Omit<ProposalTemplate, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<ApiResponse<ProposalTemplate>> {
  try {
    const isUpdate = !!templateData.id

    const dbData = {
      name: templateData.name,
      service_type: templateData.serviceType,
      description: templateData.description,
      template: templateData.template,
      variables: templateData.variables,
      pricing_structure: templateData.pricingStructure,
      is_active: templateData.isActive
    }

    let result
    if (isUpdate) {
      result = await supabase
        .from('proposal_templates')
        .update(dbData)
        .eq('id', templateData.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('proposal_templates')
        .insert([dbData])
        .select()
        .single()
    }

    const { data, error } = result

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!data) {
      throw new Error('No data returned from database')
    }

    const template: ProposalTemplate = {
      id: data.id,
      name: data.name,
      serviceType: data.service_type,
      description: data.description,
      template: data.template,
      variables: data.variables || [],
      pricingStructure: data.pricing_structure,
      isActive: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at
    }

    return {
      success: true,
      data: template,
      message: `Proposal template ${isUpdate ? 'updated' : 'created'} successfully`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to save proposal template'
    }
  }
}

/**
 * Delete a proposal template
 */
export async function deleteProposalTemplate(templateId: string): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('proposal_templates')
      .delete()
      .eq('id', templateId)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return {
      success: true,
      message: 'Proposal template deleted successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to delete proposal template'
    }
  }
}

/**
 * Get proposal generation history
 */
export async function getProposalHistory(
  contractId?: string,
  limit: number = 25
): Promise<ApiResponse<any[]>> {
  try {
    let query = supabase
      .from('proposal_generations')
      .select(`
        *,
        contracts(client_name, client_company),
        proposal_templates(name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (contractId) {
      query = query.eq('contract_id', contractId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return {
      success: true,
      data: data || [],
      message: 'Proposal history retrieved successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to retrieve proposal history'
    }
  }
}

/**
 * Submit proposal for approval
 */
export async function submitForApproval(
  proposalGenerationId: string,
  notes?: string
): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('proposal_generations')
      .update({
        status: 'pending_approval',
        approval_notes: notes,
        submitted_for_approval_at: new Date().toISOString()
      })
      .eq('id', proposalGenerationId)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return {
      success: true,
      message: 'Proposal submitted for approval successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to submit proposal for approval'
    }
  }
}

/**
 * Approve or reject a proposal
 */
export async function reviewProposal(
  proposalGenerationId: string,
  action: 'approve' | 'reject',
  reviewNotes?: string
): Promise<ApiResponse<void>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('proposal_generations')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      })
      .eq('id', proposalGenerationId)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return {
      success: true,
      message: `Proposal ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: `Failed to ${action} proposal`
    }
  }
}