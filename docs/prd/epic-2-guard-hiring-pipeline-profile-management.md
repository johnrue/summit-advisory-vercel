# Epic 2 Guard Hiring Pipeline & Profile Management

**Epic Goal:** Implement the complete guard lifecycle from lead capture through application, hiring workflow, approval process, and comprehensive TOPS-compliant profile creation with all required documentation. This epic delivers the core functionality that transforms interested candidates into verified, schedulable guard profiles with complete regulatory compliance documentation, audit trails, and AI-assisted data processing.

## Story 2.1: Guard Lead Capture System
As a potential guard,
I want to easily express interest in working with Summit Advisory,
so that I can begin the application process without friction while enabling the company to track and follow up on my interest.

### Acceptance Criteria
1. Create minimal lead capture form accepting only name and email with source tracking
2. Implement automated email reminder system with configurable cadence (2 days, 7 days)
3. Generate secure application link that prevents unauthorized access and tracks completion status
4. Store lead data with source attribution and timestamp for conversion tracking
5. Create lead management interface for managers to view and manually follow up on leads
6. Implement mobile-optimized lead capture form accessible via QR codes and social media

## Story 2.2: Online Application Submission
As a guard applicant,
I want to complete my application online with document upload,
so that I can submit all required information efficiently without multiple visits or phone calls.

### Acceptance Criteria
1. Create comprehensive application form with all required fields and optional resume upload
2. **Implement OpenAI resume parsing**: Automatically extract and populate form fields (name, contact, experience, skills, certifications) from uploaded resume
3. **Provide AI-parsed data review**: Allow applicants to review, edit, and confirm AI-extracted information before submission
4. Implement client-side validation and progress saving to prevent data loss
5. Configure secure document upload (PDF/DOCX) with file type validation and virus scanning
6. Store application data with timestamps and automatically transition lead to "Application Received" status
7. Send confirmation email to applicant with application reference number and next steps
8. Create application review interface showing submitted documents, applicant information, and AI-parsed data confidence scores

## Story 2.3: AI-Powered Resume Processing System
As a guard applicant or manager,
I want resume information to be automatically extracted and validated using AI,
so that the application process is faster, more accurate, and reduces manual data entry errors for both applicants and hiring staff.

### Acceptance Criteria
1. **OpenAI Integration**: Implement secure OpenAI API integration for resume parsing with rate limiting and error handling
2. **Document Processing Pipeline**: Create Supabase Edge Function to process uploaded resumes (PDF/DOCX) and extract text content
3. **Structured Data Extraction**: Use OpenAI to parse resumes and extract:
   - Personal information (name, phone, email, address)
   - Work experience (security industry experience, previous employers, dates)
   - Skills and qualifications (security certifications, relevant training)
   - Education background
   - Professional references (if available)
4. **Confidence Scoring**: Implement confidence scoring for extracted data to highlight fields requiring human review
5. **Data Validation**: Cross-validate extracted data against expected formats and flag inconsistencies
6. **Manager Review Interface**: Create manager dashboard to review AI-parsed applications with confidence indicators
7. **Fallback Handling**: Implement manual data entry fallback if AI parsing fails or confidence is low
8. **Privacy Compliance**: Ensure resume content is processed securely and not stored permanently in OpenAI systems
9. **Processing Status**: Show real-time processing status to users during resume upload and parsing
10. **Audit Trail**: Log all AI processing actions for compliance and troubleshooting purposes

## Story 2.4: Hiring Workflow Kanban Board
As a manager,
I want to manage all guard applications through a visual workflow,
so that I can efficiently process applications, track progress, and ensure no applicants fall through the cracks while handling my other operational responsibilities.

### Acceptance Criteria
1. Create Hiring Kanban board with columns: Lead Captured → Application Received → Under Review → Background Check → Interview Scheduled → Approved/Rejected → Profile Created
2. Implement drag-and-drop functionality to move applications between workflow stages
3. Add comment system for notes, interview feedback, and collaboration between reviewers
4. Configure status change notifications to applicants via email for major milestones
5. Create filtering and search capabilities by applicant name, date range, and status
6. Implement bulk actions for common operations like sending reminder emails

