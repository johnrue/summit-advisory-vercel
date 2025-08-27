"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Shield, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User,
  FileText,
  Monitor,
  Eye,
  RefreshCw
} from 'lucide-react'
import type { 
  AuditTrailViewerProps,
  DecisionAuditRecord,
  AuditEventType,
  AuditFilters
} from '@/lib/types/approval-workflow'
import type { AuditIntegrityReport } from '@/lib/services/audit-trail-service'
import { auditTrailService } from '@/lib/services/audit-trail-service'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface AuditTrailViewerExtendedProps extends AuditTrailViewerProps {
  onClose: () => void
}

export const AuditTrailViewer: React.FC<AuditTrailViewerExtendedProps> = ({
  decisionId,
  showIntegrityVerification = true,
  enableExport = true,
  onClose,
  className
}) => {
  const [auditRecords, setAuditRecords] = useState<DecisionAuditRecord[]>([])
  const [integrityReport, setIntegrityReport] = useState<AuditIntegrityReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [filters, setFilters] = useState<AuditFilters>({})

  useEffect(() => {
    loadAuditTrail()
  }, [decisionId, filters])

  const loadAuditTrail = async () => {
    setIsLoading(true)
    try {
      const result = await auditTrailService.getAuditTrail(decisionId, filters)
      if (result.success) {
        setAuditRecords(result.data)
      } else {
        toast.error(`Failed to load audit trail: ${result.error}`)
      }
    } catch (error) {
      toast.error('Error loading audit trail')
      console.error('Audit trail loading error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const verifyIntegrity = async () => {
    if (!showIntegrityVerification) return

    setIsVerifying(true)
    try {
      const result = await auditTrailService.validateAuditIntegrity(decisionId)
      if (result.success) {
        setIntegrityReport(result.data)
        toast.success(`Integrity verification completed: ${result.data.integrityScore}% verified`)
      } else {
        toast.error(`Integrity verification failed: ${result.error}`)
      }
    } catch (error) {
      toast.error('Error during integrity verification')
      console.error('Integrity verification error:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  const exportAuditData = async () => {
    if (!enableExport) return

    setIsExporting(true)
    try {
      const result = await auditTrailService.exportAuditData({
        decisionIds: [decisionId],
        format: 'json',
        includeSystemGenerated: true
      })
      
      if (result.success) {
        toast.success(`Audit export prepared: ${result.data.recordCount} records`)
        // In production, would trigger download
        console.log('Export data:', result.data)
      } else {
        toast.error(`Export failed: ${result.error}`)
      }
    } catch (error) {
      toast.error('Error exporting audit data')
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const getEventTypeIcon = (eventType: AuditEventType) => {
    const iconMap = {
      'decision_created': Clock,
      'decision_modified': RefreshCw,
      'decision_delegated': User,
      'decision_appealed': AlertTriangle,
      'appeal_reviewed': Eye,
      'profile_created': CheckCircle2,
      'compliance_review': Shield,
      'audit_export': Download
    }
    
    const IconComponent = iconMap[eventType] || FileText
    return <IconComponent className="h-4 w-4" />
  }

  const getEventTypeColor = (eventType: AuditEventType) => {
    const colorMap = {
      'decision_created': 'bg-blue-100 text-blue-800 border-blue-300',
      'decision_modified': 'bg-orange-100 text-orange-800 border-orange-300',
      'decision_delegated': 'bg-purple-100 text-purple-800 border-purple-300',
      'decision_appealed': 'bg-red-100 text-red-800 border-red-300',
      'appeal_reviewed': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'profile_created': 'bg-green-100 text-green-800 border-green-300',
      'compliance_review': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'audit_export': 'bg-gray-100 text-gray-800 border-gray-300'
    }
    
    return colorMap[eventType] || 'bg-slate-100 text-slate-800 border-slate-300'
  }

  const getIntegrityScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 80) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getSeverityBadge = (severity: 'low' | 'medium' | 'high') => {
    const variants = {
      'low': 'bg-blue-100 text-blue-800 border-blue-300',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'high': 'bg-red-100 text-red-800 border-red-300'
    }
    
    return (
      <Badge className={cn('text-xs', variants[severity])}>
        {severity.toUpperCase()}
      </Badge>
    )
  }

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    }).format(date)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-6xl max-h-[90vh] overflow-hidden", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Audit Trail - Decision {decisionId.substring(0, 8)}...
          </DialogTitle>
          <DialogDescription>
            Immutable audit record of all decision-related activities with integrity verification
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Main Audit Trail */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters and Actions */}
            <div className="flex items-center gap-3 pb-2">
              <Select
                value={filters.auditEventTypes?.[0] || 'all'}
                onValueChange={(value) => 
                  setFilters(prev => ({ 
                    ...prev, 
                    auditEventTypes: value === 'all' ? undefined : [value as AuditEventType]
                  }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="decision_created">Decision Created</SelectItem>
                  <SelectItem value="decision_modified">Decision Modified</SelectItem>
                  <SelectItem value="decision_delegated">Decision Delegated</SelectItem>
                  <SelectItem value="compliance_review">Compliance Review</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1" />

              {showIntegrityVerification && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={verifyIntegrity}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Verify Integrity
                </Button>
              )}

              {enableExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAuditData}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Export
                </Button>
              )}
            </div>

            <Separator />

            {/* Audit Records */}
            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading audit trail...
                </div>
              ) : auditRecords.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No audit records found for this decision
                </div>
              ) : (
                <div className="space-y-4 pr-4">
                  {auditRecords.map((record) => (
                    <Card key={record.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getEventTypeIcon(record.auditEventType)}
                            <Badge className={getEventTypeColor(record.auditEventType)}>
                              {record.auditEventType.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {record.complianceFlag && (
                              <Badge variant="outline" className="text-xs">
                                <Shield className="h-3 w-3 mr-1" />
                                Compliance
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTimestamp(record.createdAt)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-600">Actor</div>
                            <div className="flex items-center gap-2">
                              {record.isSystemGenerated ? (
                                <Monitor className="h-4 w-4 text-blue-600" />
                              ) : (
                                <User className="h-4 w-4 text-gray-600" />
                              )}
                              <span>{record.actorName}</span>
                              {record.isSystemGenerated && (
                                <Badge variant="secondary" className="text-xs">System</Badge>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-600">Change Reason</div>
                            <div>{record.changeReason}</div>
                          </div>
                        </div>

                        {(record.previousState || record.newState) && (
                          <div>
                            <div className="font-medium text-gray-600 mb-2">State Changes</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              {record.previousState && (
                                <div className="bg-red-50 p-2 rounded border">
                                  <div className="font-medium text-red-700 mb-1">Previous State</div>
                                  <pre className="whitespace-pre-wrap text-red-600">
                                    {JSON.stringify(record.previousState, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {record.newState && (
                                <div className="bg-green-50 p-2 rounded border">
                                  <div className="font-medium text-green-700 mb-1">New State</div>
                                  <pre className="whitespace-pre-wrap text-green-600">
                                    {JSON.stringify(record.newState, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-gray-500 pt-2 border-t">
                          <div>Digital Signature: {record.digitalSignature.substring(0, 32)}...</div>
                          {record.clientIpAddress && (
                            <div>IP Address: {record.clientIpAddress}</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Sidebar - Integrity Report */}
          <div className="space-y-4">
            {integrityReport && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Integrity Report
                  </CardTitle>
                  <CardDescription>
                    Last verified: {formatTimestamp(integrityReport.lastVerified)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={cn(
                    "text-center p-4 rounded-lg border",
                    getIntegrityScoreColor(integrityReport.integrityScore)
                  )}>
                    <div className="text-2xl font-bold">
                      {integrityReport.integrityScore}%
                    </div>
                    <div className="text-sm font-medium">Integrity Score</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-600">Total Records</div>
                      <div className="text-lg font-semibold">{integrityReport.totalRecords}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-600">Verified</div>
                      <div className="text-lg font-semibold text-green-600">
                        {integrityReport.verifiedRecords}
                      </div>
                    </div>
                  </div>

                  {integrityReport.suspiciousActivities.length > 0 && (
                    <div>
                      <div className="font-medium text-gray-600 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        Suspicious Activities
                      </div>
                      <ScrollArea className="max-h-32">
                        <div className="space-y-2">
                          {integrityReport.suspiciousActivities.map((activity, index) => (
                            <div key={index} className="text-xs p-2 bg-orange-50 rounded border">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">Record {activity.recordId.substring(0, 8)}</span>
                                {getSeverityBadge(activity.severity)}
                              </div>
                              <div className="text-orange-800">{activity.issue}</div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Total Records:</span>
                  <span className="font-semibold">{auditRecords.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>System Generated:</span>
                  <span className="font-semibold">
                    {auditRecords.filter(r => r.isSystemGenerated).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Compliance Flagged:</span>
                  <span className="font-semibold">
                    {auditRecords.filter(r => r.complianceFlag).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Date Range:</span>
                  <span className="font-semibold">
                    {auditRecords.length > 0 && (
                      `${auditRecords[auditRecords.length - 1]?.createdAt.toLocaleDateString()} - ${auditRecords[0]?.createdAt.toLocaleDateString()}`
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}