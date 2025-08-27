"use client"

// Documents Step - Guard Application Form
// Handles document uploads including resume and supporting documents

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { Upload } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DocumentUploadComponent } from '../DocumentUploadComponent'
import type { ApplicationData } from '@/lib/types/guard-applications'

interface DocumentsStepProps {
  applicationToken: string
  enableAIAssist?: boolean
}

export function DocumentsStep({ applicationToken, enableAIAssist }: DocumentsStepProps) {
  const form = useFormContext<ApplicationData>()

  const handleUploadComplete = (fileInfo: any) => {
    console.log('Document uploaded:', fileInfo)
    // TODO: Update form data with document reference
  }

  const handleUploadError = (error: string) => {
    console.error('Document upload error:', error)
    // TODO: Show error to user
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Required Documents
          </CardTitle>
          <CardDescription>
            Upload your resume and any supporting documents
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Resume Upload */}
      <div>
        <h3 className="text-lg font-medium mb-4">Resume Upload</h3>
        <DocumentUploadComponent
          acceptedTypes={['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
          maxFileSize={10 * 1024 * 1024} // 10MB
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          enableResumeAI={enableAIAssist}
        />
      </div>

      {/* Additional Documents */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Document Requirements:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Resume:</strong> Current resume (PDF or DOCX format)</li>
              <li><strong>Certifications:</strong> Copies of relevant security certifications (if applicable)</li>
              <li><strong>Identification:</strong> Government-issued photo ID (for verification)</li>
              <li><strong>Background Check:</strong> May be required after initial screening</li>
            </ul>
            <p className="mt-3">
              All documents are securely stored and will only be used for employment verification purposes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}