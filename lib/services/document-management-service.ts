import { supabase } from '@/lib/supabase'
import type {
  ServiceResult,
  DocumentReference,
  DocumentUpload,
  DigitalSignature,
  SignatureVerification,
  ExpiringDocument,
  ReminderResult
} from '@/lib/types/guard-profile'
import { GuardProfileErrorCode } from '@/lib/types/guard-profile'

export interface DocumentMetadata {
  guardProfileId: string
  documentType: string
  fileName: string
  expiryDate?: string
  isRequired: boolean
  tags?: string[]
  description?: string
}

export interface DocumentData {
  id: string
  url: string
  metadata: DocumentMetadata
  uploadedAt: string
  uploadedBy: string
  fileSize: number
  mimeType: string
  isEncrypted: boolean
  accessLog: Array<{
    accessedAt: string
    accessedBy: string
    action: string
  }>
}

export class DocumentManagementService {
  private readonly ALLOWED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  /**
   * Upload a document to secure storage
   */
  async uploadDocument(
    file: File,
    metadata: DocumentMetadata
  ): Promise<ServiceResult<DocumentReference>> {
    try {
      // Validate file
      const validation = this.validateFile(file)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Check if guard profile exists
      const { data: profile, error: profileError } = await supabase
        .from('guard_profiles')
        .select('id')
        .eq('id', metadata.guardProfileId)
        .single()

      if (profileError || !profile) {
        return {
          success: false,
          error: 'Guard profile not found'
        }
      }

      // Generate secure file path
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      const timestamp = Date.now()
      const fileName = `${metadata.guardProfileId}/${metadata.documentType}/${timestamp}.${fileExt}`

      // Upload to Supabase Storage with security
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('guard-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          metadata: {
            guardProfileId: metadata.guardProfileId,
            documentType: metadata.documentType,
            originalName: file.name,
            uploadedBy: (await supabase.auth.getUser()).data.user?.id || 'system'
          }
        })

      if (uploadError) {
        return {
          success: false,
          error: `Upload failed: ${uploadError.message}`
        }
      }

      // Get secure URL
      const { data: urlData } = supabase.storage
        .from('guard-documents')
        .getPublicUrl(fileName)

      // Virus scan (mock implementation)
      const scanResult = await this.performVirusScan(file)
      if (!scanResult.isClean) {
        // Delete uploaded file
        await supabase.storage
          .from('guard-documents')
          .remove([fileName])

        return {
          success: false,
          error: 'File failed security scan',
        }
      }

      // Create document reference
      const documentRef: DocumentReference = {
        id: crypto.randomUUID(),
        name: file.name,
        type: metadata.documentType,
        url: urlData.publicUrl,
        uploadedAt: new Date().toISOString(),
        size: file.size,
        mimeType: file.type,
        expiryDate: metadata.expiryDate,
        isRequired: metadata.isRequired,
        status: 'active'
      }

      // Update guard profile documents
      const { data: currentProfile, error: fetchError } = await supabase
        .from('guard_profiles')
        .select('documents, document_checklist')
        .eq('id', metadata.guardProfileId)
        .single()

      if (fetchError) {
        return {
          success: false,
          error: 'Failed to update profile',
        }
      }

      const updatedDocuments = [...(currentProfile.documents || []), documentRef]
      const updatedChecklist = {
        ...currentProfile.document_checklist,
        [metadata.documentType]: true
      }

      await supabase
        .from('guard_profiles')
        .update({
          documents: updatedDocuments,
          document_checklist: updatedChecklist
        })
        .eq('id', metadata.guardProfileId)

      // Track expiry if applicable
      if (metadata.expiryDate) {
        await this.trackDocumentExpiry(documentRef.id, new Date(metadata.expiryDate))
      }

      // Log upload activity
      await this.logDocumentAccess(
        documentRef.id,
        'document_uploaded',
        `Document ${file.name} uploaded successfully`
      )

