"use client"

// Certifications Step - Guard Application Form
// Collects professional certifications and licenses

import React, { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Award, Plus, Trash2, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { ApplicationData, Certification } from '@/lib/types/guard-applications'

interface CertificationsStepProps {
  applicationToken: string
  enableAIAssist?: boolean
}

const CERTIFICATION_TYPES = [
  { value: 'security-guard', label: 'Security Guard License' },
  { value: 'armed-security', label: 'Armed Security License' },
  { value: 'cpr-first-aid', label: 'CPR/First Aid' },
  { value: 'fire-safety', label: 'Fire Safety' },
  { value: 'defensive-driving', label: 'Defensive Driving' },
  { value: 'surveillance', label: 'Surveillance Training' },
  { value: 'crowd-control', label: 'Crowd Control' },
  { value: 'other', label: 'Other' }
]

export function CertificationsStep({ applicationToken, enableAIAssist }: CertificationsStepProps) {
  const form = useFormContext<ApplicationData>()
  const [newCertification, setNewCertification] = useState<Partial<Certification>>({})

  const certifications = form.watch('certifications') || []

  const addCertification = () => {
    if (!newCertification.name || !newCertification.issuer) {
      return
    }

    const certification: Certification = {
      id: crypto.randomUUID(),
      name: newCertification.name!,
      issuer: newCertification.issuer!,
      date_obtained: newCertification.date_obtained || '',
      expiry_date: newCertification.expiry_date || null,
      certification_type: newCertification.certification_type || 'other'
    }

    const updatedCertifications = [...certifications, certification]
    form.setValue('certifications', updatedCertifications)
    setNewCertification({})
  }

  const removeCertification = (id: string) => {
    const updatedCertifications = certifications.filter(cert => cert.id !== id)
    form.setValue('certifications', updatedCertifications)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certifications & Licenses
          </CardTitle>
          <CardDescription>
            Add any relevant certifications, licenses, or professional qualifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Existing Certifications */}
          {certifications.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Your Certifications</h4>
              {certifications.map((cert) => (
                <Card key={cert.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium">{cert.name}</h5>
                      <p className="text-sm text-muted-foreground">Issued by {cert.issuer}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        {cert.date_obtained && <span>Obtained: {cert.date_obtained}</span>}
                        {cert.expiry_date && <span>Expires: {cert.expiry_date}</span>}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeCertification(cert.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Add New Certification */}
          <Card className="p-4">
            <h4 className="font-medium mb-4">Add New Certification</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cert-name">Certification Name *</Label>
                <Input
                  id="cert-name"
                  placeholder="e.g., Security Guard License"
                  value={newCertification.name || ''}
                  onChange={(e) => setNewCertification(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cert-issuer">Issuing Organization *</Label>
                <Input
                  id="cert-issuer"
                  placeholder="e.g., Texas DPS"
                  value={newCertification.issuer || ''}
                  onChange={(e) => setNewCertification(prev => ({ ...prev, issuer: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cert-type">Certification Type</Label>
                <Select
                  value={newCertification.certification_type}
                  onValueChange={(value) => setNewCertification(prev => ({ ...prev, certification_type: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CERTIFICATION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cert-obtained">Date Obtained</Label>
                <Input
                  id="cert-obtained"
                  type="date"
                  value={newCertification.date_obtained || ''}
                  onChange={(e) => setNewCertification(prev => ({ ...prev, date_obtained: e.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="cert-expiry">Expiration Date (if applicable)</Label>
                <Input
                  id="cert-expiry"
                  type="date"
                  value={newCertification.expiry_date || ''}
                  onChange={(e) => setNewCertification(prev => ({ ...prev, expiry_date: e.target.value || null }))}
                />
              </div>

              <div className="md:col-span-2">
                <Button 
                  onClick={addCertification}
                  disabled={!newCertification.name || !newCertification.issuer}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Certification
                </Button>
              </div>
            </div>
          </Card>

          {certifications.length === 0 && (
            <Alert>
              <Award className="h-4 w-4" />
              <AlertDescription>
                If you don't have any certifications yet, that's okay! You can add them later or indicate your willingness to obtain required certifications.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}