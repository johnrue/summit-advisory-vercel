# API Design and Integration

## API Integration Strategy

**API Integration Strategy:** Layered Serverless Architecture with Security-First Design  
**Authentication:** Supabase JWT tokens with custom claims for RBAC  
**Versioning:** Semantic API versioning with backward compatibility (`/api/v1/`)

## New API Endpoints

### Guard Management APIs
**Purpose:** Complete CRUD operations for guard profiles and lifecycle management  
**Integration:** Builds on existing consultation-service.ts patterns with enhanced security

**Core Endpoints:**
- `POST /api/v1/guards` - Create new guard profile with AI resume parsing
- `GET /api/v1/guards` - List guards with role-based filtering and pagination  
- `PUT /api/v1/guards/:id` - Update guard information with audit logging
- `DELETE /api/v1/guards/:id` - Deactivate guard (soft delete for compliance)

**Request/Response Example:**
```json
// POST /api/v1/guards
{
  "personal_info": {
    "first_name": "John",
    "last_name": "Doe", 
    "email": "john@example.com"
  },
  "resume_file": "base64_encoded_document",
  "certifications": []
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "profile_data": {...},
    "ai_parsed_skills": [...],
    "compliance_status": "pending"
  }
}
```

### Hiring Pipeline APIs  
**Purpose:** Kanban workflow management with real-time collaboration
**Integration:** Supabase real-time subscriptions for live board updates

**Core Endpoints:**
- `POST /api/v1/applications` - Submit new application with document upload
- `PUT /api/v1/applications/:id/stage` - Move application through pipeline stages
- `GET /api/v1/applications/board` - Get Kanban board data with real-time subscription
- `POST /api/v1/applications/:id/ai-parse` - Trigger AI resume parsing

### Calendar Integration APIs
**Purpose:** Bi-directional calendar sync with conflict detection
**Integration:** OAuth 2.0 integration with Google Calendar and Microsoft Graph APIs

**Core Endpoints:**
- `POST /api/v1/calendar/connect` - OAuth connection to external calendar
- `GET /api/v1/calendar/availability/:guard_id` - Get guard availability from calendar
- `POST /api/v1/shifts/:id/sync` - Sync shift to external calendar
- `GET /api/v1/calendar/conflicts` - Detect and resolve scheduling conflicts

## External API Integration

### OpenAI API Integration
**Purpose:** AI-powered resume parsing and data extraction  
**Implementation:** Supabase Edge Function for secure API key management

**Edge Function Example:**
```typescript
// supabase/functions/ai-resume-parser/index.ts
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

Deno.serve(async (req) => {
  const { document_text, application_id } = await req.json()
  
  const openai = new OpenAI({
    apiKey: Deno.env.get('OPENAI_API_KEY')
  })
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{
      role: "system",
      content: "Extract structured data from this resume for guard hiring..."
    }, {
      role: "user", 
      content: document_text
    }]
  })
  
  // Store parsed data with audit trail
  const parsed_data = JSON.parse(completion.choices[0].message.content)
  
  return new Response(JSON.stringify({
    success: true,
    parsed_data,
    confidence_score: 0.95
  }))
})
```

### Google Calendar API Integration
**Purpose:** Bi-directional shift synchronization with conflict detection
**Implementation:** OAuth 2.0 server-side flow with refresh token management

### Microsoft Graph API Integration
**Purpose:** Outlook calendar integration for comprehensive calendar support
**Implementation:** MSAL authentication with Microsoft Graph SDK
