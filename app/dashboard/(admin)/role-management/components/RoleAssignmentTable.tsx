'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Loader2, Search, UserCog, Edit2, AlertTriangle } from 'lucide-react'
import { roleService, serverRoleService, type UserRole, type UserRoleRecord } from '@/lib/auth/role-service'

interface User {
  id: string
  email: string
  created_at: string
  user_metadata?: {
    role?: string
  }
}

interface UserWithRole extends User {
  role?: UserRole
  roleRecord?: UserRoleRecord
}

export function RoleAssignmentTable() {
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null)
  const [newRole, setNewRole] = useState<UserRole>('guard')
  const [isAssigning, setIsAssigning] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  // Fetch users with their roles
  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      // For now, we'll fetch from user_roles table
      // In a real implementation, you'd fetch from auth.users and join with user_roles
      const { users: roleUsers, error } = await roleService.listUsersWithRoles()
      
      if (error) {
        throw new Error(error)
      }

      // Transform role records to user format for display
      const usersWithRoles: UserWithRole[] = roleUsers.map(roleRecord => ({
        id: roleRecord.user_id,
        email: `user-${roleRecord.user_id.slice(0, 8)}@example.com`, // Placeholder email
        created_at: roleRecord.created_at,
        role: roleRecord.role,
        roleRecord,
        user_metadata: {
          role: roleRecord.role
        }
      }))

      setUsers(usersWithRoles)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users'
      toast({
        title: "Error Loading Users",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Filter users based on search and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  // Handle role assignment
  const handleRoleAssignment = async () => {
    if (!selectedUser) return

    try {
      setIsAssigning(true)
      
      const result = await roleService.assignRole(selectedUser.id, newRole)
      
      if (result.success) {
        toast({
          title: "Role Updated",
          description: `User role has been updated to ${newRole}`,
        })
        
        // Refresh the users list
        await fetchUsers()
        setDialogOpen(false)
        setSelectedUser(null)
      } else {
        throw new Error(result.error || 'Failed to assign role')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign role'
      toast({
        title: "Role Assignment Failed",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsAssigning(false)
    }
  }

  // Open role assignment dialog
  const openRoleDialog = (user: UserWithRole) => {
    setSelectedUser(user)
    setNewRole(user.role || 'guard')
    setDialogOpen(true)
  }

  // Get role badge variant
  const getRoleBadgeVariant = (role: UserRole) => {
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
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by email or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(value: UserRole | 'all') => setRoleFilter(value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="guard">Guard</SelectItem>
            <SelectItem value="client">Client</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading users...
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No users found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-sm">
                    {user.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role!)}>
                      {user.role?.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.roleRecord?.updated_at ? 
                      new Date(user.roleRecord.updated_at).toLocaleDateString() : 
                      'Never'
                    }
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRoleDialog(user)}
                      className="flex items-center gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit Role
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Role Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Assign User Role
            </DialogTitle>
            <DialogDescription>
              Change the role for user: {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="current-role" className="text-right">
                Current Role
              </Label>
              <Badge 
                id="current-role" 
                variant={getRoleBadgeVariant(selectedUser?.role || 'guard')}
                className="col-span-3"
              >
                {selectedUser?.role?.toUpperCase()}
              </Badge>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-role" className="text-right">
                New Role
              </Label>
              <Select
                value={newRole}
                onValueChange={(value: UserRole) => setNewRole(value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select new role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="guard">Guard</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newRole === 'admin' && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Admin Role Warning</p>
                  <p className="text-destructive/90">
                    Admin users have full system access including user management and system configuration.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRoleAssignment} 
              disabled={isAssigning || newRole === selectedUser?.role}
            >
              {isAssigning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Assigning...
                </>
              ) : (
                'Assign Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}