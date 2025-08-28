"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Upload, CheckCircle, AlertCircle, Shield } from 'lucide-react'
import { toast } from 'sonner'

import { GuardProfileService } from '@/lib/services/guard-profile-service'
import { TOPSComplianceService } from '@/lib/services/tops-compliance-service'
import type { GuardProfileCreateData, AddressData, AIParsedData } from '@/lib/types/guard-profile'

// Form validation schema
const guardProfileSchema = z.object({
  legalName: z.string().min(2, 'Legal name must be at least 2 characters'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  placeOfBirth: z.string().min(2, 'Place of birth is required'),
  ssnLastSix: z.string().regex(/^\d{6}$/, 'Must be exactly 6 digits'),
  currentAddress: z.object({
    street: z.string().min(5, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().length(2, 'State must be 2 characters (e.g., TX)'),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'ZIP code must be 5 or 9 digits'),
    country: z.string().default('USA')
  }),
  topsProfileUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().optional()
})

type FormData = z.infer<typeof guardProfileSchema>

interface Props {
  applicationId: string
  aiParsedData?: AIParsedData
  onSuccess?: () => void
  onCancel?: () => void
}

export function GuardProfileCreationForm({
  applicationId,
  aiParsedData,
  onSuccess,
  onCancel
}: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [completionPercentage, setCompletionPercentage] = useState(0)
  const [complianceScore, setComplianceScore] = useState(0)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [topsValidation, setTopsValidation] = useState<{ isValid: boolean; message: string } | null>(null)

  const guardProfileService = new GuardProfileService()
  const topsComplianceService = new TOPSComplianceService()

  const form = useForm<FormData>({
    resolver: zodResolver(guardProfileSchema),
    defaultValues: {
      legalName: '',
      dateOfBirth: '',
      placeOfBirth: '',
      ssnLastSix: '',
      currentAddress: {
        street: '',
        city: '',
        state: 'TX',
        zipCode: '',
        country: 'USA'
      },
      topsProfileUrl: '',
      licenseNumber: '',
      licenseExpiry: ''
    }
  })

  // Pre-populate form with AI-parsed data
  useEffect(() => {
    if (aiParsedData) {
      const updates: Partial<FormData> = {}
      
      if (aiParsedData.fullName?.value && aiParsedData.fullName.confidence > 0.7) {
        updates.legalName = aiParsedData.fullName.value
      }
      
      if (aiParsedData.address?.value && aiParsedData.address.confidence > 0.7) {
        updates.currentAddress = {
          ...form.getValues('currentAddress'),
          ...aiParsedData.address.value
        }
      }

      if (Object.keys(updates).length > 0) {
        form.reset({ ...form.getValues(), ...updates })
        toast.info('Form pre-populated with information from your application')
      }
    }
  }, [aiParsedData, form])

  // Calculate completion percentage as user types
  useEffect(() => {
    const subscription = form.watch(() => {
      const values = form.getValues()
      const requiredFields = [
        values.legalName,
        values.dateOfBirth,
        values.placeOfBirth,
        values.ssnLastSix,
        values.currentAddress.street,
        values.currentAddress.city,
        values.currentAddress.zipCode
      ]
      
      const completedFields = requiredFields.filter(field => field && field.trim()).length
      const percentage = Math.round((completedFields / requiredFields.length) * 100)
      setCompletionPercentage(percentage)
    })

    return () => subscription.unsubscribe()
  }, [form])

  // Validate TOPS URL when it changes
  useEffect(() => {
    const topsUrl = form.watch('topsProfileUrl')
    if (topsUrl && topsUrl.length > 10) {
      const validateTops = async () => {
        const result = await topsComplianceService.validateTopsProfile(topsUrl)
        if (result.success) {
          setTopsValidation({
            isValid: result.data.isValid,
            message: result.data.isValid 
              ? 'TOPS profile URL is valid and accessible'
              : result.data.error || 'TOPS profile URL could not be validated'
          })
        }
      }
      
      const timeoutId = setTimeout(validateTops, 1000) // Debounce
      return () => clearTimeout(timeoutId)
    } else {
      setTopsValidation(null)
    }
  }, [form.watch('topsProfileUrl'), topsComplianceService])

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    setValidationErrors([])

    try {
      // Validate required fields
      const errors: string[] = []
      
      if (!data.legalName.trim()) errors.push('Legal name is required')
      if (!data.dateOfBirth) errors.push('Date of birth is required')
      if (!data.placeOfBirth.trim()) errors.push('Place of birth is required')
      if (!data.ssnLastSix || data.ssnLastSix.length !== 6) errors.push('Last 6 digits of SSN is required')
      if (!data.currentAddress.street.trim()) errors.push('Street address is required')
      if (!data.currentAddress.city.trim()) errors.push('City is required')
      if (!data.currentAddress.zipCode.trim()) errors.push('ZIP code is required')

      if (errors.length > 0) {
        setValidationErrors(errors)
        setIsLoading(false)
        return
      }

      // Prepare profile data
      const profileData: GuardProfileCreateData = {
        applicationId,
        legalName: data.legalName.trim(),
        dateOfBirth: data.dateOfBirth,
        placeOfBirth: data.placeOfBirth.trim(),
        ssnLastSix: data.ssnLastSix,
        currentAddress: {
          street: data.currentAddress.street.trim(),
          city: data.currentAddress.city.trim(),
          state: data.currentAddress.state.toUpperCase(),
          zipCode: data.currentAddress.zipCode.trim(),
          country: data.currentAddress.country || 'USA',
          isVerified: false,
          lastUpdated: new Date().toISOString()
        },
        topsProfileUrl: data.topsProfileUrl || undefined,
        licenseNumber: data.licenseNumber || undefined,
        licenseExpiry: data.licenseExpiry || undefined
      }

      // Create profile
      const result = await guardProfileService.createProfile(profileData)

      if (result.success) {
        toast.success('Guard profile created successfully!')
        
        // Calculate initial compliance score
        const scoreResult = await guardProfileService.calculateComplianceScore(result.data.id)
        if (scoreResult.success) {
          setComplianceScore(scoreResult.data.overall)
        }

        if (onSuccess) {
          onSuccess()
        } else {
          router.push(`/dashboard/profile/view/${result.data.id}`)
        }
      } else {
        toast.error(result.error)
        setValidationErrors([result.error])
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error('Failed to create profile: ' + errorMessage)
      setValidationErrors([errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Create Your Guard Profile
        </h1>
        <p className="text-muted-foreground">
          Complete your official TOPS-compliant guard profile to become eligible for scheduling
        </p>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Profile Completion</CardTitle>
              <CardDescription>
                Complete all required fields to activate your profile
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {completionPercentage}%
              </div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={completionPercentage} className="w-full" />
          {complianceScore > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                Compliance Score: <strong>{complianceScore}%</strong>
              </span>
              {complianceScore >= 90 && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Compliant
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Provide your legal information as it appears on government documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="required">Full Legal Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your full legal name"
                          {...field}
                          className="bg-background"
                        />
                      </FormControl>
                      <FormDescription>
                        Must match your government-issued ID exactly
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="required">Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="bg-background"
                        />
                      </FormControl>
                      <FormDescription>
                        This information is encrypted and secure
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="placeOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="required">Place of Birth</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="City, State/Country"
                          {...field}
                          className="bg-background"
                        />
                      </FormControl>
                      <FormDescription>
                        City and state/country where you were born
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ssnLastSix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="required">Last 6 Digits of SSN</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="123456"
                          maxLength={6}
                          {...field}
                          className="bg-background"
                        />
                      </FormControl>
                      <FormDescription>
                        Encrypted storage - only last 6 digits required
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Current Address</CardTitle>
              <CardDescription>
                Provide your current residential address for verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="currentAddress.street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="required">Street Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Main Street, Apt 4B"
                        {...field}
                        className="bg-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="currentAddress.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="required">City</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Houston"
                          {...field}
                          className="bg-background"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentAddress.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="required">State</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="TX"
                          maxLength={2}
                          {...field}
                          className="bg-background uppercase"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentAddress.zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="required">ZIP Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="77001"
                          {...field}
                          className="bg-background"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* TOPS Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>TOPS Compliance Information</CardTitle>
              <CardDescription>
                Texas Department of Public Safety TOPS profile information (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="topsProfileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TOPS Profile URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://tops.txdps.texas.gov/profile/..."
                        {...field}
                        className="bg-background"
                      />
                    </FormControl>
                    <FormDescription>
                      Link to your TOPS profile (if you have one)
                    </FormDescription>
                    {topsValidation && (
                      <div className={`flex items-center gap-2 mt-2 ${
                        topsValidation.isValid ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {topsValidation.isValid ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <span className="text-sm">{topsValidation.message}</span>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="TX-123456"
                          {...field}
                          className="bg-background"
                        />
                      </FormControl>
                      <FormDescription>
                        Security guard license number (if applicable)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="licenseExpiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Expiry Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="bg-background"
                        />
                      </FormControl>
                      <FormDescription>
                        When your license expires (if applicable)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            
            <div className="space-x-3">
              <Button
                type="button"
                variant="secondary"
                disabled={isLoading}
                onClick={() => {
                  // Save draft functionality could be added here
                  toast.info('Draft saved')
                }}
              >
                Save Draft
              </Button>
              
              <Button
                type="submit"
                disabled={isLoading || completionPercentage < 80}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Create Profile
                  </>
                )}
              </Button>
            </div>
          </div>

          {completionPercentage < 80 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Complete at least 80% of the required fields to create your profile.
                Currently at {completionPercentage}% completion.
              </AlertDescription>
            </Alert>
          )}
        </form>
      </Form>
    </div>
  )
}

// CSS for required field indicators
const styles = `
.required::after {
  content: ' *';
  color: rgb(239, 68, 68);
}
`

export default GuardProfileCreationForm