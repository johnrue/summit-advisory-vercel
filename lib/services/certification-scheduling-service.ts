import { supabase } from '@/lib/supabase'
import { AuditService } from './audit-service'
import type { GuardCertification } from '@/lib/types'

/**
 * Certification Scheduling Service for Summit Advisory
 * Handles scheduling restrictions and overrides based on certification status
 */
export class CertificationSchedulingService {
  private static auditService = AuditService.getInstance()

  /**
   * Check if a guard can be scheduled for a shift
   */
  static async canGuardBeScheduled(guardId: string): Promise<{
    canSchedule: boolean
    reasons: string[]
    expiredCertifications: GuardCertification[]
    expiringWithin7Days: GuardCertification[]
  }> {
    try {
      // Get all active certifications for the guard
      const { data: certifications, error } = await supabase
        .from('guard_certifications')
        .select('*')
        .eq('guard_id', guardId)
        .eq('status', 'active')

      if (error) {
        throw new Error(`Failed to fetch guard certifications: ${error.message}`)
      }

      const reasons: string[] = []
      const expiredCertifications: GuardCertification[] = []
      const expiringWithin7Days: GuardCertification[] = []
      
      const today = new Date()
      const sevenDaysFromNow = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000))

      if (!certifications || certifications.length === 0) {
        reasons.push('No active certifications found')
        return {
          canSchedule: false,
          reasons,
          expiredCertifications: [],
          expiringWithin7Days: []
        }
      }

      // Check each certification
      for (const cert of certifications) {
        const expiryDate = new Date(cert.expiry_date)
        const mappedCert = this.mapDbCertification(cert)

        if (expiryDate < today) {
          expiredCertifications.push(mappedCert)
          reasons.push(`${cert.certification_type} expired on ${expiryDate.toDateString()}`)
        } else if (expiryDate <= sevenDaysFromNow) {
          expiringWithin7Days.push(mappedCert)
          // Don't block scheduling yet, but flag for attention
        }
      }

      const canSchedule = expiredCertifications.length === 0

