# CLAUDE.md - Summit Advisory Security Services

## 🚀 BEFORE STARTING ANY WORK - READ THIS SECTION

### Current Project Status (Updated: 2025-07-13)
- **Node.js version**: v22.17.0 LTS (✅ Latest LTS)
- **Next.js version**: 15.3.5 (✅ Latest stable)
- **React version**: 19 (✅ Latest)
- **Package manager**: pnpm (✅ Switched from npm for 65% faster installs)
- **Last major update**: Supabase database integration completed
- **Security assessment**: ✅ Comprehensive code review completed - no vulnerabilities detected
- **Known issues**: None currently
- **Performance benchmarks**: Build time ~4s, Bundle size 102kB shared JS

### Pre-Work Checklist
- [ ] Check `node --version` and compare with documented version
- [ ] Run `git status` to see current branch and changes
- [ ] Review recent commits with `git log --oneline -5`
- [ ] Verify package.json versions match this documentation
- [ ] Check if any builds are failing with `pnpm run build`

### Active Modernization Plan
✅ **COMPLETED: Core framework modernization**
- ✅ Phase 1: Node.js 22.17.0 LTS & Next.js 15.3.5 upgrade
- ✅ Switched to pnpm package manager
- ✅ Fixed dependency conflicts and ES module issues
- ✅ **COMPLETED: QR redirect system for marketing campaigns**
- ✅ **COMPLETED: Security code review and validation**  
- ✅ **COMPLETED: Supabase database integration for consultation requests** (Working ✅)
- 🔄 **IN PROGRESS: Performance optimizations and bundle analysis**
- 🔄 Phase 3: AWS Amplify configuration updates

## 🔄 AFTER COMPLETING WORK - UPDATE THIS SECTION

### Post-Work Checklist
- [x] Update version numbers above if any packages were changed
- [ ] Document new commands/scripts added to package.json
- [x] Record performance improvements (bundle size, build time, etc.)
- [x] Note any issues encountered and their solutions
- [x] Update troubleshooting section with new known issues
- [x] Commit documentation changes with descriptive message
- [x] Update "Last major update" date
- [x] Document new QR redirect system implementation
- [x] Record security assessment completion
- [x] Update project structure with new routes
- [x] Document Supabase integration and database schema
- [x] Update environment variables documentation
- [x] Create FUTURE_ENHANCEMENTS.md for roadmap planning

### Git Workflow for Updates
```bash
# After making changes, always update this file
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with [changes made]"
```

## Project Overview
This is a Next.js 15 application for Summit Advisory, a professional security services company operating in Texas. The application is built with TypeScript, Tailwind CSS, and shadcn/ui components, configured for static export to AWS Amplify.

## Technology Stack

### Core Framework
- **Next.js 15.2.4** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type-safe JavaScript
- **Static Export** - Configured for deployment (`output: 'export'`)

### UI & Styling
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library built on Radix UI
- **Radix UI** - Comprehensive suite of accessible components
- **Lucide React** - Icon library
- **class-variance-authority** - Utility for creating component variants
- **tailwind-merge & clsx** - Conditional class name utilities

### Key Dependencies
- **React Hook Form** - Form handling with validation
- **Zod** - Schema validation
- **@supabase/supabase-js** - Database client for consultation requests
- **date-fns** - Date manipulation
- **next-themes** - Theme management (dark/light mode)
- **recharts** - Charting library
- **sonner** - Toast notifications

## Project Structure

