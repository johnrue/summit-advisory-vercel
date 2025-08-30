"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FolderOpen,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InternalProject } from '@/lib/types'

interface ProjectStatsProps {
  projects: InternalProject[]
}

export function ProjectStats({ projects }: ProjectStatsProps) {
  const stats = {
    total: projects.length,
    byStatus: {
      backlog: projects.filter(p => p.status === 'backlog').length,
      in_progress: projects.filter(p => p.status === 'in_progress').length,
      review: projects.filter(p => p.status === 'review').length,
      done: projects.filter(p => p.status === 'done').length,
    },
    byPriority: {
      low: projects.filter(p => p.priority === 'low').length,
      medium: projects.filter(p => p.priority === 'medium').length,
      high: projects.filter(p => p.priority === 'high').length,
      critical: projects.filter(p => p.priority === 'critical').length,
    }
  }

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)
  const totalSpent = projects.reduce((sum, p) => sum + (p.actualCost || 0), 0)
  const totalEstimatedHours = projects.reduce((sum, p) => sum + (p.estimatedHours || 0), 0)
  const totalActualHours = projects.reduce((sum, p) => sum + (p.actualHours || 0), 0)

  const completionRate = stats.total > 0 ? (stats.byStatus.done / stats.total) * 100 : 0
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  const overdueProjets = projects.filter(p => 
    p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'done'
  ).length

  const uniqueCategories = new Set(projects.map(p => p.category.name)).size
  const totalAssignees = new Set(
    projects.flatMap(p => p.assignedMembers || [])
  ).size

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="flex gap-1 mt-2">
            <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700">
              {stats.byStatus.backlog} backlog
            </Badge>
            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
              {stats.byStatus.in_progress} active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Completion Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
          <div className="flex gap-1 mt-2">
            <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
              {stats.byStatus.done} completed
            </Badge>
            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700">
              {stats.byStatus.review} in review
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Budget Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budget Overview</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalSpent.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            of ${totalBudget.toLocaleString()} allocated
          </p>
          <div className="mt-2">
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                budgetUtilization > 90 ? "bg-red-100 text-red-700" :
                budgetUtilization > 75 ? "bg-orange-100 text-orange-700" :
                "bg-green-100 text-green-700"
              )}
            >
              {budgetUtilization.toFixed(0)}% utilized
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Time Tracking */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Time Tracking</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalActualHours.toFixed(0)}h</div>
          <p className="text-xs text-muted-foreground">
            of {totalEstimatedHours.toFixed(0)}h estimated
          </p>
          <div className="flex gap-1 mt-2">
            {overdueProjets > 0 && (
              <Badge variant="outline" className="text-xs bg-red-100 text-red-700">
                <AlertCircle className="w-3 h-3 mr-1" />
                {overdueProjets} overdue
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Row */}
      <div className="col-span-full">
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold">{uniqueCategories}</div>
                <div className="text-xs text-muted-foreground">Categories</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{totalAssignees}</div>
                <div className="text-xs text-muted-foreground">Team Members</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{stats.byPriority.critical + stats.byPriority.high}</div>
                <div className="text-xs text-muted-foreground">High Priority</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {projects.filter(p => p.isRecurring).length}
                </div>
                <div className="text-xs text-muted-foreground">Recurring</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}