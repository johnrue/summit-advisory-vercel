# Summit Advisory Guard Management Platform Product Requirements Document (PRD)

## Goals and Background Context

### Goals
- Transform guard operations from manual/fragmented processes to integrated, compliance-first digital platform
- Reduce hiring cycle time by 40% through automated workflows and audit trails
- Achieve 100% TOPS compliance audit pass rate with zero violations  
- Decrease scheduling conflicts by 75% through automated conflict detection and calendar integration
- Improve guard application completion rate to 85% (from estimated 45%) via streamlined mobile-friendly workflows
- Scale operations to manage 200+ guards without proportional administrative overhead increase
- Eliminate manual data entry errors for certifications, availability, and compliance tracking

### Background Context

Security companies currently manage guard operations through fragmented systems involving spreadsheets, manual processes, and disconnected tools, leading to significant operational inefficiencies and compliance risks. Summit Advisory faces the same challenges: high application dropoff, manual hiring workflows without audit trails, scheduling conflicts from lack of centralized management, and compliance gaps where TOPS regulatory requirements are met through manual tracking that creates audit risks.

The Summit Advisory Guard Management Platform addresses these critical gaps by providing a comprehensive, TOPS-native compliance solution that manages the complete guard lifecycle through a unified web application. Built specifically for the Texas security industry, this platform uses Kanban-driven workflow management with automated compliance tracking, audit-first architecture, and security-by-design principles to enable enterprise-grade efficiency while maintaining full regulatory compliance.

### Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-22 | 1.0 | Initial PRD creation from Project Brief and Requirements | PM Agent |

## Requirements

### Functional Requirements

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

### Non-Functional Requirements

**NFR1**: System must achieve sub-2 second page load times and 99.5% uptime to support real-time operational workflows.

**NFR2**: All sensitive PII (SSN, DOB) must be encrypted at rest and only accessible to authorized roles (Manager/Admin) with audit trail of access.

**NFR3**: Platform must support 200+ concurrent users with real-time notifications delivered under 5 seconds.

**NFR4**: TOPS compliance exports must be generated in under 15 minutes with complete audit trails and certification status.

**NFR5**: Calendar sync must enforce strict permission filtering, only exporting events the user is authorized to see with OAuth consent flow.

**NFR6**: All user authentication must enforce MFA for manager and admin accounts with strong password policies and rate limiting.

**NFR7**: Platform must be mobile-responsive and Progressive Web App capable for guard access via mobile devices.

**NFR8**: Background job failures (email, calendar sync, notifications) must trigger monitoring alerts and have automatic retry mechanisms.

**NFR9**: Data retention must follow configurable policies with secure archival/deletion capabilities for TOPS compliance requirements.

**NFR10**: External API integrations (background check vendors, calendar providers) must have fallback mechanisms and not block core workflows.

## User Interface Design Goals

### Overall UX Vision
Professional, security-industry focused interface that prioritizes efficiency and compliance confidence. The design should feel enterprise-grade yet approachable, reducing cognitive load for managers handling multiple complex workflows while providing guards with simple, mobile-first interactions. Interface should convey trust, accountability, and operational precision befitting a security services platform.

### Key Interaction Paradigms
- **Kanban-driven workflow management**: Visual boards for hiring, shifts, contracts, and projects with drag-and-drop functionality and clear status progression
- **Role-switching dashboard design**: Managers need unified interfaces that allow them to seamlessly switch between hiring, scheduling, sales, and compliance functions rather than specialized role-based applications
- **Progressive disclosure**: Complex guard profiles and detailed workflows revealed progressively to avoid overwhelming users
- **Mobile-first responsive design**: Touch-friendly interactions with large tap targets for guards accessing via smartphones

