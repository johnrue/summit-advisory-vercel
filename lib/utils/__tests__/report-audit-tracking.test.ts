import { ReportAuditTracking } from '../report-audit-tracking'
import { AuditService } from '@/lib/services/audit-service'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        data: null,
        error: null
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
          error: null
        }))
      })),
      delete: jest.fn(() => ({
        lt: jest.fn(() => ({
          select: jest.fn(() => ({
            data: [{ id: '1' }, { id: '2' }],
            error: null
          }))
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: mockAccessHistory,
            error: null
          }))
        })),
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            data: mockAccessHistory,
            error: null
          }))
        }))
      }))
    }))
  }
}))

// Mock AuditService
jest.mock('@/lib/services/audit-service', () => ({
  AuditService: {
    getInstance: jest.fn(() => ({
      logComplianceReportAccess: jest.fn().mockResolvedValue({ success: true }),
      logComplianceReportGeneration: jest.fn().mockResolvedValue({ success: true }),
      logReportScheduleChange: jest.fn().mockResolvedValue({ success: true }),
      getAuditLogs: jest.fn().mockResolvedValue({
        success: true,
        data: { logs: mockAuditLogs }
      })
    }))
  }
}))

const mockAccessHistory = [
  {
    id: '1',
    report_id: 'report-123',
    user_id: 'user-456',
    action: 'downloaded',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    accessed_at: '2024-01-15T10:00:00Z'
  }
]

const mockAuditLogs = [
  {
    id: '1',
    action: 'generated',
    entity_type: 'compliance_report',
    entity_id: 'report-123',
    user_id: 'user-456',
    details: { format: 'pdf' },
    created_at: '2024-01-15T09:00:00Z'
  },
  {
    id: '2',
    action: 'emailed',
    entity_type: 'compliance_report',
    entity_id: 'report-123',
    user_id: 'user-456',
    details: { recipients: ['test@example.com'] },
    created_at: '2024-01-15T09:05:00Z'
  }
]

