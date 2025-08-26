'use client'

import { useAdminRoleView } from '@/hooks/use-admin-role-view'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, RotateCcw, AlertTriangle, Shield, Users, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/auth/role-service'

interface RoleViewIndicatorProps {
  className?: string
  showReturnButton?: boolean
  variant?: 'banner' | 'badge' | 'compact'
}

const ROLE_CONFIGS: Record<UserRole, {
  label: string
  shortLabel: string
  icon: any
  color: 'destructive' | 'default' | 'secondary' | 'outline'
  bgColor: string
  borderColor: string
}> = {
  admin: {
    label: 'Administrator',
    shortLabel: 'Admin',
    icon: Shield,
    color: 'destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20'
  },
  manager: {
    label: 'Manager',
    shortLabel: 'Manager', 
    icon: Users,
    color: 'default',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  guard: {
    label: 'Security Guard',
    shortLabel: 'Guard',
    icon: UserCheck,
    color: 'secondary',
    bgColor: 'bg-secondary/10',
    borderColor: 'border-secondary/20'
  },
  client: {
    label: 'Client',
    shortLabel: 'Client',
    icon: UserCheck,
    color: 'outline',
    bgColor: 'bg-muted/10',
    borderColor: 'border-muted/20'
  }
}

export function RoleViewIndicator({ 
  className, 
  showReturnButton = true,
  variant = 'banner' 
}: RoleViewIndicatorProps) {
  const {
    canSwitchRoleViews,
    currentViewRole,
    adminUser,
    isViewingSwitchedRole,
    isLoading,
    returnToAdminView
  } = useAdminRoleView()

  // Don't render if user is not an admin or not viewing a switched role
  if (!canSwitchRoleViews) {
    return null
  }

  const currentRoleConfig = ROLE_CONFIGS[currentViewRole]
  const CurrentIcon = currentRoleConfig.icon

  const handleReturnToAdmin = async () => {
    await returnToAdminView()
  }

  if (variant === 'badge') {
    if (!isViewingSwitchedRole) return null
    
    return (
      <Badge 
        variant="outline" 
        className={cn("flex items-center gap-2 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200", className)}
      >
        <Eye className="h-3 w-3" />
        <span className="text-xs">Viewing as {currentRoleConfig.shortLabel}</span>
      </Badge>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        {isViewingSwitchedRole && (
          <>
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Eye className="h-4 w-4" />
              <span>Viewing as:</span>
            </div>
            <Badge variant={currentRoleConfig.color} className="text-xs">
              <CurrentIcon className="h-3 w-3 mr-1" />
              {currentRoleConfig.shortLabel}
            </Badge>
            {showReturnButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReturnToAdmin}
                disabled={isLoading}
                className="h-6 px-2 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Admin
              </Button>
            )}
          </>
        )}
        {!isViewingSwitchedRole && (
          <Badge variant={currentRoleConfig.color} className="text-xs">
            <CurrentIcon className="h-3 w-3 mr-1" />
            {currentRoleConfig.shortLabel}
          </Badge>
        )}
      </div>
    )
  }

  // Banner variant (default)
  if (!isViewingSwitchedRole) {
    return null
  }

  return (
    <Alert className={cn(
      "border-l-4 border-l-amber-500",
      currentRoleConfig.bgColor,
      currentRoleConfig.borderColor,
      className
    )}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="mb-0 font-medium">
              <span className="text-amber-800 dark:text-amber-200">
                Administrator Role View Mode:
              </span>
              <span className="ml-2">Viewing system as {currentRoleConfig.label}</span>
            </AlertDescription>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Current View Badge */}
          <Badge variant={currentRoleConfig.color} className="flex items-center gap-1">
            <CurrentIcon className="h-3 w-3" />
            {currentRoleConfig.shortLabel} View
          </Badge>

          {/* Return Button */}
          {showReturnButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReturnToAdmin}
              disabled={isLoading}
              className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/20"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Return to Admin View
            </Button>
          )}
        </div>
      </div>

      {/* Admin Info */}
      <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
        Admin: {adminUser.email} • You retain full administrative privileges
      </div>
    </Alert>
  )
}