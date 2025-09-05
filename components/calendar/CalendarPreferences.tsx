"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Save, 
  Loader2, 
  CheckCircle, 
  Shield, 
  Clock, 
  Bell, 
  Calendar,
  Eye,
  EyeOff,
  Info,
  Users,
  MapPin
} from 'lucide-react'
import type { CalendarPreferences, SyncFrequency } from '@/lib/types/oauth-types'

interface CalendarPreferencesProps {
  userId: string
  integrationId: string
  userRole: 'admin' | 'manager' | 'guard'
  onPreferencesChange?: (preferences: CalendarPreferences) => void
  className?: string
}

interface PreferencesFormData {
  sync_shifts: boolean
  sync_availability: boolean
  sync_time_off: boolean
  include_client_info: boolean
  include_site_details: boolean
  include_guard_names: boolean
  sync_frequency: SyncFrequency
  timezone_preference: string
  notify_sync_success: boolean
  notify_sync_failures: boolean
}

const SYNC_FREQUENCIES = [
  { value: 'real_time', label: 'Real-time', description: 'Sync immediately when changes occur' },
  { value: 'hourly', label: 'Hourly', description: 'Sync every hour' },
  { value: 'daily', label: 'Daily', description: 'Sync once per day' },
  { value: 'manual', label: 'Manual only', description: 'Only sync when manually triggered' }
] as const

const TIMEZONES = [
  { value: 'user_local', label: 'My Local Time Zone' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' }
]

export default function CalendarPreferences({
  userId,
  integrationId,
  userRole,
  onPreferencesChange,
  className = ''
}: CalendarPreferencesProps) {
  const [preferences, setPreferences] = useState<PreferencesFormData>({
    sync_shifts: true,
    sync_availability: true,
    sync_time_off: true,
    include_client_info: false,
    include_site_details: true,
    include_guard_names: false,
    sync_frequency: 'real_time',
    timezone_preference: 'user_local',
    notify_sync_success: false,
    notify_sync_failures: true
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load existing preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/v1/calendar/sync/preferences?integration_id=${integrationId}`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.preferences) {
            setPreferences(data.preferences)
          }
        }
        
        setError(null)
      } catch (err) {
        setError('Failed to load preferences')
      } finally {
        setLoading(false)
      }
    }
    
    loadPreferences()
  }, [integrationId])


  const savePreferences = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/v1/calendar/sync/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          integration_id: integrationId,
          preferences
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save preferences')
      }

      const data = await response.json()
      setSaved(true)
      
      // Clear saved indicator after 3 seconds
      setTimeout(() => setSaved(false), 3000)

      if (onPreferencesChange) {
        onPreferencesChange(data.preferences)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = <K extends keyof PreferencesFormData>(
    key: K, 
    value: PreferencesFormData[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const getPrivacyBadge = () => {
    const privacyLevel = preferences.include_client_info ? 'high' : 
                        preferences.include_site_details ? 'medium' : 'low'
    
    const config = {
      high: { color: 'bg-red-100 text-red-800 border-red-200', text: 'High Detail' },
      medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Medium Detail' },
      low: { color: 'bg-green-100 text-green-800 border-green-200', text: 'Private' }
    }

    return (
      <Badge className={config[privacyLevel].color}>
        <Shield className="h-3 w-3 mr-1" />
        {config[privacyLevel].text}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <CardTitle>Loading preferences...</CardTitle>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Calendar Sync Preferences
            </CardTitle>
            <CardDescription>
              Configure what data to sync and how often to sync it
            </CardDescription>
          </div>
          {getPrivacyBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {saved && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Preferences saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Sync Data Types */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
            Data to Sync
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Work Shifts</Label>
                <p className="text-sm text-muted-foreground">
                  Sync your assigned security shifts to your calendar
                </p>
              </div>
              <Switch
                checked={preferences.sync_shifts}
                onCheckedChange={(checked) => updatePreference('sync_shifts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Availability</Label>
                <p className="text-sm text-muted-foreground">
                  {userRole === 'guard' 
                    ? 'Sync your availability windows when you\'re available for work'
                    : 'Sync team availability windows for scheduling planning'
                  }
                </p>
              </div>
              <Switch
                checked={preferences.sync_availability}
                onCheckedChange={(checked) => updatePreference('sync_availability', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Time Off</Label>
                <p className="text-sm text-muted-foreground">
                  {userRole === 'guard'
                    ? 'Sync your approved time off requests to block calendar time'
                    : 'Sync team time off requests for planning and coverage'
                  }
                </p>
              </div>
              <Switch
                checked={preferences.sync_time_off}
                onCheckedChange={(checked) => updatePreference('sync_time_off', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Privacy & Detail Settings */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground flex items-center">
            <Eye className="h-4 w-4 mr-2" />
            Event Details & Privacy
          </h4>

          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              These settings control what information appears in your external calendar events. 
              Consider your privacy and security needs when enabling detailed information.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Client Information
                </Label>
                <p className="text-sm text-muted-foreground">
                  Include client names in calendar event titles and descriptions
                </p>
              </div>
              <Switch
                checked={preferences.include_client_info}
                onCheckedChange={(checked) => updatePreference('include_client_info', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Site Details
                </Label>
                <p className="text-sm text-muted-foreground">
                  Include site names and location information in calendar events
                </p>
              </div>
              <Switch
                checked={preferences.include_site_details}
                onCheckedChange={(checked) => updatePreference('include_site_details', checked)}
              />
            </div>

            {(userRole === 'manager' || userRole === 'admin') && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Guard Names
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Include guard names in calendar events for shifts and availability
                  </p>
                </div>
                <Switch
                  checked={preferences.include_guard_names}
                  onCheckedChange={(checked) => updatePreference('include_guard_names', checked)}
                />
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Sync Timing */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Sync Timing
          </h4>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base">Sync Frequency</Label>
              <Select
                value={preferences.sync_frequency}
                onValueChange={(value: SyncFrequency) => updatePreference('sync_frequency', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYNC_FREQUENCIES.map(freq => (
                    <SelectItem key={freq.value} value={freq.value}>
                      <div className="space-y-1">
                        <div className="font-medium">{freq.label}</div>
                        <div className="text-sm text-muted-foreground">{freq.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-base">Timezone</Label>
              <Select
                value={preferences.timezone_preference}
                onValueChange={(value) => updatePreference('timezone_preference', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Notifications */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            Sync Notifications
          </h4>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Success Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when calendar sync completes successfully
                </p>
              </div>
              <Switch
                checked={preferences.notify_sync_success}
                onCheckedChange={(checked) => updatePreference('notify_sync_success', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Failure Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when calendar sync encounters errors (recommended)
                </p>
              </div>
              <Switch
                checked={preferences.notify_sync_failures}
                onCheckedChange={(checked) => updatePreference('notify_sync_failures', checked)}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-6 border-t">
          <p className="text-sm text-muted-foreground">
            Changes will be applied to future sync operations
          </p>
          
          <Button 
            onClick={savePreferences}
            disabled={saving || saved}
            className="min-w-[120px]"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : saved ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}