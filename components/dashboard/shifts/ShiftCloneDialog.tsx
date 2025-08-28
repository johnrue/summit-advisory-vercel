"use client"

import React, { useState } from 'react'
import { Copy, Calendar, MapPin, User, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Shift, ShiftCreateData, LocationData, TimeRange, ClientInfo, RateInformation } from '@/lib/types/shift-types'
import { ShiftManagementService } from '@/lib/services/shift-service'
import { toast } from 'sonner'

const CloneModificationsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  siteName: z.string().min(1, "Site name is required"),
  address: z.string().min(1, "Address is required"),
  clientId: z.string().min(1, "Client selection is required"),
  baseRate: z.number().min(0.01, "Base rate must be greater than 0"),
  priority: z.number().min(1).max(5)
})

type CloneModificationsFormData = z.infer<typeof CloneModificationsSchema>

interface ShiftCloneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceShift: Shift | null
  onShiftCloned: (clonedShift: Shift) => void
}

// Mock client data - in real implementation, this would come from API
const CLIENT_OPTIONS = [
  { id: 'client-1', name: 'Houston Medical Center', billingRate: 35.00 },
  { id: 'client-2', name: 'Dallas Corporate Plaza', billingRate: 32.50 },
  { id: 'client-3', name: 'Austin Tech Campus', billingRate: 40.00 },
  { id: 'client-4', name: 'San Antonio Mall Security', billingRate: 28.00 }
]

const PRIORITY_OPTIONS = [
  { value: 1, label: '1 - Urgent', color: 'destructive' },
  { value: 2, label: '2 - High', color: 'orange' },
  { value: 3, label: '3 - Normal', color: 'blue' },
  { value: 4, label: '4 - Low', color: 'gray' },
  { value: 5, label: '5 - Routine', color: 'green' }
] as const

export function ShiftCloneDialog({ open, onOpenChange, sourceShift, onShiftCloned }: ShiftCloneDialogProps) {
  const [isCloning, setIsCloning] = useState(false)
  const [selectedClient, setSelectedClient] = useState<typeof CLIENT_OPTIONS[0] | null>(null)

  const service = new ShiftManagementService()

  const form = useForm<CloneModificationsFormData>({
    resolver: zodResolver(CloneModificationsSchema),
    defaultValues: {
      title: sourceShift ? `${sourceShift.title} (Copy)` : '',
      description: sourceShift?.description || '',
      startTime: '',
      endTime: '',
      siteName: sourceShift?.locationData.siteName || '',
      address: sourceShift?.locationData.address || '',
      clientId: sourceShift?.clientInfo.clientId || '',
      baseRate: sourceShift?.rateInformation.baseRate || 25,
      priority: sourceShift?.priority || 3
    }
  })

  // Update form when sourceShift changes
  React.useEffect(() => {
    if (sourceShift) {
      form.reset({
        title: `${sourceShift.title} (Copy)`,
        description: sourceShift.description || '',
        startTime: '',
        endTime: '',
        siteName: sourceShift.locationData.siteName,
        address: sourceShift.locationData.address,
        clientId: sourceShift.clientInfo.clientId,
        baseRate: sourceShift.rateInformation.baseRate,
        priority: sourceShift.priority
      })

      // Find and set the selected client
      const client = CLIENT_OPTIONS.find(c => c.id === sourceShift.clientInfo.clientId)
      if (client) {
        setSelectedClient(client)
      }
    }
  }, [sourceShift, form])

  const handleClientSelect = (clientId: string) => {
    const client = CLIENT_OPTIONS.find(c => c.id === clientId)
    if (client) {
      setSelectedClient(client)
      form.setValue('clientId', client.id)
      form.setValue('baseRate', client.billingRate)
    }
  }

  const handleClone = async (formData: CloneModificationsFormData) => {
    if (!sourceShift) return

    try {
      setIsCloning(true)

      // Prepare modifications based on form data
      const modifications: Partial<ShiftCreateData> = {
        title: formData.title,
        description: formData.description,
        locationData: {
          ...sourceShift.locationData,
          siteName: formData.siteName,
          address: formData.address
        },
        timeRange: {
          startTime: formData.startTime,
          endTime: formData.endTime
        },
        clientInfo: {
          ...sourceShift.clientInfo,
          clientId: formData.clientId,
          clientName: selectedClient?.name || sourceShift.clientInfo.clientName,
          billingRate: selectedClient?.billingRate || sourceShift.clientInfo.billingRate
        },
        rateInformation: {
          ...sourceShift.rateInformation,
          baseRate: formData.baseRate
        },
        priority: formData.priority as 1 | 2 | 3 | 4 | 5
      }

      const result = await service.cloneShift(sourceShift.id, modifications)

      if (result.success && result.data) {
        toast.success('Shift cloned successfully!')
        onShiftCloned(result.data)
        onOpenChange(false)
        form.reset()
      } else {
        toast.error(result.error?.message || 'Failed to clone shift')
      }
    } catch (error) {
      console.error('Error cloning shift:', error)
      toast.error('Unexpected error occurred while cloning shift')
    } finally {
      setIsCloning(false)
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

  if (!sourceShift) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Clone Shift
          </DialogTitle>
          <DialogDescription>
            Create a copy of "{sourceShift.title}" with optional modifications
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source Shift Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Source Shift</h3>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{sourceShift.title}</CardTitle>
                    <CardDescription>{sourceShift.locationData.siteName}</CardDescription>
                  </div>
                  <Badge variant={getPriorityBadgeVariant(sourceShift.priority)}>
                    Priority {sourceShift.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{new Date(sourceShift.timeRange.startTime).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{sourceShift.locationData.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{sourceShift.clientInfo.clientName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span>${sourceShift.rateInformation.baseRate}/hour</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Clone Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Modifications</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleClone)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter shift title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Shift description" rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time *</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time *</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="siteName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Site name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="Site address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client *</FormLabel>
                      <Select onValueChange={handleClientSelect} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CLIENT_OPTIONS.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              <div className="flex flex-col">
                                <span>{client.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  ${client.billingRate.toFixed(2)}/hour
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="baseRate"
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
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority *</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                <Badge variant={getPriorityBadgeVariant(option.value)} className="text-xs">
                                  {option.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isCloning}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={form.handleSubmit(handleClone)}
            disabled={isCloning}
          >
            {isCloning ? 'Cloning...' : 'Clone Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}