"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Calendar,
  TrendingUp,
  Users,
  AlertTriangle,
  Clock,
  MoreHorizontal,
  UserPlus,
  Download
} from 'lucide-react'
import { getLeads, updateLead, type Lead, type LeadFilters } from '@/lib/services/lead-management-service'
import { autoAssignLead, manualAssignLead, getManagerWorkloads, type ManagerWorkload } from '@/lib/services/lead-assignment-service'
import { scheduleLeadFollowUps } from '@/lib/services/lead-follow-up-service'
import { toast } from 'sonner'
import Link from 'next/link'

const statusColors = {
  prospect: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800', 
  qualified: 'bg-green-100 text-green-800',
  proposal: 'bg-purple-100 text-purple-800',
  negotiation: 'bg-orange-100 text-orange-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800'
}

const sourceColors = {
  website: 'bg-blue-100 text-blue-800',
  social_media: 'bg-pink-100 text-pink-800',
  referral: 'bg-green-100 text-green-800',
  networking_event: 'bg-purple-100 text-purple-800',
  digital_marketing: 'bg-orange-100 text-orange-800',
  cold_outreach: 'bg-gray-100 text-gray-800',
  phone_inquiry: 'bg-indigo-100 text-indigo-800',
  walk_in: 'bg-teal-100 text-teal-800',
  other: 'bg-gray-100 text-gray-800'
}

