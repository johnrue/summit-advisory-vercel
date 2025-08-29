"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Calendar, Upload, FileText, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react'
import { toast } from 'sonner'
import type { GuardCertification } from '@/lib/types'

interface CertificationRenewalProps {
  guardId: string
  certificationId?: string
}

/**
 * Certification Renewal Interface for Guards
 * Allows guards to submit renewal requests with document uploads
 */
export default function CertificationRenewal({ guardId, certificationId }: CertificationRenewalProps) {
  const [certifications, setCertifications] = useState<GuardCertification[]>([])
  const [selectedCertification, setSelectedCertification] = useState<GuardCertification | null>(null)
  const [renewalData, setRenewalData] = useState({
    newExpiryDate: '',
    notes: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [renewalStatus, setRenewalStatus] = useState<{
    needsRenewal: boolean
    daysUntilExpiry: number
    hasActivePendingRequest: boolean
  } | null>(null)

  useEffect(() => {
    fetchGuardCertifications()
    if (certificationId) {
      checkRenewalStatus(certificationId)
    }
  }, [guardId, certificationId])

  const fetchGuardCertifications = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/certifications?guardId=${guardId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch certifications')
      }

      const data = await response.json()
      setCertifications(data)

      // Auto-select certification if provided
      if (certificationId && data.length > 0) {
        const cert = data.find((c: GuardCertification) => c.id === certificationId)
        if (cert) {
          setSelectedCertification(cert)
        }
      }
    } catch (error) {
      console.error('Error fetching certifications:', error)
      toast.error('Failed to load certifications')
    } finally {
      setLoading(false)
    }
  }

  const checkRenewalStatus = async (certId: string) => {
    try {
      const response = await fetch(`/api/certifications/renewals/check?certificationId=${certId}`)
      
      if (response.ok) {
        const status = await response.json()
        setRenewalStatus(status)
      }
    } catch (error) {
      console.error('Error checking renewal status:', error)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a PDF or image file.')
      return
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('File size too large. Maximum size is 5MB.')
      return
    }

    setSelectedFile(file)
  }

  const submitRenewalRequest = async () => {
    if (!selectedCertification || !selectedFile || !renewalData.newExpiryDate) {
      toast.error('Please fill in all required fields and select a file.')
      return
    }

    // Validate new expiry date is in the future
    const newExpiry = new Date(renewalData.newExpiryDate)
    const today = new Date()
    if (newExpiry <= today) {
      toast.error('New expiry date must be in the future.')
      return
    }

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('certificationId', selectedCertification.id)
      formData.append('guardId', guardId)
      formData.append('newExpiryDate', renewalData.newExpiryDate)
      formData.append('userId', guardId) // In a real app, this would be the current user ID
      formData.append('documentFile', selectedFile)
      if (renewalData.notes) {
        formData.append('notes', renewalData.notes)
      }

      const response = await fetch('/api/certifications/renewals', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit renewal request')
      }

      toast.success('Renewal request submitted successfully!')
      
      // Reset form
      setRenewalData({ newExpiryDate: '', notes: '' })
      setSelectedFile(null)
      
      // Refresh certifications and check status
      await fetchGuardCertifications()
      if (selectedCertification) {
        await checkRenewalStatus(selectedCertification.id)
      }

    } catch (error) {
      console.error('Error submitting renewal request:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit renewal request')
    } finally {
      setUploading(false)
    }
  }

  const getDaysUntilExpiry = (expiryDate: Date): number => {
    const today = new Date()
    const diffTime = expiryDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getUrgencyLevel = (daysUntilExpiry: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (daysUntilExpiry < 0) return 'critical'
    if (daysUntilExpiry <= 7) return 'high'
    if (daysUntilExpiry <= 14) return 'medium'
    return 'low'
  }

  const getUrgencyColor = (level: string): string => {
    switch (level) {
      case 'critical': return 'text-red-600'
      case 'high': return 'text-red-500'
      case 'medium': return 'text-orange-500'
      case 'low': return 'text-green-500'
      default: return 'text-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Certification Renewal</h2>
          <p className="text-muted-foreground">Submit renewal requests for your certifications</p>
        </div>
      </div>

      {/* Certification Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Certifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {certifications.length === 0 ? (
            <p className="text-muted-foreground">No certifications found.</p>
          ) : (
            <div className="grid gap-4">
              {certifications.map((cert) => {
                const daysUntilExpiry = getDaysUntilExpiry(cert.expiryDate)
                const urgencyLevel = getUrgencyLevel(daysUntilExpiry)
                const isSelected = selectedCertification?.id === cert.id

                return (
                  <div
                    key={cert.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => {
                      setSelectedCertification(cert)
                      checkRenewalStatus(cert.id)
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{cert.certificationType}</h3>
                          <Badge variant={cert.status === 'active' ? 'default' : 'secondary'}>
                            {cert.status}
                          </Badge>
                        </div>
                        
                        {cert.certificateNumber && (
                          <p className="text-sm text-muted-foreground">
                            Certificate: {cert.certificateNumber}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Expires: {cert.expiryDate.toLocaleDateString()}
                          </div>
                          <div className={`flex items-center gap-1 font-medium ${getUrgencyColor(urgencyLevel)}`}>
                            {daysUntilExpiry < 0 ? (
                              <>
                                <AlertTriangle className="h-4 w-4" />
                                {Math.abs(daysUntilExpiry)} days overdue
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4" />
                                {daysUntilExpiry} days remaining
                              </>
                            )}
                          </div>
                        </div>

                        {cert.issuingAuthority && (
                          <p className="text-xs text-muted-foreground">
                            Issued by: {cert.issuingAuthority}
                          </p>
                        )}
                      </div>

                      {urgencyLevel === 'critical' && (
                        <Badge variant="destructive" className="ml-2">
                          Expired
                        </Badge>
                      )}
                      {urgencyLevel === 'high' && (
                        <Badge variant="secondary" className="ml-2 text-red-600">
                          Urgent
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Renewal Form */}
      {selectedCertification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Renew: {selectedCertification.certificationType}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renewalStatus?.hasActivePendingRequest && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  You already have a pending renewal request for this certification. 
                  Please wait for manager review before submitting a new request.
                </AlertDescription>
              </Alert>
            )}

            {!renewalStatus?.hasActivePendingRequest && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newExpiryDate">New Expiry Date *</Label>
                  <Input
                    id="newExpiryDate"
                    type="date"
                    value={renewalData.newExpiryDate}
                    onChange={(e) => setRenewalData(prev => ({ 
                      ...prev, 
                      newExpiryDate: e.target.value 
                    }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document">Upload New Certificate *</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="document"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    {selectedFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Accepted formats: PDF, JPG, PNG (Max 5MB)
                  </p>
                  {selectedFile && (
                    <p className="text-sm text-green-600">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information about this renewal..."
                    value={renewalData.notes}
                    onChange={(e) => setRenewalData(prev => ({ 
                      ...prev, 
                      notes: e.target.value 
                    }))}
                    rows={3}
                  />
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <p className="text-sm">Uploading renewal request...</p>
                    <Progress value={50} className="w-full" />
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={submitRenewalRequest}
                    disabled={!selectedFile || !renewalData.newExpiryDate || uploading}
                    className="flex-1"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Submit Renewal Request
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedCertification(null)
                      setRenewalData({ newExpiryDate: '', notes: '' })
                      setSelectedFile(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Your renewal request will be reviewed by a manager. 
                    You will be notified once it's approved or if additional information is needed.
                    Continue working with your current certification until the renewal is approved.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}