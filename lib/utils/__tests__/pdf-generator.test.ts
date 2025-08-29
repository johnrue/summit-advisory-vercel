import { PDFGenerator, CSVGenerator } from '../pdf-generator'
import type { TOPSReportData } from '@/lib/types'

// Mock Vercel Blob
jest.mock('@vercel/blob', () => ({
  put: jest.fn().mockResolvedValue({
    url: 'https://example.vercel-storage.com/test-report.pdf',
    size: 1024
  })
}))

// Mock @react-pdf/renderer
jest.mock('@react-pdf/renderer', () => ({
  pdf: jest.fn(() => ({
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-data'))
  }))
}))

const mockReportData: TOPSReportData = {
  reportPeriod: {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31')
  },
  company: {
    name: 'Summit Advisory',
    license: 'TX DPS #C29754001',
    contact: '(830) 201-0414',
    serviceAreas: ['Houston', 'Dallas', 'Austin', 'San Antonio']
  },
  guards: [
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
  ],
  generatedBy: 'admin-user-id',
  generatedAt: new Date('2024-01-31T10:00:00Z'),
  reportType: 'tops_compliance'
}

describe('PDFGenerator', () => {
  describe('generateTOPSReport', () => {
    it('should generate PDF and store in Vercel Blob', async () => {
      const result = await PDFGenerator.generateTOPSReport(mockReportData)

      expect(result).toEqual({
        url: 'https://example.vercel-storage.com/test-report.pdf',
        size: 1024
      })
    })

    it('should generate custom filename', async () => {
      const fileName = PDFGenerator.generateFileName(mockReportData)
      
      expect(fileName).toMatch(/^tops-compliance-report_2024-01-01_to_2024-01-31_\d+\.pdf$/)
    })
  })

  describe('generateTOPSReportBuffer', () => {
    it('should generate PDF buffer without storing', async () => {
      const buffer = await PDFGenerator.generateTOPSReportBuffer(mockReportData)

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.toString()).toBe('mock-pdf-data')
    })
  })
})

describe('CSVGenerator', () => {
  describe('generateGuardRosterCSV', () => {
    it('should generate CSV content with correct headers and data', () => {
      const csvContent = CSVGenerator.generateGuardRosterCSV(mockReportData)

      expect(csvContent).toContain('First Name,Last Name,License Number')
      expect(csvContent).toContain('"John","Doe","TX123456"')
      expect(csvContent).toContain('"active"')
      expect(csvContent).toContain('"passed"')
    })

    it('should properly escape CSV fields with quotes', () => {
      const testData = {
        ...mockReportData,
        guards: [{
          ...mockReportData.guards[0],
          firstName: 'John "Johnny"',
          lastName: 'O\'Brien'
        }]
      }

      const csvContent = CSVGenerator.generateGuardRosterCSV(testData)

      expect(csvContent).toContain('"John ""Johnny"""')
      expect(csvContent).toContain('"O\'Brien"')
    })
  })

  describe('generateAndStoreCSV', () => {
    it('should generate CSV and store in Vercel Blob', async () => {
      const result = await CSVGenerator.generateAndStoreCSV(mockReportData)

      expect(result).toEqual({
        url: 'https://example.vercel-storage.com/test-report.pdf',
        size: 1024
      })
    })

    it('should generate custom CSV filename', () => {
      const fileName = CSVGenerator.generateFileName(mockReportData)
      
      expect(fileName).toMatch(/^tops-compliance-data_2024-01-01_to_2024-01-31_\d+\.csv$/)
    })
  })
})