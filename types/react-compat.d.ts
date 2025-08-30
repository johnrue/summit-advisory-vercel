/**
 * Type compatibility fixes for React 19 with various libraries
 */

// Fix for React 19 compatibility with Recharts and other libraries
declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // Add any missing attributes that libraries might expect
  }
}

// Fix for module resolution issues during TypeScript CLI checks
declare module '@/components/ui/*' {
  const Component: any
  export default Component
  export * from '@/components/ui/*'
}

declare module '@/components/dashboard/reports/*' {
  const Component: any
  export default Component
  export * from '@/components/dashboard/reports/*'
}

declare module '@/app/dashboard/(admin)/reports/page' {
  const Component: any
  export default Component
}

declare module '@/lib/services/*' {
  export * from '@/lib/services/*'
}

// Fix for Edge Function types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      RESEND_API_KEY?: string
      NEXT_PUBLIC_SUPABASE_URL?: string
      NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
      SUPABASE_SERVICE_ROLE_KEY?: string
      OPENAI_API_KEY?: string
    }
  }
}

export {}