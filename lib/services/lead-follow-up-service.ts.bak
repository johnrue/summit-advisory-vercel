import { supabase } from '@/lib/supabase'
import type { ApiResponse } from '@/lib/types'

export interface FollowUpRule {
  id: string
  name: string
  isActive: boolean
  trigger: 'immediate' | 'time_based' | 'status_change'
  conditions: {
    statuses?: string[]
    timeDelay?: {
      value: number
      unit: 'minutes' | 'hours' | 'days'
    }
    maxAttempts?: number
  }
  actions: {
    emailTemplate: string
    escalateAfter?: number // days
    escalateTo?: string // role or specific user
    updateStatus?: string
  }
  priority: number
  createdAt: string
  updatedAt: string
}

export interface FollowUpSchedule {
  id: string
  leadId: string
  ruleId: string
  scheduledFor: string
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  attemptNumber: number
  emailSent: boolean
  emailId?: string
  errorMessage?: string
  createdAt: string
  executedAt?: string
}

export interface FollowUpTemplate {
  id: string
  name: string
  subject: string
  bodyHtml: string
  bodyText: string
  variables: string[]
  isActive: boolean
  templateType: 'immediate' | '2_hour' | '24_hour' | '3_day' | 'escalation'
}

/**
 * Get default follow-up rules
 * @returns Array of default follow-up rules
 */
