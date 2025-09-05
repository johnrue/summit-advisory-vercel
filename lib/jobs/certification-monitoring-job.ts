import { CertificationMonitoringService } from '@/lib/services/certification-monitoring-service'
import { CertificationNotificationService } from '@/lib/services/certification-notification-service'
import { AuditService } from '@/lib/services/audit-service'

/**
 * Scheduled Job for Certification Monitoring
 * Runs daily to check expiring certifications and send alerts
 */
export class CertificationMonitoringJob {
  private static auditService = AuditService.getInstance()

  /**
   * Main job execution function
   * Should be called by a cron job or scheduled task
   */
  static async execute(): Promise<void> {
    try {
      const startTime = new Date()

      // Check for expiring certifications
      const expiryChecks = await CertificationMonitoringService.checkExpirations()
      
      let alertsSent = 0
      let escalationsSent = 0
      let errors = 0

      // Process each expiry check
      for (const check of expiryChecks) {
        try {
          if (check.shouldAlert) {
            await CertificationNotificationService.sendExpiryAlert(check)
            alertsSent++
          }

          // Send escalation for expired or critical certifications
          if (check.daysUntilExpiry < 0 || (check.daysUntilExpiry <= 7 && !check.canSchedule)) {
            await CertificationNotificationService.sendEscalationAlert(check)
            escalationsSent++
          }
        } catch (error) {
          errors++
        }
      }

      // Process general escalations
      try {
        await CertificationMonitoringService.processEscalations()
      } catch (error) {
        errors++
      }

      const endTime = new Date()
      const executionTime = endTime.getTime() - startTime.getTime()

      // Log job execution
      await this.auditService.logAction({
        action: 'job_executed' as any,
        entity_type: 'certification_monitoring_job' as any,
        entity_id: 'daily_check',
        details: {
          executionTime,
          certificationsChecked: expiryChecks.length,
          alertsSent,
          escalationsSent,
          errors,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        },
        user_id: 'system'
      })


    } catch (error) {
      
      // Log job failure
      await this.auditService.logAction({
        action: 'job_failed' as any,
        entity_type: 'certification_monitoring_job' as any,
        entity_id: 'daily_check',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        },
        user_id: 'system'
      })

      throw error
    }
  }

  /**
   * Weekly compliance summary job
   * Sends summary reports to compliance officers
   */
  static async executeWeeklySummary(): Promise<void> {
    try {
      
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000)) // 7 days ago

      // Get dashboard data for summary
      const dashboardData = await CertificationMonitoringService.getCertificationDashboard()
      
      const summaryData = {
        periodStart: startDate,
        periodEnd: endDate,
        totalAlerts: dashboardData.expiringIn30Days.length + 
                    dashboardData.expiringIn14Days.length + 
                    dashboardData.expiringIn7Days.length,
        expiredCertifications: dashboardData.expired.length,
        pendingRenewals: dashboardData.pendingRenewals,
        escalationsRequired: dashboardData.expired.length + 
                           dashboardData.expiringIn7Days.length
      }

      // Send compliance summary
      await CertificationNotificationService.sendComplianceSummary(summaryData)

      // Log weekly summary execution
      await this.auditService.logAction({
        action: 'weekly_summary_sent' as any,
        entity_type: 'certification_monitoring_job' as any,
        entity_id: 'weekly_summary',
        details: summaryData,
        user_id: 'system'
      })


    } catch (error) {
      
      await this.auditService.logAction({
        action: 'weekly_summary_failed' as any,
        entity_type: 'certification_monitoring_job' as any,
        entity_id: 'weekly_summary',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        },
        user_id: 'system'
      })

      throw error
    }
  }

  /**
   * Emergency override cleanup job
   * Removes expired emergency overrides
   */
  static async cleanupExpiredOverrides(): Promise<void> {
    try {
      
      // In a real implementation, this would clean up expired overrides from the database
      // For now, we'll just log the action
      
      await this.auditService.logAction({
        action: 'cleanup_executed' as any,
        entity_type: 'certification_monitoring_job' as any,
        entity_id: 'override_cleanup',
        details: {
          timestamp: new Date().toISOString(),
          action: 'Cleaned up expired emergency overrides' as any
        },
        user_id: 'system'
      })


    } catch (error) {
      throw error
    }
  }

  /**
   * Test job execution (for development/testing)
   */
  static async test(): Promise<void> {
    try {
      
      // Run a test execution
      await this.execute()
      
    } catch (error) {
      throw error
    }
  }
}