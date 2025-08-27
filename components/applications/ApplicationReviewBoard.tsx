"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileText, Calendar, Mail, Phone, Filter, RefreshCw, Bot, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfidenceIndicator } from "./ConfidenceIndicator"
import { AIReviewInterface } from "./AIReviewInterface"
import type { GuardApplication, ApplicationStatus } from "@/lib/types/guard-applications"

interface ApplicationReviewBoardProps {
  initialFilters?: {
    status_filter?: ApplicationStatus[]
    confidence_threshold?: number
    date_from?: Date
    date_to?: Date
  }
  onApplicationSelect?: (application: GuardApplication) => void
  showMetrics?: boolean
  className?: string
}

export default function ApplicationReviewBoard({
  initialFilters,
  onApplicationSelect,
  showMetrics = true,
  className = ''
}: ApplicationReviewBoardProps) {
  const [applications, setApplications] = useState<GuardApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(initialFilters || {})
  const [selectedApplication, setSelectedApplication] = useState<GuardApplication | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchApplications()
  }, [filters, page])

  const fetchApplications = async () => {
    setLoading(true)
    try {
      // Build query parameters
      const searchParams = new URLSearchParams()
      searchParams.set('page', page.toString())
      searchParams.set('limit', '25')
      
      // Filter for applications with AI data
      searchParams.set('has_ai_data', 'true')
      
      if (filters.status_filter && filters.status_filter.length > 0) {
        searchParams.set('status_filter', filters.status_filter.join(','))
      }
      
      if (filters.confidence_threshold) {
        searchParams.set('confidence_threshold', filters.confidence_threshold.toString())
      }
      
      if (filters.date_from) {
        searchParams.set('date_from', filters.date_from.toISOString())
      }
      
      if (filters.date_to) {
        searchParams.set('date_to', filters.date_to.toISOString())
      }

      // Make API call to applications endpoint (extends leads API)
      const response = await fetch(`/api/v1/applications?${searchParams.toString()}`, {
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
        throw new Error(result.error || 'Failed to fetch applications')
      }

      setApplications(result.data.applications || [])
      setTotalPages(result.data.pagination?.pages || 1)
      
    } catch (error) {
      console.error('Error fetching applications:', error)
      // Set empty data on error to prevent crashes
      setApplications([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const handleFieldApprove = async (applicationId: string, field: string) => {
    try {
      const response = await fetch(`/api/v1/applications/${applicationId}/ai-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || ''}`
        },
        body: JSON.stringify({
          action: 'approve_field',
          field: field
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to approve field')
      }

      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === applicationId ? { ...app, ...result.data } : app
      ))
      
    } catch (error) {
      console.error('Error approving field:', error)
      throw error
    }
  }

  const handleFieldReject = async (applicationId: string, field: string, newValue: any) => {
    try {
      const response = await fetch(`/api/v1/applications/${applicationId}/ai-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || ''}`
        },
        body: JSON.stringify({
          action: 'override_field',
          field: field,
          value: newValue
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to override field')
      }

      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === applicationId ? { ...app, ...result.data } : app
      ))
      
    } catch (error) {
      console.error('Error overriding field:', error)
      throw error
    }
  }

  const handleBulkApprove = async (applicationId: string, threshold: number) => {
    try {
      const response = await fetch(`/api/v1/applications/${applicationId}/ai-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || ''}`
        },
        body: JSON.stringify({
          action: 'bulk_approve',
          confidence_threshold: threshold
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to bulk approve')
      }

      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === applicationId ? { ...app, ...result.data } : app
      ))
      
    } catch (error) {
      console.error('Error bulk approving:', error)
      throw error
    }
  }

  const handleStatusChange = async (applicationId: string, status: string) => {
    try {
      const response = await fetch(`/api/v1/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || ''}`
        },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update status')
      }

      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === applicationId ? { ...app, status: status as ApplicationStatus } : app
      ))
      
    } catch (error) {
      console.error('Error updating status:', error)
      throw error
    }
  }

  const getStatusColor = (status: ApplicationStatus): string => {
    const colors = {
      'new': 'bg-blue-100 text-blue-800',
      'link_sent': 'bg-purple-100 text-purple-800',
      'application_started': 'bg-orange-100 text-orange-800',
      'application_received': 'bg-yellow-100 text-yellow-800',
      'documents_pending': 'bg-amber-100 text-amber-800',
      'under_review': 'bg-cyan-100 text-cyan-800',
      'background_check': 'bg-indigo-100 text-indigo-800',
      'interview_scheduled': 'bg-violet-100 text-violet-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'hired': 'bg-emerald-100 text-emerald-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
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
    const total = applications.length
    const underReview = applications.filter(app => app.status === 'under_review').length
    const approved = applications.filter(app => app.status === 'approved').length
    const highConfidence = applications.filter(app => 
      app.confidence_scores && app.confidence_scores.overall >= 0.8
    ).length
    
    return { total, underReview, approved, highConfidence }
  }

  const metrics = getMetrics()

  return (
    <div className={cn("space-y-6", className)}>
      {showMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{metrics.underReview}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.approved}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{metrics.highConfidence}</div>
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
            onClick={fetchApplications}
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
            <CardTitle>Filter Applications</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select onValueChange={(value) => {
                if (value === 'all') {
                  setFilters(prev => ({ ...prev, status_filter: undefined }))
                } else {
                  setFilters(prev => ({ ...prev, status_filter: [value as ApplicationStatus] }))
                }
                setPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="application_received">Application Received</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Confidence Threshold</Label>
              <Select onValueChange={(value) => {
                setFilters(prev => ({ ...prev, confidence_threshold: parseFloat(value) }))
                setPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All confidence levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Confidence Levels</SelectItem>
                  <SelectItem value="0.8">High Confidence (80%+)</SelectItem>
                  <SelectItem value="0.6">Medium+ Confidence (60%+)</SelectItem>
                  <SelectItem value="0.4">Low+ Confidence (40%+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input 
                type="date" 
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined
                  setFilters(prev => ({ ...prev, date_from: date }))
                  setPage(1)
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input 
                type="date" 
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined
                  setFilters(prev => ({ ...prev, date_to: date }))
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
            <p className="text-muted-foreground">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No applications found</h3>
              <p className="text-muted-foreground">No AI-processed applications match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          applications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {application.first_name} {application.last_name}
                      </h3>
                      <Badge className={getStatusColor(application.status)}>
                        {application.status.replace(/_/g, ' ')}
                      </Badge>
                      {application.application_reference && (
                        <Badge variant="outline">
                          #{application.application_reference}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>{application.email}</span>
                      </div>
                      {application.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>{application.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Submitted {formatDate(application.application_submitted_at || application.created_at)}</span>
                      </div>
                    </div>
                    
                    {application.confidence_scores && (
                      <div className="mt-3 flex items-center space-x-4">
                        <ConfidenceIndicator 
                          confidence={application.confidence_scores.overall}
                          field="Overall AI Confidence"
                          size="sm"
                        />
                        {application.ai_parsed_data?.manual_overrides && application.ai_parsed_data.manual_overrides.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {application.ai_parsed_data.manual_overrides.length} Manual Override(s)
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Bot className="h-4 w-4 mr-2" />
                        AI Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          AI Review: {application.first_name} {application.last_name}
                        </DialogTitle>
                      </DialogHeader>
                      <AIReviewInterface
                        application={application}
                        onFieldApprove={(field) => handleFieldApprove(application.id, field)}
                        onFieldReject={(field, value) => handleFieldReject(application.id, field, value)}
                        onBulkApprove={(threshold) => handleBulkApprove(application.id, threshold)}
                        onApplicationStatusChange={(status) => handleStatusChange(application.id, status)}
                      />
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

// Re-export for convenience
export { ApplicationReviewBoard }