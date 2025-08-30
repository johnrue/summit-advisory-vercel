"use client"

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { createLead } from '@/lib/services/lead-management-service'
import type { LeadFormData } from '@/lib/services/lead-management-service'
import { toast } from 'sonner'

const leadFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  sourceType: z.string().min(1, 'Lead source is required'),
  serviceType: z.string().min(1, 'Service type is required'),
  message: z.string().optional(),
  estimatedValue: z.number().min(0).optional(),
  // Source-specific fields
  referrerName: z.string().optional(),
  eventName: z.string().optional(),
  campaignName: z.string().optional(),
  socialPlatform: z.string().optional(),
})

type FormData = z.infer<typeof leadFormSchema>

const leadSources = [
  { value: 'website', label: 'Website Form' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'referral', label: 'Referral' },
  { value: 'networking_event', label: 'Networking Event' },
  { value: 'digital_marketing', label: 'Digital Marketing' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'phone_inquiry', label: 'Phone Inquiry' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'other', label: 'Other' },
]

const serviceTypes = [
  { value: 'armed', label: 'Armed Security' },
  { value: 'unarmed', label: 'Unarmed Security' },
  { value: 'event', label: 'Event Security' },
  { value: 'executive', label: 'Executive Protection' },
  { value: 'commercial', label: 'Commercial Security' },
  { value: 'consulting', label: 'Security Consulting' },
  { value: 'other', label: 'Other Services' },
]

const socialPlatforms = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
]

interface LeadCaptureFormProps {
  onSuccess?: (leadId: string) => void
  onCancel?: () => void
}

export default function LeadCaptureForm({ onSuccess, onCancel }: LeadCaptureFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedSource, setSelectedSource] = useState<string>('')

  const form = useForm<FormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      sourceType: '',
      serviceType: '',
      message: '',
      estimatedValue: undefined,
      referrerName: '',
      eventName: '',
      campaignName: '',
      socialPlatform: '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    
    try {
      // Build source details based on source type
      const sourceDetails: Record<string, any> = {}
      
      switch (data.sourceType) {
        case 'referral':
          if (data.referrerName) sourceDetails.referrerName = data.referrerName
          break
        case 'networking_event':
          if (data.eventName) sourceDetails.eventName = data.eventName
          break
        case 'digital_marketing':
          if (data.campaignName) sourceDetails.campaignName = data.campaignName
          break
        case 'social_media':
          if (data.socialPlatform) sourceDetails.platform = data.socialPlatform
          break
      }

      const leadData: LeadFormData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        sourceType: data.sourceType,
        serviceType: data.serviceType,
        message: data.message,
        estimatedValue: data.estimatedValue,
        sourceDetails,
      }

      const result = await createLead(leadData)

      if (result.success) {
        toast.success('Lead created successfully!')
        form.reset()
        onSuccess?.(result.data!.id)
      } else {
        toast.error(result.error || 'Failed to create lead')
      }
    } catch (error) {
      console.error('Error creating lead:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderSourceSpecificFields = () => {
    switch (selectedSource) {
      case 'referral':
        return (
          <FormField
            control={form.control}
            name="referrerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referrer Name</FormLabel>
                <FormControl>
                  <Input placeholder="Who referred this lead?" {...field} />
                </FormControl>
                <FormDescription>
                  Name of the person or business who referred this lead
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'networking_event':
        return (
          <FormField
            control={form.control}
            name="eventName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Name</FormLabel>
                <FormControl>
                  <Input placeholder="Trade show, conference, etc." {...field} />
                </FormControl>
                <FormDescription>
                  Name of the event where you met this lead
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'digital_marketing':
        return (
          <FormField
            control={form.control}
            name="campaignName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Campaign Name</FormLabel>
                <FormControl>
                  <Input placeholder="Google Ads, email campaign, etc." {...field} />
                </FormControl>
                <FormDescription>
                  Name of the marketing campaign that generated this lead
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'social_media':
        return (
          <FormField
            control={form.control}
            name="socialPlatform"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Social Media Platform</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {socialPlatforms.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Which social media platform did this lead come from?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      default:
        return null
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Capture New Lead</span>
          <Badge variant="outline">Manual Entry</Badge>
        </CardTitle>
        <CardDescription>
          Add a new lead from phone calls, networking events, walk-ins, or other sources
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Lead Source and Service */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Source *</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value)
                        setSelectedSource(value)
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leadSources.map((source) => (
                          <SelectItem key={source.value} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serviceTypes.map((service) => (
                          <SelectItem key={service.value} value={service.value}>
                            {service.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Source-specific fields */}
            {renderSourceSpecificFields()}

            {/* Estimated Value */}
            <FormField
              control={form.control}
              name="estimatedValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Value</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="5000" 
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>
                    Estimated monthly contract value in USD (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about this lead's requirements or conversation..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Any additional information about the lead's security needs or requirements
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Lead...' : 'Create Lead'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}