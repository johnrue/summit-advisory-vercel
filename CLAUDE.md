# CLAUDE.md - Summit Advisory Security Services

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

## Future Considerations
- **CMS integration** for content management
- **Analytics** integration (Google Analytics)
- **Contact form backend** integration
- **Additional services** pages
- **Performance monitoring** setup