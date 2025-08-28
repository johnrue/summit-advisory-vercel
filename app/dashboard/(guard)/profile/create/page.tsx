"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Shield, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Save,
  Send,
  ArrowLeft
} from 'lucide-react'
import { GuardProfileCreationForm } from '@/components/profiles/GuardProfileCreationForm'
import { DocumentUploadManager } from '@/components/profiles/DocumentUploadManager'
import { ProfileCompletionAssistant } from '@/components/profiles/ProfileCompletionAssistant'
import { guardProfileService } from '@/lib/services/guard-profile-service'
import type { GuardProfileCreateData } from '@/lib/types/guard-profile'
import { cn } from '@/lib/utils'

interface ProfileCreationStep {
  id: string
  title: string
  description: string
  completed: boolean
  required: boolean
}

export default function GuardProfileCreatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationId = searchParams.get('applicationId')

  const [currentStep, setCurrentStep] = useState(0)
  const [profileData, setProfileData] = useState<Partial<GuardProfileCreateData>>({})
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const steps: ProfileCreationStep[] = [
    {
      id: 'personal',
      title: 'Personal Information',
      description: 'Basic personal details and legal name',
      completed: false,
      required: true
    },
    {
      id: 'contact',
      title: 'Contact Information',
      description: 'Address, phone, and emergency contacts',
      completed: false,
      required: true
    },
    {
      id: 'employment',
      title: 'Employment Details',
      description: 'Work authorization and availability',
      completed: false,
      required: true
    },
    {
      id: 'security',
      title: 'Security Information',
      description: 'TOPS compliance and certifications',
      completed: false,
      required: true
    },
    {
      id: 'documents',
      title: 'Documents',
      description: 'Required documents and certifications',
      completed: false,
      required: true
    },
    {
      id: 'review',
      title: 'Review & Submit',
      description: 'Review all information before submission',
      completed: false,
      required: true
    }
  ]

  useEffect(() => {
    // Pre-populate from application data if available
    if (applicationId) {
      loadApplicationData()
    }
  }, [applicationId])

  const loadApplicationData = async () => {
    try {
      setLoading(true)
      // In real implementation, load from application data
      // This would use the guard profile service to get existing application info
      const mockData = {
        legalName: 'John Smith',
        email: 'john.smith@email.com',
        phone: '(555) 123-4567',
        applicationId: applicationId || ''
      }
      setProfileData(mockData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load application data')
    } finally {
      setLoading(false)
    }
  }

  const updateProfileData = (field: string, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const { [field]: _, ...rest } = prev
        return rest
      })
    }
  }

  const validateStep = (stepId: string): boolean => {
    const errors: Record<string, string> = {}

    switch (stepId) {
      case 'personal':
        if (!profileData.legalName?.trim()) errors.legalName = 'Legal name is required'
        if (!profileData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required'
        if (!profileData.socialSecurityNumber?.trim()) errors.socialSecurityNumber = 'SSN is required'
        break
      case 'contact':
        if (!profileData.email?.trim()) errors.email = 'Email is required'
        if (!profileData.phone?.trim()) errors.phone = 'Phone number is required'
        if (!profileData.address?.street?.trim()) errors.address = 'Address is required'
        break
      case 'employment':
        if (!profileData.workAuthorization) errors.workAuthorization = 'Work authorization status is required'
        if (!profileData.availability?.daysAvailable?.length) errors.availability = 'Availability is required'
        break
      case 'security':
        if (!profileData.topsLicenseNumber?.trim()) errors.topsLicenseNumber = 'TOPS license number is required'
        break
      case 'documents':
        if (uploadedDocuments.length === 0) errors.documents = 'At least one document is required'
        break
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const nextStep = () => {
    if (validateStep(steps[currentStep].id)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const saveDraft = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await guardProfileService.saveDraft({
        ...profileData,
        applicationId: applicationId || '',
        documentIds: uploadedDocuments
      } as GuardProfileCreateData)

      if (result.success) {
        // Show success notification
        console.log('Draft saved successfully')
      } else {
        setError(result.error || 'Failed to save draft')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setLoading(false)
    }
  }

  const submitProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      // Validate all steps
      const allValid = steps.slice(0, -1).every(step => validateStep(step.id))
      if (!allValid) {
        setError('Please complete all required fields')
        return
      }

      const result = await guardProfileService.createProfile({
        ...profileData,
        applicationId: applicationId || '',
        documentIds: uploadedDocuments
      } as GuardProfileCreateData)

      if (result.success) {
        // Redirect to success page or profile view
        router.push(`/dashboard/profile?success=created&id=${result.data?.id}`)
      } else {
        setError(result.error || 'Failed to create profile')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  const completionPercentage = Math.round((currentStep / (steps.length - 1)) * 100)

  const renderStepContent = () => {
    const step = steps[currentStep]

    switch (step.id) {
      case 'documents':
        return (
          <DocumentUploadManager
            profileId={profileData.id}
            existingDocuments={[]}
            onDocumentsChange={setUploadedDocuments}
            validationErrors={validationErrors}
          />
        )
      case 'review':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Name:</strong> {profileData.legalName || 'Not provided'}</div>
                  <div><strong>DOB:</strong> {profileData.dateOfBirth || 'Not provided'}</div>
                  <div><strong>SSN:</strong> {profileData.socialSecurityNumber ? '***-**-' + profileData.socialSecurityNumber.slice(-4) : 'Not provided'}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Email:</strong> {profileData.email || 'Not provided'}</div>
                  <div><strong>Phone:</strong> {profileData.phone || 'Not provided'}</div>
                  <div><strong>Address:</strong> {profileData.address?.street || 'Not provided'}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Employment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Work Authorization:</strong> {profileData.workAuthorization || 'Not provided'}</div>
                  <div><strong>Availability:</strong> {profileData.availability?.daysAvailable?.join(', ') || 'Not provided'}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Security Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>TOPS License:</strong> {profileData.topsLicenseNumber || 'Not provided'}</div>
                  <div><strong>Documents:</strong> {uploadedDocuments.length} uploaded</div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please review all information carefully. Once submitted, some changes may require 
                manager approval.
              </AlertDescription>
            </Alert>
          </div>
        )
      default:
        return (
          <GuardProfileCreationForm
            step={step.id}
            data={profileData}
            onDataChange={updateProfileData}
            validationErrors={validationErrors}
          />
        )
    }
  }

  if (!applicationId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Invalid access. Profile creation requires an approved application.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Guard Profile</h1>
            <p className="text-muted-foreground">
              Complete your security guard profile to begin receiving assignments
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            <Shield className="h-4 w-4 mr-1" />
            TOPS Compliant
          </Badge>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Profile Completion</span>
            <span>{completionPercentage}% Complete</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        {/* Step Navigation */}
        <div className="flex flex-wrap gap-2">
          {steps.map((step, index) => (
            <Button
              key={step.id}
              variant={currentStep === index ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentStep(index)}
              disabled={index > currentStep + 1}
              className={cn(
                "text-xs",
                currentStep > index && "bg-green-100 border-green-500 text-green-700",
                currentStep === index && "bg-primary text-primary-foreground"
              )}
            >
              {currentStep > index && <CheckCircle className="h-3 w-3 mr-1" />}
              {step.title}
            </Button>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>{steps[currentStep].title}</span>
                </CardTitle>
                <CardDescription>{steps[currentStep].description}</CardDescription>
              </CardHeader>
              <CardContent>
                {renderStepContent()}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Completion Assistant */}
            <ProfileCompletionAssistant
              profileData={profileData}
              currentStep={steps[currentStep].id}
              onSuggestionApply={(field, value) => updateProfileData(field, value)}
            />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  onClick={saveDraft}
                  disabled={loading}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                
                {currentStep < steps.length - 2 && (
                  <Button
                    onClick={nextStep}
                    disabled={loading}
                    className="w-full"
                  >
                    Continue
                  </Button>
                )}
                
                {currentStep === steps.length - 1 && (
                  <Button
                    onClick={submitProfile}
                    disabled={loading}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit Profile
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Help */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Contact our support team:</p>
                <div className="space-y-1 text-muted-foreground">
                  <div>📞 (830) 201-0414</div>
                  <div>✉️ support@summitadvisoryfirm.com</div>
                  <div>🕒 Mon-Fri 9AM-5PM</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={currentStep === 0 || loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              disabled={loading}
            >
              Cancel
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button onClick={nextStep} disabled={loading}>
                Continue
              </Button>
            ) : (
              <Button onClick={submitProfile} disabled={loading}>
                <Send className="h-4 w-4 mr-2" />
                Submit Profile
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}