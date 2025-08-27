"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  FileBarChart, Download, Calendar, Filter, RefreshCw, 
  CheckCircle, AlertTriangle, Clock, Users, FileText, Bot 
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { 
  ComplianceReportData, 
  ComplianceReportSummary, 
  AIAuditSummary,
  AIAuditQuery 
} from "@/lib/types/ai-audit-types"

interface ComplianceReportInterfaceProps {
  className?: string
}

export default function ComplianceReportInterface({ className }: ComplianceReportInterfaceProps) {
  const [reportData, setReportData] = useState<ComplianceReportData[]>([])
  const [summary, setSummary] = useState<ComplianceReportSummary | null>(null)
  const [auditSummary, setAuditSummary] = useState<AIAuditSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [dateTo, setDateTo] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [filters, setFilters] = useState<AIAuditQuery>({})
  const [selectedTab, setSelectedTab] = useState('overview')

  useEffect(() => {
    fetchComplianceData()
  }, [dateFrom, dateTo, filters])

  const fetchComplianceData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('date_from', dateFrom)
      params.set('date_to', dateTo)
      
      if (filters.processing_type?.length) {
        params.set('processing_type', filters.processing_type.join(','))
      }
      if (filters.status?.length) {
        params.set('status', filters.status.join(','))
      }

      const response = await fetch(`/api/v1/admin/compliance-report?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || ''}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.success) {
        setReportData(result.data.audit_entries || [])
        setSummary(result.data.summary)
        setAuditSummary(result.data.audit_summary)
      }
    } catch (error) {
      console.error('Error fetching compliance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = async (format: 'json' | 'csv' | 'xlsx' = 'json') => {
    try {
      const params = new URLSearchParams()
      params.set('date_from', dateFrom)
      params.set('date_to', dateTo)
      params.set('format', format)
      
      const response = await fetch(`/api/v1/admin/compliance-report/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || ''}`
        }
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `compliance-report-${dateFrom}-to-${dateTo}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`

  return (
    <div className={cn("space-y-6", className)}>
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileBarChart className="h-5 w-5 text-blue-600" />
                <span>AI Processing Compliance Report</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Comprehensive audit trail for AI processing and manager reviews
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchComplianceData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Select onValueChange={(format) => handleExportReport(format as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Processing Type</Label>
              <Select onValueChange={(value) => {
                if (value === 'all') {
                  setFilters(prev => ({ ...prev, processing_type: undefined }))
                } else {
                  setFilters(prev => ({ ...prev, processing_type: [value as any] }))
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="resume_parsing">Resume Parsing</SelectItem>
                  <SelectItem value="manager_review">Manager Review</SelectItem>
                  <SelectItem value="data_validation">Data Validation</SelectItem>
                  <SelectItem value="bulk_approve">Bulk Approve</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select onValueChange={(value) => {
                if (value === 'all') {
                  setFilters(prev => ({ ...prev, status: undefined }))
                } else {
                  setFilters(prev => ({ ...prev, status: [value as any] }))
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                  <SelectItem value="timeout">Timeout</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="processing">AI Processing</TabsTrigger>
          <TabsTrigger value="reviews">Manager Reviews</TabsTrigger>
          <TabsTrigger value="audit-trail">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.total_applications_processed}</div>
                  <p className="text-xs text-muted-foreground">
                    {summary.total_audit_entries} audit entries
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Success Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatPercentage(summary.ai_processing_stats.success_rate)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary.ai_processing_stats.total_ai_operations} operations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Manual Override Rate</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatPercentage(summary.manager_review_stats.override_rate)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary.manager_review_stats.total_overrides} overrides
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatPercentage(summary.ai_processing_stats.average_confidence)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    AI extraction confidence
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Audit Trail Completeness</span>
                    <Badge variant={summary.compliance_indicators.audit_trail_completeness >= 95 ? "default" : "secondary"}>
                      {formatPercentage(summary.compliance_indicators.audit_trail_completeness)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Retention Compliance</span>
                    <Badge variant={summary.compliance_indicators.data_retention_compliance ? "default" : "destructive"}>
                      {summary.compliance_indicators.data_retention_compliance ? 'Compliant' : 'Non-Compliant'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Processing Time SLA</span>
                    <Badge variant={summary.compliance_indicators.processing_time_within_sla >= 90 ? "default" : "secondary"}>
                      {formatPercentage(summary.compliance_indicators.processing_time_within_sla)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Most Overridden Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {summary.manager_review_stats.most_overridden_fields.map((field, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{field.field.replace(/_/g, ' ')}</span>
                        <Badge variant="outline">{field.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          {auditSummary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Processing Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Average Time:</span>
                    <span className="font-medium">{formatDuration(auditSummary.average_processing_time / 1000)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Fastest:</span>
                    <span className="font-medium">{formatDuration(auditSummary.performance_metrics.fastest_operation / 1000)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Slowest:</span>
                    <span className="font-medium">{formatDuration(auditSummary.performance_metrics.slowest_operation / 1000)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">AI Models Used</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(auditSummary.by_model).map(([model, count]) => (
                      <div key={model} className="flex items-center justify-between">
                        <span className="text-sm">{model}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Error Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {auditSummary.error_analysis.most_common_errors.map((error, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm truncate">{error.error}</span>
                          <Badge variant="destructive" className="text-xs">{error.count}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatPercentage(error.percentage)} of all operations
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          {summary && (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                Manager reviews ensure AI accuracy: {summary.manager_review_stats.total_reviews} reviews completed 
                with {formatPercentage(summary.manager_review_stats.override_rate)} override rate.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {reportData
              .filter(entry => entry.processing_type === 'manager_review')
              .map((entry) => (
              <Card key={entry.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {entry.first_name} {entry.last_name}
                        </span>
                        <Badge variant="outline">#{entry.application_reference}</Badge>
                        <Badge className={entry.processing_status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {entry.processing_status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Reviewed by: {entry.user_id || 'Unknown'} • 
                        Duration: {formatDuration(entry.processing_duration_seconds)}
                      </div>
                      {entry.manager_overrides && (
                        <div className="text-sm">
                          <span className="font-medium">Action:</span> {entry.manager_overrides.action?.replace(/_/g, ' ')}
                          {entry.manager_overrides.field && (
                            <span className="ml-2">
                              • Field: <code className="bg-gray-100 px-1 rounded text-xs">{entry.manager_overrides.field}</code>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {new Date(entry.processing_start_time).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audit-trail" className="space-y-4">
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading audit trail...</p>
              </div>
            ) : reportData.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileBarChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No audit entries found</h3>
                  <p className="text-muted-foreground">No audit data matches your current filters.</p>
                </CardContent>
              </Card>
            ) : (
              reportData.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="capitalize">
                            {entry.processing_type.replace(/_/g, ' ')}
                          </Badge>
                          <Badge className={entry.processing_status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {entry.processing_status}
                          </Badge>
                          {entry.application_reference && (
                            <span className="text-sm font-medium">#{entry.application_reference}</span>
                          )}
                        </div>
                        
                        <div className="text-sm">
                          <span className="font-medium">{entry.first_name} {entry.last_name}</span>
                          <span className="text-muted-foreground ml-2">({entry.email})</span>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          Model: {entry.ai_model} • 
                          Duration: {formatDuration(entry.processing_duration_seconds)}
                          {entry.user_id && <span> • User: {entry.user_id}</span>}
                        </div>

                        {entry.confidence_scores && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">Confidence:</span>
                            {Object.entries(entry.confidence_scores).map(([field, score]) => (
                              <Badge key={field} variant="outline" className="text-xs">
                                {field}: {formatPercentage(score as number)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right text-sm text-muted-foreground">
                        {new Date(entry.processing_start_time).toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Re-export for convenience
export { ComplianceReportInterface }