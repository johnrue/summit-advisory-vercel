"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Calendar, Clock, MapPin, User, X } from "lucide-react"
import { toast } from "sonner"
import { Shift, ChangeReason } from "@/lib/types/shift-types"

const cancellationSchema = z.object({
  reason: z.enum([
    "client_request",
    "operational", 
    "emergency",
    "guard_request",
    "correction"
  ] as const, {
    required_error: "Please select a cancellation reason"
  }),
  description: z.string().min(10, "Please provide at least 10 characters of explanation"),
  notifyGuard: z.boolean().default(true),
  notifyClient: z.boolean().default(true),
  refundAmount: z.number().min(0).optional(),
  newShiftNeeded: z.boolean().default(false)
})

type CancellationFormData = z.infer<typeof cancellationSchema>

interface ShiftCancellationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift: Shift | null
  onShiftCancelled: (cancelledShift: Shift) => void
}

const CANCELLATION_REASONS = [
  { value: "client_request", label: "Client Request", description: "Client requested cancellation" },
  { value: "operational", label: "Operational", description: "Business operational needs" },
  { value: "emergency", label: "Emergency", description: "Emergency situation" },
  { value: "guard_request", label: "Guard Request", description: "Guard requested cancellation" },
  { value: "correction", label: "Correction", description: "Error correction" }
] as const

export function ShiftCancellationDialog({ 
  open, 
  onOpenChange, 
  shift, 
  onShiftCancelled 
}: ShiftCancellationDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<CancellationFormData>({
    resolver: zodResolver(cancellationSchema),
    defaultValues: {
      reason: undefined,
      description: "",
      notifyGuard: true,
      notifyClient: true,
      refundAmount: 0,
      newShiftNeeded: false
    }
  })

  const handleSubmit = async (data: CancellationFormData) => {
    if (!shift) return

    setIsLoading(true)
    try {
      // Build cancellation reason string
      const reasonDescription = `${data.reason}: ${data.description}`
      
      // Call the DELETE endpoint with the reason
      const response = await fetch(`/api/v1/shifts/${shift.id}?reason=${encodeURIComponent(reasonDescription)}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || "Failed to cancel shift")
      }

      const result = await response.json()
      if (result.success && result.data) {
        onShiftCancelled(result.data)
        onOpenChange(false)
        form.reset()
        
        // Show success message with additional actions needed
        let successMessage = "Shift cancelled successfully"
        if (data.notifyGuard || data.notifyClient) {
          successMessage += ". Notifications will be sent shortly."
        }
        if (data.newShiftNeeded) {
          successMessage += " Consider creating a replacement shift."
        }
        
        toast.success(successMessage)
      } else {
        throw new Error(result.error?.message || "Failed to cancel shift")
      }
    } catch (error) {
      console.error("Error cancelling shift:", error)
      toast.error(error instanceof Error ? error.message : "Failed to cancel shift")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    form.reset()
    onOpenChange(false)
  }

  if (!shift) return null

  const startTime = new Date(shift.timeRange.startTime)
  const endTime = new Date(shift.timeRange.endTime)
  const isUpcoming = startTime > new Date()
  const estimatedCost = shift.estimatedHours * shift.rateInformation.baseRate

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Cancel Shift
          </DialogTitle>
          <DialogDescription>
            This action will permanently cancel the shift and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* Shift Summary */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-lg">{shift.title}</h4>
              <p className="text-muted-foreground">{shift.locationData.siteName}</p>
            </div>
            <Badge variant={shift.status === "assigned" ? "default" : "secondary"}>
              {shift.status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{startTime.toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{startTime.toLocaleTimeString()} - {endTime.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{shift.locationData.address}</span>
            </div>
            {shift.assignedGuardId && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Guard #{shift.assignedGuardId.slice(-6)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm text-muted-foreground">Estimated Value</span>
            <span className="font-semibold">${estimatedCost.toFixed(2)}</span>
          </div>
        </div>

        {/* Warning for upcoming shifts */}
        {isUpcoming && shift.assignedGuardId && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This shift is scheduled to start in {Math.ceil((startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60))} hours
              and has an assigned guard. Cancellation will trigger immediate notifications.
            </AlertDescription>
          </Alert>
        )}

        {/* Cancellation Form */}
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Cancellation Reason *</Label>
            <Select 
              value={form.watch("reason") || ""} 
              onValueChange={(value: ChangeReason) => form.setValue("reason", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason for cancellation" />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    <div>
                      <p className="font-medium">{reason.label}</p>
                      <p className="text-xs text-muted-foreground">{reason.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.reason && (
              <p className="text-sm text-red-600">{form.formState.errors.reason.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Explanation *</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Provide specific details about why this shift is being cancelled..."
              rows={3}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Notification Options */}
          <div className="space-y-3">
            <Label className="text-base">Notification Settings</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="notifyGuard"
                  {...form.register("notifyGuard")}
                  disabled={!shift.assignedGuardId}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="notifyGuard" className="text-sm">
                  {shift.assignedGuardId ? "Notify assigned guard" : "No guard assigned to notify"}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="notifyClient"
                  {...form.register("notifyClient")}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="notifyClient" className="text-sm">
                  Notify client ({shift.clientInfo.clientName})
                </Label>
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            <Label className="text-base">Additional Actions</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="newShiftNeeded"
                  {...form.register("newShiftNeeded")}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="newShiftNeeded" className="text-sm">
                  Create replacement shift immediately after cancellation
                </Label>
              </div>
              
              {isUpcoming && (
                <div className="space-y-2">
                  <Label htmlFor="refundAmount" className="text-sm">Refund Amount (if applicable)</Label>
                  <Input
                    id="refundAmount"
                    type="number"
                    min="0"
                    max={estimatedCost}
                    step="0.01"
                    {...form.register("refundAmount", { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Keep Shift
            </Button>
            <Button 
              type="submit" 
              variant="destructive" 
              disabled={isLoading}
              className="min-w-24"
            >
              {isLoading ? "Cancelling..." : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel Shift
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}