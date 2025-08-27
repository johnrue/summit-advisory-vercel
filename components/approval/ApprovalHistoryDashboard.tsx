"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts'
import { 
  TrendingUp,
  Download,
  Filter,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  FileText,
  BarChart3
} from 'lucide-react'
import type { 
  ApprovalHistoryDashboardProps,
  HiringDecision,
  ApprovalFilters,
  ComplianceReport,
  DecisionType,
  AuthorityLevel
} from '@/lib/types/approval-workflow'
import { approvalWorkflowService } from '@/lib/services/approval-workflow-service'
import { auditTrailService } from '@/lib/services/audit-trail-service'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface DashboardMetrics {
  totalDecisions: number
  approvals: number
  rejections: number
  pending: number
  averageDecisionTime: number
  approvalRate: number
  delegatedDecisions: number
  complianceIssues: number
}

interface DecisionTrend {
  date: string
  approvals: number
  rejections: number
  deferred: number
}

interface ReasonAnalytics {
  reason: string
  count: number
  percentage: number
}

const CHART_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#ec4899']

export const ApprovalHistoryDashboard: React.FC<ApprovalHistoryDashboardProps> = ({
  applicationId,
  managerId,
  showExportOptions = true,
  enableFiltering = true,
  className
}) => {
  const [decisions, setDecisions] = useState<HiringDecision[]>([])
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [trends, setTrends] = useState<DecisionTrend[]>([])
  const [reasonAnalytics, setReasonAnalytics] = useState<ReasonAnalytics[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [filters, setFilters] = useState<ApprovalFilters>({
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      to: new Date()
    }
  })

  useEffect(() => {
    loadDashboardData()
  }, [filters])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Load hiring decisions
      const decisionsResult = await approvalWorkflowService.getHiringDecisions(filters)
      if (decisionsResult.success) {
        setDecisions(decisionsResult.data)
        generateMetrics(decisionsResult.data)
        generateTrends(decisionsResult.data)
        generateReasonAnalytics(decisionsResult.data)
      } else {
        toast.error(`Failed to load decisions: ${decisionsResult.error}`)
      }
    } catch (error) {
      toast.error('Error loading dashboard data')
      console.error('Dashboard loading error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateMetrics = (data: HiringDecision[]) => {
    const approvals = data.filter(d => d.decisionType === 'approved').length
    const rejections = data.filter(d => d.decisionType === 'rejected').length
    const deferred = data.filter(d => d.decisionType === 'deferred').length
    const delegated = data.filter(d => d.delegatedBy).length

    const metrics: DashboardMetrics = {
      totalDecisions: data.length,
      approvals,
      rejections,
      pending: deferred,
      averageDecisionTime: calculateAverageDecisionTime(data),
      approvalRate: data.length > 0 ? Math.round((approvals / data.length) * 100) : 0,
      delegatedDecisions: delegated,
      complianceIssues: 0 // Would be calculated from actual compliance data
    }

    setMetrics(metrics)
  }

  const generateTrends = (data: HiringDecision[]) => {
    // Group decisions by date
    const trendMap = new Map<string, { approvals: number; rejections: number; deferred: number }>()
    
    data.forEach(decision => {
      const dateKey = decision.createdAt.toISOString().split('T')[0]
      const existing = trendMap.get(dateKey) || { approvals: 0, rejections: 0, deferred: 0 }
      
      if (decision.decisionType === 'approved') existing.approvals++
      else if (decision.decisionType === 'rejected') existing.rejections++
      else if (decision.decisionType === 'deferred') existing.deferred++
      
      trendMap.set(dateKey, existing)
    })

    const trends: DecisionTrend[] = Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    setTrends(trends)
  }

  const generateReasonAnalytics = (data: HiringDecision[]) => {
    const reasonCounts = new Map<string, number>()
    
    data.forEach(decision => {
      const reason = decision.decisionReason
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1)
    })

    const analytics: ReasonAnalytics[] = Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({
        reason: reason.replace('_', ' ').toUpperCase(),
        count,
        percentage: data.length > 0 ? Math.round((count / data.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)

    setReasonAnalytics(analytics)
  }

  const calculateAverageDecisionTime = (data: HiringDecision[]): number => {
    // This would calculate based on application submission to decision time
    // For demo purposes, return a mock value
    return 2.5 // days
  }

  const exportComplianceReport = async () => {
    setIsExporting(true)
    try {
      const result = await auditTrailService.generateComplianceReport('approval_summary', {
        dateRange: filters.dateRange,
        includeAuditTrail: true,
        includeDecisionDetails: true
      })

      if (result.success) {
        toast.success(`Compliance report generated: ${result.data.totalDecisions} decisions`)
        // In production, trigger download
        console.log('Compliance report:', result.data)
      } else {
        toast.error(`Export failed: ${result.error}`)
      }
    } catch (error) {
      toast.error('Error generating compliance report')
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const getDecisionTypeIcon = (type: DecisionType) => {
    switch (type) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'deferred':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const getDecisionTypeBadge = (type: DecisionType) => {
    const variants = {
      'approved': 'bg-green-100 text-green-800 border-green-300',
      'rejected': 'bg-red-100 text-red-800 border-red-300',
      'conditionally_approved': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'deferred': 'bg-blue-100 text-blue-800 border-blue-300',
      'withdrawn': 'bg-gray-100 text-gray-800 border-gray-300'
    }
    
    return (
      <Badge className={cn('text-xs', variants[type] || variants.deferred)}>
        {type.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const getAuthorityBadge = (level: AuthorityLevel) => {
    const variants = {
      'junior_manager': 'secondary',
      'senior_manager': 'default',
      'regional_director': 'destructive',
      'admin': 'destructive',
    } as const

    return (
      <Badge variant={variants[level]} className="text-xs">
        {level.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Approval History & Analytics
          </h2>
          <p className="text-gray-600 mt-1">
            Comprehensive approval decision tracking and compliance reporting
          </p>
        </div>
        
        {showExportOptions && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={exportComplianceReport}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export Report
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      {enableFiltering && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Decision Type</label>
                <Select
                  value={filters.decisionTypes?.[0] || 'all'}
                  onValueChange={(value) => 
                    setFilters(prev => ({ 
                      ...prev, 
                      decisionTypes: value === 'all' ? undefined : [value as DecisionType]
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="deferred">Deferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Authority Level</label>
                <Select
                  value={filters.authorityLevels?.[0] || 'all'}
                  onValueChange={(value) => 
                    setFilters(prev => ({ 
                      ...prev, 
                      authorityLevels: value === 'all' ? undefined : [value as AuthorityLevel]
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="junior_manager">Junior Manager</SelectItem>
                    <SelectItem value="senior_manager">Senior Manager</SelectItem>
                    <SelectItem value="regional_director">Regional Director</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">From Date</label>
                <Input
                  type="date"
                  value={filters.dateRange?.from.toISOString().split('T')[0]}
                  onChange={(e) => 
                    setFilters(prev => ({ 
                      ...prev, 
                      dateRange: {
                        from: new Date(e.target.value),
                        to: prev.dateRange?.to || new Date()
                      }
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">To Date</label>
                <Input
                  type="date"
                  value={filters.dateRange?.to.toISOString().split('T')[0]}
                  onChange={(e) => 
                    setFilters(prev => ({ 
                      ...prev, 
                      dateRange: {
                        from: prev.dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        to: new Date(e.target.value)
                      }
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Decisions</p>
                  <p className="text-2xl font-bold">{metrics.totalDecisions}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                  <p className="text-2xl font-bold text-green-600">{metrics.approvalRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Decision Time</p>
                  <p className="text-2xl font-bold">{metrics.averageDecisionTime}d</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Delegated</p>
                  <p className="text-2xl font-bold">{metrics.delegatedDecisions}</p>
                </div>
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Decision Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Decision Trends</CardTitle>
            <CardDescription>Daily approval and rejection trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="approvals" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="rejections" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="deferred" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Reason Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Decision Reasons</CardTitle>
            <CardDescription>Breakdown of decision reasoning</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reasonAnalytics}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percentage }) => `${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {reasonAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Decisions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Decisions</CardTitle>
          <CardDescription>Latest approval and rejection decisions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" />
              <span className="ml-2">Loading decisions...</span>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {decisions.slice(0, 10).map((decision) => (
                  <div
                    key={decision.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {getDecisionTypeIcon(decision.decisionType)}
                      <div>
                        <div className="font-medium">
                          Application {decision.applicationId.substring(0, 8)}...
                        </div>
                        <div className="text-sm text-gray-500">
                          {decision.createdAt.toLocaleDateString()} • Confidence: {decision.decisionConfidence}/10
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getDecisionTypeBadge(decision.decisionType)}
                      {getAuthorityBadge(decision.authorityLevel)}
                      {decision.delegatedBy && (
                        <Badge variant="outline" className="text-xs">
                          Delegated
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}