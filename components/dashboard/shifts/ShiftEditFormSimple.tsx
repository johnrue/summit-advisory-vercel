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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, DollarSign, Users } from "lucide-react"
import { toast } from "sonner"
import { Shift, ShiftUpdateData, ShiftStatus } from "@/lib/types/shift-types"

const shiftEditSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.number().min(1).max(5),
  specialRequirements: z.string().optional(),
  // Time fields as separate date/time inputs for easier editing
  startDate: z.string(),
  startTime: z.string(),
  endDate: z.string(),
  endTime: z.string(),
  // Rate information
  baseRate: z.number().min(0, "Rate must be positive"),
  billingRate: z.number().min(0, "Billing rate must be positive"),
  overtimeMultiplier: z.number().min(1).default(1.5)
})

type ShiftEditFormData = z.infer<typeof shiftEditSchema>

interface ShiftEditFormSimpleProps {
  shift: Shift
  onSubmit: (updateData: ShiftUpdateData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function ShiftEditFormSimple({ shift, onSubmit, onCancel, isLoading }: ShiftEditFormSimpleProps) {
  const [estimatedCost, setEstimatedCost] = useState<number>(0)

  // Parse current shift data for form defaults
  const startDateTime = new Date(shift.timeRange.startTime)
  const endDateTime = new Date(shift.timeRange.endTime)

  const form = useForm<ShiftEditFormData>({
    resolver: zodResolver(shiftEditSchema),
    defaultValues: {
      title: shift.title,
      description: shift.description || "",
      priority: shift.priority,
      specialRequirements: shift.specialRequirements || "",
      startDate: startDateTime.toISOString().split('T')[0],
      startTime: startDateTime.toTimeString().slice(0, 5),
      endDate: endDateTime.toISOString().split('T')[0], 
      endTime: endDateTime.toTimeString().slice(0, 5),
      baseRate: shift.rateInformation.baseRate,
      billingRate: shift.clientInfo.billingRate,
      overtimeMultiplier: shift.rateInformation.overtimeMultiplier
    }
  })

  const watchedValues = form.watch()

  // Calculate estimated cost
  useEffect(() => {
    const { startDate, startTime, endDate, endTime, baseRate } = watchedValues
    if (startDate && startTime && endDate && endTime && baseRate) {
      const startDateTime = new Date(`${startDate}T${startTime}`)
      const endDateTime = new Date(`${endDate}T${endTime}`)
      const hours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60)
      
      if (hours > 0) {
        setEstimatedCost(hours * baseRate)
      }
    }
  }, [watchedValues.startDate, watchedValues.startTime, watchedValues.endDate, watchedValues.endTime, watchedValues.baseRate])

  const handleFormSubmit = async (data: ShiftEditFormData) => {
    try {
      // Build update data with only the fields we're editing
      const updateData: ShiftUpdateData = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        specialRequirements: data.specialRequirements,
        timeRange: {
          startTime: new Date(`${data.startDate}T${data.startTime}`).toISOString(),
          endTime: new Date(`${data.endDate}T${data.endTime}`).toISOString()
        },
        rateInformation: {
          ...shift.rateInformation,
          baseRate: data.baseRate,
          overtimeMultiplier: data.overtimeMultiplier
        },
        clientInfo: {
          ...shift.clientInfo,
          billingRate: data.billingRate
        }
      }

      await onSubmit(updateData)
    } catch (error) {
      console.error("Error updating shift:", error)
      toast.error("Failed to update shift")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Edit Shift</h2>
          <p className="text-muted-foreground">Update shift details</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={shift.status === "assigned" ? "default" : "secondary"}>
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
              <Label htmlFor="specialRequirements">Special Requirements</Label>
              <Textarea
                id="specialRequirements"
                {...form.register("specialRequirements")}
                placeholder="Any special requirements or instructions..."
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
                  {...form.register("startDate")}
                />
                {form.formState.errors.startDate && (
                  <p className="text-sm text-red-600">{form.formState.errors.startDate.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...form.register("startTime")}
                />
                {form.formState.errors.startTime && (
                  <p className="text-sm text-red-600">{form.formState.errors.startTime.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...form.register("endDate")}
                />
                {form.formState.errors.endDate && (
                  <p className="text-sm text-red-600">{form.formState.errors.endDate.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...form.register("endTime")}
                />
                {form.formState.errors.endTime && (
                  <p className="text-sm text-red-600">{form.formState.errors.endTime.message}</p>
                )}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseRate">Guard Rate ($/hour) *</Label>
                <Input
                  id="baseRate"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("baseRate", { valueAsNumber: true })}
                  placeholder="25.00"
                />
                {form.formState.errors.baseRate && (
                  <p className="text-sm text-red-600">{form.formState.errors.baseRate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingRate">Client Rate ($/hour) *</Label>
                <Input
                  id="billingRate"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("billingRate", { valueAsNumber: true })}
                  placeholder="35.00"
                />
                {form.formState.errors.billingRate && (
                  <p className="text-sm text-red-600">{form.formState.errors.billingRate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="overtimeMultiplier">Overtime Multiplier</Label>
                <Input
                  id="overtimeMultiplier"
                  type="number"
                  min="1"
                  step="0.1"
                  {...form.register("overtimeMultiplier", { valueAsNumber: true })}
                  placeholder="1.5"
                />
                {form.formState.errors.overtimeMultiplier && (
                  <p className="text-sm text-red-600">{form.formState.errors.overtimeMultiplier.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Assignment Info (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Current Assignment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Location</Label>
                <p className="font-medium">{shift.locationData.siteName}</p>
                <p className="text-sm text-muted-foreground">{shift.locationData.address}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Client</Label>
                <p className="font-medium">{shift.clientInfo.clientName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Assigned Guard</Label>
                <p className="font-medium">
                  {shift.assignedGuardId ? `Guard #${shift.assignedGuardId.slice(-6)}` : "Not assigned"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Required Certifications</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {shift.requiredCertifications.length > 0 ? (
                    shift.requiredCertifications.map((cert) => (
                      <Badge key={cert} variant="outline" className="text-xs">
                        {cert}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">None specified</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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