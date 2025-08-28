"use client"

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CalendarDays, MapPin, Clock, DollarSign, User, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { ShiftManagementService } from '@/lib/services/shift-service'
import type { ShiftCreateData, ContactInfo, LocationData, TimeRange, GuardRequirements, ClientInfo, RateInformation } from '@/lib/types/shift-types'
import { cn } from '@/lib/utils'

// Form validation schema
const ContactInfoSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Valid email address is required"),
  role: z.string().optional()
})

const LocationDataSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  address: z.string().min(5, "Complete address is required"),
  contactInfo: ContactInfoSchema,
  specialInstructions: z.string().optional()
})

const TimeRangeSchema = z.object({
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required")
}).refine((data) => {
  const start = new Date(data.startTime)
  const end = new Date(data.endTime)
  return end > start
}, {
  message: "End time must be after start time",
  path: ["endTime"]
})

const GuardRequirementsSchema = z.object({
  minimumExperience: z.number().min(0).optional(),
  requiredSkills: z.array(z.string()).optional(),
  languageRequirements: z.array(z.string()).optional(),
  specificProtocols: z.array(z.string()).optional()
})

const ClientInfoSchema = z.object({
  clientId: z.string().min(1, "Client selection is required"),
  clientName: z.string().min(1, "Client name is required"),
  billingRate: z.number().min(0.01, "Billing rate must be greater than 0"),
  contractReference: z.string().optional()
})

const RateInformationSchema = z.object({
  baseRate: z.number().min(0.01, "Base rate must be greater than 0"),
  overtimeMultiplier: z.number().min(1.0, "Overtime multiplier must be at least 1.0"),
  specialRates: z.record(z.string(), z.number()).optional()
})

const ShiftCreateSchema = z.object({
  title: z.string().min(1, "Shift title is required"),
  description: z.string().optional(),
  locationData: LocationDataSchema,
  timeRange: TimeRangeSchema,
  requiredCertifications: z.array(z.string()),
  guardRequirements: GuardRequirementsSchema,
  clientInfo: ClientInfoSchema,
  priority: z.number().min(1).max(5),
  rateInformation: RateInformationSchema,
  specialRequirements: z.string().optional()
})

type ShiftCreateFormData = z.infer<typeof ShiftCreateSchema>

interface ShiftCreateFormProps {
  onSubmit: (shift: any) => void
  onCancel: () => void
  initialData?: Partial<ShiftCreateData>
  isLoading?: boolean
}

// Mock data for form options
const PRIORITY_OPTIONS = [
  { value: 1, label: '1 - Urgent', color: 'destructive' },
  { value: 2, label: '2 - High', color: 'orange' },
  { value: 3, label: '3 - Normal', color: 'blue' },
  { value: 4, label: '4 - Low', color: 'gray' },
  { value: 5, label: '5 - Routine', color: 'green' }
] as const

const CLIENT_OPTIONS = [
  { id: 'client-1', name: 'Houston Medical Center', billingRate: 35.00 },
  { id: 'client-2', name: 'Dallas Corporate Plaza', billingRate: 32.50 },
  { id: 'client-3', name: 'Austin Tech Campus', billingRate: 40.00 },
  { id: 'client-4', name: 'San Antonio Mall Security', billingRate: 28.00 }
]

const CERTIFICATION_OPTIONS = [
  'Level II Security Officer',
  'Level III Security Officer',
  'Personal Protection Officer (PPO)',
  'Commissioned Security',
  'Armed Security License',
  'CPR/First Aid',
  'DE-Escalation Training',
  'TOPS Certified'
]

const SKILL_OPTIONS = [
  'Customer Service',
  'Access Control',
  'CCTV Monitoring',
  'Report Writing',
  'Emergency Response',
  'Crowd Control',
  'Vehicle Patrol',
  'Radio Communication'
]

const LANGUAGE_OPTIONS = [
  'English (Native)',
  'Spanish (Fluent)',
  'Spanish (Conversational)',
  'French',
  'German',
  'Mandarin'
]

