"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatDistanceToNow, format } from 'date-fns'
import { 
  Calendar,
  Clock,
  DollarSign,
  User,
  Users,
  MessageSquare,
  Paperclip,
  Activity,
  Target,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectComments } from './ProjectComments'
import { ProjectAttachments } from './ProjectAttachments'
import { ProjectActivity } from './ProjectActivity'
import type { InternalProject } from '@/lib/types'

interface ProjectDetailDialogProps {
  project: InternalProject
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (project: InternalProject) => void
}

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700'
} as const

const STATUS_COLORS = {
  backlog: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  review: 'bg-yellow-100 text-yellow-700',
  done: 'bg-green-100 text-green-700'
} as const

export function ProjectDetailDialog({
  project,
  open,
  onOpenChange,
  onUpdate
}: ProjectDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const isOverdue = project.dueDate && new Date(project.dueDate) < new Date()
  const progressPercentage = project.actualHours && project.estimatedHours 
    ? Math.min((project.actualHours / project.estimatedHours) * 100, 100)
    : 0

  const budgetUsage = project.actualCost && project.budget
    ? Math.min((project.actualCost / project.budget) * 100, 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-xl font-semibold leading-tight">
                {project.title}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: project.category.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {project.category.name}
                </span>
                <Separator orientation="vertical" className="h-4" />
                <Badge className={cn('text-xs', STATUS_COLORS[project.status])}>
                  {project.status.replace('_', ' ')}
                </Badge>
                <Badge className={cn('text-xs', PRIORITY_COLORS[project.priority])}>
                  {project.priority}
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Edit Project
            </Button>
          </div>
          <DialogDescription className="text-base leading-relaxed">
            {project.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="comments">
                <MessageSquare className="w-4 h-4 mr-1" />
                Comments ({project.comments?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="attachments">
                <Paperclip className="w-4 h-4 mr-1" />
                Files ({project.attachments?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="activity">
                <Activity className="w-4 h-4 mr-1" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Project Details
                  </h3>

                  <div className="space-y-3">
                    {project.dueDate && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Due Date
                        </div>
                        <span className={cn(
                          'text-sm font-medium',
                          isOverdue ? 'text-red-600' : 'text-foreground'
                        )}>
                          {format(new Date(project.dueDate), 'MMM d, yyyy')}
                          {isOverdue && ' (Overdue)'}
                        </span>
                      </div>
                    )}

                    {project.estimatedHours && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Time Progress
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {project.actualHours || 0}h / {project.estimatedHours}h
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {progressPercentage.toFixed(0)}% complete
                          </div>
                        </div>
                      </div>
                    )}

                    {project.budget && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          Budget Usage
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            ${project.actualCost?.toLocaleString() || 0} / ${project.budget.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {budgetUsage.toFixed(0)}% used
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        Created
                      </div>
                      <span className="text-sm font-medium">
                        {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    {project.completedAt && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Target className="h-4 w-4" />
                          Completed
                        </div>
                        <span className="text-sm font-medium">
                          {formatDistanceToNow(new Date(project.completedAt), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team & Assignments */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team & Assignments
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Owner</span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium">O</span>
                        </div>
                        <span className="text-sm font-medium">Project Owner</span>
                      </div>
                    </div>

                    {project.assignedMembers && project.assignedMembers.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground block mb-2">
                          Assigned Members ({project.assignedMembers.length})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {project.assignedMembers.map((memberId, index) => (
                            <div key={memberId} className="flex items-center gap-2 bg-muted rounded-full px-2 py-1">
                              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-xs font-medium">
                                  {String.fromCharCode(65 + index)}
                                </span>
                              </div>
                              <span className="text-xs">Team Member {index + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bars */}
              {(progressPercentage > 0 || budgetUsage > 0) && (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Progress Overview
                  </h3>

                  {progressPercentage > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Time Progress</span>
                        <span className="font-medium">{progressPercentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {budgetUsage > 0 && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Budget Usage</span>
                        <span className="font-medium">{budgetUsage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={cn(
                            "h-2 rounded-full transition-all duration-300",
                            budgetUsage > 90 ? "bg-red-500" : 
                            budgetUsage > 75 ? "bg-orange-500" : "bg-green-500"
                          )}
                          style={{ width: `${Math.min(budgetUsage, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Impact Metrics */}
              {project.impactMetrics && Object.keys(project.impactMetrics).length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Impact Metrics
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {project.impactMetrics.costSavings && (
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-semibold text-green-700">
                          ${project.impactMetrics.costSavings.toLocaleString()}
                        </div>
                        <div className="text-xs text-green-600">Cost Savings</div>
                      </div>
                    )}
                    {project.impactMetrics.efficiencyGain && (
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-semibold text-blue-700">
                          {project.impactMetrics.efficiencyGain}%
                        </div>
                        <div className="text-xs text-blue-600">Efficiency Gain</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="comments" className="mt-4">
              <ProjectComments 
                project={project} 
                onUpdate={onUpdate}
              />
            </TabsContent>

            <TabsContent value="attachments" className="mt-4">
              <ProjectAttachments 
                project={project} 
                onUpdate={onUpdate}
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <ProjectActivity 
                project={project}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}