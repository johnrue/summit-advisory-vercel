'use client'

import { useState } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { GripVertical, Plus, Eye, Save, Trash2, Filter, Database, FileBarChart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReportField {
  id: string
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  table: string
  displayName?: string
}

interface ReportFilter {
  id: string
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in'
  value: string | number | string[]
}

interface CustomReport {
  id: string
  name: string
  description: string
  fields: ReportField[]
  filters: ReportFilter[]
  sortBy?: string
  sortOrder: 'asc' | 'desc'
  createdAt: Date
  createdBy: string
  isTemplate: boolean
}

const availableFields: Record<string, ReportField[]> = {
  guards: [
    { id: 'guard_id', name: 'id', type: 'string', table: 'guards', displayName: 'Guard ID' },
    { id: 'guard_name', name: 'full_name', type: 'string', table: 'guards', displayName: 'Full Name' },
    { id: 'guard_email', name: 'email', type: 'string', table: 'guards', displayName: 'Email' },
    { id: 'guard_phone', name: 'phone', type: 'string', table: 'guards', displayName: 'Phone' },
    { id: 'guard_status', name: 'status', type: 'string', table: 'guards', displayName: 'Status' },
    { id: 'guard_hire_date', name: 'hire_date', type: 'date', table: 'guards', displayName: 'Hire Date' },
    { id: 'guard_license', name: 'license_number', type: 'string', table: 'guards', displayName: 'License Number' }
  ],
  applications: [
    { id: 'app_id', name: 'id', type: 'string', table: 'applications', displayName: 'Application ID' },
    { id: 'app_name', name: 'applicant_name', type: 'string', table: 'applications', displayName: 'Applicant Name' },
    { id: 'app_email', name: 'email', type: 'string', table: 'applications', displayName: 'Email' },
    { id: 'app_status', name: 'status', type: 'string', table: 'applications', displayName: 'Status' },
    { id: 'app_stage', name: 'pipeline_stage', type: 'string', table: 'applications', displayName: 'Pipeline Stage' },
    { id: 'app_date', name: 'applied_date', type: 'date', table: 'applications', displayName: 'Applied Date' }
  ],
  shifts: [
    { id: 'shift_id', name: 'id', type: 'string', table: 'shifts', displayName: 'Shift ID' },
    { id: 'shift_title', name: 'title', type: 'string', table: 'shifts', displayName: 'Title' },
    { id: 'shift_location', name: 'location', type: 'string', table: 'shifts', displayName: 'Location' },
    { id: 'shift_start', name: 'start_time', type: 'date', table: 'shifts', displayName: 'Start Time' },
    { id: 'shift_end', name: 'end_time', type: 'date', table: 'shifts', displayName: 'End Time' },
    { id: 'shift_status', name: 'status', type: 'string', table: 'shifts', displayName: 'Status' },
    { id: 'shift_rate', name: 'hourly_rate', type: 'number', table: 'shifts', displayName: 'Hourly Rate' }
  ]
}

const operatorOptions = {
  string: [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' }
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'between', label: 'Between' }
  ],
  date: [
    { value: 'equals', label: 'On Date' },
    { value: 'greater_than', label: 'After Date' },
    { value: 'less_than', label: 'Before Date' },
    { value: 'between', label: 'Date Range' }
  ],
  boolean: [
    { value: 'equals', label: 'Equals' }
  ]
}

function SortableField({ field }: { field: ReportField }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-2 bg-muted rounded-md"
      {...attributes}
    >
      <div className="flex items-center space-x-2">
        <GripVertical 
          className="h-4 w-4 text-muted-foreground cursor-grab" 
          {...listeners}
        />
        <div>
          <div className="text-sm font-medium">{field.displayName || field.name}</div>
          <div className="text-xs text-muted-foreground">{field.table}.{field.name}</div>
        </div>
      </div>
      <Badge variant="outline">{field.type}</Badge>
    </div>
  )
}

