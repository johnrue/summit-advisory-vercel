'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, Download, FileText, Table, FileJson, Loader2, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface ExportConfig {
  dataType: string
  format: string
  dateRange: {
    from?: Date
    to?: Date
  }
  fields: string[]
  filters: Record<string, any>
}

interface ExportProgress {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  fileName?: string
  downloadUrl?: string
  error?: string
  createdAt: Date
}

const dataTypeOptions = [
  { value: 'guards', label: 'Guard Profiles', description: 'Complete guard information and status' },
  { value: 'applications', label: 'Applications', description: 'Hiring pipeline and application data' },
  { value: 'shifts', label: 'Shifts', description: 'Scheduling and shift assignment data' },
  { value: 'compliance', label: 'Compliance Records', description: 'Certification and audit data' },
  { value: 'audit-logs', label: 'Audit Logs', description: 'System activity and security logs' }
]

const formatOptions = [
  { value: 'csv', label: 'CSV', icon: Table, description: 'Comma-separated values for spreadsheet analysis' },
  { value: 'pdf', label: 'PDF', icon: FileText, description: 'Formatted report for printing and sharing' },
  { value: 'json', label: 'JSON', icon: FileJson, description: 'Structured data for system integration' }
]

const fieldOptions: Record<string, string[]> = {
  guards: ['id', 'full_name', 'email', 'phone', 'status', 'license_number', 'hire_date', 'certifications'],
  applications: ['id', 'applicant_name', 'email', 'status', 'pipeline_stage', 'applied_date', 'ai_score'],
  shifts: ['id', 'title', 'location', 'start_time', 'end_time', 'status', 'assigned_guard', 'hourly_rate'],
  compliance: ['guard_id', 'certification_type', 'issue_date', 'expiry_date', 'status', 'renewal_required'],
  'audit-logs': ['timestamp', 'user_id', 'action', 'resource_type', 'resource_id', 'ip_address', 'user_agent']
}