### Core Screens and Views
- **Unified Manager Dashboard**: Single dashboard that surfaces urgent items across hiring, scheduling, sales, and compliance with context-switching capabilities
- **Multi-function Kanban Interface**: Tabbed or filtered view allowing managers to work with Hiring, Shifts, Contracts, and Internal Projects from the same interface
- **Guard Profile Management**: Comprehensive profile editor with TOPS compliance indicators and document upload
- **Calendar View**: Master calendar with role-based filtering and availability management
- **Compliance Reports Dashboard**: TOPS export generation and audit log access
- **Guard Mobile Portal**: Simplified shift acceptance, availability setting, and profile management
- **Lead Capture Forms**: Minimal friction forms for both client and guard lead generation

### Accessibility: WCAG AA
Platform must meet WCAG AA standards for accessibility, ensuring compliance with ADA requirements and supporting assistive technologies for all user roles.

### Branding
Extend existing Summit Advisory brand identity with professional security industry aesthetics. Leverage current warm metallic gold primary colors, charcoal backgrounds, and clean typography while adding operational interface elements (status indicators, priority badges, compliance icons) that convey security industry professionalism and regulatory rigor.

### Target Device and Platforms: Web Responsive
Primary focus on responsive web application compatible with desktop browsers for managers and mobile browsers for guards. Progressive Web App capabilities for mobile installation and offline functionality during shifts.

## Technical Assumptions

### Repository Structure: Monorepo
Extend the existing Summit Advisory website repository with new guard management modules. This leverages the current Next.js 15, Supabase integration, and Vercel deployment infrastructure while maintaining unified version control and deployment pipeline.

### Service Architecture
**JAMstack + Supabase Backend**: Continue with current architecture of static Next.js frontend deployed on Vercel with Supabase providing backend services (database, auth, real-time subscriptions, file storage). Add authentication layer for guard management modules while maintaining static export capability for marketing pages.

### Testing Requirements
**Unit + Integration Testing**: Implement comprehensive testing pyramid with unit tests for business logic, integration tests for Supabase operations, and end-to-end tests for critical workflows (hiring approval, shift assignment, compliance exports). Manual testing convenience methods required for compliance validation scenarios.

### Development Enhancement Tools (MCP Integration)
**MCP-Powered Development Workflow**: Integrate Model Context Protocol (MCP) tools to streamline development and deployment processes:

- **Supabase MCP**: Direct database schema management, query execution, migration creation, and real-time monitoring from development environment
- **Vercel MCP**: Seamless deployment management, environment variable configuration, build monitoring, and performance analytics integration
- **Reference MCP**: Contextual code documentation, dependency tracking, and architectural decision recording for maintainable development

These MCP integrations enable rapid iteration cycles, reduce context switching between tools, and provide intelligent assistance for database operations, deployment workflows, and codebase navigation.

### Additional Technical Assumptions and Requests

- **Frontend Framework**: Next.js 15 with React 19, TypeScript, Tailwind CSS, shadcn/ui components (building on existing codebase)
- **Database**: PostgreSQL via Supabase with Row-Level Security policies, encrypted storage for PII, and real-time subscriptions for live updates
- **Authentication**: Supabase Auth with MFA enforcement for managers/admins, role-based permissions, and secure session management
- **File Storage**: Supabase Storage for document uploads (resumes, certifications) with access control and virus scanning
- **Email Service**: Supabase Edge Functions with email provider integration for transactional notifications and reminders
- **Calendar Integration**: OAuth integration with Google Calendar and Outlook APIs for bi-directional sync with permission filtering
- **Background Jobs**: Supabase Edge Functions for automated reminders, certification expiry checks, and compliance report generation
- **Deployment**: Vercel for frontend hosting, Supabase Cloud for backend services, environment variable management for secrets
- **Monitoring**: Supabase built-in monitoring plus Vercel Analytics, custom alerts for critical workflow failures and performance thresholds
- **Compliance**: Audit logging via Supabase with immutable records, encrypted PII fields, and configurable data retention policies

## Epic List

**Epic 1: Foundation & Authentication Infrastructure**
Establish secure, role-based authentication system and project infrastructure that enables guard management functionality while maintaining existing marketing site capabilities. Integrate MCP development tools for streamlined workflow.

**Epic 2: Guard Hiring Pipeline & Profile Management**
Implement complete guard lead capture through hiring workflow Kanban with TOPS-compliant profile creation and document management.