      return {
        canSchedule,
        reasons,
        expiredCertifications,
        expiringWithin7Days
      }

    } catch (error) {
      return {
        canSchedule: false,
        reasons: ['Error checking certification status'],
        expiredCertifications: [],
        expiringWithin7Days: []
      }
    }
  }

  /**
   * Create emergency override for guard scheduling despite expired certifications
   */
  static async createEmergencyOverride({
    guardId,
    shiftId,
    reason,
    authorizedBy,
    expiryDate
  }: {
    guardId: string
    shiftId: string
    reason: string
    authorizedBy: string
    expiryDate: Date
  }): Promise<string> {
    try {
      // Create override record
      const { data: override, error } = await supabase
        .from('certification_overrides')
        .insert([{
          guard_id: guardId,
          shift_id: shiftId,
          override_reason: reason,
          authorized_by: authorizedBy,
          expires_at: expiryDate.toISOString(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create emergency override: ${error.message}`)
      }

      // Log the override in audit trail
      await this.auditService.logAction({
        action: 'created',
        entity_type: 'schedule',
        entity_id: override.id,
        details: {
          guardId,
          shiftId,
          reason,
          expiryDate: expiryDate.toISOString()
        },
        user_id: authorizedBy
      })

      return override.id

    } catch (error) {
      throw new Error('Failed to create emergency scheduling override')
    }
  }

  /**
   * Validate shift assignment against certification requirements
   */
  static async validateShiftAssignment(guardId: string, shiftId: string): Promise<{
    isValid: boolean
    warnings: string[]
    errors: string[]
    hasActiveOverride: boolean
  }> {
    try {
      const warnings: string[] = []
      const errors: string[] = []

      // Check guard scheduling eligibility
      const eligibility = await this.canGuardBeScheduled(guardId)

      if (!eligibility.canSchedule) {
        // Check for active emergency override
        const { data: override, error: overrideError } = await supabase
          .from('certification_overrides')
          .select('*')
          .eq('guard_id', guardId)
          .eq('shift_id', shiftId)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle()

        if (overrideError) {
        }

        if (override) {
          warnings.push(`Emergency override active until ${new Date(override.expires_at).toDateString()}`)
          warnings.push(`Override reason: ${override.override_reason}`)
          
          return {
            isValid: true,
            warnings,
            errors,
            hasActiveOverride: true
          }
        } else {
          errors.push(...eligibility.reasons)
          
          return {
            isValid: false,
            warnings,
            errors,
            hasActiveOverride: false
          }
        }
      }

      // Add warnings for certifications expiring soon
      if (eligibility.expiringWithin7Days.length > 0) {
        eligibility.expiringWithin7Days.forEach(cert => {
          const daysUntilExpiry = Math.ceil(
            (cert.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
          warnings.push(`${cert.certificationType} expires in ${daysUntilExpiry} days`)
        })
      }

      return {
        isValid: true,
        warnings,
        errors,
        hasActiveOverride: false
      }

    } catch (error) {
      return {
        isValid: false,
        warnings: [],
        errors: ['Error validating shift assignment'],
        hasActiveOverride: false
      }
    }
  }

  /**
   * Get guards available for scheduling (with valid certifications)
   */
  static async getAvailableGuards(): Promise<Array<{
    guardId: string
    guardName: string
    canSchedule: boolean
    certificationStatus: 'compliant' | 'expiring_soon' | 'expired'
    nextExpiryDate?: Date
    nextExpiryType?: string
  }>> {
    try {
      // Get all active guards with their certifications
      const { data: guards, error } = await supabase
        .from('guards')
        .select(`
          id,
          first_name,
          last_name,
          guard_certifications (
            certification_type,
            expiry_date,
            status
          )
        `)
        .eq('employment_status', 'active')

      if (error) {
        throw new Error(`Failed to fetch guards: ${error.message}`)
      }

      const availableGuards = []
      const today = new Date()
      const sevenDaysFromNow = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000))

      for (const guard of guards || []) {
        const certifications = guard.guard_certifications || []
        
        let canSchedule = true
        let certificationStatus: 'compliant' | 'expiring_soon' | 'expired' = 'compliant'
        let nextExpiryDate: Date | undefined
        let nextExpiryType: string | undefined

        // Check certification status
        let hasExpired = false
        let hasExpiringSoon = false

        for (const cert of certifications) {
          const expiryDate = new Date(cert.expiry_date)
          
          if (expiryDate < today && cert.status === 'active') {
            hasExpired = true
            canSchedule = false
          } else if (expiryDate <= sevenDaysFromNow && cert.status === 'active') {
            hasExpiringSoon = true
          }

          // Track next expiry
          if (!nextExpiryDate || expiryDate < nextExpiryDate) {
            nextExpiryDate = expiryDate
            nextExpiryType = cert.certification_type
          }
        }

        // Determine overall status
        if (hasExpired) {
          certificationStatus = 'expired'
        } else if (hasExpiringSoon) {
          certificationStatus = 'expiring_soon'
        }

        availableGuards.push({
          guardId: guard.id,
          guardName: `${guard.first_name} ${guard.last_name}`,
          canSchedule,
          certificationStatus,
          nextExpiryDate,
          nextExpiryType
        })
      }

      return availableGuards

    } catch (error) {
      return []
    }
  }

  /**
   * Get scheduling restrictions summary for a date range
   */
  static async getSchedulingRestrictionsReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalGuards: number
    availableGuards: number
    restrictedGuards: number
    emergencyOverrides: number
    restrictionReasons: Record<string, number>
  }> {
    try {
      const availableGuards = await this.getAvailableGuards()
      
      // Get emergency overrides for the period
      const { count: overrideCount } = await supabase
        .from('certification_overrides')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      const restrictionReasons: Record<string, number> = {}
      let restrictedCount = 0

      for (const guard of availableGuards) {
        if (!guard.canSchedule) {
          restrictedCount++
          const reason = guard.certificationStatus === 'expired' 
            ? 'Expired Certifications'
            : 'Other Restrictions'
          restrictionReasons[reason] = (restrictionReasons[reason] || 0) + 1
        }
      }

      return {
        totalGuards: availableGuards.length,
        availableGuards: availableGuards.length - restrictedCount,
        restrictedGuards: restrictedCount,
        emergencyOverrides: overrideCount || 0,
        restrictionReasons
      }

    } catch (error) {
      return {
        totalGuards: 0,
        availableGuards: 0,
        restrictedGuards: 0,
        emergencyOverrides: 0,
        restrictionReasons: {}
      }
    }
  }

  // Private helper method
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

// Add the override table to the migration if not already created
const createOverrideTableMigration = `
CREATE TABLE IF NOT EXISTS certification_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guard_id UUID NOT NULL,
  shift_id UUID,
  override_reason TEXT NOT NULL,
  authorized_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certification_overrides_guard_id ON certification_overrides(guard_id);
CREATE INDEX IF NOT EXISTS idx_certification_overrides_expires_at ON certification_overrides(expires_at);
CREATE INDEX IF NOT EXISTS idx_certification_overrides_created_at ON certification_overrides(created_at);
`