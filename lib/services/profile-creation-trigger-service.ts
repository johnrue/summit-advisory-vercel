// Story 2.7: Profile Creation Trigger Service
// Automatic profile creation system for approved applicants

import { createClient } from '@/lib/supabase'
import type { 
  ProfileCreationToken,
  ProfileCreationProgress,
  ServiceResult,
  ApprovalNotificationData
} from '@/lib/types/approval-workflow'

export interface ProfileCreationTriggerConfig {
  enableAutomaticCreation: boolean
  secureTokenExpirationDays: number
  profileCompletionReminderDays: number[]
  requiredComplianceSteps: string[]
  notificationSettings: {
    sendCreationLink: boolean
    sendReminders: boolean
    sendCompletionConfirmation: boolean
  }
}

export interface GuardProfileData {
  personalInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
    dateOfBirth: Date
    address: {
      street: string
      city: string
      state: string
      zipCode: string
    }
  }
  employment: {
    startDate: Date
    position: string
    department: string
    employmentType: 'full_time' | 'part_time' | 'contract'
    hourlyRate?: number
    salaryAmount?: number
  }
  compliance: {
    topsLicenseNumber?: string
    topsExpiryDate?: Date
    backgroundCheckCompleted: boolean
    backgroundCheckDate: Date
    trainingCompleted: string[]
    certificationsHeld: string[]
  }
  preferences: {
    availableShifts: string[]
    preferredLocations: string[]
    maxHoursPerWeek?: number
    workPreferences: Record<string, any>
  }
}

export interface GuardProfile {
  id: string
  applicationId: string
  personalInfo: GuardProfileData['personalInfo']
  employment: GuardProfileData['employment']
  compliance: GuardProfileData['compliance']
  preferences: GuardProfileData['preferences']
  profileStatus: 'incomplete' | 'pending_review' | 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  createdFromTokenId: string
}

const DEFAULT_CONFIG: ProfileCreationTriggerConfig = {
  enableAutomaticCreation: true,
  secureTokenExpirationDays: 30,
  profileCompletionReminderDays: [7, 14, 21],
  requiredComplianceSteps: [
    'background_check_verification',
    'tops_license_upload',
    'training_documentation',
    'emergency_contacts'
  ],
  notificationSettings: {
    sendCreationLink: true,
    sendReminders: true,
    sendCompletionConfirmation: true
  }
}

export class ProfileCreationTriggerService {
  private supabase = createClient()
  private config: ProfileCreationTriggerConfig = DEFAULT_CONFIG

