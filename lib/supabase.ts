import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create Supabase client with proper configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable auth persistence for static site
  },
  db: {
    schema: 'public'
  }
})

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