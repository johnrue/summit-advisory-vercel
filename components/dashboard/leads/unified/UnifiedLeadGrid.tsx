'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Users, 
  Shield, 
  Clock,
  AlertTriangle,
  ExternalLink,
  MoreVertical,
  User,
  Building
} from 'lucide-react'
import { UnifiedLead } from '@/lib/types/unified-leads'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface UnifiedLeadGridProps {
  leads: UnifiedLead[]
  isLoading: boolean
  error?: string | null
  onRefresh: () => void
}

export function UnifiedLeadGrid({ leads, isLoading, error, onRefresh }: UnifiedLeadGridProps) {
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Loading leads...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Leads</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={onRefresh} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No leads found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters or check back later for new leads.
            </p>
            <Button onClick={onRefresh} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'qualified': return 'bg-green-100 text-green-800'
      case 'proposal': return 'bg-purple-100 text-purple-800'
      case 'negotiation': return 'bg-orange-100 text-orange-800'
      case 'converted': return 'bg-green-100 text-green-800'
      case 'lost': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getLeadTypeIcon = (type: 'client' | 'guard') => {
    return type === 'client' ? Building : Shield
  }

  const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    )
  }

  const getLeadName = (lead: UnifiedLead) => {
    if (lead.clientInfo) {
      return `${lead.clientInfo.firstName} ${lead.clientInfo.lastName}`
    }
    if (lead.guardInfo) {
      return `${lead.guardInfo.firstName} ${lead.guardInfo.lastName}`
    }
    return 'Unknown Lead'
  }

  const getLeadEmail = (lead: UnifiedLead) => {
    return lead.clientInfo?.email || lead.guardInfo?.email || ''
  }

  const getLeadPhone = (lead: UnifiedLead) => {
    return lead.clientInfo?.phone || lead.guardInfo?.phone || ''
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}
        </div>
        {selectedLeads.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {selectedLeads.length} selected
            </span>
            <Button size="sm" variant="outline">
              Bulk Actions
            </Button>
          </div>
        )}
      </div>

      {/* Lead Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {leads.map((lead) => {
          const LeadTypeIcon = getLeadTypeIcon(lead.type)
          const leadName = getLeadName(lead)
          const leadEmail = getLeadEmail(lead)
          const leadPhone = getLeadPhone(lead)

          return (
            <Card key={lead.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {leadName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{leadName}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <LeadTypeIcon className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className={getStatusColor(lead.status)}>
                          {lead.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Badge variant="outline" className={getPriorityColor(lead.priority)}>
                      {lead.priority}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <User className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Phone className="h-4 w-4 mr-2" />
                          Call Lead
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Contact Information */}
                <div className="space-y-2">
                  {leadEmail && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2" />
                      <a href={`mailto:${leadEmail}`} className="hover:underline">
                        {leadEmail}
                      </a>
                    </div>
                  )}
                  {leadPhone && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2" />
                      <a href={`tel:${leadPhone}`} className="hover:underline">
                        {leadPhone}
                      </a>
                    </div>
                  )}
                </div>

                {/* Lead Type Specific Information */}
                {lead.type === 'client' && lead.clientInfo && (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">Service:</span>
                      <span className="ml-1">{lead.clientInfo.serviceType}</span>
                    </div>
                    {lead.estimatedValue && (
                      <div className="text-sm font-semibold text-green-600">
                        Est. Value: ${lead.estimatedValue.toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {lead.type === 'guard' && lead.guardInfo && (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">Experience:</span>
                      <span className="ml-1">
                        {lead.guardInfo.hasSecurityExperience ? 
                          `${lead.guardInfo.yearsExperience || 0} years` : 
                          'No experience'
                        }
                      </span>
                    </div>
                    {lead.qualificationScore && (
                      <div className="flex items-center text-sm">
                        <span className="font-medium">Score:</span>
                        <Badge variant="outline" className="ml-1">
                          {lead.qualificationScore}/100
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Assignment Information */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    {lead.assignedManager ? (
                      <span>Assigned to manager</span>
                    ) : (
                      <span className="text-orange-600">Unassigned</span>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(lead.createdAt)}
                  </div>
                </div>

                {/* Source Attribution */}
                <div className="text-xs text-muted-foreground">
                  Source: {lead.sourceAttribution.originalSource.replace('-', ' ')}
                  {lead.sourceAttribution.campaignId && (
                    <span className="ml-1">({lead.sourceAttribution.campaignId})</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    Contact
                  </Button>
                  <Button size="sm" className="flex-1">
                    {lead.assignedManager ? 'View Details' : 'Assign'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}