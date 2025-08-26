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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Search, History, User, Clock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/auth/supabase'

interface AuditLogEntry {
  id: string
  table_name?: string
  operation?: string
  record_id?: string
  old_values?: Record<string, any> | null
  new_values?: Record<string, any> | null
  changed_by?: string
  changed_at?: string
  change_description?: string
  // New audit log format fields
  user_id?: string
  action?: string
  resource_type?: string
  resource_id?: string | null
  details?: Record<string, any>
  metadata?: Record<string, any>
  created_at?: string
}

export function AuditLogViewer() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [operationFilter, setOperationFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const { toast } = useToast()

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      // Fetch both old format (table_name) and new format (action) audit logs
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .or('table_name.eq.user_roles,action.in.(admin_role_view_switch,admin_user_support_access)')
        .order('coalesce(changed_at,created_at)', { ascending: false })
        .limit(100)
      
      if (error) {
        throw error
      }

      setAuditLogs(data || [])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch audit logs'
      toast({
        title: "Error Loading Audit Logs",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  // Filter audit logs based on search and operation/action
  const filteredLogs = auditLogs.filter(log => {
    const searchFields = [
      log.record_id,
      log.changed_by,
      log.user_id,
      log.change_description,
      log.action,
      log.resource_type,
      log.resource_id,
      JSON.stringify(log.new_values),
      JSON.stringify(log.details),
      JSON.stringify(log.metadata)
    ].filter(Boolean).join(' ').toLowerCase()
    
    const matchesSearch = searchTerm === '' || searchFields.includes(searchTerm.toLowerCase())
    
    const matchesOperation = operationFilter === 'all' || log.operation === operationFilter
    const matchesAction = actionFilter === 'all' || log.action === actionFilter
    
    return matchesSearch && matchesOperation && matchesAction
  })

  // Get operation badge variant
  const getOperationBadgeVariant = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return 'default'
      case 'UPDATE':
        return 'secondary'
      case 'DELETE':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  // Format audit log details
  const formatAuditLogDetails = (log: AuditLogEntry) => {
    // Handle new audit log format
    if (log.action) {
      switch (log.action) {
        case 'admin_role_view_switch':
          const roleSwitch = log.metadata?.role_view_switch
          if (roleSwitch) {
            return `Admin switched role view from ${roleSwitch.from_role?.toUpperCase()} to ${roleSwitch.to_role?.toUpperCase()}`
          }
          return 'Admin switched role view'
        
        case 'admin_user_support_access':
          const userAccess = log.metadata?.user_support_access
          if (userAccess) {
            return `Admin accessed user support for user (${userAccess.target_user_id?.slice(0, 8)}...)`
          }
          return 'Admin accessed user support tools'
        
        default:
          return log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }
    }
    
    // Handle legacy audit log format
    if (log.operation === 'INSERT') {
      const newRole = log.new_values?.role
      return `User assigned role: ${newRole?.toUpperCase()}`
    } else if (log.operation === 'UPDATE') {
      const oldRole = log.old_values?.role
      const newRole = log.new_values?.role
      
      if (oldRole !== newRole) {
        return `Role changed from ${oldRole?.toUpperCase()} to ${newRole?.toUpperCase()}`
      } else {
        return 'Permissions updated'
      }
    } else if (log.operation === 'DELETE') {
      const oldRole = log.old_values?.role
      return `Role removed: ${oldRole?.toUpperCase()}`
    }
    
    return log.change_description || log.action || 'System activity'
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search audit logs by user, action, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={operationFilter}
          onValueChange={setOperationFilter}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by operation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Operations</SelectItem>
            <SelectItem value="INSERT">Role Created</SelectItem>
            <SelectItem value="UPDATE">Role Updated</SelectItem>
            <SelectItem value="DELETE">Role Deleted</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={actionFilter}
          onValueChange={setActionFilter}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="admin_role_view_switch">Role View Switch</SelectItem>
            <SelectItem value="admin_user_support_access">User Support Access</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchAuditLogs} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <History className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Audit Logs Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action/Operation</TableHead>
              <TableHead>Resource/User</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Performed By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading audit logs...
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const timestamp = log.changed_at || log.created_at
                const actionOrOperation = log.action || log.operation || 'Unknown'
                const performedBy = log.user_id || log.changed_by
                const resourceId = log.resource_id || log.record_id
                
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{timestamp ? new Date(timestamp).toLocaleDateString() : 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">
                            {timestamp ? new Date(timestamp).toLocaleTimeString() : ''}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={log.operation ? getOperationBadgeVariant(log.operation) : 'outline'}>
                          {log.action ? log.action.replace(/_/g, ' ') : (log.operation || 'Action')}
                        </Badge>
                        {log.resource_type && (
                          <div className="text-xs text-muted-foreground">
                            {log.resource_type.replace(/_/g, ' ')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          {resourceId ? (
                            <div>{resourceId.slice(0, 8)}...</div>
                          ) : (
                            <div className="text-muted-foreground">N/A</div>
                          )}
                          {log.details?.accessed_user_email && (
                            <div className="text-xs text-muted-foreground">
                              {log.details.accessed_user_email}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm font-medium">
                          {formatAuditLogDetails(log)}
                        </p>
                        {log.change_description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.change_description}
                          </p>
                        )}
                        {log.details?.timestamp && (
                          <p className="text-xs text-muted-foreground mt-1">
                            IP: {log.details.ip_address || 'unknown'}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {performedBy ? (
                          <div>{performedBy.slice(0, 8)}...</div>
                        ) : (
                          <div className="text-muted-foreground">System</div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Audit Summary</CardTitle>
          <CardDescription className="text-xs">
            Recent activity overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {filteredLogs.filter(log => log.operation === 'INSERT').length}
              </div>
              <div className="text-xs text-muted-foreground">Roles Created</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {filteredLogs.filter(log => log.operation === 'UPDATE').length}
              </div>
              <div className="text-xs text-muted-foreground">Roles Updated</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {filteredLogs.filter(log => log.operation === 'DELETE').length}
              </div>
              <div className="text-xs text-muted-foreground">Roles Removed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {filteredLogs.filter(log => log.action === 'admin_role_view_switch').length}
              </div>
              <div className="text-xs text-muted-foreground">Role Switches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {filteredLogs.filter(log => log.action === 'admin_user_support_access').length}
              </div>
              <div className="text-xs text-muted-foreground">Support Access</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}