      return {
        success: true,
        data: documentRef
      }
    } catch (error) {
      return {
        success: false,
        error: `Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Delete a document from storage and database
   */
  async deleteDocument(documentId: string): Promise<ServiceResult<void>> {
    try {
      // Find document in guard profiles
      const { data: profiles, error: searchError } = await supabase
        .from('guard_profiles')
        .select('id, documents')
        .contains('documents', [{ id: documentId }])

      if (searchError || !profiles || profiles.length === 0) {
        return {
          success: false,
          error: 'Document not found',
        }
      }

      const profile = profiles[0]
      const document = profile.documents.find((doc: any) => doc.id === documentId)
      
      if (!document) {
        return {
          success: false,
          error: 'Document reference not found'
        }
      }

      // Extract file path from URL
      const url = new URL(document.url)
      const filePath = url.pathname.split('/').slice(-3).join('/') // Get last 3 path segments

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('guard-documents')
        .remove([filePath])

      if (deleteError) {
        // Continue with database cleanup even if storage deletion fails
      }

      // Remove from guard profile documents array
      const updatedDocuments = profile.documents.filter((doc: any) => doc.id !== documentId)
      
      await supabase
        .from('guard_profiles')
        .update({ documents: updatedDocuments })
        .eq('id', profile.id)

      // Remove expiry tracking
      await supabase
        .from('guard_document_expiry')
        .delete()
        .eq('guard_profile_id', profile.id)
        .eq('document_name', document.name)

      // Log deletion
      await this.logDocumentAccess(
        documentId,
        'document_deleted',
        `Document ${document.name} deleted`
      )

      return {
        success: true,
        data: undefined
      }
    } catch (error) {
      return {
        success: false,
        error: `Deletion error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Get document data and metadata
   */
  async getDocument(documentId: string): Promise<ServiceResult<DocumentData>> {
    try {
      // Find document in guard profiles
      const { data: profiles, error } = await supabase
        .from('guard_profiles')
        .select('id, documents, legal_name')
        .contains('documents', [{ id: documentId }])

      if (error || !profiles || profiles.length === 0) {
        return {
          success: false,
          error: 'Document not found',
        }
      }

      const profile = profiles[0]
      const document = profile.documents.find((doc: any) => doc.id === documentId)

      if (!document) {
        return {
          success: false,
          error: 'Document not found'
        }
      }

      // Get access log from audit table
      const { data: accessLog } = await supabase
        .from('tops_compliance_audit')
        .select('created_at, accessed_by, access_details')
        .eq('guard_profile_id', profile.id)
        .eq('audit_type', 'document_verification')
        .contains('access_details', { documentId })
        .order('created_at', { ascending: false })
        .limit(10)

      const documentData: DocumentData = {
        id: document.id,
        url: document.url,
        metadata: {
          guardProfileId: profile.id,
          documentType: document.type,
          fileName: document.name,
          expiryDate: document.expiryDate,
          isRequired: document.isRequired,
          description: `${document.type} for ${profile.legal_name}`
        },
        uploadedAt: document.uploadedAt,
        uploadedBy: 'system', // Would be actual user ID in production
        fileSize: document.size,
        mimeType: document.mimeType,
        isEncrypted: false, // Would indicate encryption status
        accessLog: accessLog?.map(log => ({
          accessedAt: log.created_at,
          accessedBy: log.accessed_by,
          action: log.access_details.action || 'viewed'
        })) || []
      }

      // Log access
      await this.logDocumentAccess(
        documentId,
        'document_accessed',
        `Document ${document.name} accessed`
      )

      return {
        success: true,
        data: documentData
      }
    } catch (error) {
      return {
        success: false,
        error: `Document retrieval error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Create digital signature for a document
   */
  async createDigitalSignature(
    documentId: string,
    signerId: string
  ): Promise<ServiceResult<DigitalSignature>> {
    try {
      // Get document info
      const docResult = await this.getDocument(documentId)
      if (!docResult.success) {
        return { 
          success: false, 
          error: docResult.error 
        }
      }

      // Generate signature data (simplified implementation)
      const signatureData = await this.generateSignature(documentId, signerId)
      
      const digitalSignature: DigitalSignature = {
        signatureId: crypto.randomUUID(),
        documentId,
        signerId,
        signatureData: signatureData.signature,
        timestamp: new Date().toISOString(),
        ipAddress: 'unknown', // Would capture real IP
        userAgent: navigator?.userAgent || 'Unknown',
        isValid: true
      }

      // Store signature in database
      await supabase
        .from('tops_compliance_audit')
        .insert([{
          guard_profile_id: docResult.data?.metadata.guardProfileId,
          audit_type: 'document_verification',
          accessed_by: signerId,
          access_details: {
            action: 'digital_signature_created',
            documentId,
            signatureId: digitalSignature.signatureId,
            timestamp: digitalSignature.timestamp
          },
          compliance_status: 'compliant'
        }])

      return {
        success: true,
        data: digitalSignature
      }
    } catch (error) {
      return {
        success: false,
        error: `Signature creation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Verify a digital signature
   */
  async verifyDigitalSignature(
    signatureId: string
  ): Promise<ServiceResult<SignatureVerification>> {
    try {
      // Get signature record
      const { data: auditRecord, error } = await supabase
        .from('tops_compliance_audit')
        .select('*')
        .contains('access_details', { signatureId })
        .single()

      if (error || !auditRecord) {
        return {
          success: false,
          error: 'Signature not found'
        }
      }

      // Verify signature integrity (simplified)
      const verification: SignatureVerification = {
        isValid: true, // Would perform actual cryptographic verification
        signedAt: auditRecord.access_details.timestamp,
        signedBy: auditRecord.accessed_by,
        documentHash: 'mock-hash', // Would be actual document hash
        verifiedAt: new Date().toISOString()
      }

      return {
        success: true,
        data: verification
      }
    } catch (error) {
      return {
        success: false,
        error: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Track document expiry date
   */
  async trackDocumentExpiry(
    documentId: string,
    expiryDate: Date
  ): Promise<ServiceResult<void>> {
    try {
      // Find which profile contains this document
      const { data: profiles, error } = await supabase
        .from('guard_profiles')
        .select('id, documents')
        .contains('documents', [{ id: documentId }])

      if (error || !profiles || profiles.length === 0) {
        return {
          success: false,
          error: 'Document not found'
        }
      }

      const profile = profiles[0]
      const document = profile.documents.find((doc: any) => doc.id === documentId)

      if (!document) {
        return {
          success: false,
          error: 'Document reference not found'
        }
      }

      // Insert expiry tracking record
      await supabase
        .from('guard_document_expiry')
        .insert([{
          guard_profile_id: profile.id,
          document_type: document.type,
          document_name: document.name,
          expiry_date: expiryDate.toISOString().split('T')[0],
          status: 'active'
        }])

      return {
        success: true,
        data: undefined
      }
    } catch (error) {
      return {
        success: false,
        error: `Expiry tracking error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Check for expiring documents
   */
  async checkExpiringDocuments(): Promise<ServiceResult<ExpiringDocument[]>> {
    try {
      const thirtyDaysFromNow = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))

      const { data: expiringDocs, error } = await supabase
        .from('guard_document_expiry')
        .select(`
          *,
          guard_profiles!inner (
            legal_name,
            employee_number
          )
        `)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .eq('status', 'active')
        .order('expiry_date', { ascending: true })

      if (error) {
        return {
          success: false,
          error: `Expiry check failed: ${error.message}`
        }
      }

      const expiringDocuments: ExpiringDocument[] = expiringDocs?.map(doc => {
        const expiryDate = new Date(doc.expiry_date)
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        const remindersSent = Array.isArray(doc.renewal_reminder_sent_at) 
          ? doc.renewal_reminder_sent_at.length 
          : 0

        return {
          guardProfileId: doc.guard_profile_id,
          guardName: doc.guard_profiles.legal_name,
          documentId: doc.id,
          documentName: doc.document_name,
          documentType: doc.document_type,
          expiryDate: doc.expiry_date,
          daysUntilExpiry,
          remindersSent,
          lastReminderSent: remindersSent > 0 
            ? doc.renewal_reminder_sent_at[remindersSent - 1] 
            : undefined
        }
      }) || []

      return {
        success: true,
        data: expiringDocuments
      }
    } catch (error) {
      return {
        success: false,
        error: `Expiry check error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Send expiry reminder notifications
   */
  async sendExpiryReminders(): Promise<ServiceResult<ReminderResult>> {
    try {
      const expiringResult = await this.checkExpiringDocuments()
      if (!expiringResult.success) {
        return {
          success: false,
          error: expiringResult.error
        }
      }

      const expiringDocs = expiringResult.data
      let totalProcessed = 0
      let remindersSent = 0
      const errors: Array<{ guardProfileId: string; error: string }> = []

      for (const doc of expiringDocs || []) {
        totalProcessed++

        try {
          // Check if reminder was sent recently (within 7 days)
          const lastReminder = doc.lastReminderSent 
            ? new Date(doc.lastReminderSent)
            : null

          const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000))
          
          if (lastReminder && lastReminder > sevenDaysAgo) {
            continue // Skip if reminder sent recently
          }

          // Send notification (mock implementation)
          await this.sendNotification(doc)

          // Update reminder timestamp
          await supabase
            .from('guard_document_expiry')
            .update({
              renewal_reminder_sent_at: new Date().toISOString() as any
            })
            .eq('id', doc.documentId)

          remindersSent++
        } catch (error) {
          errors.push({
            guardProfileId: doc.guardProfileId,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return {
        success: true,
        data: {
          totalProcessed,
          remindersSent,
          errors
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Reminder sending error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Private helper methods

  private validateFile(file: File): { isValid: boolean; error?: string } {
    if (!this.ALLOWED_FILE_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} not allowed. Supported types: PDF, JPG, PNG, GIF, DOC, DOCX`
      }
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      }
    }

    return { isValid: true }
  }

  private async performVirusScan(file: File): Promise<{ isClean: boolean; details?: string }> {
    // Mock virus scan - in production, integrate with actual scanning service
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Simulate potential threat detection
    if (file.name.toLowerCase().includes('virus') || file.name.toLowerCase().includes('malware')) {
      return {
        isClean: false,
        details: 'Potential threat detected in filename'
      }
    }

    return { isClean: true }
  }

  private async generateSignature(documentId: string, signerId: string): Promise<{ signature: string }> {
    // Mock signature generation - in production, use actual cryptographic signing
    const data = `${documentId}:${signerId}:${Date.now()}`
    const encoder = new TextEncoder()
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data))
    const signature = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return { signature }
  }

  private async logDocumentAccess(
    documentId: string,
    action: string,
    description: string
  ): Promise<void> {
    try {
      // Find guard profile for this document
      const { data: profiles } = await supabase
        .from('guard_profiles')
        .select('id')
        .contains('documents', [{ id: documentId }])

      if (profiles && profiles.length > 0) {
        const { data: { user } } = await supabase.auth.getUser()
        
        await supabase
          .from('tops_compliance_audit')
          .insert([{
            guard_profile_id: profiles[0].id,
            audit_type: 'document_verification',
            accessed_by: user?.id || 'system',
            access_details: {
              action,
              documentId,
              description,
              timestamp: new Date().toISOString()
            },
            compliance_status: 'compliant'
          }])
      }
    } catch (error) {
    }
  }

  private async sendNotification(doc: ExpiringDocument): Promise<void> {
    // Mock notification sending - in production, integrate with email/SMS service
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // In production, this would send actual notifications via:
    // - Email (SendGrid, AWS SES, etc.)
    // - SMS (Twilio, AWS SNS, etc.)
    // - In-app notifications
    // - Push notifications
  }
}