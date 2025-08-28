// Story 3.2: Eligible Guards API Endpoint
// GET /api/v1/shifts/:id/eligible-guards - Get eligible guards for a shift

import { NextRequest, NextResponse } from 'next/server';
import { GuardEligibilityService } from '@/lib/services/guard-eligibility-service';
import { GuardMatchingService } from '@/lib/services/guard-matching-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shiftId } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const includeMatching = searchParams.get('include_matching') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sort_by') || 'eligibility_score';
    const minScore = parseFloat(searchParams.get('min_score') || '0');

    if (includeMatching) {
      // Get AI-powered matches
      const result = await GuardMatchingService.findBestMatches(shiftId, limit);
      
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error
          },
          { status: result.error?.code === 'SHIFT_NOT_FOUND' ? 404 : 500 }
        );
      }

      // Filter by minimum score if specified
      const filteredMatches = result.data!.filter(match => 
        match.matchScore >= minScore
      );

      return NextResponse.json({
        success: true,
        data: {
          shiftId,
          totalMatches: result.data!.length,
          filteredMatches: filteredMatches.length,
          matches: filteredMatches,
          matchingEnabled: true
        }
      });

    } else {
      // Get basic eligibility check
      const result = await GuardEligibilityService.getEligibleGuards(shiftId);
      
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error
          },
          { status: result.error?.code === 'SHIFT_NOT_FOUND' ? 404 : 500 }
        );
      }

      // Sort results
      let sortedGuards = [...result.data!];
      switch (sortBy) {
        case 'eligibility_score':
          sortedGuards.sort((a, b) => b.eligibilityScore - a.eligibilityScore);
          break;
        case 'proximity_score':
          sortedGuards.sort((a, b) => (b.proximityScore || 0) - (a.proximityScore || 0));
          break;
        case 'performance_score':
          sortedGuards.sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0));
          break;
      }

      // Filter by minimum score and limit
      const filteredGuards = sortedGuards
        .filter(guard => guard.eligibilityScore >= minScore)
        .slice(0, limit);

      return NextResponse.json({
        success: true,
        data: {
          shiftId,
          totalGuards: result.data!.length,
          eligibleGuards: filteredGuards.filter(g => g.eligible).length,
          filteredGuards: filteredGuards.length,
          guards: filteredGuards,
          sortBy,
          minScore
        }
      });
    }

  } catch (error) {
    console.error('Error fetching eligible guards:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch eligible guards',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shiftId } = await params;
    const body = await request.json();
    const { guard_ids, include_conflicts = true, bulk_check = false } = body;

    if (!guard_ids || !Array.isArray(guard_ids)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'guard_ids array is required'
          }
        },
        { status: 400 }
      );
    }

    if (bulk_check) {
      // Bulk eligibility check for multiple guards
      const result = await GuardEligibilityService.bulkEligibilityCheck(
        guard_ids,
        [shiftId]
      );

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error
          },
          { status: 500 }
        );
      }

      // Group results by guard ID
      const guardResults = guard_ids.map(guardId => {
        const guardResult = result.data!.find(r => r.guardId === guardId);
        return {
          guardId,
          eligibility: guardResult?.eligibility || {
            guardId,
            eligible: false,
            eligibilityScore: 0,
            reasons: ['Guard not found or error occurred'],
            conflicts: []
          }
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          shiftId,
          guardCount: guard_ids.length,
          results: guardResults
        }
      });

    } else {
      // Individual eligibility checks
      const eligibilityResult = await GuardEligibilityService.getEligibleGuards(shiftId);
      
      if (!eligibilityResult.success || !eligibilityResult.data) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'SHIFT_NOT_FOUND',
              message: 'Shift not found'
            }
          },
          { status: 404 }
        );
      }

      const results = [];
      for (const guardId of guard_ids) {
        const guardEligibility = eligibilityResult.data.find(g => g.guardId === guardId);
        if (guardEligibility) {
          results.push({
            guardId,
            eligibility: guardEligibility
          });
        } else {
          results.push({
            guardId,
            eligibility: {
              guardId,
              eligible: false,
              eligibilityScore: 0,
              reasons: ['Guard not found in eligible list'],
              conflicts: []
            }
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          shiftId,
          guardCount: guard_ids.length,
          results
        }
      });
    }

  } catch (error) {
    console.error('Error in bulk eligibility check:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to perform eligibility check',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      },
      { status: 500 }
    );
  }
}