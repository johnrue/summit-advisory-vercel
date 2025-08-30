'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CalendarIcon, Search, Shield, Download, Eye, Filter, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface AuditLogEntry {
  id: string
  timestamp: Date
  userId: string
  userName: string
  action: 'report_generated' | 'export_created' | 'schedule_created' | 'schedule_modified' | 'schedule_deleted' | 'report_viewed' | 'export_downloaded'
  resourceType: 'report' | 'export' | 'schedule'
  resourceId: string
  resourceName: string
  details: Record<string, any>
  ipAddress: string
  userAgent: string
  status: 'success' | 'failed' | 'warning'
  errorMessage?: string
}

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    userId: 'admin-1',
    userName: 'John Admin',
    action: 'report_generated',
    resourceType: 'report',
    resourceId: 'rpt-001',
    resourceName: 'Weekly Guard Summary',
    details: { format: 'PDF', recordCount: 156, filters: { status: 'active' } },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'success'
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    userId: 'manager-1',
    userName: 'Jane Manager',
    action: 'export_created',
    resourceType: 'export',
    resourceId: 'exp-001',
    resourceName: 'Guard Applications Export',
    details: { format: 'CSV', recordCount: 45, dateRange: '2025-01-01 to 2025-01-30' },
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success'
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    userId: 'admin-1',
    userName: 'John Admin',
    action: 'schedule_created',
    resourceType: 'schedule',
    resourceId: 'sch-001',
    resourceName: 'Monthly Compliance Report',
    details: { frequency: 'monthly', recipients: ['compliance@summitadvisory.com'], time: '08:00' },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'success'
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    userId: 'manager-2',
    userName: 'Bob Manager',
    action: 'export_downloaded',
    resourceType: 'export',
    resourceId: 'exp-002',
    resourceName: 'Shift Schedule Export',
    details: { format: 'JSON', fileSize: '2.3MB', downloadMethod: 'direct' },
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success'
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
    userId: 'admin-1',
    userName: 'John Admin',
    action: 'report_generated',
    resourceType: 'report',
    resourceId: 'rpt-002',
    resourceName: 'Compliance Overview',
    details: { format: 'PDF', recordCount: 0 },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'failed',
    errorMessage: 'Insufficient permissions to access compliance data'
  }
]

const actionLabels = {
  report_generated: 'Report Generated',
  export_created: 'Export Created',
  schedule_created: 'Schedule Created',
  schedule_modified: 'Schedule Modified',
  schedule_deleted: 'Schedule Deleted',
  report_viewed: 'Report Viewed',
  export_downloaded: 'Export Downloaded'
}

const statusColors = {
  success: 'success',
  failed: 'destructive',
  warning: 'warning'
} as const

export function ReportsAuditLog() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(mockAuditLogs)
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    status: '',
    userId: '',
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined
  })
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
  }

  const handleExportLogs = () => {
    // Simulate CSV export
    const csvData = filteredLogs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      user: log.userName,
      action: actionLabels[log.action],
      resource: log.resourceName,
      status: log.status,
      ipAddress: log.ipAddress
    }))
    
    console.log('Exporting audit logs:', csvData)
    // In real implementation, this would download a CSV file
  }

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = !filters.search || 
      log.userName.toLowerCase().includes(filters.search.toLowerCase()) ||
      log.resourceName.toLowerCase().includes(filters.search.toLowerCase()) ||
      actionLabels[log.action].toLowerCase().includes(filters.search.toLowerCase())
    
    const matchesAction = !filters.action || log.action === filters.action
    const matchesStatus = !filters.status || log.status === filters.status
    const matchesUser = !filters.userId || log.userId === filters.userId
    
    const matchesDateRange = (!filters.dateFrom || log.timestamp >= filters.dateFrom) &&
      (!filters.dateTo || log.timestamp <= filters.dateTo)
    
    return matchesSearch && matchesAction && matchesStatus && matchesUser && matchesDateRange
  })

  const uniqueUsers = Array.from(new Set(auditLogs.map(log => ({ id: log.userId, name: log.userName }))))
    .reduce((acc, curr) => {
      if (!acc.find(u => u.id === curr.id)) {
        acc.push(curr)
      }
      return acc
    }, [] as Array<{ id: string; name: string }>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Audit Trail</h3>
          <p className="text-muted-foreground">
            Complete audit log of all report and export activities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleExportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter audit logs by criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Action Filter */}
            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={filters.action}
                onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  {Object.entries(actionLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User Filter */}
            <div className="space-y-2">
              <Label>User</Label>
              <Select
                value={filters.userId}
                onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All users</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filters.dateFrom && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom ? format(filters.dateFrom, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filters.dateTo && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo ? format(filters.dateTo, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date) => setFilters(prev => ({ ...prev, dateTo: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({
                search: '',
                action: '',
                status: '',
                userId: '',
                dateFrom: undefined,
                dateTo: undefined
              })}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs ({filteredLogs.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="text-sm">
                      {format(log.timestamp, 'MMM dd, yyyy')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(log.timestamp, 'HH:mm:ss')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{log.userName}</div>
                    <div className="text-xs text-muted-foreground">{log.userId}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {actionLabels[log.action]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{log.resourceName}</div>
                    <div className="text-xs text-muted-foreground">{log.resourceType}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[log.status]}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-mono">{log.ipAddress}</div>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Audit Log Details</DialogTitle>
                          <DialogDescription>
                            Complete details for audit log entry
                          </DialogDescription>
                        </DialogHeader>
                        {selectedLog && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Timestamp</Label>
                                <div className="text-sm">{selectedLog.timestamp.toLocaleString()}</div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">User</Label>
                                <div className="text-sm">{selectedLog.userName} ({selectedLog.userId})</div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Action</Label>
                                <div className="text-sm">{actionLabels[selectedLog.action]}</div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Status</Label>
                                <Badge variant={statusColors[selectedLog.status]}>{selectedLog.status}</Badge>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Resource</Label>
                                <div className="text-sm">{selectedLog.resourceName}</div>
                                <div className="text-xs text-muted-foreground">{selectedLog.resourceType}:{selectedLog.resourceId}</div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">IP Address</Label>
                                <div className="text-sm font-mono">{selectedLog.ipAddress}</div>
                              </div>
                            </div>
                            
                            {selectedLog.errorMessage && (
                              <div>
                                <Label className="text-sm font-medium">Error Message</Label>
                                <div className="text-sm text-red-600 p-2 bg-red-50 rounded">
                                  {selectedLog.errorMessage}
                                </div>
                              </div>
                            )}
                            
                            <div>
                              <Label className="text-sm font-medium">Details</Label>
                              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                {JSON.stringify(selectedLog.details, null, 2)}
                              </pre>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">User Agent</Label>
                              <div className="text-xs text-muted-foreground font-mono break-all">
                                {selectedLog.userAgent}
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Audit Logs Found</h3>
              <p className="text-muted-foreground">
                No audit logs match your current filter criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}