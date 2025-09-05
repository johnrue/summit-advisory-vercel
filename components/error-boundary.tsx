"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo)
  }

  retry = () => {
    this.setState({ hasError: false, error: null })
    // Force a re-render by updating component state
    this.forceUpdate()
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error!} retry={this.retry} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      <div className="rounded-full bg-destructive/10 p-3 mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-4 max-w-md">
        An unexpected error occurred. Please try again or contact support if the problem persists.
      </p>
      <div className="space-y-2">
        <Button onClick={retry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
              Error Details (Development)
            </summary>
            <pre className="text-xs text-destructive bg-destructive/5 p-2 rounded mt-2 overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

export function ErrorBoundary({ children, fallback, onError }: ErrorBoundaryProps) {
  return (
    <ErrorBoundaryClass fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundaryClass>
  )
}

export default ErrorBoundary