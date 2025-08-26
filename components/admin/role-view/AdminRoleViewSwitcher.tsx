'use client'

import { useState } from 'react'
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
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu'
import { Eye, Shield, Users, UserCheck, Settings, RotateCcw, Loader2, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdminRoleViewHelp } from './AdminRoleViewHelp'
import type { UserRole } from '@/lib/auth/role-service'

interface AdminRoleViewSwitcherProps {
  className?: string
  variant?: 'full' | 'compact' | 'badge-only'
}

const ROLE_CONFIGS: Record<UserRole, {
  label: string
  icon: any
  color: 'destructive' | 'default' | 'secondary' | 'outline'
  description: string
}> = {
  admin: {
    label: 'Admin',
    icon: Shield,
    color: 'destructive',
    description: 'Full system administration'
  },
  manager: {
    label: 'Manager',
    icon: Users,
    color: 'default',
    description: 'Team and shift management'
  },
  guard: {
    label: 'Guard',
    icon: UserCheck,
    color: 'secondary',
    description: 'Individual guard view'
  },
  client: {
    label: 'Client',
    icon: UserCheck,
    color: 'outline',
    description: 'Client view'
  }
}

export function AdminRoleViewSwitcher({ 
  className, 
  variant = 'full' 
}: AdminRoleViewSwitcherProps) {
  const {
    canSwitchRoleViews,
    currentViewRole,
    adminUser,
    isViewingSwitchedRole,
    availableViewRoles,
    isLoading,
    error,
    switchToRoleView,
    returnToAdminView,
    roleViewPreferences,
    setDefaultViewRole,
    setRememberLastView
  } = useAdminRoleView()

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Don't render if user is not an admin
  if (!canSwitchRoleViews) {
    return null
  }

  const currentRoleConfig = ROLE_CONFIGS[currentViewRole]
  const CurrentIcon = currentRoleConfig.icon

  const handleRoleSwitch = async (role: UserRole) => {
    const result = await switchToRoleView(role, roleViewPreferences.rememberLastView)
    if (!result.success) {
      console.error('Failed to switch role view:', result)
    }
    setIsMenuOpen(false)
  }

  const handleReturnToAdmin = async () => {
    const result = await returnToAdminView()
    if (!result.success) {
      console.error('Failed to return to admin view:', result)
    }
    setIsMenuOpen(false)
  }

  const handleSetDefaultRole = (role: UserRole) => {
    setDefaultViewRole(role)
  }

  const handleToggleRememberView = (remember: boolean) => {
    setRememberLastView(remember)
  }

  if (variant === 'badge-only') {
    return (
      <Badge 
        variant={currentRoleConfig.color}
        className={cn("flex items-center gap-2 cursor-pointer hover:opacity-80", className)}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <CurrentIcon className="h-3 w-3" />
        )}
        <span className="text-xs font-medium">
          {isViewingSwitchedRole ? `View: ${currentRoleConfig.label}` : currentRoleConfig.label}
        </span>
      </Badge>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Role View Indicator */}
      {isViewingSwitchedRole && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span>Viewing as:</span>
        </div>
      )}

      {/* Role Switcher Dropdown */}
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isLoading}
            className={cn(
              "flex items-center gap-2",
              isViewingSwitchedRole && "border-primary/50 bg-primary/5"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CurrentIcon className="h-4 w-4" />
            )}
            <span className="font-medium">
              {variant === 'compact' 
                ? currentRoleConfig.label 
                : `${currentRoleConfig.label} View`
              }
            </span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Role View Switcher</span>
              <span className="text-xs text-muted-foreground">
                Admin: {adminUser.email}
              </span>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />

          {/* Current View Status */}
          <div className="px-2 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span>Current view:</span>
              <Badge variant={currentRoleConfig.color} className="text-xs">
                {currentRoleConfig.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentRoleConfig.description}
            </p>
          </div>

          <DropdownMenuSeparator />

          {/* Role View Options */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Switch to view:
          </DropdownMenuLabel>
          
          {availableViewRoles.map((role) => {
            const roleConfig = ROLE_CONFIGS[role]
            const RoleIcon = roleConfig.icon
            const isCurrent = role === currentViewRole
            
            return (
              <DropdownMenuItem
                key={role}
                onClick={() => handleRoleSwitch(role)}
                disabled={isCurrent || isLoading}
                className="flex items-center gap-3"
              >
                <RoleIcon className="h-4 w-4" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{roleConfig.label}</span>
                    {isCurrent && (
                      <Badge variant="outline" className="text-xs">Current</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {roleConfig.description}
                  </p>
                </div>
              </DropdownMenuItem>
            )
          })}

          {/* Return to Admin View */}
          {isViewingSwitchedRole && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleReturnToAdmin}
                disabled={isLoading}
                className="flex items-center gap-3 text-primary"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="font-medium">Return to Admin View</span>
              </DropdownMenuItem>
            </>
          )}

          {/* Preferences */}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Settings className="h-3 w-3" />
              Preferences
            </div>
          </DropdownMenuLabel>

          <DropdownMenuCheckboxItem
            checked={roleViewPreferences.rememberLastView}
            onCheckedChange={handleToggleRememberView}
          >
            Remember last view
          </DropdownMenuCheckboxItem>

          {/* Default Role Selection */}
          {roleViewPreferences.defaultViewRole && (
            <div className="px-2 py-1">
              <span className="text-xs text-muted-foreground">
                Default: {ROLE_CONFIGS[roleViewPreferences.defaultViewRole].label}
              </span>
            </div>
          )}

          <DropdownMenuSeparator />
          
          {/* Help */}
          <div className="px-2 py-1">
            <AdminRoleViewHelp />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Error Display */}
      {error && (
        <div className="text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  )
}