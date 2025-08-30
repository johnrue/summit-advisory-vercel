import { useState, useEffect } from 'react'
import { 
  DashboardStateManagementService,
  DashboardState
} from '@/lib/services/dashboard-state-management-service'
import { FilterCriteria } from '@/lib/types/unified-leads'

export function useDashboardState() {
  const [state, setState] = useState<DashboardState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initializeDashboard()
    
    // Subscribe to state changes
    const unsubscribe = DashboardStateManagementService.subscribe((newState) => {
      setState(newState)
    })

    return () => {
      unsubscribe()
      DashboardStateManagementService.cleanup()
    }
  }, [])

  const initializeDashboard = async () => {
    setIsLoading(true)
    try {
      // TODO: Get actual user ID from auth context
      const userId = 'current-user-id'
      const result = await DashboardStateManagementService.initializeDashboardState(userId)
      
      if (result.success) {
        setState(result.data)
      } else {
        setError(result.error || 'Failed to initialize dashboard')
      }
    } catch (err) {
      setError('Failed to initialize dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const updateFilters = async (userId: string, filters: FilterCriteria) => {
    const result = await DashboardStateManagementService.updateFilters(userId, filters)
    if (!result.success) {
      setError(result.error || 'Failed to update filters')
    }
    return result
  }

  const switchView = async (userId: string, viewId: string) => {
    const result = await DashboardStateManagementService.switchView(userId, viewId)
    if (!result.success) {
      setError(result.error || 'Failed to switch view')
    }
    return result
  }

  const refreshDashboard = () => {
    DashboardStateManagementService.refreshDashboard()
  }

  return {
    state,
    isLoading,
    error,
    updateFilters,
    switchView,
    refreshDashboard
  }
}