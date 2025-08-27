"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Clock, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react'
import { BackgroundCheckExpiryTracker } from '@/components/background-check/BackgroundCheckExpiryTracker'
import { useExpiryTracking } from '@/hooks/use-expiry-tracking'

export default function BackgroundCheckDashboard() {
  const { 
    expiryAlerts, 
    metrics, 
    isLoading,
    sendBulkReminders,
    getSummaryStats 
  } = useExpiryTracking({
    daysAhead: 30,
    autoRefresh: true,
    refreshInterval: 15
  })

  const summaryStats = getSummaryStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Background Check Management</h1>
          <p className="text-muted-foreground">
            Monitor background check status, expiry alerts, and compliance tracking
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => sendBulkReminders(7)}
            disabled={summaryStats.requiresImmediateAction === 0}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Send Urgent Reminders ({summaryStats.requiresImmediateAction})
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalChecks || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active background checks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics?.completedChecks || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.complianceRate || 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summaryStats.urgentCount + summaryStats.soonCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Within 14 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Actions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summaryStats.requiresImmediateAction}
            </div>
            <p className="text-xs text-muted-foreground">
              Expired or urgent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <Tabs defaultValue="expiry-tracker" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expiry-tracker" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Expiry Tracker
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expiry-tracker">
          <BackgroundCheckExpiryTracker
            daysAhead={30}
            onReminderSent={(applicationId) => {
              console.log('Reminder sent for application:', applicationId)
            }}
          />
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Processing Performance</CardTitle>
                <CardDescription>
                  Background check processing efficiency metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Processing Time</span>
                  <Badge variant="secondary">
                    {metrics?.averageProcessingDays || 0} days
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Compliance Rate</span>
                  <Badge variant={metrics?.complianceRate && metrics.complianceRate >= 90 ? "default" : "destructive"}>
                    {metrics?.complianceRate || 0}%
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Failed Checks</span>
                  <Badge variant="outline">
                    {metrics?.failedChecks || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expiry Summary</CardTitle>
                <CardDescription>
                  Background check expiry tracking overview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Expired</span>
                    <Badge variant="destructive">
                      {summaryStats.expiredCount}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Urgent (≤7 days)</span>
                    <Badge variant="destructive">
                      {summaryStats.urgentCount}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Soon (8-14 days)</span>
                    <Badge variant="secondary">
                      {summaryStats.soonCount}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Upcoming (15-30 days)</span>
                    <Badge variant="outline">
                      {summaryStats.upcomingCount}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}