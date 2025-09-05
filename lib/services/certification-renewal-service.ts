import { supabase } from '@/lib/supabase'
import { AuditService } from './audit-service'
import { put } from '@vercel/blob'
import type { 
  CertificationRenewalRequest, 
  GuardCertification, 
  CertificationHistory 
} from '@/lib/types'

/**
 * Certification Renewal Service for Summit Advisory
 * Handles the complete renewal workflow from submission to approval
 */
export class CertificationRenewalService {
  private static auditService = AuditService.getInstance()

  /**
   * Submit a new certification renewal request
   */
  static async submitRenewalRequest({
    certificationId,
    guardId,
    newExpiryDate,
    documentFile,
    userId
  }: {
    certificationId: string
    guardId: string
    newExpiryDate: Date
    documentFile: File
    userId: string
  }): Promise<CertificationRenewalRequest> {
    try {
      // Upload document to Vercel Blob
      const documentUrl = await this.uploadRenewalDocument(documentFile, certificationId)

      // Create renewal request record
      const { data: renewalRequest, error } = await supabase
        .from('certification_renewal_requests')
        .insert([{
          guard_certification_id: certificationId,
          guard_id: guardId,
          new_document_url: documentUrl,
          new_expiry_date: newExpiryDate.toISOString().split('T')[0],
          request_status: 'pending'
        }])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to submit renewal request: ${error.message}`)
      }

      // Update certification status to pending_renewal
      await supabase
        .from('guard_certifications')
        .update({ 
          status: 'pending_renewal',
          updated_at: new Date().toISOString()
        })
        .eq('id', certificationId)

      // Log submission in audit trail
      await this.auditService.logAction({
        action: 'created',
        entity_type: 'compliance_record',
        entity_id: renewalRequest.id,
        details: {
          certificationId,
          guardId,
          newExpiryDate: newExpiryDate.toISOString(),
          documentUrl
        },
        user_id: userId
      })

      return this.mapDbRenewalRequest(renewalRequest)

    } catch (error) {
      throw new Error('Failed to submit certification renewal request')
    }
  }

  /**
   * Review and approve/reject a certification renewal request
   */
  static async reviewRenewalRequest({
    renewalRequestId,
    action,
    reviewNotes,
    reviewedBy
  }: {
    renewalRequestId: string
    action: 'approved' | 'rejected'
    reviewNotes?: string
    reviewedBy: string
  }): Promise<CertificationRenewalRequest> {
    try {
      // Get the renewal request
      const { data: renewalRequest, error: fetchError } = await supabase
        .from('certification_renewal_requests')
        .select('*')
        .eq('id', renewalRequestId)
        .single()

      if (fetchError || !renewalRequest) {
        throw new Error('Renewal request not found')
      }

      // Update renewal request status
      const { data: updatedRequest, error: updateError } = await supabase
        .from('certification_renewal_requests')
        .update({
          request_status: action,
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy,
          review_notes: reviewNotes
        })
        .eq('id', renewalRequestId)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update renewal request: ${updateError.message}`)
      }

      if (action === 'approved') {
        await this.processApprovedRenewal(renewalRequest, reviewedBy)
      } else {
        await this.processRejectedRenewal(renewalRequest, reviewedBy)
      }

      // Log review action in audit trail
      await this.auditService.logAction({
        action: action,
        entity_type: 'compliance_record',
        entity_id: renewalRequestId,
        details: {
          certificationId: renewalRequest.guard_certification_id,
          guardId: renewalRequest.guard_id,
          reviewNotes,
          previousStatus: 'pending'
        },
        user_id: reviewedBy
      })

