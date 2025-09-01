// Story 3.4: Bulk Actions API Endpoint Tests  
// Tests for /api/v1/shifts/bulk-actions route handlers

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GET, POST } from '@/app/api/v1/shifts/bulk-actions/route';
import { ShiftKanbanService } from '@/lib/services/shift-kanban-service';
import { NextRequest } from 'next/server';
import type { BulkOperation } from '@/lib/types/kanban-types';

// Mock the service
jest.mock('@/lib/services/shift-kanban-service');

// Mock bulk operation data
const mockBulkOperation: BulkOperation = {
  id: 'bulk-op-123',
  operationType: 'status_change',
  shiftIds: ['shift-1', 'shift-2'],
  parameters: { newStatus: 'assigned' },
  executedBy: 'manager-123',
  executedAt: new Date('2025-08-28T10:00:00Z'),
  status: 'completed',
  results: [
    { shiftId: 'shift-1', success: true, newValue: 'assigned' },
    { shiftId: 'shift-2', success: true, newValue: 'assigned' }
  ]
};

// Helper to create mock NextRequest
const createMockRequest = (
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: any
) => {
  const request = new Request(url, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined
  });
  return request as NextRequest;
};

describe('/api/v1/shifts/bulk-actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/shifts/bulk-actions', () => {
    it('executes bulk status change successfully', async () => {
      jest.mocked(ShiftKanbanService.executeBulkAction).mockResolvedValue({
        success: true,
        data: mockBulkOperation
      });

      const requestBody = {
        action: 'status_change',
        shiftIds: ['shift-1', 'shift-2'],
        parameters: { newStatus: 'assigned' },
        reason: 'Bulk assignment'
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/shifts/bulk-actions',
        { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
        requestBody
      );

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.operation).toEqual(mockBulkOperation);
      expect(responseBody.data.summary).toMatchObject({
        totalShifts: 2,
        successCount: 2,
        failureCount: 0,
        successRate: 100
      });

      expect(ShiftKanbanService.executeBulkAction).toHaveBeenCalledWith(
        {
          action: 'status_change',
          shiftIds: ['shift-1', 'shift-2'],
          parameters: { newStatus: 'assigned' },
          reason: 'Bulk assignment'
        },
        'manager-123'
      );
    });

    it('executes bulk assignment successfully', async () => {
      const assignmentOperation = {
        ...mockBulkOperation,
        operationType: 'assign' as const,
        parameters: { guardId: 'guard-123' }
      };

      jest.mocked(ShiftKanbanService.executeBulkAction).mockResolvedValue({
        success: true,
        data: assignmentOperation
      });

      const requestBody = {
        action: 'assign',
        shiftIds: ['shift-1', 'shift-2'],
        parameters: { guardId: 'guard-123' }
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/shifts/bulk-actions',
        { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
        requestBody
      );

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(ShiftKanbanService.executeBulkAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'assign',
          parameters: { guardId: 'guard-123' }
        }),
        'manager-123'
      );
    });

    it('executes bulk priority update successfully', async () => {
      const priorityOperation = {
        ...mockBulkOperation,
        operationType: 'priority_update' as const,
        parameters: { priority: 1 }
      };

      jest.mocked(ShiftKanbanService.executeBulkAction).mockResolvedValue({
        success: true,
        data: priorityOperation
      });

      const requestBody = {
        action: 'priority_update',
        shiftIds: ['shift-1', 'shift-2'],
        parameters: { priority: 1 }
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/shifts/bulk-actions',
        { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
        requestBody
      );

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(ShiftKanbanService.executeBulkAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'priority_update',
          parameters: { priority: 1 }
        }),
        'manager-123'
      );
    });

    it('returns 401 when manager ID is missing', async () => {
      const requestBody = {
        action: 'status_change',
        shiftIds: ['shift-1'],
        parameters: { newStatus: 'assigned' }
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/shifts/bulk-actions',
        { 'content-type': 'application/json' },
        requestBody
      );

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('UNAUTHORIZED');
    });

    it('validates required fields', async () => {
      const invalidBodies = [
        {}, // Missing all fields
        { action: 'status_change' }, // Missing shiftIds
        { shiftIds: ['shift-1'] }, // Missing action
        { action: 'status_change', shiftIds: [] }, // Empty shiftIds
        { action: 'status_change', shiftIds: 'not-an-array' } // Invalid shiftIds type
      ];

      for (const body of invalidBodies) {
        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/v1/shifts/bulk-actions',
          { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
          body
        );

        const response = await POST(request);
        const responseBody = await response.json();

        expect(response.status).toBe(400);
        expect(responseBody.success).toBe(false);
        expect(responseBody.error.code).toBe('INVALID_REQUEST');
      }
    });

    it('validates action type', async () => {
      const requestBody = {
        action: 'invalid_action',
        shiftIds: ['shift-1'],
        parameters: {}
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/shifts/bulk-actions',
        { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
        requestBody
      );

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('INVALID_ACTION');
      expect(responseBody.error.message).toContain('assign, status_change, priority_update, notification, clone');
    });

    it('enforces shift count limits', async () => {
      const tooManyShifts = Array.from({ length: 51 }, (_, i) => `shift-${i + 1}`);

      const requestBody = {
        action: 'status_change',
        shiftIds: tooManyShifts,
        parameters: { newStatus: 'assigned' }
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/shifts/bulk-actions',
        { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
        requestBody
      );

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('TOO_MANY_SHIFTS');
      expect(responseBody.error.message).toContain('Maximum 50 shifts');
    });

    describe('Parameter Validation', () => {
      it('validates assign action parameters', async () => {
        const requestBody = {
          action: 'assign',
          shiftIds: ['shift-1'],
          parameters: {} // Missing guardId
        };

        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/v1/shifts/bulk-actions',
          { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
          requestBody
        );

        const response = await POST(request);
        const responseBody = await response.json();

        expect(response.status).toBe(400);
        expect(responseBody.success).toBe(false);
        expect(responseBody.error.code).toBe('INVALID_PARAMETERS');
        expect(responseBody.error.message).toBe('guardId is required for assignment action');
      });

      it('validates status_change action parameters', async () => {
        const testCases = [
          {
            parameters: {}, // Missing newStatus
            expectedMessage: 'newStatus is required for status change action'
          },
          {
            parameters: { newStatus: 'invalid_status' },
            expectedMessage: 'Invalid newStatus. Must be one of: unassigned, assigned, confirmed, in_progress, completed, issue_logged, archived'
          }
        ];

        for (const { parameters, expectedMessage } of testCases) {
          const requestBody = {
            action: 'status_change',
            shiftIds: ['shift-1'],
            parameters
          };

          const request = createMockRequest(
            'POST',
            'http://localhost:3000/api/v1/shifts/bulk-actions',
            { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
            requestBody
          );

          const response = await POST(request);
          const responseBody = await response.json();

          expect(response.status).toBe(400);
          expect(responseBody.error.message).toBe(expectedMessage);
        }
      });

      it('validates priority_update action parameters', async () => {
        const testCases = [
          {
            parameters: {}, // Missing priority
            expectedMessage: 'priority is required for priority update action'
          },
          {
            parameters: { priority: 'invalid' },
            expectedMessage: 'priority must be an integer between 1 and 5'
          },
          {
            parameters: { priority: 0 },
            expectedMessage: 'priority must be an integer between 1 and 5'
          },
          {
            parameters: { priority: 6 },
            expectedMessage: 'priority must be an integer between 1 and 5'
          }
        ];

        for (const { parameters, expectedMessage } of testCases) {
          const requestBody = {
            action: 'priority_update',
            shiftIds: ['shift-1'],
            parameters
          };

          const request = createMockRequest(
            'POST',
            'http://localhost:3000/api/v1/shifts/bulk-actions',
            { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
            requestBody
          );

          const response = await POST(request);
          const responseBody = await response.json();

          expect(response.status).toBe(400);
          expect(responseBody.error.message).toBe(expectedMessage);
        }
      });

      it('validates notification action parameters', async () => {
        const testCases = [
          {
            parameters: {}, // Missing message
            expectedMessage: 'message is required for notification action'
          },
          {
            parameters: { message: 'a'.repeat(501) }, // Message too long
            expectedMessage: 'message must be 500 characters or less'
          }
        ];

        for (const { parameters, expectedMessage } of testCases) {
          const requestBody = {
            action: 'notification',
            shiftIds: ['shift-1'],
            parameters
          };

          const request = createMockRequest(
            'POST',
            'http://localhost:3000/api/v1/shifts/bulk-actions',
            { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
            requestBody
          );

          const response = await POST(request);
          const responseBody = await response.json();

          expect(response.status).toBe(400);
          expect(responseBody.error.message).toBe(expectedMessage);
        }
      });

      it('validates clone action parameters', async () => {
        const requestBody = {
          action: 'clone',
          shiftIds: ['shift-1'],
          parameters: {} // Missing templateId
        };

        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/v1/shifts/bulk-actions',
          { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
          requestBody
        );

        const response = await POST(request);
        const responseBody = await response.json();

        expect(response.status).toBe(400);
        expect(responseBody.error.message).toBe('templateId is required for clone action');
      });
    });

    it('handles service errors gracefully', async () => {
      jest.mocked(ShiftKanbanService.executeBulkAction).mockResolvedValue({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database connection failed' }
      });

      const requestBody = {
        action: 'status_change',
        shiftIds: ['shift-1'],
        parameters: { newStatus: 'assigned' }
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/shifts/bulk-actions',
        { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
        requestBody
      );

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('DATABASE_ERROR');
    });

    it('calculates summary statistics correctly', async () => {
      const partialFailureOperation = {
        ...mockBulkOperation,
        results: [
          { shiftId: 'shift-1', success: true, newValue: 'assigned' },
          { shiftId: 'shift-2', success: false, error: 'Validation failed' },
          { shiftId: 'shift-3', success: true, newValue: 'assigned' }
        ]
      };

      jest.mocked(ShiftKanbanService.executeBulkAction).mockResolvedValue({
        success: true,
        data: partialFailureOperation
      });

      const requestBody = {
        action: 'status_change',
        shiftIds: ['shift-1', 'shift-2', 'shift-3'],
        parameters: { newStatus: 'assigned' }
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/shifts/bulk-actions',
        { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
        requestBody
      );

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(201);
      expect(responseBody.data.summary).toMatchObject({
        totalShifts: 3,
        successCount: 2,
        failureCount: 1,
        successRate: 66.67 // Rounded to 2 decimal places
      });
    });

    it('handles empty parameters correctly', async () => {
      jest.mocked(ShiftKanbanService.executeBulkAction).mockResolvedValue({
        success: true,
        data: mockBulkOperation
      });

      const requestBody = {
        action: 'notification',
        shiftIds: ['shift-1'],
        parameters: { message: 'Test message' }
        // No reason provided
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/shifts/bulk-actions',
        { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
        requestBody
      );

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(ShiftKanbanService.executeBulkAction).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: undefined
        }),
        'manager-123'
      );
    });
  });

  describe('GET /api/v1/shifts/bulk-actions', () => {
    it('returns operation status with valid operation ID', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/v1/shifts/bulk-actions?operation_id=bulk-op-123',
        { 'x-manager-id': 'manager-123' }
      );

      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toMatchObject({
        operationId: 'bulk-op-123',
        status: 'completed',
        message: 'Bulk operation status tracking not yet implemented'
      });
    });

    it('returns 401 when manager ID is missing', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/v1/shifts/bulk-actions?operation_id=bulk-op-123'
      );

      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 400 when operation_id is missing', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/v1/shifts/bulk-actions',
        { 'x-manager-id': 'manager-123' }
      );

      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('INVALID_REQUEST');
      expect(responseBody.error.message).toBe('operation_id parameter is required');
    });

    it('handles unexpected errors gracefully', async () => {
      // Force an error by providing an invalid URL
      const request = createMockRequest(
        'GET',
        'invalid-url',
        { 'x-manager-id': 'manager-123' }
      );

      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});