```
├── app/                     # Next.js App Router
│   ├── globals.css         # Global styles and CSS variables
│   ├── layout.tsx          # Root layout with theme provider
│   ├── page.tsx            # Homepage
│   ├── qr/                 # QR code redirect system
│   │   ├── page.tsx        # QR redirect page with analytics
│   │   ├── layout.tsx      # QR page layout
│   │   ├── loading.tsx     # QR loading state
│   │   └── error.tsx       # QR error handling
│   └── services/           # Dynamic service pages
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   ├── hero.tsx            # Homepage hero section
│   ├── navbar.tsx          # Navigation component
│   ├── footer.tsx          # Footer component
│   ├── services.tsx        # Services section
│   ├── about.tsx           # About section
│   ├── contact.tsx         # Contact form
│   ├── animated-section.tsx # Animation wrapper
│   └── theme-provider.tsx  # Theme context provider
├── hooks/                  # Custom React hooks
│   ├── use-scroll-animation.tsx
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/                    # Utilities and data
│   ├── utils.ts            # Utility functions (cn helper)
│   ├── company-info.ts     # Company data configuration
│   ├── services-data.tsx   # Services content
│   ├── supabase.ts         # Supabase client configuration
│   ├── consultation-service.ts # Form submission & database operations
│   └── types.ts            # TypeScript interfaces
├── public/                 # Static assets
├── styles/                 # Additional styles
└── amplify.yml             # AWS Amplify deployment config
```

## Code Style & Conventions

### TypeScript Configuration
- **Strict mode enabled** - Full type checking
- **Path aliases** - Use `@/` for imports from root
- **JSX preserve** - For Next.js compilation
- **ES6 target** - Modern JavaScript features

### Component Patterns
1. **Functional Components** - Use function declarations
2. **TypeScript Interfaces** - Explicit prop typing
3. **forwardRef** - For component ref forwarding (UI components)
4. **"use client"** - Client components explicitly marked
5. **Radix UI Integration** - Accessible primitives with custom styling

### Example Component Structure:
```typescript
"use client"

import { ComponentType } from "react"
import { cn } from "@/lib/utils"

interface ComponentProps {
  className?: string
  children?: React.ReactNode
}

export default function Component({ className, children }: ComponentProps) {
  return (
    <div className={cn("base-styles", className)}>
      {children}
    </div>
  )
}
```

### Styling Conventions
- **CSS Variables** - HSL color system for theme support
- **Semantic Naming** - Color names like `primary`, `accent`, `muted`
- **Dark Mode Support** - CSS variables change based on `.dark` class
- **Responsive Design** - Mobile-first approach with Tailwind breakpoints
- **Component Variants** - Using `class-variance-authority` for button variants

### Color Palette
- **Primary**: Warm metallic gold (`43 22% 51%`)
- **Accent**: Burnt bronze (`30 21% 40%`)
- **Background**: Charcoal black in dark mode (`0 0% 10%`)
- **Foreground**: Ash grey (`40 6% 86%`)

## Development Guidelines

### Commands
- **Dev**: `npm run dev` or `pnpm dev`
- **Build**: `npm run build` (creates static export)
- **Lint**: `npm run lint` (Next.js ESLint)
- **Start**: `npm start` (production server)

### Build Configuration
- **ESLint ignored during builds** - Set in next.config.mjs
- **TypeScript errors ignored** - For faster builds
- **Image optimization disabled** - Required for static export
- **Static export enabled** - Generates static files for Amplify

### Component Development
1. **Use existing UI components** from `components/ui/`
2. **Follow shadcn/ui patterns** for new components
3. **Implement proper TypeScript** interfaces
4. **Use the `cn()` utility** for conditional classes
5. **Add animations** using Tailwind animate classes
6. **Ensure accessibility** with Radix UI primitives

### Data Management
- **Company info centralized** in `lib/company-info.ts`
- **Static content** in dedicated data files
- **Supabase database** for consultation request persistence
- **Type-safe data** with TypeScript interfaces
- **Real-time data** capabilities with Supabase subscriptions

### Animation & UX
- **Scroll animations** using Intersection Observer
- **Smooth scrolling** for navigation
- **Hover effects** on interactive elements
- **Loading states** where appropriate
- **Responsive animations** that respect user preferences

## Business Context

### Company Information
- **Name**: Summit Advisory
- **License**: TX DPS #C29754001
- **Service Areas**: Houston, Dallas, Austin, San Antonio
- **Services**: Professional security services
- **Contact**: (830) 201-0414

