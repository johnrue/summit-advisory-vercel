import { supabase } from '@/lib/supabase'
import type { ApiResponse, ContractAnalytics, ContractStats, ContractFilters } from '@/lib/types'

/**
 * Get comprehensive contract analytics
 */
export async function getContractAnalytics(
  filters?: ContractFilters
): Promise<ApiResponse<ContractAnalytics>> {
  try {
    // Get all contracts with filters applied
    let baseQuery = supabase
      .from('contracts')
      .select(`
        *,
        users!assigned_manager(first_name, last_name, email)
      `)

    // Apply filters
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        baseQuery = baseQuery.in('status', filters.status)
      }
      if (filters.assignedManager) {
        baseQuery = baseQuery.eq('assigned_manager', filters.assignedManager)
      }
      if (filters.serviceType && filters.serviceType.length > 0) {
        baseQuery = baseQuery.in('contract_type', filters.serviceType)
      }
      if (filters.dateRange) {
        baseQuery = baseQuery
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end)
      }
    }

    const { data: contracts, error: contractsError } = await baseQuery

    if (contractsError) {
      throw new Error(`Database error: ${contractsError.message}`)
    }

    const contractsData = contracts || []

    // Get stage history for pipeline velocity
    const { data: stageHistory, error: historyError } = await supabase
      .from('contract_stage_history')
      .select('*')
      .order('changed_at', { ascending: true })

    if (historyError) {
      console.warn('Failed to fetch stage history:', historyError)
    }

    // Calculate overview stats
    const overview = calculateOverviewStats(contractsData)

    // Calculate pipeline velocity
    const pipelineVelocity = calculatePipelineVelocity(contractsData, stageHistory || [])

    // Calculate revenue forecasting
    const revenueForecasting = calculateRevenueForecasting(contractsData)

    // Calculate manager performance
    const managerPerformance = calculateManagerPerformance(contractsData)

    // Calculate renewal pipeline
    const renewalPipeline = calculateRenewalPipeline(contractsData)

    // Generate time series data
    const timeSeriesData = generateTimeSeriesData(contractsData)

    const analytics: ContractAnalytics = {
      overview,
      pipelineVelocity,
      revenueForecasting,
      managerPerformance,
      renewalPipeline,
      timeSeriesData
    }

    return {
      success: true,
      data: analytics,
      message: 'Contract analytics calculated successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to calculate contract analytics'
    }
  }
}

/**
 * Calculate overview statistics
 */
