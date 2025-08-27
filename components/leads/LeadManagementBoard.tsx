"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Users, Calendar, Mail, Phone, MapPin, Filter, RefreshCw } from "lucide-react"
import type { GuardLead, LeadSource, LeadStatus, LeadFilters } from "@/lib/types/guard-leads"

interface LeadManagementBoardProps {
  initialFilters?: LeadFilters
  onLeadSelect?: (lead: GuardLead) => void
  showMetrics?: boolean
  className?: string
}

export default function LeadManagementBoard({
  initialFilters,
  onLeadSelect,
  showMetrics = true,
  className = ''
}: LeadManagementBoardProps) {
  const [leads, setLeads] = useState<GuardLead[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<LeadFilters>(initialFilters || {})
  const [selectedLead, setSelectedLead] = useState<GuardLead | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchLeads()
  }, [filters, page])

  const fetchLeads = async () => {
    setLoading(true)
    try {
      // Build query parameters
      const searchParams = new URLSearchParams()
      searchParams.set('page', page.toString())
      searchParams.set('limit', '25')
      
      if (filters.sources && filters.sources.length > 0) {
        searchParams.set('source_filter', filters.sources.join(','))
      }
      
      if (filters.statuses && filters.statuses.length > 0) {
        searchParams.set('status_filter', filters.statuses.join(','))
      }
      
      if (filters.dateRange?.from) {
        searchParams.set('date_from', filters.dateRange.from.toISOString())
      }
      
      if (filters.dateRange?.to) {
        searchParams.set('date_to', filters.dateRange.to.toISOString())
      }

      // Make API call
      const response = await fetch(`/api/v1/leads?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || ''}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch leads')
      }

      setLeads(result.data.leads || [])
      setTotalPages(result.data.pagination?.pages || 1)
      
    } catch (error) {
      console.error('Error fetching leads:', error)
      // Set empty data on error to prevent crashes
      setLeads([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (leadId: string, newStatus: LeadStatus, notes?: string) => {
    try {
      const response = await fetch(`/api/v1/leads/${leadId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || ''}`
        },
        body: JSON.stringify({
          status: newStatus,
          notes: notes
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to update lead status')
      }

      // Update local state with server response
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? result.data : lead
      ))
      
    } catch (error) {
      console.error('Error updating lead status:', error)
      // Optionally show error toast to user
    }
  }

  const getStatusColor = (status: LeadStatus): string => {
    const colors = {
      'new': 'bg-blue-100 text-blue-800',
      'contacted': 'bg-yellow-100 text-yellow-800', 
      'application-sent': 'bg-purple-100 text-purple-800',
      'application-started': 'bg-orange-100 text-orange-800',
      'application-completed': 'bg-green-100 text-green-800',
      'interview-scheduled': 'bg-cyan-100 text-cyan-800',
      'hired': 'bg-emerald-100 text-emerald-800',
      'rejected': 'bg-red-100 text-red-800',
      'unresponsive': 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getSourceIcon = (source: LeadSource) => {
    const icons = {
      'website': '🌐',
      'qr-code': '📱', 
      'social-media': '📘',
      'referral': '👥',
      'job-board': '💼',
      'direct-contact': '📞'
    }
    return icons[source] || '📄'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getMetrics = () => {
    const total = leads.length
    const newLeads = leads.filter(lead => lead.status === 'new').length
    const contacted = leads.filter(lead => lead.status === 'contacted').length
    const hired = leads.filter(lead => lead.status === 'hired').length
    
    return { total, newLeads, contacted, hired }
  }

  const metrics = getMetrics()

  return (
    <div className={`space-y-6 ${className}`}>
      {showMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Leads</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{metrics.newLeads}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contacted</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{metrics.contacted}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hired</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.hired}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchLeads}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filter Leads</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select onValueChange={(value) => {
                if (value === 'all') {
                  setFilters(prev => ({ ...prev, sources: undefined }))
                } else {
                  setFilters(prev => ({ ...prev, sources: [value as LeadSource] }))
                }
                setPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="qr-code">QR Code</SelectItem>
                  <SelectItem value="social-media">Social Media</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="job-board">Job Board</SelectItem>
                  <SelectItem value="direct-contact">Direct Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select onValueChange={(value) => {
                if (value === 'all') {
                  setFilters(prev => ({ ...prev, statuses: undefined }))
                } else {
                  setFilters(prev => ({ ...prev, statuses: [value as LeadStatus] }))
                }
                setPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="application-sent">Application Sent</SelectItem>
                  <SelectItem value="application-started">Application Started</SelectItem>
                  <SelectItem value="application-completed">Application Completed</SelectItem>
                  <SelectItem value="interview-scheduled">Interview Scheduled</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="unresponsive">Unresponsive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input 
                type="date" 
                placeholder="From date" 
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined
                  setFilters(prev => ({ 
                    ...prev, 
                    dateRange: { 
                      ...prev.dateRange,
                      from: date 
                    } 
                  }))
                  setPage(1)
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input 
                type="date" 
                placeholder="To date" 
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined
                  setFilters(prev => ({ 
                    ...prev, 
                    dateRange: { 
                      ...prev.dateRange,
                      to: date 
                    } 
                  }))
                  setPage(1)
                }}
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setFilters({})
                  setPage(1)
                }}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading leads...</p>
          </div>
        ) : leads.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No leads found</h3>
              <p className="text-muted-foreground">No leads match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          leads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {lead.first_name} {lead.last_name}
                      </h3>
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status.replace('-', ' ')}
                      </Badge>
                      <span className="text-sm">
                        {getSourceIcon(lead.lead_source)} {lead.lead_source.replace('-', ' ')}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>{lead.email}</span>
                      </div>
                      {lead.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Applied {formatDate(lead.created_at)}</span>
                      </div>
                    </div>
                    
                    {lead.notes && (
                      <div className="mt-3 p-2 bg-muted rounded text-sm">
                        <strong>Notes:</strong> {lead.notes}
                      </div>
                    )}
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Manage Lead: {lead.first_name} {lead.last_name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select 
                            defaultValue={lead.status}
                            onValueChange={(value: LeadStatus) => 
                              handleStatusUpdate(lead.id, value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="application-sent">Application Sent</SelectItem>
                              <SelectItem value="application-started">Application Started</SelectItem>
                              <SelectItem value="application-completed">Application Completed</SelectItem>
                              <SelectItem value="interview-scheduled">Interview Scheduled</SelectItem>
                              <SelectItem value="hired">Hired</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="unresponsive">Unresponsive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea 
                            defaultValue={lead.notes || ''}
                            placeholder="Add notes about this lead..."
                            onChange={(e) => {
                              // Update notes on blur or save
                            }}
                          />
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button className="flex-1">Save Changes</Button>
                          <Button variant="outline" asChild>
                            <a href={`mailto:${lead.email}`}>Email</a>
                          </Button>
                          {lead.phone && (
                            <Button variant="outline" asChild>
                              <a href={`tel:${lead.phone}`}>Call</a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}