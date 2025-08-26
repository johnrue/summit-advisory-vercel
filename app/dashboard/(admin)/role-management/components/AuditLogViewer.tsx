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
  table_name: string
  operation: string
  record_id: string
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  changed_by: string
  changed_at: string
  change_description?: string
}

export function AuditLogViewer() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [operationFilter, setOperationFilter] = useState<string>('all')
  const { toast } = useToast()

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', 'user_roles')
        .order('changed_at', { ascending: false })
        .limit(50)
      
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

  // Filter audit logs based on search and operation
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.record_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.changed_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.change_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         JSON.stringify(log.new_values).toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesOperation = operationFilter === 'all' || log.operation === operationFilter
    
    return matchesSearch && matchesOperation
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

  // Format role change details
  const formatRoleChange = (log: AuditLogEntry) => {
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
    
    return log.change_description || 'Role modification'
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
              <TableHead>Operation</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Change Details</TableHead>
              <TableHead>Changed By</TableHead>
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
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div>{new Date(log.changed_at).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.changed_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getOperationBadgeVariant(log.operation)}>
                      {log.operation}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {log.record_id.slice(0, 8)}...
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-sm font-medium">
                        {formatRoleChange(log)}
                      </p>
                      {log.change_description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.change_description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {log.changed_by.slice(0, 8)}...
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
          <div className="grid grid-cols-3 gap-4 text-center">
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}