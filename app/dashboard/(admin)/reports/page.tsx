'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminOnlyGate } from '@/components/auth/permission-gate'
import { MetricsOverview } from '@/components/dashboard/reports/metrics-overview'
import { DataExportPanel } from '@/components/dashboard/reports/data-export-panel'
import { ReportScheduler } from '@/components/dashboard/reports/report-scheduler'
import { CustomReportBuilder } from '@/components/dashboard/reports/custom-report-builder'
import { ReportsAuditLog } from '@/components/dashboard/reports/reports-audit-log'
import { BarChart3, Download, Calendar, Settings, Shield } from 'lucide-react'

export default function AdminReportsDashboard() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <AdminOnlyGate>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive reporting and data export capabilities for operational insights
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Audit Log
            </Button>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Data Export</span>
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Scheduled Reports</span>
            </TabsTrigger>
            <TabsTrigger value="builder" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Custom Builder</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Audit</span>
            </TabsTrigger>
          </TabsList>

          {/* Metrics Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <MetricsOverview />
          </TabsContent>

          {/* Data Export Tab */}
          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Export System</CardTitle>
                <CardDescription>
                  Export operational data in multiple formats with flexible filtering options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataExportPanel />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scheduled Reports Tab */}
          <TabsContent value="scheduled" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Automated Report Scheduling</CardTitle>
                <CardDescription>
                  Configure and manage automated reports with email delivery
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReportScheduler />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Report Builder Tab */}
          <TabsContent value="builder" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Report Builder</CardTitle>
                <CardDescription>
                  Build custom reports with drag-and-drop interface and advanced filtering
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CustomReportBuilder />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reports Audit Trail</CardTitle>
                <CardDescription>
                  Complete audit trail of all report generation and export activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReportsAuditLog />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminOnlyGate>
  )
}