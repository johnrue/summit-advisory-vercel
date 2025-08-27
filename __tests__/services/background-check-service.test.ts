import { BackgroundCheckService } from '@/lib/services/background-check-service'
import type { BackgroundCheckStatus, BackgroundCheckUpdate } from '@/lib/types/background-check'

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        })),
        lte: jest.fn(() => ({
          not: jest.fn(() => ({
            eq: jest.fn()
          }))
        })),
        order: jest.fn()
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }))
}))

describe('BackgroundCheckService', () => {
  let backgroundCheckService: BackgroundCheckService
  
  beforeEach(() => {
    backgroundCheckService = new BackgroundCheckService()
    jest.clearAllMocks()
  })

  describe('updateStatus', () => {
    it('should successfully update background check status with valid transition', async () => {
      const mockCurrentData = { background_check_status: 'pending' }
      const mockAuditRecord = {
        id: 'audit-123',
        application_id: 'app-123',
        previous_status: 'pending',
        new_status: 'in_progress',
        changed_by: 'user-123',
        change_reason: 'Background check initiated',
        created_at: new Date().toISOString(),
        manager_signature: 'John Manager',
        is_system_generated: false
      }

      const mockSupabase = require('@supabase/supabase-js').createClient()
      
      // Mock successful current status fetch
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockCurrentData,
        error: null
      })

      // Mock successful audit record creation
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockAuditRecord,
        error: null
      })

      // Mock successful guard_leads update
      mockSupabase.from().update().eq.mockResolvedValueOnce({
        error: null
      })

      const update: BackgroundCheckUpdate = {
        status: 'in_progress',
        notes: 'Background check initiated',
        approverSignature: 'John Manager'
      }

      const result = await backgroundCheckService.updateStatus('app-123', update, 'user-123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.applicationId).toBe('app-123')
        expect(result.data.newStatus).toBe('in_progress')
        expect(result.data.previousStatus).toBe('pending')
      }
    })

    it('should reject invalid status transitions', async () => {
      const mockCurrentData = { background_check_status: 'complete' }
      
      const mockSupabase = require('@supabase/supabase-js').createClient()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockCurrentData,
        error: null
      })

      const update: BackgroundCheckUpdate = {
        status: 'in_progress', // Invalid: can't go from complete to in_progress
        notes: 'Invalid transition attempt',
        approverSignature: 'John Manager'
      }

      const result = await backgroundCheckService.updateStatus('app-123', update, 'user-123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid status transition')
      }
    })

    it('should handle database errors gracefully', async () => {
      const mockSupabase = require('@supabase/supabase-js').createClient()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Application not found' }
      })

      const update: BackgroundCheckUpdate = {
        status: 'in_progress',
        notes: 'Test update',
        approverSignature: 'John Manager'
      }

      const result = await backgroundCheckService.updateStatus('invalid-app', update, 'user-123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Failed to fetch current status')
      }
    })
  })

  describe('getAuditTrail', () => {
    it('should retrieve audit trail with user information', async () => {
      const mockAuditData = [
        {
          id: 'audit-1',
          application_id: 'app-123',
          previous_status: null,
          new_status: 'pending',
          changed_by: 'user-1',
          change_reason: 'Initial background check request',
          created_at: new Date().toISOString(),
          manager_signature: 'John Manager',
          is_system_generated: false,
          users: { first_name: 'John', last_name: 'Manager' }
        }
      ]

      const mockSupabase = require('@supabase/supabase-js').createClient()
      mockSupabase.from().select().eq().order.mockResolvedValueOnce({
        data: mockAuditData,
        error: null
      })

      const result = await backgroundCheckService.getAuditTrail('app-123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].changedBy).toBe('John Manager')
        expect(result.data[0].newStatus).toBe('pending')
      }
    })
  })

  describe('getExpiringBackgroundChecks', () => {
    it('should return applications with expiring background checks', async () => {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 10) // 10 days from now

      const mockData = [
        {
          id: 'app-1',
          first_name: 'Jane',
          last_name: 'Doe',
          background_check_status: 'complete',
          background_check_expiry_date: expiryDate.toISOString().split('T')[0],
          assigned_to: 'manager-1',
          users: { first_name: 'Manager', last_name: 'One' }
        }
      ]

      const mockSupabase = require('@supabase/supabase-js').createClient()
      mockSupabase.from().select().eq().lte().not().mockResolvedValueOnce({
        data: mockData,
        error: null
      })

      const result = await backgroundCheckService.getExpiringBackgroundChecks(30)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].applicantName).toBe('Jane Doe')
        expect(result.data[0].daysUntilExpiry).toBeGreaterThan(0)
        expect(result.data[0].assignedManager).toBe('Manager One')
      }
    })
  })

  describe('validateStatusTransition', () => {
    it('should validate correct status transitions', () => {
      const service = new BackgroundCheckService()
      
      // Test valid transitions
      expect(service['validateStatusTransition']('pending', 'in_progress')).toBe(true)
      expect(service['validateStatusTransition']('in_progress', 'complete')).toBe(true)
      expect(service['validateStatusTransition']('in_progress', 'failed')).toBe(true)
      expect(service['validateStatusTransition']('complete', 'expired')).toBe(true)
      expect(service['validateStatusTransition']('failed', 'pending')).toBe(true)
      expect(service['validateStatusTransition']('expired', 'pending')).toBe(true)
    })

    it('should reject invalid status transitions', () => {
      const service = new BackgroundCheckService()
      
      // Test invalid transitions
      expect(service['validateStatusTransition']('complete', 'pending')).toBe(false)
      expect(service['validateStatusTransition']('complete', 'in_progress')).toBe(false)
      expect(service['validateStatusTransition']('pending', 'complete')).toBe(false)
    })
  })
})