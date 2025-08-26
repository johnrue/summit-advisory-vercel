'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/auth-context'
import { useUserRole } from '@/hooks/use-user-role'
import { usePermissionGroups } from '@/hooks/use-permissions'
import { useAdminRoleView } from '@/hooks/use-admin-role-view'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  PermissionGate,
  SystemAdminGate,
  UserManagementGate,
  GuardManagementGate,
  ShiftManagementGate,
  LeadManagementGate,
  ComplianceGate
} from '@/components/auth/permission-gate'
import {
  Home,
  Users,
  Shield,
  Calendar,
  ClipboardList,
  BarChart3,
  Settings,
  UserCog,
  History,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2
} from 'lucide-react'

interface NavigationItem {
  name: string
  href: string
  icon: any
  badge?: string
  permissions?: string[]
  roles?: ('admin' | 'manager' | 'guard' | 'client')[]
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home
  },
  {
    name: 'Overview',
    href: '/dashboard/overview',
    icon: Home
  },
  {
    name: 'User Management',
    href: '/dashboard/admin/user-management',
    icon: Users,
    permissions: ['users.view_all']
  },
  {
    name: 'Role Management',
    href: '/dashboard/admin/role-management',
    icon: UserCog,
    permissions: ['system.manage_roles']
  },
  {
    name: 'Guard Management',
    href: '/dashboard/guards',
    icon: Shield,
    permissions: ['guards.view_all']
  },
  {
    name: 'Shift Management',
    href: '/dashboard/shifts',
    icon: Calendar,
    permissions: ['shifts.view_all']
  },
  {
    name: 'Lead Management',
    href: '/dashboard/leads',
    icon: ClipboardList,
    permissions: ['leads.view_all']
  },
  {
    name: 'Compliance',
    href: '/dashboard/compliance',
    icon: BarChart3,
    permissions: ['compliance.view_all']
  },
  {
    name: 'Audit Logs',
    href: '/dashboard/admin/audit-logs',
    icon: History,
    permissions: ['system.view_audit_logs']
  }
]

interface SidebarNavigationProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function SidebarNavigation({ collapsed = false, onToggleCollapse }: SidebarNavigationProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { role } = useUserRole()
  const { canSwitchRoleViews, currentViewRole } = useAdminRoleView()
  const {
    canManageUsers,
    canManageGuards,
    canManageShifts,
    canManageRoles,
    canViewAuditLogs,
    canManageLeads,
    canViewCompliance
  } = usePermissionGroups()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive'
      case 'manager':
        return 'default'
      case 'guard':
        return 'secondary'
      case 'client':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  // Use current view role for context switching when admin is switching roles
  const displayRole = canSwitchRoleViews ? currentViewRole : role

  // Generate role-specific overview link based on current view role
  const getOverviewLink = () => {
    switch (displayRole) {
      case 'admin':
        return '/dashboard/admin/overview'
      case 'manager':
        return '/dashboard/manager/overview'
      case 'guard':
        return '/dashboard/guard/overview'
      default:
        return '/dashboard'
    }
  }

  // Determine which navigation items should be visible based on current view role
  const getVisibleNavigationItems = () => {
    // When admin is viewing other roles, filter items based on that role's permissions
    if (canSwitchRoleViews && displayRole !== role) {
      // Admin is viewing as manager or guard - filter items accordingly
      return navigationItems.filter(item => {
        if (displayRole === 'manager') {
          // Manager view: show items managers can access
          return item.roles?.includes('manager') || 
                 ['guards', 'shifts', 'leads'].some(area => item.href.includes(area))
        } else if (displayRole === 'guard') {
          // Guard view: show only items guards can access
          return item.roles?.includes('guard') || 
                 item.href.includes('schedule') || 
                 item.name === 'Dashboard'
        }
        return true
      })
    }
    
    // Normal role-based filtering (existing logic)
    return navigationItems
  }

  return (
    <div className={cn(
      "flex h-full flex-col bg-card border-r",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Summit Advisory</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Separator />

      {/* User Info */}
      <div className="p-4">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="text-sm font-medium truncate">
              {user?.email || 'User'}
            </div>
            <Badge 
              variant={getRoleBadgeVariant(displayRole || 'guard')} 
              className="text-xs"
            >
              {displayRole?.toUpperCase() || 'LOADING...'}
            </Badge>
          </div>
        ) : (
          <div className="flex justify-center">
            <Badge 
              variant={getRoleBadgeVariant(displayRole || 'guard')} 
              className="h-8 w-8 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {displayRole?.charAt(0).toUpperCase() || 'U'}
            </Badge>
          </div>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {/* Role-specific Overview Link */}
        <Link
          href={getOverviewLink()}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            pathname === getOverviewLink() ? "bg-accent text-accent-foreground" : "text-muted-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="flex-1">Overview</span>}
        </Link>

        {/* Regular Navigation Items */}
        {getVisibleNavigationItems().filter(item => item.name !== 'Dashboard' && item.name !== 'Overview').map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          // Check if user has required permissions for this item
          // When admin is viewing as another role, check permissions for that role
          const hasAccess = !item.permissions || item.permissions.some(permission => {
            // If admin is switching role views, check permissions based on the view role
            if (canSwitchRoleViews && displayRole !== role) {
              switch (displayRole) {
                case 'manager':
                  // Manager permissions
                  return ['guards.view_all', 'shifts.view_all', 'leads.view_all', 'compliance.view_all'].includes(permission)
                case 'guard':
                  // Guard permissions (very limited)
                  return false // Guards generally don't have access to management features
                case 'admin':
                  // Admin has all permissions
                  return true
                default:
                  return false
              }
            }

            // Normal permission checking
            switch (permission) {
              case 'users.view_all':
                return canManageUsers
              case 'system.manage_roles':
                return canManageRoles
              case 'guards.view_all':
                return canManageGuards
              case 'shifts.view_all':
                return canManageShifts
              case 'leads.view_all':
                return canManageLeads
              case 'compliance.view_all':
                return canViewCompliance
              case 'system.view_audit_logs':
                return canViewAuditLogs
              default:
                return true
            }
          })

          if (!hasAccess) {
            return null
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-2">
        <Separator />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className={cn(
            "w-full justify-start gap-3",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </div>
  )
}