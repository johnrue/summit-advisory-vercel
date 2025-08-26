'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { useUserRole } from '@/hooks/use-user-role'
import { usePermissionGroups } from '@/hooks/use-permissions'
import { useUserPreferences } from '@/hooks/use-user-preferences'
import { useAdminRoleView } from '@/hooks/use-admin-role-view'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { SystemAdminGate } from '@/components/auth/permission-gate'
import { ThemeToggle } from '@/components/dashboard/theme-toggle'
import { AdminRoleViewSwitcher, RoleViewIndicator } from '@/components/admin/role-view'
import { Bell, Settings, User, LogOut, Shield, UserCog, Monitor, Eye } from 'lucide-react'
import Link from 'next/link'

export function DashboardHeader() {
  const { user, signOut } = useAuth()
  const { role } = useUserRole()
  const { canManageRoles, canViewAuditLogs, isSystemAdmin } = usePermissionGroups()
  const { preferences, setViewMode, setNotifications } = useUserPreferences()
  const { canSwitchRoleViews, currentViewRole, isViewingSwitchedRole } = useAdminRoleView()

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

  // Use current view role for display when admin is switching roles
  const displayRole = canSwitchRoleViews ? currentViewRole : role

  return (
    <header className="flex items-center justify-between p-4 bg-background border-b">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user?.email?.split('@')[0] || 'User'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Admin Role View Switcher */}
        {canSwitchRoleViews ? (
          <AdminRoleViewSwitcher variant="compact" />
        ) : (
          /* Role Badge for non-admins */
          <Badge 
            variant={getRoleBadgeVariant(role || 'guard')}
            className="flex items-center gap-2"
          >
            <Shield className="h-3 w-3" />
            {role?.toUpperCase() || 'LOADING...'}
          </Badge>
        )}

        {/* Quick Access to Admin Features */}
        <SystemAdminGate>
          <div className="flex items-center gap-2">
            {canManageRoles && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/admin/role-management">
                  <UserCog className="h-4 w-4 mr-2" />
                  Roles
                </Link>
              </Button>
            )}
          </div>
        </SystemAdminGate>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <Button variant="ghost" size="sm">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User Preferences Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
              <span className="sr-only">Preferences</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Display Preferences</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={preferences.viewMode === 'comfortable'}
              onCheckedChange={(checked) => setViewMode(checked ? 'comfortable' : 'compact')}
            >
              <Monitor className="mr-2 h-4 w-4" />
              Comfortable View
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={preferences.notifications}
              onCheckedChange={setNotifications}
            >
              <Bell className="mr-2 h-4 w-4" />
              Enable Notifications
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <User className="h-4 w-4" />
              <span className="sr-only">User menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || 'Loading...'}
                </p>
                <Badge 
                  variant={getRoleBadgeVariant(displayRole || 'guard')}
                  className="w-fit text-xs mt-1"
                >
                  {displayRole?.toUpperCase() || 'LOADING...'}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem asChild disabled>
              <Link href="/dashboard/profile">
                <User className="mr-2 h-4 w-4" />
                Profile (Coming Soon)
              </Link>
            </DropdownMenuItem>
            
            <SystemAdminGate>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/admin/role-management">
                  <UserCog className="mr-2 h-4 w-4" />
                  Role Management
                </Link>
              </DropdownMenuItem>
              {canViewAuditLogs && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/admin/audit-logs">
                    <Settings className="mr-2 h-4 w-4" />
                    Audit Logs
                  </Link>
                </DropdownMenuItem>
              )}
            </SystemAdminGate>
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}