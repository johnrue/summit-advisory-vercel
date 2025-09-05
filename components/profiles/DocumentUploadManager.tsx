"use client"

import React, { useState, useCallback, useRef } from 'react'
import NextImage from 'next/image'
import { useDropzone } from 'react-dropzone'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Upload, 
  File, 
  FileText, 
  Image as ImageIcon, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  Eye,
  Download,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'

import { DocumentManagementService } from '@/lib/services/document-management-service'
import type { DocumentReference, DocumentUpload } from '@/lib/types/guard-profile'

interface Props {
  profileId: string
  existingDocuments?: DocumentReference[]
  onDocumentsChange?: (documents: DocumentReference[]) => void
  maxFiles?: number
  allowedTypes?: string[]
}

interface UploadingFile {
  file: File
  progress: number
  documentType: string
  expiryDate?: string
  isRequired: boolean
  status: 'uploading' | 'success' | 'error'
  error?: string
}

const DOCUMENT_TYPES = [
  { value: 'governmentId', label: 'Government-issued Photo ID', required: true },
  { value: 'photograph', label: 'Professional Photograph', required: true },
  { value: 'drugTestResults', label: 'Drug Test Results', required: false },
  { value: 'educationCertificates', label: 'Education Certificates', required: false },
  { value: 'securityTraining', label: 'Security Training Certificate', required: true },
  { value: 'policyAcknowledgment', label: 'Policy Acknowledgment', required: true },
  { value: 'topsDocumentation', label: 'TOPS Documentation', required: false },
  { value: 'continuingEducation', label: 'Continuing Education Records', required: false },
  { value: 'other', label: 'Other Documents', required: false }
]

const ALLOWED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
}

