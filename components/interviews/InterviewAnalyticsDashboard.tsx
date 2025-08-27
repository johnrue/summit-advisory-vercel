"use client"

// Story 2.6: Interview Analytics Dashboard Component
// Comprehensive interview metrics, audit trail, and hiring performance analytics

import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Calendar, Users, Clock, CheckCircle, XCircle, AlertCircle, Filter, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InterviewService } from '@/lib/services/interview-service'
import type { Interview, InterviewType, InterviewStatus, RecommendationType } from '@/lib/types/interview-types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const interviewService = new InterviewService()

interface InterviewMetrics {
  totalInterviews: number
  completedInterviews: number
  cancelledInterviews: number
  noShowRate: number
  averageRating: number
  hiringRate: number
  averageDuration: number
  interviewsByType: Record<InterviewType, number>
  interviewsByStatus: Record<InterviewStatus, number>
  recommendationDistribution: Record<RecommendationType, number>
  weeklyTrends: Array<{
    week: string
    scheduled: number
    completed: number
    rating: number
  }>
  topInterviewers: Array<{
    id: string
    name: string
    interviews: number
    averageRating: number
    hiringRate: number
  }>
}

interface FilterOptions {
  dateRange: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'all_time'
  interviewType?: InterviewType
  status?: InterviewStatus
  interviewerId?: string
}

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
]

