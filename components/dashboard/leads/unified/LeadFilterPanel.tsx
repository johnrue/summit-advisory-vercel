'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  Calendar,
  Filter,
  Save,
  Search,
  X,
  Plus,
  Settings2,
  BookOpen,
  Star
} from 'lucide-react'
import { FilterCriteria, DateRange } from '@/lib/types/unified-leads'
import { UnifiedLeadFilterService, FilterPreset } from '@/lib/services/unified-lead-filter-service'
import { toast } from 'sonner'

interface LeadFilterPanelProps {
  currentFilters?: FilterCriteria
  onFiltersChange: (filters: FilterCriteria) => void
  onSavePreset: (name: string, description: string, filters: FilterCriteria) => void
}

export function LeadFilterPanel({
  currentFilters = {},
  onFiltersChange,
  onSavePreset
}: LeadFilterPanelProps) {
  const [filters, setFilters] = useState<FilterCriteria>(currentFilters)
  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetDescription, setPresetDescription] = useState('')
  const [loadingPresets, setLoadingPresets] = useState(false)
  const [dateRangeMode, setDateRangeMode] = useState<'preset' | 'custom'>('preset')

  // Load filter presets on mount
  useEffect(() => {
    loadFilterPresets()
  }, [])

  // Sync filters with parent changes
  useEffect(() => {
    setFilters(currentFilters)
  }, [currentFilters])

  const loadFilterPresets = async () => {
    setLoadingPresets(true)
    try {
      // TODO: Get actual user ID from auth context
      const userId = 'current-user-id'
      const result = await UnifiedLeadFilterService.getFilterPresets(userId)
      
      if (result.success) {
        setPresets(result.data || [])
      } else {
        toast.error('Failed to load filter presets')
      }
    } catch (error) {
      toast.error('Failed to load filter presets')
    } finally {
      setLoadingPresets(false)
    }
  }

  const handleFilterChange = (key: keyof FilterCriteria, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleDateRangeChange = (range: DateRange) => {
    handleFilterChange('dateRange', range)
  }

  const clearAllFilters = () => {
    const emptyFilters: FilterCriteria = {}
    setFilters(emptyFilters)
    onFiltersChange(emptyFilters)
  }

  const applyPreset = async (preset: FilterPreset) => {
    try {
      // TODO: Get actual user ID from auth context
      const userId = 'current-user-id'
      const result = await UnifiedLeadFilterService.applyFilterPreset(userId, preset.id)
      
      if (result.success) {
        setFilters(result.data)
        onFiltersChange(result.data)
        toast.success(`Applied preset: ${preset.name}`)
      } else {
        toast.error('Failed to apply preset')
      }
    } catch (error) {
      toast.error('Failed to apply preset')
    }
  }

  const saveCurrentFilters = async () => {
    if (!presetName.trim()) {
      toast.error('Please enter a preset name')
      return
    }

    try {
      // TODO: Get actual user ID from auth context
      const userId = 'current-user-id'
      const result = await UnifiedLeadFilterService.saveFilterPreset(
        userId,
        presetName,
        presetDescription,
        filters
      )
      
      if (result.success) {
        toast.success(`Saved preset: ${presetName}`)
        setShowSaveDialog(false)
        setPresetName('')
        setPresetDescription('')
        await loadFilterPresets()
        onSavePreset(presetName, presetDescription, filters)
      } else {
        toast.error(result.error || 'Failed to save preset')
      }
    } catch (error) {
      toast.error('Failed to save preset')
    }
  }

  const getDateRangePresets = () => [
    {
      label: 'Today',
      value: {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    },
    {
      label: 'Last 7 days',
      value: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    },
    {
      label: 'Last 30 days',
      value: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    },
    {
      label: 'Last 90 days',
      value: {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    }
  ]

  const activeFiltersCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof FilterCriteria]
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0
    return value !== undefined && value !== null && value !== ''
  }).length

  return (
    <div className="space-y-6">
      {/* Filter Presets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium">Filter Presets</Label>
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save Current
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Filter Preset</DialogTitle>
                <DialogDescription>
                  Save your current filters as a preset for quick access later
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="preset-name">Preset Name</Label>
                  <Input
                    id="preset-name"
                    placeholder="e.g. 'New Client Leads'"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="preset-description">Description (Optional)</Label>
                  <Textarea
                    id="preset-description"
                    placeholder="Describe what this filter preset shows..."
                    value={presetDescription}
                    onChange={(e) => setPresetDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={saveCurrentFilters}>
                  Save Preset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => applyPreset(preset)}
            >
              <BookOpen className="h-3 w-3 mr-1" />
              {preset.name}
              {preset.isGlobal && (
                <Star className="h-3 w-3 ml-1 text-yellow-500" />
              )}
            </Button>
          ))}
          {presets.length === 0 && !loadingPresets && (
            <div className="text-sm text-muted-foreground">
              No saved presets. Save your current filters to create one.
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} applied
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-blue-600 hover:text-blue-800"
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Lead Type Filter */}
        <div className="space-y-2">
          <Label>Lead Type</Label>
          <div className="space-y-2">
            {[
              { value: 'client', label: 'Client Leads' },
              { value: 'guard', label: 'Guard Leads' }
            ].map((type) => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={type.value}
                  checked={filters.leadType?.includes(type.value as 'client' | 'guard') || false}
                  onCheckedChange={(checked) => {
                    const currentTypes = filters.leadType || []
                    if (checked) {
                      handleFilterChange('leadType', [...currentTypes, type.value])
                    } else {
                      handleFilterChange('leadType', currentTypes.filter(t => t !== type.value))
                    }
                  }}
                />
                <Label htmlFor={type.value} className="text-sm">
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label>Status</Label>
          <div className="space-y-2">
            {[
              { value: 'new', label: 'New' },
              { value: 'contacted', label: 'Contacted' },
              { value: 'qualified', label: 'Qualified' },
              { value: 'proposal', label: 'Proposal' },
              { value: 'negotiation', label: 'Negotiation' },
              { value: 'converted', label: 'Converted' },
              { value: 'lost', label: 'Lost' }
            ].map((status) => (
              <div key={status.value} className="flex items-center space-x-2">
                <Checkbox
                  id={status.value}
                  checked={filters.statuses?.includes(status.value as any) || false}
                  onCheckedChange={(checked) => {
                    const currentStatuses = filters.statuses || []
                    if (checked) {
                      handleFilterChange('statuses', [...currentStatuses, status.value])
                    } else {
                      handleFilterChange('statuses', currentStatuses.filter(s => s !== status.value))
                    }
                  }}
                />
                <Label htmlFor={status.value} className="text-sm">
                  {status.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Source Filter */}
        <div className="space-y-2">
          <Label>Lead Source</Label>
          <div className="space-y-2">
            {[
              { value: 'website', label: 'Website' },
              { value: 'qr-code', label: 'QR Code' },
              { value: 'social-media', label: 'Social Media' },
              { value: 'referral', label: 'Referral' },
              { value: 'job-board', label: 'Job Board' },
              { value: 'direct-contact', label: 'Direct Contact' }
            ].map((source) => (
              <div key={source.value} className="flex items-center space-x-2">
                <Checkbox
                  id={source.value}
                  checked={filters.sources?.includes(source.value as any) || false}
                  onCheckedChange={(checked) => {
                    const currentSources = filters.sources || []
                    if (checked) {
                      handleFilterChange('sources', [...currentSources, source.value])
                    } else {
                      handleFilterChange('sources', currentSources.filter(s => s !== source.value))
                    }
                  }}
                />
                <Label htmlFor={source.value} className="text-sm">
                  {source.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div className="space-y-2">
          <Label>Priority</Label>
          <div className="space-y-2">
            {[
              { value: 'critical', label: 'Critical (<1 hour old)', color: 'text-red-600' },
              { value: 'high', label: 'High (1-24 hours old)', color: 'text-orange-600' },
              { value: 'medium', label: 'Medium (1-3 days old)', color: 'text-yellow-600' },
              { value: 'low', label: 'Low (>3 days old)', color: 'text-gray-600' }
            ].map((priority) => (
              <div key={priority.value} className="flex items-center space-x-2">
                <Checkbox
                  id={priority.value}
                  checked={filters.priorities?.includes(priority.value as any) || false}
                  onCheckedChange={(checked) => {
                    const currentPriorities = filters.priorities || []
                    if (checked) {
                      handleFilterChange('priorities', [...currentPriorities, priority.value])
                    } else {
                      handleFilterChange('priorities', currentPriorities.filter(p => p !== priority.value))
                    }
                  }}
                />
                <Label htmlFor={priority.value} className={`text-sm ${priority.color}`}>
                  {priority.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="space-y-3">
        <Label>Date Range</Label>
        <div className="flex items-center space-x-2 mb-3">
          <Button
            variant={dateRangeMode === 'preset' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRangeMode('preset')}
          >
            Quick Ranges
          </Button>
          <Button
            variant={dateRangeMode === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRangeMode('custom')}
          >
            Custom Range
          </Button>
        </div>

        {dateRangeMode === 'preset' ? (
          <div className="grid grid-cols-2 gap-2">
            {getDateRangePresets().map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className={`justify-start ${
                  filters.dateRange?.start === preset.value.start &&
                  filters.dateRange?.end === preset.value.end
                    ? 'bg-blue-50 border-blue-200'
                    : ''
                }`}
                onClick={() => handleDateRangeChange(preset.value)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {preset.label}
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div>
              <Label htmlFor="start-date" className="text-xs">
                From
              </Label>
              <Input
                id="start-date"
                type="date"
                value={filters.dateRange?.start || ''}
                onChange={(e) => handleDateRangeChange({
                  start: e.target.value,
                  end: filters.dateRange?.end || new Date().toISOString().split('T')[0]
                })}
              />
            </div>
            <div>
              <Label htmlFor="end-date" className="text-xs">
                To
              </Label>
              <Input
                id="end-date"
                type="date"
                value={filters.dateRange?.end || ''}
                onChange={(e) => handleDateRangeChange({
                  start: filters.dateRange?.start || new Date().toISOString().split('T')[0],
                  end: e.target.value
                })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Range Filters */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Score Range (Guard Leads) */}
        <div className="space-y-2">
          <Label>Qualification Score Range</Label>
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              placeholder="Min"
              min="0"
              max="100"
              value={filters.scoreRange?.min || ''}
              onChange={(e) => handleFilterChange('scoreRange', {
                ...filters.scoreRange,
                min: e.target.value ? parseInt(e.target.value) : undefined
              })}
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="number"
              placeholder="Max"
              min="0"
              max="100"
              value={filters.scoreRange?.max || ''}
              onChange={(e) => handleFilterChange('scoreRange', {
                ...filters.scoreRange,
                max: e.target.value ? parseInt(e.target.value) : undefined
              })}
            />
          </div>
        </div>

        {/* Value Range (Client Leads) */}
        <div className="space-y-2">
          <Label>Estimated Value Range</Label>
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              placeholder="Min $"
              min="0"
              value={filters.valueRange?.min || ''}
              onChange={(e) => handleFilterChange('valueRange', {
                ...filters.valueRange,
                min: e.target.value ? parseInt(e.target.value) : undefined
              })}
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="number"
              placeholder="Max $"
              min="0"
              value={filters.valueRange?.max || ''}
              onChange={(e) => handleFilterChange('valueRange', {
                ...filters.valueRange,
                max: e.target.value ? parseInt(e.target.value) : undefined
              })}
            />
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={clearAllFilters}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  )
}