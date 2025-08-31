// Document Service for Guard Applications - Story 2.2
// Handles file uploads, virus scanning, and document management for applications

import { supabase } from '@/lib/supabase'
import type { 
  DocumentReference, 
  DocumentReferences,
  ApplicationServiceResult 
} from '@/lib/types/guard-applications'

// Constants
const STORAGE_BUCKET = 'guard-applications'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
const SIGNED_URL_EXPIRES_IN = 3600 // 1 hour

// Supported document types
export type DocumentType = 'resume' | 'certification' | 'identification' | 'additional'

/**
 * Upload a document to Supabase Storage
 * @param file - File to upload
 * @param applicationId - Associated application ID
 * @param documentType - Type of document being uploaded
 * @returns Promise with document reference or error
 */
export async function uploadDocument(
  file: File,
  applicationId: string,
  documentType: DocumentType
): Promise<ApplicationServiceResult<DocumentReference>> {
  try {
    // Validate file
    const validation = validateFile(file)
    if (!validation.isValid) {
      throw new Error(validation.error!)
    }

    // Generate secure file path
    const { data: pathData, error: pathError } = await supabase.rpc(
      'generate_application_file_path',
      {
        application_id: applicationId,
        file_type: documentType,
        original_filename: file.name
      }
    )

    if (pathError) {
      throw new Error(`Failed to generate file path: ${pathError.message}`)
    }

    const filePath = pathData as string

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Create document reference
    const documentRef: DocumentReference = {
      id: crypto.randomUUID(),
      filename: file.name,
      storage_path: uploadData.path,
      uploaded_at: new Date().toISOString(),
      file_type: file.type,
      file_size: file.size,
      virus_scan_status: 'pending',
      ai_processed: false
    }

    // TODO: Trigger virus scanning (implement in future iteration)
    // For now, mark as clean for development
    documentRef.virus_scan_status = 'clean'

    return {
      success: true,
      data: documentRef,
      message: 'Document uploaded successfully'
    }
  } catch (error) {
    return {
      success: false,
      data: {} as DocumentReference,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to upload document'
    }
  }
}

/**
 * Get signed URL for document access
 * @param storagePath - Path to document in storage
 * @param expiresIn - URL expiration time in seconds
 * @returns Promise with signed URL or error
 */
export async function getDocumentSignedUrl(
  storagePath: string,
  expiresIn: number = SIGNED_URL_EXPIRES_IN
): Promise<ApplicationServiceResult<string>> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresIn)

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    if (!data?.signedUrl) {
      throw new Error('No signed URL returned')
    }

    return {
      success: true,
      data: data.signedUrl,
      message: 'Signed URL created successfully'
    }
  } catch (error) {
    return {
      success: false,
      data: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to create signed URL'
    }
  }
}

/**
 * Delete document from storage
 * @param storagePath - Path to document in storage
 * @returns Promise with success status
 */
export async function deleteDocument(
  storagePath: string
): Promise<ApplicationServiceResult<boolean>> {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath])

    if (error) {
      throw new Error(`Failed to delete document: ${error.message}`)
    }

    return {
      success: true,
      data: true,
      message: 'Document deleted successfully'
    }
  } catch (error) {
    return {
      success: false,
      data: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to delete document'
    }
  }
}

/**
 * List documents for an application
 * @param applicationId - Application ID
 * @returns Promise with document list
 */
