"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Shield,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Award,
  Plus
} from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { guardProfileService } from '@/lib/services/guard-profile-service'
import type { GuardProfile, GuardProfileFilters } from '@/lib/types/guard-profile'
import { cn } from '@/lib/utils'

interface GuardProfileSummary {
  id: string
  legalName: string
  email: string
  phone: string
  topsLicenseNumber: string
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'active' | 'inactive'
  complianceScore: number
  createdAt: string
  lastUpdated: string
  address: {
    city: string
    state: string
  }
  certifications: number
  documentsCount: number
  assignmentsCompleted: number
}

export default function GuardProfilesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [profiles, setProfiles] = useState<GuardProfileSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [filters, setFilters] = useState<GuardProfileFilters>({
    searchQuery: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    complianceScore: null,
    certificationStatus: '',
    location: '',
    dateRange: { from: null, to: null },
    sortBy: 'lastUpdated',
    sortOrder: 'desc'
  })

  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    loadProfiles()
  }, [filters, currentPage])

  const loadProfiles = async () => {
    try {
      setLoading(true)
      setError(null)

      // Mock data - in real implementation, use guardProfileService.searchProfiles
      const mockProfiles: GuardProfileSummary[] = [
        {
          id: '1',
          legalName: 'John Smith',
          email: 'john.smith@email.com',
          phone: '(555) 123-4567',
          topsLicenseNumber: 'TX123456789',
          status: 'active',
          complianceScore: 95,
          createdAt: '2024-01-15T10:30:00Z',
          lastUpdated: '2024-01-20T14:20:00Z',
          address: { city: 'Austin', state: 'TX' },
          certifications: 3,
          documentsCount: 8,
          assignmentsCompleted: 42
        },
        {
          id: '2',
          legalName: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          phone: '(555) 234-5678',
          topsLicenseNumber: 'TX987654321',
          status: 'pending_approval',
          complianceScore: 87,
          createdAt: '2024-01-18T09:15:00Z',
          lastUpdated: '2024-01-22T11:45:00Z',
          address: { city: 'Houston', state: 'TX' },
          certifications: 2,
          documentsCount: 6,
          assignmentsCompleted: 0
        },
        {
          id: '3',
          legalName: 'Michael Davis',
          email: 'mike.davis@email.com',
          phone: '(555) 345-6789',
          topsLicenseNumber: 'TX456789012',
          status: 'active',
          complianceScore: 92,
          createdAt: '2024-01-10T16:20:00Z',
          lastUpdated: '2024-01-21T08:30:00Z',
          address: { city: 'Dallas', state: 'TX' },
          certifications: 4,
          documentsCount: 10,
          assignmentsCompleted: 68
        }
      ]

      // Apply filters (simplified for mock)
      let filteredProfiles = mockProfiles
      if (filters.searchQuery) {
        filteredProfiles = filteredProfiles.filter(p => 
          p.legalName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
          p.email.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
          p.topsLicenseNumber.toLowerCase().includes(filters.searchQuery.toLowerCase())
        )
      }
      if (filters.status) {
        filteredProfiles = filteredProfiles.filter(p => p.status === filters.status)
      }

      setProfiles(filteredProfiles)
      setTotalCount(filteredProfiles.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guard profiles')
    } finally {
      setLoading(false)
    }
  }

  const updateFilter = (key: keyof GuardProfileFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'bg-green-500', text: 'Active', icon: CheckCircle }
      case 'pending_approval':
        return { color: 'bg-yellow-500', text: 'Pending', icon: Clock }
      case 'draft':
        return { color: 'bg-gray-500', text: 'Draft', icon: Edit }
      case 'rejected':
        return { color: 'bg-red-500', text: 'Rejected', icon: XCircle }
      case 'inactive':
        return { color: 'bg-gray-400', text: 'Inactive', icon: XCircle }
      default:
        return { color: 'bg-gray-500', text: status, icon: AlertTriangle }
    }
  }

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 80) return 'text-blue-600 bg-blue-100'
    if (score >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const handleBulkAction = async (action: string) => {
    if (selectedProfiles.length === 0) return

    try {
      setLoading(true)
      // Handle bulk actions like approve, reject, etc.
      console.log(`Bulk action: ${action} on profiles:`, selectedProfiles)
      // Reset selection
      setSelectedProfiles([])
      // Reload profiles
      await loadProfiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform bulk action')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guard Profiles</h1>
          <p className="text-muted-foreground">
            Manage security guard profiles and compliance status
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            Compliance Report
          </Button>
          <Button onClick={() => router.push('/dashboard/hiring')}>
            <Plus className="h-4 w-4 mr-2" />
            New Application
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search profiles..."
                value={filters.searchQuery}
                onChange={(e) => updateFilter('searchQuery', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select
              value={filters.status}
              onValueChange={(value) => updateFilter('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.certificationStatus}
              onValueChange={(value) => updateFilter('certificationStatus', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Certification Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Certifications</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.location}
              onValueChange={(value) => updateFilter('location', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Locations</SelectItem>
                <SelectItem value="austin">Austin</SelectItem>
                <SelectItem value="houston">Houston</SelectItem>
                <SelectItem value="dallas">Dallas</SelectItem>
                <SelectItem value="san-antonio">San Antonio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Profiles</span>
            </div>
            <p className="text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Active Guards</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {profiles.filter(p => p.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              {profiles.filter(p => p.status === 'pending_approval').length}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Avg Compliance</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {profiles.length > 0 
                ? Math.round(profiles.reduce((acc, p) => acc + p.complianceScore, 0) / profiles.length)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Bulk Actions */}
      {selectedProfiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {selectedProfiles.length} profile{selectedProfiles.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex space-x-2">
                <Button size="sm" onClick={() => handleBulkAction('approve')}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('reject')}>
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedProfiles([])}>
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((profile) => {
          const statusConfig = getStatusConfig(profile.status)
          const StatusIcon = statusConfig.icon

          return (
            <Card key={profile.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedProfiles.includes(profile.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProfiles(prev => [...prev, profile.id])
                        } else {
                          setSelectedProfiles(prev => prev.filter(id => id !== profile.id))
                        }
                      }}
                      className="rounded"
                    />
                    <div>
                      <CardTitle className="text-lg">{profile.legalName}</CardTitle>
                      <CardDescription className="flex items-center space-x-2">
                        <Shield className="h-3 w-3" />
                        <span>{profile.topsLicenseNumber}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={cn("text-white", statusConfig.color)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig.text}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Contact Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>{profile.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>{profile.address.city}, {profile.address.state}</span>
                  </div>
                </div>

                <Separator />

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold">{profile.certifications}</p>
                    <p className="text-xs text-muted-foreground">Certs</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{profile.documentsCount}</p>
                    <p className="text-xs text-muted-foreground">Docs</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{profile.assignmentsCompleted}</p>
                    <p className="text-xs text-muted-foreground">Jobs</p>
                  </div>
                </div>

                {/* Compliance Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Compliance Score</span>
                    <Badge className={cn("text-xs", getComplianceColor(profile.complianceScore))}>
                      {profile.complianceScore}%
                    </Badge>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/dashboard/guards/profiles/${profile.id}`)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/dashboard/guards/profiles/${profile.id}/edit`)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>

                {/* Timestamps */}
                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                  <div>Created: {formatDate(profile.createdAt)}</div>
                  <div>Updated: {formatDate(profile.lastUpdated)}</div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {profiles.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Guard Profiles Found</h3>
            <p className="text-muted-foreground mb-4">
              {filters.searchQuery || filters.status 
                ? "No profiles match your current filters."
                : "No guard profiles have been created yet."
              }
            </p>
            <div className="flex justify-center space-x-3">
              {(filters.searchQuery || filters.status) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({
                      searchQuery: '',
                      status: '',
                      complianceScore: null,
                      certificationStatus: '',
                      location: '',
                      dateRange: { from: null, to: null },
                      sortBy: 'lastUpdated',
                      sortOrder: 'desc'
                    })
                  }}
                >
                  Clear Filters
                </Button>
              )}
              <Button onClick={() => router.push('/dashboard/hiring')}>
                <Plus className="h-4 w-4 mr-2" />
                Start New Application
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading guard profiles...</p>
        </div>
      )}
    </div>
  )
}