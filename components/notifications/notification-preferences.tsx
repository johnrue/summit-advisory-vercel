"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Bell, Mail, MessageSquare, Clock, Shield, Calendar, Settings, Save, Loader2 } from 'lucide-react'
import { NotificationPreferences, NotificationFrequency, NotificationPriority } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface NotificationPreferencesProps {
  userId: string
  className?: string
}

export default function NotificationPreferencesComponent({ userId, className }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (userId) {
      fetchPreferences()
    }
  }, [userId])

  const fetchPreferences = async () => {
    try {
      const response = await fetch(`/api/notifications/preferences?userId=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setPreferences(data.preferences)
      } else {
        console.error('Error fetching preferences:', data.error)
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!preferences) return

    const updatedPreferences = { ...preferences, ...updates }
    setPreferences(updatedPreferences)

    try {
      setSaving(true)
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          preferences: updates
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setPreferences(data.preferences)
        toast.success('Notification preferences updated')
      } else {
        // Revert changes on error
        setPreferences(preferences)
        toast.error('Failed to update preferences')
      }
    } catch (error) {
      // Revert changes on error
      setPreferences(preferences)
      toast.error('Failed to update preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <p className="text-muted-foreground">Failed to load notification preferences</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6" />
        <div>
          <h2 className="text-2xl font-bold">Notification Preferences</h2>
          <p className="text-muted-foreground">Control how and when you receive notifications</p>
        </div>
      </div>

      {/* Delivery Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Delivery Methods
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>In-App Notifications</Label>
                <p className="text-sm text-muted-foreground">Show notifications in the application</p>
              </div>
            </div>
            <Switch
              checked={preferences.inAppNotifications}
              onCheckedChange={(checked) => updatePreferences({ inAppNotifications: checked })}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Send notifications to your email address</p>
              </div>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => updatePreferences({ emailNotifications: checked })}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Send notifications to your phone</p>
                <Badge variant="secondary" className="mt-1">Coming Soon</Badge>
              </div>
            </div>
            <Switch
              checked={preferences.smsNotifications}
              onCheckedChange={(checked) => updatePreferences({ smsNotifications: checked })}
              disabled={true} // SMS not implemented yet
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Categories</CardTitle>
          <CardDescription>
            Control which types of notifications you receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div>
                <Label>Schedule Notifications</Label>
                <p className="text-sm text-muted-foreground">Shift assignments and schedule changes</p>
              </div>
            </div>
            <Switch
              checked={preferences.scheduleNotifications}
              onCheckedChange={(checked) => updatePreferences({ scheduleNotifications: checked })}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-orange-500" />
              <div>
                <Label>Compliance Notifications</Label>
                <p className="text-sm text-muted-foreground">Certification expiry and compliance alerts</p>
              </div>
            </div>
            <Switch
              checked={preferences.complianceNotifications}
              onCheckedChange={(checked) => updatePreferences({ complianceNotifications: checked })}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4 text-gray-500" />
              <div>
                <Label>System Notifications</Label>
                <p className="text-sm text-muted-foreground">System updates and maintenance alerts</p>
              </div>
            </div>
            <Switch
              checked={preferences.systemNotifications}
              onCheckedChange={(checked) => updatePreferences({ systemNotifications: checked })}
              disabled={saving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-red-500" />
              <div>
                <Label>Emergency Notifications</Label>
                <p className="text-sm text-muted-foreground">Critical alerts and emergency communications</p>
                <Badge variant="outline" className="mt-1">Always On</Badge>
              </div>
            </div>
            <Switch
              checked={preferences.emergencyNotifications}
              onCheckedChange={(checked) => updatePreferences({ emergencyNotifications: checked })}
              disabled={true} // Emergency notifications cannot be disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Delivery Schedule
          </CardTitle>
          <CardDescription>
            Configure when and how often you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Notification Frequency</Label>
            <p className="text-sm text-muted-foreground mb-2">
              How often to receive non-critical notifications
            </p>
            <Select
              value={preferences.notificationFrequency}
              onValueChange={(value: NotificationFrequency) => 
                updatePreferences({ notificationFrequency: value })
              }
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div>
            <Label>Minimum Priority Level</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Only show notifications above this priority level
            </p>
            <Select
              value={preferences.minimumPriority}
              onValueChange={(value: NotificationPriority) => 
                updatePreferences({ minimumPriority: value })
              }
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quiet Hours Start</Label>
              <p className="text-sm text-muted-foreground mb-2">No notifications during quiet hours</p>
              <Input
                type="time"
                value={preferences.quietHoursStart || ''}
                onChange={(e) => updatePreferences({ quietHoursStart: e.target.value })}
                disabled={saving}
              />
            </div>
            <div>
              <Label>Quiet Hours End</Label>
              <p className="text-sm text-muted-foreground mb-2">Resume normal notifications</p>
              <Input
                type="time"
                value={preferences.quietHoursEnd || ''}
                onChange={(e) => updatePreferences({ quietHoursEnd: e.target.value })}
                disabled={saving}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Weekend Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive notifications on weekends</p>
            </div>
            <Switch
              checked={preferences.weekendNotifications}
              onCheckedChange={(checked) => updatePreferences({ weekendNotifications: checked })}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Digest */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Digest
          </CardTitle>
          <CardDescription>
            Receive a summary of notifications via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Email Digest</Label>
              <p className="text-sm text-muted-foreground">
                Get a summary of your notifications in a single email
              </p>
            </div>
            <Switch
              checked={preferences.emailDigestEnabled}
              onCheckedChange={(checked) => updatePreferences({ emailDigestEnabled: checked })}
              disabled={saving}
            />
          </div>

          {preferences.emailDigestEnabled && (
            <>
              <Separator />
              <div>
                <Label>Digest Frequency</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  How often to send digest emails
                </p>
                <Select
                  value={preferences.emailDigestFrequency}
                  onValueChange={(value: NotificationFrequency) => 
                    updatePreferences({ emailDigestFrequency: value })
                  }
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      {saving && (
        <div className="flex items-center justify-center p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving preferences...
          </div>
        </div>
      )}
    </div>
  )
}