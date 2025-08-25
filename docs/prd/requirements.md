# Requirements

## Functional Requirements

**FR1**: Guard lead capture system accepts minimal information (name + email) and sends configurable automated reminder emails (2 days, 7 days) to complete application.

**FR2**: Hiring workflow Kanban manages complete application-to-approval process with statuses: Lead Captured → Application Received → Under Review → Background Check → Interview Scheduled → Approved/Rejected → Profile Created.

**FR3**: Guard profile system collects and stores TOPS-required compliance fields (full legal name, DOB, SSN encrypted, addresses, certifications with expiry dates, background check status) and operational fields (availability, skills, pay rate).

**FR4**: Shift management Kanban creates, assigns, and tracks shifts through workflow: Unassigned → Assigned → Confirmed → In Progress → Completed → Issue Logged with eligibility validation and conflict detection.

**FR5**: Calendar integration provides master calendar with role-based views, external calendar sync (Google/Outlook), and availability management with permission-limited exports.

**FR6**: Notification system delivers in-app and email notifications for assignments, reminders (24hr, 2hr before shift), certification expiry (30, 14, 7 days), and hiring status changes.

**FR7**: Audit logging system captures immutable records of all hiring decisions, scheduling changes, and compliance actions with who/what/when/context for TOPS compliance exports.

**FR8**: Role-based security implements row-level security policies ensuring guards see only their data, managers see organization-level data across all functions (hiring, scheduling, sales, compliance), and admins have full platform access.

**FR9**: Lead generation pipeline manages dual pipelines for client leads (sales) and guard leads (recruiting) with source tracking and automated assignment to available managers.

**FR10**: Contract management Kanban tracks client relationships through: Prospect → Proposal → Negotiation → Signed → Active → Renew/Closed.

**FR11**: Background check integration tracks status (pending/complete/failed) and dates without storing sensitive raw verification data.

**FR12**: Document upload system accepts and securely stores resumes, certifications, and compliance documents with file type validation.

## Non-Functional Requirements

**NFR1**: System must achieve sub-2 second page load times and 99.5% uptime to support real-time operational workflows.

**NFR2**: All sensitive PII (SSN, DOB) must be encrypted at rest and only accessible to authorized roles (Manager/Admin) with audit trail of access.

**NFR3**: Platform must support 200+ concurrent users with real-time notifications delivered under 5 seconds.

**NFR4**: TOPS compliance exports must be generated in under 15 minutes with complete audit trails and certification status.

**NFR5**: Calendar sync must enforce strict permission filtering, only exporting events the user is authorized to see with OAuth consent flow.

**NFR6**: All user authentication must enforce strong password policies and rate limiting. MFA enforcement for manager and admin accounts will be implemented in a future enhancement phase.

**NFR7**: Platform must be mobile-responsive and Progressive Web App capable for guard access via mobile devices.

**NFR8**: Background job failures (email, calendar sync, notifications) must trigger monitoring alerts and have automatic retry mechanisms.

**NFR9**: Data retention must follow configurable policies with secure archival/deletion capabilities for TOPS compliance requirements.

**NFR10**: External API integrations (background check vendors, calendar providers) must have fallback mechanisms and not block core workflows.
