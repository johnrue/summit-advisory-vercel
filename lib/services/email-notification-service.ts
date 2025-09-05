import type { 
  Notification, 
  NotificationTemplate,
  NotificationPriority 
} from '@/lib/types/notification-types'
import type { ServiceResult } from '@/lib/types'

// Re-export types for consumers
export type { Notification, NotificationTemplate, NotificationPriority }

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface EmailNotificationRequest {
  to: string
  subject: string
  html: string
  text: string
  priority: NotificationPriority
  notification_id?: string
  template_variables?: Record<string, string>
}

export interface EmailDeliveryResult {
  external_id: string
  status: 'sent' | 'failed'
  error_message?: string
  delivery_time_ms: number
}

export class EmailNotificationService {
  private static instance: EmailNotificationService
  private emailProvider: string = 'console' // 'sendgrid' | 'aws-ses' | 'console'
  
  static getInstance(): EmailNotificationService {
    if (!EmailNotificationService.instance) {
      EmailNotificationService.instance = new EmailNotificationService()
    }
    return EmailNotificationService.instance
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(
    notification: Notification,
    recipientEmail: string,
    template?: EmailTemplate
  ): Promise<ServiceResult<EmailDeliveryResult>> {
    const startTime = Date.now()

    try {
      const emailContent = template || this.generateDefaultTemplate(notification)
      
      const emailRequest: EmailNotificationRequest = {
        to: recipientEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        priority: notification.priority,
        notification_id: notification.id
      }

      const result = await this.deliverEmail(emailRequest)
      
      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Email delivery failed'
        }
      }

      return {
        success: true,
        data: {
          ...result.data!,
          delivery_time_ms: Date.now() - startTime
        } as EmailDeliveryResult
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Generate default email template from notification
   */
  private generateDefaultTemplate(notification: Notification): EmailTemplate {
    const priorityIndicator = this.getPriorityIndicator(notification.priority)
    const categoryIcon = this.getCategoryIcon(notification.category)
    
    const subject = `${priorityIndicator} ${notification.title}`
    
    const html = this.generateHTMLTemplate({
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      category: notification.category,
      categoryIcon,
      priorityIndicator,
      createdAt: notification.created_at,
      actions: notification.action_data?.actions || []
    })

    const text = this.generateTextTemplate({
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      category: notification.category,
      createdAt: notification.created_at,
      actions: notification.action_data?.actions || []
    })

    return { subject, html, text }
  }

  /**
   * Generate mobile-optimized HTML email template
   */
  private generateHTMLTemplate(data: {
    title: string
    message: string
    priority: NotificationPriority
    category: string
    categoryIcon: string
    priorityIndicator: string
    createdAt: string
    actions: any[]
  }): string {
    const priorityColors = {
      emergency: { bg: '#dc2626', text: '#ffffff' },
      urgent: { bg: '#ea580c', text: '#ffffff' },
      high: { bg: '#d97706', text: '#ffffff' },
      normal: { bg: '#2563eb', text: '#ffffff' },
      low: { bg: '#6b7280', text: '#ffffff' }
    }

    const colors = priorityColors[data.priority]
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://summitadvisoryfirm.com'

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${data.title}</title>
      <style>
        /* Reset styles */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        /* Mobile-first responsive design */
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #374151;
          background-color: #f9fafb;
          padding: 20px 0;
        }
        
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .header {
          background: ${colors.bg};
          color: ${colors.text};
          padding: 20px;
          text-align: center;
        }
        
        .priority-badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        
        .title {
          font-size: 20px;
          font-weight: 700;
          margin: 0;
        }
        
        .content {
          padding: 24px;
        }
        
        .message {
          font-size: 16px;
          line-height: 1.7;
          color: #4b5563;
          margin-bottom: 24px;
        }
        
        .meta {
          background: #f3f4f6;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 24px;
        }
        
        .meta-item {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          font-size: 14px;
          color: #6b7280;
        }
        
        .meta-item:last-child {
          margin-bottom: 0;
        }
        
        .actions {
          margin-top: 24px;
        }
        
        .action-button {
          display: inline-block;
          padding: 12px 24px;
          margin: 0 8px 8px 0;
          background: ${colors.bg};
          color: ${colors.text};
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          transition: opacity 0.2s;
        }
        
        .action-button:hover {
          opacity: 0.9;
        }
        
        .action-button.secondary {
          background: #e5e7eb;
          color: #374151;
        }
        
        .footer {
          background: #f9fafb;
          padding: 20px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        
        .footer-text {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 8px;
        }
        
        .company-name {
          font-weight: 700;
          color: #1f2937;
        }
        
        /* Mobile optimization */
        @media only screen and (max-width: 600px) {
          .container {
            margin: 0 10px;
            border-radius: 0;
          }
          
          .content {
            padding: 20px 16px;
          }
          
          .title {
            font-size: 18px;
          }
          
          .action-button {
            display: block;
            width: 100%;
            text-align: center;
            margin: 0 0 8px 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="priority-badge">${data.priorityIndicator}</div>
          <h1 class="title">${data.title}</h1>
        </div>
        
        <div class="content">
          <div class="message">${data.message}</div>
          
          <div class="meta">
            <div class="meta-item">
              <span style="margin-right: 8px;">${data.categoryIcon}</span>
              <span>Category: ${data.category.charAt(0).toUpperCase() + data.category.slice(1)}</span>
            </div>
            <div class="meta-item">
              <span style="margin-right: 8px;">🕐</span>
              <span>Sent: ${new Date(data.createdAt).toLocaleString()}</span>
            </div>
          </div>
          
          ${data.actions.length > 0 ? `
            <div class="actions">
              ${data.actions.map((action: any) => `
                <a href="${baseUrl}${action.url || '#'}" class="action-button ${action.style === 'secondary' ? 'secondary' : ''}">
                  ${action.label}
                </a>
              `).join('')}
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <div class="footer-text">
            This notification was sent by <span class="company-name">Summit Advisory</span>
          </div>
          <div class="footer-text">
            TX DPS License #C29754001 | (830) 201-0414
          </div>
          <div class="footer-text" style="font-size: 12px; margin-top: 12px;">
            <a href="${baseUrl}/dashboard/notifications/preferences" style="color: #6b7280;">
              Manage notification preferences
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
    `
  }

  /**
   * Generate plain text email template
   */
  private generateTextTemplate(data: {
    title: string
    message: string
    priority: NotificationPriority
    category: string
    createdAt: string
    actions: any[]
  }): string {
    const priorityIndicator = this.getPriorityIndicator(data.priority)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://summitadvisoryfirm.com'

    let text = `${priorityIndicator} ${data.title}\n\n`
    text += `${data.message}\n\n`
    text += `Category: ${data.category.charAt(0).toUpperCase() + data.category.slice(1)}\n`
    text += `Sent: ${new Date(data.createdAt).toLocaleString()}\n\n`
    
    if (data.actions.length > 0) {
      text += `Actions:\n`
      data.actions.forEach((action: any) => {
        text += `• ${action.label}: ${baseUrl}${action.url || '#'}\n`
      })
      text += `\n`
    }
    
    text += `---\n`
    text += `Summit Advisory - TX DPS License #C29754001\n`
    text += `Phone: (830) 201-0414\n`
    text += `Manage preferences: ${baseUrl}/dashboard/notifications/preferences\n`

    return text
  }

  /**
   * Deliver email using configured provider
   */
  private async deliverEmail(request: EmailNotificationRequest): Promise<ServiceResult<EmailDeliveryResult>> {
    switch (this.emailProvider) {
      case 'sendgrid':
        return this.sendViaSendGrid(request)
      case 'aws-ses':
        return this.sendViaAWSSES(request)
      default:
        return this.sendViaConsole(request) // Development fallback
    }
  }

  /**
   * Send via SendGrid (placeholder implementation)
   */
  private async sendViaSendGrid(request: EmailNotificationRequest): Promise<ServiceResult<EmailDeliveryResult>> {
    try {
      // TODO: Implement SendGrid integration
      console.log('SendGrid email sending not yet implemented')
      console.log('Email would be sent to:', request.to)
      console.log('Subject:', request.subject)
      
      return {
        success: true,
        data: {
          external_id: `sendgrid_${Date.now()}`,
          status: 'sent',
          delivery_time_ms: 150
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SendGrid delivery failed',
      }
    }
  }

  /**
   * Send via AWS SES (placeholder implementation)
   */
  private async sendViaAWSSES(request: EmailNotificationRequest): Promise<ServiceResult<EmailDeliveryResult>> {
    try {
      // TODO: Implement AWS SES integration
      console.log('AWS SES email sending not yet implemented')
      console.log('Email would be sent to:', request.to)
      console.log('Subject:', request.subject)
      
      return {
        success: true,
        data: {
          external_id: `aws_ses_${Date.now()}`,
          status: 'sent',
          delivery_time_ms: 200
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AWS SES delivery failed',
      }
    }
  }

  /**
   * Console logging fallback (for development)
   */
  private async sendViaConsole(request: EmailNotificationRequest): Promise<ServiceResult<EmailDeliveryResult>> {
    try {
      console.log('\n📧 EMAIL NOTIFICATION (Development Mode)')
      console.log('=====================================')
      console.log(`To: ${request.to}`)
      console.log(`Subject: ${request.subject}`)
      console.log(`Priority: ${request.priority}`)
      if (request.notification_id) {
        console.log(`Notification ID: ${request.notification_id}`)
      }
      console.log('\nText Content:')
      console.log(request.text)
      console.log('\n=====================================\n')
      
      return {
        success: true,
        data: {
          external_id: `console_${Date.now()}`,
          status: 'sent',
          delivery_time_ms: 1
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Console logging failed',
      }
    }
  }

  /**
   * Get priority indicator for templates
   */
  private getPriorityIndicator(priority: NotificationPriority): string {
    switch (priority) {
      case 'emergency': return '🚨 EMERGENCY'
      case 'urgent': return '⚡ URGENT'
      case 'high': return '🔴 HIGH'
      case 'normal': return '📢 NOTICE'
      case 'low': return 'ℹ️ INFO'
    }
  }

  /**
   * Get category icon for templates
   */
  private getCategoryIcon(category: string): string {
    switch (category) {
      case 'schedule': return '📅'
      case 'assignments': return '👥'
      case 'compliance': return '🛡️'
      case 'emergency': return '🚨'
      case 'availability': return '⏰'
      case 'system': return '⚙️'
      default: return '📧'
    }
  }

  /**
   * Create email digest
   */
  async createEmailDigest(
    notifications: Notification[],
    recipientEmail: string,
    digestType: 'daily' | 'weekly' | 'monthly'
  ): Promise<ServiceResult<EmailDeliveryResult>> {
    try {
      const subject = `Summit Advisory - ${digestType.charAt(0).toUpperCase() + digestType.slice(1)} Notification Digest`
      
      // Group notifications by category and priority
      const groupedNotifications = this.groupNotificationsForDigest(notifications)
      
      const html = this.generateDigestHTMLTemplate(groupedNotifications, digestType)
      const text = this.generateDigestTextTemplate(groupedNotifications, digestType)
      
      return await this.deliverEmail({
        to: recipientEmail,
        subject,
        html,
        text,
        priority: 'normal'
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Digest creation failed',
      }
    }
  }

  /**
   * Group notifications for digest
   */
  private groupNotificationsForDigest(notifications: Notification[]) {
    return {
      urgent: notifications.filter(n => n.priority === 'urgent' || n.priority === 'emergency'),
      schedule: notifications.filter(n => n.category === 'schedule'),
      assignments: notifications.filter(n => n.category === 'assignments'),
      other: notifications.filter(n => 
        n.priority !== 'urgent' && 
        n.priority !== 'emergency' &&
        n.category !== 'schedule' && 
        n.category !== 'assignments'
      )
    }
  }

  /**
   * Generate digest HTML template
   */
  private generateDigestHTMLTemplate(groupedNotifications: any, digestType: string): string {
    // Implementation would generate a comprehensive digest template
    // This is a simplified version
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Summit Advisory - ${digestType.charAt(0).toUpperCase() + digestType.slice(1)} Digest</h1>
      <p>Here's a summary of your recent notifications:</p>
      <!-- Digest content would be generated here -->
    </div>
    `
  }

  /**
   * Generate digest text template
   */
  private generateDigestTextTemplate(groupedNotifications: any, digestType: string): string {
    return `Summit Advisory - ${digestType.charAt(0).toUpperCase() + digestType.slice(1)} Digest\n\nHere's a summary of your recent notifications:\n\n[Digest content would be generated here]`
  }
}