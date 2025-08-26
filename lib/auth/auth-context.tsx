'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary'
import { authService, type AuthUser, type AuthSession } from './auth-service'
import type { AuthError } from '@supabase/supabase-js'

export interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: AuthError | Error }>
  signUp: (email: string, password: string, metadata?: { firstName?: string; lastName?: string; role?: string }) => Promise<{ error?: AuthError | Error }>
  signOut: () => Promise<{ error?: AuthError }>
  resetPassword: (email: string) => Promise<{ error?: AuthError }>
  updatePassword: (newPassword: string) => Promise<{ error?: AuthError }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { user, session } = await authService.getCurrentSession()
      setSession(session ?? null)
      setUser(user ?? null)
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle automatic logout on token expiration
        if (event === 'TOKEN_REFRESHED' && !session) {
          // Token refresh failed, user needs to re-authenticate
          setUser(null)
          setSession(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await authService.login({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string, metadata?: { firstName?: string; lastName?: string; role?: string }) => {
    const { error } = await authService.register({ 
      email, 
      password,
      firstName: metadata?.firstName,
      lastName: metadata?.lastName,
      role: metadata?.role as 'guard' | 'manager' | 'admin'
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await authService.logout()
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { error } = await authService.resetPassword({ email })
    return { error }
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await authService.updatePassword(newPassword)
    return { error }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }

  return (
    <AuthErrorBoundary>
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    </AuthErrorBoundary>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}