import { supabase } from '@/lib/supabase'
import { piiEncryption } from '@/lib/encryption/pii-encryption'
import { AuditService } from '@/lib/services/audit-service'
import type {
  GuardProfile,
  GuardProfileCreateData,
  GuardProfileUpdateData,
  ServiceResult,
  CompletionSuggestion,
  ComplianceValidation,
  DocumentReference,
  DocumentUpload,
  ComplianceScore,
  AddressData,
  AIParsedData,
  CompletionAssistanceLogEntry
} from '@/lib/types/guard-profile'
import { GuardProfileErrorCode } from '@/lib/types/guard-profile'

export class GuardProfileService {
  private auditService = AuditService.getInstance()
  
  /**
   * Fields that require PII encryption
   */
  private readonly piiFields = [
    'ssnLastSix',
    'dateOfBirth',
    'currentAddress',
    'phone',
    'driversLicenseNumber'
  ]
  /**
   * Create a new guard profile for an approved applicant
   */
  async createProfile(
    profileData: GuardProfileCreateData
  ): Promise<ServiceResult<GuardProfile>> {
    try {
      // Validate encryption configuration
      const encryptionValidation = this.validateEncryptionConfig()
      if (!encryptionValidation.valid) {
        return {
          success: false,
          error: `Encryption configuration error: ${encryptionValidation.errors.join(', ')}`
        }
      }
      // Verify application is approved
      const { data: application, error: appError } = await supabase
        .from('guard_leads')
        .select(`
          id,
          pipeline_stage,
          ai_parsed_data,
          hiring_decisions!inner (
            decision_type
          )
        `)
        .eq('id', profileData.applicationId)
        .eq('hiring_decisions.decision_type', 'approved')
        .single()

      if (appError || !application) {
        return {
          success: false,
          error: 'Application not found or not approved',
        }
      }

      // Pre-populate with AI-parsed data if available
      const aiParsedData: AIParsedData = application.ai_parsed_data || {}
      
      // Encrypt PII fields before storage
      const encryptionResult = await this.encryptPIIFields(profileData)
      if (!encryptionResult.success) {
        return {
          success: false,
          error: encryptionResult.error!,
        }
      }
      const encryptedData = encryptionResult.data
      
      // Calculate initial completion percentage (use original data for calculation)
      const completionPercentage = this.calculateCompletionPercentage({
        legalName: profileData.legalName,
        dateOfBirth: profileData.dateOfBirth,
        placeOfBirth: profileData.placeOfBirth,
        ssnLastSix: profileData.ssnLastSix,
        currentAddress: profileData.currentAddress,
        topsProfileUrl: profileData.topsProfileUrl,
        photographUrl: profileData.photographUrl
      })

      // Create guard profile with encrypted PII data
      const { data: profile, error: profileError } = await supabase
        .from('guard_profiles')
        .insert([{
          application_id: encryptedData.applicationId,
          legal_name: encryptedData.legalName,
          date_of_birth: encryptedData.dateOfBirth, // Encrypted
          place_of_birth: encryptedData.placeOfBirth,
          ssn_last_six: encryptedData.ssnLastSix, // Encrypted
          current_address: encryptedData.currentAddress, // Encrypted
          tops_profile_url: encryptedData.topsProfileUrl,
          license_number: encryptedData.licenseNumber,
          license_expiry: encryptedData.licenseExpiry,
          photograph_url: encryptedData.photographUrl,
          ai_parsed_data: aiParsedData,
          completion_percentage: completionPercentage,
          profile_status: 'draft'
        }])
        .select()
        .single()

      if (profileError) {
        return {
          success: false,
          error: `Failed to create profile: ${profileError.message}`
        }
      }

      // Update profile creation token to mark as used
      await supabase
        .from('profile_creation_tokens')
        .update({
          used_at: new Date().toISOString(),
          guard_profile_id: profile.id,
          is_active: false
        })
        .eq('application_id', profileData.applicationId)
        .eq('is_active', true)

      // Log audit trail with AuditService
      const { data: { user } } = await supabase.auth.getUser()
      await this.auditService.logGuardProfileChange(
        profile.id,
        'created',
        undefined, // No previous values for creation
        profile,
        'Guard profile created from approved application',
        user?.id
      )

      // Keep legacy compliance audit for backward compatibility
      await this.logComplianceAccess(
        profile.id,
        'profile_access',
        'Profile created',
        { action: 'create_profile' }
      )

      return {
        success: true,
        data: await this.transformDatabaseProfile(profile)
      }
    } catch (error) {
      return {
        success: false,
        error: `Service error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Update an existing guard profile
   */
  async updateProfile(
    profileId: string,
    updates: GuardProfileUpdateData
  ): Promise<ServiceResult<GuardProfile>> {
    try {
      // Get current profile for audit trail
      const { data: currentProfile, error: fetchError } = await supabase
        .from('guard_profiles')
        .select('*')
        .eq('id', profileId)
        .single()

      if (fetchError || !currentProfile) {
        return {
          success: false,
          error: 'Profile not found',
        }
      }

      // Calculate updated completion percentage
      const mergedData = { ...currentProfile, ...updates }
      const completionPercentage = this.calculateCompletionPercentage(mergedData)

      // Update profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('guard_profiles')
        .update({
          ...updates,
          completion_percentage: completionPercentage,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single()

      if (updateError) {
        return {
          success: false,
          error: `Failed to update profile: ${updateError.message}`
        }
      }

      // Log audit trail for changes with AuditService
      const { data: { user } } = await supabase.auth.getUser()
      await this.auditService.logGuardProfileChange(
        profileId,
        'updated',
        currentProfile,
        updatedProfile,
        'Guard profile updated',
        user?.id
      )

      // Keep legacy compliance audit for backward compatibility
      await this.logComplianceAccess(
        profileId,
        'profile_access',
        'Profile updated',
        {
          action: 'update_profile',
          changes: updates,
          previousValues: currentProfile
        }
      )

      return {
        success: true,
        data: await this.transformDatabaseProfile(updatedProfile)
      }
    } catch (error) {
      return {
        success: false,
        error: `Service error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Get a guard profile by ID
   */
  async getProfile(profileId: string): Promise<ServiceResult<GuardProfile>> {
    try {
      const { data: profile, error } = await supabase
        .from('guard_profiles')
        .select(`
          *,
          guard_leads!inner (
            first_name,
            last_name,
            email,
            phone,
            ai_parsed_data
          )
        `)
        .eq('id', profileId)
        .single()

      if (error || !profile) {
        return {
          success: false,
          error: 'Profile not found',
        }
      }

      // Log access for audit trail
      await this.logComplianceAccess(
        profileId,
        'profile_access',
        'Profile viewed',
        { action: 'view_profile' }
      )

      return {
        success: true,
        data: await this.transformDatabaseProfile(profile)
      }
    } catch (error) {
      return {
        success: false,
        error: `Service error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Generate AI-powered completion suggestions for a field
   */
  async generateCompletionSuggestions(
    profileId: string,
    fieldName: string,
    partialValue: string
  ): Promise<ServiceResult<CompletionSuggestion[]>> {
    try {
      // Get profile context for AI assistance
      const profileResult = await this.getProfile(profileId)
      if (!profileResult.success) {
        return {
          success: false,
          error: profileResult.error
        }
      }

      const profile = profileResult.data!
      
      // Use OpenAI for intelligent suggestions (mock implementation)
      // In production, this would integrate with OpenAI API
      const suggestions: CompletionSuggestion[] = await this.generateAISuggestions(
        fieldName,
        partialValue,
        profile
      )

      // Log AI assistance usage
      const logEntry: CompletionAssistanceLogEntry = {
        timestamp: new Date().toISOString(),
        fieldName,
        originalValue: partialValue,
        suggestedValue: suggestions[0]?.suggestedValue || '',
        accepted: false, // Will be updated when user accepts
        confidence: suggestions[0]?.confidence || 0,
        reasoning: suggestions[0]?.reasoning || ''
      }

      // Update assistance log
      await supabase
        .from('guard_profiles')
        .update({
          completion_assistance_log: [
            ...profile.completionAssistanceLog,
            logEntry
          ]
        })
        .eq('id', profileId)

      return {
        success: true,
        data: suggestions
      }
    } catch (error) {
      return {
        success: false,
        error: `AI assistance error: ${error instanceof Error ? error.message : 'AI service unavailable'}`
      }
    }
  }

  /**
   * Validate profile completeness and compliance
   */
  async validateProfileCompleteness(
    profileId: string
  ): Promise<ServiceResult<ComplianceValidation>> {
    try {
      const profileResult = await this.getProfile(profileId)
      if (!profileResult.success) {
        return {
          success: false,
          error: profileResult.error
        }
      }

      const profile = profileResult.data!
      
      const missingFields: string[] = []
      const expiringDocuments: DocumentReference[] = []
      const recommendations: string[] = []

      // Check required fields
      if (!profile.legalName) missingFields.push('Legal Name')
      if (!profile.dateOfBirth) missingFields.push('Date of Birth')
      if (!profile.placeOfBirth) missingFields.push('Place of Birth')
      if (!profile.ssnLastSix) missingFields.push('SSN Last Six Digits')
      if (!profile.currentAddress?.street) missingFields.push('Current Address')
      if (!profile.photographUrl) missingFields.push('Photograph')

      // Check document requirements
      if (!profile.documentChecklist.governmentId) {
        missingFields.push('Government ID')
        recommendations.push('Upload a valid government-issued photo ID')
      }
      
      if (!profile.documentChecklist.policyAcknowledgment) {
        missingFields.push('Policy Acknowledgment')
        recommendations.push('Sign the drug-free workplace policy')
      }

      // Check for expiring documents
      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))

      profile.documents.forEach(doc => {
        if (doc.expiryDate && new Date(doc.expiryDate) <= thirtyDaysFromNow) {
          expiringDocuments.push(doc)
        }
      })

      // Check TOPS compliance
      if (!profile.topsProfileUrl) {
        recommendations.push('Add TOPS profile URL for compliance tracking')
      }

      // Calculate compliance score
      const totalRequirements = 10 // Total number of compliance requirements
      const metRequirements = totalRequirements - missingFields.length
      const score = Math.round((metRequirements / totalRequirements) * 100)

      const isCompliant = score >= 90 && missingFields.length === 0

      return {
        success: true,
        data: {
          isCompliant,
          score,
          missingFields,
          expiringDocuments,
          recommendations
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Upload document for a guard profile
   */
  async uploadDocument(
    profileId: string,
    documentData: DocumentUpload
  ): Promise<ServiceResult<DocumentReference>> {
    try {
      // Upload file to Supabase Storage
      const fileExt = documentData.file.name.split('.').pop()
      const fileName = `${profileId}/${documentData.documentType}_${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('guard-documents')
        .upload(fileName, documentData.file)

      if (uploadError) {
        return {
          success: false,
          error: `Upload failed: ${uploadError.message}`
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('guard-documents')
        .getPublicUrl(fileName)

      const documentRef: DocumentReference = {
        id: crypto.randomUUID(),
        name: documentData.file.name,
        type: documentData.documentType,
        url: urlData.publicUrl,
        uploadedAt: new Date().toISOString(),
        size: documentData.file.size,
        mimeType: documentData.file.type,
        expiryDate: documentData.expiryDate,
        isRequired: documentData.isRequired,
        status: 'active'
      }

      // Update profile with document reference
      const { data: profile } = await supabase
        .from('guard_profiles')
        .select('documents, document_checklist')
        .eq('id', profileId)
        .single()

      if (profile) {
        const updatedDocuments = [...(profile.documents || []), documentRef]
        const updatedChecklist = {
          ...profile.document_checklist,
          [documentData.documentType]: true
        }

        await supabase
          .from('guard_profiles')
          .update({
            documents: updatedDocuments,
            document_checklist: updatedChecklist
          })
          .eq('id', profileId)

        // Track expiry if applicable
        if (documentData.expiryDate) {
          await supabase
            .from('guard_document_expiry')
            .insert([{
              guard_profile_id: profileId,
              document_type: documentData.documentType,
              document_name: documentData.file.name,
              expiry_date: documentData.expiryDate,
              status: 'active'
            }])
        }
      }

      return {
        success: true,
        data: documentRef
      }
    } catch (error) {
      return {
        success: false,
        error: `Document upload error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Calculate compliance score for a profile
   */
  async calculateComplianceScore(
    profileId: string
  ): Promise<ServiceResult<ComplianceScore>> {
    try {
      const validationResult = await this.validateProfileCompleteness(profileId)
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error
        }
      }

      const validation = validationResult.data!
      const profileResult = await this.getProfile(profileId)
      if (!profileResult.success) {
        return {
          success: false,
          error: profileResult.error
        }
      }

      const profile = profileResult.data!

      // Calculate breakdown scores
      const basicInfoScore = this.calculateBasicInfoScore(profile)
      const documentsScore = this.calculateDocumentsScore(profile)
      const topsComplianceScore = this.calculateTopsScore(profile)
      const certificationsScore = this.calculateCertificationsScore(profile)

      const overall = Math.round((
        basicInfoScore + documentsScore + topsComplianceScore + certificationsScore
      ) / 4)

      return {
        success: true,
        data: {
          overall,
          breakdown: {
            basicInfo: basicInfoScore,
            documents: documentsScore,
            topsCompliance: topsComplianceScore,
            certifications: certificationsScore
          },
          recommendations: validation.recommendations
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Score calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Approve a guard profile
   */
  async approveProfile(
    profileId: string,
    approverId: string
  ): Promise<ServiceResult<GuardProfile>> {
    try {
      // Validate compliance before approval
      const complianceResult = await this.validateProfileCompleteness(profileId)
      if (!complianceResult.success) {
        return {
          success: false,
          error: complianceResult.error
        }
      }

      if (!complianceResult.data!.isCompliant) {
        return {
          success: false,
          error: 'Profile does not meet compliance requirements for approval',
        }
      }

      // Update profile to approved status
      const { data: approvedProfile, error } = await supabase
        .from('guard_profiles')
        .update({
          profile_status: 'approved',
          approved_by: approverId,
          approved_at: new Date().toISOString(),
          is_schedulable: true,
          first_employment_date: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: `Approval failed: ${error.message}`
        }
      }

      // Log approval audit trail with AuditService
      await this.auditService.logGuardProfileChange(
        profileId,
        'approved',
        undefined, // No previous values needed for approval
        approvedProfile,
        `Guard profile approved by manager - compliance score: ${complianceResult.data!.score}`,
        approverId
      )

      // Keep legacy compliance audit for backward compatibility
      await this.logComplianceAccess(
        profileId,
        'compliance_check',
        'Profile approved',
        {
          action: 'approve_profile',
          approver: approverId,
          complianceScore: complianceResult.data!.score
        }
      )

      return {
        success: true,
        data: await this.transformDatabaseProfile(approvedProfile)
      }
    } catch (error) {
      return {
        success: false,
        error: `Approval error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Private helper methods

  /**
   * Encrypt PII fields before storing in database
   */
  private async encryptPIIFields(data: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const encryptedData = { ...data }
      
      for (const field of this.piiFields) {
        if (data[field] && typeof data[field] === 'string') {
          const encryptResult = piiEncryption.encrypt(data[field])
          if (!encryptResult.success) {
            return { success: false, error: `Failed to encrypt ${field}: ${encryptResult.error}` }
          }
          encryptedData[field] = encryptResult.data
        }
      }

      return { success: true, data: encryptedData }
    } catch (error) {
      return { 
        success: false, 
        error: `PII encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  /**
   * Decrypt PII fields after retrieving from database
   */
  private async decryptPIIFields(data: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const decryptedData = { ...data }
      
      for (const field of this.piiFields) {
        if (data[field] && piiEncryption.isEncrypted(data[field])) {
          const decryptResult = piiEncryption.decrypt(data[field])
          if (!decryptResult.success) {
            // Log but don't fail the entire operation - show as [ENCRYPTED] instead
            decryptedData[field] = '[ENCRYPTED - DECRYPT FAILED]'
          } else {
            decryptedData[field] = decryptResult.data
          }
        }
      }

      return { success: true, data: decryptedData }
    } catch (error) {
      return { 
        success: false, 
        error: `PII decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  /**
   * Validate PII encryption configuration before operations
   */
  private validateEncryptionConfig(): { valid: boolean; errors: string[] } {
    return piiEncryption.validateConfiguration()
  }

  private calculateCompletionPercentage(profileData: any): number {
    const requiredFields = [
      'legalName',
      'dateOfBirth',
      'placeOfBirth',
      'ssnLastSix',
      'currentAddress',
      'photographUrl'
    ]

    const completedFields = requiredFields.filter(field => {
      const value = profileData[field] || profileData[this.camelToSnake(field)]
      return value && (typeof value === 'string' ? value.trim() : true)
    })

    return Math.round((completedFields.length / requiredFields.length) * 100)
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
  }

  private async transformDatabaseProfile(dbProfile: any): Promise<GuardProfile> {
    // Decrypt PII fields before transforming
    const decryptionResult = await this.decryptPIIFields({
      dateOfBirth: dbProfile.date_of_birth,
      ssnLastSix: dbProfile.ssn_last_six,
      currentAddress: dbProfile.current_address,
      phone: dbProfile.phone,
      driversLicenseNumber: dbProfile.drivers_license_number
    })

    const decryptedData = decryptionResult.success ? decryptionResult.data : {}

    return {
      id: dbProfile.id,
      applicationId: dbProfile.application_id,
      legalName: dbProfile.legal_name,
      dateOfBirth: decryptedData.dateOfBirth || dbProfile.date_of_birth,
      placeOfBirth: dbProfile.place_of_birth,
      ssnLastSix: decryptedData.ssnLastSix || dbProfile.ssn_last_six,
      company: dbProfile.company,
      currentAddress: decryptedData.currentAddress || dbProfile.current_address,
      topsProfileUrl: dbProfile.tops_profile_url,
      licenseNumber: dbProfile.license_number,
      licenseExpiry: dbProfile.license_expiry,
      firstEmploymentDate: dbProfile.first_employment_date,
      lastEmploymentDate: dbProfile.last_employment_date,
      employeeNumber: dbProfile.employee_number,
      employmentStatus: dbProfile.employment_status,
      photographUrl: dbProfile.photograph_url,
      documents: dbProfile.documents || [],
      documentChecklist: dbProfile.document_checklist || {},
      aiParsedData: dbProfile.ai_parsed_data || {},
      completionAssistanceLog: dbProfile.completion_assistance_log || [],
      profileStatus: dbProfile.profile_status,
      completionPercentage: dbProfile.completion_percentage,
      isSchedulable: dbProfile.is_schedulable,
      policyAgreements: dbProfile.policy_agreements || [],
      certificationStatus: dbProfile.certification_status || {},
      complianceScore: dbProfile.compliance_score,
      createdAt: dbProfile.created_at,
      updatedAt: dbProfile.updated_at,
      approvedBy: dbProfile.approved_by,
      approvedAt: dbProfile.approved_at
    }
  }

  private async logComplianceAccess(
    profileId: string,
    auditType: string,
    action: string,
    details: any
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      await supabase
        .from('tops_compliance_audit')
        .insert([{
          guard_profile_id: profileId,
          audit_type: auditType,
          accessed_by: user?.id || 'system',
          access_details: {
            action,
            timestamp: new Date().toISOString(),
            ...details
          },
          compliance_status: 'compliant'
        }])
    } catch (error) {
    }
  }

  private async generateAISuggestions(
    fieldName: string,
    partialValue: string,
    profile: GuardProfile
  ): Promise<CompletionSuggestion[]> {
    // Mock AI suggestions - in production, integrate with OpenAI API
    const suggestions: CompletionSuggestion[] = []

    switch (fieldName) {
      case 'placeOfBirth':
        if (partialValue.length > 2) {
          suggestions.push({
            fieldName,
            suggestedValue: `${partialValue}, TX, USA`,
            confidence: 0.85,
            reasoning: 'Most common format for Texas birth locations',
            source: 'AI completion'
          })
        }
        break
      
      case 'employeeNumber':
        suggestions.push({
          fieldName,
          suggestedValue: `SA-${Date.now().toString().slice(-6)}`,
          confidence: 0.95,
          reasoning: 'Standard Summit Advisory employee number format',
          source: 'AI completion'
        })
        break

      default:
        if (profile.aiParsedData && partialValue.length > 1) {
          suggestions.push({
            fieldName,
            suggestedValue: partialValue + ' (AI suggested completion)',
            confidence: 0.7,
            reasoning: 'Based on parsed resume data',
            source: 'AI completion'
          })
        }
    }

    return suggestions
  }

  private calculateBasicInfoScore(profile: GuardProfile): number {
    const fields = ['legalName', 'dateOfBirth', 'placeOfBirth', 'ssnLastSix', 'currentAddress']
    const completed = fields.filter(field => profile[field as keyof GuardProfile]).length
    return Math.round((completed / fields.length) * 100)
  }

  private calculateDocumentsScore(profile: GuardProfile): number {
    const requiredDocs = ['governmentId', 'policyAcknowledgment', 'photograph']
    const completed = requiredDocs.filter(doc => profile.documentChecklist[doc]).length
    return Math.round((completed / requiredDocs.length) * 100)
  }

  private calculateTopsScore(profile: GuardProfile): number {
    return profile.topsProfileUrl ? 100 : 50 // Partial score if no TOPS URL
  }

  private calculateCertificationsScore(profile: GuardProfile): number {
    const certStatus = profile.certificationStatus
    if (!certStatus) return 0
    
    let score = 0
    if (certStatus.securityTraining?.completed) score += 50
    if (certStatus.licenseStatus?.hasLicense) score += 50
    
    return score
  }
}

// Export singleton instance
export const guardProfileService = new GuardProfileService()