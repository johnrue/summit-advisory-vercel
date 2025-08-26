'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { 
  Shield, 
  ChevronDown, 
  ChevronRight,
  Check,
  X,
  Users,
  UserCheck,
  Calendar,
  ClipboardList,
  BarChart3,
  FileText,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserSupportInfo, PermissionComparison } from '@/lib/admin/user-support-service'

interface UserPermissionViewerProps {
  user: UserSupportInfo
  permissionComparison?: PermissionComparison | null
  className?: string
}

const PERMISSION_CATEGORIES = {
  users: {
    label: 'User Management',
    icon: Users,
    color: 'blue'
  },
  guards: {
    label: 'Guard Management',
    icon: UserCheck,
    color: 'green'
  },
  shifts: {
    label: 'Shift Management',
    icon: Calendar,
    color: 'purple'
  },
  leads: {
    label: 'Lead Management',
    icon: ClipboardList,
    color: 'orange'
  },
  compliance: {
    label: 'Compliance & Audits',
    icon: BarChart3,
    color: 'red'
  },
  reports: {
    label: 'Reporting',
    icon: FileText,
    color: 'indigo'
  },
  system: {
    label: 'System Administration',
    icon: Settings,
    color: 'gray'
  }
}

export function UserPermissionViewer({ 
  user, 
  permissionComparison,
  className 
}: UserPermissionViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  // Group permissions by category
  const groupedPermissions = user.permissions.reduce((acc, permission) => {
    const category = permission.split('.')[0]
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(permission)
    return acc
  }, {} as Record<string, string[]>)

  const formatPermissionName = (permission: string): string => {
    const parts = permission.split('.')
    if (parts.length < 2) return permission
    
    const action = parts[1].replace(/_/g, ' ')
    return action.charAt(0).toUpperCase() + action.slice(1)
  }

  const getPermissionDescription = (permission: string): string => {
    const descriptions: Record<string, string> = {
      'users.view_all': 'View all user accounts',
      'users.create': 'Create new user accounts',
      'users.edit': 'Edit user account details',
      'users.delete': 'Delete user accounts',
      'guards.view_all': 'View all guard profiles',
      'guards.create': 'Create guard profiles',
      'guards.edit': 'Edit guard profiles',
      'guards.delete': 'Delete guard profiles',
      'guards.edit_profiles': 'Edit guard profile information',
      'guards.assign_shifts': 'Assign shifts to guards',
      'guards.manage_applications': 'Manage guard applications',
      'shifts.view_all': 'View all shifts',
      'shifts.create': 'Create new shifts',
      'shifts.edit': 'Edit shift details',
      'shifts.assign': 'Assign shifts to guards',
      'shifts.view_own': 'View own assigned shifts',
      'leads.view_all': 'View all leads',
      'leads.create': 'Create new leads',
      'leads.edit': 'Edit lead information',
      'leads.delete': 'Delete leads',
      'leads.assign': 'Assign leads to team members',
      'leads.manage_pipeline': 'Manage lead pipeline',
      'compliance.view_all': 'View compliance reports',
      'compliance.create_reports': 'Create compliance reports',
      'compliance.manage_audits': 'Manage audit processes',
      'reports.view_all': 'View all reports',
      'reports.create': 'Create new reports',
      'reports.export': 'Export report data',
      'reports.view_assigned': 'View assigned reports',
      'system.manage_roles': 'Manage user roles',
      'system.view_audit_logs': 'View system audit logs',
      'system.manage_settings': 'Manage system settings'
    }
    
    return descriptions[permission] || 'System permission'
  }

  return (
    <div className={className}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0">
            <h3 className="text-sm font-medium text-muted-foreground">
              Detailed Permissions
            </h3>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 mt-4">
          {/* Permission Comparison Summary */}
          {permissionComparison && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Permission Comparison</CardTitle>
                <CardDescription className="text-xs">
                  Comparison between admin and user permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-green-600">
                    {permissionComparison.sharedPermissions.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Shared</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-blue-600">
                    {permissionComparison.adminOnlyPermissions.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Admin Only</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-orange-600">
                    {permissionComparison.userOnlyPermissions.length}
                  </div>
                  <div className="text-xs text-muted-foreground">User Only</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Permissions by Category */}
          <div className="space-y-3">
            {Object.entries(groupedPermissions).map(([category, permissions]) => {
              const categoryConfig = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES]
              const Icon = categoryConfig?.icon || Shield
              const isExpanded = expandedCategories[category]
              
              return (
                <Card key={category}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4" />
                            <div>
                              <CardTitle className="text-sm">
                                {categoryConfig?.label || category.charAt(0).toUpperCase() + category.slice(1)}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {permissions.length} permission{permissions.length !== 1 ? 's' : ''}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {permissions.length}
                            </Badge>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {permissions.map(permission => {
                            const isShared = permissionComparison?.sharedPermissions.includes(permission)
                            const isUserOnly = permissionComparison?.userOnlyPermissions.includes(permission)
                            
                            return (
                              <div
                                key={permission}
                                className={cn(
                                  "flex items-center justify-between p-2 rounded border",
                                  isShared && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
                                  isUserOnly && "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800",
                                  !isShared && !isUserOnly && "bg-muted/30"
                                )}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs font-mono px-1 py-0.5 bg-muted rounded">
                                      {permission}
                                    </code>
                                    {isShared && <Check className="h-3 w-3 text-green-600" />}
                                    {isUserOnly && <Badge variant="outline" className="text-xs">User Only</Badge>}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {getPermissionDescription(permission)}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )
            })}
          </div>

          {/* No Permissions Message */}
          {user.permissions.length === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="text-center">
                  <X className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No permissions assigned to this user.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}