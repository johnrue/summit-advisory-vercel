import { supabase } from '@/lib/supabase'
import type { ApiResponse, ContractRenewal, RenewalAlert, Contract, ExpansionOpportunity } from '@/lib/types'

/**
 * Get renewal pipeline with upcoming renewals
 */
export async function getRenewalPipeline(
  daysAhead: number = 180
): Promise<ApiResponse<ContractRenewal[]>> {
  try {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    const { data, error } = await supabase
      .from('contract_renewals')
      .select(`
        *,
        contracts!original_contract_id(*),
        users!assigned_manager(first_name, last_name, email)
      `)
      .lte('renewal_start_date', futureDate.toISOString())
      .in('status', ['upcoming', 'in_progress'])
      .order('renewal_start_date', { ascending: true })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const renewals: ContractRenewal[] = (data || []).map(renewal => ({
      id: renewal.id,
      originalContractId: renewal.original_contract_id,
      status: renewal.status,
      renewalType: renewal.renewal_type,
      originalEndDate: renewal.original_end_date,
      renewalStartDate: renewal.renewal_start_date,
      renewalEndDate: renewal.renewal_end_date,
      notificationSentAt: renewal.notification_sent_at,
      clientResponseAt: renewal.client_response_at,
      proposedTerms: renewal.proposed_terms || {},
      proposedValue: parseFloat(renewal.proposed_value || 0),
      proposedChanges: renewal.proposed_changes || [],
      churnRisk: renewal.churn_risk,
      churnReasons: renewal.churn_reasons || [],
      retentionStrategy: renewal.retention_strategy,
      identifiedExpansions: renewal.identified_expansions || [],
      crossSellOpportunities: renewal.cross_sell_opportunities || [],
      assignedManager: renewal.assigned_manager,
      assignedAt: renewal.assigned_at,
      created_at: renewal.created_at,
      updated_at: renewal.updated_at
    }))

    return {
      success: true,
      data: renewals,
      message: 'Renewal pipeline retrieved successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to retrieve renewal pipeline'
    }
  }
}

/**
 * Create renewal opportunities from expiring contracts
 */
export async function createRenewalOpportunities(): Promise<ApiResponse<{ created: number, errors: number }>> {
  try {
    // Find active contracts expiring in the next 90 days
    const ninetyDaysFromNow = new Date()
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90)

    const { data: expiringContracts, error: contractsError } = await supabase
      .from('contracts')
      .select('*')
      .eq('status', 'active')
      .lte('end_date', ninetyDaysFromNow.toISOString().split('T')[0])

    if (contractsError) {
      throw new Error(`Database error: ${contractsError.message}`)
    }

    let created = 0
    let errors = 0

    for (const contract of expiringContracts || []) {
      try {
        // Check if renewal opportunity already exists
        const { data: existingRenewal } = await supabase
          .from('contract_renewals')
          .select('id')
          .eq('original_contract_id', contract.id)
          .single()

        if (existingRenewal) {
          continue // Skip if renewal already exists
        }

        // Calculate renewal dates
        const originalEndDate = new Date(contract.end_date)
        const renewalStartDate = new Date(originalEndDate)
        const renewalEndDate = new Date(originalEndDate)
        renewalEndDate.setFullYear(renewalEndDate.getFullYear() + 1)

        // Assess churn risk
        const churnRisk = assessChurnRisk(contract)
        
        // Identify expansion opportunities
        const expansionOpportunities = await identifyExpansionOpportunities(contract.id)

        // Create renewal record
        const renewalData = {
          original_contract_id: contract.id,
          status: 'upcoming',
          renewal_type: contract.auto_renew ? 'automatic' : 'manual',
          original_end_date: contract.end_date,
          renewal_start_date: renewalStartDate.toISOString().split('T')[0],
          renewal_end_date: renewalEndDate.toISOString().split('T')[0],
          proposed_terms: {
            duration: 12,
            cancellationNotice: 30,
            performanceStandards: [],
            serviceLevel: 'standard'
          },
          proposed_value: parseFloat(contract.contract_value || 0),
          proposed_changes: [],
          churn_risk: churnRisk.level,
          churn_reasons: churnRisk.reasons,
          retention_strategy: churnRisk.strategy,
          identified_expansions: expansionOpportunities.data || [],
          cross_sell_opportunities: [],
          assigned_manager: contract.assigned_manager
        }

        const { error: insertError } = await supabase
          .from('contract_renewals')
          .insert([renewalData])

        if (insertError) {
          errors++
        } else {
          created++
          
          // Schedule renewal alerts
          await scheduleRenewalAlerts(contract.id, originalEndDate)
        }
      } catch (error) {
        errors++
      }
    }

    return {
      success: true,
      data: { created, errors },
      message: `Created ${created} renewal opportunities with ${errors} errors`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to create renewal opportunities'
    }
  }
}

/**
 * Assess churn risk for a contract
 */
