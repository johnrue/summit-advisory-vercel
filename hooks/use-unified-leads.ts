import { useState, useEffect } from 'react'
import { UnifiedLead, LeadAnalytics, FilterCriteria } from '@/lib/types/unified-leads'
import { UnifiedLeadDashboardService } from '@/lib/services/unified-lead-dashboard-service'

export function useUnifiedLeads(filters?: FilterCriteria) {
  const [leads, setLeads] = useState<UnifiedLead[]>([])
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLeads()
  }, [filters])

  const fetchLeads = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const [leadsResult, analyticsResult] = await Promise.all([
        UnifiedLeadDashboardService.getUnifiedLeads(filters || {}),
        UnifiedLeadDashboardService.getLeadAnalytics(filters || {})
      ])

      if (leadsResult.success && leadsResult.data) {
        setLeads(leadsResult.data.leads)
        // Also set analytics from lead response if available
        if (leadsResult.data.analytics) {
          setAnalytics(leadsResult.data.analytics)
        }
      } else {
        const errorMessage = typeof leadsResult.error === 'string' ? leadsResult.error : 'Failed to fetch leads'
        setError(errorMessage)
      }

      if (analyticsResult.success && analyticsResult.data) {
        setAnalytics(analyticsResult.data)
      } else if (!leadsResult.data?.analytics) {
        // Only set analytics error if we didn't get analytics from leads response
        const errorMsg = typeof analyticsResult.error === 'string' ? analyticsResult.error : 'Failed to fetch analytics'
        setError(errorMsg)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = () => {
    fetchLeads()
  }

  return {
    leads,
    analytics,
    isLoading,
    error,
    refetch
  }
}