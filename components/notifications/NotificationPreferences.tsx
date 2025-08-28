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
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Calendar, 
  Users, 
  Shield, 
  Settings, 
  AlertTriangle,
  Clock,
  TestTube,
  RotateCcw,
  Download,
  Upload,
  Save,
  Check
} from 'lucide-react'
import { NotificationPreferencesService } from '@/lib/services/notification-preferences-service'
import type { 
  NotificationPreferences, 
  NotificationFrequency, 
  DigestFrequency, 
  NotificationPriority 
} from '@/lib/types/notification-types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface NotificationPreferencesProps {
  userId: string
  className?: string
}

export function NotificationPreferences({ userId, className }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const preferencesService = NotificationPreferencesService.getInstance()

  useEffect(() => {
    loadPreferences()
  }, [userId])

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      const result = await preferencesService.getPreferences(userId)
      if (result.success) {
        setPreferences(result.data)
      } else {
        toast.error('Failed to load notification preferences')
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
      toast.error('Error loading preferences')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return

    setPreferences(prev => ({
      ...prev!,
      [key]: value
    }))
    setHasChanges(true)
  }

  const savePreferences = async () => {
    if (!preferences || !hasChanges) return

    try {
      setIsSaving(true)
      const result = await preferencesService.updatePreferences(userId, preferences)
      
      if (result.success) {
        setPreferences(result.data)
        setHasChanges(false)
        toast.success('Preferences saved successfully')
      } else {
        toast.error('Failed to save preferences')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast.error('Error saving preferences')
    } finally {
      setIsSaving(false)
    }
  }

  const testNotification = async (channel: 'in_app' | 'email' | 'sms') => {
    try {
      const result = await preferencesService.testNotificationDelivery(userId, channel)
      if (result.success) {
        toast.success(`Test ${channel} notification sent!`)
      } else {
        toast.error(`Failed to send test ${channel} notification`)
      }
    } catch (error) {
      console.error('Error testing notification:', error)
      toast.error(`Error testing ${channel} notification`)
    }
  }

  const resetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset all preferences to defaults?')) return

    try {
      const result = await preferencesService.resetToDefaults(userId)
      if (result.success) {
        setPreferences(result.data)
        setHasChanges(false)
        toast.success('Preferences reset to defaults')
      } else {
        toast.error('Failed to reset preferences')
      }
    } catch (error) {
      console.error('Error resetting preferences:', error)
      toast.error('Error resetting preferences')
    }
  }

  const exportPreferences = async () => {
    try {
      const result = await preferencesService.exportPreferences(userId)
      if (result.success) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'notification-preferences.json'
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Preferences exported successfully')
      } else {
        toast.error('Failed to export preferences')
      }
    } catch (error) {
      console.error('Error exporting preferences:', error)
      toast.error('Error exporting preferences')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading notification preferences...</p>
        </div>
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
        <p>Failed to load notification preferences</p>
        <Button onClick={loadPreferences} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Preferences</h2>
          <p className="text-muted-foreground">
            Customize how and when you receive notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="mr-2">
              Unsaved changes
            </Badge>
          )}
          <Button
            onClick={savePreferences}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <Settings className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
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
              <Bell className="h-4 w-4 text-blue-600" />
              <div>
                <Label htmlFor="in-app">In-App Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications in the app interface
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="in-app"
                checked={preferences.in_app_notifications}
                onCheckedChange={(checked) => 
                  handlePreferenceChange('in_app_notifications', checked)
                }
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => testNotification('in_app')}
                className="ml-2"
              >
                <TestTube className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-green-600" />
              <div>
                <Label htmlFor="email">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications to your email address
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="email"
                checked={preferences.email_notifications}
                onCheckedChange={(checked) => 
                  handlePreferenceChange('email_notifications', checked)
                }
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => testNotification('email')}
                className="ml-2"
              >
                <TestTube className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-purple-600" />
              <div>
                <Label htmlFor="sms">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications via text message (coming soon)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="sms"
                checked={preferences.sms_notifications}
                onCheckedChange={(checked) => 
                  handlePreferenceChange('sms_notifications', checked)
                }
                disabled={true}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => testNotification('sms')}
                className="ml-2"
                disabled={true}
              >
                <TestTube className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Categories</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <Label htmlFor="schedule">Schedule Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Shift assignments, changes, and calendar updates
                </p>
              </div>
            </div>
            <Switch
              id="schedule"
              checked={preferences.schedule_notifications}
              onCheckedChange={(checked) => 
                handlePreferenceChange('schedule_notifications', checked)
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-green-600" />
              <div>
                <Label htmlFor="assignments">Assignment Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  New assignments and assignment changes
                </p>
              </div>
            </div>
            <Switch
              id="assignments"
              checked={preferences.assignment_notifications}
              onCheckedChange={(checked) => 
                handlePreferenceChange('assignment_notifications', checked)
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <Label htmlFor="availability">Availability Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Time-off requests and availability changes
                </p>
              </div>
            </div>
            <Switch
              id="availability"
              checked={preferences.availability_notifications}
              onCheckedChange={(checked) => 
                handlePreferenceChange('availability_notifications', checked)
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-red-600" />
              <div>
                <Label htmlFor="compliance">Compliance Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Certification renewals and compliance reminders
                </p>
              </div>
            </div>
            <Switch
              id="compliance"
              checked={preferences.compliance_notifications}
              onCheckedChange={(checked) => 
                handlePreferenceChange('compliance_notifications', checked)
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4 text-gray-600" />
              <div>
                <Label htmlFor="system">System Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  System updates and maintenance notifications
                </p>
              </div>
            </div>
            <Switch
              id="system"
              checked={preferences.system_notifications}
              onCheckedChange={(checked) => 
                handlePreferenceChange('system_notifications', checked)
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <Label htmlFor="emergency">Emergency Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Critical alerts and emergency communications (cannot be disabled)
                </p>
              </div>
            </div>
            <Switch
              id="emergency"
              checked={preferences.emergency_notifications}
              onCheckedChange={(checked) => 
                handlePreferenceChange('emergency_notifications', checked)
              }
              disabled={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Timing and Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>Timing & Frequency</CardTitle>
          <CardDescription>
            Control when and how often you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="frequency">Notification Frequency</Label>
              <Select
                value={preferences.notification_frequency}
                onValueChange={(value) => 
                  handlePreferenceChange('notification_frequency', value as NotificationFrequency)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="batched_5min">Every 5 minutes</SelectItem>
                  <SelectItem value="batched_1hr">Every hour</SelectItem>
                  <SelectItem value="daily_digest">Daily digest</SelectItem>
                  <SelectItem value="disabled">Disabled (emergency only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority">Minimum Priority</Label>
              <Select
                value={preferences.minimum_priority}
                onValueChange={(value) => 
                  handlePreferenceChange('minimum_priority', value as NotificationPriority)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select minimum priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low and above</SelectItem>
                  <SelectItem value="normal">Normal and above</SelectItem>
                  <SelectItem value="high">High and above</SelectItem>
                  <SelectItem value="urgent">Urgent and emergency only</SelectItem>
                  <SelectItem value="emergency">Emergency only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4" />
              <Label>Quiet Hours</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              During quiet hours, only urgent and emergency notifications will be delivered
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={preferences.quiet_hours_start || ''}
                  onChange={(e) => 
                    handlePreferenceChange('quiet_hours_start', e.target.value || null)
                  }
                />
              </div>
              <div>
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={preferences.quiet_hours_end || ''}
                  onChange={(e) => 
                    handlePreferenceChange('quiet_hours_end', e.target.value || null)
                  }
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="weekends">Weekend Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications on weekends (urgent and emergency always delivered)
              </p>
            </div>
            <Switch
              id="weekends"
              checked={preferences.weekend_notifications}
              onCheckedChange={(checked) => 
                handlePreferenceChange('weekend_notifications', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      {preferences.email_notifications && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Settings
            </CardTitle>
            <CardDescription>
              Configure email-specific notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="digest">Email Digest</Label>
                <p className="text-sm text-muted-foreground">
                  Receive a summary of notifications instead of individual emails
                </p>
              </div>
              <Switch
                id="digest"
                checked={preferences.email_digest_enabled}
                onCheckedChange={(checked) => 
                  handlePreferenceChange('email_digest_enabled', checked)
                }
              />
            </div>
            
            {preferences.email_digest_enabled && (
              <>
                <Separator />
                <div>
                  <Label htmlFor="digest-frequency">Digest Frequency</Label>
                  <Select
                    value={preferences.email_digest_frequency}
                    onValueChange={(value) => 
                      handlePreferenceChange('email_digest_frequency', value as DigestFrequency)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Additional actions for managing your notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
            
            <Button
              variant="outline"
              onClick={exportPreferences}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Preferences
            </Button>
            
            <Button
              variant="outline"
              onClick={loadPreferences}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Reload Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}