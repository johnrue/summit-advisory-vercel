'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Target, 
  Filter,
  RefreshCw,
  Download,
  Settings,
  Plus,
  Search,
  MoreVertical
} from 'lucide-react'
import { UnifiedLeadGrid } from '@/components/dashboard/leads/unified/UnifiedLeadGrid'
import { UnifiedAnalyticsDashboard } from '@/components/dashboard/analytics/UnifiedAnalyticsDashboard'
import { LeadFilterPanel } from '@/components/dashboard/leads/unified/LeadFilterPanel'
import { LeadActionPanel } from '@/components/dashboard/leads/unified/LeadActionPanel'
import { ManagerDashboardView } from '@/components/dashboard/leads/unified/ManagerDashboardView'
import { WorkloadDistributionView } from '@/components/dashboard/assignment/WorkloadDistributionView'
import { AssignmentRecommendations } from '@/components/dashboard/assignment/AssignmentRecommendations'
import { ExportManager } from '@/components/dashboard/export/ExportManager'
import { useDashboardState } from '@/hooks/use-dashboard-state'
import { useUnifiedLeads } from '@/hooks/use-unified-leads'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { FilterCriteria } from '@/lib/types/unified-leads'

export default function UnifiedLeadDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [selectedManager, setSelectedManager] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Dashboard state management
  const {
    state: dashboardState,
    updateFilters,
    switchView,
    refreshDashboard,
    isLoading: dashboardLoading
  } = useDashboardState()

  // Lead data management
  const {
    leads,
    analytics,
    isLoading: leadsLoading,
    error: leadsError,
    refetch: refetchLeads
  } = useUnifiedLeads(dashboardState?.currentFilters)

  // Handle filter updates
  const handleFilterChange = async (filters: FilterCriteria) => {
    if (!dashboardState?.activeView.userId) return
    
    await updateFilters(dashboardState.activeView.userId, filters)
  }

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    
    const filters: FilterCriteria = {
      ...dashboardState?.currentFilters,
      // Add search to custom filters
      customFilters: [
        ...(dashboardState?.currentFilters.customFilters || []),
        {
          field: 'search',
          operator: 'contains',
          value: query
        }
      ]
    }
    
    handleFilterChange(filters)
  }

  // Loading state
  const isLoading = dashboardLoading || leadsLoading

  if (!dashboardState) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Initializing dashboard...</span>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Dashboard</h1>
          <p className="text-muted-foreground">
            Unified view of client and guard leads with advanced analytics
          </p>
        </div>
        
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
            onClick={refreshDashboard}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportModal(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>View Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowViewModal(true)}>
                Manage Views
              </DropdownMenuItem>
              <DropdownMenuItem>
                Save Current View
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Reset to Default
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : analytics?.totalLeads || 0}
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{analytics?.clientLeads || 0} client</span>
              <span>•</span>
              <span>{analytics?.guardLeads || 0} guard</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `${analytics?.conversionRate?.toFixed(1) || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              Across both pipelines
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `${analytics?.averageResponseTime?.toFixed(1) || 0}h`}
            </div>
            <p className="text-xs text-muted-foreground">
              Time to first contact
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Managers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : analytics?.managerPerformance?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Managing leads
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, email, or source..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        
        {/* Quick Filters */}
        <Select 
          value={dashboardState?.currentFilters.leadType?.[0] || 'all'} 
          onValueChange={(value) => {
            const leadType = value === 'all' ? ['client', 'guard'] : [value as 'client' | 'guard']
            handleFilterChange({
              ...dashboardState?.currentFilters,
              leadType
            })
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Lead Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leads</SelectItem>
            <SelectItem value="client">Client Only</SelectItem>
            <SelectItem value="guard">Guard Only</SelectItem>
          </SelectContent>
        </Select>
        
        <Select 
          value={dashboardState?.currentFilters.statuses?.[0] || 'all'}
          onValueChange={(value) => {
            const statuses = value === 'all' ? undefined : [value]
            handleFilterChange({
              ...dashboardState?.currentFilters,
              statuses
            })
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Filters</CardTitle>
            <CardDescription>
              Filter leads by multiple criteria and save presets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeadFilterPanel
              currentFilters={dashboardState?.currentFilters}
              onFiltersChange={handleFilterChange}
              onSavePreset={() => {}} // Will implement preset saving
            />
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <UnifiedLeadGrid 
            leads={leads || []}
            isLoading={isLoading}
            error={leadsError}
            onRefresh={refetchLeads}
            onLeadClick={setSelectedLead}
          />
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          <UnifiedAnalyticsDashboard
            filters={dashboardState?.currentFilters || {
              dateRange: { start: new Date(), end: new Date() }
            }}
            refreshTrigger={undefined}
          />
        </TabsContent>
        
        <TabsContent value="assignment" className="space-y-6">
          <div className="grid gap-6">
            <WorkloadDistributionView
              onManagerSelect={setSelectedManager}
            />
            
            <AssignmentRecommendations
              unassignedLeadIds={leads?.filter(l => !l.assignedManager).map(l => l.id) || []}
              onAssignmentComplete={(leadId, managerId) => {
                // Refresh leads after assignment
                refetchLeads()
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <ExportManager
            currentFilters={dashboardState?.currentFilters || {
              dateRange: { start: new Date(), end: new Date() }
            }}
            onExportComplete={(result) => {
              console.log('Export completed:', result)
            }}
          />
        </TabsContent>

        <TabsContent value="personal" className="space-y-6">
          {selectedManager ? (
            <ManagerDashboardView
              managerId={selectedManager}
              managerName="Selected Manager"
              filters={dashboardState?.currentFilters || {
                dateRange: { start: new Date(), end: new Date() }
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Personal Dashboard</CardTitle>
                <CardDescription>
                  Select a manager from the Assignment tab to view their personal dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2" />
                <p>No manager selected</p>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('assignment')}
                  className="mt-4"
                >
                  Go to Assignment Tab
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Lead Action Panel */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg max-w-md w-full mx-4">
            <LeadActionPanel
              lead={selectedLead}
              onClose={() => setSelectedLead(null)}
              onLeadUpdate={(updatedLead) => {
                // Update the lead in the list
                refetchLeads()
                setSelectedLead(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}