**Epic 3: Shift Management & Calendar Integration**
Create shift scheduling Kanban with calendar integration, conflict detection, and availability management for operational workforce coordination.

**Epic 4: Compliance & Audit System**
Implement audit logging, TOPS compliance reporting, and notification systems to ensure regulatory requirements and operational accountability.

**Epic 5: Lead Generation & Contract Management**
Add client lead pipeline, contract lifecycle management, and dual-pipeline lead generation for business development capabilities.

## Epic 1 Foundation & Authentication Infrastructure

**Epic Goal:** Establish secure, role-based authentication system and project infrastructure that enables guard management functionality while maintaining existing marketing site capabilities. This epic delivers the security foundation and basic user management required for all subsequent guard workforce operations.

### Story 1.1: Project Infrastructure Setup
As a developer,
I want to extend the existing Summit Advisory Next.js application with authentication capabilities,
so that the platform can support secure guard management features while preserving marketing site functionality.

#### Acceptance Criteria
1. Extend existing Next.js 15 application with Supabase Auth integration while maintaining static export for marketing pages
2. Configure role-based routing that preserves public marketing routes and protects guard management routes
3. Implement environment variable management for development, staging, and production environments
4. Set up Vercel deployment pipeline extension to handle authenticated and static content deployment
5. Create database schema foundation with RLS policies template structure
6. Establish testing framework for both static and authenticated application components

### Story 1.2: User Authentication System
As a manager or guard,
I want to securely log into the platform with appropriate access levels,
so that I can access role-specific functionality while ensuring sensitive data remains protected.

#### Acceptance Criteria
1. Implement Supabase Auth login/logout with email and password authentication
2. Enforce MFA requirement for manager and admin role accounts with setup wizard
3. Configure password policy with minimum complexity requirements and rate limiting
4. Create role assignment system (Guard, Manager, Admin) with Supabase RLS integration
5. Implement session management with secure token handling and automatic logout
6. Provide password reset functionality with secure email verification flow

### Story 1.3: Role-Based Access Control
As an administrator,
I want to manage user roles and permissions,
so that guards only access their data while managers have operational visibility and admins have full platform access.

#### Acceptance Criteria
1. Create user roles table with Guard, Manager, Admin roles and permission matrices
2. Implement RLS policies that enforce data access based on user roles and organizational boundaries
3. Create role assignment interface for admins to manage user permissions
4. Configure navigation and UI elements to show/hide based on user role permissions
5. Implement audit logging for role changes and permission elevation actions
6. Test role enforcement across all planned application routes and data access patterns

### Story 1.4: Basic Dashboard Framework
As a manager or guard,
I want to access a role-appropriate dashboard when I log in,
so that I can quickly see relevant information and access key functions for my role.

#### Acceptance Criteria
1. Create manager dashboard template with widgets for urgent items and quick actions
2. Create guard dashboard template with personal schedule, assignments, and profile access
3. Implement dashboard personalization for widget arrangement and display preferences
4. Configure dashboard routing based on user role with appropriate default landing pages
5. Create navigation framework that supports both authenticated and public site sections
6. Implement responsive design that works on desktop (managers) and mobile (guards)

## Epic 2 Guard Hiring Pipeline & Profile Management

**Epic Goal:** Implement the complete guard lifecycle from lead capture through application, hiring workflow, approval process, and TOPS-compliant profile creation. This epic delivers the core functionality that transforms interested candidates into verified, schedulable guard profiles with full audit trails and regulatory compliance.

### Story 2.1: Guard Lead Capture System
As a potential guard,
I want to easily express interest in working with Summit Advisory,
so that I can begin the application process without friction while enabling the company to track and follow up on my interest.

#### Acceptance Criteria
1. Create minimal lead capture form accepting only name and email with source tracking
2. Implement automated email reminder system with configurable cadence (2 days, 7 days)
3. Generate secure application link that prevents unauthorized access and tracks completion status
4. Store lead data with source attribution and timestamp for conversion tracking
5. Create lead management interface for managers to view and manually follow up on leads
6. Implement mobile-optimized lead capture form accessible via QR codes and social media

