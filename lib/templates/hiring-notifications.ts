export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface NotificationData {
  applicantName: string
  applicantEmail: string
  managerName?: string
  interviewDate?: string
  interviewTime?: string
  applicationId: string
  rejectionReason?: string
  nextSteps?: string
}

export const hiringNotificationTemplates = {
  applicationReceived: (data: NotificationData): EmailTemplate => ({
    subject: `Application Received - Summit Advisory Security Services`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37;">Application Received</h2>
        <p>Dear ${data.applicantName},</p>
        <p>Thank you for your interest in joining Summit Advisory as a security guard. We have successfully received your application.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #d4af37;">
          <p><strong>Application ID:</strong> ${data.applicationId}</p>
          <p><strong>Status:</strong> Under Review</p>
        </div>
        
        <p>Our hiring team will review your application and contact you within 2-3 business days regarding next steps.</p>
        
        <p>What to expect next:</p>
        <ul>
          <li>Background check initiation</li>
          <li>Interview scheduling</li>
          <li>Reference verification</li>
        </ul>
        
        <p>If you have any questions, please don't hesitate to contact us at (830) 201-0414.</p>
        
        <p>Best regards,<br>
        Summit Advisory Hiring Team<br>
        TX DPS #C29754001</p>
      </div>
    `,
    text: `
      Application Received - Summit Advisory Security Services
      
      Dear ${data.applicantName},
      
      Thank you for your interest in joining Summit Advisory as a security guard. We have successfully received your application.
      
      Application ID: ${data.applicationId}
      Status: Under Review
      
      Our hiring team will review your application and contact you within 2-3 business days regarding next steps.
      
      What to expect next:
      - Background check initiation
      - Interview scheduling
      - Reference verification
      
      If you have any questions, please contact us at (830) 201-0414.
      
      Best regards,
      Summit Advisory Hiring Team
      TX DPS #C29754001
    `
  }),

  interviewScheduled: (data: NotificationData): EmailTemplate => ({
    subject: `Interview Scheduled - Summit Advisory Security Services`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37;">Interview Scheduled</h2>
        <p>Dear ${data.applicantName},</p>
        <p>Great news! We would like to invite you for an interview for the security guard position at Summit Advisory.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #d4af37;">
          <p><strong>Interview Date:</strong> ${data.interviewDate}</p>
          <p><strong>Interview Time:</strong> ${data.interviewTime}</p>
          <p><strong>Interviewer:</strong> ${data.managerName}</p>
          <p><strong>Application ID:</strong> ${data.applicationId}</p>
        </div>
        
        <p>Please come prepared with:</p>
        <ul>
          <li>Valid government-issued photo ID</li>
          <li>Copies of any security certifications</li>
          <li>Questions about the position and company</li>
        </ul>
        
        <p>The interview will cover your experience, availability, and our expectations for the role.</p>
        
        <p>If you need to reschedule, please contact us at least 24 hours in advance at (830) 201-0414.</p>
        
        <p>Best regards,<br>
        Summit Advisory Hiring Team<br>
        TX DPS #C29754001</p>
      </div>
    `,
    text: `
      Interview Scheduled - Summit Advisory Security Services
      
      Dear ${data.applicantName},
      
      Great news! We would like to invite you for an interview for the security guard position at Summit Advisory.
      
      Interview Date: ${data.interviewDate}
      Interview Time: ${data.interviewTime}
      Interviewer: ${data.managerName}
      Application ID: ${data.applicationId}
      
      Please come prepared with:
      - Valid government-issued photo ID
      - Copies of any security certifications
      - Questions about the position and company
      
      The interview will cover your experience, availability, and our expectations for the role.
      
      If you need to reschedule, please contact us at least 24 hours in advance at (830) 201-0414.
      
      Best regards,
      Summit Advisory Hiring Team
      TX DPS #C29754001
    `
  }),

  applicationApproved: (data: NotificationData): EmailTemplate => ({
    subject: `Congratulations! Application Approved - Summit Advisory`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37;">Congratulations!</h2>
        <p>Dear ${data.applicantName},</p>
        <p>We are pleased to inform you that your application for the security guard position has been <strong>APPROVED</strong>!</p>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-left: 4px solid #28a745;">
          <p><strong>Application Status:</strong> APPROVED</p>
          <p><strong>Application ID:</strong> ${data.applicationId}</p>
          <p><strong>Next Step:</strong> Complete Guard Profile</p>
        </div>
        
        <p><strong>What happens next:</strong></p>
        <ol>
          <li>You will receive a secure link to complete your official guard profile</li>
          <li>Upload required documentation and certifications</li>
          <li>Complete TOPS compliance requirements</li>
          <li>Begin scheduling for security assignments</li>
        </ol>
        
        <p>Your secure profile completion link will be sent within 24 hours. This link will allow you to complete all required documentation to become an active guard.</p>
        
        ${data.nextSteps ? `<p><strong>Additional Information:</strong> ${data.nextSteps}</p>` : ''}
        
        <p>Welcome to the Summit Advisory team!</p>
        
        <p>Best regards,<br>
        ${data.managerName || 'Summit Advisory Hiring Team'}<br>
        TX DPS #C29754001</p>
      </div>
    `,
    text: `
      Congratulations! Application Approved - Summit Advisory
      
      Dear ${data.applicantName},
      
      We are pleased to inform you that your application for the security guard position has been APPROVED!
      
      Application Status: APPROVED
      Application ID: ${data.applicationId}
      Next Step: Complete Guard Profile
      
      What happens next:
      1. You will receive a secure link to complete your official guard profile
      2. Upload required documentation and certifications
      3. Complete TOPS compliance requirements
      4. Begin scheduling for security assignments
      
      Your secure profile completion link will be sent within 24 hours.
      
      ${data.nextSteps ? `Additional Information: ${data.nextSteps}` : ''}
      
      Welcome to the Summit Advisory team!
      
      Best regards,
      ${data.managerName || 'Summit Advisory Hiring Team'}
      TX DPS #C29754001
    `
  }),

  applicationRejected: (data: NotificationData): EmailTemplate => ({
    subject: `Application Status Update - Summit Advisory`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6c757d;">Application Status Update</h2>
        <p>Dear ${data.applicantName},</p>
        <p>Thank you for your interest in the security guard position at Summit Advisory. After careful consideration, we have decided not to move forward with your application at this time.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #6c757d;">
          <p><strong>Application ID:</strong> ${data.applicationId}</p>
          <p><strong>Status:</strong> Not Selected</p>
          ${data.rejectionReason ? `<p><strong>Feedback:</strong> ${data.rejectionReason}</p>` : ''}
        </div>
        
        <p>This decision does not reflect on your qualifications or character. We received many qualified applications and had to make difficult choices.</p>
        
        <p>We encourage you to:</p>
        <ul>
          <li>Apply for future openings that match your experience</li>
          <li>Consider additional security certifications or training</li>
          <li>Stay connected with our team for upcoming opportunities</li>
        </ul>
        
        <p>Thank you again for your interest in Summit Advisory. We wish you success in your career.</p>
        
        <p>Best regards,<br>
        Summit Advisory Hiring Team<br>
        TX DPS #C29754001</p>
      </div>
    `,
    text: `
      Application Status Update - Summit Advisory
      
      Dear ${data.applicantName},
      
      Thank you for your interest in the security guard position at Summit Advisory. After careful consideration, we have decided not to move forward with your application at this time.
      
      Application ID: ${data.applicationId}
      Status: Not Selected
      ${data.rejectionReason ? `Feedback: ${data.rejectionReason}` : ''}
      
      This decision does not reflect on your qualifications or character. We received many qualified applications and had to make difficult choices.
      
      We encourage you to:
      - Apply for future openings that match your experience
      - Consider additional security certifications or training
      - Stay connected with our team for upcoming opportunities
      
      Thank you again for your interest in Summit Advisory. We wish you success in your career.
      
      Best regards,
      Summit Advisory Hiring Team
      TX DPS #C29754001
    `
  }),

  managerAssignment: (data: NotificationData): EmailTemplate => ({
    subject: `New Application Assignment - ${data.applicantName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37;">New Application Assignment</h2>
        <p>Hello ${data.managerName},</p>
        <p>You have been assigned a new guard application to review.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #d4af37;">
          <p><strong>Applicant:</strong> ${data.applicantName}</p>
          <p><strong>Email:</strong> ${data.applicantEmail}</p>
          <p><strong>Application ID:</strong> ${data.applicationId}</p>
          <p><strong>Status:</strong> Awaiting Manager Review</p>
        </div>
        
        <p>Please log into the manager dashboard to:</p>
        <ul>
          <li>Review application details and AI-parsed resume data</li>
          <li>Schedule background check if appropriate</li>
          <li>Arrange interview if candidate meets initial criteria</li>
          <li>Move application through the hiring pipeline</li>
        </ul>
        
        <p>Access the application in your dashboard under the "Hiring Pipeline" section.</p>
        
        <p>Best regards,<br>
        Summit Advisory System</p>
      </div>
    `,
    text: `
      New Application Assignment - ${data.applicantName}
      
      Hello ${data.managerName},
      
      You have been assigned a new guard application to review.
      
      Applicant: ${data.applicantName}
      Email: ${data.applicantEmail}
      Application ID: ${data.applicationId}
      Status: Awaiting Manager Review
      
      Please log into the manager dashboard to:
      - Review application details and AI-parsed resume data
      - Schedule background check if appropriate
      - Arrange interview if candidate meets initial criteria
      - Move application through the hiring pipeline
      
      Access the application in your dashboard under the "Hiring Pipeline" section.
      
      Best regards,
      Summit Advisory System
    `
  })
}