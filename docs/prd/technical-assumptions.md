# Technical Assumptions

## Repository Structure: Monorepo
Extend the existing Summit Advisory website repository with new guard management modules. This leverages the current Next.js 15, Supabase integration, and Vercel deployment infrastructure while maintaining unified version control and deployment pipeline.

## Service Architecture
**JAMstack + Supabase Backend**: Continue with current architecture of static Next.js frontend deployed on Vercel with Supabase providing backend services (database, auth, real-time subscriptions, file storage). Add authentication layer for guard management modules while maintaining static export capability for marketing pages.

## Testing Requirements
**Unit + Integration Testing**: Implement comprehensive testing pyramid with unit tests for business logic, integration tests for Supabase operations, and end-to-end tests for critical workflows (hiring approval, shift assignment, compliance exports). Manual testing convenience methods required for compliance validation scenarios.

## Development Enhancement Tools (MCP Integration)
**MCP-Powered Development Workflow**: Integrate Model Context Protocol (MCP) tools to streamline development and deployment processes:

- **Supabase MCP**: Direct database schema management, query execution, migration creation, and real-time monitoring from development environment
- **Vercel MCP**: Seamless deployment management, environment variable configuration, build monitoring, and performance analytics integration
- **Reference MCP**: Contextual code documentation, dependency tracking, and architectural decision recording for maintainable development

These MCP integrations enable rapid iteration cycles, reduce context switching between tools, and provide intelligent assistance for database operations, deployment workflows, and codebase navigation.

## Additional Technical Assumptions and Requests

- **Frontend Framework**: Next.js 15 with React 19, TypeScript, Tailwind CSS, shadcn/ui components (building on existing codebase)
- **Database**: PostgreSQL via Supabase with Row-Level Security policies, encrypted storage for PII, and real-time subscriptions for live updates
- **Authentication**: Supabase Auth with role-based permissions and secure session management. MFA enforcement for managers/admins to be added in future enhancement phase.
- **File Storage**: Supabase Storage for document uploads (resumes, certifications) with access control and virus scanning
- **Email Service**: Supabase Edge Functions with email provider integration for transactional notifications and reminders
- **Calendar Integration**: OAuth integration with Google Calendar and Outlook APIs for bi-directional sync with permission filtering
- **Background Jobs**: Supabase Edge Functions for automated reminders, certification expiry checks, and compliance report generation
- **AI Integration**: OpenAI API for resume parsing and data extraction, implemented via Supabase Edge Functions with secure API key management
- **Document Processing**: PDF/DOCX text extraction for resume parsing, implemented using appropriate libraries in Edge Functions
- **Deployment**: Vercel for frontend hosting, Supabase Cloud for backend services, environment variable management for secrets
- **Monitoring**: Supabase built-in monitoring plus Vercel Analytics, custom alerts for critical workflow failures and performance thresholds
- **Compliance**: Audit logging via Supabase with immutable records, encrypted PII fields, and configurable data retention policies
