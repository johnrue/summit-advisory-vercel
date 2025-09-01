// Story 3.4: Kanban API Endpoint Tests
// Tests for /api/v1/shifts/kanban route handlers

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GET, POST } from '@/app/api/v1/shifts/kanban/route';
import { ShiftKanbanService } from '@/lib/services/shift-kanban-service';
import { NextRequest } from 'next/server';

// Mock the service
jest.mock('@/lib/services/shift-kanban-service');

// Mock data
const mockBoardData = {
  shifts: [
    {
      id: 'shift-1',
      status: 'unassigned',
      client_info: { name: 'Test Client' },
      location_data: { siteName: 'Test Site' }
    }
  ],
  columns: [
    { 
      id: 'unassigned' as 'unassigned', 
      title: 'Unassigned', 
      color: 'slate', 
      allowedTransitions: ['assigned'] as ('assigned')[]
    }
  ],
  filters: {},
  activePresence: [],
  metrics: {
    totalShifts: 1,
    shiftsByStatus: { 
      unassigned: 1,
      assigned: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      issue_logged: 0,
      archived: 0
    },
    avgTimeToAssignment: 2.5,
    avgTimeToConfirmation: 1.2,
    completionRate: 85,
    urgentAlertsCount: 0,
    workflowBottlenecks: []
  },
  recentActivity: []
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

describe('/api/v1/shifts/kanban', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/shifts/kanban', () => {
    it('returns board data successfully with valid manager ID', async () => {
      jest.mocked(ShiftKanbanService.getKanbanBoardData).mockResolvedValue({
        success: true,
        data: mockBoardData
      });

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/v1/shifts/kanban',
        { 'x-manager-id': 'manager-123' }
      );

      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toEqual(mockBoardData);
      expect(responseBody.metadata).toMatchObject({
        total: 1,
        timestamp: expect.any(String)
      });

      expect(ShiftKanbanService.getKanbanBoardData).toHaveBeenCalledWith(
        'manager-123',
        {}
      );
    });

    it('returns 401 when manager ID is missing', async () => {
      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/v1/shifts/kanban'
      );

      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('UNAUTHORIZED');
    });

    it('parses and applies date range filters', async () => {
      jest.mocked(ShiftKanbanService.getKanbanBoardData).mockResolvedValue({
        success: true,
        data: mockBoardData
      });

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/v1/shifts/kanban?start_date=2025-08-29T00:00:00Z&end_date=2025-08-30T00:00:00Z',
        { 'x-manager-id': 'manager-123' }
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(ShiftKanbanService.getKanbanBoardData).toHaveBeenCalledWith(
        'manager-123',
        {
          dateRange: {
            start: new Date('2025-08-29T00:00:00Z'),
            end: new Date('2025-08-30T00:00:00Z')
          }
        }
      );
    });

    it('parses and applies multiple filter types', async () => {
      jest.mocked(ShiftKanbanService.getKanbanBoardData).mockResolvedValue({
        success: true,
        data: mockBoardData
      });

      const queryParams = [
        'clients=Client1,Client2',
        'sites=Site1,Site2',
        'guards=guard1,guard2',
        'statuses=unassigned,assigned',
        'priorities=1,2,3',
        'assignment_status=assigned',
        'urgent_only=true'
      ].join('&');

      const request = createMockRequest(
        'GET',
        `http://localhost:3000/api/v1/shifts/kanban?${queryParams}`,
        { 'x-manager-id': 'manager-123' }
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(ShiftKanbanService.getKanbanBoardData).toHaveBeenCalledWith(
        'manager-123',
        {
          clients: ['Client1', 'Client2'],
          sites: ['Site1', 'Site2'],
          guards: ['guard1', 'guard2'],
          statuses: ['unassigned', 'assigned'],
          priorities: [1, 2, 3],
          assignmentStatus: 'assigned',
          urgentOnly: true
        }
      );
    });

    it('handles service errors gracefully', async () => {
      jest.mocked(ShiftKanbanService.getKanbanBoardData).mockResolvedValue({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database connection failed' }
      });

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/v1/shifts/kanban',
        { 'x-manager-id': 'manager-123' }
      );

      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('DATABASE_ERROR');
    });

    it('handles unexpected exceptions', async () => {
      jest.mocked(ShiftKanbanService.getKanbanBoardData).mockRejectedValue(
        new Error('Unexpected error')
      );

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/v1/shifts/kanban',
        { 'x-manager-id': 'manager-123' }
      );

      const response = await GET(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('ignores invalid assignment_status values', async () => {
      jest.mocked(ShiftKanbanService.getKanbanBoardData).mockResolvedValue({
        success: true,
        data: mockBoardData
      });

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/v1/shifts/kanban?assignment_status=invalid',
        { 'x-manager-id': 'manager-123' }
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(ShiftKanbanService.getKanbanBoardData).toHaveBeenCalledWith(
        'manager-123',
        {} // Invalid assignment_status is ignored
      );
    });

    it('handles malformed priority values', async () => {
      jest.mocked(ShiftKanbanService.getKanbanBoardData).mockResolvedValue({
        success: true,
        data: mockBoardData
      });

      const request = createMockRequest(
        'GET',
        'http://localhost:3000/api/v1/shifts/kanban?priorities=1,invalid,3',
        { 'x-manager-id': 'manager-123' }
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(ShiftKanbanService.getKanbanBoardData).toHaveBeenCalledWith(
        'manager-123',
        {
          priorities: [1, 3] // Invalid values filtered out
        }
      );
    });
  });

  describe('POST /api/v1/shifts/kanban', () => {
    it('moves shift successfully with valid data', async () => {
      jest.mocked(ShiftKanbanService.moveShift).mockResolvedValue({
        success: true,
        data: { transitionId: 'transition-123' }
      });

      const requestBody = {
        shiftId: 'shift-1',
        newStatus: 'assigned',
        reason: 'Manager assignment'
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/shifts/kanban',
        { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
        requestBody
      );

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.transition).toEqual({ transitionId: 'transition-123' });

      expect(ShiftKanbanService.moveShift).toHaveBeenCalledWith(
        'shift-1',
        'assigned',
        'manager-123',
        'Manager assignment'
      );
    });

    it('returns 401 when manager ID is missing', async () => {
      const requestBody = {
        shiftId: 'shift-1',
        newStatus: 'assigned'
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/shifts/kanban',
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
        {}, // Missing both fields
        { shiftId: 'shift-1' }, // Missing newStatus
        { newStatus: 'assigned' } // Missing shiftId
      ];

      for (const body of invalidBodies) {
        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/v1/shifts/kanban',
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

    it('validates status values', async () => {
      const requestBody = {
        shiftId: 'shift-1',
        newStatus: 'invalid_status'
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/shifts/kanban',
        { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
        requestBody
      );

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('INVALID_STATUS');
    });

    it('handles invalid transition errors with 409 status', async () => {
      jest.mocked(ShiftKanbanService.moveShift).mockResolvedValue({
        success: false,
        error: { code: 'INVALID_TRANSITION', message: 'Cannot move from unassigned to completed' }
      });

      const requestBody = {
        shiftId: 'shift-1',
        newStatus: 'completed'
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/shifts/kanban',
        { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
        requestBody
      );

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(409);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('INVALID_TRANSITION');
    });

    it('handles other service errors with 500 status', async () => {
      jest.mocked(ShiftKanbanService.moveShift).mockResolvedValue({
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Database connection failed' }
      });

      const requestBody = {
        shiftId: 'shift-1',
        newStatus: 'assigned'
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/shifts/kanban',
        { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
        requestBody
      );

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('DATABASE_ERROR');
    });

    it('handles JSON parsing errors', async () => {
      const request = new Request('http://localhost:3000/api/v1/shifts/kanban', {
        method: 'POST',
        headers: new Headers({
          'x-manager-id': 'manager-123',
          'content-type': 'application/json'
        }),
        body: 'invalid json'
      }) as NextRequest;

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('accepts optional reason parameter', async () => {
      jest.mocked(ShiftKanbanService.moveShift).mockResolvedValue({
        success: true,
        data: { transitionId: 'transition-123' }
      });

      const requestBody = {
        shiftId: 'shift-1',
        newStatus: 'assigned'
        // No reason provided
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3000/api/v1/shifts/kanban',
        { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
        requestBody
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(ShiftKanbanService.moveShift).toHaveBeenCalledWith(
        'shift-1',
        'assigned',
        'manager-123',
        undefined
      );
    });

    it('accepts all valid status values', async () => {
      jest.mocked(ShiftKanbanService.moveShift).mockResolvedValue({
        success: true,
        data: { transitionId: 'transition-123' }
      });

      const validStatuses = [
        'unassigned', 'assigned', 'confirmed', 'in_progress', 'completed', 'issue_logged', 'archived'
      ];

      for (const status of validStatuses) {
        const requestBody = {
          shiftId: 'shift-1',
          newStatus: status
        };

        const request = createMockRequest(
          'POST',
          'http://localhost:3000/api/v1/shifts/kanban',
          { 'x-manager-id': 'manager-123', 'content-type': 'application/json' },
          requestBody
        );

        const response = await POST(request);

        expect(response.status).toBe(200);
      }
    });
  });
});