import { supabase } from '@/lib/supabase'
import type { ApiResponse, ContractDocument, DocumentVersion } from '@/lib/types'

/**
 * Upload contract document to Supabase Storage
 */
export async function uploadContractDocument(
  contractId: string,
  file: File,
  documentType: 'proposal' | 'contract' | 'amendment' | 'renewal' | 'termination',
  requiresSignature: boolean = false
): Promise<ApiResponse<ContractDocument>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Validate file
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit')
    }

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only PDF and Word documents are allowed')
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const fileName = `${contractId}_${documentType}_${Date.now()}.${fileExtension}`
    const filePath = `contracts/${contractId}/documents/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('contract-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('contract-documents')
      .getPublicUrl(filePath)

    // Check for existing document of same type and increment version
    const { data: existingDocs, error: existingError } = await supabase
      .from('contract_documents')
      .select('version')
      .eq('contract_id', contractId)
      .eq('document_type', documentType)
      .order('version', { ascending: false })
      .limit(1)

    if (existingError && existingError.code !== 'PGRST116') {
      throw new Error(`Database error: ${existingError.message}`)
    }

    const version = existingDocs && existingDocs.length > 0 ? existingDocs[0].version + 1 : 1

    // Save document metadata to database
    const documentData = {
      contract_id: contractId,
      document_type: documentType,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
      mime_type: file.type,
      version,
      status: 'draft',
      requires_signature: requiresSignature,
      created_by: user.id
    }

    const { data: dbData, error: dbError } = await supabase
      .from('contract_documents')
      .insert([documentData])
      .select()
      .single()

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('contract-documents').remove([filePath])
      throw new Error(`Database error: ${dbError.message}`)
    }

    const document: ContractDocument = {
      id: dbData.id,
      contractId: dbData.contract_id,
      documentType: dbData.document_type,
      fileName: dbData.file_name,
      fileUrl: dbData.file_url,
      fileSize: dbData.file_size,
      mimeType: dbData.mime_type,
      version: dbData.version,
      status: dbData.status,
      requiresSignature: dbData.requires_signature,
      signatureRequestId: dbData.signature_request_id,
      signerEmail: dbData.signer_email,
      signedAt: dbData.signed_at,
      signatureProvider: dbData.signature_provider,
      createdBy: dbData.created_by,
      reviewedBy: dbData.reviewed_by,
      approvedBy: dbData.approved_by,
      reviewNotes: dbData.review_notes,
      created_at: dbData.created_at,
      updated_at: dbData.updated_at
    }

    return {
      success: true,
      data: document,
      message: 'Document uploaded successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to upload document'
    }
  }
}

/**
 * Get contract documents
 */
export async function getContractDocuments(
  contractId: string,
  documentType?: string
): Promise<ApiResponse<ContractDocument[]>> {
  try {
    let query = supabase
      .from('contract_documents')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false })

    if (documentType) {
      query = query.eq('document_type', documentType)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const documents: ContractDocument[] = (data || []).map(doc => ({
      id: doc.id,
      contractId: doc.contract_id,
      documentType: doc.document_type,
      fileName: doc.file_name,
      fileUrl: doc.file_url,
      fileSize: doc.file_size,
      mimeType: doc.mime_type,
      version: doc.version,
      status: doc.status,
      requiresSignature: doc.requires_signature,
      signatureRequestId: doc.signature_request_id,
      signerEmail: doc.signer_email,
      signedAt: doc.signed_at,
      signatureProvider: doc.signature_provider,
      createdBy: doc.created_by,
      reviewedBy: doc.reviewed_by,
      approvedBy: doc.approved_by,
      reviewNotes: doc.review_notes,
      created_at: doc.created_at,
      updated_at: doc.updated_at
    }))

    return {
      success: true,
      data: documents,
      message: 'Documents retrieved successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to retrieve documents'
    }
  }
}

/**
 * Update document status (for approval workflow)
 */
export async function updateDocumentStatus(
  documentId: string,
  status: 'draft' | 'pending_review' | 'approved' | 'signed' | 'executed',
  reviewNotes?: string
): Promise<ApiResponse<ContractDocument>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'pending_review') {
      updateData.review_requested_at = new Date().toISOString()
    } else if (status === 'approved') {
      updateData.reviewed_by = user.id
      updateData.approved_by = user.id
      updateData.approved_at = new Date().toISOString()
      if (reviewNotes) {
        updateData.review_notes = reviewNotes
      }
    } else if (status === 'signed') {
      updateData.signed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('contract_documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!data) {
      throw new Error('Document not found')
    }

    const document: ContractDocument = {
      id: data.id,
      contractId: data.contract_id,
      documentType: data.document_type,
      fileName: data.file_name,
      fileUrl: data.file_url,
      fileSize: data.file_size,
      mimeType: data.mime_type,
      version: data.version,
      status: data.status,
      requiresSignature: data.requires_signature,
      signatureRequestId: data.signature_request_id,
      signerEmail: data.signer_email,
      signedAt: data.signed_at,
      signatureProvider: data.signature_provider,
      createdBy: data.created_by,
      reviewedBy: data.reviewed_by,
      approvedBy: data.approved_by,
      reviewNotes: data.review_notes,
      created_at: data.created_at,
      updated_at: data.updated_at
    }

    return {
      success: true,
      data: document,
      message: 'Document status updated successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to update document status'
    }
  }
}

/**
 * Send document for electronic signature (mock implementation)
 */
export async function sendForSignature(
  documentId: string,
  signerEmail: string,
  signerName: string,
  provider: 'docusign' | 'adobe_sign' | 'hellosign' = 'docusign'
): Promise<ApiResponse<{ signatureRequestId: string, signUrl: string }>> {
  try {
    // In a real implementation, this would integrate with DocuSign, Adobe Sign, etc.
    // For now, we'll mock the response
    
    const mockSignatureRequestId = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const mockSignUrl = `https://mock-signature-provider.com/sign/${mockSignatureRequestId}`

    // Update document with signature request info
    const { error } = await supabase
      .from('contract_documents')
      .update({
        signature_request_id: mockSignatureRequestId,
        signer_email: signerEmail,
        signature_provider: provider,
        status: 'pending_signature',
        signature_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // In a real implementation, you would:
    // 1. Upload document to signature provider
    // 2. Create signature request with signer details
    // 3. Get the signing URL
    // 4. Send email notification to signer


    return {
      success: true,
      data: {
        signatureRequestId: mockSignatureRequestId,
        signUrl: mockSignUrl
      },
      message: 'Document sent for signature successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to send document for signature'
    }
  }
}

