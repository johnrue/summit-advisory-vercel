'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { useUserRole } from '@/hooks/use-user-role'
import { usePermissionGroups } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SystemAdminGate } from '@/components/auth/permission-gate'
import { Bell, Settings, User, LogOut, Shield, UserCog } from 'lucide-react'
import Link from 'next/link'

export function DashboardHeader() {
  const { user, signOut } = useAuth()
  const { role } = useUserRole()
  const { canManageRoles, canViewAuditLogs, isSystemAdmin } = usePermissionGroups()

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
        {/* Role Badge */}
        <Badge 
          variant={getRoleBadgeVariant(role || 'guard')}
          className="flex items-center gap-2"
        >
          <Shield className="h-3 w-3" />
          {role?.toUpperCase() || 'LOADING...'}
        </Badge>

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

        {/* Notifications */}
        <Button variant="ghost" size="sm">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>

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
                  variant={getRoleBadgeVariant(role || 'guard')}
                  className="w-fit text-xs mt-1"
                >
                  {role?.toUpperCase() || 'LOADING...'}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">
                <User className="mr-2 h-4 w-4" />
                Profile
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