      return this.mapDbRenewalRequest(updatedRequest)

    } catch (error) {
      throw new Error('Failed to review certification renewal request')
    }
  }

  /**
   * Get pending renewal requests for review
   */
  static async getPendingRenewalRequests(): Promise<CertificationRenewalRequest[]> {
    try {
      const { data: requests, error } = await supabase
        .from('certification_renewal_requests')
        .select(`
          *,
          guard_certifications (
            certification_type,
            expiry_date,
            guards:guard_id (
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('request_status', 'pending')
        .order('submitted_at', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch pending renewals: ${error.message}`)
      }

      return (requests || []).map(this.mapDbRenewalRequest)

    } catch (error) {
      return []
    }
  }

  /**
   * Get renewal history for a certification
   */
  static async getCertificationHistory(certificationId: string): Promise<CertificationHistory[]> {
    try {
      const { data: history, error } = await supabase
        .from('certification_history')
        .select('*')
        .eq('guard_certification_id', certificationId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch certification history: ${error.message}`)
      }

      return (history || []).map(this.mapDbCertificationHistory)

    } catch (error) {
      return []
    }
  }

  /**
   * Get guard certifications with renewal status
   */
  static async getGuardCertifications(guardId: string): Promise<GuardCertification[]> {
    try {
      const { data: certifications, error } = await supabase
        .from('guard_certifications')
        .select('*')
        .eq('guard_id', guardId)
        .order('expiry_date', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch guard certifications: ${error.message}`)
      }

      return (certifications || []).map(this.mapDbCertification)

    } catch (error) {
      return []
    }
  }

  /**
   * Check if a certification needs renewal
   */
  static async checkRenewalNeeded(certificationId: string): Promise<{
    needsRenewal: boolean
    daysUntilExpiry: number
    hasActivePendingRequest: boolean
  }> {
    try {
      // Get certification details
      const { data: certification, error: certError } = await supabase
        .from('guard_certifications')
        .select('expiry_date, status')
        .eq('id', certificationId)
        .single()

      if (certError || !certification) {
        throw new Error('Certification not found')
      }

      // Calculate days until expiry with normalized dates
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const expiryDate = new Date(certification.expiry_date)
      expiryDate.setHours(0, 0, 0, 0)
      
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      // Check for active pending renewal request
      const { data: pendingRequest, error: requestError } = await supabase
        .from('certification_renewal_requests')
        .select('id')
        .eq('guard_certification_id', certificationId)
        .eq('request_status', 'pending')
        .maybeSingle()

      if (requestError) {
      }

      return {
        needsRenewal: daysUntilExpiry <= 30,
        daysUntilExpiry,
        hasActivePendingRequest: !!pendingRequest
      }

    } catch (error) {
      return {
        needsRenewal: false,
        daysUntilExpiry: 0,
        hasActivePendingRequest: false
      }
    }
  }

  // Private helper methods

  private static async uploadRenewalDocument(file: File, certificationId: string): Promise<string> {
    try {
      const fileName = `certification-renewals/${certificationId}/${Date.now()}-${file.name}`
      const blob = await put(fileName, file, {
        access: 'public',
        contentType: file.type
      })

      return blob.url
    } catch (error) {
      throw new Error('Failed to upload renewal document')
    }
  }

  private static async processApprovedRenewal(renewalRequest: any, reviewedBy: string): Promise<void> {
    try {
      // Update certification with new expiry date and document
      const { error: updateError } = await supabase
        .from('guard_certifications')
        .update({
          expiry_date: renewalRequest.new_expiry_date,
          document_url: renewalRequest.new_document_url,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', renewalRequest.guard_certification_id)

      if (updateError) {
        throw new Error(`Failed to update certification: ${updateError.message}`)
      }

      // Get old certification data for history
      const { data: oldCert, error: fetchError } = await supabase
        .from('guard_certifications')
        .select('expiry_date')
        .eq('id', renewalRequest.guard_certification_id)
        .single()

      if (fetchError) {
      }

      // Add to certification history
      await supabase
        .from('certification_history')
        .insert([{
          guard_certification_id: renewalRequest.guard_certification_id,
          action: 'renewed',
          previous_expiry_date: oldCert?.expiry_date,
          new_expiry_date: renewalRequest.new_expiry_date,
          document_url: renewalRequest.new_document_url,
          processed_by: reviewedBy,
          notes: 'Certification renewed through renewal request process'
        }])

    } catch (error) {
      throw error
    }
  }

  private static async processRejectedRenewal(renewalRequest: any, reviewedBy: string): Promise<void> {
    try {
      // Revert certification status to active (or expired if past due)
      const today = new Date()
      const expiryDate = new Date(renewalRequest.new_expiry_date)
      const newStatus = expiryDate < today ? 'expired' : 'active'

      await supabase
        .from('guard_certifications')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', renewalRequest.guard_certification_id)

      // Add rejection to certification history
      await supabase
        .from('certification_history')
        .insert([{
          guard_certification_id: renewalRequest.guard_certification_id,
          action: 'renewal_rejected',
          document_url: renewalRequest.new_document_url,
          processed_by: reviewedBy,
          notes: 'Renewal request rejected by manager'
        }])

    } catch (error) {
      throw error
    }
  }

  private static mapDbRenewalRequest(dbRequest: any): CertificationRenewalRequest {
    return {
      id: dbRequest.id,
      guardCertificationId: dbRequest.guard_certification_id,
      guardId: dbRequest.guard_id,
      newDocumentUrl: dbRequest.new_document_url,
      newExpiryDate: dbRequest.new_expiry_date ? new Date(dbRequest.new_expiry_date) : undefined,
      requestStatus: dbRequest.request_status,
      submittedAt: dbRequest.submitted_at,
      reviewedAt: dbRequest.reviewed_at,
      reviewedBy: dbRequest.reviewed_by,
      reviewNotes: dbRequest.review_notes
    }
  }

  private static mapDbCertificationHistory(dbHistory: any): CertificationHistory {
    return {
      id: dbHistory.id,
      guardCertificationId: dbHistory.guard_certification_id,
      action: dbHistory.action,
      previousExpiryDate: dbHistory.previous_expiry_date ? new Date(dbHistory.previous_expiry_date) : undefined,
      newExpiryDate: dbHistory.new_expiry_date ? new Date(dbHistory.new_expiry_date) : undefined,
      documentUrl: dbHistory.document_url,
      processedBy: dbHistory.processed_by,
      notes: dbHistory.notes,
      createdAt: dbHistory.created_at
    }
  }

  private static mapDbCertification(dbCert: any): GuardCertification {
    return {
      id: dbCert.id,
      guardId: dbCert.guard_id,
      certificationType: dbCert.certification_type,
      certificateNumber: dbCert.certificate_number,
      issuedDate: dbCert.issued_date ? new Date(dbCert.issued_date) : undefined,
      expiryDate: new Date(dbCert.expiry_date),
      issuingAuthority: dbCert.issuing_authority,
      documentUrl: dbCert.document_url,
      status: dbCert.status,
      createdAt: dbCert.created_at,
      updatedAt: dbCert.updated_at
    }
  }
}