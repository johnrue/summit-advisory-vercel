"use client"

import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Share2, Eye, Copy, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ShiftTemplateService, TemplateUsageStats } from '@/lib/services/shift-template-service'
import type { ShiftTemplate, ShiftTemplateCreateData, ApprovalStatus } from '@/lib/types/shift-types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const TEMPLATE_CATEGORIES = [
  'Security',
  'Event',
  'Construction',
  'Healthcare',
  'Retail',
  'Corporate',
  'Industrial',
  'Emergency'
]

interface TemplateCardProps {
  template: ShiftTemplate
  onEdit: (template: ShiftTemplate) => void
  onDelete: (template: ShiftTemplate) => void
  onView: (template: ShiftTemplate) => void
  onUse: (template: ShiftTemplate) => void
}

function TemplateCard({ template, onEdit, onDelete, onView, onUse }: TemplateCardProps) {
  const getStatusVariant = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved': return 'secondary'
      case 'pending': return 'secondary'
      case 'rejected': return 'destructive'
      case 'draft': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved': return 'text-green-600'
      case 'pending': return 'text-yellow-600'
      case 'rejected': return 'text-red-600'
      case 'draft': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              {template.name}
              {template.isShared && <Share2 className="w-4 h-4 text-blue-500" />}
              {template.usageCount > 10 && <Star className="w-4 h-4 text-yellow-500" />}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {template.category} • Used {template.usageCount} times
            </CardDescription>
          </div>
          <Badge variant={getStatusVariant(template.approvalStatus)} className={getStatusColor(template.approvalStatus)}>
            {template.approvalStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {template.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {template.description}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Version {template.version}</span>
            {template.lastUsedAt && (
              <span>Last used: {new Date(template.lastUsedAt).toLocaleDateString()}</span>
            )}
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => onUse(template)}>
              <Copy className="w-4 h-4 mr-1" />
              Use Template
            </Button>
            <Button size="sm" variant="outline" onClick={() => onView(template)}>
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button size="sm" variant="outline" onClick={() => onEdit(template)}>
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDelete(template)}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (templateData: ShiftTemplateCreateData) => void
  initialData?: Partial<ShiftTemplateCreateData>
}

