// Story 3.2: Conflict Detection Service Implementation
// Advanced conflict detection with TSTZRANGE overlap checking and resolution suggestions

import { supabase } from '@/lib/supabase';
import {
  ServiceResult,
  AssignmentConflict,
  GuardAvailability,
  AssignmentErrorCodes
} from '@/lib/types/assignment-types';
import { Shift } from '@/lib/types/shift-types';

export class ConflictDetectionService {
  /**
   * Comprehensive conflict detection for guard assignment
   */
  static async detectAssignmentConflicts(
    guardId: string,
    shiftId: string,
    overrideExisting = false
  ): Promise<ServiceResult<{
    hasConflicts: boolean;
    conflicts: AssignmentConflict[];
    canProceed: boolean;
    requiresOverride: boolean;
    resolutionSuggestions: string[];
  }>> {
    try {
      // Get shift details
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

      const conflicts: AssignmentConflict[] = [];
      const resolutionSuggestions: string[] = [];

      // 1. Time Overlap Conflicts
      const timeConflicts = await this.detectTimeConflicts(guardId, shift);
      conflicts.push(...timeConflicts);

      // 2. Availability Conflicts
      const availabilityConflicts = await this.detectAvailabilityConflicts(guardId, shift);
      conflicts.push(...availabilityConflicts);

      // 3. Certification Conflicts
      const certificationConflicts = await this.detectCertificationConflicts(guardId, shift);
      conflicts.push(...certificationConflicts);

      // 4. Location Distance Conflicts
      const locationConflicts = await this.detectLocationConflicts(guardId, shift);
      conflicts.push(...locationConflicts);

      // 5. Workload Conflicts (daily/weekly hour limits)
      const workloadConflicts = await this.detectWorkloadConflicts(guardId, shift);
      conflicts.push(...workloadConflicts);

      // Determine if assignment can proceed
      const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
      const errorConflicts = conflicts.filter(c => c.severity === 'error');
      const overridableConflicts = conflicts.filter(c => c.canOverride);

      const hasConflicts = conflicts.length > 0;
      const canProceed = criticalConflicts.length === 0 && (errorConflicts.length === 0 || overrideExisting);
      const requiresOverride = errorConflicts.length > 0 && overridableConflicts.length > 0;

      // Generate resolution suggestions
      if (timeConflicts.length > 0) {
        resolutionSuggestions.push('Consider adjusting shift timing to avoid overlaps');
        resolutionSuggestions.push('Check if existing assignment can be reassigned');
      }

      if (availabilityConflicts.length > 0) {
        resolutionSuggestions.push('Verify guard availability or mark as emergency assignment');
        resolutionSuggestions.push('Contact guard to confirm availability');
      }

      if (certificationConflicts.length > 0) {
        resolutionSuggestions.push('Assign guard with required certifications');
        resolutionSuggestions.push('Consider expedited certification process if close to completion');
      }

      if (locationConflicts.length > 0) {
        resolutionSuggestions.push('Consider travel time and transportation arrangements');
        resolutionSuggestions.push('Look for guards with closer proximity');
      }

      return {
        success: true,
        data: {
          hasConflicts,
          conflicts,
          canProceed,
          requiresOverride,
          resolutionSuggestions
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to detect assignment conflicts',
          details: error
        }
      };
    }
  }

  /**
   * Detect time overlap conflicts with existing assignments
   */
  private static async detectTimeConflicts(guardId: string, shift: Shift): Promise<AssignmentConflict[]> {
    try {
      // Use database function for efficient conflict detection
      const { data: conflictData } = await supabase
        .rpc('detect_assignment_conflicts', {
          p_guard_id: guardId,
          p_time_range: `[${new Date(shift.timeRange.startTime).toISOString()}, ${new Date(shift.timeRange.endTime).toISOString()})`
        });

      if (!conflictData || !conflictData.has_conflicts) {
        return [];
      }

      return conflictData.conflicts.map((conflict: any) => {
        const overlapDuration = this.calculateOverlapDuration(
          {
            start: new Date(conflict.time_range.start),
            end: new Date(conflict.time_range.end)
          },
          {
            start: new Date(shift.timeRange.startTime),
            end: new Date(shift.timeRange.endTime)
          }
        );

        const severity = overlapDuration > 0.8 ? 'critical' : 
                        overlapDuration > 0.5 ? 'error' : 'warning';

        return {
          conflictType: 'time_overlap' as const,
          severity,
          message: `Time overlap with "${conflict.shift_title}" (${Math.round(overlapDuration * 100)}% overlap)`,
          details: {
            shiftId: conflict.shift_id,
            shiftTitle: conflict.shift_title,
            timeRange: {
              start: new Date(conflict.time_range.start),
              end: new Date(conflict.time_range.end)
            }
          },
          canOverride: conflict.status !== 'confirmed' && overlapDuration < 0.8,
          overrideRequired: true
        };
      });

    } catch (error) {
      console.error('Error detecting time conflicts:', error);
      return [];
    }
  }

