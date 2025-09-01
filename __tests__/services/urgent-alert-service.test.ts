// Story 3.4: UrgentAlertService Tests
// Tests for 24-hour shift monitoring and alert system

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { UrgentAlertService } from '@/lib/services/urgent-alert-service';
import type { 
  UrgentShiftAlert, 
  EscalationRule,
  ShiftUrgencyCalculation 
} from '@/lib/types/urgency-types';

// Mock dependencies
jest.mock('@/lib/supabase');

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  eq: jest.fn(),
  in: jest.fn(),
  lt: jest.fn(),
  order: jest.fn(),
  single: jest.fn()
};

// Setup chainable query mocks
const setupMockQuery = () => {
  mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.update.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.in.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.lt.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.order.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.single.mockReturnValue(mockSupabaseClient);
};

// Mock alert data
const mockAlerts: UrgentAlert[] = [
  {
    id: 'alert-1',
    shift_id: 'shift-1',
    alert_type: 'unassigned_24h',
    alert_priority: 'high',
    hours_until_shift: 18,
    alert_status: 'active',
    escalation_level: 1,
    created_at: new Date('2025-08-28T10:00:00Z'),
    updated_at: new Date('2025-08-28T10:00:00Z')
  },
  {
    id: 'alert-2', 
    shift_id: 'shift-2',
    alert_type: 'unconfirmed_12h',
    alert_priority: 'medium',
    hours_until_shift: 8,
    alert_status: 'active',
    escalation_level: 1,
    created_at: new Date('2025-08-28T11:00:00Z'),
    updated_at: new Date('2025-08-28T11:00:00Z')
  }
];

const mockShifts = [
  {
    id: 'shift-unassigned',
    status: 'unassigned',
    time_range: '[2025-08-29T09:00:00Z,2025-08-29T17:00:00Z)',
    assigned_guard_id: null,
    client_info: { name: 'Test Client' },
    location_data: { siteName: 'Test Site' },
    priority: 2
  },
  {
    id: 'shift-assigned-unconfirmed',
    status: 'assigned',
    time_range: '[2025-08-29T10:00:00Z,2025-08-29T18:00:00Z)',
    assigned_guard_id: 'guard-1',
    client_info: { name: 'Test Client 2' },
    location_data: { siteName: 'Test Site 2' },
    priority: 1,
    shift_assignments: [{
      assignment_status: 'pending'
    }]
  }
];

