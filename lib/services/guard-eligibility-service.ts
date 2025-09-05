// Story 3.2: Guard Eligibility Service Implementation
// Manages guard eligibility checking with Epic 2 integration and comprehensive scoring

import { supabase } from '@/lib/supabase';
import {
  ServiceResult,
  GuardEligibilityResult,
  AssignmentConflict,
  CertificationMatch,
  AvailabilityMatch,
  GuardAvailability,
  AssignmentErrorCodes
} from '@/lib/types/assignment-types';
import { Shift } from '@/lib/types/shift-types';

export class GuardEligibilityService {
  /**
   * Get eligible guards for a specific shift with comprehensive scoring
   */
  static async getEligibleGuards(shiftId: string): Promise<ServiceResult<GuardEligibilityResult[]>> {
    try {
      // Get shift details with requirements
      const { data: shift, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (shiftError || !shift) {
        return {
          success: false,
          error: {
            code: AssignmentErrorCodes.SHIFT_NOT_FOUND,
            message: 'Shift not found',
            details: shiftError
          }
        };
      }

      // Get all active guards from Epic 2 guard_profiles
      const { data: guards, error: guardsError } = await supabase
        .from('guard_profiles')
        .select(`
          id,
          first_name,
          last_name,
          profile_status,
          is_schedulable,
          certification_status,
          location_data,
          performance_metrics,
          created_at
        `)
        .eq('profile_status', 'approved')
        .eq('is_schedulable', true);

      if (guardsError) {
        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch guards',
            details: guardsError
          }
        };
      }

      // Check eligibility for each guard
      const eligibilityResults: GuardEligibilityResult[] = [];

      for (const guard of guards || []) {
        const eligibility = await this.checkGuardEligibility(guard.id, shift);
        eligibilityResults.push(eligibility);
      }

      // Sort by eligibility score (highest first)
      eligibilityResults.sort((a, b) => b.eligibilityScore - a.eligibilityScore);

      return {
        success: true,
        data: eligibilityResults
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to check guard eligibility',
          details: error
        }
      };
    }
  }

  /**
   * Check eligibility for a specific guard and shift
   */
  static async checkGuardEligibility(guardId: string, shift: Shift): Promise<GuardEligibilityResult> {
    try {
      const reasons: string[] = [];
      const conflicts: AssignmentConflict[] = [];
      let eligibilityScore = 0;
      let eligible = true;

      // Get guard profile data from Epic 2
      const { data: guard } = await supabase
        .from('guard_profiles')
        .select(`
          id,
          first_name,
          last_name,
          profile_status,
          is_schedulable,
          certification_status,
          location_data,
          performance_metrics
        `)
        .eq('id', guardId)
        .single();

      if (!guard) {
        return {
          guardId,
          eligible: false,
          eligibilityScore: 0,
          reasons: ['Guard profile not found'],
          conflicts: []
        };
      }

      // 1. Basic Status Check (25% weight)
      if (guard.profile_status !== 'approved') {
        eligible = false;
        reasons.push('Guard profile not approved');
      } else if (!guard.is_schedulable) {
        eligible = false;
        reasons.push('Guard not available for scheduling');
      } else {
        eligibilityScore += 0.25;
        reasons.push('Guard status approved and schedulable');
      }

      // 2. Certification Validation (35% weight)
      const certificationMatch = await this.validateCertifications(
        guard.certification_status || {},
        shift.requiredCertifications || []
      );
      
      if (certificationMatch.missing.length === 0) {
        eligibilityScore += 0.35;
        reasons.push('All required certifications met');
      } else if (certificationMatch.criticalMissing.length > 0) {
        eligible = false;
        reasons.push(`Missing critical certifications: ${certificationMatch.criticalMissing.join(', ')}`);
        conflicts.push({
          conflictType: 'certification_missing',
          severity: 'error',
          message: 'Missing required certifications',
          details: { missingCertifications: certificationMatch.criticalMissing },
          canOverride: false,
          overrideRequired: false
        });
      } else {
        // Partial certification match
        eligibilityScore += 0.35 * certificationMatch.matchPercentage;
        reasons.push(`Partial certification match: ${certificationMatch.matchPercentage * 100}%`);
      }

      // 3. Conflict Detection (25% weight)
      const conflictCheck = await this.checkTimeConflicts(guardId, shift);
      
      if (!conflictCheck.hasConflicts) {
        eligibilityScore += 0.25;
        reasons.push('No scheduling conflicts');
      } else {
        conflicts.push(...conflictCheck.conflicts);
        if (conflictCheck.conflicts.some(c => c.severity === 'critical')) {
          eligible = false;
          reasons.push('Critical scheduling conflicts detected');
        } else {
          eligibilityScore += 0.1; // Reduced score for minor conflicts
          reasons.push('Minor scheduling conflicts detected');
        }
      }

      // 4. Availability Match (15% weight)
      const availabilityMatch = await this.checkAvailabilityMatch(guardId, shift);
      
      if (availabilityMatch.overlapPercentage >= 0.8) {
        eligibilityScore += 0.15;
        reasons.push('Excellent availability match');
      } else if (availabilityMatch.overlapPercentage >= 0.5) {
        eligibilityScore += 0.1;
        reasons.push('Good availability match');
      } else if (availabilityMatch.emergencyOnly) {
        eligibilityScore += 0.05;
        reasons.push('Available for emergency only');
      } else {
        reasons.push('Limited availability match');
      }

      // Calculate proximity score (bonus up to 10%)
      const proximityScore = await this.calculateProximityScore(
        guard.location_data,
        shift.locationData
      );
      
      if (proximityScore > 0.8) {
        eligibilityScore = Math.min(1, eligibilityScore + 0.1);
        reasons.push('Excellent location proximity');
      } else if (proximityScore > 0.5) {
        eligibilityScore = Math.min(1, eligibilityScore + 0.05);
        reasons.push('Good location proximity');
      }

      // Performance bonus (up to 5%)
      const performanceScore = this.calculatePerformanceScore(guard.performance_metrics || {});
      if (performanceScore > 0.8) {
        eligibilityScore = Math.min(1, eligibilityScore + 0.05);
        reasons.push('Excellent performance history');
      }

      return {
        guardId,
        eligible: eligible && eligibilityScore > 0.3, // Minimum eligibility threshold
        eligibilityScore: Math.round(eligibilityScore * 100) / 100,
        reasons,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        certificationMatch,
        availabilityMatch,
        proximityScore,
        performanceScore
      };

    } catch (error) {
      return {
        guardId,
        eligible: false,
        eligibilityScore: 0,
        reasons: ['Error checking eligibility'],
        conflicts: []
      };
    }
  }

  /**
   * Validate guard certifications against shift requirements
   */
  private static async validateCertifications(
    guardCertifications: any,
    requiredCertifications: string[]
  ): Promise<CertificationMatch> {
    const available = Object.keys(guardCertifications).filter(cert => 
      guardCertifications[cert]?.status === 'active' &&
      guardCertifications[cert]?.expiryDate &&
      new Date(guardCertifications[cert].expiryDate) > new Date()
    );

    const matched = requiredCertifications.filter(req => available.includes(req));
    const missing = requiredCertifications.filter(req => !available.includes(req));
    
    // Define critical certifications (these must be present)
    const criticalCertifications = ['TOPS', 'Basic_Security', 'CPR'];
    const criticalMissing = missing.filter(cert => criticalCertifications.includes(cert));

    const matchPercentage = requiredCertifications.length > 0 
      ? matched.length / requiredCertifications.length 
      : 1;

    return {
      required: requiredCertifications,
      available,
      matched,
      missing,
      matchPercentage,
      criticalMissing
    };
  }

  /**
   * Check for time conflicts with existing assignments
   */
  private static async checkTimeConflicts(guardId: string, shift: Shift): Promise<{
    hasConflicts: boolean;
    conflicts: AssignmentConflict[];
  }> {
    try {
      // Use the database function for conflict detection
      const { data: conflictData } = await supabase
        .rpc('detect_assignment_conflicts', {
          p_guard_id: guardId,
          p_time_range: `[${(shift.timeRange as any).start?.toISOString() || shift.timeRange.startTime}, ${(shift.timeRange as any).end?.toISOString() || shift.timeRange.endTime})`
        });

      if (!conflictData || !conflictData.has_conflicts) {
        return { hasConflicts: false, conflicts: [] };
      }

      const conflicts: AssignmentConflict[] = conflictData.conflicts.map((conflict: any) => ({
        conflictType: 'time_overlap' as const,
        severity: 'warning' as const,
        message: `Time overlap with shift: ${conflict.shift_title}`,
        details: {
          shiftId: conflict.shift_id,
          shiftTitle: conflict.shift_title,
          timeRange: {
            start: new Date(conflict.time_range.start),
            end: new Date(conflict.time_range.end)
          },
          conflictingAssignmentId: conflict.assignment_id
        },
        canOverride: conflict.status !== 'confirmed',
        overrideRequired: true
      }));

      return {
        hasConflicts: true,
        conflicts
      };

    } catch (error) {
      return { hasConflicts: false, conflicts: [] };
    }
  }

  /**
   * Check guard availability against shift time
   */
  private static async checkAvailabilityMatch(guardId: string, shift: Shift): Promise<AvailabilityMatch> {
    try {
      const { data: availabilityWindows } = await supabase
        .from('guard_availability')
        .select('*')
        .eq('guard_id', guardId)
        .eq('status', 'active')
        .overlaps('availability_window', `[${(shift.timeRange as any).start?.toISOString() || shift.timeRange.startTime}, ${(shift.timeRange as any).end?.toISOString() || shift.timeRange.endTime})`);

      const shiftStart = new Date((shift.timeRange as any).start || shift.timeRange.startTime);
      const shiftEnd = new Date((shift.timeRange as any).end || shift.timeRange.endTime);
      const shiftDuration = shiftEnd.getTime() - shiftStart.getTime();
      let overlapDuration = 0;
      let hasPreferredMatch = false;
      let isEmergencyOnly = false;

      for (const window of availabilityWindows || []) {
        const windowStart = new Date(window.availability_window.split(',')[0].substring(1));
        const windowEnd = new Date(window.availability_window.split(',')[1].slice(0, -1));
        
        const overlapStart = new Date(Math.max(shiftStart.getTime(), windowStart.getTime()));
        const overlapEnd = new Date(Math.min(shiftEnd.getTime(), windowEnd.getTime()));
        
        if (overlapStart < overlapEnd) {
          overlapDuration += overlapEnd.getTime() - overlapStart.getTime();
        }

        if (window.availability_type === 'preferred') {
          hasPreferredMatch = true;
        }
        if (window.availability_type === 'emergency_only') {
          isEmergencyOnly = true;
        }
      }

      const overlapPercentage = shiftDuration > 0 ? overlapDuration / shiftDuration : 0;

      return {
        requestedWindow: { start: shiftStart, end: shiftEnd },
        availabilityWindows: availabilityWindows || [],
        overlapPercentage,
        preferredMatch: hasPreferredMatch,
        emergencyOnly: isEmergencyOnly && !hasPreferredMatch
      };

    } catch (error) {
      return {
        requestedWindow: { start: new Date((shift.timeRange as any).start || shift.timeRange.startTime), end: new Date((shift.timeRange as any).end || shift.timeRange.endTime) },
        availabilityWindows: [],
        overlapPercentage: 0,
        preferredMatch: false,
        emergencyOnly: false
      };
    }
  }

  /**
   * Calculate proximity score based on guard and shift locations
   */
  private static async calculateProximityScore(guardLocation: any, shiftLocation: any): Promise<number> {
    try {
      if (!guardLocation?.coordinates || !shiftLocation?.coordinates) {
        return 0.5; // Default score for missing location data
      }

      // Simple distance calculation (Haversine formula could be used for more accuracy)
      const lat1 = guardLocation.coordinates.lat;
      const lon1 = guardLocation.coordinates.lng;
      const lat2 = shiftLocation.coordinates.lat;
      const lon2 = shiftLocation.coordinates.lng;

      const distance = Math.sqrt(
        Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2)
      );

      // Convert to proximity score (inverse relationship)
      // Closer locations get higher scores
      if (distance < 0.1) return 1.0;      // Very close
      if (distance < 0.3) return 0.8;      // Close
      if (distance < 0.5) return 0.6;      // Moderate
      if (distance < 1.0) return 0.4;      // Far
      return 0.2;                          // Very far

    } catch (error) {
      return 0.5; // Default score on error
    }
  }

  /**
   * Calculate performance score from historical metrics
   */
  private static calculatePerformanceScore(performanceMetrics: any): number {
    try {
      // Extract key performance indicators
      const onTimeRate = performanceMetrics.on_time_rate || 0.8;
      const completionRate = performanceMetrics.completion_rate || 0.9;
      const clientRating = performanceMetrics.client_rating || 4.0;
      const incidentRate = performanceMetrics.incident_rate || 0.05;

      // Weighted performance calculation
      const score = (
        onTimeRate * 0.3 +           // 30% weight on punctuality
        completionRate * 0.25 +      // 25% weight on completion
        (clientRating / 5) * 0.25 +  // 25% weight on client rating
        (1 - incidentRate) * 0.2     // 20% weight on low incident rate
      );

      return Math.max(0, Math.min(1, score));

    } catch (error) {
      return 0.8; // Default good performance score
    }
  }

  /**
   * Bulk eligibility check for multiple guards and shifts
   */
  static async bulkEligibilityCheck(
    guardIds: string[],
    shiftIds: string[]
  ): Promise<ServiceResult<{ guardId: string; shiftId: string; eligibility: GuardEligibilityResult }[]>> {
    try {
      const results: { guardId: string; shiftId: string; eligibility: GuardEligibilityResult }[] = [];

      // Get all shifts data
      const { data: shifts } = await supabase
        .from('shifts')
        .select('*')
        .in('id', shiftIds);

      if (!shifts) {
        return {
          success: false,
          error: {
            code: AssignmentErrorCodes.SHIFT_NOT_FOUND,
            message: 'No shifts found'
          }
        };
      }

      // Check eligibility for each guard-shift combination
      for (const guardId of guardIds) {
        for (const shift of shifts) {
          const eligibility = await this.checkGuardEligibility(guardId, shift);
          results.push({
            guardId,
            shiftId: shift.id,
            eligibility
          });
        }
      }

      return {
        success: true,
        data: results
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to perform bulk eligibility check',
          details: error
        }
      };
    }
  }

  /**
   * Get eligibility summary statistics for a shift
   */
  static async getEligibilitySummary(shiftId: string): Promise<ServiceResult<{
    totalGuards: number;
    eligibleGuards: number;
    highlyQualified: number;
    needsOverride: number;
    unavailable: number;
  }>> {
    try {
      const eligibilityResult = await this.getEligibleGuards(shiftId);
      
      if (!eligibilityResult.success || !eligibilityResult.data) {
        return eligibilityResult as any;
      }

      const eligibilityData = eligibilityResult.data;
      const totalGuards = eligibilityData.length;
      const eligibleGuards = eligibilityData.filter(g => g.eligible).length;
      const highlyQualified = eligibilityData.filter(g => g.eligibilityScore >= 0.8).length;
      const needsOverride = eligibilityData.filter(g => 
        !g.eligible && g.conflicts?.some(c => c.canOverride)
      ).length;
      const unavailable = totalGuards - eligibleGuards - needsOverride;

      return {
        success: true,
        data: {
          totalGuards,
          eligibleGuards,
          highlyQualified,
          needsOverride,
          unavailable
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to generate eligibility summary',
          details: error
        }
      };
    }
  }
}