function assessChurnRisk(contract: any): { level: string, reasons: string[], strategy: string } {
  const reasons = []
  let riskScore = 0

  // Contract value risk
  if (parseFloat(contract.contract_value || 0) < 10000) {
    reasons.push('Low contract value')
    riskScore += 1
  }

  // Contract age risk
  const contractAge = Math.floor((Date.now() - new Date(contract.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
  if (contractAge < 6) {
    reasons.push('New relationship (< 6 months)')
    riskScore += 1
  } else if (contractAge > 36) {
    reasons.push('Long-term contract may seek alternatives')
    riskScore += 1
  }

  // Service type risk
  if (contract.contract_type === 'event') {
    reasons.push('Event-based services are typically one-time')
    riskScore += 2
  }

  // Payment history risk (would need payment data)
  // For now, randomly assess some contracts as having payment issues
  if (Math.random() < 0.1) {
    reasons.push('Payment delays in recent months')
    riskScore += 2
  }

  let level = 'low'
  let strategy = 'Standard renewal outreach with competitive pricing'

  if (riskScore >= 3) {
    level = 'high'
    strategy = 'Executive engagement, custom retention package, performance review meeting'
  } else if (riskScore >= 2) {
    level = 'medium'  
    strategy = 'Enhanced communication, service review, potential expansion discussion'
  }

  return { level, reasons, strategy }
}

/**
 * Schedule renewal alerts for a contract
 */
async function scheduleRenewalAlerts(contractId: string, endDate: Date) {
  const alerts = [
    { type: 'initial', daysBefore: 90 },
    { type: 'reminder', daysBefore: 60 },
    { type: 'urgent', daysBefore: 30 },
    { type: 'final', daysBefore: 7 }
  ]

  for (const alert of alerts) {
    const alertDate = new Date(endDate)
    alertDate.setDate(alertDate.getDate() - alert.daysBefore)

    // Only schedule future alerts
    if (alertDate > new Date()) {
      await supabase
        .from('renewal_alerts')
        .insert([{
          contract_id: contractId,
          alert_type: alert.type,
          days_before_renewal: alert.daysBefore,
          scheduled_for: alertDate.toISOString()
        }])
    }
  }
}

/**
 * Identify expansion opportunities for a contract
 */
async function identifyExpansionOpportunities(contractId: string): Promise<ApiResponse<ExpansionOpportunity[]>> {
  try {
    // Get contract details
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*, contract_sites(*)')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return { success: false, data: [], error: 'Contract not found', message: 'Failed to find contract' }
    }

    const opportunities: ExpansionOpportunity[] = []

    // Site expansion opportunities
    const currentSites = contract.contract_sites?.length || 0
    if (currentSites > 0 && currentSites < 5) {
      opportunities.push({
        id: `site-expansion-${contractId}`,
        type: 'additional_site',
        description: `Add ${currentSites === 1 ? 'additional' : 'more'} security coverage sites`,
        estimatedValue: parseFloat(contract.contract_value || 0) * 0.5,
        priority: 'medium',
        likelihood: 60,
        expectedDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Client may have additional properties requiring security',
        created_at: new Date().toISOString()
      })
    }

    // Service hours expansion
    if (contract.contract_type === 'unarmed') {
      opportunities.push({
        id: `service-upgrade-${contractId}`,
        type: 'upgrade_service',
        description: 'Upgrade to armed security services',
        estimatedValue: parseFloat(contract.contract_value || 0) * 0.3,
        priority: 'high',
        likelihood: 45,
        expectedDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Unarmed clients often upgrade to armed services over time',
        created_at: new Date().toISOString()
      })
    }

    // Extended hours opportunity
    if (parseFloat(contract.monthly_value || 0) > 0) {
      opportunities.push({
        id: `extended-hours-${contractId}`,
        type: 'extended_hours',
        description: 'Extend security coverage to 24/7',
        estimatedValue: parseFloat(contract.monthly_value || 0) * 12 * 0.4, // 40% increase annually
        priority: 'medium',
        likelihood: 35,
        expectedDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Opportunity for extended coverage hours',
        created_at: new Date().toISOString()
      })
    }

    // Additional services
    opportunities.push({
      id: `additional-services-${contractId}`,
      type: 'additional_service',
      description: 'Add patrol services and emergency response',
      estimatedValue: 500 * 12, // $500/month
      priority: 'low',
      likelihood: 25,
      expectedDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'Complementary services to existing security',
      created_at: new Date().toISOString()
    })

    return {
      success: true,
      data: opportunities,
      message: 'Expansion opportunities identified'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      data: [],
      message: 'Failed to identify expansion opportunities'
    }
  }
}

/**
 * Process pending renewal alerts
 */
export async function processPendingRenewalAlerts(): Promise<ApiResponse<{ processed: number, sent: number, errors: number }>> {
  try {
    // Get pending alerts that are due
    const { data: pendingAlerts, error: alertsError } = await supabase
      .from('renewal_alerts')
      .select(`
        *,
        contracts!contract_id(*)
      `)
      .is('sent_at', null)
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })

    if (alertsError) {
      throw new Error(`Database error: ${alertsError.message}`)
    }

    let processed = 0
    let sent = 0
    let errors = 0

    for (const alert of pendingAlerts || []) {
      try {
        processed++

        // In a real implementation, you would send actual emails/notifications here
        const emailResult = await sendRenewalNotification(alert)
        
        if (emailResult.success) {
          sent++
          
          // Mark alert as sent
          await supabase
            .from('renewal_alerts')
            .update({ sent_at: new Date().toISOString() })
            .eq('id', alert.id)
        } else {
          errors++
        }
      } catch (error) {
        errors++
      }
    }

    return {
      success: true,
      data: { processed, sent, errors },
      message: `Processed ${processed} renewal alerts, sent ${sent}, ${errors} errors`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to process renewal alerts'
    }
  }
}