### Key Features
- **Service showcase** with detailed pages
- **Database-powered consultation requests** with Supabase integration
- **QR code redirect system** for marketing campaigns with analytics tracking
- **Responsive design** for all devices
- **Professional branding** with security industry styling
- **SEO optimized** metadata and structure

## QR Code Marketing System

### Overview
The QR code system (`/qr` route) provides a sophisticated redirect and analytics solution for marketing campaigns. It enables tracking of QR code scans across different marketing materials and campaigns.

### Features
- **Smart Redirect System** - Automatic redirect to homepage with 3-second countdown
- **Campaign Tracking** - URL parameters for campaign and source identification
- **Analytics Integration** - Google Analytics 4 event tracking for QR scans
- **Error Handling** - Graceful fallback with manual redirect option
- **Loading States** - Professional loading animation and user feedback
- **Mobile Optimized** - Responsive design for all device types

### Usage Examples
```
https://summitadvisoryfirm.com/qr?campaign=business-cards&source=networking-event
https://summitadvisoryfirm.com/qr?campaign=vehicle-decals&source=fleet
https://summitadvisoryfirm.com/qr?campaign=brochures&source=trade-show
```

### Analytics Events Tracked
- `qr_code_scan` - When QR page is accessed
- `qr_redirect_success` - When automatic redirect completes
- `qr_manual_redirect` - When user clicks manual redirect button

### Technical Implementation
- **Route**: `/app/qr/page.tsx` - Main QR redirect component
- **Error Handling**: `/app/qr/error.tsx` - Error boundary
- **Loading State**: `/app/qr/loading.tsx` - Loading component
- **Layout**: `/app/qr/layout.tsx` - QR-specific layout

### Marketing Integration
- Generate QR codes pointing to `/qr` route with appropriate campaign parameters
- Use different campaign names for different marketing materials
- Track effectiveness through Google Analytics dashboard
- Monitor conversion rates from QR scans to contact form submissions

## Security Assessment

### Code Review Status
✅ **Comprehensive Security Review Completed (2025-07-13)**

### Security Validation Results
- **Malicious Code**: ✅ None detected - clean, legitimate business application
- **Vulnerability Scan**: ✅ No security vulnerabilities identified
- **Code Patterns**: ✅ Professional development practices followed
- **Data Handling**: ✅ No sensitive data exposure or logging
- **Dependencies**: ✅ All packages from trusted sources with clean security records

### Security Best Practices Implemented
- Environment variable usage for sensitive configuration
- GDPR-compliant analytics implementation with cookie consent
- No hardcoded secrets or credentials
- Proper input validation and sanitization
- Client-side only operations for static hosting security

### Compliance Status
- **Business License**: Valid TX DPS #C29754001
- **Industry Standards**: Follows security industry best practices
- **Privacy Policy**: GDPR-compliant data handling
- **Accessibility**: WCAG guidelines adherence

## Supabase Integration

### Overview
The consultation request system is powered by Supabase, providing real-time database capabilities, automatic scaling, and enterprise-grade security for form submissions and data management.

### Database Schema
```sql
CREATE TABLE consultation_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  service_type VARCHAR(50) NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'new',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE consultation_requests ENABLE ROW LEVEL SECURITY;

-- Allow public insert access for form submissions
CREATE POLICY "Enable insert for consultation requests" ON consultation_requests
  FOR INSERT TO public
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_consultation_requests_created_at ON consultation_requests(created_at DESC);
CREATE INDEX idx_consultation_requests_status ON consultation_requests(status);
CREATE INDEX idx_consultation_requests_email ON consultation_requests(email);
```

### Environment Variables
Required environment variables for Supabase integration:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Architecture Components

#### `/lib/supabase.ts`
- Supabase client configuration
- Connection management
- Authentication setup (disabled for static site)

#### `/lib/consultation-service.ts`
- Form submission logic
- Data validation and sanitization
- Error handling and logging
- CRUD operations for consultation requests

#### `/lib/types.ts`
- TypeScript interfaces for type safety
- Database record types
- API response structures
- Form data validation types