### Story 2.2: Online Application Submission
As a guard applicant,
I want to complete my application online with document upload,
so that I can submit all required information efficiently without multiple visits or phone calls.

#### Acceptance Criteria
1. Create comprehensive application form with all required fields and optional resume upload
2. Implement client-side validation and progress saving to prevent data loss
3. Configure secure document upload (PDF/DOCX) with file type validation and virus scanning
4. Store application data with timestamps and automatically transition lead to "Application Received" status
5. Send confirmation email to applicant with application reference number and next steps
6. Create application review interface showing submitted documents and applicant information

### Story 2.3: Hiring Workflow Kanban Board
As a manager,
I want to manage all guard applications through a visual workflow,
so that I can efficiently process applications, track progress, and ensure no applicants fall through the cracks while handling my other operational responsibilities.

#### Acceptance Criteria
1. Create Hiring Kanban board with columns: Lead Captured → Application Received → Under Review → Background Check → Interview Scheduled → Approved/Rejected → Profile Created
2. Implement drag-and-drop functionality to move applications between workflow stages
3. Add comment system for notes, interview feedback, and collaboration between reviewers
4. Configure status change notifications to applicants via email for major milestones
5. Create filtering and search capabilities by applicant name, date range, and status
6. Implement bulk actions for common operations like sending reminder emails

### Story 2.4: Background Check Integration
As a manager,
I want to track background check status without storing sensitive verification data,
so that I can ensure compliance requirements are met while maintaining data security and privacy as part of my hiring duties.

#### Acceptance Criteria
1. Create background check status tracking (Pending, Complete, Failed) with date stamps
2. Implement manual status update interface for managers with required notes and approver identification
3. Configure notification system for background check completion and expiry reminders
4. Store only status references and vendor confirmation numbers, not raw background data
5. Create audit trail for all background check status changes with manager approval requirements
6. Implement background check expiry tracking and renewal reminder notifications

### Story 2.5: Interview Scheduling System
As a manager,
I want to schedule and track interviews with applicants,
so that I can coordinate hiring decisions with proper documentation and follow-up alongside my other management responsibilities.

#### Acceptance Criteria
1. Implement interview scheduling interface with calendar integration and availability checking
2. Create interview note-taking system with structured feedback forms and rating capabilities
3. Configure automatic email notifications to applicants with interview details and preparation instructions
4. Store interview outcomes with hiring recommendation and detailed feedback for audit purposes
5. Implement interview rescheduling workflow with notification management and conflict detection
6. Create interview history tracking with multiple rounds support and decision rationale capture

### Story 2.6: Approval Workflow & Audit Trail
As a manager,
I want to approve or reject applicants with full accountability,
so that all hiring decisions are documented with clear audit trails for compliance and accountability as part of my comprehensive management role.

#### Acceptance Criteria
1. Implement approval action interface requiring manager authentication and decision rationale
2. Create immutable audit records capturing approver identity, timestamp, decision, and supporting notes
3. Configure automatic profile creation trigger for approved applicants with secure completion link
4. Implement rejection workflow with required reason categorization and respectful applicant notification
5. Create approval history reporting with exportable compliance documentation
6. Implement approval delegation system with manager hierarchy and decision authority tracking

### Story 2.7: TOPS-Compliant Guard Profile Creation
As an approved guard applicant,
I want to complete my official guard profile with all required information,
so that I can become an active, schedulable guard while ensuring company compliance with regulations.

#### Acceptance Criteria
1. Create comprehensive guard profile form with all TOPS-required fields and data validation
2. Implement encrypted storage for sensitive PII (SSN, DOB) with role-based access restrictions
3. Configure document upload system for certifications, licenses, and compliance documentation
4. Create profile verification workflow for managers to review and approve completed profiles
5. Implement certification expiry tracking with automated reminder notifications (30, 14, 7 days)
6. Store profile completion timestamp and verification approver for audit trail and scheduling eligibility

