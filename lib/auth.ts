import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { User } from '@supabase/supabase-js'

export interface AuthResult {
  success: boolean
  error?: string
  status?: number
  userId?: string
  role?: string
  userEmail?: string
  user?: User
}

export async function validateRequestAuth(
  request: NextRequest,
  requiredRoles: string[] = []
): Promise<AuthResult> {
  try {
    // Get the Authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header',
        status: 401
      }
    }

    // Extract the token
    const token = authHeader.substring(7)
    
    if (!token) {
      return {
        success: false,
        error: 'No token provided',
        status: 401
      }
    }

    // Create Supabase client with server-side configuration
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Verify the JWT token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Invalid or expired token',
        status: 401
      }
    }

    // Get user role from user_roles table
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role, permissions')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      // If no role found, default to 'guard' role
      const defaultRole = 'guard'
      
      // Check if user has required role
      if (requiredRoles.length > 0 && !requiredRoles.includes(defaultRole)) {
        return {
          success: false,
          error: 'Insufficient permissions',
          status: 403
        }
      }
      
      return {
        success: true,
        userId: user.id,
        role: defaultRole,
        userEmail: user.email || '',
        user
      }
    }

    // Check if user has required role
    if (requiredRoles.length > 0 && !requiredRoles.includes(userRole.role)) {
      return {
        success: false,
        error: 'Insufficient permissions',
        status: 403
      }
    }

    return {
      success: true,
      userId: user.id,
      role: userRole.role,
      userEmail: user.email || '',
      user
    }

  } catch (error) {
    return {
      success: false,
      error: 'Internal authentication error',
      status: 500
    }
  }
}

export async function extractUserFromToken(token: string): Promise<AuthResult> {
  try {
    // Create Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Invalid token',
        status: 401
      }
    }

    // Get user role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = userRole?.role || 'guard' // Default to guard if no role found

    return {
      success: true,
      userId: user.id,
      role,
      userEmail: user.email || '',
      user
    }
  } catch (error) {
    return {
      success: false,
      error: 'Invalid token',
      status: 401
    }
  }
}

// Helper function to create authenticated Supabase client
export async function createAuthenticatedClient(token: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
  
  // Set the auth token
  await supabase.auth.setSession({
    access_token: token,
    refresh_token: '', // We'll handle refresh tokens separately
  })
  
  return supabase
}

// Helper function to get current user session
export async function getCurrentUser(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      return {
        success: false,
        error: 'No active session',
        status: 401
      }
    }

    // Get user role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    return {
      success: true,
      userId: session.user.id,
      role: userRole?.role || 'guard',
      userEmail: session.user.email || '',
      user: session.user
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to get current user',
      status: 500
    }
  }
}