function CreateTemplateDialog({ open, onOpenChange, onSubmit, initialData }: CreateTemplateDialogProps) {
  const [formData, setFormData] = useState<ShiftTemplateCreateData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    templateData: initialData?.templateData || {
      title: '',
      description: '',
      locationData: {
        siteName: '',
        address: '',
        contactInfo: { name: '', phone: '', email: '' }
      },
      timeRange: { startTime: '', endTime: '' },
      requiredCertifications: [],
      guardRequirements: {},
      priority: 3,
      rateInformation: { baseRate: 25, overtimeMultiplier: 1.5 }
    },
    isShared: initialData?.isShared || false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Shift Template</DialogTitle>
          <DialogDescription>
            Create a reusable template for common shift configurations
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Night Security - Hospital"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat.toLowerCase()}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe when and how to use this template..."
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="isShared"
                checked={formData.isShared}
                onCheckedChange={(checked) => setFormData({ ...formData, isShared: checked })}
              />
              <Label htmlFor="isShared" className="flex items-center gap-2">
                Share with other managers
                <Share2 className="w-4 h-4" />
              </Label>
            </div>
            
            {formData.isShared && (
              <Alert>
                <AlertDescription>
                  Shared templates require approval before they become available to other managers.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Alert>
            <AlertDescription>
              <strong>Note:</strong> Template configuration (shift details, requirements, rates) will be copied from the current shift creation form when you save this template.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Template</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface TemplateStatsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: ShiftTemplate | null
  stats: TemplateUsageStats | null
  isLoading: boolean
}

function TemplateStatsDialog({ open, onOpenChange, template, stats, isLoading }: TemplateStatsDialogProps) {
  if (!template) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{template.name} - Usage Statistics</DialogTitle>
          <DialogDescription>Performance and usage metrics for this template</DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : stats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Usage</Label>
                <div className="text-2xl font-bold">{stats.totalUsage}</div>
              </div>
              <div className="space-y-2">
                <Label>Monthly Usage</Label>
                <div className="text-2xl font-bold">{stats.monthlyUsage}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Success Rate</Label>
                <div className="text-2xl font-bold text-green-600">{stats.averageSuccessRate}%</div>
              </div>
              <div className="space-y-2">
                <Label>Guard Feedback</Label>
                <div className="text-2xl font-bold text-blue-600">{stats.guardFeedbackScore}/100</div>
              </div>
            </div>
            
            {stats.popularTimeSlots.length > 0 && (
              <div className="space-y-2">
                <Label>Popular Time Slots</Label>
                <div className="flex gap-2">
                  {stats.popularTimeSlots.map((slot) => (
                    <Badge key={slot} variant="secondary">{slot}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Alert>
            <AlertDescription>Failed to load template statistics.</AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function ShiftTemplateManager() {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ShiftTemplate | null>(null)
  const [templateStats, setTemplateStats] = useState<TemplateUsageStats | null>(null)
  const [showStatsDialog, setShowStatsDialog] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)

  const service = new ShiftTemplateService()

  useEffect(() => {
    loadTemplates()
  }, [categoryFilter])

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      const result = await service.getTemplates(
        categoryFilter === 'all' ? undefined : categoryFilter,
        false
      )
      
      if (result.success && result.data) {
        setTemplates(result.data)
      } else {
        toast.error(result.error?.message || 'Failed to load templates')
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTemplate = async (templateData: ShiftTemplateCreateData) => {
    try {
      // TODO: Get actual user ID
      const managerId = 'current-user-id'
      const result = await service.createTemplate(templateData, managerId)
      
      if (result.success && result.data) {
        setTemplates(prev => [result.data!, ...prev])
        toast.success('Template created successfully!')
      } else {
        toast.error(result.error?.message || 'Failed to create template')
      }
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error('Failed to create template')
    }
  }

  const handleDeleteTemplate = async (template: ShiftTemplate) => {
    if (!confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      return
    }

    try {
      const result = await service.deleteTemplate(template.id)
      
      if (result.success) {
        setTemplates(prev => prev.filter(t => t.id !== template.id))
        toast.success('Template deleted successfully!')
      } else {
        toast.error(result.error?.message || 'Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    }
  }

  const handleViewStats = async (template: ShiftTemplate) => {
    setSelectedTemplate(template)
    setShowStatsDialog(true)
    setStatsLoading(true)
    
    try {
      const result = await service.getTemplateUsageStats(template.id)
      if (result.success && result.data) {
        setTemplateStats(result.data)
      } else {
        setTemplateStats(null)
      }
    } catch (error) {
      console.error('Error loading template stats:', error)
      setTemplateStats(null)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleUseTemplate = (template: ShiftTemplate) => {
    // TODO: Navigate to shift creation with template pre-filled
    toast.info('Template application coming soon - this would pre-fill the shift creation form')
  }

  const handleEditTemplate = (template: ShiftTemplate) => {
    // TODO: Open template edit dialog
    toast.info('Template editing coming soon')
  }

  const handleViewTemplate = (template: ShiftTemplate) => {
    // TODO: Open template detail view
    toast.info('Template detail view coming soon')
  }

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    if (searchQuery && !template.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !template.category.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    if (statusFilter !== 'all' && template.approvalStatus !== statusFilter) {
      return false
    }
    
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Shift Templates</h2>
          <p className="text-muted-foreground">Manage reusable templates for common shift configurations</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TEMPLATE_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category.toLowerCase()}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={(value: ApprovalStatus | 'all') => setStatusFilter(value)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' 
                ? 'Try adjusting your filters or search criteria.'
                : 'Create your first template to get started.'
              }
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
              onView={handleViewStats}
              onUse={handleUseTemplate}
            />
          ))}
        </div>
      )}

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateTemplate}
      />

      {/* Template Stats Dialog */}
      <TemplateStatsDialog
        open={showStatsDialog}
        onOpenChange={setShowStatsDialog}
        template={selectedTemplate}
        stats={templateStats}
        isLoading={statsLoading}
      />
    </div>
  )
}