## Epic 3 Shift Management & Calendar Integration

**Epic Goal:** Enable complete shift lifecycle management from creation through assignment, confirmation, and completion with integrated calendar functionality and availability management. This epic delivers the operational scheduling capabilities that transform verified guard profiles into active workforce coordination with conflict detection and external calendar synchronization.

### Story 3.1: Shift Creation & Management
As a manager,
I want to create and manage shifts with detailed requirements and site information,
so that I can define work assignments with all necessary details for proper guard matching and scheduling.

#### Acceptance Criteria
1. Create shift creation form with site details, time ranges, required certifications, and special requirements
2. Implement shift template system for recurring assignments and common post configurations
3. Configure shift editing capabilities with change history tracking and notification to assigned guards
4. Store shift data with client information, priority levels, and estimated hours for payroll integration
5. Create shift cancellation workflow with guard notification and replacement suggestions
6. Implement shift cloning functionality for similar assignments and recurring posts

### Story 3.2: Shift Assignment & Eligibility System
As a manager,
I want to assign shifts only to eligible guards with conflict detection,
so that I can ensure proper staffing while preventing double-booking and certification violations.

#### Acceptance Criteria
1. Implement guard eligibility checking based on required certifications, active status, and profile verification
2. Create shift assignment interface showing eligible guards with availability indicators and proximity data
3. Configure automatic conflict detection that prevents double-booking and flags availability conflicts
4. Implement suggested guard matching based on certification requirements, availability, and historical performance
5. Create batch assignment capabilities for multiple shifts with bulk conflict checking
6. Configure assignment confirmation workflow requiring guard acceptance before final scheduling

### Story 3.3: Guard Availability Management
As a guard,
I want to manage my availability and request time off,
so that I only receive appropriate shift assignments and can maintain work-life balance.

#### Acceptance Criteria
1. Create availability management interface for guards to set recurring weekly schedules and exceptions
2. Implement time-off request system with manager approval workflow and conflict checking
3. Configure recurring availability patterns with override capabilities for specific dates
4. Create emergency unavailability reporting with immediate manager notification and replacement suggestions
5. Implement availability history tracking and pattern analysis for scheduling optimization
6. Configure availability export for personal calendar integration and shift planning

### Story 3.4: Shift Kanban Board
As a manager,
I want to visualize and manage all shifts through a Kanban workflow,
so that I can track shift status, identify staffing gaps, and ensure operational coverage.

#### Acceptance Criteria
1. Create Shift Kanban board with columns: Unassigned → Assigned → Confirmed → In Progress → Completed → Issue Logged
2. Implement visual indicators for shift priority, required certifications, and staffing status
3. Configure filtering by date range, client, site, guard, and certification requirements
4. Create bulk operations for common actions like assignment, confirmation, and status updates
5. Implement urgent shift alerts for unstaffed positions within 24 hours of start time
6. Configure shift archival system for completed shifts with historical reporting access

### Story 3.5: Calendar Integration System
As a manager or guard,
I want calendar integration with external calendar providers,
so that I can sync my work schedule with personal calendars while maintaining appropriate privacy and security whether I'm managing operations or working shifts.

#### Acceptance Criteria
1. Implement OAuth integration with Google Calendar and Outlook with permission-scoped consent flow
2. Create role-based calendar export filtering that only includes events user is authorized to view
3. Configure one-way sync (export only) to prevent external calendar changes from affecting platform data
4. Implement calendar sync status monitoring with error handling and retry mechanisms
5. Create sync preference management allowing users to control which events are exported
6. Configure timezone handling for calendar events with local time display and UTC storage

### Story 3.6: Real-time Schedule Updates
As a guard or manager,
I want to receive immediate notifications of schedule changes,
so that I can respond quickly to shift assignments, cancellations, and urgent coverage needs.

#### Acceptance Criteria
1. Implement real-time notification system using Supabase subscriptions for schedule changes
2. Create in-app notification interface with unread counts and action buttons for quick responses
3. Configure email notifications for critical schedule changes with mobile-optimized templates
4. Implement notification preferences allowing users to control frequency and delivery methods
5. Create notification history and acknowledgment tracking for accountability purposes
6. Configure emergency notification escalation for urgent shift coverage requirements

