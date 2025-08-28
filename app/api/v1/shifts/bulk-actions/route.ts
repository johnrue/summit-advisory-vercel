// Story 3.4: Bulk Operations API Endpoint
// Handles multi-shift operations with validation and rollback support

import { NextRequest, NextResponse } from 'next/server';
import { ShiftKanbanService } from '@/lib/services/shift-kanban-service';
import type { KanbanApiResponse, BulkActionRequest } from '@/lib/types/kanban-types';

// POST /api/v1/shifts/bulk-actions - Execute bulk operations
export async function POST(request: NextRequest) {
  try {
    const managerId = request.headers.get('x-manager-id');
    
    if (!managerId) {
      return NextResponse.json<KanbanApiResponse>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Manager authentication required'
        }
      }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.action || !body.shiftIds || !Array.isArray(body.shiftIds) || body.shiftIds.length === 0) {
      return NextResponse.json<KanbanApiResponse>({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'action and shiftIds array are required'
        }
      }, { status: 400 });
    }

    // Validate action type
    const validActions = ['assign', 'status_change', 'priority_update', 'notification', 'clone'];
    if (!validActions.includes(body.action)) {
      return NextResponse.json<KanbanApiResponse>({
        success: false,
        error: {
          code: 'INVALID_ACTION',
          message: `Invalid action. Must be one of: ${validActions.join(', ')}`
        }
      }, { status: 400 });
    }

    // Validate shift count limits
    if (body.shiftIds.length > 50) {
      return NextResponse.json<KanbanApiResponse>({
        success: false,
        error: {
          code: 'TOO_MANY_SHIFTS',
          message: 'Maximum 50 shifts allowed per bulk operation'
        }
      }, { status: 400 });
    }

    // Validate parameters based on action
    const validationError = validateActionParameters(body.action, body.parameters || {});
    if (validationError) {
      return NextResponse.json<KanbanApiResponse>({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: validationError
        }
      }, { status: 400 });
    }

    // Create bulk action request
    const bulkRequest: BulkActionRequest = {
      action: body.action,
      shiftIds: body.shiftIds,
      parameters: body.parameters || {},
      reason: body.reason
    };

    // Execute bulk operation
    const result = await ShiftKanbanService.executeBulkAction(bulkRequest, managerId);

    if (!result.success) {
      return NextResponse.json<KanbanApiResponse>({
        success: false,
        error: result.error
      }, { status: 500 });
    }

    // Return operation results
    const operation = result.data;
    const successCount = operation?.results?.filter(r => r.success).length || 0;
    const failureCount = (operation?.results?.length || 0) - successCount;

    return NextResponse.json<KanbanApiResponse>({
      success: true,
      data: {
        operation,
        summary: {
          totalShifts: body.shiftIds.length,
          successCount,
          failureCount,
          successRate: body.shiftIds.length > 0 ? (successCount / body.shiftIds.length) * 100 : 0
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        operationId: operation?.id
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Bulk actions POST error:', error);
    return NextResponse.json<KanbanApiResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to execute bulk operation',
        details: { error: String(error) }
      }
    }, { status: 500 });
  }
}

// GET /api/v1/shifts/bulk-actions?operation_id=xxx - Get bulk operation status
export async function GET(request: NextRequest) {
  try {
    const managerId = request.headers.get('x-manager-id');
    
    if (!managerId) {
      return NextResponse.json<KanbanApiResponse>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Manager authentication required'
        }
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const operationId = searchParams.get('operation_id');

    if (!operationId) {
      return NextResponse.json<KanbanApiResponse>({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'operation_id parameter is required'
        }
      }, { status: 400 });
    }

    // For now, return a placeholder response since we don't have persistent storage for operations
    // In a full implementation, this would fetch from a bulk_operations table
    
    return NextResponse.json<KanbanApiResponse>({
      success: true,
      data: {
        operationId,
        status: 'completed',
        message: 'Bulk operation status tracking not yet implemented'
      }
    });

  } catch (error) {
    console.error('Bulk actions GET error:', error);
    return NextResponse.json<KanbanApiResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve bulk operation status',
        details: { error: String(error) }
      }
    }, { status: 500 });
  }
}

/**
 * Validate parameters for different bulk actions
 */
function validateActionParameters(action: string, parameters: Record<string, any>): string | null {
  switch (action) {
    case 'assign':
      if (!parameters.guardId) {
        return 'guardId is required for assignment action';
      }
      break;

    case 'status_change':
      if (!parameters.newStatus) {
        return 'newStatus is required for status change action';
      }
      const validStatuses = [
        'unassigned', 'assigned', 'confirmed', 'in_progress', 'completed', 'issue_logged', 'archived'
      ];
      if (!validStatuses.includes(parameters.newStatus)) {
        return `Invalid newStatus. Must be one of: ${validStatuses.join(', ')}`;
      }
      break;

    case 'priority_update':
      if (parameters.priority === undefined || parameters.priority === null) {
        return 'priority is required for priority update action';
      }
      if (!Number.isInteger(parameters.priority) || parameters.priority < 1 || parameters.priority > 5) {
        return 'priority must be an integer between 1 and 5';
      }
      break;

    case 'notification':
      if (!parameters.message) {
        return 'message is required for notification action';
      }
      if (parameters.message.length > 500) {
        return 'message must be 500 characters or less';
      }
      break;

    case 'clone':
      if (!parameters.templateId) {
        return 'templateId is required for clone action';
      }
      break;

    default:
      return `Unsupported action: ${action}`;
  }

  return null; // No validation errors
}