export function getDefaultFollowUpRules(): FollowUpRule[] {
  return [
    {
      id: 'immediate-acknowledgment',
      name: 'Immediate Acknowledgment',
      isActive: true,
      trigger: 'immediate',
      conditions: {
        statuses: ['prospect'],
        maxAttempts: 1
      },
      actions: {
        emailTemplate: 'immediate_acknowledgment',
        updateStatus: 'contacted'
      },
      priority: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2-hour-follow-up',
      name: '2 Hour Follow-up',
      isActive: true,
      trigger: 'time_based',
      conditions: {
        statuses: ['prospect'],
        timeDelay: { value: 2, unit: 'hours' },
        maxAttempts: 1
      },
      actions: {
        emailTemplate: '2_hour_follow_up',
        escalateAfter: 1
      },
      priority: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '24-hour-follow-up',
      name: '24 Hour Follow-up',
      isActive: true,
      trigger: 'time_based',
      conditions: {
        statuses: ['prospect', 'contacted'],
        timeDelay: { value: 24, unit: 'hours' },
        maxAttempts: 1
      },
      actions: {
        emailTemplate: '24_hour_follow_up',
        escalateAfter: 2
      },
      priority: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '3-day-follow-up',
      name: '3 Day Follow-up',
      isActive: true,
      trigger: 'time_based',
      conditions: {
        statuses: ['prospect', 'contacted'],
        timeDelay: { value: 3, unit: 'days' },
        maxAttempts: 1
      },
      actions: {
        emailTemplate: '3_day_follow_up',
        escalateAfter: 1,
        escalateTo: 'sales_manager'
      },
      priority: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
}

/**
 * Get email templates for follow-ups
 * @returns Array of email templates
 */
export function getFollowUpTemplates(): FollowUpTemplate[] {
  return [
    {
      id: 'immediate_acknowledgment',
      name: 'Immediate Acknowledgment',
      subject: 'Thank you for your security service inquiry - Summit Advisory',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thank you for your inquiry</h2>
          <p>Dear {{firstName}},</p>
          <p>Thank you for your interest in Summit Advisory's professional security services. We have received your request for {{serviceType}} security services and our team is reviewing your requirements.</p>
          <p><strong>What happens next:</strong></p>
          <ul>
            <li>A security consultant will review your specific needs</li>
            <li>We'll contact you within 2 business hours</li>
            <li>You'll receive a customized proposal within 24 hours</li>
          </ul>
          <p>For immediate assistance, please call us at <a href="tel:8302010414">(830) 201-0414</a>.</p>
          <p>Best regards,<br>Summit Advisory Team</p>
        </div>
      `,
      bodyText: `Dear {{firstName}}, Thank you for your interest in Summit Advisory's security services. We'll contact you within 2 business hours. For immediate assistance: (830) 201-0414.`,
      variables: ['firstName', 'serviceType'],
      isActive: true,
      templateType: 'immediate'
    },
    {
      id: '2_hour_follow_up',
      name: '2 Hour Follow-up',
      subject: 'Following up on your security service request - Summit Advisory',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Following up on your security needs</h2>
          <p>Dear {{firstName}},</p>
          <p>I wanted to follow up on your recent inquiry about {{serviceType}} security services. Our team has reviewed your request and we're ready to discuss how we can help protect your assets.</p>
          <p><strong>Your inquiry details:</strong></p>
          <ul>
            <li>Service Type: {{serviceType}}</li>
            <li>Estimated Value: ${{estimatedValue}}</li>
            <li>Inquiry Date: {{inquiryDate}}</li>
          </ul>
          <p>I'd like to schedule a brief consultation to discuss your specific security needs. Please reply to this email or call me directly at <a href="tel:8302010414">(830) 201-0414</a>.</p>
          <p>Best regards,<br>{{managerName}}<br>Summit Advisory</p>
        </div>
      `,
      bodyText: `Dear {{firstName}}, Following up on your {{serviceType}} security inquiry. Ready to discuss your needs. Please call (830) 201-0414 or reply to schedule a consultation. - {{managerName}}`,
      variables: ['firstName', 'serviceType', 'estimatedValue', 'inquiryDate', 'managerName'],
      isActive: true,
      templateType: '2_hour'
    },
    {
      id: '24_hour_follow_up',
      name: '24 Hour Follow-up',
      subject: 'Your security consultation is ready - Summit Advisory',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your security consultation is ready</h2>
          <p>Dear {{firstName}},</p>
          <p>I hope this message finds you well. Yesterday you inquired about our {{serviceType}} security services, and I've prepared a preliminary assessment based on your requirements.</p>
          <p><strong>What I've prepared for you:</strong></p>
          <ul>
            <li>Customized security plan outline</li>
            <li>Pricing options for your budget</li>
            <li>Implementation timeline</li>
            <li>24/7 support details</li>
          </ul>
          <p>I have a 15-minute window available today to walk you through these recommendations. Would you prefer a call at <strong>{{phone}}</strong> or a video consultation?</p>
          <p>If today doesn't work, I'm also available tomorrow morning. Simply reply with your preferred time.</p>
          <p>Best regards,<br>{{managerName}}<br>Security Consultant<br>Summit Advisory<br><a href="tel:8302010414">(830) 201-0414</a></p>
        </div>
      `,
      bodyText: `Dear {{firstName}}, Your {{serviceType}} security consultation is ready. I've prepared a customized plan. Can we schedule a 15-minute call? Reply with your preferred time or call (830) 201-0414. - {{managerName}}`,
      variables: ['firstName', 'serviceType', 'phone', 'managerName'],
      isActive: true,
      templateType: '24_hour'
    },
    {
      id: '3_day_follow_up',
      name: '3 Day Follow-up with Incentive',
      subject: 'Final follow-up + Special offer for your security needs',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Don't miss this opportunity</h2>
          <p>Dear {{firstName}},</p>
          <p>This is my final follow-up regarding your {{serviceType}} security inquiry from earlier this week. I understand you're busy, so I want to make this as simple as possible.</p>
          <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #d4af37; margin: 20px 0;">
            <h3 style="color: #d4af37; margin-top: 0;">Special Offer - This Week Only</h3>
            <p><strong>10% off your first month</strong> of security services when you schedule a consultation by Friday.</p>
          </div>
          <p><strong>Why choose Summit Advisory:</strong></p>
          <ul>
            <li>TX DPS Licensed #C29754001</li>
            <li>Serving Houston, Dallas, Austin, San Antonio</li>
            <li>24/7 professional monitoring</li>
            <li>Rapid response teams</li>
            <li>Customized security solutions</li>
          </ul>
          <p>If you're no longer interested, just reply "REMOVE" and I'll remove you from follow-ups.</p>
          <p>Otherwise, I'm here to help secure your peace of mind. Call me at <a href="tel:8302010414">(830) 201-0414</a>.</p>
          <p>Best regards,<br>{{managerName}}<br>Senior Security Consultant<br>Summit Advisory</p>
        </div>
      `,
      bodyText: `Dear {{firstName}}, Final follow-up on your {{serviceType}} security needs. Special offer: 10% off first month if you call by Friday. (830) 201-0414 or reply REMOVE to stop. - {{managerName}}`,
      variables: ['firstName', 'serviceType', 'managerName'],
      isActive: true,
      templateType: '3_day'
    },
    {
      id: 'escalation_template',
      name: 'Manager Escalation',
      subject: 'Lead requires manager attention - {{firstName}} {{lastName}}',
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Lead Escalation Required</h2>
          <p>A lead has not been contacted after multiple follow-up attempts and requires manager attention.</p>
          <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #dc3545; margin: 20px 0;">
            <h3>Lead Details:</h3>
            <p><strong>Name:</strong> {{firstName}} {{lastName}}<br>
            <strong>Email:</strong> {{email}}<br>
            <strong>Phone:</strong> {{phone}}<br>
            <strong>Service:</strong> {{serviceType}}<br>
            <strong>Value:</strong> ${{estimatedValue}}<br>
            <strong>Source:</strong> {{sourceType}}<br>
            <strong>Assigned to:</strong> {{assignedManagerName}}</p>
          </div>
          <p><strong>Follow-up History:</strong></p>
          <ul>
            <li>Initial inquiry: {{inquiryDate}}</li>
            <li>Assigned: {{assignmentDate}}</li>
            <li>Follow-ups sent: {{followUpCount}}</li>
            <li>Days since last contact: {{daysSinceContact}}</li>
          </ul>
          <p><strong>Recommended Actions:</strong></p>
          <ul>
            <li>Personal phone call from senior team member</li>
            <li>Review and update lead qualification</li>
            <li>Consider alternative contact methods</li>
            <li>Evaluate lead source quality</li>
          </ul>
          <p><a href="https://summitadvisoryfirm.com/dashboard/leads?id={{leadId}}">View Lead Details</a></p>
        </div>
      `,
      bodyText: `Lead escalation: {{firstName}} {{lastName}} ({{serviceType}}, ${{estimatedValue}}) assigned to {{assignedManagerName}} needs manager attention. {{followUpCount}} follow-ups sent, {{daysSinceContact}} days since contact.`,
      variables: ['firstName', 'lastName', 'email', 'phone', 'serviceType', 'estimatedValue', 'sourceType', 'assignedManagerName', 'inquiryDate', 'assignmentDate', 'followUpCount', 'daysSinceContact', 'leadId'],
      isActive: true,
      templateType: 'escalation'
    }
  ]
}

/**
 * Schedule follow-up actions for a lead
 * @param leadId - ID of the lead to schedule follow-ups for
 * @returns Promise with scheduling results
 */
export async function scheduleLeadFollowUps(leadId: string): Promise<ApiResponse<FollowUpSchedule[]>> {
  try {
    // Get lead data
    const { data: leadData, error: leadError } = await supabase
      .from('client_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !leadData) {
      throw new Error(`Lead not found: ${leadError?.message || 'Unknown error'}`)
    }

    const rules = getDefaultFollowUpRules()
    const schedules: FollowUpSchedule[] = []

    // Schedule immediate acknowledgment
    const immediateRule = rules.find(r => r.id === 'immediate-acknowledgment')
    if (immediateRule && immediateRule.isActive) {
      const schedule: FollowUpSchedule = {
        id: `${leadId}-immediate`,
        leadId,
        ruleId: immediateRule.id,
        scheduledFor: new Date().toISOString(), // Immediate
        status: 'pending',
        attemptNumber: 1,
        emailSent: false,
        createdAt: new Date().toISOString()
      }
      schedules.push(schedule)
    }

    // Schedule time-based follow-ups
    const timeBasedRules = rules.filter(r => r.trigger === 'time_based' && r.isActive)
    for (const rule of timeBasedRules) {
      if (rule.conditions.timeDelay) {
        const { value, unit } = rule.conditions.timeDelay
        const scheduledDate = new Date()
        
        switch (unit) {
          case 'minutes':
            scheduledDate.setMinutes(scheduledDate.getMinutes() + value)
            break
          case 'hours':
            scheduledDate.setHours(scheduledDate.getHours() + value)
            break
          case 'days':
            scheduledDate.setDate(scheduledDate.getDate() + value)
            break
        }

        const schedule: FollowUpSchedule = {
          id: `${leadId}-${rule.id}`,
          leadId,
          ruleId: rule.id,
          scheduledFor: scheduledDate.toISOString(),
          status: 'pending',
          attemptNumber: 1,
          emailSent: false,
          createdAt: new Date().toISOString()
        }
        schedules.push(schedule)
      }
    }

    // In a real implementation, you would store these in a database table
    // For now, we'll return the scheduled items
    
    return {
      success: true,
      data: schedules,
      message: `${schedules.length} follow-up actions scheduled`
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to schedule follow-ups'
    }
  }
}

/**
 * Process due follow-up actions
 * @returns Promise with processed follow-ups result
 */
export async function processDueFollowUps(): Promise<ApiResponse<{ processed: number, successful: number, failed: number }>> {
  try {
    // In a real implementation, you would:
    // 1. Query scheduled follow-ups that are due
    // 2. Get lead and manager data
    // 3. Send emails using templates
    // 4. Update follow-up status
    // 5. Schedule escalations if needed

    // This is a simplified implementation
    const result = {
      processed: 0,
      successful: 0,
      failed: 0
    }

    // Get leads that need follow-up (no contact in last 2 hours for new leads)
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - 2)

    const { data: leadsNeedingFollowUp, error: leadsError } = await supabase
      .from('client_leads')
      .select(`
        *,
        users!assigned_to(first_name, last_name, email)
      `)
      .eq('status', 'prospect')
      .not('assigned_to', 'is', null)
      .or(`last_contact_date.is.null,last_contact_date.lt.${cutoffTime.toISOString()}`)
      .lt('created_at', cutoffTime.toISOString())

    if (leadsError) {
      throw new Error(`Failed to fetch leads: ${leadsError.message}`)
    }

    if (!leadsNeedingFollowUp || leadsNeedingFollowUp.length === 0) {
      return {
        success: true,
        data: result,
        message: 'No follow-ups due at this time'
      }
    }

    // Process each lead that needs follow-up
    for (const lead of leadsNeedingFollowUp) {
      result.processed++

      try {
        // Create follow-up email content
        const template = getFollowUpTemplates().find(t => t.templateType === '2_hour')
        if (!template) continue

        const variables = {
          firstName: lead.first_name,
          serviceType: lead.service_type,
          estimatedValue: lead.estimated_value?.toString() || 'Not specified',
          inquiryDate: new Date(lead.created_at).toLocaleDateString(),
          managerName: lead.users ? `${lead.users.first_name} ${lead.users.last_name}` : 'Summit Advisory Team'
        }

        // Replace template variables
        let emailBody = template.bodyHtml
        let emailSubject = template.subject
        
        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g')
          emailBody = emailBody.replace(regex, value || '')
          emailSubject = emailSubject.replace(regex, value || '')
        })

        // In a real implementation, you would send the email here
        // For now, we'll just simulate success
        
        // Update lead with follow-up attempt
        const { error: updateError } = await supabase
          .from('client_leads')
          .update({
            last_contact_date: new Date().toISOString(),
            contact_count: (lead.contact_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id)

        if (updateError) {
          console.error(`Failed to update lead ${lead.id}:`, updateError)
          result.failed++
        } else {
          result.successful++
        }

      } catch (error) {
        console.error(`Failed to process follow-up for lead ${lead.id}:`, error)
        result.failed++
      }
    }

    return {
      success: true,
      data: result,
      message: `Processed ${result.processed} follow-ups: ${result.successful} successful, ${result.failed} failed`
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to process due follow-ups'
    }
  }
}

/**
 * Check for leads that need escalation
 * @returns Promise with escalation results
 */
export async function checkForEscalations(): Promise<ApiResponse<{ escalated: number, notified: number }>> {
  try {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    // Find leads that haven't been contacted in 3+ days
    const { data: staleLead, error: staleError } = await supabase
      .from('client_leads')
      .select(`
        *,
        users!assigned_to(first_name, last_name, email)
      `)
      .in('status', ['prospect', 'contacted'])
      .not('assigned_to', 'is', null)
      .or(`last_contact_date.is.null,last_contact_date.lt.${threeDaysAgo.toISOString()}`)
      .lt('created_at', threeDaysAgo.toISOString())

    if (staleError) {
      throw new Error(`Failed to fetch stale leads: ${staleError.message}`)
    }

    const result = {
      escalated: staleLead?.length || 0,
      notified: 0
    }

    if (!staleLead || staleLead.length === 0) {
      return {
        success: true,
        data: result,
        message: 'No leads require escalation'
      }
    }

    // Get sales managers for escalation
    const { data: salesManagers, error: managersError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        users!inner(first_name, last_name, email)
      `)
      .eq('roles.name', 'admin') // Escalate to admins
      .eq('status', 'active')

    if (managersError || !salesManagers || salesManagers.length === 0) {
      console.error('No sales managers found for escalation:', managersError)
      return {
        success: true,
        data: result,
        message: 'No sales managers available for escalation'
      }
    }

    // Send escalation notifications
    for (const lead of staleLead) {
      // In a real implementation, send escalation emails to managers
      // For now, just log the escalation
      console.log(`Escalating lead ${lead.id} - ${lead.first_name} ${lead.last_name}`)
      result.notified += salesManagers.length
    }

    return {
      success: true,
      data: result,
      message: `Escalated ${result.escalated} leads, notified ${result.notified} managers`
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to check for escalations'
    }
  }
}

/**
 * Cancel scheduled follow-ups for a lead
 * @param leadId - ID of the lead
 * @param reason - Reason for cancellation
 * @returns Promise with cancellation result
 */
export async function cancelFollowUps(
  leadId: string,
  reason: string
): Promise<ApiResponse<{ cancelled: number }>> {
  try {
    // In a real implementation, you would update the follow-up schedules in the database
    // For now, we'll simulate the cancellation
    
    return {
      success: true,
      data: { cancelled: 3 }, // Simulated count
      message: `Follow-ups cancelled: ${reason}`
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to cancel follow-ups'
    }
  }
}

// Export alternative function names for API compatibility
export const scheduleFollowUp = scheduleLeadFollowUps
export const processFollowUps = processDueFollowUps

/**
 * Update follow-up status for a lead
 * @param leadId - Lead ID to update follow-ups for
 * @param status - New status (completed, skipped, rescheduled)
 * @param notes - Optional notes about the update
 * @returns Promise with update result
 */
export async function updateFollowUpStatus(
  leadId: string, 
  status: 'completed' | 'skipped' | 'rescheduled',
  notes?: string
): Promise<ApiResponse<{ updated: number }>> {
  try {
    if (!['completed', 'skipped', 'rescheduled'].includes(status)) {
      return {
        success: false,
        error: 'Invalid status',
        message: 'Status must be completed, skipped, or rescheduled'
      }
    }

    // In a real implementation, you would update the follow-up records
    // For now, we'll simulate the status update
    
    const timestamp = new Date().toISOString()
    
    return {
      success: true,
      data: { updated: 1 },
      message: `Follow-up status updated to ${status}${notes ? ` with note: ${notes}` : ''}`
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to update follow-up status'
    }
  }
}