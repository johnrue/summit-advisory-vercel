"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Calendar, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import type { CalendarProvider, OAuthConnection } from '@/lib/types/oauth-types'

interface CalendarOAuthConnectProps {
  provider: CalendarProvider
  connection?: OAuthConnection
  onConnect: (provider: CalendarProvider) => Promise<void>
  onDisconnect: (provider: CalendarProvider) => Promise<void>
  isLoading?: boolean
  className?: string
}

const PROVIDER_CONFIG = {
  google_calendar: {
    name: 'Google Calendar',
    description: 'Sync your shifts and availability with Google Calendar',
    icon: '📅',
    color: 'bg-blue-500',
    permissions: [
      'Read and write calendar events',
      'Access your calendar information'
    ]
  },
  microsoft_outlook: {
    name: 'Microsoft Outlook',
    description: 'Sync your shifts and availability with Outlook Calendar',
    icon: '📧',
    color: 'bg-blue-600',
    permissions: [
      'Read and write calendar events',
      'Access your profile information'
    ]
  },
  microsoft_exchange: {
    name: 'Microsoft Exchange',
    description: 'Sync with your organization\'s Exchange calendar',
    icon: '🏢',
    color: 'bg-gray-600',
    permissions: [
      'Read and write calendar events',
      'Access your organization calendar'
    ]
  }
}

export default function CalendarOAuthConnect({
  provider,
  connection,
  onConnect,
  onDisconnect,
  isLoading = false,
  className = ''
}: CalendarOAuthConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const config = PROVIDER_CONFIG[provider]
  const isConnected = connection?.isConnected ?? false
  const connectionStatus = connection?.connectionStatus ?? 'disconnected'

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      setError(null)
      await onConnect(provider)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect calendar')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true)
      setError(null)
      await onDisconnect(provider)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect calendar')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )
      case 'expired':
        return (
          <Badge variant="destructive" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Token Expired
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            Not Connected
          </Badge>
        )
    }
  }

  const isActionLoading = isLoading || isConnecting || isDisconnecting

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center text-white text-sm font-medium`}>
              {config.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{config.name}</CardTitle>
              <CardDescription className="text-sm">
                {config.description}
              </CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isConnected && connection && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Connected Account:</span>
              <span className="font-medium">{connection.userEmail}</span>
            </div>
            
            {connection.lastSync && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Sync:</span>
                <span className="font-medium">
                  {new Date(connection.lastSync).toLocaleDateString()} at{' '}
                  {new Date(connection.lastSync).toLocaleTimeString()}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sync Status:</span>
              <span className={`font-medium ${connection.syncEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {connection.syncEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        )}

        {!isConnected && (
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2">This integration will allow:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {config.permissions.map((permission, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                    {permission}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Your calendar data stays secure. We only export your assigned shifts and availability - 
                we never read or import events from your personal calendar.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          {isConnected ? (
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleConnect}
                disabled={isActionLoading}
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Refresh Connection
              </Button>
              
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDisconnect}
                disabled={isActionLoading}
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <AlertCircle className="h-4 w-4 mr-2" />
                )}
                Disconnect
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleConnect}
              disabled={isActionLoading}
              className="w-full"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Connect {config.name}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}