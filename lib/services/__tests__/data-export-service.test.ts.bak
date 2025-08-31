import { dataExportService, type ExportConfig } from '../data-export-service'

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        })),
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn()
            }))
          }))
        })),
        limit: jest.fn(),
        order: jest.fn()
      }))
    }))
  })
}))

describe('DataExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateConfig', () => {
    it('should validate required fields', async () => {
      const validConfig: ExportConfig = {
        dataType: 'guards',
        format: 'csv',
        fields: ['id', 'full_name', 'email']
      }

      const result = await dataExportService.generateExport(validConfig)
      
      // Should not fail on validation
      expect(result).toBeDefined()
    })

    it('should reject invalid data type', async () => {
      const invalidConfig: ExportConfig = {
        dataType: 'invalid' as any,
        format: 'csv',
        fields: ['id']
      }

      const result = await dataExportService.generateExport(invalidConfig)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid data type')
    })

    it('should reject invalid format', async () => {
      const invalidConfig: ExportConfig = {
        dataType: 'guards',
        format: 'invalid' as any,
        fields: ['id']
      }

      const result = await dataExportService.generateExport(invalidConfig)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid export format')
    })

    it('should require data type', async () => {
      const invalidConfig: ExportConfig = {
        dataType: '' as any,
        format: 'csv',
        fields: ['id']
      }

      const result = await dataExportService.generateExport(invalidConfig)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Data type is required')
    })

    it('should require format', async () => {
      const invalidConfig: ExportConfig = {
        dataType: 'guards',
        format: '' as any,
        fields: ['id']
      }

      const result = await dataExportService.generateExport(invalidConfig)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Export format is required')
    })
  })

  describe('getAvailableFields', () => {
    it('should return correct fields for guards', () => {
      const fields = dataExportService.getAvailableFields('guards')
      
      expect(fields).toContain('id')
      expect(fields).toContain('full_name')
      expect(fields).toContain('email')
      expect(fields).toContain('phone')
      expect(fields).toContain('status')
      expect(fields).toContain('license_number')
    })

    it('should return correct fields for applications', () => {
      const fields = dataExportService.getAvailableFields('applications')
      
      expect(fields).toContain('id')
      expect(fields).toContain('applicant_name')
      expect(fields).toContain('email')
      expect(fields).toContain('status')
      expect(fields).toContain('pipeline_stage')
    })

    it('should return correct fields for shifts', () => {
      const fields = dataExportService.getAvailableFields('shifts')
      
      expect(fields).toContain('id')
      expect(fields).toContain('title')
      expect(fields).toContain('location')
      expect(fields).toContain('start_time')
      expect(fields).toContain('end_time')
      expect(fields).toContain('status')
    })

    it('should return correct fields for compliance', () => {
      const fields = dataExportService.getAvailableFields('compliance')
      
      expect(fields).toContain('id')
      expect(fields).toContain('guard_id')
      expect(fields).toContain('certification_type')
      expect(fields).toContain('issue_date')
      expect(fields).toContain('expiry_date')
    })

    it('should return correct fields for audit-logs', () => {
      const fields = dataExportService.getAvailableFields('audit-logs')
      
      expect(fields).toContain('id')
      expect(fields).toContain('timestamp')
      expect(fields).toContain('user_id')
      expect(fields).toContain('action')
      expect(fields).toContain('resource_type')
    })

    it('should return empty array for unknown data type', () => {
      const fields = dataExportService.getAvailableFields('unknown' as any)
      
      expect(fields).toEqual([])
    })
  })

  describe('CSV export functionality', () => {
    it('should handle CSV field escaping correctly', () => {
      // Access private method through any cast for testing
      const service = dataExportService as any
      
      expect(service.escapeCSVField('simple')).toBe('simple')
      expect(service.escapeCSVField('with,comma')).toBe('"with,comma"')
      expect(service.escapeCSVField('with"quote')).toBe('"with""quote"')
      expect(service.escapeCSVField('with\nnewline')).toBe('"with\nnewline"')
      expect(service.escapeCSVField(null)).toBe('')
      expect(service.escapeCSVField(undefined)).toBe('')
    })

    it('should format field names correctly', () => {
      const service = dataExportService as any
      
      expect(service.formatFieldName('full_name')).toBe('Full Name')
      expect(service.formatFieldName('license_number')).toBe('License Number')
      expect(service.formatFieldName('created_at')).toBe('Created At')
    })

    it('should format field values correctly', () => {
      const service = dataExportService as any
      const testDate = new Date('2025-01-22T10:00:00Z')
      
      expect(service.formatFieldValue('string')).toBe('string')
      expect(service.formatFieldValue(123)).toBe('123')
      expect(service.formatFieldValue(null)).toBe('')
      expect(service.formatFieldValue(undefined)).toBe('')
      expect(service.formatFieldValue(testDate)).toBe(testDate.toISOString())
      expect(service.formatFieldValue({ key: 'value' })).toBe('{"key":"value"}')
    })
  })

  describe('File size formatting', () => {
    it('should format file sizes correctly', () => {
      const service = dataExportService as any
      
      expect(service.formatFileSize(0)).toBe('0 Bytes')
      expect(service.formatFileSize(1024)).toBe('1 KB')
      expect(service.formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(service.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
      expect(service.formatFileSize(1536)).toBe('1.5 KB')
    })
  })

  describe('Table name mapping', () => {
    it('should map data types to correct table names', () => {
      const service = dataExportService as any
      
      expect(service.getTableName('guards')).toBe('guards')
      expect(service.getTableName('applications')).toBe('applications')
      expect(service.getTableName('shifts')).toBe('shifts')
      expect(service.getTableName('compliance')).toBe('compliance_records')
      expect(service.getTableName('audit-logs')).toBe('audit_logs')
    })
  })

  describe('Date column mapping', () => {
    it('should map data types to correct date columns', () => {
      const service = dataExportService as any
      
      expect(service.getDateColumn('guards')).toBe('created_at')
      expect(service.getDateColumn('applications')).toBe('applied_date')
      expect(service.getDateColumn('shifts')).toBe('created_at')
      expect(service.getDateColumn('compliance')).toBe('created_at')
      expect(service.getDateColumn('audit-logs')).toBe('timestamp')
    })
  })

  describe('Export configuration validation', () => {
    it('should accept valid export configurations', () => {
      const validConfigs: ExportConfig[] = [
        {
          dataType: 'guards',
          format: 'csv',
          fields: ['id', 'full_name'],
          dateRange: {
            from: new Date('2025-01-01'),
            to: new Date('2025-01-31')
          }
        },
        {
          dataType: 'applications',
          format: 'json',
          fields: ['id', 'status'],
          filters: { status: 'active' }
        },
        {
          dataType: 'shifts',
          format: 'pdf',
          fields: ['id', 'title'],
          sortBy: 'created_at',
          sortOrder: 'desc'
        }
      ]

      validConfigs.forEach(config => {
        const service = dataExportService as any
        const validation = service.validateConfig(config)
        expect(validation.isValid).toBe(true)
      })
    })
  })

  describe('Integration with supported formats', () => {
    it('should support all required export formats', () => {
      const supportedFormats = ['csv', 'json', 'pdf']
      
      supportedFormats.forEach(format => {
        const config: ExportConfig = {
          dataType: 'guards',
          format: format as any,
          fields: ['id', 'full_name']
        }
        
        const service = dataExportService as any
        const validation = service.validateConfig(config)
        expect(validation.isValid).toBe(true)
      })
    })

    it('should support all required data types', () => {
      const supportedDataTypes = ['guards', 'applications', 'shifts', 'compliance', 'audit-logs']
      
      supportedDataTypes.forEach(dataType => {
        const config: ExportConfig = {
          dataType: dataType as any,
          format: 'csv',
          fields: ['id']
        }
        
        const service = dataExportService as any
        const validation = service.validateConfig(config)
        expect(validation.isValid).toBe(true)
      })
    })
  })
})