"use client"

// Story 2.6: Interview Date Time Picker Component
// Simple date/time selection with basic availability checking

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InterviewService } from '@/lib/services/interview-service'
import type { 
  InterviewDateTimePickerProps, 
  TimeSlot, 
  AvailabilityRequest 
} from '@/lib/types/interview-types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const interviewService = new InterviewService()

// Generate time slots for a day (9 AM - 5 PM)
const generateTimeSlots = (date: Date): Date[] => {
  const slots: Date[] = []
  
  for (let hour = 9; hour < 17; hour++) {
    const slotTime = new Date(date)
    slotTime.setHours(hour, 0, 0, 0)
    slots.push(slotTime)
    
    // Add 30-minute slot
    const halfHourSlot = new Date(date)
    halfHourSlot.setHours(hour, 30, 0, 0)
    slots.push(halfHourSlot)
  }
  
  return slots
}

export function InterviewDateTimePicker({
  interviewerId,
  interviewDuration,
  onDateTimeSelected,
  minDate = new Date(),
  maxDate,
  className
}: InterviewDateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<Date | null>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Check availability when date changes
  useEffect(() => {
    if (selectedDate) {
      checkDayAvailability(selectedDate)
    }
  }, [selectedDate, interviewerId, interviewDuration])

  const checkDayAvailability = useCallback(async (date: Date) => {
    setIsCheckingAvailability(true)
    setError(null)

    try {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const request: AvailabilityRequest = {
        interviewerId,
        startDate: startOfDay,
        endDate: endOfDay,
        durationMinutes: interviewDuration
      }

      const result = await interviewService.checkAvailability(request)

      if (result.success) {
        setAvailableSlots(result.data)
      } else {
        setError(result.error)
        setAvailableSlots([])
      }
    } catch (err) {
      setError('Failed to check availability')
      setAvailableSlots([])
      console.error('Availability check error:', err)
    } finally {
      setIsCheckingAvailability(false)
    }
  }, [interviewerId, interviewDuration])

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    setSelectedTime(null)
    setIsCalendarOpen(false)
  }

  const handleTimeSelect = (timeSlot: Date) => {
    setSelectedTime(timeSlot)
    onDateTimeSelected(timeSlot)
  }

  const formatSelectedDateTime = () => {
    if (!selectedTime) return 'Select date and time'
    return format(selectedTime, 'PPP \'at\' p')
  }

  // Filter available time slots
  const availableTimeSlots = availableSlots.filter(slot => slot.available)
  const unavailableTimeSlots = availableSlots.filter(slot => !slot.available)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Date Selection */}
      <div>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'PPP') : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => 
                date < minDate || 
                (maxDate && date > maxDate) ||
                date.getDay() === 0 || // Sunday
                date.getDay() === 6    // Saturday
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Available Times</span>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isCheckingAvailability ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Checking availability...</span>
            </div>
          ) : (
            <ScrollArea className="h-64 w-full rounded-md border p-3">
              {availableTimeSlots.length > 0 ? (
                <div className="space-y-2">
                  {availableTimeSlots.map((slot, index) => (
                    <Button
                      key={index}
                      variant={selectedTime?.getTime() === slot.start.getTime() ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => handleTimeSelect(slot.start)}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>{format(slot.start, 'h:mm a')}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {interviewDuration} min
                      </span>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No available time slots</p>
                  <p className="text-xs">Please select a different date</p>
                </div>
              )}

              {/* Show unavailable slots for reference */}
              {unavailableTimeSlots.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Unavailable Times</p>
                  <div className="space-y-1">
                    {unavailableTimeSlots.map((slot, index) => (
                      <div
                        key={index}
                        className="flex items-center text-xs text-muted-foreground"
                      >
                        <AlertCircle className="mr-2 h-3 w-3" />
                        <span>{format(slot.start, 'h:mm a')}</span>
                        <span className="ml-auto">{slot.conflictReason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      )}

      {/* Selected DateTime Display */}
      {selectedTime && (
        <div className="rounded-lg border bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Interview Scheduled</p>
              <p className="text-sm text-green-600">{formatSelectedDateTime()}</p>
              <p className="text-xs text-green-600">Duration: {interviewDuration} minutes</p>
            </div>
          </div>
        </div>
      )}

      {/* Business Hours Notice */}
      <div className="text-xs text-muted-foreground">
        <p>• Available times: Monday - Friday, 9:00 AM - 5:00 PM</p>
        <p>• Time slots are shown in your local timezone</p>
        <p>• Duration includes buffer time for setup and notes</p>
      </div>
    </div>
  )
}