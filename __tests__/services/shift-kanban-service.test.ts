// Story 3.4: ShiftKanbanService Tests
// Comprehensive tests for Kanban workflow management service

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ShiftKanbanService } from '@/lib/services/shift-kanban-service';
import { ShiftWorkflowService } from '@/lib/services/shift-workflow-service';
import { UrgentAlertService } from '@/lib/services/urgent-alert-service';
import type { KanbanFilters, BulkActionRequest } from '@/lib/types/kanban-types';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/services/shift-workflow-service');
jest.mock('@/lib/services/urgent-alert-service');
jest.mock('@/lib/services/shift-archive-service');

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  select: jest.fn(),
  eq: jest.fn(),
  not: jest.fn(),
  or: jest.fn(),
  in: jest.fn(),
  is: jest.fn(),
  gte: jest.fn(),
  lt: jest.fn(),
  order: jest.fn(),
  update: jest.fn(),
};

// Setup chainable query mocks
const setupMockQuery = () => {
  mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.not.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.or.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.in.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.is.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.gte.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.lt.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.order.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.update.mockReturnValue(mockSupabaseClient);
};

// Mock data
const mockShifts = [
  {
    id: 'shift-1',
    status: 'unassigned',
    client_info: { name: 'Test Client' },
    location_data: { siteName: 'Test Site' },
    time_range: '[2025-08-29T09:00:00Z,2025-08-29T17:00:00Z)',
    priority: 2,
    assigned_guard_id: null,
    shift_assignments: [],
    shift_urgency_alerts: []
  },
  {
    id: 'shift-2',
    status: 'assigned',
    client_info: { name: 'Test Client 2' },
    location_data: { siteName: 'Test Site 2' },
    time_range: '[2025-08-29T10:00:00Z,2025-08-29T18:00:00Z)',
    priority: 1,
    assigned_guard_id: 'guard-1',
    shift_assignments: [{ id: 'assign-1', assignment_status: 'confirmed' }],
    shift_urgency_alerts: []
  }
];

const mockColumns = [
  { 
    id: 'unassigned' as const, 
    title: 'Unassigned', 
    description: 'Shifts awaiting assignment', 
    color: 'slate', 
    allowedTransitions: ['assigned'] as const[], 
    requiresValidation: false 
  },
  { 
    id: 'assigned' as const, 
    title: 'Assigned', 
    description: 'Shifts assigned to guards', 
    color: 'blue', 
    allowedTransitions: ['confirmed'] as const[], 
    requiresValidation: false 
  }
];

