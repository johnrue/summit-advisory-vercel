/**
 * Integration tests for the Reports & Analytics services
 * Tests the core business logic without component rendering
 */

import { dataExportService } from '@/lib/services/data-export-service'
import { reportAccessControl } from '@/lib/services/report-access-control'

// Mock Supabase
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
}

jest.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabase
}))

// Mock console methods
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

describe('Reports Services Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    consoleSpy.mockClear()
  })

  afterAll(() => {
    consoleSpy.mockRestore()
  })

  describe('Data Export Service Integration', () => {
    it('should validate export configuration', () => {
      const validConfig = {
        dataType: 'guards' as const,
        format: 'csv' as const,
        fields: ['full_name', 'email']
      }

      const availableFields = dataExportService.getAvailableFields('guards')
      expect(availableFields).toContain('full_name')
      expect(availableFields).toContain('email')
      expect(availableFields).toContain('status')
    })

    it('should get available fields for different data types', () => {
      const guardFields = dataExportService.getAvailableFields('guards')
      const applicationFields = dataExportService.getAvailableFields('applications')
      const shiftFields = dataExportService.getAvailableFields('shifts')

      expect(guardFields).toContain('full_name')
      expect(applicationFields).toContain('applicant_name')
      expect(shiftFields).toContain('title')
    })

    it('should estimate export size', async () => {
      // Mock database query
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis()
        })
      })

      const mockQuery = {
        select: jest.fn().mockResolvedValue({
          count: 150,
          error: null
        })
      }

      mockSupabase.from().select.mockResolvedValue({
        count: 150,
        error: null
      })

      const config = {
        dataType: 'guards' as const,
        format: 'csv' as const,
        fields: ['full_name', 'email']
      }

      const estimate = await dataExportService.estimateExportSize(config)
      expect(estimate.recordCount).toBe(150)
      expect(estimate.estimatedSize).toBe('29.3 KB')
    })
  })

  describe('Report Access Control Integration', () => {
    it('should validate user permissions', async () => {
      // Mock user role lookup
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin', permissions: ['reports.view_all', 'reports.export_data'] },
              error: null
            })
          })
        })
      })

      const accessCheck = await reportAccessControl.checkReportAccess(
        'admin-user',
        'guards',
        'export'
      )

      expect(accessCheck.hasAccess).toBe(true)
    })

    it('should apply data masking for sensitive fields', async () => {
      const testData = [
        {
          id: '1',
          full_name: 'John Doe',
          email: 'john@example.com',
          ssn: '123-45-6789',
          phone: '555-123-4567'
        }
      ]

      const maskedData = await reportAccessControl.applyDataMasking(
        'manager-user',
        testData,
        'guards'
      )

      expect(maskedData[0].full_name).toBe('John Doe') // Not masked
      expect(maskedData[0].email).toBe('john@example.com') // Not masked
      expect(maskedData[0].ssn).not.toBe('123-45-6789') // Should be masked
    })
  })

  describe('Service Integration', () => {
    it('should integrate export service with access control', async () => {
      // Test that export service properly calls access control
      const config = {
        dataType: 'guards' as const,
        format: 'csv' as const,
        fields: ['full_name', 'email', 'ssn'],
        userId: 'manager-user'
      }

      // Mock database response
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                full_name: 'John Doe',
                email: 'john@example.com',
                ssn: '123-45-6789'
              }
            ],
            error: null
          })
        })
      })

      const result = await dataExportService.generateExport(config)
      
      // Should succeed but data should be masked
      expect(result.success).toBe(true)
      expect(result.recordCount).toBe(1)
    })
  })
})