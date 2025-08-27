"use client"

// Education Step - Guard Application Form
// Collects educational background and qualifications

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { GraduationCap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ApplicationData } from '@/lib/types/guard-applications'

interface EducationStepProps {
  applicationToken: string
  enableAIAssist?: boolean
}

export function EducationStep({ applicationToken, enableAIAssist }: EducationStepProps) {
  const form = useFormContext<ApplicationData>()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Education Background
          </CardTitle>
          <CardDescription>
            Add your educational background, degrees, and relevant coursework
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Education step coming soon...</p>
            <p className="text-sm">This section will allow you to add your educational background.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}