"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, UserPlus } from "lucide-react"
import { guardLeadCaptureSchema, type GuardLeadCaptureFormData, transformLeadFormData } from "@/lib/validations/guard-leads"
import { submitGuardLead } from "@/lib/services/guard-lead-service"
import type { LeadSource } from "@/lib/types/guard-leads"

interface GuardLeadCaptureFormProps {
  leadSource?: LeadSource
  sourceDetails?: Record<string, any>
  onSuccess?: (leadId: string) => void
  onError?: (error: string) => void
  className?: string
}

export default function GuardLeadCaptureForm({
  leadSource = 'website',
  sourceDetails,
  onSuccess,
  onError,
  className = ''
}: GuardLeadCaptureFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<GuardLeadCaptureFormData>({
    resolver: zodResolver(guardLeadCaptureSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      lead_source: leadSource,
      source_details: sourceDetails
    }
  })

  const phoneValue = watch('phone')

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Remove all non-digits
    const digits = value.replace(/\D/g, "")
    
    // Format as (XXX) XXX-XXXX
    let formattedValue = ""
    if (digits.length <= 3) {
      formattedValue = digits.length > 0 ? `(${digits}` : ""
    } else if (digits.length <= 6) {
      formattedValue = `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    } else {
      formattedValue = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }
    
    setValue('phone', formattedValue)
  }

  const onSubmit = async (data: GuardLeadCaptureFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const transformedData = transformLeadFormData(data)
      const result = await submitGuardLead(transformedData)

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit guard lead')
      }

      setIsSubmitted(true)
      onSuccess?.(result.data.id)

      // Reset form after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false)
        reset()
      }, 3000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setSubmitError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSourceDisplayName = (source: LeadSource): string => {
    const sourceNames = {
      'website': 'Website',
      'qr-code': 'QR Code',
      'social-media': 'Social Media',
      'referral': 'Referral',
      'job-board': 'Job Board',
      'direct-contact': 'Direct Contact'
    }
    return sourceNames[source] || source
  }

  if (isSubmitted) {
    return (
      <div className={`rounded-xl border bg-card/80 backdrop-blur-sm p-6 shadow-lg ${className}`}>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="rounded-full bg-primary/20 p-3 mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
          <p className="text-muted-foreground mb-2">
            Your interest has been submitted successfully.
          </p>
          <p className="text-sm text-muted-foreground">
            We'll contact you within 24 hours with next steps.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border bg-card/80 backdrop-blur-sm p-6 shadow-lg hover:shadow-xl transition-all duration-500 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="rounded-lg bg-primary/10 p-2">
          <UserPlus className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Join Our Security Team</h3>
          <p className="text-sm text-muted-foreground">Express your interest in working with us</p>
        </div>
      </div>

      {submitError && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              {...register('first_name')}
              placeholder="John"
              className="transition-all duration-300 focus:border-primary focus:ring-primary/30 hover:border-primary/50"
            />
            {errors.first_name && (
              <p className="text-sm text-destructive">{errors.first_name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              {...register('last_name')}
              placeholder="Doe"
              className="transition-all duration-300 focus:border-primary focus:ring-primary/30 hover:border-primary/50"
            />
            {errors.last_name && (
              <p className="text-sm text-destructive">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="john@example.com"
              className="transition-all duration-300 focus:border-primary focus:ring-primary/30 hover:border-primary/50"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              placeholder="(123) 456-7890"
              value={phoneValue || ''}
              onChange={handlePhoneChange}
              className="transition-all duration-300 focus:border-primary focus:ring-primary/30 hover:border-primary/50"
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lead_source">How did you hear about us?</Label>
          <Select 
            onValueChange={(value: LeadSource) => setValue('lead_source', value)}
            defaultValue={leadSource}
          >
            <SelectTrigger className="transition-all duration-300 focus:border-primary focus:ring-primary/30 hover:border-primary/50">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="qr-code">QR Code</SelectItem>
              <SelectItem value="social-media">Social Media</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="job-board">Job Board</SelectItem>
              <SelectItem value="direct-contact">Direct Contact</SelectItem>
            </SelectContent>
          </Select>
          {errors.lead_source && (
            <p className="text-sm text-destructive">{errors.lead_source.message}</p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg hover:shadow-accent/30 transition-all duration-300"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Express Interest"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          We'll contact you within 24 hours to discuss opportunities and next steps.
        </p>
      </form>
    </div>
  )
}