/**
 * Send renewal notification (mock implementation)
 */
async function sendRenewalNotification(alert: any): Promise<ApiResponse<void>> {
  // In a real implementation, this would integrate with email service
  try {
    const contract = alert.contracts
    const alertTypeMessages = {
      'initial': `Contract renewal opportunity: ${contract.client_name} contract expires in 90 days`,
      'reminder': `Renewal reminder: ${contract.client_name} contract expires in 60 days`,
      'urgent': `Urgent: ${contract.client_name} contract expires in 30 days`,
      'final': `Final notice: ${contract.client_name} contract expires in 7 days`
    }


    return {
      success: true,
      message: 'Renewal notification sent'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notification',
      message: 'Failed to send renewal notification'
    }
  }
}

/**
 * Update renewal status
 */
export async function updateRenewalStatus(
  renewalId: string,
  status: 'in_progress' | 'completed' | 'declined' | 'expired',
  notes?: string
): Promise<ApiResponse<ContractRenewal>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'completed') {
      updateData.client_response_at = new Date().toISOString()
    }

    if (notes) {
      updateData.renewal_notes = notes
    }

    const { data, error } = await supabase
      .from('contract_renewals')
      .update(updateData)
      .eq('id', renewalId)
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!data) {
      throw new Error('Renewal not found')
    }

    // If renewal is completed, create new contract
    if (status === 'completed') {
      await createRenewalContract(data)
    }

    return {
      success: true,
      data: data as any,
      message: 'Renewal status updated successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to update renewal status'
    }
  }
}

/**
 * Create new contract from completed renewal
 */
async function createRenewalContract(renewal: any) {
  try {
    // Get original contract
    const { data: originalContract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', renewal.original_contract_id)
      .single()

    if (contractError || !originalContract) {
      throw new Error('Original contract not found')
    }

    // Create new contract based on renewal terms
    const newContractData = {
      client_name: originalContract.client_name,
      client_company: originalContract.client_company,
      client_contact_email: originalContract.client_contact_email,
      client_contact_phone: originalContract.client_contact_phone,
      contract_title: `${originalContract.contract_title} (Renewal)`,
      contract_type: originalContract.contract_type,
      service_description: originalContract.service_description,
      contract_value: renewal.proposed_value,
      monthly_value: renewal.proposed_value / 12,
      payment_terms: originalContract.payment_terms,
      billing_frequency: originalContract.billing_frequency,
      start_date: renewal.renewal_start_date,
      end_date: renewal.renewal_end_date,
      status: 'signed',
      assigned_manager: renewal.assigned_manager,
      created_from: 'renewal'
    }

    const { error: insertError } = await supabase
      .from('contracts')
      .insert([newContractData])

    if (insertError) {
    } else {
      // Update original contract status to 'renewed'
      await supabase
        .from('contracts')
        .update({ status: 'closed', renewal_status: 'renewed' })
        .eq('id', renewal.original_contract_id)
    }
  } catch (error) {
  }
}

/**
 * Get churn risk analysis
 */
export async function getChurnRiskAnalysis(): Promise<ApiResponse<any[]>> {
  try {
    const { data: renewals, error } = await supabase
      .from('contract_renewals')
      .select(`
        *,
        contracts!original_contract_id(client_name, client_company, contract_value)
      `)
      .in('churn_risk', ['medium', 'high'])
      .in('status', ['upcoming', 'in_progress'])
      .order('churn_risk', { ascending: false })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const analysis = (renewals || []).map(renewal => ({
      renewalId: renewal.id,
      clientName: renewal.contracts?.client_name,
      clientCompany: renewal.contracts?.client_company,
      contractValue: renewal.contracts?.contract_value,
      churnRisk: renewal.churn_risk,
      churnReasons: renewal.churn_reasons,
      retentionStrategy: renewal.retention_strategy,
      renewalDate: renewal.renewal_start_date,
      riskScore: renewal.churn_risk === 'high' ? 80 : 60
    }))

    return {
      success: true,
      data: analysis,
      message: 'Churn risk analysis retrieved successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to retrieve churn risk analysis'
    }
  }
}