describe('UrgentAlertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockQuery();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getActiveAlerts', () => {
    it('retrieves active alerts successfully', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        select: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            order: jest.fn().mockResolvedValue({
              data: mockAlerts,
              error: null
            })
          })
        })
      });

      const result = await UrgentAlertService.getActiveAlerts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAlerts);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('alert_status', 'active');
    });

    it('filters alerts by shift IDs when provided', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        select: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            in: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              order: jest.fn().mockResolvedValue({
                data: [mockAlerts[0]],
                error: null
              })
            })
          })
        })
      });

      const result = await UrgentAlertService.getActiveAlerts(['shift-1']);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockSupabaseClient.in).toHaveBeenCalledWith('shift_id', ['shift-1']);
    });

    it('handles database errors gracefully', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        select: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection error' }
            })
          })
        })
      });

      const result = await UrgentAlertService.getActiveAlerts();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ALERTS_FETCH_ERROR');
    });
  });

  describe('createAlert', () => {
    it('creates new alert successfully', async () => {
      const newAlert: Omit<UrgentAlert, 'id'> = {
        shift_id: 'shift-3',
        alert_type: 'unassigned_24h',
        alert_priority: 'high',
        hours_until_shift: 20,
        alert_status: 'active',
        escalation_level: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        insert: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          select: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            single: jest.fn().mockResolvedValue({
              data: { ...newAlert, id: 'alert-new' },
              error: null
            })
          })
        })
      });

      const result = await UrgentAlertService.createAlert(newAlert);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('alert-new');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([newAlert]);
    });

    it('handles duplicate alert prevention', async () => {
      const duplicateAlert: Omit<UrgentAlert, 'id'> = {
        shift_id: 'shift-1', // Already has alert
        alert_type: 'unassigned_24h',
        alert_priority: 'high',
        hours_until_shift: 20,
        alert_status: 'active',
        escalation_level: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        insert: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          select: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'duplicate key value violates unique constraint' }
            })
          })
        })
      });

      const result = await UrgentAlertService.createAlert(duplicateAlert);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ALERT_CREATE_ERROR');
    });
  });

  describe('resolveAlert', () => {
    it('resolves alert successfully', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        update: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              single: jest.fn().mockResolvedValue({
                data: { 
                  ...mockAlerts[0], 
                  alert_status: 'resolved',
                  resolved_at: new Date(),
                  acknowledged_by: 'manager-123'
                },
                error: null
              })
            })
          })
        })
      });

      const result = await UrgentAlertService.resolveAlert(
        'alert-1',
        'manager-123',
        'Shift has been assigned'
      );

      expect(result.success).toBe(true);
      expect(result.data?.alert_status).toBe('resolved');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        alert_status: 'resolved',
        acknowledged_by: 'manager-123',
        resolved_at: expect.any(String),
        updated_at: expect.any(String)
      });
    });

    it('handles non-existent alert resolution', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        update: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'No rows updated' }
              })
            })
          })
        })
      });

      const result = await UrgentAlertService.resolveAlert(
        'non-existent',
        'manager-123',
        'Test reason'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ALERT_RESOLVE_ERROR');
    });
  });

  describe('acknowledgeAlert', () => {
    it('acknowledges alert successfully', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        update: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              single: jest.fn().mockResolvedValue({
                data: { 
                  ...mockAlerts[0], 
                  alert_status: 'acknowledged',
                  acknowledged_by: 'manager-123',
                  acknowledged_at: new Date()
                },
                error: null
              })
            })
          })
        })
      });

      const result = await UrgentAlertService.acknowledgeAlert('alert-1', 'manager-123');

      expect(result.success).toBe(true);
      expect(result.data?.alert_status).toBe('acknowledged');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        alert_status: 'acknowledged',
        acknowledged_by: 'manager-123',
        acknowledged_at: expect.any(String),
        updated_at: expect.any(String)
      });
    });
  });

  describe('escalateAlert', () => {
    it('escalates alert successfully', async () => {
      const escalationRequest: AlertEscalationRequest = {
        alertId: 'alert-1',
        escalatedBy: 'system',
        escalationReason: 'No acknowledgment after 2 hours',
        newPriority: 'critical'
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        update: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              single: jest.fn().mockResolvedValue({
                data: { 
                  ...mockAlerts[0], 
                  escalation_level: 2,
                  alert_priority: 'critical',
                  last_escalated_at: new Date()
                },
                error: null
              })
            })
          })
        })
      });

      const result = await UrgentAlertService.escalateAlert(escalationRequest);

      expect(result.success).toBe(true);
      expect(result.data?.escalation_level).toBe(2);
      expect(result.data?.alert_priority).toBe('critical');
    });

    it('prevents over-escalation', async () => {
      const alertAtMaxLevel = {
        ...mockAlerts[0],
        escalation_level: 5 // Max level
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        select: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            single: jest.fn().mockResolvedValue({
              data: alertAtMaxLevel,
              error: null
            })
          })
        })
      });

      const escalationRequest: AlertEscalationRequest = {
        alertId: 'alert-1',
        escalatedBy: 'system',
        escalationReason: 'Automatic escalation',
        newPriority: 'critical'
      };

      const result = await UrgentAlertService.escalateAlert(escalationRequest);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('already at maximum escalation level');
    });
  });

  describe('calculateUrgency', () => {
    it('calculates urgency for unassigned shifts correctly', async () => {
      const calculation = await UrgentAlertService.calculateUrgency(mockShifts[0]);

      expect(calculation.urgencyScore).toBeGreaterThan(0);
      expect(calculation.alertType).toBe('unassigned_24h');
      expect(calculation.shouldAlert).toBe(true);
      expect(calculation.hoursUntilShift).toBeGreaterThan(0);
    });

    it('calculates urgency for assigned but unconfirmed shifts', async () => {
      const calculation = await UrgentAlertService.calculateUrgency(mockShifts[1]);

      expect(calculation.urgencyScore).toBeGreaterThan(0);
      expect(calculation.alertType).toBe('unconfirmed_12h');
      expect(calculation.shouldAlert).toBe(true);
    });

    it('returns low urgency for properly confirmed shifts', async () => {
      const confirmedShift = {
        ...mockShifts[1],
        status: 'confirmed',
        shift_assignments: [{
          assignment_status: 'confirmed'
        }]
      };

      const calculation = await UrgentAlertService.calculateUrgency(confirmedShift);

      expect(calculation.urgencyScore).toBeLessThan(5);
      expect(calculation.shouldAlert).toBe(false);
    });

    it('factors in shift priority for urgency calculation', async () => {
      const highPriorityShift = {
        ...mockShifts[0],
        priority: 1 // High priority
      };

      const lowPriorityShift = {
        ...mockShifts[0],
        priority: 5 // Low priority
      };

      const highCalc = await UrgentAlertService.calculateUrgency(highPriorityShift);
      const lowCalc = await UrgentAlertService.calculateUrgency(lowPriorityShift);

      expect(highCalc.urgencyScore).toBeGreaterThan(lowCalc.urgencyScore);
    });

    it('considers certification requirements in urgency', async () => {
      const specializedShift = {
        ...mockShifts[0],
        required_certifications: ['Armed', 'Level III', 'Personal Protection Officer']
      };

      const calculation = await UrgentAlertService.calculateUrgency(specializedShift);

      expect(calculation.urgencyScore).toBeGreaterThan(5); // Higher due to certifications
      expect(calculation.factors).toContain('specialized_certifications');
    });
  });

  describe('monitorShifts', () => {
    it('monitors and creates alerts for qualifying shifts', async () => {
      // Mock shift query
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        select: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          in: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            lt: jest.fn().mockResolvedValue({
              data: mockShifts,
              error: null
            })
          })
        })
      });

      // Mock alert creation
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        insert: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          select: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            single: jest.fn().mockResolvedValue({
              data: { id: 'new-alert', ...mockAlerts[0] },
              error: null
            })
          })
        })
      });

      const result = await UrgentAlertService.monitorShifts();

      expect(result.success).toBe(true);
      expect(result.data?.monitored).toBeGreaterThan(0);
      expect(result.data?.alertsCreated).toBeGreaterThan(0);
    });

    it('skips shifts that already have active alerts', async () => {
      const shiftsWithAlerts = mockShifts.map(shift => ({
        ...shift,
        shift_urgency_alerts: [{ id: 'existing-alert' }]
      }));

      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        select: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          in: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            lt: jest.fn().mockResolvedValue({
              data: shiftsWithAlerts,
              error: null
            })
          })
        })
      });

      const result = await UrgentAlertService.monitorShifts();

      expect(result.success).toBe(true);
      expect(result.data?.alertsCreated).toBe(0); // No new alerts created
      expect(result.data?.skipped).toBe(shiftsWithAlerts.length);
    });
  });

  describe('Alert Lifecycle Integration', () => {
    it('processes complete alert lifecycle', async () => {
      // Create alert
      const newAlert: Omit<UrgentAlert, 'id'> = {
        shift_id: 'shift-lifecycle',
        alert_type: 'unassigned_24h',
        alert_priority: 'high',
        hours_until_shift: 18,
        alert_status: 'active',
        escalation_level: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock create
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        insert: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          select: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            single: jest.fn().mockResolvedValue({
              data: { ...newAlert, id: 'lifecycle-alert' },
              error: null
            })
          })
        })
      });

      // Mock acknowledge
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        update: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              single: jest.fn().mockResolvedValue({
                data: { ...newAlert, id: 'lifecycle-alert', alert_status: 'acknowledged' },
                error: null
              })
            })
          })
        })
      });

      // Mock resolve
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockSupabaseClient,
        update: jest.fn().mockReturnValue({
          ...mockSupabaseClient,
          eq: jest.fn().mockReturnValue({
            ...mockSupabaseClient,
            select: jest.fn().mockReturnValue({
              ...mockSupabaseClient,
              single: jest.fn().mockResolvedValue({
                data: { ...newAlert, id: 'lifecycle-alert', alert_status: 'resolved' },
                error: null
              })
            })
          })
        })
      });

      // Execute lifecycle
      const created = await UrgentAlertService.createAlert(newAlert);
      expect(created.success).toBe(true);

      const acknowledged = await UrgentAlertService.acknowledgeAlert('lifecycle-alert', 'manager-123');
      expect(acknowledged.success).toBe(true);
      expect(acknowledged.data?.alert_status).toBe('acknowledged');

      const resolved = await UrgentAlertService.resolveAlert('lifecycle-alert', 'manager-123', 'Shift assigned');
      expect(resolved.success).toBe(true);
      expect(resolved.data?.alert_status).toBe('resolved');
    });
  });
});