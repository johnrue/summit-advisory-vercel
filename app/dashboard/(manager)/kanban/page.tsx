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
  CheckCircle
} from 'lucide-react'
import type { GuardApplication, KanbanFilters, PipelineStage } from '@/lib/types/kanban-workflow'

export default function ManagerKanbanPage() {
  const [selectedApplication, setSelectedApplication] = useState<GuardApplication | null>(null)
  const [filters, setFilters] = useState<KanbanFilters>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Handle application selection from Kanban board
  const handleApplicationSelect = (application: GuardApplication) => {
    setSelectedApplication(application)
    // TODO: Open application details modal or sidebar
    console.log('Selected application:', application)
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
          <h2 className="text-3xl font-bold tracking-tight">Hiring Pipeline</h2>
          <p className="text-muted-foreground">
            Manage guard applications through the hiring workflow
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Search and Quick Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select onValueChange={(value) => handleFilterChange('showOnlyAssignedToMe', value === 'me')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Assignment filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Applications</SelectItem>
            <SelectItem value="me">Assigned to Me</SelectItem>
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
      </div>

      {/* Main Content */}
      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-4">
          {/* Kanban Board */}
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
          {/* Analytics Dashboard */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">47</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">68%</div>
                <p className="text-xs text-muted-foreground">+5% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Processing Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">7 days</div>
                <p className="text-xs text-muted-foreground">-2 days from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">2 approved, 1 rejected</p>
              </CardContent>
            </Card>
          </div>

          {/* Stage Performance Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Stage Performance</CardTitle>
              <CardDescription>
                Average time spent in each pipeline stage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                [Chart placeholder - Workflow stage performance metrics]
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {/* Reports Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Reports</CardTitle>
                <CardDescription>
                  Generate reports on hiring pipeline performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  Weekly Pipeline Summary
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Manager Performance Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Application Source Analysis
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Time-to-Hire Metrics
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Reports</CardTitle>
                <CardDescription>
                  Background check and compliance tracking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  Background Check Status
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Document Compliance Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Certification Tracking
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Audit Trail Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Application Details Sidebar (Future Enhancement) */}
      {selectedApplication && (
        <div className="fixed inset-y-0 right-0 z-50 w-96 bg-background shadow-lg border-l">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {selectedApplication.first_name} {selectedApplication.last_name}
            </h3>
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
      )}
    </div>
  )
}