"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { ErrorBoundary } from '@/components/error-boundary'

interface FormErrorFallbackProps {
  error: Error
  retry: () => void
}

function FormErrorFallback({ error, retry }: FormErrorFallbackProps) {
  const isValidationError = error.message.includes('validation') ||
                            error.message.includes('required') ||
                            error.message.includes('format')

  const isSubmissionError = error.message.includes('submit') ||
                           error.message.includes('network') ||
                           error.message.includes('server')

  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          {isValidationError && (
            <>
              <h3 className="font-medium text-destructive mb-1">Form Validation Error</h3>
              <p className="text-sm text-destructive/80 mb-2">
                Please check that all required fields are filled out correctly.
              </p>
            </>
          )}
          
          {isSubmissionError && (
            <>
              <h3 className="font-medium text-destructive mb-1">Submission Error</h3>
              <p className="text-sm text-destructive/80 mb-2">
                Unable to submit the form. Please check your connection and try again.
              </p>
            </>
          )}

          {!isValidationError && !isSubmissionError && (
            <>
              <h3 className="font-medium text-destructive mb-1">Form Error</h3>
              <p className="text-sm text-destructive/80 mb-2">
                An unexpected error occurred while processing the form.
              </p>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            className="gap-2 border-destructive/20 hover:bg-destructive/10"
          >
            <RefreshCw className="h-3 w-3" />
            Try Again
          </Button>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="text-xs text-destructive/60 cursor-pointer hover:text-destructive/80">
                Error Details (Development)
              </summary>
              <pre className="text-xs bg-background p-2 rounded mt-1 overflow-auto">
                {error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

interface FormErrorBoundaryProps {
  children: React.ReactNode
}

export function FormErrorBoundary({ children }: FormErrorBoundaryProps) {
  const handleFormError = (error: Error, errorInfo: React.ErrorInfo) => {
    // In production, you might want to send this to your error monitoring service
    // analytics.formError(error.message)
  }

  return (
    <ErrorBoundary fallback={FormErrorFallback} onError={handleFormError}>
      {children}
    </ErrorBoundary>
  )
}

export default FormErrorBoundary