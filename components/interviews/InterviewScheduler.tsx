"use client"

// Story 2.6: Interview Scheduler Component
// Main interview scheduling interface with date/time selection and ICS calendar integration

import { useState, useCallback } from 'react'
import { CalendarDays, Clock, MapPin, Video, Phone, Users, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InterviewDateTimePicker } from './InterviewDateTimePicker'
import { InterviewService } from '@/lib/services/interview-service'
import type { 
  InterviewSchedulerProps, 
  InterviewType, 
  InterviewMode,
  ScheduleInterviewRequest 
} from '@/lib/types/interview-types'
import { cn } from '@/lib/utils'

const interviewService = new InterviewService()

const INTERVIEW_TYPES: { value: InterviewType; label: string; description: string }[] = [
  { value: 'initial', label: 'Initial Screening', description: 'First interview to assess basic qualifications' },
  { value: 'technical', label: 'Technical Assessment', description: 'Evaluate technical skills and experience' },
  { value: 'behavioral', label: 'Behavioral Interview', description: 'Assess cultural fit and soft skills' },
  { value: 'final', label: 'Final Interview', description: 'Final decision-making interview' },
  { value: 'follow_up', label: 'Follow-up Interview', description: 'Additional clarification or questions' }
]

const INTERVIEW_MODES: { value: InterviewMode; label: string; icon: any; description: string }[] = [
  { value: 'video', label: 'Video Call', icon: Video, description: 'Online video interview (recommended)' },
  { value: 'phone', label: 'Phone Call', icon: Phone, description: 'Phone interview for initial screening' },
  { value: 'in_person', label: 'In Person', icon: Users, description: 'Face-to-face at office location' },
  { value: 'hybrid', label: 'Hybrid', icon: MapPin, description: 'Combination of video and in-person' }
]

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' }
]

export function InterviewScheduler({
  applicationId,
  applicantInfo,
  onInterviewScheduled,
  defaultInterviewType = 'initial',
  className
}: InterviewSchedulerProps) {
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null)
  const [interviewType, setInterviewType] = useState<InterviewType>(defaultInterviewType)
  const [interviewMode, setInterviewMode] = useState<InterviewMode>('video')
  const [duration, setDuration] = useState(60)
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleScheduleInterview = useCallback(async () => {
    if (!selectedDateTime) {
      setError('Please select a date and time for the interview')
      return
    }

    setIsScheduling(true)
    setError(null)

    try {
      const request: ScheduleInterviewRequest = {
        applicationId,
        interviewType,
        scheduledAt: selectedDateTime,
        durationMinutes: duration,
        interviewMode,
        interviewLocation: location || undefined,
        interviewerId: 'current-user-id', // This should come from auth context
        meetingNotes: notes || undefined
      }

      const result = await interviewService.scheduleInterview(request)

      if (result.success) {
        setSuccess(true)
        onInterviewScheduled?.(result.data)
        
        // Reset form
        setSelectedDateTime(null)
        setLocation('')
        setNotes('')
        
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to schedule interview. Please try again.')
      console.error('Interview scheduling error:', err)
    } finally {
      setIsScheduling(false)
    }
  }, [
    selectedDateTime,
    interviewType,
    interviewMode,
    duration,
    location,
    notes,
    applicationId,
    onInterviewScheduled
  ])

  const selectedMode = INTERVIEW_MODES.find(mode => mode.value === interviewMode)
  const ModeIcon = selectedMode?.icon || Video

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Schedule Interview
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Schedule an interview with {applicantInfo.firstName} {applicantInfo.lastName}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Success Message */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Interview successfully scheduled! Calendar invite will be sent automatically.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Interview Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="interview-type">Interview Type</Label>
          <Select value={interviewType} onValueChange={(value) => setInterviewType(value as InterviewType)}>
            <SelectTrigger id="interview-type">
              <SelectValue placeholder="Select interview type" />
            </SelectTrigger>
            <SelectContent>
              {INTERVIEW_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="space-y-1">
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date and Time Selection */}
        <div className="space-y-2">
          <Label>Date & Time</Label>
          <InterviewDateTimePicker
            interviewerId="current-user-id" // This should come from auth context
            interviewDuration={duration}
            onDateTimeSelected={setSelectedDateTime}
            className="w-full"
          />
          {selectedDateTime && (
            <p className="text-sm text-green-600">
              Selected: {selectedDateTime.toLocaleDateString()} at {selectedDateTime.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Duration Selection */}
        <div className="space-y-2">
          <Label htmlFor="duration">Duration</Label>
          <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
            <SelectTrigger id="duration">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Interview Mode Selection */}
        <div className="space-y-2">
          <Label htmlFor="interview-mode">Interview Mode</Label>
          <Select value={interviewMode} onValueChange={(value) => setInterviewMode(value as InterviewMode)}>
            <SelectTrigger id="interview-mode">
              <SelectValue placeholder="Select interview mode" />
            </SelectTrigger>
            <SelectContent>
              {INTERVIEW_MODES.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  <div className="flex items-center gap-2">
                    <mode.icon className="h-4 w-4" />
                    <div className="space-y-1">
                      <div className="font-medium">{mode.label}</div>
                      <div className="text-xs text-muted-foreground">{mode.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location/Link */}
        <div className="space-y-2">
          <Label htmlFor="location">
            {interviewMode === 'in_person' ? 'Location' : 
             interviewMode === 'phone' ? 'Phone Number' : 
             'Video Call Link'}
          </Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={
              interviewMode === 'in_person' ? 'Enter office address or meeting location' :
              interviewMode === 'phone' ? 'Enter phone number for the call' :
              'Video call link (will be generated automatically if left blank)'
            }
          />
        </div>

        {/* Meeting Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Meeting Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any special instructions, topics to cover, or preparation notes..."
            rows={3}
          />
        </div>

        {/* Applicant Information Summary */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="font-medium mb-2">Applicant Details</h4>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Name:</span> {applicantInfo.firstName} {applicantInfo.lastName}</p>
            <p><span className="font-medium">Email:</span> {applicantInfo.email}</p>
            <p><span className="font-medium">Phone:</span> {applicantInfo.phone}</p>
          </div>
        </div>

        {/* Schedule Button */}
        <Button 
          onClick={handleScheduleInterview}
          disabled={!selectedDateTime || isScheduling}
          className="w-full"
          size="lg"
        >
          {isScheduling ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Scheduling Interview...
            </>
          ) : (
            <>
              <ModeIcon className="h-4 w-4 mr-2" />
              Schedule {selectedMode?.label} Interview
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}