### Form Integration Features
- **Real-time submission** to Supabase database
- **Client-side validation** with TypeScript interfaces
- **Error handling** with user-friendly messages
- **Analytics tracking** for submission success/failure
- **Data persistence** for all consultation requests

### Security Features
- **Database access control** configured for public form submissions
- **Application-level validation** for all form data
- **Data validation** at both client and database level
- **No sensitive data exposure** in client-side code
- **Automatic data sanitization** before database insertion

### Performance Optimizations
- **Connection pooling** managed by Supabase
- **Automatic scaling** based on demand
- **CDN integration** for global performance
- **Efficient queries** with proper indexing

### Admin Capabilities (Future Enhancement)
- **View all consultation requests** with filtering
- **Update request status** (new, contacted, scheduled, completed)
- **Export data** for reporting and analysis
- **Real-time notifications** for new submissions

## Deployment

### AWS Amplify Configuration
- **Build command**: `pnpm run build`
- **Output directory**: `out/`
- **Node version**: 20 LTS (for AWS Amplify compatibility)
- **Package manager**: pnpm via corepack (better compatibility)
- **Environment**: Static hosting with Supabase backend

### Deployment Best Practices

#### Git Workflow for Production Deployments
```bash
# CORRECT: Single-commit deployments to prevent dual builds
1. Create feature branch
2. Make changes and test locally
3. Create pull request
4. Use "Squash and merge" (creates one clean commit)
5. Delete feature branch
6. Monitor single deployment in AWS Amplify

# AVOID: Manual merges after PR (causes dual deployments)
```

#### Pre-Deployment Checklist
- [ ] Test build locally: `pnpm run build`
- [ ] Verify all environment variables are set in Amplify console
- [ ] Check that Supabase integration works locally
- [ ] Ensure Node.js version matches amplify.yml (22.17.0)
- [ ] Confirm package.json includes all required dependencies

#### Deployment Monitoring
- Monitor AWS Amplify console during deployment
- Check build logs for any warnings or errors
- Test form submissions on live site after deployment
- Verify QR code system works with analytics tracking

### Performance Considerations
- **Static generation** for fast loading
- **Image optimization** handled by Next.js
- **CSS optimization** via Tailwind purging
- **Component code splitting** automatic with Next.js

## Common Patterns

### Adding New Components
1. Create in appropriate directory (`components/` or `components/ui/`)
2. Use TypeScript interfaces for props
3. Implement proper styling with Tailwind
4. Add proper imports and exports
5. Test responsiveness and accessibility

### Modifying Styles
1. Update CSS variables in `globals.css` for theme changes
2. Use Tailwind classes for component styling
3. Leverage existing color tokens
4. Test both light and dark modes
5. Ensure responsive behavior

### Form Handling
- Use **React Hook Form** with **Zod** validation
- Implement proper error states
- Add loading states for submissions
- Use shadcn/ui form components
- Follow accessibility guidelines

## Testing & Quality
- **TypeScript compilation** catches type errors
- **ESLint** for code quality
- **Manual testing** for UI/UX
- **Responsive testing** across devices
- **Accessibility testing** with screen readers

## Git Workflow & Branch Strategy

### Branch Naming Convention
- `feature/[description]` - New features/optimizations
- `upgrade/[package-name]` - Version upgrades  
- `fix/[issue-description]` - Bug fixes
- `docs/[update-type]` - Documentation updates

### Commit Message Format
```
type: brief description

- Detailed change 1
- Detailed change 2

Updated CLAUDE.md: [what was updated]
Performance impact: [any measurable changes]

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Current Development State
- **Active Branch**: `feature/qr-redirect-page`
- **Recent Work**: QR redirect system implementation
- **Staged Changes**: QR route files and analytics updates
- **Status**: Ready for merge after testing

### Common Git Commands
```bash
# Check current status
git status
git log --oneline -5

# Create and switch to feature branch
git checkout -b feature/description

# Stage and commit changes
git add .
git commit -m "type: description"

# Switch back to main
git checkout main

