import { processBulkImport } from '@/lib/services/lead-bulk-import-service'

// Mock dependencies
jest.mock('@/lib/services/lead-deduplication-service', () => ({
  checkForDuplicates: jest.fn()
}))

jest.mock('@/lib/services/lead-management-service', () => ({
  createLead: jest.fn()
}))

jest.mock('@/lib/services/lead-assignment-service', () => ({
  autoAssignLead: jest.fn()
}))

describe('Lead Bulk Import Service', () => {
  const mockImportData = {
    csvData: `first_name,last_name,email,phone,service_type,message,estimated_value,priority
John,Doe,john.doe@example.com,555-0123,armed,Need security services,5000,high
Jane,Smith,jane.smith@example.com,555-0124,unarmed,Event security needed,3000,medium
Bob,Johnson,bob.johnson@example.com,555-0125,executive,Executive protection,15000,high`,
    sourceType: 'networking_event' as any,
    defaultServiceType: 'armed',
    defaultPriority: 'medium' as any,
    autoAssign: true
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('processBulkImport', () => {
    it('should successfully import valid CSV data', async () => {
      const { checkForDuplicates } = require('@/lib/services/lead-deduplication-service')
      const { createLead } = require('@/lib/services/lead-management-service')
      const { autoAssignLead } = require('@/lib/services/lead-assignment-service')

      // Mock no duplicates found
      checkForDuplicates.mockResolvedValue({
        success: true,
        data: []
      })

      // Mock successful lead creation
      createLead.mockResolvedValue({
        success: true,
        data: { id: 'new-lead-id' }
      })

      // Mock successful assignment
      autoAssignLead.mockResolvedValue({
        success: true,
        data: { assignedTo: 'manager-id' }
      })

      const result = await processBulkImport(mockImportData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.processed).toBe(3)
      expect(result.data?.imported).toBe(3)
      expect(result.data?.duplicates).toBe(0)
      expect(result.data?.errors).toBe(0)
      expect(result.data?.assigned).toBe(3)

      // Verify functions were called correct number of times
      expect(checkForDuplicates).toHaveBeenCalledTimes(3)
      expect(createLead).toHaveBeenCalledTimes(3)
      expect(autoAssignLead).toHaveBeenCalledTimes(3)
    })

    it('should handle duplicate detection', async () => {
      const { checkForDuplicates } = require('@/lib/services/lead-deduplication-service')
      const { createLead } = require('@/lib/services/lead-management-service')

      // Mock duplicate found for first lead, none for others
      checkForDuplicates
        .mockResolvedValueOnce({
          success: true,
          data: [{ matchType: 'exact_email', confidence: 100 }]
        })
        .mockResolvedValue({
          success: true,
          data: []
        })

      // Mock successful lead creation for non-duplicates
      createLead.mockResolvedValue({
        success: true,
        data: { id: 'new-lead-id' }
      })

      const result = await processBulkImport(mockImportData)

      expect(result.success).toBe(true)
      expect(result.data?.processed).toBe(3)
      expect(result.data?.imported).toBe(2)
      expect(result.data?.duplicates).toBe(1)
      expect(result.data?.errors).toBe(0)

      // Should only create leads for non-duplicates
      expect(createLead).toHaveBeenCalledTimes(2)
    })

    it('should handle lead creation errors', async () => {
      const { checkForDuplicates } = require('@/lib/services/lead-deduplication-service')
      const { createLead } = require('@/lib/services/lead-management-service')

      // Mock no duplicates
      checkForDuplicates.mockResolvedValue({
        success: true,
        data: []
      })

      // Mock creation failure for first lead, success for others
      createLead
        .mockResolvedValueOnce({
          success: false,
          error: 'Database error'
        })
        .mockResolvedValue({
          success: true,
          data: { id: 'new-lead-id' }
        })

      const result = await processBulkImport(mockImportData)

      expect(result.success).toBe(true)
      expect(result.data?.processed).toBe(3)
      expect(result.data?.imported).toBe(2)
      expect(result.data?.duplicates).toBe(0)
      expect(result.data?.errors).toBe(1)
      expect(result.data?.errorDetails).toHaveLength(1)
      expect(result.data?.errorDetails[0]).toContain('Row 1')
    })

    it('should validate CSV format', async () => {
      const invalidCsvData = {
        ...mockImportData,
        csvData: 'invalid,csv,format\nno,headers,here'
      }

      const result = await processBulkImport(invalidCsvData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid CSV format')
    })

    it('should handle missing required headers', async () => {
      const missingHeadersCsv = {
        ...mockImportData,
        csvData: 'first_name,email\nJohn,john@example.com'
      }

      const result = await processBulkImport(missingHeadersCsv)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required headers')
    })

    it('should validate row data', async () => {
      const invalidRowData = {
        ...mockImportData,
        csvData: `first_name,last_name,email,phone,service_type,message,estimated_value,priority
,Doe,invalid-email,123,armed,Message,not-a-number,invalid-priority`
      }

      const { checkForDuplicates } = require('@/lib/services/lead-deduplication-service')
      checkForDuplicates.mockResolvedValue({
        success: true,
        data: []
      })

      const result = await processBulkImport(invalidRowData)

      expect(result.success).toBe(true)
      expect(result.data?.processed).toBe(1)
      expect(result.data?.imported).toBe(0)
      expect(result.data?.errors).toBe(1)
      expect(result.data?.errorDetails[0]).toContain('validation errors')
    })

    it('should use default values when fields are missing', async () => {
      const minimalCsvData = {
        ...mockImportData,
        csvData: `first_name,last_name,email,phone
John,Doe,john.doe@example.com,555-0123`
      }

      const { checkForDuplicates } = require('@/lib/services/lead-deduplication-service')
      const { createLead } = require('@/lib/services/lead-management-service')

      checkForDuplicates.mockResolvedValue({
        success: true,
        data: []
      })

      createLead.mockResolvedValue({
        success: true,
        data: { id: 'new-lead-id' }
      })

      const result = await processBulkImport(minimalCsvData)

      expect(result.success).toBe(true)
      expect(createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          service_type: 'armed', // Default service type
          priority: 'medium', // Default priority
          source_type: 'networking_event' // From import data
        })
      )
    })

    it('should handle assignment failures gracefully', async () => {
      const { checkForDuplicates } = require('@/lib/services/lead-deduplication-service')
      const { createLead } = require('@/lib/services/lead-management-service')
      const { autoAssignLead } = require('@/lib/services/lead-assignment-service')

      checkForDuplicates.mockResolvedValue({
        success: true,
        data: []
      })

      createLead.mockResolvedValue({
        success: true,
        data: { id: 'new-lead-id' }
      })

      // Mock assignment failure
      autoAssignLead.mockResolvedValue({
        success: false,
        error: 'No available managers'
      })

      const result = await processBulkImport(mockImportData)

      expect(result.success).toBe(true)
      expect(result.data?.imported).toBe(3) // Leads still imported
      expect(result.data?.assigned).toBe(0) // But not assigned
      expect(result.data?.assignmentErrors).toBe(3)
    })

    it('should process large imports in chunks', async () => {
      // Create a large CSV with 150 rows (should be processed in chunks)
      let largeCsv = 'first_name,last_name,email,phone,service_type,message,estimated_value,priority\n'
      for (let i = 0; i < 150; i++) {
        largeCsv += `User${i},Test,user${i}@example.com,555-${i.toString().padStart(4, '0')},armed,Test message,5000,medium\n`
      }

      const largeCsvData = {
        ...mockImportData,
        csvData: largeCsv
      }

      const { checkForDuplicates } = require('@/lib/services/lead-deduplication-service')
      const { createLead } = require('@/lib/services/lead-management-service')

      checkForDuplicates.mockResolvedValue({
        success: true,
        data: []
      })

      createLead.mockResolvedValue({
        success: true,
        data: { id: 'new-lead-id' }
      })

      const result = await processBulkImport(largeCsvData)

      expect(result.success).toBe(true)
      expect(result.data?.processed).toBe(150)
      expect(result.data?.imported).toBe(150)

      // Should have called functions for all rows
      expect(checkForDuplicates).toHaveBeenCalledTimes(150)
      expect(createLead).toHaveBeenCalledTimes(150)
    })

    it('should skip auto-assignment when disabled', async () => {
      const noAssignImportData = {
        ...mockImportData,
        autoAssign: false
      }

      const { checkForDuplicates } = require('@/lib/services/lead-deduplication-service')
      const { createLead } = require('@/lib/services/lead-management-service')
      const { autoAssignLead } = require('@/lib/services/lead-assignment-service')

      checkForDuplicates.mockResolvedValue({
        success: true,
        data: []
      })

      createLead.mockResolvedValue({
        success: true,
        data: { id: 'new-lead-id' }
      })

      const result = await processBulkImport(noAssignImportData)

      expect(result.success).toBe(true)
      expect(result.data?.imported).toBe(3)
      expect(result.data?.assigned).toBe(0)
      expect(autoAssignLead).not.toHaveBeenCalled()
    })
  })
})