# Summit Advisory Guard Management Platform

The Summit Advisory Guard Management Platform is a comprehensive web application built for Summit Advisory's security services operations. This project combines a modern marketing website with a full-featured guard management system, leveraging Next.js for both static site generation and dynamic authentication-based functionality, TypeScript for type safety, and Tailwind CSS for consistent styling. The platform includes AI-powered resume parsing, TOPS compliance management, and complete operational workflows for hiring, scheduling, and business development.

## Table of Contents

-   [Tech Stack](#tech-stack)
-   [Project Structure](#project-structure)
-   [Prerequisites](#prerequisites)
-   [Installation](#installation)
-   [Running the Project](#running-the-project)
-   [Available Scripts](#available-scripts)
-   [Deployment](#deployment)
-   [License](#license)

## Tech Stack

### Frontend
-   **Framework**: [Next.js](https://nextjs.org/) (v15.3.5) with React 19
-   **Language**: [TypeScript](https://www.typescriptlang.org/) (v5)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v3.4.17)
-   **UI Components**: [shadcn/ui](https://ui.shadcn.com/) built on [Radix UI](https://www.radix-ui.com/)
-   **Form Handling**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) validation
-   **State Management**: React Context API + Supabase real-time subscriptions
-   **Package Manager**: [pnpm](https://pnpm.io/)

### Backend & Services
-   **Database**: [Supabase](https://supabase.com/) (PostgreSQL with Row-Level Security)
-   **Authentication**: Supabase Auth with role-based access control
-   **File Storage**: Supabase Storage for document uploads
-   **AI Integration**: [OpenAI API](https://openai.com/) for resume parsing via Supabase Edge Functions
-   **Email Service**: Supabase Edge Functions with email provider integration
-   **Calendar Integration**: OAuth integration with Google Calendar and Outlook APIs
-   **Real-time Updates**: Supabase real-time subscriptions

### Development & Deployment
-   **Deployment**: [Vercel](https://vercel.com/) for frontend hosting
-   **MCP Tools**: Supabase MCP, Vercel MCP, Reference MCP for enhanced development
-   **Linting**: ESLint with Next.js configuration
-   **Monitoring**: Vercel Analytics + Supabase monitoring

## Project Structure

The project combines a marketing website with a comprehensive guard management system:

```
/
├── app/                     # Next.js App Router
│   ├── globals.css         # Global styles and CSS variables
│   ├── layout.tsx          # Root layout with theme provider
│   ├── page.tsx            # Homepage (marketing)
│   ├── (auth)/             # Authentication routes
│   │   ├── login/          # Login page
│   │   └── register/       # Registration page
│   ├── dashboard/          # Role-based dashboards
│   │   ├── admin/          # Admin dashboard with impersonation
│   │   ├── manager/        # Manager operational dashboard
│   │   └── guard/          # Guard mobile-friendly portal
│   ├── hiring/             # Guard hiring workflow
│   ├── scheduling/         # Shift management and calendar
│   ├── compliance/         # TOPS compliance and reporting
│   ├── leads/              # Lead management and contracts
│   ├── qr/                 # QR code redirect system
│   └── services/           # Marketing service pages
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   ├── kanban/             # Kanban board components
│   ├── forms/              # Form components with AI parsing
│   └── dashboards/         # Dashboard-specific components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and services
│   ├── supabase.ts        # Supabase client configuration
│   ├── openai.ts          # OpenAI API integration
│   ├── auth.ts            # Authentication utilities
│   └── types.ts           # TypeScript interfaces
├── docs/                   # Project documentation
│   ├── prd/               # Product Requirements (sharded)
│   └── architecture/      # Technical architecture docs
├── public/                 # Static assets
├── .env.local             # Environment variables (DO NOT COMMIT)
├── next.config.mjs        # Next.js configuration
├── package.json           # Dependencies and scripts
├── vercel.json            # Vercel deployment configuration
└── CLAUDE.md              # Development guidelines and context
```

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org/) (LTS version recommended, e.g., v18, v20, or v22 to match `@types/node: ^22`)
-   [pnpm](https://pnpm.io/installation)

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/johnrue/summit-advisory-vercel.git
    cd summit-advisory-vercel
    ```
2.  Install dependencies using pnpm:
    ```bash
    pnpm install
    ```

## Running the Project

To start the development server:

```bash
pnpm run dev
```

The application will typically be available at `http://localhost:3000`.

## Available Scripts

The `package.json` defines the following scripts:

-   `pnpm run dev`: Starts the Next.js development server.
-   `pnpm run build`: Builds the application for production.
-   `pnpm run start`: Starts the production server (after running `build`).
-   `pnpm run lint`: Runs ESLint to check for code quality and style issues.

## Deployment

This project is optimized for deployment on [Vercel](https://vercel.com/), leveraging their native Next.js support and serverless infrastructure:

### Production Deployment
1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - Additional OAuth and integration keys
3. Vercel automatically builds and deploys on push to main branch

### Environment Setup
- **Development**: Local development with Supabase local instance
- **Staging**: Preview deployments for pull requests
- **Production**: Main branch auto-deployment with Vercel

### Key Features
- **Static Export**: Marketing pages served as static assets
- **Serverless Functions**: Authentication and guard management routes
- **Edge Functions**: AI processing and real-time notifications via Supabase
- **Real-time Database**: Live updates for scheduling and notifications

## License

This project is currently not licensed. Consider adding an open-source license like MIT if appropriate.
