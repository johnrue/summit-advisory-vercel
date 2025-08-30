'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Calendar, Clock, Mail, Play, Pause, Trash2, Settings, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScheduledReport {
  id: string
  name: string
  description: string
  dataType: string
  format: string
  recipients: string[]
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string
    dayOfWeek?: number
    dayOfMonth?: number
  }
  isActive: boolean
  lastRun?: Date
  nextRun?: Date
  createdAt: Date
}

const frequencyOptions = [
  { value: 'daily', label: 'Daily', description: 'Run every day at specified time' },
  { value: 'weekly', label: 'Weekly', description: 'Run weekly on specified day and time' },
  { value: 'monthly', label: 'Monthly', description: 'Run monthly on specified date and time' }
]

const dataTypeOptions = [
  { value: 'guards', label: 'Guard Profiles' },
  { value: 'applications', label: 'Applications' },
  { value: 'shifts', label: 'Shifts' },
  { value: 'compliance', label: 'Compliance Records' }
]

const formatOptions = [
  { value: 'csv', label: 'CSV' },
  { value: 'pdf', label: 'PDF' },
  { value: 'json', label: 'JSON' }
]

const weekDays = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]

export function ReportScheduler() {
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newReport, setNewReport] = useState<Partial<ScheduledReport>>({
    name: '',
    description: '',
    dataType: '',
    format: 'pdf',
    recipients: [],
    schedule: {
      frequency: 'weekly',
      time: '09:00'
    },
    isActive: true
  })

  // Load scheduled reports on component mount
  useEffect(() => {
    loadScheduledReports()
  }, [])

  const loadScheduledReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/reports/scheduled')
      const result = await response.json()
      
      if (result.success) {
        setScheduledReports(result.reports || [])
      } else {
        console.error('Failed to load scheduled reports:', result.error)
      }
    } catch (error) {
      console.error('Error loading scheduled reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleReport = async (reportId: string) => {
    try {
      const report = scheduledReports.find(r => r.id === reportId)
      if (!report) return

      const response = await fetch('/api/v1/reports/scheduled', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: reportId,
          isActive: !report.isActive
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setScheduledReports(prev =>
          prev.map(r =>
            r.id === reportId
              ? { ...r, isActive: !r.isActive }
              : r
          )
        )
      } else {
        console.error('Failed to toggle report:', result.error)
      }
    } catch (error) {
      console.error('Error toggling report:', error)
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/v1/reports/scheduled?id=${reportId}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      
      if (result.success) {
        setScheduledReports(prev => prev.filter(report => report.id !== reportId))
      } else {
        console.error('Failed to delete report:', result.error)
      }
    } catch (error) {
      console.error('Error deleting report:', error)
    }
  }

  const handleCreateReport = async () => {
    if (!newReport.name || !newReport.dataType || !newReport.schedule?.frequency) {
      return
    }

    try {
      const response = await fetch('/api/v1/reports/scheduled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newReport)
      })

      const result = await response.json()
      
      if (result.success) {
        setScheduledReports(prev => [result.report, ...prev])
        setNewReport({
          name: '',
          description: '',
          dataType: '',
          format: 'pdf',
          recipients: [],
          schedule: {
            frequency: 'weekly',
            time: '09:00'
          },
          isActive: true
        })
        setShowCreateDialog(false)
      } else {
        console.error('Failed to create report:', result.error)
        // TODO: Show user-friendly error message
      }
    } catch (error) {
      console.error('Error creating report:', error)
      // TODO: Show user-friendly error message
    }
  }

  const getScheduleDescription = (report: ScheduledReport) => {
    const { schedule } = report
    if (schedule.frequency === 'daily') {
      return `Daily at ${schedule.time}`
    } else if (schedule.frequency === 'weekly') {
      const dayName = schedule.dayOfWeek !== undefined ? weekDays[schedule.dayOfWeek] : 'Sunday'
      return `Weekly on ${dayName} at ${schedule.time}`
    } else if (schedule.frequency === 'monthly') {
      const day = schedule.dayOfMonth || 1
      return `Monthly on day ${day} at ${schedule.time}`
    }
    return 'Unknown schedule'
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Scheduled Reports</h3>
          <p className="text-muted-foreground">Manage automated report generation and delivery</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Scheduled Report</DialogTitle>
              <DialogDescription>
                Configure a new automated report to be generated and delivered on schedule
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {/* Basic Information */}
              <div className="grid gap-2">
                <Label htmlFor="name">Report Name</Label>
                <Input
                  id="name"
                  value={newReport.name || ''}
                  onChange={(e) => setNewReport(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter report name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newReport.description || ''}
                  onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the report"
                  rows={2}
                />
              </div>

              {/* Report Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Data Type</Label>
                  <Select
                    value={newReport.dataType || ''}
                    onValueChange={(value) => setNewReport(prev => ({ ...prev, dataType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select data type" />
                    </SelectTrigger>
                    <SelectContent>
                      {dataTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Format</Label>
                  <Select
                    value={newReport.format || 'pdf'}
                    onValueChange={(value) => setNewReport(prev => ({ ...prev, format: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formatOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Schedule Configuration */}
              <Separator />
              <h4 className="font-medium">Schedule Configuration</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Frequency</Label>
                  <Select
                    value={newReport.schedule?.frequency || 'weekly'}
                    onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                      setNewReport(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule!, frequency: value }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={newReport.schedule?.time || '09:00'}
                    onChange={(e) => 
                      setNewReport(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule!, time: e.target.value }
                      }))
                    }
                  />
                </div>
              </div>

              {/* Additional schedule options */}
              {newReport.schedule?.frequency === 'weekly' && (
                <div className="grid gap-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={newReport.schedule.dayOfWeek?.toString() || '1'}
                    onValueChange={(value) => 
                      setNewReport(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule!, dayOfWeek: parseInt(value) }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weekDays.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newReport.schedule?.frequency === 'monthly' && (
                <div className="grid gap-2">
                  <Label>Day of Month</Label>
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    value={newReport.schedule.dayOfMonth || 1}
                    onChange={(e) => 
                      setNewReport(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule!, dayOfMonth: parseInt(e.target.value) }
                      }))
                    }
                  />
                </div>
              )}

              {/* Recipients */}
              <div className="grid gap-2">
                <Label>Email Recipients (Optional)</Label>
                <Input
                  placeholder="Enter email addresses separated by commas"
                  value={newReport.recipients?.join(', ') || ''}
                  onChange={(e) => 
                    setNewReport(prev => ({
                      ...prev,
                      recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                    }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateReport}>
                Create Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scheduled Reports List */}
      <div className="space-y-4">
        {scheduledReports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{report.name}</CardTitle>
                  {report.description && (
                    <CardDescription>{report.description}</CardDescription>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {getScheduleDescription(report)}
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      {report.recipients.length} recipient(s)
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={report.isActive ? 'success' : 'secondary'}>
                    {report.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Switch
                    checked={report.isActive}
                    onCheckedChange={() => handleToggleReport(report.id)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Data Type:</span> {report.dataType}
                  </div>
                  <div>
                    <span className="font-medium">Format:</span> {report.format.toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium">Last Run:</span>{' '}
                    {report.lastRun ? report.lastRun.toLocaleDateString() : 'Never'}
                  </div>
                  <div>
                    <span className="font-medium">Next Run:</span>{' '}
                    {report.nextRun && report.isActive ? report.nextRun.toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteReport(report.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {scheduledReports.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Scheduled Reports</h3>
              <p className="text-muted-foreground mb-4">
                Create your first automated report to get started
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Schedule
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}