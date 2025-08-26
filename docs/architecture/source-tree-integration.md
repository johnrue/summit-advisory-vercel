# Source Tree Integration

## New File Organization
Following Next.js route groups and private folder patterns:

```plaintext
summit-advisory-vercel/
├── app/                           # Enhanced App Router structure
│   ├── (marketing)/              # Route group - public marketing pages
│   │   ├── layout.tsx            # Marketing-specific layout
│   │   ├── page.tsx              # Homepage (moved from root)
│   │   ├── services/             # Service pages (existing)
│   │   └── qr/                   # QR system (existing)
│   ├── (auth)/                   # Route group - authentication
│   │   ├── login/
│   │   │   └── page.tsx          # Login page
│   │   ├── register/
│   │   │   └── page.tsx          # Guard registration
│   │   └── layout.tsx            # Auth layout
│   ├── dashboard/                # Guard management routes
│   │   ├── (admin)/              # Route group - admin features
│   │   │   ├── guards/           # Guard management
│   │   │   ├── hiring/           # Hiring pipeline
│   │   │   └── compliance/       # Compliance reporting
│   │   ├── (manager)/            # Route group - manager features  
│   │   │   ├── shifts/           # Shift management
│   │   │   └── scheduling/       # Advanced scheduling
│   │   ├── (guard)/              # Route group - guard features
│   │   │   ├── profile/          # Guard self-service
│   │   │   ├── schedule/         # View schedule
│   │   │   └── availability/     # Set availability
│   │   └── layout.tsx            # Dashboard layout
│   ├── api/                      # API routes
│   │   └── v1/                   # Versioned API
│   │       ├── guards/           # Guard management API
│   │       ├── applications/     # Hiring pipeline API
│   │       ├── shifts/           # Shift management API
│   │       └── calendar/         # Calendar integration API
│   └── _components/              # Private folder - internal components
├── components/                   # Enhanced component library
│   ├── ui/                       # shadcn/ui components (preserved)
│   ├── dashboard/                # Dashboard-specific components
│   ├── charts/                   # Analytics components
│   └── calendar/                 # Calendar components
├── lib/                          # Enhanced service layer
│   ├── auth/                     # Authentication services
│   ├── services/                 # Business logic services
│   ├── api/                      # API utilities
│   ├── utils/                    # Utility functions
│   └── types/                    # TypeScript definitions
├── hooks/                        # Enhanced custom hooks
│   ├── auth/                     # Authentication hooks
│   ├── data/                     # Data management hooks
│   └── ui/                       # UI-specific hooks
└── supabase/                     # Supabase Edge Functions
    └── functions/
        ├── ai-resume-parser/     # OpenAI integration
        ├── calendar-sync/        # Calendar synchronization
        └── notification-handler/ # Real-time notifications
```

## Integration Guidelines

**File Naming Consistency:**
- **Components:** PascalCase.tsx (GuardProfileForm.tsx)
- **Services:** kebab-case.ts (guard-service.ts)
- **Hooks:** use-kebab-case.ts (use-auth.ts)
- **Types:** kebab-case.ts (api-types.ts)

**Import/Export Patterns:**
- **Barrel Exports:** Each major directory includes index.ts for clean imports
- **Path Aliases:** All imports use @/ prefix for consistency with existing pattern
- **Type-Only Imports:** Use `import type` for TypeScript definitions
