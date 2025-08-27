"use client"

// Availability Step - Guard Application Form
// Collects schedule availability and background information

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { Calendar, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ApplicationData } from '@/lib/types/guard-applications'

interface AvailabilityStepProps {
  applicationToken: string
  enableAIAssist?: boolean
}

export function AvailabilityStep({ applicationToken, enableAIAssist }: AvailabilityStepProps) {
  const form = useFormContext<ApplicationData>()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Availability
          </CardTitle>
          <CardDescription>
            Tell us about your availability and any schedule restrictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Availability step coming soon...</p>
            <p className="text-sm">This section will collect your schedule preferences and availability.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Background Information
          </CardTitle>
          <CardDescription>
            Background check and additional information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Background information step coming soon...</p>
            <p className="text-sm">This section will collect background and criminal history information.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}