## Epic 4 Compliance & Audit System

**Epic Goal:** Implement comprehensive audit logging, TOPS compliance reporting, and notification systems that ensure regulatory accountability and provide exportable audit trails for all guard management operations. This epic delivers the compliance infrastructure that transforms operational workflows into auditable, regulation-ready processes.

### Story 4.1: Audit Logging Infrastructure
As a manager,
I want all guard management actions to be logged with immutable audit trails,
so that we can demonstrate regulatory compliance and accountability for all hiring and scheduling decisions I make across my various management functions.

#### Acceptance Criteria
1. Implement immutable audit logging system capturing who/what/when/context for all sensitive operations
2. Create audit log database schema with encrypted storage and tamper-proof timestamps
3. Configure automatic audit entry creation for hiring approvals, scheduling changes, and profile modifications
4. Implement audit log access controls restricting visibility to authorized compliance and management roles
5. Create audit log search and filtering capabilities by date range, user, action type, and guard
6. Configure audit log retention policies with automated archival and secure deletion capabilities

### Story 4.2: TOPS Compliance Reporting
As a manager,
I want to generate TOPS-compliant reports with all required guard information,
so that I can pass regulatory audits and demonstrate full compliance with Texas security industry requirements as part of my operational management duties.

#### Acceptance Criteria
1. Create TOPS compliance report generator with all required fields (guard roster, certifications, background checks)
2. Implement automated report generation triggered by date ranges and compliance deadlines
3. Configure sensitive data masking in reports based on user role permissions (SSN visible only to Manager/Admin)
4. Create exportable report formats (PDF, CSV) with official letterhead and compliance attestations
5. Implement report scheduling system with automatic delivery to compliance stakeholders
6. Configure report audit trail tracking who generated reports and when for accountability

### Story 4.3: Certification Expiry Management
As a manager,
I want automated tracking and alerts for expiring guard certifications,
so that I can ensure continuous compliance and prevent scheduling guards with expired credentials while managing multiple operational priorities.

#### Acceptance Criteria
1. Implement certification expiry monitoring with automated alerts at 30, 14, and 7 days before expiration
2. Create certification renewal workflow with document upload and verification requirements
3. Configure automatic scheduling restriction for guards with expired certifications
4. Implement certification history tracking with renewal dates and issuing authority information
5. Create compliance dashboard showing all guards with upcoming certification expirations
6. Configure escalation notifications to management for guards who fail to renew certifications

### Story 4.4: Comprehensive Notification System
As a guard or manager,
I want to receive timely, relevant notifications about assignments, deadlines, and important updates,
so that I can stay informed and respond appropriately to operational needs and compliance requirements.

#### Acceptance Criteria
1. Implement multi-channel notification system with in-app notifications and email delivery
2. Create notification preference management allowing users to control frequency and delivery methods
3. Configure notification templates for all major workflow events (assignments, approvals, reminders, alerts)
4. Implement notification acknowledgment tracking and follow-up escalation for critical alerts
5. Create notification digest functionality for non-urgent updates with configurable delivery schedules
6. Configure notification opt-out compliance with clear action links and preference management

### Story 4.5: Data Export & Reporting Dashboard
As an administrator,
I want comprehensive reporting and data export capabilities,
so that I can analyze operations, support business decisions, and meet regulatory reporting requirements.

#### Acceptance Criteria
1. Create reporting dashboard with key operational metrics (hiring conversion, scheduling efficiency, compliance status)
2. Implement flexible data export system supporting multiple formats and date range filtering
3. Configure automated report scheduling with email delivery to stakeholders
4. Create custom report builder allowing managers to define specific data sets and filters
5. Implement data visualization for key metrics with charts and trend analysis
6. Configure report access controls ensuring sensitive data export requires appropriate permissions

## Epic 5 Lead Generation & Contract Management

