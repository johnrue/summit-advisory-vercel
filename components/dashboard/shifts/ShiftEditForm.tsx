"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, DollarSign, Users, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Shift, ShiftUpdateData, ShiftStatus, GuardProfile } from "@/lib/types/shift-types"

const shiftEditSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be under 200 characters"),
  description: z.string().optional(),
  locationData: z.object({
    siteName: z.string().min(1, "Site name is required"),
    address: z.string().min(1, "Address is required"),
    contactInfo: z.object({
      name: z.string().min(1, "Contact name is required"),
      phone: z.string().min(10, "Valid phone number required"),
      email: z.string().email("Valid email required"),
      role: z.string().optional()
    }),
    specialInstructions: z.string().optional()
  }),
  timeRange: z.object({
    startTime: z.string(), // Will be converted to ISO string
    endTime: z.string()    // Will be converted to ISO string
  }),
  clientInfo: z.object({
    clientId: z.string().min(1, "Client ID is required"),
    clientName: z.string().min(1, "Client name is required"),
    billingRate: z.number().min(0, "Billing rate must be positive"),
    contractReference: z.string().optional()
  }),
  requiredCertifications: z.array(z.string()).default([]),
  guardRequirements: z.object({
    minimumExperience: z.number().min(0).optional(),
    requiredSkills: z.array(z.string()).default([]),
    languageRequirements: z.array(z.string()).default([]),
    specificProtocols: z.array(z.string()).default([])
  }),
  rateInformation: z.object({
    baseRate: z.number().min(0, "Rate must be positive"),
    overtimeMultiplier: z.number().min(1).default(1.5),
    specialRates: z.record(z.number()).optional()
  }),
  priority: z.number().min(1).max(5).default(3),
  specialRequirements: z.string().optional()
})

type ShiftEditFormData = z.infer<typeof shiftEditSchema>

interface ShiftEditFormProps {
  shift: Shift
  onSubmit: (updateData: ShiftUpdateData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  eligibleGuards: GuardProfile[]
}

export function ShiftEditForm({ shift, onSubmit, onCancel, isLoading, eligibleGuards }: ShiftEditFormProps) {
  const [estimatedCost, setEstimatedCost] = useState<number>(0)

  const form = useForm<ShiftEditFormData>({
    resolver: zodResolver(shiftEditSchema),
    defaultValues: {
      title: shift.title,
      description: shift.description,
      locationData: shift.locationData,
      timeRange: {
        startTime: new Date(shift.timeRange.startTime).toISOString(),
        endTime: new Date(shift.timeRange.endTime).toISOString()
      },
      clientInfo: shift.clientInfo,
      requiredCertifications: shift.requiredCertifications,
      guardRequirements: shift.guardRequirements,
      rateInformation: shift.rateInformation,
      priority: shift.priority,
      specialRequirements: shift.specialRequirements
    }
  })

  const watchedValues = form.watch()

  // Calculate estimated cost when rate or time changes
  useEffect(() => {
    const { timeRange, rateInformation } = watchedValues
    if (timeRange?.startTime && timeRange?.endTime && rateInformation?.baseRate) {
      const startDateTime = new Date(timeRange.startTime)
      const endDateTime = new Date(timeRange.endTime)
      const hours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60)
      
      if (hours > 0) {
        const baseCost = hours * rateInformation.baseRate
        setEstimatedCost(baseCost)
      }
    }
  }, [watchedValues.timeRange, watchedValues.rateInformation])

  const handleFormSubmit = async (data: ShiftEditFormData) => {
    try {
      // Convert form data to API format
      const updateData: ShiftUpdateData = {
        title: data.title,
        description: data.description,
        locationData: data.locationData,
        timeRange: {
          startTime: data.timeRange.startTime,
          endTime: data.timeRange.endTime
        },
        clientInfo: data.clientInfo,
        requiredCertifications: data.requiredCertifications,
        guardRequirements: data.guardRequirements,
        rateInformation: data.rateInformation,
        priority: data.priority,
        specialRequirements: data.specialRequirements
      }

      await onSubmit(updateData)
    } catch (error) {
      console.error("Error updating shift:", error)
      toast.error("Failed to update shift")
    }
  }

