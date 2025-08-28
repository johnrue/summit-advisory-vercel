"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Clock,
  Activity,
  AlertCircle,
  TrendingUp,
  Calendar,
  Zap
} from 'lucide-react'
import type { CalendarConnectionStatus } from '@/lib/types/calendar-types'

interface CalendarSyncStatusProps {
  integrationId: string
  onRetrySync?: () => Promise<void>
  onRefreshStatus?: () => Promise<void>
  className?: string
}

interface SyncStats {
  syncs_24h: number
  events_synced_24h: number
  error_rate_24h: number
  avg_response_time_ms: number
  uptime_percentage: number
}

const PROVIDER_COLORS = {
  google_calendar: 'bg-blue-500',
  microsoft_outlook: 'bg-blue-600',
  microsoft_exchange: 'bg-gray-600'
}

const PROVIDER_NAMES = {
  google_calendar: 'Google Calendar',
  microsoft_outlook: 'Microsoft Outlook',
  microsoft_exchange: 'Microsoft Exchange'
}

export default function CalendarSyncStatus({
  integrationId,
  onRetrySync,
  onRefreshStatus,
  className = ''
}: CalendarSyncStatusProps) {
  const [status, setStatus] = useState<CalendarConnectionStatus | null>(null)
  const [stats, setStats] = useState<SyncStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch status and stats
  useEffect(() => {
    fetchStatus()
    fetchStats()
    
    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchStatus()
      fetchStats()
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(interval)
  }, [integrationId])

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/v1/calendar/sync/status?integration_id=${integrationId}`)
      if (!response.ok) throw new Error('Failed to fetch status')
      
      const data = await response.json()
      setStatus(data.status)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/v1/calendar/sync/stats?integration_id=${integrationId}`)
      if (!response.ok) return // Stats are optional
      
      const data = await response.json()
      setStats(data.stats)
    } catch (err) {
      // Stats are optional, don't show error
      console.warn('Failed to fetch sync stats:', err)
    }
  }

  const handleRetrySync = async () => {
    if (!onRetrySync) return
    
    try {
      setRetrying(true)
      setError(null)
      await onRetrySync()
      await fetchStatus()
      await fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed')
    } finally {
      setRetrying(false)
    }
  }

  const handleRefreshStatus = async () => {
    try {
      setRefreshing(true)
      setError(null)
      
      if (onRefreshStatus) {
        await onRefreshStatus()
      }
      
      await fetchStatus()
      await fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  const getStatusBadge = () => {
    if (!status) return null

    const statusConfig = {
      healthy: {
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle2,
        text: 'Healthy'
      },
      warning: {
        variant: 'secondary' as const,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: AlertTriangle,
        text: 'Warning'
      },
      error: {
        variant: 'destructive' as const,
        className: '',
        icon: XCircle,
        text: 'Error'
      },
      disconnected: {
        variant: 'outline' as const,
        className: 'bg-gray-100 text-gray-600 border-gray-200',
        icon: AlertCircle,
        text: 'Disconnected'
      }
    }

    const config = statusConfig[status.sync_health]
    const IconComponent = config.icon

    return (
      <Badge variant={config.variant} className={config.className}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    )
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <CardTitle className="text-lg">Loading sync status...</CardTitle>
          </div>
        </CardHeader>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Calendar Sync Status</CardTitle>
          <CardDescription>Unable to load sync status</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg ${PROVIDER_COLORS[status.provider]} flex items-center justify-center`}>
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {PROVIDER_NAMES[status.provider]} Sync
              </CardTitle>
              <CardDescription>
                Integration health and performance metrics
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshStatus}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Connection Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {status.is_connected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="text-sm text-muted-foreground">Connection</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {status.sync_enabled ? 'Enabled' : 'Disabled'}
            </div>
            <div className="text-sm text-muted-foreground">Sync Status</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {status.error_count_24h}
            </div>
            <div className="text-sm text-muted-foreground">Errors (24h)</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {status.last_sync_at ? formatDateTime(status.last_sync_at) : 'Never'}
            </div>
            <div className="text-sm text-muted-foreground">Last Sync</div>
          </div>
        </div>

        {/* Performance Statistics */}
        {stats && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Performance (24h)
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-700">{stats.syncs_24h}</div>
                    <div className="text-sm text-blue-600">Sync Operations</div>
                  </div>
                  <Zap className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-700">{stats.events_synced_24h}</div>
                    <div className="text-sm text-green-600">Events Synced</div>
                  </div>
                  <Calendar className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-purple-700">
                      {formatDuration(stats.avg_response_time_ms)}
                    </div>
                    <div className="text-sm text-purple-600">Avg Response</div>
                  </div>
                  <Clock className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Uptime and Error Rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Uptime</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.uptime_percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={stats.uptime_percentage} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Error Rate</span>
                  <span className="text-sm text-muted-foreground">
                    {(stats.error_rate_24h * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={stats.error_rate_24h * 100} 
                  className="h-2"
                  // @ts-ignore - Custom error styling would go here
                />
              </div>
            </div>
          </div>
        )}

        {/* Token Expiry Warning */}
        {status.token_expires_at && (
          (() => {
            const expiryTime = new Date(status.token_expires_at)
            const now = new Date()
            const hoursUntilExpiry = (expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60)
            
            if (hoursUntilExpiry < 24 && hoursUntilExpiry > 0) {
              return (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    Access token expires in {Math.round(hoursUntilExpiry)} hours. 
                    The connection will be automatically refreshed.
                  </AlertDescription>
                </Alert>
              )
            } else if (hoursUntilExpiry <= 0) {
              return (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Access token has expired. Please reconnect your calendar.
                  </AlertDescription>
                </Alert>
              )
            }
            return null
          })()
        )}

        {/* Action Buttons */}
        {status.sync_health !== 'healthy' && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {status.sync_health === 'error' ? 'Sync issues detected' : 'Monitoring for issues'}
            </div>
            
            {onRetrySync && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRetrySync}
                disabled={retrying}
              >
                {retrying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Retry Sync
              </Button>
            )}
          </div>
        )}

        {/* Next Sync Information */}
        {status.next_sync_at && status.sync_enabled && (
          <div className="text-sm text-muted-foreground text-center pt-2 border-t">
            Next automatic sync: {formatDateTime(status.next_sync_at)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}