function LeadCard({ lead, onLeadUpdate, managers }: { lead: Lead, onLeadUpdate: (leadId: string) => void, managers: ManagerWorkload[] }) {
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedManager, setSelectedManager] = useState('')
  const [assignmentReason, setAssignmentReason] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState(lead.status)
  const [notes, setNotes] = useState(lead.qualificationNotes || '')

  const assignedManager = managers.find(m => m.managerId === lead.assignedTo)
  const daysSinceCreated = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))

  const handleAssignLead = async () => {
    if (!selectedManager) return
    setIsAssigning(true)
    try {
      const result = await manualAssignLead(lead.id, selectedManager, assignmentReason)
      if (result.success) {
        toast.success(`Lead assigned to ${result.data?.managerName}`)
        onLeadUpdate(lead.id)
      } else {
        toast.error(result.error || 'Failed to assign lead')
      }
    } catch (error) {
      toast.error('Failed to assign lead')
    } finally {
      setIsAssigning(false)
      setSelectedManager('')
      setAssignmentReason('')
    }
  }

  const handleAutoAssign = async () => {
    setIsAssigning(true)
    try {
      const result = await autoAssignLead(lead.id)
      if (result.success) {
        toast.success(`Lead auto-assigned to ${result.data?.managerName}`)
        onLeadUpdate(lead.id)
      } else {
        toast.error(result.error || 'Failed to auto-assign lead')
      }
    } catch (error) {
      toast.error('Failed to auto-assign lead')
    } finally {
      setIsAssigning(false)
    }
  }

  const handleUpdateLead = async () => {
    setIsUpdating(true)
    try {
      const updates: Partial<Lead> = {}
      if (newStatus !== lead.status) updates.status = newStatus as any
      if (notes !== (lead.qualificationNotes || '')) updates.qualificationNotes = notes

      if (Object.keys(updates).length > 0) {
        const result = await updateLead(lead.id, updates)
        if (result.success) {
          toast.success('Lead updated successfully')
          onLeadUpdate(lead.id)
        } else {
          toast.error(result.error || 'Failed to update lead')
        }
      }
    } catch (error) {
      toast.error('Failed to update lead')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleScheduleFollowUp = async () => {
    try {
      const result = await scheduleLeadFollowUps(lead.id)
      if (result.success) {
        toast.success('Follow-up scheduled successfully')
      } else {
        toast.error(result.error || 'Failed to schedule follow-up')
      }
    } catch (error) {
      toast.error('Failed to schedule follow-up')
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {lead.firstName} {lead.lastName}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={statusColors[lead.status]}>
                {lead.status}
              </Badge>
              <Badge variant="outline" className={sourceColors[lead.sourceType as keyof typeof sourceColors]}>
                {lead.sourceType.replace('_', ' ')}
              </Badge>
            </CardDescription>
          </div>
          <div className="text-right">
            {lead.estimatedValue && (
              <div className="font-semibold text-green-600">
                ${lead.estimatedValue.toLocaleString()}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              {daysSinceCreated} days ago
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm">
          <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
            <Mail className="h-4 w-4" />
            {lead.email}
          </a>
          <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
            <Phone className="h-4 w-4" />
            {lead.phone}
          </a>
        </div>

        <div className="text-sm">
          <span className="font-medium">Service:</span> {lead.serviceType.charAt(0).toUpperCase() + lead.serviceType.slice(1)} Security
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            {assignedManager ? (
              <span><strong>Assigned to:</strong> {assignedManager.firstName} {assignedManager.lastName}</span>
            ) : (
              <Badge variant="outline" className="text-orange-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Unassigned
              </Badge>
            )}
          </div>
          {!lead.assignedTo && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleAutoAssign} disabled={isAssigning}>
                <UserPlus className="h-4 w-4 mr-1" />
                Auto Assign
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={isAssigning}>Assign</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Lead</DialogTitle>
                    <DialogDescription>
                      Assign {lead.firstName} {lead.lastName} to a manager
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Manager</Label>
                      <Select value={selectedManager} onValueChange={setSelectedManager}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                        <SelectContent>
                          {managers.map(manager => (
                            <SelectItem key={manager.managerId} value={manager.managerId}>
                              {manager.firstName} {manager.lastName} ({manager.activeLeads} active)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Reason</Label>
                      <Input
                        placeholder="Reason for assignment"
                        value={assignmentReason}
                        onChange={(e) => setAssignmentReason(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAssignLead} disabled={!selectedManager || isAssigning}>
                      {isAssigning ? 'Assigning...' : 'Assign Lead'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {lead.message && (
          <div className="text-sm">
            <div className="font-medium">Notes:</div>
            <div className="text-muted-foreground">{lead.message}</div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleScheduleFollowUp}>
              <Calendar className="h-4 w-4 mr-1" />
              Follow-up
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreHorizontal className="h-4 w-4 mr-1" />
                  Update
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Lead</DialogTitle>
                  <DialogDescription>
                    Update status and notes for {lead.firstName} {lead.lastName}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus as any}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="negotiation">Negotiation</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Add qualification notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleUpdateLead} disabled={isUpdating}>
                    {isUpdating ? 'Updating...' : 'Update Lead'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {lead.contactCount} contact{lead.contactCount !== 1 ? 's' : ''}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [managers, setManagers] = useState<ManagerWorkload[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sourceFilter, setSourceFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)
  const pageSize = 12

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const filterParams: LeadFilters = {}
      if (searchTerm) filterParams.search = searchTerm
      if (statusFilter) filterParams.status = [statusFilter]
      if (sourceFilter) filterParams.sourceType = [sourceFilter]

      const result = await getLeads(filterParams, currentPage, pageSize)
      if (result.success && result.data) {
        setLeads(result.data.leads)
        setTotalLeads(result.data.pagination.total)
      } else {
        toast.error('Failed to fetch leads')
      }
    } catch (error) {
      toast.error('Failed to fetch leads')
    } finally {
      setLoading(false)
    }
  }

  const fetchManagers = async () => {
    try {
      const result = await getManagerWorkloads()
      if (result.success && result.data) {
        setManagers(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch managers:', error)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [currentPage, searchTerm, statusFilter, sourceFilter])

  useEffect(() => {
    fetchManagers()
  }, [])

  const handleLeadUpdate = (leadId: string) => {
    fetchLeads()
  }

  const totalPages = Math.ceil(totalLeads / pageSize)
  const unassignedLeads = leads.filter(l => !l.assignedTo).length
  const overdueLeads = leads.filter(l => {
    if (!l.lastContactDate) return true
    const daysSince = (Date.now() - new Date(l.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince > 2
  }).length

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Management</h1>
          <p className="text-muted-foreground">Manage and track your sales leads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/dashboard/leads/capture">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unassignedLeads}</div>
            <p className="text-xs text-muted-foreground">Need assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueLeads}</div>
            <p className="text-xs text-muted-foreground">&gt;2 days since contact</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">24.5%</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sources</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="social_media">Social Media</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="networking_event">Networking Event</SelectItem>
                <SelectItem value="digital_marketing">Digital Marketing</SelectItem>
                <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                <SelectItem value="phone_inquiry">Phone Inquiry</SelectItem>
                <SelectItem value="walk_in">Walk-in</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No leads found</h3>
          <p className="text-muted-foreground mb-4">Try adjusting your filters or create a new lead.</p>
          <Link href="/dashboard/leads/capture">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Lead
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {leads.map(lead => (
            <LeadCard 
              key={lead.id} 
              lead={lead}
              onLeadUpdate={handleLeadUpdate}
              managers={managers}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}