  /**
   * Detect conflicts with guard availability preferences
   */
  private static async detectAvailabilityConflicts(guardId: string, shift: Shift): Promise<AssignmentConflict[]> {
    try {
      const conflicts: AssignmentConflict[] = [];

      // Check for unavailable periods
      const { data: unavailablePeriods } = await supabase
        .from('guard_availability')
        .select('*')
        .eq('guard_id', guardId)
        .eq('availability_type', 'unavailable')
        .eq('status', 'active')
        .overlaps('availability_window', `[${new Date(shift.timeRange.startTime).toISOString()}, ${new Date(shift.timeRange.endTime).toISOString()})`);

      for (const period of unavailablePeriods || []) {
        conflicts.push({
          conflictType: 'availability_conflict',
          severity: 'error',
          message: 'Guard marked as unavailable during shift time',
          details: {
            availabilityType: 'unavailable'
          },
          canOverride: true,
          overrideRequired: true
        });
      }

      // Check for emergency-only availability
      const { data: emergencyOnly } = await supabase
        .from('guard_availability')
        .select('*')
        .eq('guard_id', guardId)
        .eq('availability_type', 'emergency_only')
        .eq('status', 'active')
        .overlaps('availability_window', `[${new Date(shift.timeRange.startTime).toISOString()}, ${new Date(shift.timeRange.endTime).toISOString()})`);

      if (emergencyOnly && emergencyOnly.length > 0 && shift.priority < 5) {
        conflicts.push({
          conflictType: 'availability_conflict',
          severity: 'warning',
          message: 'Guard available for emergency shifts only',
          details: {
            availabilityType: 'emergency_only'
          },
          canOverride: true,
          overrideRequired: false
        });
      }

      return conflicts;

    } catch (error) {
      console.error('Error detecting availability conflicts:', error);
      return [];
    }
  }

  /**
   * Detect certification requirement conflicts
   */
  private static async detectCertificationConflicts(guardId: string, shift: Shift): Promise<AssignmentConflict[]> {
    try {
      // Get guard certifications from Epic 2
      const { data: guard } = await supabase
        .from('guard_profiles')
        .select('certification_status')
        .eq('id', guardId)
        .single();

      if (!guard) {
        return [{
          conflictType: 'certification_missing',
          severity: 'critical',
          message: 'Guard profile not found',
          details: {},
          canOverride: false,
          overrideRequired: false
        }];
      }

      const guardCertifications = guard.certification_status || {};
      const requiredCertifications = shift.requiredCertifications || [];
      const conflicts: AssignmentConflict[] = [];

      const activeCertifications = Object.keys(guardCertifications).filter(cert => 
        guardCertifications[cert]?.status === 'active' &&
        guardCertifications[cert]?.expiryDate &&
        new Date(guardCertifications[cert].expiryDate) > new Date()
      );

      const missingCertifications = requiredCertifications.filter(
        req => !activeCertifications.includes(req)
      );

      if (missingCertifications.length > 0) {
        // Critical certifications that cannot be overridden
        const criticalCertifications = ['TOPS', 'Basic_Security'];
        const criticalMissing = missingCertifications.filter(cert => 
          criticalCertifications.includes(cert)
        );

        if (criticalMissing.length > 0) {
          conflicts.push({
            conflictType: 'certification_missing',
            severity: 'critical',
            message: `Missing critical certifications: ${criticalMissing.join(', ')}`,
            details: {
              missingCertifications: criticalMissing
            },
            canOverride: false,
            overrideRequired: false
          });
        }

        // Non-critical missing certifications
        const nonCriticalMissing = missingCertifications.filter(cert => 
          !criticalCertifications.includes(cert)
        );

        if (nonCriticalMissing.length > 0) {
          conflicts.push({
            conflictType: 'certification_missing',
            severity: 'error',
            message: `Missing certifications: ${nonCriticalMissing.join(', ')}`,
            details: {
              missingCertifications: nonCriticalMissing
            },
            canOverride: true,
            overrideRequired: true
          });
        }
      }

      // Check for expiring certifications (within 30 days)
      const expiringCertifications = requiredCertifications.filter(req => {
        const cert = guardCertifications[req];
        if (cert && cert.expiryDate) {
          const expiryDate = new Date(cert.expiryDate);
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          return expiryDate <= thirtyDaysFromNow;
        }
        return false;
      });

      if (expiringCertifications.length > 0) {
        conflicts.push({
          conflictType: 'certification_missing',
          severity: 'warning',
          message: `Certifications expiring soon: ${expiringCertifications.join(', ')}`,
          details: {
            missingCertifications: expiringCertifications
          },
          canOverride: true,
          overrideRequired: false
        });
      }

      return conflicts;

    } catch (error) {
      console.error('Error detecting certification conflicts:', error);
      return [];
    }
  }