function calculateOverviewStats(contracts: any[]): ContractStats {
  const totalContracts = contracts.length

  const byStatus = contracts.reduce((acc, contract) => {
    acc[contract.status] = (acc[contract.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const byServiceType = contracts.reduce((acc, contract) => {
    acc[contract.contract_type] = (acc[contract.contract_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalValue = contracts.reduce((sum, contract) => 
    sum + parseFloat(contract.contract_value || 0), 0)

  const monthlyRecurringRevenue = contracts
    .filter(c => ['signed', 'active'].includes(c.status))
    .reduce((sum, contract) => sum + parseFloat(contract.monthly_value || 0), 0)

  const averageContractValue = totalContracts > 0 ? totalValue / totalContracts : 0

  const signedContracts = byStatus['signed'] || 0
  const activeContracts = byStatus['active'] || 0
  const lostContracts = byStatus['lost'] || 0
  const totalProcessed = signedContracts + activeContracts + lostContracts
  const winRate = totalProcessed > 0 ? ((signedContracts + activeContracts) / totalProcessed) * 100 : 0

  // Calculate average sales cycle from creation to signed
  const signedContractTimes = contracts
    .filter(c => c.status === 'signed' && c.stage_changed_at)
    .map(c => {
      const createdDate = new Date(c.created_at)
      const signedDate = new Date(c.stage_changed_at)
      return Math.ceil((signedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    })

  const averageSalesCycle = signedContractTimes.length > 0
    ? signedContractTimes.reduce((a, b) => a + b, 0) / signedContractTimes.length
    : 45

  // Renewal rate calculation (placeholder - would need renewal tracking)
  const renewalRate = 85

  // Expansion revenue (placeholder - would need expansion tracking)  
  const expansionRevenue = monthlyRecurringRevenue * 0.15

  return {
    totalContracts,
    byStatus,
    byServiceType,
    totalValue,
    monthlyRecurringRevenue,
    averageContractValue,
    winRate,
    averageSalesCycle,
    renewalRate,
    expansionRevenue
  }
}

/**
 * Calculate pipeline velocity metrics
 */
function calculatePipelineVelocity(contracts: any[], stageHistory: any[]) {
  const stages = ['prospect', 'proposal', 'negotiation', 'signed', 'active', 'renewal', 'closed', 'lost']
  
  return stages.map(stage => {
    const stageContracts = contracts.filter(c => c.status === stage)
    const totalInStage = stageContracts.length

    // Calculate average duration in stage
    const stageDurations = stageHistory
      .filter(h => h.new_status === stage)
      .map(h => {
        const nextStageChange = stageHistory.find(nh => 
          nh.contract_id === h.contract_id && 
          nh.changed_at > h.changed_at
        )
        if (nextStageChange) {
          const duration = new Date(nextStageChange.changed_at).getTime() - new Date(h.changed_at).getTime()
          return Math.ceil(duration / (1000 * 60 * 60 * 24)) // days
        }
        return null
      })
      .filter(d => d !== null)

    const averageDuration = stageDurations.length > 0
      ? stageDurations.reduce((a, b) => a! + b!, 0)! / stageDurations.length
      : 7 // Default 7 days

    // Calculate conversion rate (how many move to next stage)
    const nextStageConversions = stageHistory
      .filter(h => h.previous_status === stage)
      .length

    const conversionRate = totalInStage > 0 ? (nextStageConversions / totalInStage) * 100 : 0

    // Calculate bottleneck score (higher = more bottleneck)
    const bottleneckScore = averageDuration > 14 ? Math.min(100, averageDuration * 2) : 0

    return {
      stage: stage as any,
      averageDuration,
      conversionRate,
      bottleneckScore
    }
  })
}

/**
 * Calculate revenue forecasting
 */
function calculateRevenueForecasting(contracts: any[]) {
  const months = 6 // Forecast 6 months ahead
  const forecasting = []

  for (let i = 0; i < months; i++) {
    const forecastDate = new Date()
    forecastDate.setMonth(forecastDate.getMonth() + i)
    const monthKey = forecastDate.toISOString().slice(0, 7) // YYYY-MM

    // Base revenue from active contracts
    const baseRevenue = contracts
      .filter(c => c.status === 'active')
      .reduce((sum, contract) => sum + parseFloat(contract.monthly_value || 0), 0)

    // Projected revenue from pipeline
    const pipelineRevenue = contracts
      .filter(c => ['proposal', 'negotiation', 'signed'].includes(c.status))
      .reduce((sum, contract) => {
        const probability = getStageWinProbability(contract.status)
        return sum + (parseFloat(contract.monthly_value || 0) * probability)
      }, 0)

    const predictedRevenue = baseRevenue + pipelineRevenue

    // Confidence decreases over time
    const confidence = Math.max(50, 95 - (i * 10))

    const factors = []
    if (i === 0) factors.push('Current active contracts')
    if (pipelineRevenue > baseRevenue * 0.5) factors.push('Strong pipeline')
    if (i > 3) factors.push('Long-term projection')

    forecasting.push({
      month: monthKey,
      predictedRevenue: Math.round(predictedRevenue),
      confidence,
      factors
    })
  }

  return forecasting
}

/**
 * Get win probability by stage
 */
function getStageWinProbability(status: string): number {
  const probabilities: Record<string, number> = {
    'prospect': 0.1,
    'proposal': 0.3,
    'negotiation': 0.6,
    'signed': 1.0,
    'active': 1.0
  }
  return probabilities[status] || 0
}

/**
 * Calculate manager performance metrics
 */
function calculateManagerPerformance(contracts: any[]) {
  const managerGroups = contracts.reduce((acc, contract) => {
    const managerId = contract.assigned_manager
    if (!acc[managerId]) {
      acc[managerId] = {
        managerId,
        managerName: contract.users ? `${contract.users.first_name} ${contract.users.last_name}` : 'Unknown',
        contracts: []
      }
    }
    acc[managerId].contracts.push(contract)
    return acc
  }, {} as Record<string, any>)

  return Object.values(managerGroups).map((manager: any) => {
    const totalContracts = manager.contracts.length
    const totalValue = manager.contracts.reduce((sum: number, c: any) => 
      sum + parseFloat(c.contract_value || 0), 0)
    
    const wonContracts = manager.contracts.filter((c: any) => 
      ['signed', 'active'].includes(c.status)
    ).length
    
    const lostContracts = manager.contracts.filter((c: any) => c.status === 'lost').length
    const processedContracts = wonContracts + lostContracts
    
    const winRate = processedContracts > 0 ? (wonContracts / processedContracts) * 100 : 0
    const averageDealSize = totalContracts > 0 ? totalValue / totalContracts : 0

    return {
      managerId: manager.managerId,
      managerName: manager.managerName,
      totalContracts,
      totalValue: Math.round(totalValue),
      winRate: Math.round(winRate),
      averageDealSize: Math.round(averageDealSize)
    }
  })
}

/**
 * Calculate renewal pipeline
 */
function calculateRenewalPipeline(contracts: any[]) {
  const now = new Date()
  const sixMonthsFromNow = new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000)

  return contracts
    .filter(c => c.status === 'active' && c.end_date)
    .filter(c => {
      const endDate = new Date(c.end_date)
      return endDate <= sixMonthsFromNow
    })
    .map(contract => {
      const endDate = new Date(contract.end_date)
      const monthsUntilRenewal = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))
      
      // Calculate renewal probability based on contract age and performance
      let renewalProbability = 75 // Base 75% renewal rate
      if (monthsUntilRenewal < 1) renewalProbability += 10 // Urgent renewals often convert
      if (contract.contract_value > 50000) renewalProbability += 5 // High value contracts more likely to renew
      renewalProbability = Math.min(95, renewalProbability)

      // Calculate expansion potential
      const expansionPotential = parseFloat(contract.monthly_value || 0) * 0.2 // 20% expansion opportunity

      return {
        contractId: contract.id,
        clientName: contract.client_name,
        renewalDate: contract.end_date,
        currentValue: parseFloat(contract.contract_value || 0),
        renewalProbability: Math.round(renewalProbability),
        expansionPotential: Math.round(expansionPotential)
      }
    })
    .sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime())
}

/**
 * Generate time series data
 */
function generateTimeSeriesData(contracts: any[]) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const timeSeriesData = []

  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo)
    date.setDate(date.getDate() + i)
    const dateString = date.toISOString().split('T')[0]

    const dayContracts = contracts.filter(c => 
      c.created_at.split('T')[0] === dateString
    )

    const newContracts = dayContracts.length
    const contractValue = dayContracts.reduce((sum, c) => 
      sum + parseFloat(c.contract_value || 0), 0)

    const renewals = dayContracts.filter(c => c.created_from === 'renewal').length
    const expansions = dayContracts.filter(c => c.created_from === 'expansion').length

    timeSeriesData.push({
      date: dateString,
      newContracts,
      contractValue: Math.round(contractValue),
      renewals,
      expansions
    })
  }

  return timeSeriesData
}

/**
 * Export contract analytics data
 */
export async function exportContractAnalytics(
  filters?: ContractFilters,
  format: 'csv' | 'json' = 'csv'
): Promise<ApiResponse<{ data: string, filename: string }>> {
  try {
    const analyticsResult = await getContractAnalytics(filters)
    
    if (!analyticsResult.success || !analyticsResult.data) {
      throw new Error('Failed to generate analytics data')
    }

    const analytics = analyticsResult.data
    const timestamp = new Date().toISOString().split('T')[0]

    if (format === 'json') {
      return {
        success: true,
        data: {
          data: JSON.stringify(analytics, null, 2),
          filename: `contract_analytics_${timestamp}.json`
        },
        message: 'Analytics data exported successfully'
      }
    }

    // Generate CSV format
    let csvContent = 'Contract Analytics Export\n\n'
    
    // Overview stats
    csvContent += 'Overview Statistics\n'
    csvContent += 'Metric,Value\n'
    csvContent += `Total Contracts,${analytics.overview.totalContracts}\n`
    csvContent += `Total Value,${analytics.overview.totalValue}\n`
    csvContent += `Monthly Recurring Revenue,${analytics.overview.monthlyRecurringRevenue}\n`
    csvContent += `Win Rate,${analytics.overview.winRate}%\n`
    csvContent += `Average Sales Cycle,${analytics.overview.averageSalesCycle} days\n\n`

    // Manager performance
    csvContent += 'Manager Performance\n'
    csvContent += 'Manager,Total Contracts,Total Value,Win Rate,Average Deal Size\n'
    analytics.managerPerformance.forEach(manager => {
      csvContent += `${manager.managerName},${manager.totalContracts},${manager.totalValue},${manager.winRate}%,${manager.averageDealSize}\n`
    })

    return {
      success: true,
      data: {
        data: csvContent,
        filename: `contract_analytics_${timestamp}.csv`
      },
      message: 'Analytics data exported successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to export analytics data'
    }
  }
}