"use client"

import { useState } from "react"
import { Search, Filter, Calendar, User, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

export interface FilterCriteria {
  searchQuery: string
  status: string | null
  dateFrom: Date | null
  dateTo: Date | null
  assignedManager: string | null
  applicationSource: string | null
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

interface KanbanFilterPanelProps {
  filters: FilterCriteria
  onFiltersChange: (filters: FilterCriteria) => void
  applicationCount: number
  className?: string
}

const APPLICATION_STATUSES = [
  { value: "new", label: "New Applications", icon: Clock, color: "bg-blue-500" },
  { value: "screening", label: "Screening", icon: Search, color: "bg-yellow-500" },
  { value: "interview", label: "Interview Scheduled", icon: User, color: "bg-purple-500" },
  { value: "background_check", label: "Background Check", icon: AlertCircle, color: "bg-orange-500" },
  { value: "approved", label: "Approved", icon: CheckCircle, color: "bg-green-500" },
  { value: "rejected", label: "Rejected", icon: XCircle, color: "bg-red-500" }
]

const SORT_OPTIONS = [
  { value: "created_at", label: "Application Date" },
  { value: "updated_at", label: "Last Updated" },
  { value: "applicant_name", label: "Applicant Name" },
  { value: "status", label: "Status" }
]

export default function KanbanFilterPanel({ 
  filters, 
  onFiltersChange, 
  applicationCount,
  className 
}: KanbanFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const updateFilter = (key: keyof FilterCriteria, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const clearFilters = () => {
    onFiltersChange({
      searchQuery: "",
      status: null,
      dateFrom: null,
      dateTo: null,
      assignedManager: null,
      applicationSource: null,
      sortBy: "created_at",
      sortOrder: "desc"
    })
  }

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'searchQuery') return value !== ""
    if (key === 'sortBy' || key === 'sortOrder') return false // Don't count sort as active filter
    return value !== null && value !== ""
  }).length

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Filter Applications</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {applicationCount} applications
            </span>
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? "Collapse" : "Expand"}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Always visible: Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or application ID..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick status filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filters.status === null ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter('status', null)}
          >
            All Status
          </Button>
          {APPLICATION_STATUSES.map((status) => {
            const Icon = status.icon
            return (
              <Button
                key={status.value}
                variant={filters.status === status.value ? "default" : "outline"}
                size="sm"
                onClick={() => updateFilter('status', status.value)}
                className="flex items-center space-x-1"
              >
                <div className={cn("w-2 h-2 rounded-full", status.color)} />
                <span>{status.label}</span>
              </Button>
            )
          })}
        </div>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-4">
            {/* Date Range Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-from" className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Date From</span>
                </Label>
                <DatePicker
                  date={filters.dateFrom}
                  onDateChange={(date) => updateFilter('dateFrom', date)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-to" className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Date To</span>
                </Label>
                <DatePicker
                  date={filters.dateTo}
                  onDateChange={(date) => updateFilter('dateTo', date)}
                />
              </div>
            </div>

            {/* Manager and Source Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assigned Manager</Label>
                <Select
                  value={filters.assignedManager || ""}
                  onValueChange={(value) => updateFilter('assignedManager', value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Managers</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value="john.smith">John Smith</SelectItem>
                    <SelectItem value="sarah.johnson">Sarah Johnson</SelectItem>
                    <SelectItem value="mike.davis">Mike Davis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Application Source</Label>
                <Select
                  value={filters.applicationSource || ""}
                  onValueChange={(value) => updateFilter('applicationSource', value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Sources</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="job_board">Job Board</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sort Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => updateFilter('sortBy', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Select
                  value={filters.sortOrder}
                  onValueChange={(value: 'asc' | 'desc') => updateFilter('sortOrder', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {activeFiltersCount > 0 && (
              <div className="flex justify-end pt-2 border-t">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}