  /**
   * Detect location distance conflicts
   */
  private static async detectLocationConflicts(guardId: string, shift: Shift): Promise<AssignmentConflict[]> {
    try {
      const conflicts: AssignmentConflict[] = [];

      // Get guard location data
      const { data: guard } = await supabase
        .from('guard_profiles')
        .select('location_data')
        .eq('id', guardId)
        .single();

      if (!guard?.location_data?.coordinates || !shift.locationData?.coordinates) {
        return conflicts; // Skip if location data is missing
      }

      // Calculate distance (simplified calculation)
      const guardLat = guard.location_data.coordinates.lat;
      const guardLng = guard.location_data.coordinates.lng;
      const shiftLat = shift.locationData.coordinates.lat;
      const shiftLng = shift.locationData.coordinates.lng;

      const distance = Math.sqrt(
        Math.pow(shiftLat - guardLat, 2) + Math.pow(shiftLng - guardLng, 2)
      );

      // Check for excessive distance (threshold values)
      if (distance > 1.0) { // Very far
        conflicts.push({
          conflictType: 'location_conflict',
          severity: 'warning',
          message: 'Guard location is very far from shift site',
          details: {},
          canOverride: true,
          overrideRequired: false
        });
      } else if (distance > 0.5) { // Moderately far
        conflicts.push({
          conflictType: 'location_conflict',
          severity: 'warning',
          message: 'Guard location requires significant travel time',
          details: {},
          canOverride: true,
          overrideRequired: false
        });
      }

      // Check for consecutive shift travel conflicts
      const consecutiveConflicts = await this.checkConsecutiveShiftTravel(guardId, shift);
      conflicts.push(...consecutiveConflicts);

      return conflicts;

    } catch (error) {
      console.error('Error detecting location conflicts:', error);
      return [];
    }
  }

