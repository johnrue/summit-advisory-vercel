"use client"

import { useState } from 'react'
import { HiringKanbanBoard } from '@/components/kanban/HiringKanbanBoard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Filter, 
  Search, 
  Download, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle,
  Shield,
  Settings,
  UserCheck
} from 'lucide-react'
import type { GuardApplication, KanbanFilters, PipelineStage } from '@/lib/types/kanban-workflow'

export default function AdminKanbanPage() {
  const [selectedApplication, setSelectedApplication] = useState<GuardApplication | null>(null)
  const [filters, setFilters] = useState<KanbanFilters>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Handle application selection from Kanban board
  const handleApplicationSelect = (application: GuardApplication) => {
    setSelectedApplication(application)
    // TODO: Open application details modal or sidebar
    console.log('Admin selected application:', application)
  }

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setFilters(prev => ({
      ...prev,
      searchQuery: query
    }))
  }

  // Handle filter changes
  const handleFilterChange = (key: keyof KanbanFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            <Shield className="inline-block mr-3 h-8 w-8 text-blue-600" />
            Admin Hiring Pipeline
          </h2>
          <p className="text-muted-foreground">
            Comprehensive oversight of all guard applications and workflow management
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Pipeline Config
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export All
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Advanced Filters
          </Button>
        </div>
      </div>

      {/* Admin-specific Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
            <p className="text-xs text-muted-foreground">Across all managers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manager Workload</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2</div>
            <p className="text-xs text-muted-foreground">Avg apps per manager</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">Pipeline efficiency</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bottlenecks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Stages need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Advanced Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search all applications..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select onValueChange={(value) => {
          // Handle manager filter for admin view
          const managers = value === 'all' ? undefined : [value]
          handleFilterChange('assignedManagers', managers)
        }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by Manager" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Managers</SelectItem>
            <SelectItem value="manager-1">John Smith</SelectItem>
            <SelectItem value="manager-2">Jane Doe</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => {
          const priorities = value === 'all' ? undefined : [parseInt(value)]
          handleFilterChange('priorities', priorities)
        }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="1">P1 - Critical</SelectItem>
            <SelectItem value="2">P2 - High</SelectItem>
            <SelectItem value="3">P3 - Medium</SelectItem>
            <SelectItem value="5">P5 - Normal</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => {
          const stages = value === 'all' ? undefined : [value as PipelineStage]
          handleFilterChange('stages', stages)
        }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="lead_captured">Lead Captured</SelectItem>
            <SelectItem value="application_received">Application Received</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="background_check">Background Check</SelectItem>
            <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content with Admin Tabs */}
      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="managers">Manager View</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-4">
          {/* Admin Kanban Board - Shows all applications */}
          <div className="min-h-[600px]">
            <HiringKanbanBoard
              initialFilters={filters}
              onApplicationSelect={handleApplicationSelect}
              showMetrics={true}
              enableRealTimeUpdates={true}
              className="w-full"
            />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {/* Enhanced Analytics for Admin */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Pipeline Flow Analysis</CardTitle>
                <CardDescription>
                  Application flow and conversion rates across all stages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  [Sankey chart placeholder - Pipeline flow visualization]
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Stage Bottlenecks</CardTitle>
                <CardDescription>
                  Stages with longest processing times
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Background Check</span>
                    <Badge variant="destructive">12 days avg</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Under Review</span>
                    <Badge variant="secondary">8 days avg</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Interview Scheduled</span>
                    <Badge variant="secondary">3 days avg</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Manager Performance Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Manager Performance Comparison</CardTitle>
              <CardDescription>
                Comparative metrics across all hiring managers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                [Bar chart placeholder - Manager performance metrics]
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="managers" className="space-y-4">
          {/* Manager Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>John Smith</CardTitle>
                <CardDescription>Senior Hiring Manager</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Active Applications</span>
                    <Badge>23</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Approval Rate</span>
                    <Badge variant="secondary">72%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Processing Time</span>
                    <Badge variant="outline">6 days</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Jane Doe</CardTitle>
                <CardDescription>Hiring Manager</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Active Applications</span>
                    <Badge>18</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Approval Rate</span>
                    <Badge variant="secondary">68%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Processing Time</span>
                    <Badge variant="outline">8 days</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Unassigned</CardTitle>
                <CardDescription>Pending Assignment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Unassigned Applications</span>
                    <Badge variant="destructive">7</Badge>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    Auto-Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          {/* Compliance Dashboard */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Background Check Status</CardTitle>
                <CardDescription>
                  Current status of all background verification processes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Completed</span>
                    <Badge variant="secondary">45</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>In Progress</span>
                    <Badge>12</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Pending</span>
                    <Badge variant="destructive">8</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Failed</span>
                    <Badge variant="outline">3</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Document Compliance</CardTitle>
                <CardDescription>
                  Required documentation completion rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Complete Profiles</span>
                    <Badge variant="secondary">78%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Missing Documents</span>
                    <Badge variant="destructive">15</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Expired Certifications</span>
                    <Badge variant="outline">4</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {/* Pipeline Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Configuration</CardTitle>
              <CardDescription>
                Configure workflow stages and automation rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  Manage Pipeline Stages
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Email Templates & Notifications
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Automation Rules
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Manager Assignment Logic
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Application Details Sidebar for Admin */}
      {selectedApplication && (
        <div className="fixed inset-y-0 right-0 z-50 w-96 bg-background shadow-lg border-l">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {selectedApplication.first_name} {selectedApplication.last_name}
              </h3>
              <Badge variant="outline">Admin View</Badge>
            </div>
            <div className="space-y-4">
              <div>
                <Badge variant="outline">
                  {selectedApplication.pipeline_stage.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{selectedApplication.email}</p>
              </div>
              {selectedApplication.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{selectedApplication.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <p>P{selectedApplication.priority}</p>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
                  View Full Details
                </Button>
                <Button variant="outline" className="w-full">
                  Reassign Manager
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setSelectedApplication(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}