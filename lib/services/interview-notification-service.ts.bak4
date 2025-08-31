// Story 2.6: Interview Notification Service
// Email notification system with ICS calendar attachments for interview workflow

import { supabase } from '@/lib/supabase'
import type {
  Interview,
  InterviewNotificationData,
  ServiceResult,
  InterviewStatus
} from '@/lib/types/interview-types'

interface EmailTemplate {
  subject: string
  htmlContent: string
  textContent: string
}

interface ICSEvent {
  uid: string
  summary: string
  description: string
  startTime: Date
  endTime: Date
  location?: string
  organizerEmail: string
  attendeeEmail: string
}

export class InterviewNotificationService {
  
  // Send interview invitation with calendar attachment
  async sendInterviewInvitation(
    interview: Interview,
    applicantEmail: string,
    applicantName: string,
    interviewerName: string,
    interviewerEmail: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const template = this.generateInvitationTemplate(
        interview,
        applicantName,
        interviewerName
      )
      
      const icsContent = this.generateICSEvent({
        uid: interview.icsUid || `SA-INTERVIEW-${interview.id}`,
        summary: `Interview with Summit Advisory - ${interview.interviewType}`,
        description: `Interview for security guard position\n\nType: ${interview.interviewType}\nMode: ${interview.interviewMode}\nDuration: ${interview.durationMinutes} minutes${interview.meetingNotes ? `\n\nNotes: ${interview.meetingNotes}` : ''}`,
        startTime: interview.scheduledAt,
        endTime: new Date(interview.scheduledAt.getTime() + interview.durationMinutes * 60000),
        location: interview.interviewLocation,
        organizerEmail: interviewerEmail,
        attendeeEmail: applicantEmail
      })

      // Send email with ICS attachment
      const result = await this.sendEmailWithAttachment(
        applicantEmail,
        template.subject,
        template.htmlContent,
        template.textContent,
        {
          filename: 'interview-invitation.ics',
          content: icsContent,
          contentType: 'text/calendar'
        }
      )

      if (result.success) {
        // Log notification
        await this.logNotification(
          interview.id,
          'interview_invitation',
          applicantEmail,
          'sent'
        )
      }

      return result
    } catch (error) {
      console.error('Interview invitation error:', error)
      return { success: false, error: 'Failed to send interview invitation' }
    }
  }

  // Send interview reminder
  async sendInterviewReminder(
    interview: Interview,
    applicantEmail: string,
    applicantName: string,
    hoursUntilInterview: number
  ): Promise<ServiceResult<boolean>> {
    try {
      const template = this.generateReminderTemplate(
        interview,
        applicantName,
        hoursUntilInterview
      )

      const result = await this.sendEmail(
        applicantEmail,
        template.subject,
        template.htmlContent,
        template.textContent
      )

      if (result.success) {
        await this.logNotification(
          interview.id,
          `interview_reminder_${hoursUntilInterview}h`,
          applicantEmail,
          'sent'
        )
      }

      return result
    } catch (error) {
      console.error('Interview reminder error:', error)
      return { success: false, error: 'Failed to send interview reminder' }
    }
  }

  // Send interview rescheduled notification
  async sendRescheduledNotification(
    originalInterview: Interview,
    newInterview: Interview,
    applicantEmail: string,
    applicantName: string,
    interviewerName: string,
    interviewerEmail: string,
    reason?: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const template = this.generateRescheduledTemplate(
        originalInterview,
        newInterview,
        applicantName,
        interviewerName,
        reason
      )

      // Generate updated ICS event
      const icsContent = this.generateICSEvent({
        uid: newInterview.icsUid || `SA-INTERVIEW-${newInterview.id}`,
        summary: `Interview with Summit Advisory - ${newInterview.interviewType} (UPDATED)`,
        description: `Interview for security guard position (Rescheduled)\n\nType: ${newInterview.interviewType}\nMode: ${newInterview.interviewMode}\nDuration: ${newInterview.durationMinutes} minutes${reason ? `\n\nReschedule Reason: ${reason}` : ''}`,
        startTime: newInterview.scheduledAt,
        endTime: new Date(newInterview.scheduledAt.getTime() + newInterview.durationMinutes * 60000),
        location: newInterview.interviewLocation,
        organizerEmail: interviewerEmail,
        attendeeEmail: applicantEmail
      })

      const result = await this.sendEmailWithAttachment(
        applicantEmail,
        template.subject,
        template.htmlContent,
        template.textContent,
        {
          filename: 'interview-rescheduled.ics',
          content: icsContent,
          contentType: 'text/calendar'
        }
      )

      if (result.success) {
        await this.logNotification(
          newInterview.id,
          'interview_rescheduled',
          applicantEmail,
          'sent'
        )
      }

      return result
    } catch (error) {
      console.error('Reschedule notification error:', error)
      return { success: false, error: 'Failed to send reschedule notification' }
    }
  }

  // Send interview outcome notification
  async sendOutcomeNotification(
    interview: Interview,
    applicantEmail: string,
    applicantName: string,
    outcome: 'approved' | 'rejected' | 'pending',
    message?: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const template = this.generateOutcomeTemplate(
        interview,
        applicantName,
        outcome,
        message
      )

      const result = await this.sendEmail(
        applicantEmail,
        template.subject,
        template.htmlContent,
        template.textContent
      )

      if (result.success) {
        await this.logNotification(
          interview.id,
          `interview_outcome_${outcome}`,
          applicantEmail,
          'sent'
        )
      }

      return result
    } catch (error) {
      console.error('Outcome notification error:', error)
      return { success: false, error: 'Failed to send outcome notification' }
    }
  }

  // Generate interview invitation email template
  private generateInvitationTemplate(
    interview: Interview,
    applicantName: string,
    interviewerName: string
  ): EmailTemplate {
    const interviewDate = interview.scheduledAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const interviewTime = interview.scheduledAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })

    const subject = `Interview Scheduled - Summit Advisory Security Guard Position`

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .interview-details { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Summit Advisory</h1>
            <p>Professional Security Services</p>
          </div>
          
          <div class="content">
            <h2>Interview Scheduled</h2>
            <p>Dear ${applicantName},</p>
            
            <p>Thank you for your interest in the Security Guard position at Summit Advisory. We are pleased to schedule an interview with you.</p>
            
            <div class="interview-details">
              <h3>Interview Details</h3>
              <p><strong>Date:</strong> ${interviewDate}</p>
              <p><strong>Time:</strong> ${interviewTime}</p>
              <p><strong>Duration:</strong> ${interview.durationMinutes} minutes</p>
              <p><strong>Interview Type:</strong> ${interview.interviewType.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Mode:</strong> ${interview.interviewMode.replace('_', ' ').toUpperCase()}</p>
              ${interview.interviewLocation ? `<p><strong>Location:</strong> ${interview.interviewLocation}</p>` : ''}
              <p><strong>Interviewer:</strong> ${interviewerName}</p>
            </div>
            
            ${interview.meetingNotes ? `
              <h3>Additional Information</h3>
              <p>${interview.meetingNotes}</p>
            ` : ''}
            
            <h3>What to Expect</h3>
            <ul>
              <li>Please arrive 10 minutes early for check-in</li>
              <li>Bring a valid photo ID and any relevant documents</li>
              <li>Be prepared to discuss your experience and availability</li>
              <li>The interview will cover security protocols and procedures</li>
            </ul>
            
            <h3>Calendar Invitation</h3>
            <p>A calendar invitation (.ics file) has been attached to this email. Please add it to your calendar to ensure you don't miss the interview.</p>
            
            <p>If you need to reschedule or have any questions, please contact us immediately at (830) 201-0414.</p>
            
            <p>We look forward to meeting with you!</p>
            
            <p>Best regards,<br>
            Summit Advisory Hiring Team<br>
            TX DPS #C29754001</p>
          </div>
          
          <div class="footer">
            <p>Summit Advisory | (830) 201-0414 | Professional Security Services</p>
          </div>
        </body>
      </html>
    `

    const textContent = `
      Summit Advisory - Interview Scheduled
      
      Dear ${applicantName},
      
      Thank you for your interest in the Security Guard position at Summit Advisory. We are pleased to schedule an interview with you.
      
      INTERVIEW DETAILS:
      Date: ${interviewDate}
      Time: ${interviewTime}
      Duration: ${interview.durationMinutes} minutes
      Type: ${interview.interviewType.replace('_', ' ').toUpperCase()}
      Mode: ${interview.interviewMode.replace('_', ' ').toUpperCase()}
      ${interview.interviewLocation ? `Location: ${interview.interviewLocation}` : ''}
      Interviewer: ${interviewerName}
      
      ${interview.meetingNotes ? `Additional Information: ${interview.meetingNotes}` : ''}
      
      WHAT TO EXPECT:
      • Please arrive 10 minutes early for check-in
      • Bring a valid photo ID and any relevant documents
      • Be prepared to discuss your experience and availability
      • The interview will cover security protocols and procedures
      
      A calendar invitation has been attached to this email. Please add it to your calendar.
      
      If you need to reschedule or have questions, please contact us at (830) 201-0414.
      
      We look forward to meeting with you!
      
      Best regards,
      Summit Advisory Hiring Team
      TX DPS #C29754001
    `

    return { subject, htmlContent, textContent }
  }

  // Generate reminder email template
  private generateReminderTemplate(
    interview: Interview,
    applicantName: string,
    hoursUntilInterview: number
  ): EmailTemplate {
    const timeframe = hoursUntilInterview <= 2 ? 'soon' : hoursUntilInterview <= 24 ? 'tomorrow' : 'upcoming'
    
    const subject = `Reminder: Your Interview is ${timeframe} - Summit Advisory`

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Interview Reminder</h2>
          <p>Dear ${applicantName},</p>
          
          <p>This is a friendly reminder about your ${timeframe} interview with Summit Advisory.</p>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Interview Details</h3>
            <p><strong>Time:</strong> ${interview.scheduledAt.toLocaleString()}</p>
            <p><strong>Duration:</strong> ${interview.durationMinutes} minutes</p>
            <p><strong>Type:</strong> ${interview.interviewType.replace('_', ' ')}</p>
            ${interview.interviewLocation ? `<p><strong>Location:</strong> ${interview.interviewLocation}</p>` : ''}
          </div>
          
          <p>Please ensure you're prepared and available at the scheduled time. If you have any last-minute questions or need to reschedule, contact us immediately at (830) 201-0414.</p>
          
          <p>Thank you and see you ${timeframe}!</p>
          
          <p>Best regards,<br>Summit Advisory Team</p>
        </body>
      </html>
    `

    const textContent = `
      Interview Reminder - Summit Advisory
      
      Dear ${applicantName},
      
      This is a friendly reminder about your ${timeframe} interview with Summit Advisory.
      
      Interview Details:
      Time: ${interview.scheduledAt.toLocaleString()}
      Duration: ${interview.durationMinutes} minutes
      Type: ${interview.interviewType.replace('_', ' ')}
      ${interview.interviewLocation ? `Location: ${interview.interviewLocation}` : ''}
      
      Please ensure you're prepared and available at the scheduled time. If you have any last-minute questions or need to reschedule, contact us immediately at (830) 201-0414.
      
      Thank you and see you ${timeframe}!
      
      Best regards,
      Summit Advisory Team
    `

    return { subject, htmlContent, textContent }
  }

  // Generate rescheduled notification template
  private generateRescheduledTemplate(
    originalInterview: Interview,
    newInterview: Interview,
    applicantName: string,
    interviewerName: string,
    reason?: string
  ): EmailTemplate {
    const subject = `Interview Rescheduled - New Time Confirmed - Summit Advisory`

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Interview Rescheduled</h2>
          <p>Dear ${applicantName},</p>
          
          <p>We need to reschedule your interview for the Security Guard position at Summit Advisory.</p>
          
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          
          <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Previous Time</h3>
            <p>${originalInterview.scheduledAt.toLocaleString()}</p>
          </div>
          
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>New Interview Details</h3>
            <p><strong>Date & Time:</strong> ${newInterview.scheduledAt.toLocaleString()}</p>
            <p><strong>Duration:</strong> ${newInterview.durationMinutes} minutes</p>
            <p><strong>Type:</strong> ${newInterview.interviewType.replace('_', ' ')}</p>
            <p><strong>Mode:</strong> ${newInterview.interviewMode.replace('_', ' ')}</p>
            ${newInterview.interviewLocation ? `<p><strong>Location:</strong> ${newInterview.interviewLocation}</p>` : ''}
            <p><strong>Interviewer:</strong> ${interviewerName}</p>
          </div>
          
          <p>An updated calendar invitation is attached to this email. Please update your calendar accordingly.</p>
          
          <p>We apologize for any inconvenience and look forward to meeting with you at the new time.</p>
          
          <p>Best regards,<br>Summit Advisory Hiring Team</p>
        </body>
      </html>
    `

    const textContent = `
      Interview Rescheduled - Summit Advisory
      
      Dear ${applicantName},
      
      We need to reschedule your interview for the Security Guard position at Summit Advisory.
      
      ${reason ? `Reason: ${reason}` : ''}
      
      Previous Time: ${originalInterview.scheduledAt.toLocaleString()}
      
      NEW INTERVIEW DETAILS:
      Date & Time: ${newInterview.scheduledAt.toLocaleString()}
      Duration: ${newInterview.durationMinutes} minutes
      Type: ${newInterview.interviewType.replace('_', ' ')}
      Mode: ${newInterview.interviewMode.replace('_', ' ')}
      ${newInterview.interviewLocation ? `Location: ${newInterview.interviewLocation}` : ''}
      Interviewer: ${interviewerName}
      
      An updated calendar invitation is attached. Please update your calendar.
      
      We apologize for any inconvenience and look forward to meeting with you at the new time.
      
      Best regards,
      Summit Advisory Hiring Team
    `

    return { subject, htmlContent, textContent }
  }

  // Generate outcome notification template
  private generateOutcomeTemplate(
    interview: Interview,
    applicantName: string,
    outcome: 'approved' | 'rejected' | 'pending',
    message?: string
  ): EmailTemplate {
    const outcomeMessages = {
      approved: 'Congratulations! We would like to move forward with your application.',
      rejected: 'Thank you for your time. Unfortunately, we have decided to move forward with other candidates.',
      pending: 'Thank you for your interview. We are still reviewing all candidates and will update you soon.'
    }

    const subject = `Interview Update - Summit Advisory Security Guard Position`

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Interview Update</h2>
          <p>Dear ${applicantName},</p>
          
          <p>Thank you for taking the time to interview with us on ${interview.scheduledAt.toLocaleDateString()}.</p>
          
          <div style="background-color: ${outcome === 'approved' ? '#e8f5e8' : outcome === 'rejected' ? '#ffebee' : '#fff3cd'}; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>${outcomeMessages[outcome]}</strong></p>
          </div>
          
          ${message ? `<p>${message}</p>` : ''}
          
          ${outcome === 'approved' ? `
            <p>Our HR team will contact you within 48 hours with next steps, including background check procedures and onboarding information.</p>
          ` : outcome === 'pending' ? `
            <p>We expect to complete our review process within the next week and will notify you of our decision.</p>
          ` : `
            <p>We encourage you to apply for future opportunities that match your qualifications.</p>
          `}
          
          <p>Thank you for your interest in Summit Advisory.</p>
          
          <p>Best regards,<br>Summit Advisory Hiring Team<br>TX DPS #C29754001</p>
        </body>
      </html>
    `

    const textContent = `
      Interview Update - Summit Advisory
      
      Dear ${applicantName},
      
      Thank you for taking the time to interview with us on ${interview.scheduledAt.toLocaleDateString()}.
      
      ${outcomeMessages[outcome]}
      
      ${message || ''}
      
      ${outcome === 'approved' ? 
        'Our HR team will contact you within 48 hours with next steps, including background check procedures and onboarding information.' : 
        outcome === 'pending' ? 
        'We expect to complete our review process within the next week and will notify you of our decision.' :
        'We encourage you to apply for future opportunities that match your qualifications.'
      }
      
      Thank you for your interest in Summit Advisory.
      
      Best regards,
      Summit Advisory Hiring Team
      TX DPS #C29754001
    `

    return { subject, htmlContent, textContent }
  }

  // Generate ICS calendar event
  private generateICSEvent(event: ICSEvent): string {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Summit Advisory//Guard Management//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${event.uid}
DTSTART:${formatDate(event.startTime)}
DTEND:${formatDate(event.endTime)}
SUMMARY:${event.summary}
DESCRIPTION:${event.description}
${event.location ? `LOCATION:${event.location}` : ''}
ORGANIZER;CN=Summit Advisory:MAILTO:${event.organizerEmail}
ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:MAILTO:${event.attendeeEmail}
STATUS:CONFIRMED
SEQUENCE:0
PRIORITY:5
CLASS:PUBLIC
BEGIN:VALARM
TRIGGER:-PT2H
ACTION:DISPLAY
DESCRIPTION:Interview with Summit Advisory in 2 hours
END:VALARM
BEGIN:VALARM
TRIGGER:-PT24H
ACTION:EMAIL
DESCRIPTION:Interview with Summit Advisory tomorrow
SUMMARY:Interview Reminder
ATTENDEE:MAILTO:${event.attendeeEmail}
END:VALARM
END:VEVENT
END:VCALENDAR`
  }

  // Send email with attachment
  private async sendEmailWithAttachment(
    to: string,
    subject: string,
    htmlContent: string,
    textContent: string,
    attachment: { filename: string; content: string; contentType: string }
  ): Promise<ServiceResult<boolean>> {
    try {
      // In a real implementation, this would integrate with an email service like SendGrid, Resend, or AWS SES
      // For now, we'll simulate the email sending
      console.log(`Sending email with attachment to: ${to}`)
      console.log(`Subject: ${subject}`)
      console.log(`Attachment: ${attachment.filename} (${attachment.contentType})`)
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100))
      
      return { success: true, data: true }
    } catch (error) {
      console.error('Email send error:', error)
      return { success: false, error: 'Failed to send email with attachment' }
    }
  }

  // Send simple email
  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent: string
  ): Promise<ServiceResult<boolean>> {
    try {
      // In a real implementation, this would integrate with an email service
      console.log(`Sending email to: ${to}`)
      console.log(`Subject: ${subject}`)
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100))
      
      return { success: true, data: true }
    } catch (error) {
      console.error('Email send error:', error)
      return { success: false, error: 'Failed to send email' }
    }
  }

  // Log notification in database
  private async logNotification(
    interviewId: string,
    type: string,
    recipient: string,
    status: 'sent' | 'failed'
  ): Promise<void> {
    try {
      await supabase
        .from('application_comments')
        .insert({
          application_id: interviewId, // This should reference the application, not interview
          comment_text: `Email notification sent: ${type} to ${recipient}`,
          comment_type: 'system_notification'
        })
    } catch (error) {
      console.error('Notification logging error:', error)
    }
  }
}