describe('ReportAuditTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('trackReportAccess', () => {
    it('should track report access with metadata', async () => {
      const reportId = 'report-123'
      const userId = 'user-456'
      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        fileSize: 1024,
        format: 'pdf'
      }

      await ReportAuditTracking.trackReportAccess(reportId, 'downloaded', userId, metadata)

      // Verify Supabase insert was called
      expect(require('@/lib/supabase').supabase.from).toHaveBeenCalledWith('report_access_history')
      
      // Verify audit service was called
      const auditService = AuditService.getInstance()
      expect(auditService.logComplianceReportAccess).toHaveBeenCalledWith(
        reportId,
        'downloaded',
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          fileSize: 1024,
          format: 'pdf'
        }),
        expect.stringContaining('Report downloaded by user from IP 192.168.1.1'),
        userId
      )
    })
  })

  describe('trackReportEmail', () => {
    it('should track successful email delivery', async () => {
      const reportId = 'report-123'
      const recipients = ['test@example.com', 'admin@example.com']
      const userId = 'user-456'
      const metadata = {
        messageId: 'msg-123',
        attachmentSize: 2048
      }

      await ReportAuditTracking.trackReportEmail(reportId, recipients, 'sent', userId, metadata)

      const auditService = AuditService.getInstance()
      expect(auditService.logComplianceReportGeneration).toHaveBeenCalledWith(
        reportId,
        'emailed',
        expect.objectContaining({
          recipients: recipients,
          emailStatus: 'sent',
          messageId: 'msg-123',
          attachmentSize: 2048
        }),
        expect.stringContaining('Report emailed to 2 recipient(s) with status: sent'),
        userId
      )
    })

    it('should track failed email delivery', async () => {
      const reportId = 'report-123'
      const recipients = ['invalid@example.com']
      const userId = 'user-456'
      const metadata = {
        errorMessage: 'Invalid email address'
      }

      await ReportAuditTracking.trackReportEmail(reportId, recipients, 'failed', userId, metadata)

      const auditService = AuditService.getInstance()
      expect(auditService.logComplianceReportGeneration).toHaveBeenCalledWith(
        reportId,
        'emailed',
        expect.objectContaining({
          recipients: recipients,
          emailStatus: 'failed',
          errorMessage: 'Invalid email address'
        }),
        expect.stringContaining('Report emailed to 1 recipient(s) with status: failed'),
        userId
      )
    })
  })

  describe('trackScheduledReportExecution', () => {
    it('should track successful scheduled execution', async () => {
      const scheduleId = 'schedule-123'
      const reportId = 'report-456'
      const startTime = new Date('2024-01-15T09:00:00Z')
      const endTime = new Date('2024-01-15T09:02:30Z')
      
      await ReportAuditTracking.trackScheduledReportExecution(
        scheduleId,
        reportId,
        'success',
        {
          startTime,
          endTime,
          guardCount: 25,
          fileSize: 3072
        }
      )

      const auditService = AuditService.getInstance()
      expect(auditService.logComplianceReportGeneration).toHaveBeenCalledWith(
        reportId,
        'scheduled',
        expect.objectContaining({
          scheduleId: scheduleId,
          executionStatus: 'success',
          executionTimeMs: 150000, // 2.5 minutes
          guardCount: 25,
          fileSize: 3072
        }),
        expect.stringContaining('Scheduled report execution success in 150000ms'),
        'system'
      )
    })

    it('should track failed scheduled execution', async () => {
      const scheduleId = 'schedule-123'
      const startTime = new Date('2024-01-15T09:00:00Z')
      const endTime = new Date('2024-01-15T09:00:30Z')
      
      await ReportAuditTracking.trackScheduledReportExecution(
        scheduleId,
        null,
        'failed',
        {
          startTime,
          endTime,
          errorMessage: 'Database connection failed'
        }
      )

      const auditService = AuditService.getInstance()
      expect(auditService.logComplianceReportGeneration).toHaveBeenCalledWith(
        scheduleId,
        'scheduled',
        expect.objectContaining({
          scheduleId: scheduleId,
          executionStatus: 'failed',
          executionTimeMs: 30000,
          errorMessage: 'Database connection failed'
        }),
        expect.stringContaining('Scheduled report execution failed in 30000ms'),
        'system'
      )
    })
  })

  describe('getReportAuditTrail', () => {
    it('should return comprehensive audit trail for a report', async () => {
      const reportId = 'report-123'
      
      const result = await ReportAuditTracking.getReportAuditTrail(reportId)

      expect(result).toEqual({
        generation: [mockAuditLogs[0]], // 'generated' action
        access: mockAccessHistory,
        emails: [mockAuditLogs[1]], // 'emailed' action
        total: 3 // 2 audit logs + 1 access history
      })

      const auditService = AuditService.getInstance()
      expect(auditService.getAuditLogs).toHaveBeenCalledWith({
        entity_id: reportId,
        entity_type: 'compliance_report'
      }, 100, 0)
    })
  })

  describe('getComplianceAuditSummary', () => {
    it('should return audit summary for date range', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      
      const result = await ReportAuditTracking.getComplianceAuditSummary(startDate, endDate)

      expect(result).toEqual({
        reportsGenerated: 1,
        reportsAccessed: 1,
        reportsEmailed: 1,
        schedulesExecuted: 0,
        failedGenerations: 0,
        uniqueUsers: 1
      })

      const auditService = AuditService.getInstance()
      expect(auditService.getAuditLogs).toHaveBeenCalledWith({
        entity_type: 'compliance_report',
        date_from: startDate.toISOString(),
        date_to: endDate.toISOString()
      }, 1000, 0)
    })
  })

  describe('cleanupOldAuditRecords', () => {
    it('should clean up old audit records based on retention days', async () => {
      const result = await ReportAuditTracking.cleanupOldAuditRecords(365)

      expect(result).toEqual({
        deletedAccessRecords: 2,
        deletedExecutionRecords: 2
      })

      // Verify deletion calls were made
      expect(require('@/lib/supabase').supabase.from).toHaveBeenCalledWith('report_access_history')
      expect(require('@/lib/supabase').supabase.from).toHaveBeenCalledWith('report_execution_history')
    })
  })
})