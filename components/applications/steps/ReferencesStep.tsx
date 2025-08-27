"use client"

// References Step - Guard Application Form
// Collects professional and personal references

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ApplicationData } from '@/lib/types/guard-applications'

interface ReferencesStepProps {
  applicationToken: string
  enableAIAssist?: boolean
}

export function ReferencesStep({ applicationToken, enableAIAssist }: ReferencesStepProps) {
  const form = useFormContext<ApplicationData>()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Professional References
          </CardTitle>
          <CardDescription>
            Provide at least 2-3 professional references who can speak to your character and work ethic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>References step coming soon...</p>
            <p className="text-sm">This section will allow you to add professional references.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}