"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, LogIn, RefreshCw } from 'lucide-react'
import { ErrorBoundary } from '@/components/error-boundary'

interface AuthErrorFallbackProps {
  error: Error
  retry: () => void
}

function AuthErrorFallback({ error, retry }: AuthErrorFallbackProps) {
  const isAuthError = error.message.includes('auth') || 
                     error.message.includes('session') || 
                     error.message.includes('token') ||
                     error.message.includes('unauthorized')

  const isNetworkError = error.message.includes('fetch') ||
                        error.message.includes('network') ||
                        error.message.includes('connection')

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
      <div className="rounded-full bg-destructive/10 p-3 mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      
      {isAuthError && (
        <>
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            There was a problem with your authentication session. Please sign in again.
          </p>
          <div className="space-x-2">
            <Button onClick={() => window.location.href = '/login'} className="gap-2">
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
            <Button variant="outline" onClick={retry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </>
      )}

      {isNetworkError && (
        <>
          <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            Unable to connect to our servers. Please check your internet connection and try again.
          </p>
          <Button onClick={retry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>
        </>
      )}

      {!isAuthError && !isNetworkError && (
        <>
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
          <Button onClick={retry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </>
      )}

      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-left">
          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
            Error Details (Development)
          </summary>
          <pre className="text-xs text-destructive bg-destructive/5 p-2 rounded mt-2 overflow-auto max-w-md">
            {error.message}
            {error.stack && '\n\n' + error.stack}
          </pre>
        </details>
      )}
    </div>
  )
}

interface AuthErrorBoundaryProps {
  children: React.ReactNode
}

export function AuthErrorBoundary({ children }: AuthErrorBoundaryProps) {
  const handleAuthError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log auth errors for monitoring
    console.error('Auth Error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    })

    // In production, you might want to send this to your error monitoring service
    // analytics.authError(error.message)
  }

  return (
    <ErrorBoundary fallback={AuthErrorFallback} onError={handleAuthError}>
      {children}
    </ErrorBoundary>
  )
}

export default AuthErrorBoundary