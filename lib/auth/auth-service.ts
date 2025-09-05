import { createClient } from './supabase'
import { jwtDecode } from 'jwt-decode'
import type { User, Session, AuthError } from '@supabase/supabase-js'

export interface AuthUser extends User {
  role?: string
}

export interface AuthSession extends Session {
  user: AuthUser
}

export interface AuthResult {
  user?: AuthUser
  session?: AuthSession
  error?: AuthError | Error
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials extends LoginCredentials {
  firstName?: string
  lastName?: string
  role?: 'guard' | 'manager' | 'admin'
}

export interface PasswordResetRequest {
  email: string
}

export class AuthService {
  private supabase = createClient()

  async login({ email, password }: LoginCredentials): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (error) {
        return { error }
      }

      // Extract role from JWT token if available
      let userWithRole: AuthUser = data.user
      if (data.session?.access_token) {
        try {
          const payload = jwtDecode<any>(data.session.access_token)
          userWithRole = {
            ...data.user,
            role: payload.role || payload.user_metadata?.role
          }
        } catch (jwtError) {
          // JWT decode failed, continue without role
        }
      }

      return {
        user: userWithRole,
        session: {
          ...data.session,
          user: userWithRole
        } as AuthSession
      }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async register({ email, password, firstName, lastName, role }: RegisterCredentials): Promise<AuthResult> {
    try {
      const metadata: Record<string, any> = {}
      
      if (firstName) metadata.firstName = firstName
      if (lastName) metadata.lastName = lastName
      if (role) metadata.role = role

      const { data, error } = await this.supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: metadata
        }
      })

      if (error) {
        return { error }
      }

      // If registration succeeded and user is created, assign role to database
      if (data.user) {
        try {
          const { roleService } = await import('./role-service')
          const roleResult = await roleService.autoAssignRoleFromMetadata(data.user)
          
          if (!roleResult.success) {
            // Don't fail registration if role assignment fails - it can be assigned later
          }
        } catch (roleError) {
          // Continue with registration even if role assignment fails
        }
      }

      let userWithRole: AuthUser = data.user!
      if (role) {
        userWithRole = {
          ...data.user!,
          role
        }
      }

      return {
        user: userWithRole,
        session: data.session ? {
          ...data.session,
          user: userWithRole
        } as AuthSession : undefined
      }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async logout(): Promise<{ error?: AuthError }> {
    try {
      const { error } = await this.supabase.auth.signOut()
      return { error: error || undefined }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  async resetPassword({ email }: PasswordResetRequest): Promise<{ error?: AuthError }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/auth/reset-password`
        }
      )
      return { error: error || undefined }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  async getCurrentSession(): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.getSession()
      
      if (error) {
        return { error }
      }

      if (!data.session) {
        return {}
      }

      // Extract role from JWT token if available
      let userWithRole: AuthUser = data.session.user
      if (data.session.access_token) {
        try {
          const payload = jwtDecode<any>(data.session.access_token)
          userWithRole = {
            ...data.session.user,
            role: payload.role || payload.user_metadata?.role
          }
        } catch (jwtError) {
          // JWT decode failed, continue without role
        }
      }

      return {
        user: userWithRole,
        session: {
          ...data.session,
          user: userWithRole
        } as AuthSession
      }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async updatePassword(newPassword: string): Promise<{ error?: AuthError }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      })
      return { error: error || undefined }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  onAuthStateChange(callback: (event: string, session: AuthSession | null) => void) {
    return this.supabase.auth.onAuthStateChange(async (event, session) => {
      let sessionWithRole: AuthSession | null = null
      
      if (session) {
        // Extract role from JWT token if available
        let userWithRole: AuthUser = session.user
        if (session.access_token) {
          try {
            const payload = jwtDecode<any>(session.access_token)
            userWithRole = {
              ...session.user,
              role: payload.role || payload.user_metadata?.role
            }
          } catch (jwtError) {
            // JWT decode failed, continue without role
          }
        }

        sessionWithRole = {
          ...session,
          user: userWithRole
        } as AuthSession
      }
      
      callback(event, sessionWithRole)
    })
  }
}

// Export singleton instance
export const authService = new AuthService()