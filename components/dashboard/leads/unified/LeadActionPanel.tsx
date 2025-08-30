"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { UnifiedLead } from '@/lib/types/unified-leads'
import { UserCheck, Phone, Mail, DollarSign, X, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface LeadActionPanelProps {
  lead: UnifiedLead
  onClose: () => void
  onLeadUpdate: (updatedLead: UnifiedLead) => void
}

type ActionType = 'assign' | 'contact' | 'convert' | 'close' | null

export function LeadActionPanel({ lead, onClose, onLeadUpdate }: LeadActionPanelProps) {
  const [currentAction, setCurrentAction] = useState<ActionType>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({})

  const handleAction = async (action: ActionType) => {
    setCurrentAction(action)
    setFormData({}) // Reset form data
  }

  const submitAction = async () => {
    if (!currentAction) return

    setIsSubmitting(true)
    try {
      // In a real implementation, these would call the appropriate API endpoints
      switch (currentAction) {
        case 'assign':
          await handleAssign()
          break
        case 'contact':
          await handleContact()
          break
        case 'convert':
          await handleConvert()
          break
        case 'close':
          await handleClose()
          break
      }

      toast.success(`Lead ${currentAction}ed successfully`)
      setCurrentAction(null)
      onClose()
    } catch (error) {
      toast.error(`Failed to ${currentAction} lead`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAssign = async () => {
    // Simulate API call to assign lead
    const updatedLead = {
      ...lead,
      assignedManager: formData.managerId,
      assignedAt: new Date(),
      updatedAt: new Date()
    }
    onLeadUpdate(updatedLead)
  }

  const handleContact = async () => {
    // Simulate API call to record contact
    const updatedLead = {
      ...lead,
      lastContactDate: new Date(),
      contactCount: (lead.contactCount || 0) + 1,
      nextFollowUpDate: formData.nextFollowUp ? new Date(formData.nextFollowUp) : undefined,
      updatedAt: new Date()
    }
    
    // Update status if this is first contact
    if (lead.status === 'prospect') {
      updatedLead.status = 'contacted'
    }
    
    onLeadUpdate(updatedLead)
  }

  const handleConvert = async () => {
    // Simulate API call to convert lead
    const updatedLead = {
      ...lead,
      status: lead.type === 'client' ? 'won' : 'hired',
      convertedAt: new Date(),
      estimatedValue: formData.value ? parseFloat(formData.value) : lead.estimatedValue,
      updatedAt: new Date()
    }
    onLeadUpdate(updatedLead)
  }

  const handleClose = async () => {
    // Simulate API call to close lead
    const updatedLead = {
      ...lead,
      status: 'closed',
      closedReason: formData.reason,
      closedAt: new Date(),
      updatedAt: new Date()
    }
    onLeadUpdate(updatedLead)
  }

  const renderActionForm = () => {
    switch (currentAction) {
      case 'assign':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="manager">Assign to Manager</Label>
              <Select 
                value={formData.managerId || ''} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, managerId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mgr-1">John Smith</SelectItem>
                  <SelectItem value="mgr-2">Sarah Johnson</SelectItem>
                  <SelectItem value="mgr-3">Mike Wilson</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Assignment Notes</Label>
              <Textarea 
                placeholder="Add any notes about this assignment..."
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
        )

      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="contactType">Contact Type</Label>
              <Select 
                value={formData.contactType || ''} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, contactType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">In-Person Meeting</SelectItem>
                  <SelectItem value="video">Video Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="outcome">Contact Outcome</Label>
              <Select 
                value={formData.outcome || ''} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, outcome: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interested">Interested</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="not-interested">Not Interested</SelectItem>
                  <SelectItem value="no-answer">No Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nextFollowUp">Next Follow-up Date</Label>
              <Input 
                type="datetime-local"
                value={formData.nextFollowUp || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, nextFollowUp: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="contactNotes">Contact Notes</Label>
              <Textarea 
                placeholder="Add details about the contact..."
                value={formData.contactNotes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, contactNotes: e.target.value }))}
              />
            </div>
          </div>
        )

      case 'convert':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                🎉 Converting this {lead.type} lead to {lead.type === 'client' ? 'won contract' : 'hired guard'}
              </p>
            </div>
            {lead.type === 'client' && (
              <div>
                <Label htmlFor="value">Contract Value ($)</Label>
                <Input 
                  type="number"
                  placeholder="Enter contract value..."
                  value={formData.value || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                />
              </div>
            )}
            <div>
              <Label htmlFor="conversionNotes">Conversion Notes</Label>
              <Textarea 
                placeholder="Add details about the conversion..."
                value={formData.conversionNotes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, conversionNotes: e.target.value }))}
              />
            </div>
          </div>
        )

      case 'close':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Closure Reason</Label>
              <Select 
                value={formData.reason || ''} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-qualified">Not Qualified</SelectItem>
                  <SelectItem value="budget">Budget Constraints</SelectItem>
                  <SelectItem value="timing">Poor Timing</SelectItem>
                  <SelectItem value="competition">Chose Competitor</SelectItem>
                  <SelectItem value="no-response">No Response</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="closureNotes">Closure Notes</Label>
              <Textarea 
                placeholder="Add details about why this lead is being closed..."
                value={formData.closureNotes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, closureNotes: e.target.value }))}
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (currentAction) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="capitalize">{currentAction} Lead</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setCurrentAction(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={lead.type === 'client' ? 'default' : 'secondary'}>
                {lead.type} lead
              </Badge>
              <Badge variant="outline">{lead.status}</Badge>
            </div>
            <p className="font-medium">{lead.firstName} {lead.lastName}</p>
            <p className="text-sm text-muted-foreground">{lead.email}</p>
          </div>

          {renderActionForm()}

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={submitAction}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm {currentAction}
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setCurrentAction(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Lead Actions</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lead Info */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={lead.type === 'client' ? 'default' : 'secondary'}>
              {lead.type} lead
            </Badge>
            <Badge variant="outline">{lead.status}</Badge>
            {lead.priority && (
              <Badge variant={lead.priority === 'high' ? 'destructive' : 'outline'}>
                {lead.priority} priority
              </Badge>
            )}
          </div>
          <p className="font-medium">{lead.firstName} {lead.lastName}</p>
          <p className="text-sm text-muted-foreground">{lead.email}</p>
          <p className="text-sm text-muted-foreground">{lead.phone}</p>
          {lead.assignedManager && (
            <p className="text-sm text-muted-foreground mt-1">
              Assigned to: {lead.assignedManager}
            </p>
          )}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleAction('assign')}
            className="flex items-center gap-2"
          >
            <UserCheck className="h-4 w-4" />
            Assign
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => handleAction('contact')}
            className="flex items-center gap-2"
          >
            <Phone className="h-4 w-4" />
            Contact
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => handleAction('convert')}
            className="flex items-center gap-2"
            disabled={['won', 'hired', 'closed'].includes(lead.status)}
          >
            <DollarSign className="h-4 w-4" />
            Convert
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => handleAction('close')}
            className="flex items-center gap-2"
            disabled={['won', 'hired', 'closed'].includes(lead.status)}
          >
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>

        {/* Quick Actions */}
        <Separator />
        
        <div className="space-y-2">
          <p className="text-sm font-medium">Quick Actions</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href={`mailto:${lead.email}`} className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Email
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Call
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}