export function DataExportPanel() {
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    dataType: '',
    format: 'csv',
    dateRange: {},
    fields: [],
    filters: {}
  })
  const [exportHistory, setExportHistory] = useState<ExportProgress[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [sizeEstimate, setSizeEstimate] = useState<{ recordCount: number; estimatedSize: string } | null>(null)
  const [estimating, setEstimating] = useState(false)

  const handleExport = async () => {
    if (!exportConfig.dataType || !exportConfig.format) {
      return
    }

    setIsExporting(true)
    
    const exportId = `export-${Date.now()}`
    const newExport: ExportProgress = {
      id: exportId,
      status: 'processing',
      progress: 0,
      createdAt: new Date()
    }
    
    setExportHistory(prev => [newExport, ...prev])

    // Simulate export progress
    const progressInterval = setInterval(() => {
      setExportHistory(prev => 
        prev.map(exp => 
          exp.id === exportId 
            ? { ...exp, progress: Math.min(exp.progress + 15, 90) }
            : exp
        )
      )
    }, 300)

    try {
      // Call the export API
      const response = await fetch('/api/v1/exports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportConfig)
      })

      const result = await response.json()
      
      clearInterval(progressInterval)
      
      if (result.success) {
        setExportHistory(prev => 
          prev.map(exp => 
            exp.id === exportId 
              ? { 
                  ...exp, 
                  status: 'completed',
                  progress: 100,
                  fileName: result.fileName,
                  downloadUrl: result.downloadUrl
                }
              : exp
          )
        )
      } else {
        setExportHistory(prev => 
          prev.map(exp => 
            exp.id === exportId 
              ? { 
                  ...exp, 
                  status: 'failed',
                  error: result.error || 'Export failed. Please try again.'
                }
              : exp
          )
        )
      }
    } catch (error) {
      clearInterval(progressInterval)
      setExportHistory(prev => 
        prev.map(exp => 
          exp.id === exportId 
            ? { 
                ...exp, 
                status: 'failed',
                error: error instanceof Error ? error.message : 'Export failed. Please try again.'
              }
            : exp
        )
      )
    } finally {
      setIsExporting(false)
    }
  }

  const handleFieldToggle = (field: string) => {
    setExportConfig(prev => ({
      ...prev,
      fields: prev.fields.includes(field)
        ? prev.fields.filter(f => f !== field)
        : [...prev.fields, field]
    }))
  }

  const availableFields = exportConfig.dataType ? fieldOptions[exportConfig.dataType] || [] : []

  // Estimate export size when configuration changes
  const handleSizeEstimation = async () => {
    if (!exportConfig.dataType || !exportConfig.format) {
      setSizeEstimate(null)
      return
    }

    setEstimating(true)
    try {
      const response = await fetch('/api/v1/exports/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportConfig)
      })

      const result = await response.json()
      
      if (result.success) {
        setSizeEstimate({
          recordCount: result.recordCount,
          estimatedSize: result.estimatedSize
        })
      } else {
        setSizeEstimate(null)
      }
    } catch (error) {
      console.error('Size estimation failed:', error)
      setSizeEstimate(null)
    } finally {
      setEstimating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Export Configuration */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Export Configuration</CardTitle>
            <CardDescription>Configure your data export settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Data Type Selection */}
            <div className="space-y-2">
              <Label>Data Type</Label>
              <Select
                value={exportConfig.dataType}
                onValueChange={(value) => setExportConfig(prev => ({ ...prev, dataType: value, fields: [] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select data type to export" />
                </SelectTrigger>
                <SelectContent>
                  {dataTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select
                value={exportConfig.format}
                onValueChange={(value) => setExportConfig(prev => ({ ...prev, format: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formatOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center">
                        <option.icon className="h-4 w-4 mr-2" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range (Optional)</Label>
              <div className="flex space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !exportConfig.dateRange.from && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {exportConfig.dateRange.from ? (
                        format(exportConfig.dateRange.from, 'PPP')
                      ) : (
                        'From date'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={exportConfig.dateRange.from}
                      onSelect={(date) => 
                        setExportConfig(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, from: date }
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !exportConfig.dateRange.to && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {exportConfig.dateRange.to ? (
                        format(exportConfig.dateRange.to, 'PPP')
                      ) : (
                        'To date'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={exportConfig.dateRange.to}
                      onSelect={(date) => 
                        setExportConfig(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, to: date }
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Field Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Field Selection</CardTitle>
            <CardDescription>Choose which fields to include in the export</CardDescription>
          </CardHeader>
          <CardContent>
            {availableFields.length > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExportConfig(prev => ({ ...prev, fields: availableFields }))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExportConfig(prev => ({ ...prev, fields: [] }))}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {availableFields.map((field) => (
                    <div key={field} className="flex items-center space-x-2">
                      <Checkbox
                        id={field}
                        checked={exportConfig.fields.includes(field)}
                        onCheckedChange={() => handleFieldToggle(field)}
                      />
                      <Label htmlFor={field} className="text-sm font-normal">
                        {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Select a data type to see available fields</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Size Estimation */}
      {(exportConfig.dataType && exportConfig.format && exportConfig.fields.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Export Preview</CardTitle>
            <CardDescription>Estimated size and record count for your export</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                {sizeEstimate ? (
                  <>
                    <div className="text-sm">
                      <span className="font-medium">Records:</span> {sizeEstimate.recordCount.toLocaleString()}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Estimated Size:</span> {sizeEstimate.estimatedSize}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Click "Estimate Size" to preview export details
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={handleSizeEstimation}
                disabled={estimating}
                size="sm"
              >
                {estimating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                Estimate Size
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Action */}
      <div className="flex justify-end">
        <Button
          onClick={handleExport}
          disabled={!exportConfig.dataType || !exportConfig.format || exportConfig.fields.length === 0 || isExporting}
          size="lg"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isExporting ? 'Generating Export...' : 'Generate Export'}
        </Button>
      </div>

      {/* Export History */}
      {exportHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Export History</CardTitle>
            <CardDescription>Recent export operations and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {exportHistory.map((exportItem) => (
                <div
                  key={exportItem.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          exportItem.status === 'completed' ? 'success' :
                          exportItem.status === 'failed' ? 'destructive' :
                          exportItem.status === 'processing' ? 'secondary' :
                          'outline'
                        }
                      >
                        {exportItem.status}
                      </Badge>
                      {exportItem.fileName && (
                        <span className="text-sm font-medium">{exportItem.fileName}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {exportItem.createdAt.toLocaleString()}
                    </p>
                    {exportItem.error && (
                      <p className="text-xs text-red-600">{exportItem.error}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {exportItem.status === 'processing' && (
                      <div className="w-24">
                        <Progress value={exportItem.progress} className="h-2" />
                      </div>
                    )}
                    {exportItem.status === 'completed' && exportItem.downloadUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={exportItem.downloadUrl} download>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}