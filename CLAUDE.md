# CLAUDE.md - Summit Advisory Security Services

## 🚀 BEFORE STARTING ANY WORK - READ THIS SECTION

### Current Project Status (Updated: 2025-07-12)
- **Node.js version**: v22.17.0 LTS (✅ Latest LTS)
- **Next.js version**: 15.3.5 (✅ Latest stable)
- **React version**: 19 (✅ Latest)
- **Package manager**: pnpm (✅ Switched from npm for 65% faster installs)
- **Last major update**: Node.js & Next.js modernization completed
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
- 🔄 **IN PROGRESS: Performance optimizations and bundle analysis**
- 🔄 Phase 3: AWS Amplify configuration updates

## 🔄 AFTER COMPLETING WORK - UPDATE THIS SECTION

### Post-Work Checklist
- [ ] Update version numbers above if any packages were changed
- [ ] Document new commands/scripts added to package.json
- [ ] Record performance improvements (bundle size, build time, etc.)
- [ ] Note any issues encountered and their solutions
- [ ] Update troubleshooting section with new known issues
- [ ] Commit documentation changes with descriptive message
- [ ] Update "Last major update" date

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
│   └── services-data.tsx   # Services content
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
- **No external APIs** - static site architecture
- **Type-safe data** with TypeScript interfaces

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
- **Contact forms** for consultation requests
- **Responsive design** for all devices
- **Professional branding** with security industry styling
- **SEO optimized** metadata and structure

## Deployment

### AWS Amplify Configuration
- **Build command**: `npm run build`
- **Output directory**: `out/`
- **Node version**: Latest LTS
- **Environment**: Static hosting

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
- Check that baseDirectory is set to `.next` in amplify.yml
- Verify all dependencies are in package.json (not just devDependencies)

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
- **Analytics** integration (Google Analytics)
- **Contact form backend** integration
- **Additional services** pages
- **Performance monitoring** setup