/**
 * Check signature status (mock implementation)
 */
export async function checkSignatureStatus(
  signatureRequestId: string
): Promise<ApiResponse<{ status: string, signedAt?: string, documentUrl?: string }>> {
  try {
    // In a real implementation, this would query the signature provider's API
    // For now, we'll simulate a response
    
    // Simulate random signature completion
    const isCompleted = Math.random() > 0.7 // 30% chance it's completed
    
    if (isCompleted) {
      const signedAt = new Date().toISOString()
      
      // Update the document in database
      await supabase
        .from('contract_documents')
        .update({
          status: 'signed',
          signed_at: signedAt,
          updated_at: new Date().toISOString()
        })
        .eq('signature_request_id', signatureRequestId)

      return {
        success: true,
        data: {
          status: 'completed',
          signedAt,
          documentUrl: `https://mock-provider.com/signed-doc/${signatureRequestId}.pdf`
        },
        message: 'Document has been signed'
      }
    } else {
      return {
        success: true,
        data: { status: 'pending' },
        message: 'Document is pending signature'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to check signature status'
    }
  }
}

/**
 * Create document version (for version control)
 */
export async function createDocumentVersion(
  documentId: string,
  changes: string
): Promise<ApiResponse<DocumentVersion>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get current document
    const { data: currentDoc, error: docError } = await supabase
      .from('contract_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !currentDoc) {
      throw new Error('Document not found')
    }

    // Create version record
    const versionData = {
      contract_document_id: documentId,
      version: currentDoc.version,
      file_name: currentDoc.file_name,
      file_url: currentDoc.file_url,
      changes,
      created_by: user.id
    }

    const { data: versionRecord, error: versionError } = await supabase
      .from('document_versions')
      .insert([versionData])
      .select()
      .single()

    if (versionError) {
      throw new Error(`Database error: ${versionError.message}`)
    }

    const version: DocumentVersion = {
      id: versionRecord.id,
      contractDocumentId: versionRecord.contract_document_id,
      version: versionRecord.version,
      fileName: versionRecord.file_name,
      fileUrl: versionRecord.file_url,
      changes: versionRecord.changes,
      createdBy: versionRecord.created_by,
      created_at: versionRecord.created_at
    }

    return {
      success: true,
      data: version,
      message: 'Document version created successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to create document version'
    }
  }
}

/**
 * Get document versions
 */
export async function getDocumentVersions(
  documentId: string
): Promise<ApiResponse<DocumentVersion[]>> {
  try {
    const { data, error } = await supabase
      .from('document_versions')
      .select(`
        *,
        users!created_by(first_name, last_name, email)
      `)
      .eq('contract_document_id', documentId)
      .order('version', { ascending: false })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const versions: DocumentVersion[] = (data || []).map(version => ({
      id: version.id,
      contractDocumentId: version.contract_document_id,
      version: version.version,
      fileName: version.file_name,
      fileUrl: version.file_url,
      changes: version.changes,
      createdBy: version.created_by,
      created_at: version.created_at
    }))

    return {
      success: true,
      data: versions,
      message: 'Document versions retrieved successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to retrieve document versions'
    }
  }
}

/**
 * Delete document and its file
 */
export async function deleteContractDocument(
  documentId: string
): Promise<ApiResponse<void>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get document info first
    const { data: document, error: docError } = await supabase
      .from('contract_documents')
      .select('file_url, contract_id')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      throw new Error('Document not found')
    }

    // Extract file path from URL
    const url = new URL(document.file_url)
    const filePath = url.pathname.split('/').slice(-3).join('/') // Get the last 3 parts of the path

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('contract-documents')
      .remove([filePath])

    if (storageError) {
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('contract_documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`)
    }

    return {
      success: true,
      message: 'Document deleted successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to delete document'
    }
  }
}

/**
 * Generate secure sharing link for client portal
 */
export async function generateSharingLink(
  documentId: string,
  expiresInHours: number = 72
): Promise<ApiResponse<{ shareUrl: string, expiresAt: string }>> {
  try {
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    
    // In a real implementation, you would:
    // 1. Generate a secure token
    // 2. Store it in a sharing_links table with expiration
    // 3. Create a protected route that validates the token
    
    const shareToken = `share_${documentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/contracts/documents/shared/${shareToken}`

    // Store sharing link in database (would need a sharing_links table)
    // For now, just return the mock URL

    return {
      success: true,
      data: {
        shareUrl,
        expiresAt: expiresAt.toISOString()
      },
      message: 'Sharing link generated successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to generate sharing link'
    }
  }
}