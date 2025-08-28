"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Eye, 
  FileText, 
  Calendar,
  User,
  MapPin,
  ExternalLink,
  Clock,
  Fingerprint,
  Award,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

import { GuardProfileService } from '@/lib/services/guard-profile-service'
import { TOPSComplianceService } from '@/lib/services/tops-compliance-service'
import type { 
  GuardProfile, 
  ComplianceValidation, 
  DocumentReference,
  TopsComplianceAudit 
} from '@/lib/types/guard-profile'

interface Props {
  profileId: string
  onApprovalComplete?: () => void
  onRejection?: () => void
  className?: string
}

export function GuardProfileApprovalInterface({
  profileId,
  onApprovalComplete,
  onRejection,
  className
}: Props) {
  const router = useRouter()
  const [profile, setProfile] = useState<GuardProfile | null>(null)
  const [compliance, setCompliance] = useState<ComplianceValidation | null>(null)
  const [auditHistory, setAuditHistory] = useState<TopsComplianceAudit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionDialog, setShowRejectionDialog] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<DocumentReference | null>(null)

  const guardProfileService = new GuardProfileService()
  const topsComplianceService = new TOPSComplianceService()

  useEffect(() => {
    loadProfileData()
  }, [profileId])

  const loadProfileData = async () => {
    setIsLoading(true)
    try {
      // Load profile
      const profileResult = await guardProfileService.getProfile(profileId)
      if (profileResult.success) {
        setProfile(profileResult.data)
      } else {
        toast.error(`Failed to load profile: ${profileResult.error}`)
        return
      }

      // Load compliance validation
      const complianceResult = await guardProfileService.validateProfileCompleteness(profileId)
      if (complianceResult.success) {
        setCompliance(complianceResult.data)
      }

      // Load audit history
      const auditResult = await topsComplianceService.getComplianceHistory(profileId)
      if (auditResult.success) {
        setAuditHistory(auditResult.data)
      }
    } catch (error) {
      toast.error('Failed to load profile data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!profile || !compliance) return

    if (compliance.score < 90) {
      toast.error('Profile must have a compliance score of at least 90% for approval')
      return
    }

    setIsApproving(true)
    try {
      // Get current user ID (mock for now)
      const approverId = 'current-user-id' // Would come from auth context

      const result = await guardProfileService.approveProfile(profileId, approverId)
      
      if (result.success) {
        toast.success('Profile approved successfully!')
        onApprovalComplete?.()
        router.push('/dashboard/manager/guards/profiles')
      } else {
        toast.error(`Approval failed: ${result.error}`)
      }
    } catch (error) {
      toast.error('Failed to approve profile')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    setIsRejecting(true)
    try {
      // Update profile status to rejected
      const result = await guardProfileService.updateProfile(profileId, {
        profileStatus: 'rejected'
      })

      if (result.success) {
        // Log rejection audit trail
        await topsComplianceService.logComplianceAccess(
          profileId,
          'compliance_check',
          'Profile rejected',
          {
            reason: rejectionReason,
            rejectedBy: 'current-user-id' // Would come from auth context
          }
        )

        toast.success('Profile rejected')
        setShowRejectionDialog(false)
        onRejection?.()
        router.push('/dashboard/manager/guards/profiles')
      } else {
        toast.error(`Rejection failed: ${result.error}`)
      }
    } catch (error) {
      toast.error('Failed to reject profile')
    } finally {
      setIsRejecting(false)
    }
  }

  const openTopsProfile = () => {
    if (profile?.topsProfileUrl) {
      window.open(profile.topsProfileUrl, '_blank', 'noopener,noreferrer')
      
      // Log TOPS access
      topsComplianceService.logComplianceAccess(
        profileId,
        'tops_link_access',
        'TOPS profile accessed by manager',
        { url: profile.topsProfileUrl }
      )
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500'
      case 'under_review': return 'bg-blue-500'
      case 'approved': return 'bg-green-500'
      case 'rejected': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const isDocumentExpiring = (doc: DocumentReference) => {
    if (!doc.expiryDate) return false
    const expiryDate = new Date(doc.expiryDate)
    const thirtyDaysFromNow = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
    return expiryDate <= thirtyDaysFromNow
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading profile...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!profile || !compliance) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load profile data. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile Approval Review</h1>
          <p className="text-muted-foreground">
            Review guard profile for TOPS compliance and approval
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(profile.profileStatus)}>
            {profile.profileStatus.replace('_', ' ').toUpperCase()}
          </Badge>
          <Badge variant="outline">
            ID: {profile.id.slice(-8)}
          </Badge>
        </div>
      </div>

      {/* Compliance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Compliance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Score</span>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getComplianceColor(compliance.score)}`}>
                {compliance.score}%
              </span>
              {compliance.score >= 90 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
          </div>
          
          <Progress value={compliance.score} className="w-full" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Status</h4>
              <Badge variant={compliance.isCompliant ? "default" : "destructive"}>
                {compliance.isCompliant ? 'Compliant' : 'Non-Compliant'}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Schedulable</h4>
              <Badge variant={profile.isSchedulable ? "default" : "secondary"}>
                {profile.isSchedulable ? 'Ready' : 'Not Ready'}
              </Badge>
            </div>
          </div>

          {compliance.missingFields.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Missing Fields:</strong> {compliance.missingFields.join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Legal Name</Label>
                <p className="font-medium">{profile.legalName}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Date of Birth</Label>
                <p className="font-medium">
                  {format(new Date(profile.dateOfBirth), 'MMMM dd, yyyy')}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Place of Birth</Label>
                <p className="font-medium">{profile.placeOfBirth}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Employee Number</Label>
                <p className="font-medium">{profile.employeeNumber || 'Not assigned'}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Employment Status</Label>
                <Badge variant="outline">{profile.employmentStatus}</Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  SSN Last 6: ••••••
                </span>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium text-muted-foreground">Current Address</Label>
            <div className="flex items-start gap-2 mt-1">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="font-medium">{profile.currentAddress.street}</p>
                <p className="text-sm text-muted-foreground">
                  {profile.currentAddress.city}, {profile.currentAddress.state} {profile.currentAddress.zipCode}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TOPS Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            TOPS Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.topsProfileUrl ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">TOPS Profile URL</p>
                <p className="text-sm text-muted-foreground truncate max-w-md">
                  {profile.topsProfileUrl}
                </p>
              </div>
              <Button variant="outline" onClick={openTopsProfile}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Profile
              </Button>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No TOPS profile URL provided. This may affect compliance scoring.
              </AlertDescription>
            </Alert>
          )}

          {profile.licenseNumber && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">License Number</Label>
                <p className="font-medium">{profile.licenseNumber}</p>
              </div>
              
              {profile.licenseExpiry && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">License Expiry</Label>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {format(new Date(profile.licenseExpiry), 'MMM dd, yyyy')}
                    </p>
                    {new Date(profile.licenseExpiry) <= new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Expiring Soon
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents ({profile.documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile.documents.length > 0 ? (
            <div className="space-y-3">
              {profile.documents.map(document => (
                <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{document.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{document.type}</span>
                        {document.isRequired && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                        {document.expiryDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Expires: {format(new Date(document.expiryDate), 'MMM dd, yyyy')}
                            </span>
                            {isDocumentExpiring(document) && (
                              <Badge variant="destructive" className="text-xs">
                                Expiring
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedDocument(document)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents uploaded yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit History */}
      {auditHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditHistory.slice(0, 5).map(audit => (
                <div key={audit.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{audit.accessDetails.action}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(audit.createdAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <Badge variant="outline">{audit.auditType.replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Decision</CardTitle>
          <CardDescription>
            Review all information carefully before making a decision
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {compliance.recommendations.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Recommendations:</strong>
                <ul className="list-disc list-inside mt-2">
                  {compliance.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" disabled={profile.profileStatus === 'rejected'}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Profile</DialogTitle>
                  <DialogDescription>
                    Please provide a reason for rejecting this profile. The guard will be notified.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Rejection Reason</Label>
                    <Textarea
                      placeholder="Explain why this profile is being rejected..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowRejectionDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleReject}
                    disabled={isRejecting || !rejectionReason.trim()}
                  >
                    {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button 
              onClick={handleApprove}
              disabled={isApproving || compliance.score < 90 || profile.profileStatus === 'approved'}
              size="lg"
            >
              {isApproving ? (
                'Approving...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Profile
                </>
              )}
            </Button>
          </div>

          {compliance.score < 90 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Profile cannot be approved with a compliance score below 90%. 
                Current score: {compliance.score}%
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Document Preview Dialog */}
      {selectedDocument && (
        <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedDocument.name}</DialogTitle>
              <DialogDescription>
                Document preview and details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                {selectedDocument.mimeType.startsWith('image/') ? (
                  <img 
                    src={selectedDocument.url} 
                    alt={selectedDocument.name}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Preview not available for this file type
                    </p>
                    <Button variant="outline" asChild>
                      <a href={selectedDocument.url} target="_blank" rel="noopener noreferrer">
                        Open Document
                      </a>
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>File Size</Label>
                  <p>{Math.round(selectedDocument.size / 1024)} KB</p>
                </div>
                <div>
                  <Label>Upload Date</Label>
                  <p>{format(new Date(selectedDocument.uploadedAt), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <Label>Document Type</Label>
                  <p>{selectedDocument.type}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge variant="outline">{selectedDocument.status}</Badge>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}