## Story 2.5: Background Check Integration
As a manager,
I want to track background check status without storing sensitive verification data,
so that I can ensure compliance requirements are met while maintaining data security and privacy as part of my hiring duties.

### Acceptance Criteria
1. Create background check status tracking (Pending, Complete, Failed) with date stamps
2. Implement manual status update interface for managers with required notes and approver identification
3. Configure notification system for background check completion and expiry reminders
4. Store only status references and vendor confirmation numbers, not raw background data
5. Create audit trail for all background check status changes with manager approval requirements
6. Implement background check expiry tracking and renewal reminder notifications

## Story 2.6: Interview Scheduling System
As a manager,
I want to schedule and track interviews with applicants,
so that I can coordinate hiring decisions with proper documentation and follow-up alongside my other management responsibilities.

### Acceptance Criteria
1. Implement interview scheduling interface with calendar integration and availability checking
2. Create interview note-taking system with structured feedback forms and rating capabilities
3. Configure automatic email notifications to applicants with interview details and preparation instructions
4. Store interview outcomes with hiring recommendation and detailed feedback for audit purposes
5. Implement interview rescheduling workflow with notification management and conflict detection
6. Create interview history tracking with multiple rounds support and decision rationale capture

## Story 2.7: Approval Workflow & Audit Trail
As a manager,
I want to approve or reject applicants with full accountability,
so that all hiring decisions are documented with clear audit trails for compliance and accountability as part of my comprehensive management role.

### Acceptance Criteria
1. Implement approval action interface requiring manager authentication and decision rationale
2. Create immutable audit records capturing approver identity, timestamp, decision, and supporting notes
3. Configure automatic profile creation trigger for approved applicants with secure completion link
4. Implement rejection workflow with required reason categorization and respectful applicant notification
5. Create approval history reporting with exportable compliance documentation
6. Implement approval delegation system with manager hierarchy and decision authority tracking

## Story 2.8: TOPS-Compliant Guard Profile Creation
As an approved guard applicant,
I want to complete my official guard profile with all required information,
so that I can become an active, schedulable guard while ensuring company compliance with regulations.

### Acceptance Criteria
1. **Create comprehensive TOPS-compliant guard profile form** with all required fields and data validation:
   - Full Legal Name (with validation against government ID requirements)
   - Date of Birth (encrypted storage)
   - Place of Birth
   - Last Six Digits of SSN (encrypted storage with partial masking)
   - Company (Summit Advisory pre-filled)
   - Current Residential Address (with address validation)
   - Recent Photograph Upload (with file size and format validation)
   - Signed Drug-Free Policy (document upload with digital signature)
   - Results of All Drug Tests (document upload, if applicable)
   - First Date of Employment (auto-populated when profile approved)
   - Last Day of Employment (nullable, updated when guard status changes)
   - Continuing Education Records (document upload with expiry tracking)
   - TOPS Profile Link (URL field with validation and direct access button for managers)

2. **Pre-populate profile with AI-parsed resume data**: Automatically fill profile fields with previously parsed resume information from application stage

3. **Enable profile completion assistance**: Use OpenAI to suggest missing fields and validate entered information for completeness

4. **Implement enhanced document management system**:
   - Required document checklist with completion status indicators
   - Document upload validation (file types, sizes, virus scanning)
   - Digital signature capability for policy agreements
   - Document expiry tracking and renewal reminders

5. **TOPS Profile Integration**:
   - URL field for TOPS profile link with format validation (must be valid TOPS URL)
   - Direct access button in manager interface to open TOPS profile in new tab
   - Link validation to ensure it points to a legitimate TOPS profile page
   - Optional field indicator (guards may not have TOPS profile initially)
   - Audit logging when TOPS profile links are accessed by managers

6. **Implement encrypted storage for sensitive PII** (SSN, DOB, photograph) with role-based access restrictions and audit logging

7. **Create profile verification workflow** for managers to review and approve completed profiles with document validation checklist

8. **Implement certification and document expiry tracking** with automated reminder notifications (30, 14, 7 days) for:
   - Security certifications
   - Drug test results
   - Continuing education records
   - Policy acknowledgments

9. **Store comprehensive audit trail** including profile completion timestamp, verification approver, document upload history, and scheduling eligibility status

10. **Generate compliance reports** showing complete guard roster with all required documentation status for TOPS audits
