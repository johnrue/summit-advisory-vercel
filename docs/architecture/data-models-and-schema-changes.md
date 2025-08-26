# Data Models and Schema Changes

## New Data Models

### User Roles & Permissions (RBAC)
**Purpose:** Enterprise-grade role-based access control following Supabase RBAC patterns  
**Integration:** Links to existing `auth.users` table, no impact on marketing functionality

**Key Attributes:**
- `id`: UUID - Primary key with B-tree index  
- `user_id`: UUID - Foreign key to auth.users (indexed per advisor recommendations)
- `role`: ENUM('admin', 'manager', 'guard', 'client') - Role designation
- `permissions`: JSONB - Dynamic permission assignments for future flexibility
- `created_at/updated_at`: TIMESTAMPTZ - Audit trail timestamps

**Relationships:**
- **With Existing:** One-to-many relationship with auth.users (no changes to existing tables)
- **With New:** One-to-many relationships with guards, shifts, audit logs

### Guards Management  
**Purpose:** Complete guard profile and certification management with TOPS compliance
**Integration:** Self-contained table with optional auth.users relationship

**Key Attributes:**
- `id`: UUID - Primary key for performance (B-tree indexed)
- `user_id`: UUID - Optional foreign key to auth.users (for guards who access system)
- `employee_number`: VARCHAR(50) - Unique identifier (unique constraint + index)
- `license_number`: VARCHAR(50) - TOPS license number (unique constraint + index)
- `license_expiry`: DATE - Compliance tracking (indexed for expiry queries)
- `certifications`: JSONB - Flexible certification storage
- `contact_info`: JSONB - Encrypted PII storage (name, email, phone, address)
- `status`: ENUM('active', 'inactive', 'suspended', 'terminated') - Employment status

**Relationships:**
- **With Existing:** Optional link to auth.users for system access
- **With New:** One-to-many with shifts, applications, compliance records

### Hiring Pipeline (Kanban)
**Purpose:** Complete hiring workflow from lead capture to employment  
**Integration:** Extends existing consultation_requests pattern with structured pipeline

**Key Attributes:**
- `id`: UUID - Primary key with performance optimization
- `application_data`: JSONB - Flexible form data storage (parsed by AI)
- `pipeline_stage`: ENUM('lead', 'applied', 'screening', 'interview', 'background', 'approved', 'hired', 'rejected')
- `assigned_to`: UUID - Foreign key to user handling application (indexed)
- `priority`: INTEGER - Pipeline ordering and prioritization
- `ai_parsed_data`: JSONB - OpenAI extracted resume information
- `documents`: JSONB - Document references (stored in Supabase Storage)

**Relationships:**
- **With Existing:** Similar pattern to consultation_requests for consistency
- **With New:** Many-to-one with guards table upon hiring completion

### Shift Management & Scheduling
**Purpose:** Complete shift lifecycle with calendar integration and conflict detection
**Integration:** Designed for real-time updates and calendar sync

**Key Attributes:**
- `id`: UUID - Primary key optimized for joins
- `location_data`: JSONB - Flexible location information storage
- `time_range`: TSTZRANGE - PostgreSQL range type for efficient time queries
- `assigned_guard_id`: UUID - Foreign key to guards (indexed for performance)
- `requirements`: JSONB - Shift-specific requirements and certifications needed  
- `status`: ENUM('draft', 'open', 'assigned', 'in_progress', 'completed', 'cancelled')
- `calendar_sync`: JSONB - External calendar integration metadata

**Relationships:**
- **With Existing:** Independent of marketing functionality
- **With New:** Many-to-one with guards, one-to-many with shift_logs

## Schema Integration Strategy

**Database Changes Required:**
- **New Tables:** 12 core tables (user_roles, guards, applications, shifts, compliance_records, audit_logs, etc.)
- **Modified Tables:** None - completely additive approach preserving existing functionality
- **New Indexes:** 25+ strategic indexes following performance advisor recommendations
- **Migration Strategy:** Incremental deployment with zero downtime using Supabase migrations

**Backward Compatibility:**
- All existing queries continue to work unchanged (consultation_requests table untouched)
- Marketing functionality completely isolated from guard management schema
- Existing Supabase client configuration remains functional for public features
- No breaking changes to current API endpoints or database structure
