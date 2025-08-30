'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LeadAnalytics, FilterCriteria } from '@/lib/types/unified-leads'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface UnifiedLeadAnalyticsProps {
  analytics?: LeadAnalytics | null
  filters?: FilterCriteria
  isLoading: boolean
}

export function UnifiedLeadAnalytics({ analytics, filters, isLoading }: UnifiedLeadAnalyticsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Loading analytics...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
          <CardDescription>
            Comprehensive analytics for unified lead management (Task 3 implementation)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Analytics dashboard will be implemented in Task 3: Lead Analytics Dashboard
          </div>
        </CardContent>
      </Card>
    </div>
  )
}