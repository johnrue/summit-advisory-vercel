"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FileText, Download, Calendar, Mail, Settings, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface ComplianceReportsProps {
  userRole: 'admin' | 'manager' | 'guard'
}

export default function ComplianceReports({ userRole }: ComplianceReportsProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportForm, setReportForm] = useState({
    startDate: '',
    endDate: '',
    format: 'pdf' as 'pdf' | 'csv',
    includeSensitiveData: userRole === 'admin' || userRole === 'manager',
    recipients: ['compliance@summitadvisoryfirm.com']
  })

  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    description: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    recipients: ['compliance@summitadvisoryfirm.com'],
    isActive: true
  })

  // Mock data for recent reports
  const recentReports = [
    {
      id: '1',
      type: 'TOPS Compliance',
      period: '2024-01-01 to 2024-01-31',
      generatedAt: new Date('2024-02-01T10:00:00Z'),
      status: 'completed',
      downloadUrl: '#'
    },
    {
      id: '2',
      type: 'TOPS Compliance',
      period: '2023-12-01 to 2023-12-31',
      generatedAt: new Date('2024-01-01T10:00:00Z'),
      status: 'completed',
      downloadUrl: '#'
    }
  ]

  // Mock data for scheduled reports
  const scheduledReports = [
    {
      id: '1',
      name: 'Monthly TOPS Report',
      frequency: 'monthly',
      nextRun: new Date('2024-03-01T09:00:00Z'),
      status: 'active',
      lastRun: new Date('2024-02-01T09:00:00Z'),
      recipients: ['compliance@summitadvisoryfirm.com', 'manager@summitadvisoryfirm.com']
    }
  ]

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    try {
      // API call to generate report
      console.log('Generating report with parameters:', reportForm)
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      // Show success message
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleScheduleReport = async () => {
    try {
      console.log('Creating schedule:', scheduleForm)
      // API call to create schedule
    } catch (error) {
      console.error('Error creating schedule:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">TOPS Compliance Reports</h1>
        <p className="text-muted-foreground">
          Generate and manage Texas DPS compliance reports for Summit Advisory
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Generate New Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate New Report
            </CardTitle>
            <CardDescription>
              Create a TOPS compliance report for a specific date range
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={reportForm.startDate}
                  onChange={(e) => setReportForm(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={reportForm.endDate}
                  onChange={(e) => setReportForm(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Report Format</Label>
              <Select value={reportForm.format} onValueChange={(value: 'pdf' | 'csv') => 
                setReportForm(prev => ({ ...prev, format: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Report</SelectItem>
                  <SelectItem value="csv">CSV Data Export</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(userRole === 'admin' || userRole === 'manager') && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSensitive"
                  checked={reportForm.includeSensitiveData}
                  onCheckedChange={(checked) => 
                    setReportForm(prev => ({ ...prev, includeSensitiveData: !!checked }))
                  }
                />
                <Label htmlFor="includeSensitive" className="text-sm">
                  Include sensitive data (SSN, addresses)
                </Label>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="recipients">Email Recipients</Label>
              <Input
                id="recipients"
                placeholder="Enter email addresses separated by commas"
                value={reportForm.recipients.join(', ')}
                onChange={(e) => setReportForm(prev => ({ 
                  ...prev, 
                  recipients: e.target.value.split(',').map(email => email.trim())
                }))}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleGenerateReport} 
              disabled={isGenerating || !reportForm.startDate || !reportForm.endDate}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Schedule Automatic Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule Reports
            </CardTitle>
            <CardDescription>
              Set up automatic report generation and delivery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scheduleName">Schedule Name</Label>
              <Input
                id="scheduleName"
                placeholder="e.g., Monthly TOPS Compliance"
                value={scheduleForm.name}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={scheduleForm.frequency} onValueChange={(value: any) => 
                setScheduleForm(prev => ({ ...prev, frequency: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduleRecipients">Email Recipients</Label>
              <Input
                id="scheduleRecipients"
                placeholder="Enter email addresses separated by commas"
                value={scheduleForm.recipients.join(', ')}
                onChange={(e) => setScheduleForm(prev => ({ 
                  ...prev, 
                  recipients: e.target.value.split(',').map(email => email.trim())
                }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={scheduleForm.isActive}
                onCheckedChange={(checked) => 
                  setScheduleForm(prev => ({ ...prev, isActive: !!checked }))
                }
              />
              <Label htmlFor="isActive" className="text-sm">
                Activate schedule immediately
              </Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleScheduleReport}
              disabled={!scheduleForm.name}
              className="w-full"
            >
              <Settings className="mr-2 h-4 w-4" />
              Create Schedule
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>
            View and download previously generated compliance reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">{report.type}</div>
                  <div className="text-sm text-muted-foreground">
                    Period: {report.period}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Generated: {format(report.generatedAt, 'PPpp')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                    {report.status}
                  </Badge>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Reports</CardTitle>
          <CardDescription>
            Manage automatic report generation schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scheduledReports.map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">{schedule.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Frequency: {schedule.frequency}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Next run: {format(schedule.nextRun, 'PPpp')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Recipients: {schedule.recipients.length} email(s)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={schedule.status === 'active' ? 'default' : 'secondary'}>
                    {schedule.status}
                  </Badge>
                  <Button size="sm" variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Test Email
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}