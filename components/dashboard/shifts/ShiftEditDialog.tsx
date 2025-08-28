"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { ShiftEditFormSimple } from "./ShiftEditFormSimple"
import { Shift, ShiftUpdateData, GuardProfile } from "@/lib/types/shift-types"

interface ShiftEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift: Shift | null
  onShiftUpdated: (updatedShift: Shift) => void
}

export function ShiftEditDialog({ open, onOpenChange, shift, onShiftUpdated }: ShiftEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (updateData: ShiftUpdateData) => {
    if (!shift) return

    setIsLoading(true)
    try {
      // Add required audit fields for the API
      const auditedUpdateData = {
        ...updateData,
        changeReason: "operational" as const, // Default reason for manager edits
        changeDescription: "Manager updated shift details",
        managerSignature: `Manager-${Date.now()}`
      }

      const response = await fetch(`/api/v1/shifts/${shift.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(auditedUpdateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || "Failed to update shift")
      }

      const result = await response.json()
      if (result.success && result.data) {
        onShiftUpdated(result.data)
        onOpenChange(false)
        toast.success("Shift updated successfully")
      } else {
        throw new Error(result.error?.message || "Failed to update shift")
      }
    } catch (error) {
      console.error("Error updating shift:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update shift")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  if (!shift) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Shift: {shift.title}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[80vh]">
          <div className="pr-6">
            <ShiftEditFormSimple
              shift={shift}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}