export function InterviewAnalyticsDashboard({ className }: { className?: string }) {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [metrics, setMetrics] = useState<InterviewMetrics | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({ dateRange: 'last_30_days' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadInterviewData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Calculate date range based on filter
      const now = new Date()
      let startDate = new Date()
      
      switch (filters.dateRange) {
        case 'last_7_days':
          startDate.setDate(now.getDate() - 7)
          break
        case 'last_30_days':
          startDate.setDate(now.getDate() - 30)
          break
        case 'last_90_days':
          startDate.setDate(now.getDate() - 90)
          break
        case 'all_time':
          startDate = new Date('2020-01-01')
          break
      }

      const result = await interviewService.getInterviewsByFilters({
        dateRange: { startDate, endDate: now },
        interviewTypes: filters.interviewType ? [filters.interviewType] : undefined,
        status: filters.status ? [filters.status] : undefined,
        interviewerIds: filters.interviewerId ? [filters.interviewerId] : undefined
      })

      if (result.success) {
        setInterviews(result.data)
        const calculatedMetrics = calculateMetrics(result.data)
        setMetrics(calculatedMetrics)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to load interview analytics')
      console.error('Analytics loading error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadInterviewData()
  }, [loadInterviewData])

  const calculateMetrics = useCallback((interviewData: Interview[]): InterviewMetrics => {
    const totalInterviews = interviewData.length
    const completedInterviews = interviewData.filter(i => i.status === 'completed').length
    const cancelledInterviews = interviewData.filter(i => i.status === 'cancelled').length
    const noShows = interviewData.filter(i => i.status === 'no_show').length
    
    const completedWithRatings = interviewData.filter(i => i.status === 'completed' && i.overallRating)
    const averageRating = completedWithRatings.length > 0 
      ? completedWithRatings.reduce((sum, i) => sum + (i.overallRating || 0), 0) / completedWithRatings.length 
      : 0

    const hiredCount = interviewData.filter(i => 
      i.hiringRecommendation === 'hire' || i.hiringRecommendation === 'strong_hire'
    ).length
    const hiringRate = totalInterviews > 0 ? (hiredCount / totalInterviews) * 100 : 0
    
    const noShowRate = totalInterviews > 0 ? (noShows / totalInterviews) * 100 : 0
    
    const averageDuration = totalInterviews > 0 
      ? interviewData.reduce((sum, i) => sum + i.durationMinutes, 0) / totalInterviews 
      : 0

    // Group by interview type
    const interviewsByType = interviewData.reduce((acc, interview) => {
      acc[interview.interviewType] = (acc[interview.interviewType] || 0) + 1
      return acc
    }, {} as Record<InterviewType, number>)

    // Group by status
    const interviewsByStatus = interviewData.reduce((acc, interview) => {
      acc[interview.status] = (acc[interview.status] || 0) + 1
      return acc
    }, {} as Record<InterviewStatus, number>)

    // Group by recommendation
    const recommendationDistribution = interviewData
      .filter(i => i.hiringRecommendation)
      .reduce((acc, interview) => {
        if (interview.hiringRecommendation) {
          acc[interview.hiringRecommendation] = (acc[interview.hiringRecommendation] || 0) + 1
        }
        return acc
      }, {} as Record<RecommendationType, number>)

    // Weekly trends (simplified - last 8 weeks)
    const weeklyTrends = []
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (i * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const weekInterviews = interviewData.filter(interview => {
        const interviewDate = new Date(interview.scheduledAt)
        return interviewDate >= weekStart && interviewDate <= weekEnd
      })

      const weekCompleted = weekInterviews.filter(i => i.status === 'completed')
      const weekRating = weekCompleted.length > 0
        ? weekCompleted.reduce((sum, i) => sum + (i.overallRating || 0), 0) / weekCompleted.length
        : 0

      weeklyTrends.push({
        week: format(weekStart, 'MMM dd'),
        scheduled: weekInterviews.length,
        completed: weekCompleted.length,
        rating: Math.round(weekRating * 10) / 10
      })
    }

    // Top interviewers (mocked data - would come from user table in real implementation)
    const topInterviewers = [
      { id: '1', name: 'Sarah Johnson', interviews: 15, averageRating: 8.2, hiringRate: 73 },
      { id: '2', name: 'Mike Chen', interviews: 12, averageRating: 7.8, hiringRate: 67 },
      { id: '3', name: 'Lisa Rodriguez', interviews: 10, averageRating: 8.5, hiringRate: 80 }
    ]

    return {
      totalInterviews,
      completedInterviews,
      cancelledInterviews,
      noShowRate: Math.round(noShowRate * 10) / 10,
      averageRating: Math.round(averageRating * 10) / 10,
      hiringRate: Math.round(hiringRate * 10) / 10,
      averageDuration: Math.round(averageDuration),
      interviewsByType,
      interviewsByStatus,
      recommendationDistribution,
      weeklyTrends,
      topInterviewers
    }
  }, [])

  const handleFilterChange = useCallback((key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value === 'all' ? undefined : value }))
  }, [])

  const exportData = useCallback(() => {
    if (!metrics) return

    const csvData = [
      ['Metric', 'Value'],
      ['Total Interviews', metrics.totalInterviews.toString()],
      ['Completed Interviews', metrics.completedInterviews.toString()],
      ['Cancelled Interviews', metrics.cancelledInterviews.toString()],
      ['No Show Rate', `${metrics.noShowRate}%`],
      ['Average Rating', metrics.averageRating.toString()],
      ['Hiring Rate', `${metrics.hiringRate}%`],
      ['Average Duration (min)', metrics.averageDuration.toString()]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `interview-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [metrics])

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading analytics...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!metrics) {
    return null
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Interview Analytics Dashboard
            </CardTitle>
            
            <div className="flex items-center gap-4">
              <Select
                value={filters.dateRange}
                onValueChange={(value) => handleFilterChange('dateRange', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_7_days">Last 7 days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 days</SelectItem>
                  <SelectItem value="last_90_days">Last 90 days</SelectItem>
                  <SelectItem value="all_time">All time</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={exportData} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-900">{metrics.totalInterviews}</p>
                  <p className="text-sm text-blue-600">Total Interviews</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-900">{metrics.completedInterviews}</p>
                  <p className="text-sm text-green-600">Completed</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold text-yellow-900">{metrics.averageRating}/10</p>
                  <p className="text-sm text-yellow-600">Avg Rating</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-900">{metrics.hiringRate}%</p>
                  <p className="text-sm text-purple-600">Hiring Rate</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interview Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Interview Types</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(metrics.interviewsByType).map(([type, count]) => ({
                        name: type.replace('_', ' ').toUpperCase(),
                        value: count
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(metrics.interviewsByType).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Interview Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(metrics.interviewsByStatus).map(([status, count]) => ({
                    status: status.replace('_', ' ').toUpperCase(),
                    count
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Interview Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={metrics.weeklyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="scheduled" fill="#3b82f6" name="Scheduled" />
                  <Bar yAxisId="left" dataKey="completed" fill="#10b981" name="Completed" />
                  <Line yAxisId="right" type="monotone" dataKey="rating" stroke="#f59e0b" strokeWidth={2} name="Avg Rating" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Interviewers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Interviewers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.topInterviewers.map((interviewer, index) => (
                    <div key={interviewer.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{interviewer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {interviewer.interviews} interviews
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{interviewer.averageRating}/10 rating</p>
                        <p className="text-sm text-muted-foreground">{interviewer.hiringRate}% hiring</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hiring Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Hiring Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(metrics.recommendationDistribution).map(([rec, count]) => ({
                        name: rec.replace('_', ' ').toUpperCase(),
                        value: count
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(metrics.recommendationDistribution).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Interview Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {interviews.slice(0, 10).map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {interview.interviewType.replace('_', ' ').toUpperCase()} Interview
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(interview.scheduledAt, 'PPp')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{interview.status.replace('_', ' ')}</Badge>
                      {interview.overallRating && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Rating: {interview.overallRating}/10
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}