**Epic Goal:** Complete the business development capabilities by implementing client lead pipeline and contract lifecycle management alongside enhanced guard recruiting features. This epic delivers the sales and business development tools that enable sustainable growth and client relationship management while optimizing the guard recruiting funnel for the generalist manager role structure.

### Story 5.1: Client Lead Management System
As a manager,
I want to capture and manage client leads with opportunity tracking,
so that I can systematically pursue new business and convert prospects into active contracts as part of my general management responsibilities.

#### Acceptance Criteria
1. Create client lead capture form with company details, contract value estimates, and service requirements
2. Implement lead source tracking and assignment system with round-robin or rule-based distribution
3. Configure automated follow-up reminders with escalation to sales management for uncontacted leads
4. Create lead qualification workflow with notes, contact history, and probability scoring
5. Implement lead conversion tracking from initial contact through signed contract
6. Configure lead export capabilities for CRM integration and sales reporting

### Story 5.2: Contract Lifecycle Kanban
As a manager,
I want to manage client contracts through a visual pipeline,
so that I can track deal progress, identify bottlenecks, and ensure proper contract execution and renewals alongside my other operational duties.

#### Acceptance Criteria
1. Create Contract Kanban board with columns: Prospect → Proposal → Negotiation → Signed → Active → Renew/Closed
2. Implement contract card details including client information, sites covered, contract values, and key dates
3. Configure proposal generation workflow with template library and customization capabilities
4. Create contract document management with version control and approval workflow
5. Implement contract renewal alerts and opportunity identification for expansion services
6. Configure revenue tracking and forecasting based on contract pipeline and active agreements

### Story 5.3: Enhanced Guard Recruiting Pipeline
As a manager,
I want advanced guard lead management with source tracking and conversion optimization,
so that I can improve recruiting efficiency and identify the most effective candidate sources while managing my other responsibilities.

#### Acceptance Criteria
1. Enhance guard lead capture with detailed source tracking (Direct, Website, Social Media, Referral, Other)
2. Create recruiting campaign management with landing page generation and tracking capabilities
3. Implement lead scoring based on application completion probability and qualification indicators
4. Configure A/B testing for lead capture forms and follow-up email sequences
5. Create recruiting funnel analytics with conversion rates by source and optimization recommendations
6. Implement referral bonus tracking for existing guards who successfully recruit new candidates

### Story 5.4: Unified Lead Dashboard
As a manager,
I want a unified view of both client and guard leads with filtering and analytics,
so that I can manage all business development activities efficiently and identify trends across both pipelines from a single management interface.

#### Acceptance Criteria
1. Create unified lead dashboard showing both client and guard leads with clear visual differentiation
2. Implement advanced filtering by lead type, source, status, assigned user, and date ranges
3. Configure lead analytics with conversion metrics, source performance, and pipeline velocity
4. Create lead assignment interface with workload balancing and territory management
5. Implement lead export capabilities with privacy controls and role-based data access
6. Configure automated reporting for lead generation performance and conversion tracking

### Story 5.5: Internal Project Management
As a manager,
I want to track internal company projects and initiatives,
so that I can coordinate operational improvements, training programs, and business development activities across all areas I'm responsible for managing.

#### Acceptance Criteria
1. Create Internal Projects Kanban board with columns: Backlog → In Progress → Review → Done
2. Implement project card management with owner assignment, due dates, and linked documentation
3. Configure project categorization and priority management with resource allocation tracking
4. Create project collaboration features with comments, file attachments, and status updates
5. Implement project reporting with completion rates, resource utilization, and impact tracking
6. Configure project template system for recurring initiatives and standardized project types

## Checklist Results Report

### Executive Summary
- **Overall PRD Completeness**: 92%
- **MVP Scope Appropriateness**: Just Right  
- **Readiness for Architecture Phase**: Ready
- **Most Critical Gap**: Need to validate TOPS compliance requirements with legal counsel

### Category Analysis Table

