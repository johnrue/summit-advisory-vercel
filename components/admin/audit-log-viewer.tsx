"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuditService } from '@/lib/services/audit-service'
import type { 
  AuditLog, 
  AuditLogFilter, 
  AuditLogSearchResult,
  AuditAction,
  AuditEntityType 
} from '@/lib/types/audit-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { CalendarIcon, Search, Shield, AlertTriangle, Filter } from 'lucide-react'
import { format } from 'date-fns'

interface AuditLogViewerProps {
  userRole: 'admin' | 'manager' | 'guard'
  userId?: string
}

export function AuditLogViewer({ userRole, userId }: AuditLogViewerProps) {
  const searchParams = useSearchParams()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [filters, setFilters] = useState<AuditLogFilter>({
    user_id: searchParams.get('userId') || undefined,
    entity_type: (searchParams.get('entityType') as AuditEntityType) || undefined,
    entity_id: searchParams.get('entityId') || undefined,
    action: (searchParams.get('action') as AuditAction) || undefined,
    search: searchParams.get('search') || undefined,
    date_from: searchParams.get('dateFrom') || undefined,
    date_to: searchParams.get('dateTo') || undefined
  })
  
  const [showFilters, setShowFilters] = useState(false)
  const auditService = AuditService.getInstance()

  // Load audit logs
  const loadAuditLogs = async (page: number = 1, resetResults: boolean = true) => {
    if (!canViewAuditLogs()) {
      setError('Insufficient permissions to view audit logs')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const limit = 25
      const offset = (page - 1) * limit
      
      const result = await auditService.getAuditLogs(filters, limit, offset)
      
      if (!result.success) {
        setError(result.error || 'Failed to load audit logs')
        return
      }

      const searchResult = result.data!
      
      if (resetResults) {
        setLogs(searchResult.logs)
      } else {
        setLogs(prev => [...prev, ...searchResult.logs])
      }
      
      setTotalCount(searchResult.total_count)
      setHasMore(searchResult.has_more)
      setCurrentPage(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Check if user can view audit logs
  const canViewAuditLogs = (): boolean => {
    return userRole === 'admin' || userRole === 'manager'
  }

  // Apply filters
  const applyFilters = () => {
    setCurrentPage(1)
    loadAuditLogs(1, true)
  }

  // Reset filters
  const resetFilters = () => {
    setFilters({})
    setCurrentPage(1)
    loadAuditLogs(1, true)
  }

  // Load more results
  const loadMore = () => {
    if (hasMore && !loading) {
      loadAuditLogs(currentPage + 1, false)
    }
  }

  // Get action badge variant
  const getActionBadgeVariant = (action: AuditAction) => {
    switch (action) {
      case 'created':
        return 'default'
      case 'updated':
        return 'secondary'
      case 'deleted':
        return 'destructive'
      case 'approved':
        return 'default'
      case 'rejected':
        return 'destructive'
      case 'assigned':
      case 'unassigned':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  // Format audit log details
  const formatDetails = (details: any): string => {
    if (!details) return ''
    
    if (typeof details === 'string') return details
    
    if (details.context) return details.context
    
    // Extract meaningful information from details
    const parts: string[] = []
    
    if (details.previousValues && details.newValues) {
      parts.push('Changes made')
    }
    
    if (details.metadata?.reason) {
      parts.push(`Reason: ${details.metadata.reason}`)
    }
    
    return parts.join(' | ') || JSON.stringify(details, null, 2)
  }

  // Verify log integrity with better UX
  const verifyIntegrity = async (logId: string) => {
    try {
      const result = await auditService.verifyLogIntegrity(logId)
      if (result.success) {
        const message = result.data 
          ? 'Log integrity verified ✓ - This audit record is tamper-proof and authentic'
          : 'Log integrity compromised ⚠️ - This audit record may have been tampered with'
        alert(message)
      } else {
        alert(`Integrity check failed: ${result.error}`)
      }
    } catch (error) {
      alert('Integrity verification failed - please try again')
      console.error('Integrity verification error:', error)
    }
  }

  useEffect(() => {
    loadAuditLogs()
  }, [])

  if (!canViewAuditLogs()) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Access Restricted</h3>
            <p className="text-muted-foreground">
              You don't have permission to view audit logs.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
          <p className="text-muted-foreground">
            {totalCount > 0 && `${totalCount} total entries`}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filter Audit Logs</CardTitle>
            <CardDescription>
              Narrow down the audit logs by applying filters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="entity-type">Entity Type</Label>
                <Select 
                  value={filters.entity_type || ''} 
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    entity_type: value as AuditEntityType || undefined 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All entities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guard">Guards</SelectItem>
                    <SelectItem value="shift">Shifts</SelectItem>
                    <SelectItem value="application">Applications</SelectItem>
                    <SelectItem value="user_profile">User Profiles</SelectItem>
                    <SelectItem value="role_assignment">Role Assignments</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="action">Action</Label>
                <Select 
                  value={filters.action || ''} 
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    action: value as AuditAction || undefined 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="updated">Updated</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search details..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value || undefined }))}
                    className="pl-8"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="date-from">From Date</Label>
                <Input
                  id="date-from"
                  type="datetime-local"
                  value={filters.date_from || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value || undefined }))}
                />
              </div>

              <div>
                <Label htmlFor="date-to">To Date</Label>
                <Input
                  id="date-to"
                  type="datetime-local"
                  value={filters.date_to || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value || undefined }))}
                />
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={applyFilters} className="gap-2">
                <Search className="h-4 w-4" />
                Apply Filters
              </Button>
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="flex items-center gap-2 py-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Audit Logs List */}
      <div className="space-y-4">
        {logs.map((log) => (
          <Card key={log.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {log.action}
                    </Badge>
                    <Badge variant="outline">
                      {log.entity_type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM d, yyyy h:mm:ss a')}
                    </span>
                  </div>
                  
                  <div>
                    <p className="font-medium">
                      Entity ID: {log.entity_id}
                    </p>
                    {log.user_id && (
                      <p className="text-sm text-muted-foreground">
                        User: {log.user_id}
                      </p>
                    )}
                  </div>

                  {log.details && (
                    <div className="mt-2">
                      <p className="text-sm">
                        {formatDetails(log.details)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {userRole === 'admin' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => verifyIntegrity(log.id)}
                      className="gap-1"
                    >
                      <Shield className="h-3 w-3" />
                      Verify
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <Button 
            onClick={loadMore} 
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {logs.length === 0 && !loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Audit Logs</h3>
              <p className="text-muted-foreground">
                No audit logs found matching your criteria.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}