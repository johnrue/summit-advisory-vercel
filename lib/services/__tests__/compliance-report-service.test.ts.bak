import { ComplianceReportService } from '../compliance-report-service'
import type { Guard, ReportParameters } from '@/lib/types'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => ({
              data: mockGuardData,
              error: null
            }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 'test-report-id' },
            error: null
          }))
        }))
      }))
    }))
  }
}))

const mockGuardData: Guard[] = [
  {
    id: 'guard-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-0101',
    licenseNumber: 'TX123456',
    licenseExpiry: new Date('2025-12-31'),
    employmentStatus: 'active',
    employmentStartDate: new Date('2024-01-15'),
    ssn: '123-45-6789',
    dateOfBirth: new Date('1990-01-01'),
    homeAddress: '123 Main St, Houston, TX',
    emergencyContact: 'Jane Doe - 555-0102',
    certifications: {
      id: 'cert-1',
      guardId: 'guard-1',
      status: 'active',
      issueDate: new Date('2024-01-01'),
      expiryDate: new Date('2025-12-31'),
      certificationNumber: 'CERT123',
      certificationTypes: ['Basic Security']
    },
    backgroundChecks: {
      id: 'bg-1',
      guardId: 'guard-1',
      status: 'passed',
      completedAt: new Date('2024-01-10'),
      expiryDate: new Date('2026-01-10'),
      checkType: 'dps'
    },
    trainingRecords: {
      id: 'training-1',
      guardId: 'guard-1',
      trainingType: 'Basic Security Training',
      completedAt: new Date('2024-01-05'),
      instructor: 'Training Corp'
    },
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  }
]

describe('ComplianceReportService', () => {
  describe('generateTOPSReport', () => {
    it('should generate TOPS compliance report with correct structure', async () => {
      const parameters: ReportParameters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        format: 'pdf',
        includeSensitiveData: true,
        generatedBy: 'admin-user-id',
        recipients: ['compliance@summitadvisoryfirm.com']
      }

      const result = await ComplianceReportService.generateTOPSReport(parameters)

      expect(result).toBeDefined()
      expect(result.data.reportType).toBe('tops_compliance')
      expect(result.data.company.name).toBe('Summit Advisory')
      expect(result.data.company.license).toBe('TX DPS #C29754001')
      expect(result.data.guards).toHaveLength(1)
    })

    it('should apply data masking when includeSensitiveData is false', async () => {
      const parameters: ReportParameters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        format: 'pdf',
        includeSensitiveData: false,
        generatedBy: 'manager-user-id'
      }

      const result = await ComplianceReportService.generateTOPSReport(parameters)

      expect(result.data.guards[0].ssn).toBe('XXX-XX-6789')
      expect(result.data.guards[0].dateOfBirth).toBeNull()
      expect(result.data.guards[0].homeAddress).toBe('RESTRICTED')
      expect(result.data.guards[0].emergencyContact).toBe('RESTRICTED')
    })

    it('should include sensitive data when includeSensitiveData is true', async () => {
      const parameters: ReportParameters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        format: 'pdf',
        includeSensitiveData: true,
        generatedBy: 'admin-user-id'
      }

      const result = await ComplianceReportService.generateTOPSReport(parameters)

      expect(result.data.guards[0].ssn).toBe('123-45-6789')
      expect(result.data.guards[0].dateOfBirth).toEqual(new Date('1990-01-01'))
      expect(result.data.guards[0].homeAddress).toBe('123 Main St, Houston, TX')
    })
  })

  describe('getGuardRosterFields', () => {
    it('should return all required TOPS fields', () => {
      const result = ComplianceReportService.getGuardRosterFields(mockGuardData)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        licenseNumber: 'TX123456',
        firstName: 'John',
        lastName: 'Doe',
        licenseExpiry: new Date('2025-12-31'),
        certificationStatus: 'active',
        backgroundCheckStatus: 'passed',
        backgroundCheckDate: new Date('2024-01-10'),
        employmentStatus: 'active',
        employmentStartDate: new Date('2024-01-15'),
        trainingCompletionDate: new Date('2024-01-05')
      })
    })
  })

  describe('getCertificationSummary', () => {
    it('should return correct certification status summary', () => {
      const result = ComplianceReportService.getCertificationSummary(mockGuardData)

      expect(result).toEqual({
        active: 1,
        expired: 0,
        pendingRenewal: 0,
        total: 1
      })
    })
  })

  describe('getBackgroundCheckSummary', () => {
    it('should return correct background check status summary', () => {
      const result = ComplianceReportService.getBackgroundCheckSummary(mockGuardData)

      expect(result).toEqual({
        completed: 1,
        pending: 0,
        failed: 0,
        total: 1
      })
    })
  })
})