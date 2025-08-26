# Tech Stack Alignment

## Existing Technology Stack

| Category | Current Technology | Version | Usage in Enhancement | Notes |
|----------|------------------|---------|---------------------|--------|
| **Frontend Framework** | Next.js | 15.3.5 | Full compatibility - hybrid routing | ✅ React 19 compatible |
| **UI Framework** | React | 19 | All guard management components | ✅ Latest stable |
| **Language** | TypeScript | 5 | Comprehensive type safety | ✅ Enhanced with guard data models |
| **Styling** | Tailwind CSS | 3.4.17 | Consistent design system | ✅ v4 migration path available |
| **Component Library** | shadcn/ui + Radix UI | Latest | Reuse across all interfaces | ✅ pnpm compatible, no peer dep issues |
| **Database Client** | @supabase/supabase-js | 2.50.5 | Enhanced with authentication | ✅ RLS performance optimized |
| **Forms** | React Hook Form + Zod | 7.54.1 + 3.24.1 | All guard management forms | ✅ Proven pattern |
| **Date Handling** | date-fns | 3.6.0 | Scheduling and calendar integration | ✅ Lightweight alternative to moment |
| **Deployment** | Vercel | N/A | Hybrid static/dynamic deployment | ✅ Optimized for Next.js 15 |

## New Technology Additions

| Technology | Version | Purpose | Rationale | Integration Method |
|-----------|---------|---------|-----------|-------------------|
| **OpenAI API** | Latest | Resume parsing and AI assistance | Industry-standard AI integration for automated data extraction | Supabase Edge Functions |
| **Calendar APIs** | OAuth 2.0 | Google Calendar & Outlook integration | Business requirement for shift management | Next.js API routes |
| **JWT Decode** | 4.0.0 | Custom claims extraction | Required for RBAC implementation | Client-side token parsing |
