"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, Save, X } from 'lucide-react'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { BackgroundCheckStatus, BackgroundCheckUpdate } from '@/lib/types/background-check'

interface BackgroundCheckStatusFormProps {
  applicationId: string
  currentStatus: BackgroundCheckStatus
  onStatusUpdate: (update: BackgroundCheckUpdate) => Promise<void>
  onCancel: () => void
  requireApproval?: boolean
  className?: string
}

const backgroundCheckUpdateSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'complete', 'failed', 'expired', 'cancelled']),
  vendorConfirmationNumber: z.string().optional(),
  expiryDate: z.date().optional(),
  notes: z.string().min(1, "Notes are required for status updates"),
  approverSignature: z.string().min(1, "Digital signature is required")
})

type FormData = z.infer<typeof backgroundCheckUpdateSchema>

const statusOptions = [
  { value: 'pending' as const, label: 'Pending' },
  { value: 'in_progress' as const, label: 'In Progress' },
  { value: 'complete' as const, label: 'Complete' },
  { value: 'failed' as const, label: 'Failed' },
  { value: 'expired' as const, label: 'Expired' },
  { value: 'cancelled' as const, label: 'Cancelled' }
]

export function BackgroundCheckStatusForm({
  applicationId,
  currentStatus,
  onStatusUpdate,
  onCancel,
  requireApproval = true,
  className
}: BackgroundCheckStatusFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(backgroundCheckUpdateSchema),
    defaultValues: {
      status: currentStatus,
      notes: '',
      approverSignature: ''
    }
  })

  const watchedStatus = form.watch('status')

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const update: BackgroundCheckUpdate = {
        status: data.status,
        vendorConfirmationNumber: data.vendorConfirmationNumber,
        expiryDate: data.expiryDate,
        notes: data.notes,
        approverSignature: data.approverSignature
      }

      await onStatusUpdate(update)
    } catch (error) {
      console.error('Failed to update background check status:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const requiresConfirmationNumber = watchedStatus === 'complete' || watchedStatus === 'failed'
  const requiresExpiryDate = watchedStatus === 'complete'

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Update Background Check Status</h4>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        disabled={option.value === currentStatus}
                      >
                        {option.label}
                        {option.value === currentStatus && " (Current)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {requiresConfirmationNumber && (
            <FormField
              control={form.control}
              name="vendorConfirmationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Confirmation Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter confirmation number from background check vendor"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {requiresExpiryDate && (
            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Background Check Expiry Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick expiry date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Update Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter detailed notes about this status change..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {requireApproval && (
            <FormField
              control={form.control}
              name="approverSignature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Digital Signature (Full Name)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Type your full name to digitally sign this update"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Updating...' : 'Update Status'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}