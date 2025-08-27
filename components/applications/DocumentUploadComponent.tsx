"use client"

// Document Upload Component for Guard Applications
// Handles file uploads with drag-and-drop interface and validation

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, CheckCircle, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import type { DocumentUploadComponentProps, DocumentReference } from '@/lib/types/guard-applications'
import { DOCUMENT_CONFIG } from '@/lib/services/document-service'
import { cn } from '@/lib/utils'

interface UploadState {
  isUploading: boolean
  progress: number
  error?: string
  uploadedFile?: DocumentReference
}

export function DocumentUploadComponent({
  acceptedTypes = DOCUMENT_CONFIG.ALLOWED_TYPES,
  maxFileSize = DOCUMENT_CONFIG.MAX_FILE_SIZE,
  onUploadComplete,
  onUploadError,
  enableResumeAI = false,
  className
}: DocumentUploadComponentProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0
  })

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    
    // Validate file
    if (file.size > maxFileSize) {
      const error = `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxFileSize / 1024 / 1024).toFixed(0)}MB)`
      setUploadState(prev => ({ ...prev, error }))
      onUploadError?.(error)
      return
    }

    setUploadState({
      isUploading: true,
      progress: 0,
      error: undefined
    })

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }))
      }, 200)

      // TODO: Replace with actual applicationId from context/props
      const applicationId = 'temp-application-id'
      
      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('applicationId', applicationId)
      formData.append('documentType', 'resume') // TODO: Make this dynamic

      // Upload file
      const response = await fetch('/api/v1/applications/documents/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      // Complete upload
      setUploadState({
        isUploading: false,
        progress: 100,
        uploadedFile: result.data
      })

      onUploadComplete?.(result.data)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadState({
        isUploading: false,
        progress: 0,
        error: errorMessage
      })
      onUploadError?.(errorMessage)
    }
  }, [maxFileSize, onUploadComplete, onUploadError])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: maxFileSize,
    multiple: false,
    disabled: uploadState.isUploading
  })

  const removeFile = () => {
    setUploadState({
      isUploading: false,
      progress: 0
    })
  }

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  const getFileTypeDisplay = (type: string) => {
    switch (type) {
      case 'application/pdf':
        return 'PDF'
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'Word Document'
      default:
        return 'Document'
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Document Upload
        </CardTitle>
        <CardDescription>
          Upload your resume, certifications, or other required documents (PDF or Word documents only, max {(maxFileSize / 1024 / 1024).toFixed(0)}MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        {!uploadState.uploadedFile && (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50",
              uploadState.isUploading && "cursor-not-allowed opacity-50"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              <Upload className={cn(
                "h-8 w-8",
                isDragActive ? "text-primary" : "text-muted-foreground"
              )} />
              {isDragActive ? (
                <p className="text-primary font-medium">Drop your document here</p>
              ) : (
                <div className="space-y-1">
                  <p className="font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF or DOCX files only
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploadState.isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadState.progress}%</span>
            </div>
            <Progress value={uploadState.progress} className="w-full" />
          </div>
        )}

        {/* Upload Success */}
        {uploadState.uploadedFile && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium">{uploadState.uploadedFile.filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {getFileTypeDisplay(uploadState.uploadedFile.file_type)} • {formatFileSize(uploadState.uploadedFile.file_size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">Uploaded</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {enableResumeAI && uploadState.uploadedFile.file_type === 'application/pdf' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your resume will be automatically processed by our AI system to help fill out your application. You can review and edit the extracted information in the next step.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Upload Errors */}
        {uploadState.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {uploadState.error}
            </AlertDescription>
          </Alert>
        )}

        {/* File Rejection Errors */}
        {fileRejections.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {fileRejections[0].errors[0].message}
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Guidelines */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium">Upload Guidelines:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Accepted formats: PDF, Word Document (.docx)</li>
            <li>Maximum file size: {(maxFileSize / 1024 / 1024).toFixed(0)}MB</li>
            <li>Documents will be scanned for viruses</li>
            {enableResumeAI && (
              <li>Resume content will be automatically extracted to help fill your application</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}