"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDistanceToNow } from 'date-fns'
import { 
  Paperclip,
  Upload,
  FileText,
  Image as ImageIcon,
  Download,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InternalProject } from '@/lib/types'

interface ProjectAttachmentsProps {
  project: InternalProject
  onUpdate: (project: InternalProject) => void
}

export function ProjectAttachments({ project, onUpdate }: ProjectAttachmentsProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (files: FileList) => {
    if (!files.length || isUploading) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch(`/api/v1/projects/${project.id}/attachments`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload files')
      }

      const updatedProject = await response.json()
      onUpdate(updatedProject.project)
    } catch (error) {
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="w-8 h-8 text-green-500" />
    }
    return <FileText className="w-8 h-8 text-blue-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const attachments = project.attachments || []

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          isUploading && 'opacity-50 pointer-events-none'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className={cn(
          'w-12 h-12 mx-auto mb-4',
          isDragging ? 'text-primary' : 'text-muted-foreground'
        )} />
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {isUploading ? 'Uploading files...' : 'Drop files here or click to upload'}
          </p>
          <p className="text-xs text-muted-foreground">
            Support for images, documents, and other file types
          </p>
        </div>
        <Input
          type="file"
          multiple
          className="hidden"
          id="file-upload"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        />
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          disabled={isUploading}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Paperclip className="w-4 h-4 mr-2" />
          Choose Files
        </Button>
      </div>

      {/* Attachments List */}
      <div className="space-y-3">
        {attachments.length === 0 ? (
          <div className="text-center py-12">
            <Paperclip className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No files attached</p>
            <p className="text-sm text-muted-foreground">
              Upload files to share with your team
            </p>
          </div>
        ) : (
          attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              {getFileIcon(attachment.mimeType)}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {attachment.fileName}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatFileSize(attachment.fileSize)}</span>
                  <span>•</span>
                  <span>
                    Uploaded by {attachment.uploadedByName} {formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => window.open(attachment.fileUrl, '_blank')}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}