export function ShiftCreateForm({ onSubmit, onCancel, initialData, isLoading = false }: ShiftCreateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedClient, setSelectedClient] = useState<typeof CLIENT_OPTIONS[0] | null>(null)
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null)

  const form = useForm<ShiftCreateFormData>({
    resolver: zodResolver(ShiftCreateSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      locationData: {
        siteName: initialData?.locationData?.siteName || '',
        address: initialData?.locationData?.address || '',
        contactInfo: {
          name: initialData?.locationData?.contactInfo?.name || '',
          phone: initialData?.locationData?.contactInfo?.phone || '',
          email: initialData?.locationData?.contactInfo?.email || '',
          role: initialData?.locationData?.contactInfo?.role || ''
        },
        specialInstructions: initialData?.locationData?.specialInstructions || ''
      },
      timeRange: {
        startTime: initialData?.timeRange?.startTime || '',
        endTime: initialData?.timeRange?.endTime || ''
      },
      requiredCertifications: initialData?.requiredCertifications || [],
      guardRequirements: {
        minimumExperience: initialData?.guardRequirements?.minimumExperience || 0,
        requiredSkills: initialData?.guardRequirements?.requiredSkills || [],
        languageRequirements: initialData?.guardRequirements?.languageRequirements || [],
        specificProtocols: initialData?.guardRequirements?.specificProtocols || []
      },
      clientInfo: {
        clientId: initialData?.clientInfo?.clientId || '',
        clientName: initialData?.clientInfo?.clientName || '',
        billingRate: initialData?.clientInfo?.billingRate || 0,
        contractReference: initialData?.clientInfo?.contractReference || ''
      },
      priority: initialData?.priority || 3,
      rateInformation: {
        baseRate: initialData?.rateInformation?.baseRate || 25.00,
        overtimeMultiplier: initialData?.rateInformation?.overtimeMultiplier || 1.5,
        specialRates: initialData?.rateInformation?.specialRates || {}
      },
      specialRequirements: initialData?.specialRequirements || ''
    }
  })

  // Watch form values for real-time updates
  const watchedValues = form.watch()

  // Calculate estimated cost when relevant fields change
  useEffect(() => {
    const { timeRange, rateInformation } = watchedValues
    if (timeRange.startTime && timeRange.endTime && rateInformation.baseRate) {
      const start = new Date(timeRange.startTime)
      const end = new Date(timeRange.endTime)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      
      if (hours > 0) {
        const regularHours = Math.min(hours, 8)
        const overtimeHours = Math.max(0, hours - 8)
        const cost = (regularHours * rateInformation.baseRate) + 
                    (overtimeHours * rateInformation.baseRate * rateInformation.overtimeMultiplier)
        setEstimatedCost(cost)
      }
    }
  }, [watchedValues.timeRange, watchedValues.rateInformation])

  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    const client = CLIENT_OPTIONS.find(c => c.id === clientId)
    if (client) {
      setSelectedClient(client)
      form.setValue('clientInfo.clientId', client.id)
      form.setValue('clientInfo.clientName', client.name)
      form.setValue('clientInfo.billingRate', client.billingRate)
    }
  }

  const handleSubmit = async (data: ShiftCreateFormData) => {
    try {
      setIsSubmitting(true)
      
      // Transform form data to match service expectations
      const shiftData: ShiftCreateData = {
        title: data.title,
        description: data.description,
        locationData: data.locationData,
        timeRange: data.timeRange,
        requiredCertifications: data.requiredCertifications,
        guardRequirements: data.guardRequirements,
        clientInfo: data.clientInfo,
        priority: data.priority as 1 | 2 | 3 | 4 | 5,
        rateInformation: data.rateInformation,
        specialRequirements: data.specialRequirements
      }

      // Call the service
      const service = new ShiftManagementService()
      const result = await service.createShift(shiftData, 'current-user-id') // TODO: Get actual user ID

      if (result.success && result.data) {
        toast.success('Shift created successfully!')
        onSubmit(result.data)
      } else {
        toast.error(result.error?.message || 'Failed to create shift')
      }
    } catch (error) {
      console.error('Shift creation error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPriorityBadgeVariant = (priority: number) => {
    const option = PRIORITY_OPTIONS.find(p => p.value === priority)
    switch (option?.color) {
      case 'destructive': return 'destructive'
      case 'orange': return 'secondary'
      case 'blue': return 'default'
      case 'gray': return 'outline'
      case 'green': return 'secondary'
      default: return 'default'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Create New Shift</h1>
        <p className="text-muted-foreground">Fill out all required information to create a new security shift assignment.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          
          {/* Basic Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Primary shift details and description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Night Security - Medical Center" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority Level *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              <div className="flex items-center gap-2">
                                <Badge variant={getPriorityBadgeVariant(option.value)} className="text-xs">
                                  {option.label}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide additional details about this shift assignment..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Location & Site Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location & Site Information
              </CardTitle>
              <CardDescription>
                Site details, address, and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="locationData.siteName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Memorial Hermann Hospital" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="locationData.address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="Complete street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="locationData.contactInfo.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Contact Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact person name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="locationData.contactInfo.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Contact Phone *</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="locationData.contactInfo.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Contact Email *</FormLabel>
                      <FormControl>
                        <Input placeholder="contact@site.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="locationData.specialInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Site Instructions</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any special instructions, access codes, or site-specific requirements..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Time & Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Time & Scheduling
              </CardTitle>
              <CardDescription>
                Shift timing and duration details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="timeRange.startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date & Time *</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="timeRange.endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date & Time *</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {estimatedCost && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Estimated Cost:</strong> ${estimatedCost.toFixed(2)} 
                    {watchedValues.timeRange.startTime && watchedValues.timeRange.endTime && (
                      <span className="ml-2 text-muted-foreground">
                        ({Math.round((new Date(watchedValues.timeRange.endTime).getTime() - new Date(watchedValues.timeRange.startTime).getTime()) / (1000 * 60 * 60))} hours)
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Client & Billing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Client & Billing Information
              </CardTitle>
              <CardDescription>
                Client details and rate information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="clientInfo.clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Client *</FormLabel>
                    <Select onValueChange={handleClientSelect} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CLIENT_OPTIONS.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex flex-col">
                              <span>{client.name}</span>
                              <span className="text-sm text-muted-foreground">${client.billingRate.toFixed(2)}/hour</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="rateInformation.baseRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Rate ($/hour) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="25.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="rateInformation.overtimeMultiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overtime Multiplier *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          placeholder="1.5" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 1.5)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="clientInfo.contractReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Reference</FormLabel>
                      <FormControl>
                        <Input placeholder="Contract #" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Guard Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Guard Requirements
              </CardTitle>
              <CardDescription>
                Specify the qualifications and requirements for assigned guards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="guardRequirements.minimumExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Experience (months)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="12" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialRequirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Requirements</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any special requirements, equipment needs, dress code, or specific protocols..."
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Note: Certification, skills, and language selectors would be implemented here */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Advanced guard requirement selectors (certifications, skills, languages) will be implemented in the next iteration.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting ? 'Creating Shift...' : 'Create Shift'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}