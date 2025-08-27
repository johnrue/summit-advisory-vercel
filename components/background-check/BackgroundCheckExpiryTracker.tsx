"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, User, RefreshCw } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import type { ExpiryReminderAlert } from '@/lib/types/background-check'
import { BackgroundCheckService } from '@/lib/services/background-check-service'

interface BackgroundCheckExpiryTrackerProps {
  showUpcoming?: boolean
  daysAhead?: number
  onReminderSent?: (applicationId: string) => void
  className?: string
}

export function BackgroundCheckExpiryTracker({
  showUpcoming = true,
  daysAhead = 30,
  onReminderSent,
  className
}: BackgroundCheckExpiryTrackerProps) {
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryReminderAlert[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  const backgroundCheckService = new BackgroundCheckService()

  const loadExpiryAlerts = async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const result = await backgroundCheckService.getExpiringBackgroundChecks(daysAhead)
      if (result.success) {
        setExpiryAlerts(result.data)
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load expiry alerts",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadExpiryAlerts()
  }, [daysAhead])

  const getExpiryUrgency = (daysUntilExpiry: number) => {
    if (daysUntilExpiry < 0) return { label: 'Expired', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: AlertTriangle }
    if (daysUntilExpiry <= 7) return { label: 'Urgent', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: AlertTriangle }
    if (daysUntilExpiry <= 14) return { label: 'Soon', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400', icon: Clock }
    return { label: 'Upcoming', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', icon: Clock }
  }

  const sortedAlerts = [...expiryAlerts].sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Background Check Expiry Tracker
            </CardTitle>
            <CardDescription>
              {expiryAlerts.length} background check(s) expiring within {daysAhead} days
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadExpiryAlerts(false)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {sortedAlerts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No expiring background checks found</p>
            <p className="text-sm">All background checks are current</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedAlerts.map((alert) => {
              const urgency = getExpiryUrgency(alert.daysUntilExpiry)
              const UrgencyIcon = urgency.icon

              return (
                <Card key={alert.applicationId} className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{alert.applicantName}</h4>
                          <Badge className={urgency.color}>
                            <UrgencyIcon className="h-3 w-3 mr-1" />
                            {urgency.label}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              Expires {format(alert.expiryDate, 'MMM d, yyyy')}
                              {alert.daysUntilExpiry >= 0 && (
                                <span className="ml-1">
                                  ({formatDistanceToNow(alert.expiryDate, { addSuffix: true })})
                                </span>
                              )}
                            </span>
                          </div>
                          
                          {alert.assignedManager && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{alert.assignedManager}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // TODO: Navigate to application details
                            console.log('Navigate to application:', alert.applicationId)
                          }}
                        >
                          View Application
                        </Button>
                        
                        {alert.daysUntilExpiry <= 7 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              // TODO: Send urgent reminder
                              onReminderSent?.(alert.applicationId)
                            }}
                          >
                            Send Reminder
                          </Button>
                        )}
                      </div>
                    </div>

                    {alert.lastReminderSent && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">
                          Last reminder sent: {format(alert.lastReminderSent, 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}