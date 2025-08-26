'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminRoute } from '@/components/auth/protected-route'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Search, UserCog, AlertTriangle, History } from 'lucide-react'
import { RoleAssignmentTable } from './components/RoleAssignmentTable'
import { AuditLogViewer } from './components/AuditLogViewer'

export default function RoleManagementPage() {
  const { canManageRoles } = usePermissions()
  const router = useRouter()
  const { toast } = useToast()

  // Redirect if user doesn't have role management permissions
  useEffect(() => {
    if (!canManageRoles) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to manage roles",
        variant: "destructive"
      })
      router.push('/dashboard')
    }
  }, [canManageRoles, router, toast])

  if (!canManageRoles) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to manage roles</p>
        </div>
      </div>
    )
  }

  return (
    <AdminRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
            <p className="text-muted-foreground">
              Manage user roles and permissions across the platform
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Admin Access
          </Badge>
        </div>

        {/* Role Assignment Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              User Role Assignment
            </CardTitle>
            <CardDescription>
              Assign and modify user roles with appropriate permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RoleAssignmentTable />
          </CardContent>
        </Card>

        {/* Audit Trail Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Role Change Audit Trail
            </CardTitle>
            <CardDescription>
              Track all role changes and permission modifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuditLogViewer />
          </CardContent>
        </Card>
      </div>
    </AdminRoute>
  )
}