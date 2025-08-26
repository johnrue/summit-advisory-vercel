'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/auth-context'
import { useUserRole } from '@/hooks/use-user-role'
import { usePermissionGroups } from '@/hooks/use-permissions'
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
              variant={getRoleBadgeVariant(role || 'guard')} 
              className="text-xs"
            >
              {role?.toUpperCase() || 'LOADING...'}
            </Badge>
          </div>
        ) : (
          <div className="flex justify-center">
            <Badge 
              variant={getRoleBadgeVariant(role || 'guard')} 
              className="h-8 w-8 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {role?.charAt(0).toUpperCase() || 'U'}
            </Badge>
          </div>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          // Check if user has required permissions for this item
          const hasAccess = !item.permissions || item.permissions.some(permission => {
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