  /**
   * Detect workload conflicts (daily/weekly hour limits)
   */
  private static async detectWorkloadConflicts(guardId: string, shift: Shift): Promise<AssignmentConflict[]> {
    try {
      const conflicts: AssignmentConflict[] = [];
      const shiftHours = (new Date(shift.timeRange.endTime).getTime() - new Date(shift.timeRange.startTime).getTime()) / (1000 * 60 * 60);

      // Check daily hour limit (12 hours max per day)
      const dayStart = new Date(shift.timeRange.startTime);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const { data: dailyAssignments } = await supabase
        .from('shift_assignments')
        .select(`
          shift_id,
          shifts!inner (
            time_range,
            title
          )
        `)
        .eq('guard_id', guardId)
        .in('assignment_status', ['accepted', 'confirmed'])
        .gte('shifts.time_range', dayStart.toISOString())
        .lt('shifts.time_range', dayEnd.toISOString());

      let dailyHours = shiftHours;
      for (const assignment of dailyAssignments || []) {
        if (assignment.shifts && assignment.shifts.time_range) {
          const assignmentStart = new Date(assignment.shifts.time_range.split(',')[0].substring(1));
          const assignmentEnd = new Date(assignment.shifts.time_range.split(',')[1].slice(0, -1));
          const assignmentHours = (assignmentEnd.getTime() - assignmentStart.getTime()) / (1000 * 60 * 60);
          dailyHours += assignmentHours;
        }
      }

      if (dailyHours > 12) {
        conflicts.push({
          conflictType: 'time_overlap',
          severity: 'error',
          message: `Daily hour limit exceeded (${Math.round(dailyHours)} hours > 12 hours limit)`,
          details: {},
          canOverride: true,
          overrideRequired: true
        });
      } else if (dailyHours > 10) {
        conflicts.push({
          conflictType: 'time_overlap',
          severity: 'warning',
          message: `High daily workload (${Math.round(dailyHours)} hours)`,
          details: {},
          canOverride: true,
          overrideRequired: false
        });
      }

      // Check weekly hour limit (60 hours max per week)
      const weekStart = new Date(shift.timeRange.startTime);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const { data: weeklyAssignments } = await supabase
        .from('shift_assignments')
        .select(`
          shift_id,
          shifts!inner (
            time_range,
            title
          )
        `)
        .eq('guard_id', guardId)
        .in('assignment_status', ['accepted', 'confirmed'])
        .gte('shifts.time_range', weekStart.toISOString())
        .lt('shifts.time_range', weekEnd.toISOString());

      let weeklyHours = shiftHours;
      for (const assignment of weeklyAssignments || []) {
        if (assignment.shifts && assignment.shifts.time_range) {
          const assignmentStart = new Date(assignment.shifts.time_range.split(',')[0].substring(1));
          const assignmentEnd = new Date(assignment.shifts.time_range.split(',')[1].slice(0, -1));
          const assignmentHours = (assignmentEnd.getTime() - assignmentStart.getTime()) / (1000 * 60 * 60);
          weeklyHours += assignmentHours;
        }
      }

      if (weeklyHours > 60) {
        conflicts.push({
          conflictType: 'time_overlap',
          severity: 'error',
          message: `Weekly hour limit exceeded (${Math.round(weeklyHours)} hours > 60 hours limit)`,
          details: {},
          canOverride: true,
          overrideRequired: true
        });
      } else if (weeklyHours > 50) {
        conflicts.push({
          conflictType: 'time_overlap',
          severity: 'warning',
          message: `High weekly workload (${Math.round(weeklyHours)} hours)`,
          details: {},
          canOverride: true,
          overrideRequired: false
        });
      }

      return conflicts;

    } catch (error) {
      console.error('Error detecting workload conflicts:', error);
      return [];
    }
  }

