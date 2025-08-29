"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, Clock, CheckCircle, XCircle, Users, FileText, Calendar, Search, Filter } from 'lucide-react'
import { toast } from 'sonner'
import type { CertificationDashboardData, CertificationExpiryCheck } from '@/lib/types'

/**
 * Certification Compliance Dashboard for monitoring and managing guard certifications
 * Displays expiring certifications with urgency indicators and filtering capabilities
 */
export default function CertificationDashboard() {
  const [dashboardData, setDashboardData] = useState<CertificationDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [certificationTypeFilter, setCertificationTypeFilter] = useState<string>('all')
  const [timeframeFilter, setTimeframeFilter] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/certifications/dashboard')
      
      if (!response.ok) {
        throw new Error('Failed to fetch certification dashboard data')
      }

      const data = await response.json()
      setDashboardData(data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load certification dashboard')
    } finally {
      setLoading(false)
    }
  }

  const refreshDashboard = async () => {
    try {
      setRefreshing(true)
      await fetchDashboardData()
      toast.success('Dashboard refreshed')
    } catch (error) {
      toast.error('Failed to refresh dashboard')
    } finally {
      setRefreshing(false)
    }
  }

  const getUrgencyColor = (daysUntilExpiry: number): string => {
    if (daysUntilExpiry < 0) return 'text-red-600 bg-red-50 border-red-200'
    if (daysUntilExpiry <= 7) return 'text-red-600 bg-red-50 border-red-200'
    if (daysUntilExpiry <= 14) return 'text-orange-600 bg-orange-50 border-orange-200'
    if (daysUntilExpiry <= 30) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  const getStatusBadgeVariant = (daysUntilExpiry: number): 'destructive' | 'secondary' | 'outline' | 'default' => {
    if (daysUntilExpiry < 0) return 'destructive'
    if (daysUntilExpiry <= 7) return 'destructive'
    if (daysUntilExpiry <= 14) return 'secondary'
    return 'outline'
  }

  const filterCertifications = (certifications: CertificationExpiryCheck[]): CertificationExpiryCheck[] => {
    return certifications.filter(check => {
      const matchesSearch = searchTerm === '' || 
        check.guard.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        check.guard.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        check.certification.certificationType.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesType = certificationTypeFilter === 'all' ||
        check.certification.certificationType === certificationTypeFilter

      return matchesSearch && matchesType
    })
  }

  const getAllCertifications = (): CertificationExpiryCheck[] => {
    if (!dashboardData) return []
    
    let allCerts = [
      ...dashboardData.expiringIn30Days,
      ...dashboardData.expiringIn14Days,
      ...dashboardData.expiringIn7Days,
      ...dashboardData.expired
    ]

    if (timeframeFilter !== 'all') {
      switch (timeframeFilter) {
        case '30_days':
          allCerts = dashboardData.expiringIn30Days
          break
        case '14_days':
          allCerts = dashboardData.expiringIn14Days
          break
        case '7_days':
          allCerts = dashboardData.expiringIn7Days
          break
        case 'expired':
          allCerts = dashboardData.expired
          break
      }
    }

    return filterCertifications(allCerts)
  }

  const getCertificationTypes = (): string[] => {
    if (!dashboardData) return []
    
    const allCerts = [
      ...dashboardData.expiringIn30Days,
      ...dashboardData.expiringIn14Days,
      ...dashboardData.expiringIn7Days,
      ...dashboardData.expired
    ]
    
    return [...new Set(allCerts.map(check => check.certification.certificationType))]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Failed to load certification dashboard</p>
        <Button onClick={fetchDashboardData} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Certification Compliance Dashboard</h1>
          <p className="text-muted-foreground">Monitor guard certifications and upcoming expirations</p>
        </div>
        <Button 
          onClick={refreshDashboard} 
          disabled={refreshing}
          className="gap-2"
        >
          <Clock className="h-4 w-4" />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Guards</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalGuards}</div>
            <p className="text-xs text-muted-foreground">
              Active guard profiles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliant Guards</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboardData.compliantGuards}</div>
            <p className="text-xs text-muted-foreground">
              All certifications current
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non-Compliant</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboardData.nonCompliantGuards}</div>
            <p className="text-xs text-muted-foreground">
              Expired or expiring soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Renewals</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{dashboardData.pendingRenewals}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting manager review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guards or certification types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <Select value={certificationTypeFilter} onValueChange={setCertificationTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Certification Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {getCertificationTypes().map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timeframeFilter} onValueChange={setTimeframeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Timeframes</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="7_days">7 Days</SelectItem>
            <SelectItem value="14_days">14 Days</SelectItem>
            <SelectItem value="30_days">30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Certification Status Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expired" className="text-red-600">
            Expired ({dashboardData.expired.length})
          </TabsTrigger>
          <TabsTrigger value="7_days" className="text-red-600">
            7 Days ({dashboardData.expiringIn7Days.length})
          </TabsTrigger>
          <TabsTrigger value="14_days" className="text-orange-600">
            14 Days ({dashboardData.expiringIn14Days.length})
          </TabsTrigger>
          <TabsTrigger value="30_days" className="text-yellow-600">
            30 Days ({dashboardData.expiringIn30Days.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                All Certifications Requiring Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CertificationTable certifications={getAllCertifications()} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expired">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Expired Certifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CertificationTable certifications={filterCertifications(dashboardData.expired)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="7_days">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Expiring in 7 Days or Less
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CertificationTable certifications={filterCertifications(dashboardData.expiringIn7Days)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="14_days">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <Clock className="h-5 w-5" />
                Expiring in 14 Days or Less
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CertificationTable certifications={filterCertifications(dashboardData.expiringIn14Days)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="30_days">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <Calendar className="h-5 w-5" />
                Expiring in 30 Days or Less
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CertificationTable certifications={filterCertifications(dashboardData.expiringIn30Days)} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Table component for displaying certification expiry information
 */
function CertificationTable({ certifications }: { certifications: CertificationExpiryCheck[] }) {
  if (certifications.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No certifications found matching your criteria</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Guard Name</TableHead>
          <TableHead>Certification Type</TableHead>
          <TableHead>Expiry Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Days Remaining</TableHead>
          <TableHead>Can Schedule</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {certifications.map((check) => (
          <TableRow key={`${check.certification.id}-${check.guard.id}`}>
            <TableCell className="font-medium">
              {check.guard.firstName} {check.guard.lastName}
            </TableCell>
            <TableCell>{check.certification.certificationType}</TableCell>
            <TableCell>
              {new Date(check.certification.expiryDate).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <Badge variant={getStatusBadgeVariant(check.daysUntilExpiry)}>
                {check.daysUntilExpiry < 0 ? 'Expired' : check.certification.status}
              </Badge>
            </TableCell>
            <TableCell className={getUrgencyColor(check.daysUntilExpiry)}>
              <span className="font-medium">
                {check.daysUntilExpiry < 0 
                  ? `${Math.abs(check.daysUntilExpiry)} days overdue`
                  : `${check.daysUntilExpiry} days`
                }
              </span>
            </TableCell>
            <TableCell>
              {check.canSchedule ? (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Yes
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600">
                  <XCircle className="h-3 w-3 mr-1" />
                  No
                </Badge>
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    // Navigate to guard profile
                    window.location.href = `/admin/guards/${check.guard.id}`
                  }}
                >
                  View Profile
                </Button>
                {check.daysUntilExpiry <= 30 && (
                  <Button 
                    size="sm"
                    onClick={() => {
                      // Navigate to renewal process
                      window.location.href = `/admin/certifications/${check.certification.id}/renew`
                    }}
                  >
                    Start Renewal
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}