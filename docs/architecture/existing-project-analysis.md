# Existing Project Analysis

## Current Project State

- **Primary Purpose:** Professional security services marketing website with consultation request functionality
- **Current Tech Stack:** Next.js 15.3.5, React 19, TypeScript 5, Tailwind CSS 3.4.17, shadcn/ui, Supabase 2.50.5
- **Architecture Style:** JAMstack with static export (`output: 'export'`) for AWS Amplify deployment
- **Deployment Method:** Static site generation with Supabase backend for dynamic functionality

## Available Documentation

- **CLAUDE.md:** Comprehensive project documentation with development guidelines, technology stack, and business context
- **PRD Documentation:** Complete sharded PRD in `docs/prd/` covering Guard Management Platform requirements
- **Component Library:** Full shadcn/ui implementation with 50+ pre-built components
- **Existing Database:** Supabase integration with `consultation_requests` table and Row-Level Security

## Identified Constraints

- **Static Export Requirement:** Must maintain `output: 'export'` for AWS Amplify compatibility
- **Authentication Disabled:** Current Supabase client has `persistSession: false` for static site optimization
- **Single Table Database:** Only `consultation_requests` table currently exists
- **Marketing Site Integrity:** Existing marketing functionality must remain unaffected
- **Performance Requirements:** Bundle analysis and optimization tools already configured