  const availableCertifications = [
    "DPS Security License",
    "TOPS Certification",
    "CPR/First Aid",
    "Armed Security License",
    "Crowd Control",
    "Fire Safety",
    "Emergency Response"
  ]

  const physicalRequirements = [
    "Ability to stand for long periods",
    "Ability to walk extended distances",
    "Lifting up to 25 lbs",
    "Good vision and hearing",
    "Ability to climb stairs"
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Edit Shift</h2>
          <p className="text-muted-foreground">Update shift details and requirements</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={shift.status === "published" ? "default" : "secondary"}>
            {shift.status.replace("_", " ").toUpperCase()}
          </Badge>
          {estimatedCost > 0 && (
            <Badge variant="outline" className="text-green-600">
              Est. ${estimatedCost.toFixed(2)}
            </Badge>
          )}
        </div>
      </div>

      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Shift Title *</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="e.g., Office Building Night Security"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-600">{form.formState.errors.title.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level</Label>
                <Select 
                  value={form.watch("priority")?.toString()} 
                  onValueChange={(value) => form.setValue("priority", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Urgent</SelectItem>
                    <SelectItem value="2">2 - High</SelectItem>
                    <SelectItem value="3">3 - Normal</SelectItem>
                    <SelectItem value="4">4 - Low</SelectItem>
                    <SelectItem value="5">5 - Very Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Additional details about this shift..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={form.watch("status")} 
                onValueChange={(value: ShiftStatus) => form.setValue("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="locationType">Location Type</Label>
                <Select 
                  value={form.watch("locationData.type")} 
                  onValueChange={(value: "fixed" | "mobile" | "event") => form.setValue("locationData.type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Location</SelectItem>
                    <SelectItem value="mobile">Mobile Patrol</SelectItem>
                    <SelectItem value="event">Event Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...form.register("locationData.city")}
                  placeholder="Houston"
                />
                {form.formState.errors.locationData?.city && (
                  <p className="text-sm text-red-600">{form.formState.errors.locationData.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  {...form.register("locationData.zipCode")}
                  placeholder="77001"
                />
                {form.formState.errors.locationData?.zipCode && (
                  <p className="text-sm text-red-600">{form.formState.errors.locationData.zipCode.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                {...form.register("locationData.address")}
                placeholder="123 Main St"
              />
              {form.formState.errors.locationData?.address && (
                <p className="text-sm text-red-600">{form.formState.errors.locationData.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessInstructions">Access Instructions</Label>
              <Textarea
                id="accessInstructions"
                {...form.register("locationData.accessInstructions")}
                placeholder="Parking instructions, building access codes, etc."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...form.register("timeRange.startDate")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...form.register("timeRange.startTime")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...form.register("timeRange.endDate")}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...form.register("timeRange.endTime")}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isOvernight"
                checked={form.watch("timeRange.isOvernight")}
                onCheckedChange={(checked) => form.setValue("timeRange.isOvernight", !!checked)}
              />
              <Label htmlFor="isOvernight">This is an overnight shift</Label>
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  {...form.register("clientInfo.name")}
                  placeholder="ABC Corporation"
                />
                {form.formState.errors.clientInfo?.name && (
                  <p className="text-sm text-red-600">{form.formState.errors.clientInfo.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person *</Label>
                <Input
                  id="contactPerson"
                  {...form.register("clientInfo.contactPerson")}
                  placeholder="John Smith"
                />
                {form.formState.errors.clientInfo?.contactPerson && (
                  <p className="text-sm text-red-600">{form.formState.errors.clientInfo.contactPerson.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone *</Label>
                <Input
                  id="contactPhone"
                  {...form.register("clientInfo.contactPhone")}
                  placeholder="(555) 123-4567"
                />
                {form.formState.errors.clientInfo?.contactPhone && (
                  <p className="text-sm text-red-600">{form.formState.errors.clientInfo.contactPhone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  {...form.register("clientInfo.contactEmail")}
                  placeholder="contact@company.com"
                />
                {form.formState.errors.clientInfo?.contactEmail && (
                  <p className="text-sm text-red-600">{form.formState.errors.clientInfo.contactEmail.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialInstructions">Special Instructions</Label>
              <Textarea
                id="specialInstructions"
                {...form.register("clientInfo.specialInstructions")}
                placeholder="Any special requirements or instructions..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Guard Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minExperience">Minimum Experience (months)</Label>
                <Input
                  id="minExperience"
                  type="number"
                  min="0"
                  {...form.register("guardRequirements.minExperienceMonths", { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredExperience">Preferred Experience (months)</Label>
                <Input
                  id="preferredExperience"
                  type="number"
                  min="0"
                  {...form.register("guardRequirements.preferredExperienceMonths", { valueAsNumber: true })}
                  placeholder="12"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Required Certifications</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableCertifications.map((cert) => (
                  <div key={cert} className="flex items-center space-x-2">
                    <Checkbox
                      id={cert}
                      checked={form.watch("requiredCertifications")?.includes(cert)}
                      onCheckedChange={(checked) => {
                        const current = form.watch("requiredCertifications") || []
                        if (checked) {
                          form.setValue("requiredCertifications", [...current, cert])
                        } else {
                          form.setValue("requiredCertifications", current.filter(c => c !== cert))
                        }
                      }}
                    />
                    <Label htmlFor={cert} className="text-sm">{cert}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Physical Requirements</Label>
              <div className="grid grid-cols-1 gap-2">
                {physicalRequirements.map((req) => (
                  <div key={req} className="flex items-center space-x-2">
                    <Checkbox
                      id={req}
                      checked={form.watch("guardRequirements.physicalRequirements")?.includes(req)}
                      onCheckedChange={(checked) => {
                        const current = form.watch("guardRequirements.physicalRequirements") || []
                        if (checked) {
                          form.setValue("guardRequirements.physicalRequirements", [...current, req])
                        } else {
                          form.setValue("guardRequirements.physicalRequirements", current.filter(r => r !== req))
                        }
                      }}
                    />
                    <Label htmlFor={req} className="text-sm">{req}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rate Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Rate Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseHourlyRate">Base Hourly Rate *</Label>
                <Input
                  id="baseHourlyRate"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("rateInformation.baseHourlyRate", { valueAsNumber: true })}
                  placeholder="25.00"
                />
                {form.formState.errors.rateInformation?.baseHourlyRate && (
                  <p className="text-sm text-red-600">{form.formState.errors.rateInformation.baseHourlyRate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingRate">Client Billing Rate *</Label>
                <Input
                  id="billingRate"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("rateInformation.billingRate", { valueAsNumber: true })}
                  placeholder="35.00"
                />
                {form.formState.errors.rateInformation?.billingRate && (
                  <p className="text-sm text-red-600">{form.formState.errors.rateInformation.billingRate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="overtimeRate">Overtime Rate (multiplier)</Label>
                <Input
                  id="overtimeRate"
                  type="number"
                  min="1"
                  step="0.1"
                  {...form.register("rateInformation.overtimeRate", { valueAsNumber: true })}
                  placeholder="1.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekendRate">Weekend Rate (multiplier)</Label>
                <Input
                  id="weekendRate"
                  type="number"
                  min="1"
                  step="0.1"
                  {...form.register("rateInformation.weekendRate", { valueAsNumber: true })}
                  placeholder="1.2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guard Assignment */}
        {eligibleGuards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Guard Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="assignedGuard">Assign Guard</Label>
                <Select 
                  value={form.watch("assignedGuardId") || ""} 
                  onValueChange={(value) => form.setValue("assignedGuardId", value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a guard (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No assignment</SelectItem>
                    {eligibleGuards.map((guard) => (
                      <SelectItem key={guard.id} value={guard.id}>
                        {guard.firstName} {guard.lastName} - {guard.experienceLevel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Shift"}
          </Button>
        </div>
      </form>
    </div>
  )
}