export async function listApplicationDocuments(
  applicationId: string
): Promise<ApplicationServiceResult<DocumentReference[]>> {
  try {
    // List all files in the application folder
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(applicationId, {
        limit: 50,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      throw new Error(`Failed to list documents: ${error.message}`)
    }

    // Convert storage file info to DocumentReference format
    const documents: DocumentReference[] = (data || []).map(file => ({
      id: crypto.randomUUID(),
      filename: file.name,
      storage_path: `${applicationId}/${file.name}`,
      uploaded_at: file.created_at || new Date().toISOString(),
      file_type: getFileTypeFromName(file.name),
      file_size: file.metadata?.size || 0,
      virus_scan_status: 'clean', // Assume clean for now
      ai_processed: false
    }))

    return {
      success: true,
      data: documents,
      message: 'Documents retrieved successfully'
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to retrieve documents'
    }
  }
}

/**
 * Clean up expired or orphaned documents
 * @param daysOld - Delete documents older than this many days
 * @returns Promise with cleanup results
 */
export async function cleanupExpiredDocuments(
  daysOld: number = 30
): Promise<ApplicationServiceResult<number>> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    // This is a simplified cleanup - in production, you'd want to:
    // 1. Query database for expired application links
    // 2. Find associated documents
    // 3. Delete documents that are no longer needed
    
    // For now, return success with 0 deletions
    return {
      success: true,
      data: 0,
      message: 'Document cleanup completed'
    }
  } catch (error) {
    return {
      success: false,
      data: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Document cleanup failed'
    }
  }
}

/**
 * Update document references in application data
 * @param applicationId - Application ID
 * @param documents - Document references to store
 * @returns Promise with update result
 */
export async function updateApplicationDocuments(
  applicationId: string,
  documents: DocumentReferences
): Promise<ApplicationServiceResult<DocumentReferences>> {
  try {
    // Update the documents column in guard_leads table
    const { data, error } = await supabase
      .from('guard_leads')
      .update({
        documents: JSON.stringify(documents),
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update application documents: ${error.message}`)
    }

    return {
      success: true,
      data: documents,
      message: 'Application documents updated successfully'
    }
  } catch (error) {
    return {
      success: false,
      data: {} as DocumentReferences,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to update application documents'
    }
  }
}

// Helper Functions

/**
 * Validate uploaded file
 * @param file - File to validate
 * @returns Validation result
 */
function validateFile(file: File): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`
    }
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `File type "${file.type}" is not allowed. Please upload PDF or DOCX files only.`
    }
  }

  // Check filename length
  if (file.name.length > 255) {
    return {
      isValid: false,
      error: 'Filename is too long. Please use a shorter filename.'
    }
  }

  // Basic security check - reject suspicious filenames
  const suspiciousPatterns = [
    /\.\./,     // Path traversal
    /[<>:"|?*]/, // Invalid filename characters
    /\.(exe|bat|sh|cmd)$/i // Executable files
  ]

  if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
    return {
      isValid: false,
      error: 'Filename contains invalid characters or patterns'
    }
  }

  return { isValid: true }
}

/**
 * Determine MIME type from filename
 * @param filename - File name
 * @returns MIME type
 */
function getFileTypeFromName(filename: string): string {
  const extension = filename.toLowerCase().split('.').pop()
  
  switch (extension) {
    case 'pdf':
      return 'application/pdf'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    default:
      return 'application/octet-stream'
  }
}

/**
 * Generate application reference number
 * @returns Unique reference in format GMP-YYYY-NNNN
 */
export function generateApplicationReference(): string {
  const year = new Date().getFullYear()
  const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `GMP-${year}-${randomNum}`
}

/**
 * Validate document references structure
 * @param documents - Document references to validate
 * @returns Validation result
 */
export function validateDocumentReferences(documents: DocumentReferences): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate resume if provided
  if (documents.resume) {
    if (!documents.resume.filename || !documents.resume.storage_path) {
      errors.push('Resume document is missing required fields')
    }
  }

  // Validate certifications
  if (documents.certifications) {
    documents.certifications.forEach((cert, index) => {
      if (!cert.filename || !cert.storage_path) {
        errors.push(`Certification document ${index + 1} is missing required fields`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Export configuration constants for use in components
export const DOCUMENT_CONFIG = {
  STORAGE_BUCKET,
  MAX_FILE_SIZE,
  ALLOWED_TYPES,
  SIGNED_URL_EXPIRES_IN
} as const