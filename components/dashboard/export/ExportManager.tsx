"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { exportUnifiedLeads, ExportOptions, ExportResult } from '@/lib/services/unified-export-service'
import { FilterCriteria } from '@/lib/types/unified-leads'
import { Download, FileSpreadsheet, Calendar, Settings, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface ExportManagerProps {
  currentFilters: FilterCriteria
  availableColumns?: string[]
  onExportComplete?: (result: ExportResult) => void
}

const DEFAULT_COLUMNS = [
  'id',
  'pipeline_type', 
  'first_name',
  'last_name',
  'email',
  'phone',
  'service_type',
  'source_type',
  'status',
  'assigned_manager',
  'estimated_value',
  'qualification_score',
  'created_at',
  'assigned_at',
  'last_contact_date',
  'next_follow_up_date',
  'contact_count',
  'qualification_notes'
]

const COLUMN_LABELS: Record<string, string> = {
  id: 'Lead ID',
  pipeline_type: 'Pipeline Type',
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  service_type: 'Service Type',
  source_type: 'Source',
  status: 'Status',
  assigned_manager: 'Assigned Manager',
  estimated_value: 'Estimated Value',
  qualification_score: 'Qualification Score',
  created_at: 'Created Date',
  assigned_at: 'Assigned Date',
  last_contact_date: 'Last Contact',
  next_follow_up_date: 'Next Follow-up',
  contact_count: 'Contact Count',
  qualification_notes: 'Notes'
}

export function ExportManager({ currentFilters, availableColumns, onExportComplete }: ExportManagerProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeAnalytics: false,
    includePipeline: 'both',
    columns: DEFAULT_COLUMNS,
    groupBy: undefined
  })

  const handleExport = async () => {
    setIsExporting(true)
    
    try {
      const result = await exportUnifiedLeads(currentFilters, exportOptions)
      
      if (result.success && result.data) {
        // Create download link
        const blob = new Blob([result.data.data], { type: result.data.mimeType })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.data.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        toast.success(`Export completed! Downloaded ${result.data.recordCount} records`)
        onExportComplete?.(result.data)
      } else {
        toast.error(result.error || 'Export failed')
      }
    } catch (error) {
      toast.error('An unexpected error occurred during export')
    } finally {
      setIsExporting(false)
    }
  }

  const toggleColumn = (column: string) => {
    setExportOptions(prev => ({
      ...prev,
      columns: prev.columns?.includes(column)
        ? prev.columns.filter(col => col !== column)
        : [...(prev.columns || []), column]
    }))
  }

  const selectAllColumns = () => {
    setExportOptions(prev => ({
      ...prev,
      columns: DEFAULT_COLUMNS
    }))
  }

  const clearAllColumns = () => {
    setExportOptions(prev => ({
      ...prev,
      columns: []
    }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Export lead data and analytics based on current filters
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Export</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-6">
              {/* Format Selection */}
              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select
                  value={exportOptions.format}
                  onValueChange={(value) => 
                    setExportOptions(prev => ({ ...prev, format: value as 'csv' | 'xlsx' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        CSV (Comma Separated Values)
                      </div>
                    </SelectItem>
                    <SelectItem value="xlsx">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel (XLSX)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pipeline Selection */}
              <div className="space-y-2">
                <Label>Include Pipelines</Label>
                <Select
                  value={exportOptions.includePipeline}
                  onValueChange={(value) => 
                    setExportOptions(prev => ({ ...prev, includePipeline: value as 'both' | 'client' | 'guard' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both Client & Guard Pipelines</SelectItem>
                    <SelectItem value="client">Client Pipeline Only</SelectItem>
                    <SelectItem value="guard">Guard Pipeline Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Analytics Option */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="analytics"
                  checked={exportOptions.includeAnalytics}
                  onCheckedChange={(checked) =>
                    setExportOptions(prev => ({ ...prev, includeAnalytics: !!checked }))
                  }
                />
                <Label htmlFor="analytics">Include analytics summary sheet</Label>
              </div>

              <Separator />

              {/* Export Button */}
              <Button 
                onClick={handleExport}
                disabled={isExporting || !exportOptions.columns?.length}
                className="w-full"
                size="lg"
              >
                {isExporting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Generating Export...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export {exportOptions.format.toUpperCase()}
                  </>
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-6 mt-6">
              {/* Column Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Select Columns to Export</Label>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={selectAllColumns}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearAllColumns}>
                      Clear All
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border rounded">
                  {DEFAULT_COLUMNS.map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={column}
                        checked={exportOptions.columns?.includes(column)}
                        onCheckedChange={() => toggleColumn(column)}
                      />
                      <Label htmlFor={column} className="text-sm">
                        {COLUMN_LABELS[column] || column}
                      </Label>
                    </div>
                  ))}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Selected: {exportOptions.columns?.length || 0} of {DEFAULT_COLUMNS.length} columns
                </div>
              </div>

              {/* Grouping Options */}
              <div className="space-y-2">
                <Label>Group By (Optional)</Label>
                <Select
                  value={exportOptions.groupBy || 'none'}
                  onValueChange={(value) => 
                    setExportOptions(prev => ({ 
                      ...prev, 
                      groupBy: value === 'none' ? undefined : value as 'manager' | 'source' | 'status' | 'date'
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Grouping</SelectItem>
                    <SelectItem value="manager">Group by Manager</SelectItem>
                    <SelectItem value="source">Group by Source</SelectItem>
                    <SelectItem value="status">Group by Status</SelectItem>
                    <SelectItem value="date">Group by Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Export Button */}
              <Button 
                onClick={handleExport}
                disabled={isExporting || !exportOptions.columns?.length}
                className="w-full"
                size="lg"
              >
                {isExporting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Generating Export...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export {exportOptions.format.toUpperCase()} with Advanced Options
                  </>
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="scheduled" className="space-y-4 mt-6">
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4" />
                <h3 className="font-medium mb-2">Scheduled Reports</h3>
                <p className="text-sm mb-4">
                  Set up automated reports to be delivered via email on a schedule
                </p>
                <Button variant="outline" disabled>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Scheduled Reports
                </Button>
                <p className="text-xs mt-2">Coming soon</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Current Filters Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Export Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Date Range: {currentFilters.dateRange.start.toLocaleDateString()} - {currentFilters.dateRange.end.toLocaleDateString()}
              </Badge>
              
              {currentFilters.sources && currentFilters.sources.length > 0 && (
                <Badge variant="outline">
                  Sources: {currentFilters.sources.join(', ')}
                </Badge>
              )}
              
              {currentFilters.statuses && currentFilters.statuses.length > 0 && (
                <Badge variant="outline">
                  Statuses: {currentFilters.statuses.join(', ')}
                </Badge>
              )}
              
              {currentFilters.assignedManagers && currentFilters.assignedManagers.length > 0 && (
                <Badge variant="outline">
                  Managers: {currentFilters.assignedManagers.length} selected
                </Badge>
              )}
              
              {currentFilters.searchTerm && (
                <Badge variant="outline">
                  Search: "{currentFilters.searchTerm}"
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              These filters will be applied to the export data
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}