| Category                         | Status  | Critical Issues                                      |
| -------------------------------- | ------- | --------------------------------------------------- |
| 1. Problem Definition & Context  | PASS    | Strong problem articulation with quantified impact |
| 2. MVP Scope Definition          | PASS    | Well-bounded scope with clear exclusions           |
| 3. User Experience Requirements  | PASS    | Role-corrected UX vision with clear paradigms      |
| 4. Functional Requirements       | PASS    | Comprehensive, testable requirements                |
| 5. Non-Functional Requirements   | PASS    | Security, performance, compliance well-defined      |
| 6. Epic & Story Structure        | PASS    | Sequential epics with value delivery               |
| 7. Technical Guidance            | PASS    | Clear technical assumptions building on existing stack |
| 8. Cross-Functional Requirements | PARTIAL | TOPS compliance details need legal validation       |
| 9. Clarity & Communication       | PASS    | Clear language, consistent terminology              |

### Top Issues by Priority

**HIGH Priority:**
- **TOPS Compliance Validation**: Legal review required to confirm regulatory requirements are accurately captured
- **Background Check API Research**: Need to identify current vendor capabilities and integration complexity

**MEDIUM Priority:**
- **Calendar Sync Security**: Need detailed OAuth scope definition and permission filtering architecture
- **Supabase Scaling Validation**: Confirm real-time capabilities can handle 200+ concurrent users

**LOW Priority:**
- **Load Testing Plan**: Define performance benchmarks and testing approach
- **Mobile PWA Strategy**: Clarify offline capabilities and installation approach

### MVP Scope Assessment
**Appropriate Scope**: The 5-epic structure delivers complete operational capability while remaining achievable. Each epic provides substantial value and can be deployed incrementally.

**Potential Scope Reductions** (if timeline pressure):
- Epic 5 (Lead Generation) could be deferred since Epic 2-4 deliver core guard management
- Calendar sync could be simplified to export-only initially
- Advanced reporting could be reduced to basic TOPS compliance exports

### Technical Readiness
**Architecture Foundation**: Strong technical assumptions leveraging existing Summit Advisory infrastructure. Clear technology choices with rationale.

**Areas for Architect Investigation**:
- Real-time notification architecture and scaling
- File upload security and virus scanning implementation  
- Calendar OAuth integration complexity and security model
- Audit logging performance with large datasets

### Recommendations

**Critical Actions:**
1. **Legal Validation**: Schedule TOPS compliance review with qualified counsel before architecture phase
2. **Vendor Research**: Identify background check vendor APIs and integration patterns
3. **Infrastructure Assessment**: Validate Supabase scaling for real-time features with 200+ users

**Next Steps:**
1. **Architect Handoff**: Provide PRD to Architect with specific focus areas
2. **UX Expert Consultation**: Begin interface design based on corrected role structure

**FINAL DECISION: READY FOR ARCHITECT** - The PRD is comprehensive, properly structured, and ready for architectural design with noted areas for validation.

## Next Steps

### UX Expert Prompt
"Please review the Summit Advisory Guard Management Platform PRD and design the user experience architecture. Focus on creating **unified manager interfaces that support function-switching** (hiring/scheduling/sales/compliance) rather than specialized role-based applications. Design mobile-first guard portals and desktop-optimized manager dashboards. Prioritize **Kanban-driven workflow management** with calendar integration and ensure **WCAG AA accessibility compliance**. Reference existing Summit Advisory branding and create wireframes for the core screens identified in the PRD."

### Architect Prompt  
"Please create the technical architecture for the Summit Advisory Guard Management Platform using this PRD. Focus on **extending the existing Next.js 15/Supabase infrastructure** with authentication and role-based security for **Vercel deployment**. Design **comprehensive audit logging architecture** for TOPS compliance, **real-time notification system** architecture, and **secure file upload/storage** system. Integrate **MCP development workflows** (Supabase MCP, Vercel MCP, Reference MCP) for streamlined development processes. Provide detailed **RLS policy templates**, **calendar OAuth integration design**, and **performance optimization strategy** for 200+ concurrent users. Deliver architecture optimized for Vercel's serverless environment and Next.js capabilities."