export function CustomReportBuilder() {
  const [reportBuilder, setReportBuilder] = useState({
    name: '',
    description: '',
    selectedFields: [] as ReportField[],
    filters: [] as ReportFilter[],
    sortBy: '',
    sortOrder: 'asc' as 'asc' | 'desc'
  })

  const [savedReports, setSavedReports] = useState<CustomReport[]>([
    {
      id: '1',
      name: 'Active Guards Summary',
      description: 'Summary of all active guards with contact information',
      fields: availableFields.guards.slice(0, 4),
      filters: [
        { id: '1', field: 'status', operator: 'equals', value: 'active' }
      ],
      sortBy: 'full_name',
      sortOrder: 'asc',
      createdAt: new Date(),
      createdBy: 'Admin',
      isTemplate: false
    }
  ])

  const [showPreview, setShowPreview] = useState(false)
  const [previewData] = useState([
    { id: '1', full_name: 'John Doe', email: 'john@example.com', phone: '555-0123', status: 'active' },
    { id: '2', full_name: 'Jane Smith', email: 'jane@example.com', phone: '555-0124', status: 'active' },
    { id: '3', full_name: 'Bob Johnson', email: 'bob@example.com', phone: '555-0125', status: 'inactive' }
  ])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setReportBuilder(prev => {
        const oldIndex = prev.selectedFields.findIndex(field => field.id === active.id)
        const newIndex = prev.selectedFields.findIndex(field => field.id === over?.id)
        
        const newFields = [...prev.selectedFields]
        const [reorderedField] = newFields.splice(oldIndex, 1)
        newFields.splice(newIndex, 0, reorderedField)
        
        return { ...prev, selectedFields: newFields }
      })
    }
  }

  const handleAddField = (field: ReportField) => {
    if (!reportBuilder.selectedFields.find(f => f.id === field.id)) {
      setReportBuilder(prev => ({
        ...prev,
        selectedFields: [...prev.selectedFields, field]
      }))
    }
  }

  const handleRemoveField = (fieldId: string) => {
    setReportBuilder(prev => ({
      ...prev,
      selectedFields: prev.selectedFields.filter(f => f.id !== fieldId)
    }))
  }

  const handleAddFilter = () => {
    const newFilter: ReportFilter = {
      id: `filter-${Date.now()}`,
      field: '',
      operator: 'equals',
      value: ''
    }
    setReportBuilder(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }))
  }

  const handleUpdateFilter = (filterId: string, updates: Partial<ReportFilter>) => {
    setReportBuilder(prev => ({
      ...prev,
      filters: prev.filters.map(filter =>
        filter.id === filterId ? { ...filter, ...updates } : filter
      )
    }))
  }

  const handleRemoveFilter = (filterId: string) => {
    setReportBuilder(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== filterId)
    }))
  }

  const handleSaveReport = () => {
    if (!reportBuilder.name || reportBuilder.selectedFields.length === 0) {
      return
    }

    const newReport: CustomReport = {
      id: `report-${Date.now()}`,
      name: reportBuilder.name,
      description: reportBuilder.description,
      fields: reportBuilder.selectedFields,
      filters: reportBuilder.filters,
      sortBy: reportBuilder.sortBy,
      sortOrder: reportBuilder.sortOrder,
      createdAt: new Date(),
      createdBy: 'Current User',
      isTemplate: false
    }

    setSavedReports(prev => [newReport, ...prev])
    
    // Reset builder
    setReportBuilder({
      name: '',
      description: '',
      selectedFields: [],
      filters: [],
      sortBy: '',
      sortOrder: 'asc'
    })
  }

  const handleLoadReport = (report: CustomReport) => {
    setReportBuilder({
      name: report.name,
      description: report.description,
      selectedFields: report.fields,
      filters: report.filters,
      sortBy: report.sortBy || '',
      sortOrder: report.sortOrder
    })
  }

  const getFieldType = (fieldId: string): string => {
    for (const tableFields of Object.values(availableFields)) {
      const field = tableFields.find(f => f.id === fieldId)
      if (field) return field.type
    }
    return 'string'
  }

  return (
    <div className="space-y-6">
      {/* Report Builder */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Configuration */}
        <div className="space-y-6">
          {/* Report Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Configuration</CardTitle>
              <CardDescription>Define your custom report structure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="report-name">Report Name</Label>
                <Input
                  id="report-name"
                  value={reportBuilder.name}
                  onChange={(e) => setReportBuilder(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter report name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="report-description">Description</Label>
                <Textarea
                  id="report-description"
                  value={reportBuilder.description}
                  onChange={(e) => setReportBuilder(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the report"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Available Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Fields</CardTitle>
              <CardDescription>Click to add fields to your report</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.entries(availableFields).map(([tableName, fields]) => (
                <div key={tableName} className="mb-4">
                  <h4 className="font-medium mb-2 capitalize">{tableName}</h4>
                  <div className="grid gap-2">
                    {fields.map((field) => (
                      <Button
                        key={field.id}
                        variant="outline"
                        size="sm"
                        className="justify-start h-auto p-2"
                        onClick={() => handleAddField(field)}
                        disabled={reportBuilder.selectedFields.some(f => f.id === field.id)}
                      >
                        <Database className="h-4 w-4 mr-2" />
                        <div className="text-left">
                          <div className="text-sm font-medium">{field.displayName || field.name}</div>
                          <div className="text-xs text-muted-foreground">{field.type}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Selected Fields & Filters */}
        <div className="space-y-6">
          {/* Selected Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selected Fields</CardTitle>
              <CardDescription>Drag to reorder, click × to remove</CardDescription>
            </CardHeader>
            <CardContent>
              {reportBuilder.selectedFields.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={reportBuilder.selectedFields}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {reportBuilder.selectedFields.map((field) => (
                        <div key={field.id} className="flex items-center justify-between">
                          <SortableField field={field} />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveField(field.id)}
                            className="ml-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No fields selected. Add fields from the left panel.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Filters</CardTitle>
                  <CardDescription>Add conditions to filter your data</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleAddFilter}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {reportBuilder.filters.length > 0 ? (
                <div className="space-y-4">
                  {reportBuilder.filters.map((filter, index) => (
                    <div key={filter.id} className="p-3 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Filter {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFilter(filter.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Field</Label>
                          <Select
                            value={filter.field}
                            onValueChange={(value) => handleUpdateFilter(filter.id, { field: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {reportBuilder.selectedFields.map((field) => (
                                <SelectItem key={field.id} value={field.name}>
                                  {field.displayName || field.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Operator</Label>
                          <Select
                            value={filter.operator}
                            onValueChange={(value) => handleUpdateFilter(filter.id, { operator: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {operatorOptions[getFieldType(filter.field) as keyof typeof operatorOptions]?.map((op) => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <Label>Value</Label>
                        <Input
                          value={filter.value as string}
                          onChange={(e) => handleUpdateFilter(filter.id, { value: e.target.value })}
                          placeholder="Enter filter value"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No filters added. Click "Add Filter" to create conditions.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <div className="space-x-2">
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={reportBuilder.selectedFields.length === 0}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Report Preview</DialogTitle>
                <DialogDescription>
                  Preview of your custom report with sample data
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-96 overflow-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-muted">
                      {reportBuilder.selectedFields.map((field) => (
                        <th key={field.id} className="border border-gray-200 px-4 py-2 text-left">
                          {field.displayName || field.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index}>
                        {reportBuilder.selectedFields.map((field) => (
                          <td key={field.id} className="border border-gray-200 px-4 py-2">
                            {row[field.name as keyof typeof row] || 'N/A'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <Button 
          onClick={handleSaveReport}
          disabled={!reportBuilder.name || reportBuilder.selectedFields.length === 0}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Report
        </Button>
      </div>

      {/* Saved Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Reports</CardTitle>
          <CardDescription>Your custom reports and templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {savedReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <h4 className="font-medium">{report.name}</h4>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline">{report.fields.length} fields</Badge>
                    <Badge variant="outline">{report.filters.length} filters</Badge>
                    {report.isTemplate && <Badge variant="secondary">Template</Badge>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleLoadReport(report)}
                  >
                    Load
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileBarChart className="h-4 w-4 mr-2" />
                    Run
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