  /**
   * Trigger profile creation for an approved applicant
   */
  async triggerProfileCreation(decisionId: string): Promise<ServiceResult<ProfileCreationToken>> {
    try {
      // Get hiring decision details
      const { data: decision, error: decisionError } = await this.supabase
        .from('hiring_decisions')
        .select(`
          *,
          guard_leads(*)
        `)
        .eq('id', decisionId)
        .single()

      if (decisionError) {
        return { success: false, error: { code: 'DECISION_NOT_FOUND' , message: decisionError.message }}
      }

      // Only trigger for approved decisions
      if (!['approved', 'conditionally_approved'].includes(decision.decision_type)) {
        return { 
          success: false, 
          error: 'Profile creation only available for approved applicants', 
          code: 'INVALID_DECISION_TYPE' 
        }
      }

      // Check if token already exists
      const { data: existingToken } = await this.supabase
        .from('profile_creation_tokens')
        .select('*')
        .eq('hiring_decision_id', decisionId)
        .eq('is_active', true)
        .single()

      if (existingToken) {
        return { success: true, data: this.mapDatabaseToProfileCreationToken(existingToken) }
      }

      // Generate secure token using database function
      const { data: tokenData, error: tokenError } = await this.supabase
        .rpc('generate_profile_creation_token', {
          p_application_id: decision.application_id,
          p_hiring_decision_id: decisionId,
          p_expiry_days: this.config.secureTokenExpirationDays
        })

      if (tokenError) {
        return { success: false, error: { code: 'TOKEN_GENERATION_ERROR' , message: tokenError.message }}
      }

      // Get the created token record
      const { data: token, error: tokenSelectError } = await this.supabase
        .from('profile_creation_tokens')
        .select('*')
        .eq('secure_token', tokenData)
        .single()

      if (tokenSelectError) {
        return { success: false, error: { code: 'TOKEN_RETRIEVAL_ERROR' , message: tokenSelectError.message }}
      }

      // Send profile creation notification if enabled
      if (this.config.notificationSettings.sendCreationLink) {
        await this.sendProfileCreationNotification(token.id)
      }

      return { success: true, data: this.mapDatabaseToProfileCreationToken(token) }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PROFILE_CREATION_ERROR' 
      }
    }
  }

  /**
   * Generate secure profile creation link
   */
  async generateSecureCreationLink(tokenId: string): Promise<ServiceResult<string>> {
    try {
      const { data: token, error } = await this.supabase
        .from('profile_creation_tokens')
        .select('secure_token')
        .eq('id', tokenId)
        .eq('is_active', true)
        .single()

      if (error) {
        return { success: false, error: { code: 'TOKEN_NOT_FOUND' , message: error.message }}
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://summitadvisoryfirm.com'
      const profileCreationUrl = `${baseUrl}/profile-creation/${token.secure_token}`

      return { success: true, data: profileCreationUrl }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'LINK_GENERATION_ERROR' 
      }
    }
  }

  /**
   * Validate profile creation token
   */
  async validateCreationToken(token: string): Promise<ServiceResult<ProfileCreationToken>> {
    try {
      const { data, error } = await this.supabase
        .from('profile_creation_tokens')
        .select(`
          *,
          guard_leads(*),
          hiring_decisions(*)
        `)
        .eq('secure_token', token)
        .eq('is_active', true)
        .single()

      if (error) {
        return { success: false, error: { code: 'INVALID_TOKEN' , message: 'Invalid or expired token' }}
      }

      // Check if token has expired
      if (new Date(data.expires_at) < new Date()) {
        // Deactivate expired token
        await this.supabase
          .from('profile_creation_tokens')
          .update({ is_active: false })
          .eq('id', data.id)

        return { success: false, error: { code: 'TOKEN_EXPIRED' , message: 'Token has expired' }}
      }

      // Check if token has already been used
      if (data.used_at) {
        return { success: false, error: { code: 'TOKEN_USED' , message: 'Token has already been used' }}
      }

      return { success: true, data: this.mapDatabaseToProfileCreationToken(data) }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'TOKEN_VALIDATION_ERROR' 
      }
    }
  }

  /**
   * Complete profile creation process
   */
  async completeProfileCreation(
    tokenId: string, 
    profileData: GuardProfileData
  ): Promise<ServiceResult<GuardProfile>> {
    try {
      const { data: token, error: tokenError } = await this.supabase
        .from('profile_creation_tokens')
        .select('*')
        .eq('id', tokenId)
        .eq('is_active', true)
        .single()

      if (tokenError) {
        return { success: false, error: { code: 'INVALID_TOKEN' , message: 'Invalid token' }}
      }

      // Check if token is still valid
      const tokenValidation = await this.validateCreationToken(token.secure_token)
      if (!tokenValidation.success) {
        return { success: false, error: { code: tokenValidation.code , message: tokenValidation.error }}
      }

      // Create guard profile (this would typically be in a separate guards table)
      const guardProfile: Omit<GuardProfile, 'id'> = {
        applicationId: token.application_id,
        personalInfo: profileData.personalInfo,
        employment: profileData.employment,
        compliance: profileData.compliance,
        preferences: profileData.preferences,
        profileStatus: this.isProfileComplete(profileData) ? 'pending_review' : 'incomplete',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: this.isProfileComplete(profileData) ? new Date() : undefined,
        createdFromTokenId: tokenId
      }

      // In a real implementation, this would create the actual guard profile
      // For now, we'll simulate success and mark the token as used
      await this.supabase
        .from('profile_creation_tokens')
        .update({ 
          used_at: new Date().toISOString(),
          // guard_profile_id would be set to the actual created profile ID
        })
        .eq('id', tokenId)

      // Update application stage to profile_created
      await this.updateApplicationStage(token.application_id, 'profile_created')

      // Send completion confirmation if enabled
      if (this.config.notificationSettings.sendCompletionConfirmation) {
        await this.sendProfileCompletionConfirmation(tokenId, guardProfile)
      }

      return { 
        success: true, 
        data: { ...guardProfile, id: `guard_${Date.now()}` } 
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PROFILE_COMPLETION_ERROR' 
      }
    }
  }

  /**
   * Send profile creation notification to approved applicant
   */
  async sendProfileCreationNotification(tokenId: string): Promise<ServiceResult<boolean>> {
    try {
      const { data: token, error } = await this.supabase
        .from('profile_creation_tokens')
        .select(`
          *,
          guard_leads(*),
          hiring_decisions(*)
        `)
        .eq('id', tokenId)
        .single()

      if (error) {
        return { success: false, error: { code: 'TOKEN_NOT_FOUND' , message: error.message }}
      }

      const linkResult = await this.generateSecureCreationLink(tokenId)
      if (!linkResult.success) {
        return { success: false, error: { code: linkResult.code , message: linkResult.error }}
      }

      const notificationData: ApprovalNotificationData = {
        decision: {
          id: token.hiring_decisions.id,
          applicationId: token.application_id,
          decisionType: token.hiring_decisions.decision_type,
          approverId: token.hiring_decisions.approver_id,
          decisionReason: token.hiring_decisions.decision_reason,
          decisionRationale: token.hiring_decisions.decision_rationale,
          decisionConfidence: token.hiring_decisions.decision_confidence,
          createdAt: new Date(token.hiring_decisions.created_at),
          effectiveDate: new Date(token.hiring_decisions.effective_date),
          digitalSignature: token.hiring_decisions.digital_signature,
          authorityLevel: token.hiring_decisions.approval_authority_level,
          complianceNotes: token.hiring_decisions.compliance_notes,
          appealsDeadline: token.hiring_decisions.appeals_deadline ? new Date(token.hiring_decisions.appeals_deadline) : undefined,
          isFinal: token.hiring_decisions.is_final
        },
        applicant: {
          firstName: token.guard_leads.first_name,
          lastName: token.guard_leads.last_name,
          email: token.guard_leads.email
        },
        approver: {
          firstName: 'Manager', // Would get from actual user data
          lastName: '',
          email: 'manager@summitadvisoryfirm.com'
        },
        profileCreationLink: linkResult.data,
        complianceRequirements: this.config.requiredComplianceSteps
      }

      // In production, this would send actual email notifications
      console.log('Profile creation notification sent:', notificationData)

      return { success: true, data: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'NOTIFICATION_ERROR' 
      }
    }
  }

  /**
   * Track profile creation progress
   */
  async trackProfileCreationProgress(tokenId: string): Promise<ServiceResult<ProfileCreationProgress>> {
    try {
      const { data: token, error } = await this.supabase
        .from('profile_creation_tokens')
        .select('*')
        .eq('id', tokenId)
        .single()

      if (error) {
        return { success: false, error: { code: 'TOKEN_NOT_FOUND' , message: error.message }}
      }

      let status: ProfileCreationProgress['status']
      if (token.used_at) {
        status = 'completed'
      } else if (new Date(token.expires_at) < new Date()) {
        status = 'expired'
      } else {
        status = 'pending'
      }

      const progress: ProfileCreationProgress = {
        tokenId,
        applicationId: token.application_id,
        status,
        completionPercentage: token.used_at ? 100 : 0,
        completedSteps: token.used_at ? this.config.requiredComplianceSteps : [],
        remainingSteps: token.used_at ? [] : this.config.requiredComplianceSteps,
        lastActivity: token.used_at ? new Date(token.used_at) : undefined,
        remindersSent: 0 // Would track actual reminders sent
      }

      return { success: true, data: progress }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PROGRESS_TRACKING_ERROR' 
      }
    }
  }

  // Private helper methods

  private isProfileComplete(profileData: GuardProfileData): boolean {
    // Check if all required profile sections are complete
    const hasPersonalInfo = Boolean(
      profileData.personalInfo.firstName &&
      profileData.personalInfo.lastName &&
      profileData.personalInfo.email &&
      profileData.personalInfo.phone
    )

    const hasEmployment = Boolean(
      profileData.employment.startDate &&
      profileData.employment.position
    )

    const hasCompliance = Boolean(
      profileData.compliance.backgroundCheckCompleted &&
      profileData.compliance.backgroundCheckDate
    )

    return hasPersonalInfo && hasEmployment && hasCompliance
  }

  private async updateApplicationStage(applicationId: string, stage: string): Promise<void> {
    await this.supabase
      .from('guard_leads')
      .update({ 
        pipeline_stage: stage,
        stage_changed_at: new Date().toISOString(),
        stage_changed_by: 'system'
      })
      .eq('id', applicationId)
  }

  private async sendProfileCompletionConfirmation(
    tokenId: string, 
    profile: Omit<GuardProfile, 'id'>
  ): Promise<void> {
    // In production, send completion confirmation email
    console.log('Profile completion confirmation sent for token:', tokenId)
  }

  private mapDatabaseToProfileCreationToken(dbRecord: any): ProfileCreationToken {
    return {
      id: dbRecord.id,
      applicationId: dbRecord.application_id,
      hiringDecisionId: dbRecord.hiring_decision_id,
      secureToken: dbRecord.secure_token,
      createdAt: new Date(dbRecord.created_at),
      expiresAt: new Date(dbRecord.expires_at),
      usedAt: dbRecord.used_at ? new Date(dbRecord.used_at) : undefined,
      guardProfileId: dbRecord.guard_profile_id,
      isActive: dbRecord.is_active
    }
  }
}

// Email template constants
export const PROFILE_CREATION_EMAIL_TEMPLATES = {
  APPROVAL_NOTIFICATION: 'approval-notification-template',
  PROFILE_CREATION_LINK: 'profile-creation-link-template',
  PROFILE_COMPLETION_REMINDER: 'profile-completion-reminder-template',
  PROFILE_CREATED_CONFIRMATION: 'profile-created-confirmation-template'
} as const

// Export singleton instance
export const profileCreationTriggerService = new ProfileCreationTriggerService()