export function DocumentUploadManager({
  profileId,
  existingDocuments = [],
  onDocumentsChange,
  maxFiles = 10,
  allowedTypes = Object.keys(ALLOWED_FILE_TYPES)
}: Props) {
  const [documents, setDocuments] = useState<DocumentReference[]>(existingDocuments)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [selectedDocumentType, setSelectedDocumentType] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [previewDocument, setPreviewDocument] = useState<DocumentReference | null>(null)
  
  const documentService = new DocumentManagementService()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Calculate completion status
  const requiredTypes = DOCUMENT_TYPES.filter(type => type.required).map(type => type.value)
  const uploadedTypes = documents.map(doc => doc.type)
  const missingRequired = requiredTypes.filter(type => !uploadedTypes.includes(type))
  const completionPercentage = Math.round(
    ((requiredTypes.length - missingRequired.length) / requiredTypes.length) * 100
  )

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!selectedDocumentType) {
      toast.error('Please select a document type first')
      return
    }

    if (documents.length + uploadingFiles.length + acceptedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    const newUploadingFiles: UploadingFile[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      documentType: selectedDocumentType,
      expiryDate: expiryDate || undefined,
      isRequired: DOCUMENT_TYPES.find(type => type.value === selectedDocumentType)?.required || false,
      status: 'uploading' as const
    }))

    setUploadingFiles(prev => [...prev, ...newUploadingFiles])

    // Process each file
    newUploadingFiles.forEach(uploadingFile => {
      uploadDocument(uploadingFile)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocumentType, expiryDate, documents.length, uploadingFiles.length, maxFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: allowedTypes.reduce((acc, type) => {
      acc[type] = [ALLOWED_FILE_TYPES[type as keyof typeof ALLOWED_FILE_TYPES]]
      return acc
    }, {} as Record<string, string[]>),
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: !selectedDocumentType
  })

  const uploadDocument = async (uploadingFile: UploadingFile) => {
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === uploadingFile.file 
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          )
        )
      }, 200)

      const documentUpload: DocumentUpload = {
        file: uploadingFile.file,
        documentType: uploadingFile.documentType,
        expiryDate: uploadingFile.expiryDate,
        isRequired: uploadingFile.isRequired
      }

      const result = await documentService.uploadDocument(uploadingFile.file, {
        guardProfileId: profileId,
        documentType: uploadingFile.documentType,
        fileName: uploadingFile.file.name,
        expiryDate: uploadingFile.expiryDate,
        isRequired: uploadingFile.isRequired
      })

      clearInterval(progressInterval)

      if (result.success) {
        // Complete progress
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === uploadingFile.file 
              ? { ...f, progress: 100, status: 'success' }
              : f
          )
        )

        // Add to documents list
        const newDocuments = [...documents, result.data].filter((doc): doc is DocumentReference => doc !== undefined)
        setDocuments(newDocuments)
        onDocumentsChange?.(newDocuments)

        toast.success(`${uploadingFile.file.name} uploaded successfully`)

        // Remove from uploading list after 2 seconds
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.file !== uploadingFile.file))
        }, 2000)
      } else {
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error?.message || 'Upload failed'
        
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === uploadingFile.file 
              ? { ...f, status: 'error' as const, error: errorMessage }
              : f
          )
        )
        toast.error(`Upload failed: ${errorMessage}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file === uploadingFile.file 
            ? { ...f, status: 'error', error: errorMessage }
            : f
        )
      )
      toast.error(errorMessage)
    }
  }

  const removeDocument = async (documentId: string) => {
    const result = await documentService.deleteDocument(documentId)
    
    if (result.success) {
      const newDocuments = documents.filter(doc => doc.id !== documentId)
      setDocuments(newDocuments)
      onDocumentsChange?.(newDocuments)
      toast.success('Document removed successfully')
    } else {
      toast.error(`Failed to remove document: ${result.error}`)
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />
    if (mimeType === 'application/pdf') return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const isDocumentExpiring = (document: DocumentReference) => {
    if (!document.expiryDate) return false
    const expiryDate = new Date(document.expiryDate)
    const thirtyDaysFromNow = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
    return expiryDate <= thirtyDaysFromNow
  }

  return (
    <div className="space-y-6">
      {/* Header with completion status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Document Management</h3>
          <p className="text-sm text-muted-foreground">
            Upload required documents for TOPS compliance
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">
            {completionPercentage}%
          </div>
          <div className="text-sm text-muted-foreground">Complete</div>
        </div>
      </div>

      <Progress value={completionPercentage} className="w-full" />

      {/* Missing required documents alert */}
      {missingRequired.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Missing required documents:</strong>{' '}
            {missingRequired.map(type => 
              DOCUMENT_TYPES.find(dt => dt.value === type)?.label
            ).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Select document type and upload files (PDF, JPG, PNG, DOC - max 10MB each)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {type.label}
                        {type.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Expiry Date (Optional)</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                placeholder="Document expiry date"
              />
            </div>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${!selectedDocumentType ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
            `}
          >
            <input {...getInputProps()} ref={fileInputRef} />
            <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              {isDragActive 
                ? 'Drop files here...' 
                : 'Drag & drop files here, or click to browse'
              }
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedDocumentType 
                ? `Uploading as: ${DOCUMENT_TYPES.find(t => t.value === selectedDocumentType)?.label}`
                : 'Please select document type first'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploading Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadingFiles.map((uploadingFile, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getFileIcon(uploadingFile.file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{uploadingFile.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {DOCUMENT_TYPES.find(t => t.value === uploadingFile.documentType)?.label}
                    </p>
                    <Progress value={uploadingFile.progress} className="w-full mt-2" />
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadingFile.status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {uploadingFile.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="text-sm">{uploadingFile.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
            <CardDescription>
              Manage your uploaded documents and check expiry dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map(document => (
                <div key={document.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getFileIcon(document.mimeType)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{document.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{DOCUMENT_TYPES.find(t => t.value === document.type)?.label}</span>
                      {document.isRequired && (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      )}
                      {document.expiryDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Expires: {format(new Date(document.expiryDate), 'MMM dd, yyyy')}</span>
                          {isDocumentExpiring(document) && (
                            <Badge variant="destructive" className="text-xs">Expiring Soon</Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Uploaded: {format(new Date(document.uploadedAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>{document.name}</DialogTitle>
                          <DialogDescription>
                            {DOCUMENT_TYPES.find(t => t.value === document.type)?.label}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                          {document.mimeType.startsWith('image/') ? (
                            <div className="relative w-full h-full">
                              <NextImage 
                                src={document.url} 
                                alt={document.name}
                                fill
                                className="object-contain rounded-lg"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                            </div>
                          ) : (
                            <div className="text-center">
                              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Preview not available for this file type
                              </p>
                              <Button variant="outline" className="mt-2" asChild>
                                <a href={document.url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download File
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button variant="ghost" size="sm" asChild>
                      <a href={document.url} download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>

                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeDocument(document.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Requirements Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Document Requirements</CardTitle>
          <CardDescription>
            Ensure all required documents are uploaded for compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DOCUMENT_TYPES.map(type => {
              const isUploaded = documents.some(doc => doc.type === type.value)
              return (
                <div key={type.value} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {isUploaded ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/25" />
                    )}
                    <div>
                      <p className="font-medium">{type.label}</p>
                      {type.required && (
                        <p className="text-sm text-muted-foreground">Required for compliance</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {type.required && (
                      <Badge variant={isUploaded ? "default" : "secondary"}>
                        {type.required ? 'Required' : 'Optional'}
                      </Badge>
                    )}
                    {isUploaded && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}