describe('ShiftKanbanService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockQuery();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getKanbanBoardData', () => {
    it('retrieves board data successfully with no filters', async () => {
      // Mock successful database response
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        select: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          not: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            order: jest.fn().mockResolvedValue({
              data: mockShifts,
              error: null
            })
          })
        })
      });

      // Mock workflow service
      jest.mocked(ShiftWorkflowService.getWorkflowConfig).mockResolvedValue({
        success: true,
        data: mockColumns
      });

      // Mock alert service
      jest.mocked(UrgentAlertService.getActiveAlerts).mockResolvedValue({
        success: true,
        data: []
      });

      const result = await ShiftKanbanService.getKanbanBoardData('manager-123');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        shifts: mockShifts,
        columns: mockColumns,
        activePresence: [],
        metrics: expect.objectContaining({
          totalShifts: 2,
          completionRate: expect.any(Number)
        })
      });
    });

    it('applies date range filters correctly', async () => {
      setupMockQuery();
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        select: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          not: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            order: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              gte: jest.fn().mockReturnValue({
                ...mockSupabaseClient,
                lt: jest.fn().mockResolvedValue({
                  data: [mockShifts[0]], // Filtered result
                  error: null
                })
              })
            })
          })
        })
      });

      jest.mocked(ShiftWorkflowService.getWorkflowConfig).mockResolvedValue({
        success: true,
        data: mockColumns
      });

      jest.mocked(UrgentAlertService.getActiveAlerts).mockResolvedValue({
        success: true,
        data: []
      });

      const filters: KanbanFilters = {
        dateRange: {
          start: new Date('2025-08-29T00:00:00Z'),
          end: new Date('2025-08-30T00:00:00Z')
        }
      };

      const result = await ShiftKanbanService.getKanbanBoardData('manager-123', filters);

      expect(result.success).toBe(true);
      expect(result.data?.shifts).toHaveLength(1);
    });

    it('applies client filters correctly', async () => {
      setupMockQuery();
      const mockQuery = {
        ...mockSupabaseClient,
        select: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          not: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            order: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              or: jest.fn().mockResolvedValue({
                data: [mockShifts[0]],
                error: null
              })
            })
          })
        })
      };
      mockSupabaseClient.from.mockReturnValueOnce(mockQuery);

      jest.mocked(ShiftWorkflowService.getWorkflowConfig).mockResolvedValue({
        success: true,
        data: mockColumns
      });

      jest.mocked(UrgentAlertService.getActiveAlerts).mockResolvedValue({
        success: true,
        data: []
      });

      const filters: KanbanFilters = {
        clients: ['Test Client']
      };

      const result = await ShiftKanbanService.getKanbanBoardData('manager-123', filters);

      expect(result.success).toBe(true);
      expect(mockQuery.or).toHaveBeenCalled();
    });

    it('handles database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        select: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          not: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection error' }
            })
          })
        })
      });

      const result = await ShiftKanbanService.getKanbanBoardData('manager-123');

      expect(result.success).toBe(false);
      expect(
        typeof result.error === 'string' 
          ? result.error 
          : result.error?.code
      ).toBe('BOARD_DATA_ERROR');
      expect(
        typeof result.error === 'string' 
          ? result.error 
          : result.error?.message
      ).toBe('Failed to retrieve Kanban board data');
    });

    it('handles workflow config service failures', async () => {
      setupMockQuery();
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        select: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          not: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            order: jest.fn().mockResolvedValue({
              data: mockShifts,
              error: null
            })
          })
        })
      });

      jest.mocked(ShiftWorkflowService.getWorkflowConfig).mockResolvedValue({
        success: false,
        error: { code: 'CONFIG_ERROR', message: 'Failed to get workflow config' }
      });

      const result = await ShiftKanbanService.getKanbanBoardData('manager-123');

      expect(result.success).toBe(false);
      expect(
        typeof result.error === 'string' 
          ? result.error 
          : result.error?.message
      ).toBe('Failed to get workflow configuration');
    });
  });

  describe('moveShift', () => {
    it('successfully moves shift between columns', async () => {
      jest.mocked(ShiftWorkflowService.executeTransition).mockResolvedValue({
        success: true,
        data: { transitionId: 'transition-123' }
      });

      const result = await ShiftKanbanService.moveShift(
        'shift-1',
        'assigned',
        'manager-123',
        'Moved via drag-and-drop'
      );

      expect(result.success).toBe(true);
      expect(ShiftWorkflowService.executeTransition).toHaveBeenCalledWith(
        'shift-1',
        'assigned',
        'manager-123',
        {
          transitionReason: 'Moved via drag-and-drop',
          transitionMethod: 'manual'
        }
      );
    });

    it('handles transition validation failures', async () => {
      jest.mocked(ShiftWorkflowService.executeTransition).mockResolvedValue({
        success: false,
        error: { code: 'INVALID_TRANSITION', message: 'Cannot move from unassigned to completed' }
      });

      const result = await ShiftKanbanService.moveShift(
        'shift-1',
        'completed',
        'manager-123'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TRANSITION');
    });

    it('records activity after successful move', async () => {
      jest.mocked(ShiftWorkflowService.executeTransition).mockResolvedValue({
        success: true,
        data: { transitionId: 'transition-123' }
      });

      // Mock console.log to verify activity recording
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await ShiftKanbanService.moveShift(
        'shift-1',
        'assigned',
        'manager-123',
        'Test move'
      );

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Kanban activity recorded:',
        expect.objectContaining({
          type: 'shift_moved',
          manager: 'manager-123'
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('executeBulkAction', () => {
    it('executes bulk status change successfully', async () => {
      jest.mocked(ShiftWorkflowService.executeTransition).mockResolvedValue({
        success: true,
        data: { transitionId: 'transition-123' }
      });

      const bulkRequest: BulkActionRequest = {
        action: 'status_change',
        shiftIds: ['shift-1', 'shift-2'],
        parameters: { newStatus: 'assigned' },
        reason: 'Bulk assignment'
      };

      const result = await ShiftKanbanService.executeBulkAction(bulkRequest, 'manager-123');

      expect(result.success).toBe(true);
      expect(result.data?.results).toHaveLength(2);
      expect(result.data?.status).toBe('completed');
      expect(ShiftWorkflowService.executeTransition).toHaveBeenCalledTimes(2);
    });

    it('executes bulk priority update successfully', async () => {
      setupMockQuery();
      mockSupabaseClient.from.mockReturnValue({
        ...mockSupabaseClient,
        update: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      });

      const bulkRequest: BulkActionRequest = {
        action: 'priority_update',
        shiftIds: ['shift-1', 'shift-2'],
        parameters: { priority: 1 },
        reason: 'Increase priority'
      };

      const result = await ShiftKanbanService.executeBulkAction(bulkRequest, 'manager-123');

      expect(result.success).toBe(true);
      expect(result.data?.results).toHaveLength(2);
      expect(result.data?.operationType).toBe('priority_update');
    });

    it('handles partial failures in bulk operations', async () => {
      jest.mocked(ShiftWorkflowService.executeTransition)
        .mockResolvedValueOnce({
          success: true,
          data: { transitionId: 'transition-1' }
        })
        .mockResolvedValueOnce({
          success: false,
          error: { code: 'INVALID_TRANSITION', message: 'Invalid transition' }
        });

      const bulkRequest: BulkActionRequest = {
        action: 'status_change',
        shiftIds: ['shift-1', 'shift-2'],
        parameters: { newStatus: 'assigned' }
      };

      const result = await ShiftKanbanService.executeBulkAction(bulkRequest, 'manager-123');

      expect(result.success).toBe(true);
      expect(result.data?.results).toHaveLength(2);
      expect(result.data?.status).toBe('failed'); // Mixed results = failed status
      expect(result.data?.results?.[0].success).toBe(true);
      expect(result.data?.results?.[1].success).toBe(false);
    });

    it('validates required parameters for different actions', async () => {
      const invalidRequests = [
        {
          action: 'assign' as const,
          shiftIds: ['shift-1'],
          parameters: {} // Missing guardId
        },
        {
          action: 'status_change' as const,
          shiftIds: ['shift-1'],
          parameters: {} // Missing newStatus
        },
        {
          action: 'priority_update' as const,
          shiftIds: ['shift-1'],
          parameters: {} // Missing priority
        }
      ];

      for (const request of invalidRequests) {
        const result = await ShiftKanbanService.executeBulkAction(request, 'manager-123');
        expect(result.success).toBe(true); // Service continues with errors recorded
        expect(result.data?.results?.[0].success).toBe(false);
      }
    });

    it('handles database errors during bulk operations', async () => {
      setupMockQuery();
      mockSupabaseClient.from.mockReturnValue({
        ...mockSupabaseClient,
        update: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: jest.fn().mockResolvedValue({
            error: { message: 'Database error' }
          })
        })
      });

      const bulkRequest: BulkActionRequest = {
        action: 'priority_update',
        shiftIds: ['shift-1'],
        parameters: { priority: 1 }
      };

      const result = await ShiftKanbanService.executeBulkAction(bulkRequest, 'manager-123');

      expect(result.success).toBe(true);
      expect(result.data?.results?.[0].success).toBe(false);
      expect(result.data?.results?.[0].error).toContain('Database error');
    });
  });

  describe('calculateKanbanMetrics', () => {
    it('calculates metrics correctly from shift data', async () => {
      const shifts = [
        { ...mockShifts[0], status: 'unassigned' },
        { ...mockShifts[1], status: 'completed' },
        { 
          ...mockShifts[0], 
          id: 'shift-3', 
          status: 'assigned',
          shift_urgency_alerts: [{ id: 'alert-1' }]
        }
      ];

      // Access private method via service instance
      const serviceClass = ShiftKanbanService as any;
      const result = await serviceClass.calculateKanbanMetrics(shifts);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        totalShifts: 3,
        shiftsByStatus: {
          unassigned: 1,
          completed: 1,
          assigned: 1
        },
        completionRate: expect.closeTo(33.33, 1), // 1 completed out of 3
        urgentAlertsCount: 1
      });
    });
  });

  describe('getRecentKanbanActivity', () => {
    it('retrieves recent activity successfully', async () => {
      const mockActivityData = [
        {
          id: 'activity-1',
          shift_id: 'shift-1',
          previous_status: 'unassigned',
          new_status: 'assigned',
          transition_method: 'manual',
          changed_at: '2025-08-28T10:00:00Z',
          changed_by: 'manager-123',
          bulk_operation_id: null
        }
      ];

      setupMockQuery();
      mockSupabaseClient.from.mockReturnValue({
        ...mockSupabaseClient,
        select: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          order: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            limit: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              eq: jest.fn().mockResolvedValue({
                data: mockActivityData,
                error: null
              })
            })
          })
        })
      });

      const serviceClass = ShiftKanbanService as any;
      const result = await serviceClass.getRecentKanbanActivity('manager-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toMatchObject({
        activityType: 'shift_moved',
        managerId: 'manager-123'
      });
    });
  });

  describe('Alert Resolution Integration', () => {
    it('resolves related alerts when shift status changes', async () => {
      // Mock alert query
      setupMockQuery();
      mockSupabaseClient.from.mockReturnValue({
        ...mockSupabaseClient,
        select: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            eq: jest.fn().mockResolvedValue({
              data: [
                { id: 'alert-1', alert_type: 'unassigned_24h' }
              ],
              error: null
            })
          })
        })
      });

      jest.mocked(UrgentAlertService.resolveAlert).mockResolvedValue({
        success: true,
        data: { resolved: true }
      });

      jest.mocked(ShiftWorkflowService.executeTransition).mockResolvedValue({
        success: true,
        data: { transitionId: 'transition-123' }
      });

      const result = await ShiftKanbanService.moveShift(
        'shift-1',
        'assigned',
        'manager-123'
      );

      expect(result.success).toBe(true);
      expect(UrgentAlertService.resolveAlert).toHaveBeenCalledWith(
        'alert-1',
        'system',
        'Auto-resolved due to status change to assigned'
      );
    });
  });
});