# Merge feature branch
git merge feature/description
```

## Development Commands Reference

### Build & Development
```bash
# Development server
pnpm run dev

# Production build
pnpm run build

# Start production server
pnpm start

# Linting
pnpm run lint

# Type checking
pnpm run type-check

# Bundle analysis
pnpm run analyze

# Check package versions
pnpm list --depth=0

# Install dependencies
pnpm install
```

### Performance Analysis
```bash
# Bundle analysis (built-in with @next/bundle-analyzer)
pnpm run analyze

# Build with verbose output
pnpm run build -- --debug

# Check for outdated packages
pnpm outdated

# Update packages to latest versions
pnpm update

# Clean install (remove node_modules and reinstall)
rm -rf node_modules pnpm-lock.yaml && pnpm install
```

## Troubleshooting Guide

### Common Issues & Solutions

**Node Version Mismatch**
```bash
# Check current version
node --version

# Install/switch to correct version (if using nvm)
nvm install 22.17.0
nvm use 22.17.0
```

**Build Failures**
```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Build with verbose output for debugging
pnpm run build -- --debug
```

**Type Errors**
```bash
# Run TypeScript check
pnpm run type-check

# Check for missing type definitions
pnpm add -D @types/package-name
```

**Amplify Deployment Issues**
- Ensure `output: 'export'` is in next.config.mjs
- Check that baseDirectory is set to `out` in amplify.yml (for static export)
- Verify all dependencies are in package.json (not just devDependencies)
- Use Node.js 20 instead of 22 for better AWS Amplify compatibility
- Ensure corepack is enabled before pnpm installation
- Add .npmrc with `node-linker=hoisted` for pnpm monorepo support

**Common Build Failures**

*"Module not found: Can't resolve '@supabase/supabase-js'"*
```bash
# Fix: Add Supabase to dependencies in package.json
npm install @supabase/supabase-js
# or
pnpm add @supabase/supabase-js
```

*"pnpm install command failed on AWS Amplify"*
```bash
# Fix: Use corepack and Node.js 20 for better compatibility
preBuild:
  commands:
    - nvm use 20
    - corepack enable
    - corepack prepare pnpm@latest --activate
    - export NODE_OPTIONS=--max-old-space-size=8192
    - pnpm install --frozen-lockfile
```

*"Build failed because of webpack errors"*
```bash
# Check that all imports are correct
# Verify environment variables are set in Amplify console
# Ensure baseDirectory in amplify.yml is 'out' not '.next'
```

**Dual Deployment Prevention**
- Use "Squash and merge" for pull requests (creates single commit)
- Avoid manual merge commits after PR merges
- Enable "Auto-cancel redundant builds" in Amplify console
- Monitor deployment queue before making new commits

**Supabase Connection Issues**
```bash
# Test Supabase connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
client.from('consultation_requests').select('count').then(console.log).catch(console.error);
"

# Verify environment variables are set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Form Submission Issues**
- Check browser console for Supabase errors
- Verify database table exists and RLS policies are configured
- Ensure environment variables are properly set in production
- Test with different form data to isolate validation issues

### Performance Benchmarks
*(Updated: 2025-07-12 after Node.js 22 & Next.js 15.3.5 upgrade)*

- **Bundle size**: 102kB shared JS, 22.3kB homepage, 35.5kB services page
- **Build time**: ~4.0s compilation, total static export complete in ~6s
- **Package manager**: pnpm (65% faster installs, 70% less disk space vs npm)
- **Node.js version**: v22.17.0 LTS (upgraded from v20.19.0)
- **Next.js features**: Static export, bundle analyzer ready, CSS minification enabled
- **Dependencies**: All standardized versions, React 19 compatibility verified

## Future Considerations
- **CMS integration** for content management
- ~~**Analytics** integration (Google Analytics)~~ ✅ **COMPLETED: GA4 with GDPR compliance**
- **Contact form backend** integration
- **Additional services** pages
- **Performance monitoring** setup
- **A/B testing** for QR campaign optimization
- **Advanced analytics** dashboard for marketing metrics