  /**
   * Check for travel time conflicts between consecutive shifts
   */
  private static async checkConsecutiveShiftTravel(guardId: string, shift: Shift): Promise<AssignmentConflict[]> {
    const conflicts: AssignmentConflict[] = [];
    const bufferTime = 2 * 60 * 60 * 1000; // 2 hours buffer

    try {
      // Check shifts ending within buffer time before this shift
      const beforeShiftStart = new Date(new Date(shift.timeRange.startTime).getTime() - bufferTime);
      const { data: previousShifts } = await supabase
        .from('shift_assignments')
        .select(`
          shift_id,
          shifts!inner (
            time_range,
            title,
            location_data
          )
        `)
        .eq('guard_id', guardId)
        .in('assignment_status', ['accepted', 'confirmed'])
        .gte('shifts.time_range', beforeShiftStart.toISOString())
        .lt('shifts.time_range', new Date(shift.timeRange.startTime).toISOString());

      // Check shifts starting within buffer time after this shift
      const afterShiftEnd = new Date(new Date(shift.timeRange.endTime).getTime() + bufferTime);
      const { data: nextShifts } = await supabase
        .from('shift_assignments')
        .select(`
          shift_id,
          shifts!inner (
            time_range,
            title,
            location_data
          )
        `)
        .eq('guard_id', guardId)
        .in('assignment_status', ['accepted', 'confirmed'])
        .gt('shifts.time_range', new Date(shift.timeRange.endTime).toISOString())
        .lte('shifts.time_range', afterShiftEnd.toISOString());

      // Analyze previous shifts
      for (const prevShift of previousShifts || []) {
        if (prevShift.shifts?.location_data && shift.locationData) {
          const travelTime = this.calculateTravelTime(
            prevShift.shifts.location_data,
            shift.locationData
          );

          const prevShiftEnd = new Date(prevShift.shifts.time_range.split(',')[1].slice(0, -1));
          const actualBuffer = new Date(shift.timeRange.startTime).getTime() - prevShiftEnd.getTime();

          if (travelTime > actualBuffer) {
            conflicts.push({
              conflictType: 'location_conflict',
              severity: 'warning',
              message: `Insufficient travel time from previous shift "${prevShift.shifts.title}"`,
              details: {
                shiftId: prevShift.shift_id,
                shiftTitle: prevShift.shifts.title
              },
              canOverride: true,
              overrideRequired: false
            });
          }
        }
      }

      // Analyze next shifts
      for (const nextShift of nextShifts || []) {
        if (nextShift.shifts?.location_data && shift.locationData) {
          const travelTime = this.calculateTravelTime(
            shift.locationData,
            nextShift.shifts.location_data
          );

          const nextShiftStart = new Date(nextShift.shifts.time_range.split(',')[0].substring(1));
          const actualBuffer = nextShiftStart.getTime() - new Date(shift.timeRange.endTime).getTime();

          if (travelTime > actualBuffer) {
            conflicts.push({
              conflictType: 'location_conflict',
              severity: 'warning',
              message: `Insufficient travel time to next shift "${nextShift.shifts.title}"`,
              details: {
                shiftId: nextShift.shift_id,
                shiftTitle: nextShift.shifts.title
              },
              canOverride: true,
              overrideRequired: false
            });
          }
        }
      }

      return conflicts;

    } catch (error) {
      console.error('Error checking consecutive shift travel:', error);
      return [];
    }
  }

  /**
   * Calculate overlap duration percentage between two time ranges
   */
  private static calculateOverlapDuration(
    range1: { start: Date; end: Date },
    range2: { start: Date; end: Date }
  ): number {
    const overlapStart = new Date(Math.max(range1.start.getTime(), range2.start.getTime()));
    const overlapEnd = new Date(Math.min(range1.end.getTime(), range2.end.getTime()));

    if (overlapStart >= overlapEnd) {
      return 0; // No overlap
    }

    const overlapDuration = overlapEnd.getTime() - overlapStart.getTime();
    const totalDuration = Math.min(
      range1.end.getTime() - range1.start.getTime(),
      range2.end.getTime() - range2.start.getTime()
    );

    return totalDuration > 0 ? overlapDuration / totalDuration : 0;
  }

  /**
   * Calculate estimated travel time between locations (simplified)
   */
  private static calculateTravelTime(location1: any, location2: any): number {
    if (!location1?.coordinates || !location2?.coordinates) {
      return 30 * 60 * 1000; // Default 30 minutes
    }

    // Simple distance-based travel time calculation
    const lat1 = location1.coordinates.lat;
    const lng1 = location1.coordinates.lng;
    const lat2 = location2.coordinates.lat;
    const lng2 = location2.coordinates.lng;

    const distance = Math.sqrt(
      Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2)
    );

    // Convert distance to travel time (rough approximation)
    const travelTimeMinutes = distance * 60; // Assuming 1 degree = 60 minutes
    return Math.max(15, travelTimeMinutes) * 60 * 1000; // Minimum 15 minutes
  }

  /**
   * Batch conflict detection for multiple assignments
   */
  static async batchConflictDetection(
    assignments: { guardId: string; shiftId: string }[]
  ): Promise<ServiceResult<{
    guardId: string;
    shiftId: string;
    conflicts: AssignmentConflict[];
    canAssign: boolean;
  }[]>> {
    try {
      const results = [];

      for (const { guardId, shiftId } of assignments) {
        const conflictResult = await this.detectAssignmentConflicts(guardId, shiftId);
        
        results.push({
          guardId,
          shiftId,
          conflicts: conflictResult.success ? conflictResult.data!.conflicts : [],
          canAssign: conflictResult.success ? conflictResult.data!.canProceed : false
        });
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
          message: 'Failed to perform batch conflict detection',
          details: error
        }
      };
    }
  }
}