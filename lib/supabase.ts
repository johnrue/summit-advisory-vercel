import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import type { Database } from './types/database'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create Supabase client with proper configuration
export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Enable auth persistence for live application
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  }
})

// Export createClient function for services
export const createClient = () => createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  }
})

// Create browser client for client-side operations
export const createBrowserSupabaseClient = () =>
  createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)

// Create server client for server-side operations
export const createServerSupabaseClient = (
  cookieStore: any,
  options?: { admin?: boolean }
) => {
  return createServerClient<Database>(
    supabaseUrl,
    options?.admin 
      ? process.env.SUPABASE_SERVICE_ROLE_KEY! 
      : supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

// Test connection function (optional - for debugging)
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('consultation_requests').select('count').limit(1)
    if (error) {
      // Supabase connection test failed
      return false
    }
    // Supabase connection successful
    return true
  } catch (error) {
    // Supabase connection test error
    return false
  }
}