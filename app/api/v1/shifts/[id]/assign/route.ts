// Story 3.2: Shift Assignment API Endpoint
// POST /api/v1/shifts/:id/assign - Assign guard to shift with comprehensive validation

import { NextRequest, NextResponse } from 'next/server';
import { AssignmentService } from '@/lib/services/assignment-service';
import { ConflictDetectionService } from '@/lib/services/conflict-detection-service';
import { AssignmentCreateData, AssignmentErrorCodes } from '@/lib/types/assignment-types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shiftId } = await params;
    const body = await request.json();
    
    // Validate required fields
    const { guardId, assignmentMethod = 'manual', overrideConflicts = false } = body;
    
    if (!guardId) {
      return NextResponse.json({
        success: false,
        error: {
          code: AssignmentErrorCodes.INVALID_REQUEST,
          message: 'Guard ID is required'
        }
      }, { status: 400 });
    }

    // TODO: Get actual user ID from session/auth
    const managerId = body.assignedBy || 'current-user-id'; // Temporary fallback

    // Create assignment data
    const assignmentData: AssignmentCreateData = {
      shiftId,
      guardId,
      assignmentMethod,
      assignmentNotes: body.assignmentNotes,
      managerNotes: body.managerNotes,
      eligibilityScore: body.eligibilityScore,
      overrideConflicts,
      overrideReason: body.overrideReason
    };

    // Check for conflicts first if not overriding
    if (!overrideConflicts) {
      const conflictResult = await ConflictDetectionService.detectAssignmentConflicts(
        guardId,
        shiftId
      );

      if (conflictResult.success && conflictResult.data!.hasConflicts) {
        const { conflicts, canProceed, requiresOverride } = conflictResult.data!;
        
        if (!canProceed) {
          return NextResponse.json({
            success: false,
            error: {
              code: AssignmentErrorCodes.TIME_CONFLICT,
              message: 'Assignment has conflicts that prevent completion',
              details: {
                conflicts,
                canOverride: requiresOverride,
                resolutionSuggestions: conflictResult.data!.resolutionSuggestions
              }
            }
          }, { status: 409 }); // 409 Conflict
        }

        if (requiresOverride) {
          return NextResponse.json({
            success: false,
            error: {
              code: AssignmentErrorCodes.CONFLICT_OVERRIDE_REQUIRED,
              message: 'Assignment requires override due to conflicts',
              details: {
                conflicts,
                canOverride: true,
                message: 'Set overrideConflicts=true and provide overrideReason to proceed'
              }
            }
          }, { status: 409 }); // 409 Conflict
        }
      }
    }

    // Create the assignment
    const result = await AssignmentService.createAssignment(assignmentData, managerId);
    
    if (!result.success) {
      const statusCode = result.error?.code === AssignmentErrorCodes.SHIFT_NOT_FOUND ? 404 :
                         result.error?.code === AssignmentErrorCodes.GUARD_NOT_ELIGIBLE ? 422 :
                         result.error?.code === AssignmentErrorCodes.ASSIGNMENT_EXISTS ? 409 :
                         result.error?.code === AssignmentErrorCodes.CONFLICT_OVERRIDE_REQUIRED ? 409 :
                         400;

      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: statusCode });
    }

    return NextResponse.json({
      success: true,
      data: {
        assignment: result.data,
        message: 'Assignment created successfully'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create assignment',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shiftId = params.id
    
    if (!shiftId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_SHIFT_ID',
          message: 'Shift ID is required'
        }
      }, { status: 400 })
    }
    
    // TODO: Get actual user ID from session/auth
    const managerId = 'current-user-id'
    
    const service = new ShiftManagementService()
    const result = await service.unassignGuardFromShift(shiftId, managerId)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: null
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }
  } catch (error) {
    console.error(`DELETE /api/v1/shifts/${params.id}/assign error:`, error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: 'Internal server error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }, { status: 500 })
  }
}