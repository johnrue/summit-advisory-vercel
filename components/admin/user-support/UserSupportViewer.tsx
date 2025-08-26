'use client'

import React from 'react'
import { useUserSupport } from '@/hooks/use-user-support'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { UserPermissionViewer } from './UserPermissionViewer'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  Shield, 
  Eye, 
  X, 
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserSupportInfo } from '@/lib/admin/user-support-service'

interface UserSupportViewerProps {
  userId?: string
  className?: string
  onClose?: () => void
}

export function UserSupportViewer({ userId, className, onClose }: UserSupportViewerProps) {
  const {
    selectedUser,
    isViewingUserContext,
    isLoading,
    error,
    permissionComparison,
    canUseUserSupport,
    viewUserContext,
    exitUserContext,
    clearError,
    isUserActive,
    getUserRoleLevel,
    formatUserDisplayName,
    getUserPermissionSummary
  } = useUserSupport()

  // Load user context if userId is provided and not already viewing
  React.useEffect(() => {
    if (userId && canUseUserSupport && !isViewingUserContext && !isLoading) {
      viewUserContext(userId)
    }
  }, [userId, canUseUserSupport, isViewingUserContext, isLoading, viewUserContext])

  const handleClose = () => {
    exitUserContext()
    onClose?.()
  }

  if (!canUseUserSupport) {
    return (
      <Alert className={cn("border-destructive/50", className)}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Only administrators can access user support tools.
        </AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading user information...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert className={cn("border-destructive/50", className)}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={clearError}>
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!isViewingUserContext || !selectedUser) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            User Support Tool
          </CardTitle>
          <CardDescription>
            No user selected. Use the "View User" action from the user management interface.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const roleLevel = getUserRoleLevel(selectedUser.role)
  const displayName = formatUserDisplayName(selectedUser)
  const permissionSummary = getUserPermissionSummary(selectedUser)
  const userActiveStatus = isUserActive(selectedUser)

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive'
      case 'manager': return 'default'
      case 'guard': return 'secondary'
      case 'client': return 'outline'
      default: return 'secondary'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>User Support Information</CardTitle>
              <CardDescription>Read-only view of user account details</CardDescription>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* User Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Display Name:</span>
              </div>
              <p className="ml-6 text-sm">{displayName}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Email:</span>
              </div>
              <p className="ml-6 text-sm font-mono">{selectedUser.email}</p>
            </div>

            {selectedUser.profile?.phoneNumber && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Phone:</span>
                </div>
                <p className="ml-6 text-sm">{selectedUser.profile.phoneNumber}</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Role:</span>
              </div>
              <div className="ml-6">
                <Badge variant={getRoleBadgeVariant(selectedUser.role)}>
                  {selectedUser.role.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Activity Status */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Activity Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Status:</span>
              </div>
              <div className="ml-6 flex items-center gap-2">
                {userActiveStatus ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-700 dark:text-green-300">Active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700 dark:text-red-300">Inactive</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Last Active:</span>
              </div>
              <p className="ml-6 text-sm">
                {selectedUser.lastActive 
                  ? new Date(selectedUser.lastActive).toLocaleString()
                  : 'Never signed in'
                }
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Account Created:</span>
              </div>
              <p className="ml-6 text-sm">
                {new Date(selectedUser.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Role Updated:</span>
              </div>
              <p className="ml-6 text-sm">
                {new Date(selectedUser.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Permissions Summary */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Permissions Summary ({permissionSummary.total} total)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(permissionSummary.categories).map(([category, count]) => (
              count > 0 && (
                <div key={category} className="text-center">
                  <div className="text-lg font-semibold">{count}</div>
                  <div className="text-xs text-muted-foreground capitalize">{category}</div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Detailed Permissions */}
        {selectedUser && (
          <UserPermissionViewer 
            user={selectedUser} 
            permissionComparison={permissionComparison}
          />
        )}

        {/* Read-Only Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This is a read-only view for troubleshooting purposes. No user data can be modified through this interface.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}