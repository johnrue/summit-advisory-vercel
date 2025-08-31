// Story 3.2: Guard Matching Service Implementation
// AI-powered guard matching with comprehensive scoring and Epic 2 integration

import { supabase } from '@/lib/supabase';
import {
  ServiceResult,
  GuardMatchResult,
  GuardEligibilityResult,
  AssignmentErrorCodes
} from '@/lib/types/assignment-types';
import { Shift } from '@/lib/types/shift-types';
import { GuardEligibilityService } from './guard-eligibility-service';

export class GuardMatchingService {
  /**
   * Find and rank the best guards for a shift using AI-powered matching
   */
  static async findBestMatches(
    shiftId: string,
    limit = 10
  ): Promise<ServiceResult<GuardMatchResult[]>> {
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

      // Get eligible guards
      const eligibilityResult = await GuardEligibilityService.getEligibleGuards(shiftId);
      
      if (!eligibilityResult.success || !eligibilityResult.data) {
        return {
          success: false,
          error: eligibilityResult.error || {
            code: 'SERVICE_ERROR',
            message: 'Failed to get eligible guards'
          }
        };
      }

      // Convert eligibility results to match results
      const matchResults: GuardMatchResult[] = [];

      for (const eligibility of eligibilityResult.data) {
        if (eligibility.eligible || eligibility.eligibilityScore > 0.3) {
          const matchResult = await this.calculateMatchScore(eligibility, shift);
          matchResults.push(matchResult);
        }
      }

      // Sort by match score and rank
      matchResults.sort((a, b) => b.matchScore - a.matchScore);
      matchResults.forEach((match, index) => {
        match.ranking = index + 1;
      });

      // Apply limit
      const limitedResults = matchResults.slice(0, limit);

      return {
        success: true,
        data: limitedResults
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to find guard matches',
          details: error
        }
      };
    }
  }

  /**
   * Calculate comprehensive match score for a guard and shift
   */
  private static async calculateMatchScore(
    eligibility: GuardEligibilityResult,
    shift: Shift
  ): Promise<GuardMatchResult> {
    try {
      // Get detailed guard information
      const { data: guard } = await supabase
        .from('guard_profiles')
        .select(`
          id,
          first_name,
          last_name,
          certification_status,
          location_data,
          performance_metrics,
          preferences,
          work_history
        `)
        .eq('id', eligibility.guardId)
        .single();

      // Initialize scoring components
      let certificationScore = 0;
      let availabilityScore = 0;
      const proximityScore = eligibility.proximityScore || 0;
      const performanceScore = eligibility.performanceScore || 0;
      let preferenceScore = 0;

      // 1. Certification Score (30% weight)
      if (eligibility.certificationMatch) {
        certificationScore = eligibility.certificationMatch.matchPercentage;
        
        // Bonus for exceeding requirements
        if (certificationScore >= 1.0) {
          const additionalCertifications = eligibility.certificationMatch.available.length - 
                                         eligibility.certificationMatch.required.length;
          certificationScore = Math.min(1.2, 1.0 + (additionalCertifications * 0.05));
        }
      }

      // 2. Availability Score (25% weight)
      if (eligibility.availabilityMatch) {
        availabilityScore = eligibility.availabilityMatch.overlapPercentage;
        
        // Bonus for preferred time matches
        if (eligibility.availabilityMatch.preferredMatch) {
          availabilityScore = Math.min(1.2, availabilityScore + 0.3);
        }
        
        // Penalty for emergency-only availability
        if (eligibility.availabilityMatch.emergencyOnly && shift.priority < 5) {
          availabilityScore *= 0.7;
        }
      } else {
        availabilityScore = 0.5; // Default if no availability data
      }

      // 3. Proximity Score (15% weight) - already calculated in eligibility

      // 4. Performance Score (20% weight) - already calculated in eligibility

      // 5. Preference Score (10% weight)
      preferenceScore = await this.calculatePreferenceScore(guard, shift);

      // Calculate weighted match score
      const matchScore = (
        certificationScore * 0.30 +
        availabilityScore * 0.25 +
        proximityScore * 0.15 +
        performanceScore * 0.20 +
        preferenceScore * 0.10
      );

      // Generate strengths and concerns
      const { strengths, concerns, recommendations } = this.analyzeMatchQuality(
        eligibility,
        {
          certificationScore,
          availabilityScore,
          proximityScore,
          performanceScore,
          preferenceScore
        },
        shift
      );

      // Determine confidence and recommended action
      const confidence = this.determineConfidence(matchScore, eligibility.conflicts || []);
      const recommendedAction = this.determineRecommendedAction(matchScore, confidence, eligibility.conflicts || []);

      return {
        guardId: eligibility.guardId,
        matchScore: Math.round(matchScore * 100) / 100,
        ranking: 0, // Will be set after sorting
        eligibility,
        certificationScore,
        availabilityScore,
        proximityScore,
        performanceScore,
        preferenceScore,
        strengths,
        concerns,
        recommendations,
        confidence,
        recommendedAction
      };

    } catch (error) {
      console.error('Error calculating match score:', error);
      return {
        guardId: eligibility.guardId,
        matchScore: 0,
        ranking: 999,
        eligibility,
        certificationScore: 0,
        availabilityScore: 0,
        proximityScore: 0,
        performanceScore: 0,
        preferenceScore: 0,
        strengths: [],
        concerns: ['Error calculating match score'],
        recommendations: ['Review guard profile manually'],
        confidence: 'low',
        recommendedAction: 'not_recommended'
      };
    }
  }

  /**
   * Calculate preference-based matching score
   */
  private static async calculatePreferenceScore(guard: any, shift: Shift): Promise<number> {
    try {
      let score = 0.5; // Default score

      if (!guard?.preferences) {
        return score;
      }

      const preferences = guard.preferences;

      // Shift type preference
      if (preferences.preferred_shift_types?.includes(shift.clientInfo?.industryType)) {
        score += 0.2;
      }

      // Location preference
      if (preferences.preferred_locations?.includes(shift.locationData?.locationId)) {
        score += 0.3;
      }

      // Time of day preference
      const shiftStartHour = shift.timeRange.start.getHours();
      if (preferences.preferred_hours) {
        if (shiftStartHour >= preferences.preferred_hours.start && 
            shiftStartHour <= preferences.preferred_hours.end) {
          score += 0.2;
        }
      }

      // Weekend/weekday preference
      const isWeekend = [0, 6].includes(shift.timeRange.start.getDay());
      if (preferences.weekend_availability !== undefined) {
        if (isWeekend === preferences.weekend_availability) {
          score += 0.2;
        } else {
          score -= 0.1;
        }
      }

      // Duration preference
      const shiftHours = (shift.timeRange.end.getTime() - shift.timeRange.start.getTime()) / (1000 * 60 * 60);
      if (preferences.preferred_shift_duration) {
        const durationDiff = Math.abs(shiftHours - preferences.preferred_shift_duration);
        if (durationDiff <= 1) {
          score += 0.1;
        } else if (durationDiff <= 2) {
          score += 0.05;
        }
      }

      return Math.max(0, Math.min(1, score));

    } catch (error) {
      return 0.5; // Default on error
    }
  }

  /**
   * Analyze match quality and generate insights
   */
  private static analyzeMatchQuality(
    eligibility: GuardEligibilityResult,
    scores: {
      certificationScore: number;
      availabilityScore: number;
      proximityScore: number;
      performanceScore: number;
      preferenceScore: number;
    },
    shift: Shift
  ): {
    strengths: string[];
    concerns: string[];
    recommendations: string[];
  } {
    const strengths: string[] = [];
    const concerns: string[] = [];
    const recommendations: string[] = [];

    // Analyze certifications
    if (scores.certificationScore >= 1.0) {
      strengths.push('Exceeds certification requirements');
    } else if (scores.certificationScore >= 0.8) {
      strengths.push('Meets all required certifications');
    } else if (scores.certificationScore >= 0.6) {
      concerns.push('Missing some non-critical certifications');
      recommendations.push('Verify acceptable certification alternatives');
    } else {
      concerns.push('Significant certification gaps');
      recommendations.push('Consider additional training or alternative guard');
    }

    // Analyze availability
    if (scores.availabilityScore >= 0.8) {
      strengths.push('Excellent availability match');
    } else if (scores.availabilityScore >= 0.5) {
      strengths.push('Good availability overlap');
    } else {
      concerns.push('Limited availability during shift hours');
      recommendations.push('Confirm guard availability before assignment');
    }

    // Analyze proximity
    if (scores.proximityScore >= 0.8) {
      strengths.push('Located close to assignment site');
    } else if (scores.proximityScore <= 0.3) {
      concerns.push('Long travel distance to assignment');
      recommendations.push('Consider travel time and compensation');
    }

    // Analyze performance
    if (scores.performanceScore >= 0.9) {
      strengths.push('Outstanding performance history');
    } else if (scores.performanceScore >= 0.7) {
      strengths.push('Strong performance record');
    } else if (scores.performanceScore <= 0.5) {
      concerns.push('Below average performance history');
      recommendations.push('Review recent performance and consider mentoring');
    }

    // Analyze preferences
    if (scores.preferenceScore >= 0.7) {
      strengths.push('Strong preference alignment');
    } else if (scores.preferenceScore <= 0.3) {
      concerns.push('Poor preference match');
      recommendations.push('Consider guard preferences in scheduling');
    }

    // Analyze conflicts
    if (eligibility.conflicts && eligibility.conflicts.length > 0) {
      const criticalConflicts = eligibility.conflicts.filter(c => c.severity === 'critical');
      const errorConflicts = eligibility.conflicts.filter(c => c.severity === 'error');

      if (criticalConflicts.length > 0) {
        concerns.push('Critical assignment conflicts detected');
        recommendations.push('Resolve conflicts before proceeding');
      } else if (errorConflicts.length > 0) {
        concerns.push('Assignment conflicts require override');
        recommendations.push('Review conflicts and provide justification for override');
      }
    }

    // Additional recommendations based on shift priority
    if (shift.priority >= 4) {
      recommendations.push('High priority shift - ensure rapid response capability');
    }

    if (shift.requiredCertifications && shift.requiredCertifications.length > 3) {
      recommendations.push('Complex certification requirements - double-check compliance');
    }

    return { strengths, concerns, recommendations };
  }

  /**
   * Determine confidence level based on match score and conflicts
   */
  private static determineConfidence(
    matchScore: number,
    conflicts: any[]
  ): 'high' | 'medium' | 'low' {
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical').length;
    const errorConflicts = conflicts.filter(c => c.severity === 'error').length;

    if (criticalConflicts > 0) {
      return 'low';
    }

    if (matchScore >= 0.8 && errorConflicts === 0) {
      return 'high';
    }

    if (matchScore >= 0.6 && errorConflicts <= 1) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Determine recommended action based on score, confidence, and conflicts
   */
  private static determineRecommendedAction(
    matchScore: number,
    confidence: 'high' | 'medium' | 'low',
    conflicts: any[]
  ): 'auto_assign' | 'manager_review' | 'not_recommended' {
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical').length;
    const errorConflicts = conflicts.filter(c => c.severity === 'error').length;

    // Never auto-assign with critical conflicts
    if (criticalConflicts > 0) {
      return 'not_recommended';
    }

    // High confidence matches with no error conflicts can be auto-assigned
    if (confidence === 'high' && matchScore >= 0.85 && errorConflicts === 0) {
      return 'auto_assign';
    }

    // Most cases require manager review
    if (matchScore >= 0.5) {
      return 'manager_review';
    }

    return 'not_recommended';
  }

  /**
   * Get personalized recommendations for improving match quality
   */
  static async getMatchImprovementRecommendations(
    guardId: string,
    shiftId: string
  ): Promise<ServiceResult<{
    currentScore: number;
    improvementAreas: {
      area: string;
      currentScore: number;
      suggestions: string[];
      potentialImprovement: number;
    }[];
    alternativeGuards?: string[];
  }>> {
    try {
      // Get current eligibility and match data
      const { data: shift } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', shiftId)
        .single();

      if (!shift) {
        return {
          success: false,
          error: {
            code: AssignmentErrorCodes.SHIFT_NOT_FOUND,
            message: 'Shift not found'
          }
        };
      }

      const eligibility = await GuardEligibilityService.checkGuardEligibility(guardId, shift);
      const matchResult = await this.calculateMatchScore(eligibility, shift);

      const improvementAreas: any[] = [];

      // Certification improvements
      if (matchResult.certificationScore < 0.8) {
        improvementAreas.push({
          area: 'Certifications',
          currentScore: matchResult.certificationScore,
          suggestions: [
            'Complete missing required certifications',
            'Renew expiring certifications',
            'Consider additional relevant certifications'
          ],
          potentialImprovement: 0.3
        });
      }

      // Availability improvements
      if (matchResult.availabilityScore < 0.7) {
        improvementAreas.push({
          area: 'Availability',
          currentScore: matchResult.availabilityScore,
          suggestions: [
            'Update availability preferences',
            'Consider flexible scheduling options',
            'Mark preferred time slots'
          ],
          potentialImprovement: 0.25
        });
      }

      // Performance improvements
      if (matchResult.performanceScore < 0.8) {
        improvementAreas.push({
          area: 'Performance',
          currentScore: matchResult.performanceScore,
          suggestions: [
            'Focus on punctuality and reliability',
            'Complete additional training programs',
            'Request performance feedback and coaching'
          ],
          potentialImprovement: 0.2
        });
      }

      // Get alternative guards with higher scores
      const alternativeMatches = await this.findBestMatches(shiftId, 5);
      const alternativeGuards = alternativeMatches.success 
        ? alternativeMatches.data!
            .filter(match => match.guardId !== guardId && match.matchScore > matchResult.matchScore)
            .slice(0, 3)
            .map(match => match.guardId)
        : [];

      return {
        success: true,
        data: {
          currentScore: matchResult.matchScore,
          improvementAreas,
          alternativeGuards: alternativeGuards.length > 0 ? alternativeGuards : undefined
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to generate improvement recommendations',
          details: error
        }
      };
    }
  }

  /**
   * Find guards with specific expertise for specialized shifts
   */
  static async findSpecializedMatches(
    shiftId: string,
    specializations: string[]
  ): Promise<ServiceResult<GuardMatchResult[]>> {
    try {
      // Get basic matches first
      const matchResult = await this.findBestMatches(shiftId, 20);
      
      if (!matchResult.success || !matchResult.data) {
        return matchResult;
      }

      // Filter and re-score based on specializations
      const specializedMatches = matchResult.data.filter(match => {
        // Check if guard has required specializations in certifications or experience
        return specializations.some(spec => 
          match.eligibility.certificationMatch?.available.includes(spec) ||
          match.eligibility.reasons.some(reason => reason.toLowerCase().includes(spec.toLowerCase()))
        );
      });

      // Boost scores for specialized matches
      specializedMatches.forEach(match => {
        match.matchScore = Math.min(1, match.matchScore + 0.1);
        match.strengths.push('Specialized expertise match');
      });

      // Re-sort and re-rank
      specializedMatches.sort((a, b) => b.matchScore - a.matchScore);
      specializedMatches.forEach((match, index) => {
        match.ranking = index + 1;
      });

      return {
        success: true,
        data: specializedMatches
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to find specialized matches',
          details: error
        }
      };
    }
  }

  /**
   * Get matching statistics and analytics
   */
  static async getMatchingAnalytics(shiftId: string): Promise<ServiceResult<{
    totalCandidates: number;
    eligibleCandidates: number;
    highQualityMatches: number;
    averageMatchScore: number;
    topReasons: string[];
    improvementSuggestions: string[];
  }>> {
    try {
      const matchResult = await this.findBestMatches(shiftId, 50);
      
      if (!matchResult.success || !matchResult.data) {
        return {
          success: false,
          error: matchResult.error || {
            code: 'SERVICE_ERROR',
            message: 'Failed to get matching data'
          }
        };
      }

      const matches = matchResult.data;
      const totalCandidates = matches.length;
      const eligibleCandidates = matches.filter(m => m.eligibility.eligible).length;
      const highQualityMatches = matches.filter(m => m.matchScore >= 0.8).length;
      const averageMatchScore = matches.reduce((sum, m) => sum + m.matchScore, 0) / totalCandidates;

      // Analyze common strengths and concerns
      const allStrengths = matches.flatMap(m => m.strengths);
      const allConcerns = matches.flatMap(m => m.concerns);

      const strengthCounts = allStrengths.reduce((counts: any, strength) => {
        counts[strength] = (counts[strength] || 0) + 1;
        return counts;
      }, {});

      const concernCounts = allConcerns.reduce((counts: any, concern) => {
        counts[concern] = (counts[concern] || 0) + 1;
        return counts;
      }, {});

      const topReasons = Object.entries(strengthCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([reason]) => reason);

      const improvementSuggestions: string[] = [];
      
      if (highQualityMatches / totalCandidates < 0.3) {
        improvementSuggestions.push('Consider adjusting shift requirements or timing');
      }
      
      if (eligibleCandidates / totalCandidates < 0.5) {
        improvementSuggestions.push('Review certification requirements - may be too restrictive');
      }

      const topConcerns = Object.entries(concernCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([concern]) => concern);

      topConcerns.forEach(concern => {
        if (concern.includes('certification')) {
          improvementSuggestions.push('Consider alternative certification paths or training programs');
        }
        if (concern.includes('availability')) {
          improvementSuggestions.push('Adjust shift timing to better match guard availability');
        }
        if (concern.includes('performance')) {
          improvementSuggestions.push('Implement guard performance improvement programs');
        }
      });

      return {
        success: true,
        data: {
          totalCandidates,
          eligibleCandidates,
          highQualityMatches,
          averageMatchScore: Math.round(averageMatchScore * 100) / 100,
          topReasons,
          improvementSuggestions
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: 'Failed to generate matching analytics',
          details: error
        }
      };
    }
  }
}