"use client"

import { useEffect } from "react"

export default function QRError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Track error occurrence (simplified)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'qr_page_error', {
        error_message: error.message,
        error_digest: error.digest,
        timestamp: new Date().toISOString(),
      })
    }
  }, [error])

  const handleGoHome = () => {
    // Track manual navigation to home
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'qr_error_home_click', {
        error_message: error.message,
      })
    }
    
    // Navigate to homepage
    window.location.href = '/'
  }

  const handleRetry = () => {
    // Track retry attempt
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'qr_error_retry', {
        error_message: error.message,
      })
    }
    
    reset()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md p-6 text-center bg-card border border-border rounded-xl shadow-lg backdrop-blur-sm">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto bg-destructive rounded-full flex items-center justify-center">
            <span className="text-2xl text-destructive-foreground">⚠</span>
          </div>
        </div>
        
        <h1 className="text-xl font-semibold mb-2 text-foreground">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-6">
          We encountered an issue loading the redirect page. Don't worry, you can still access our website.
        </p>
        
        <div className="space-y-3">
          <button 
            onClick={handleGoHome}
            className="w-full px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg cursor-pointer text-base font-medium transition-colors duration-300"
          >
            Go to Summit Advisory →
          </button>
          
          <button 
            onClick={handleRetry}
            className="w-full px-6 py-3 bg-transparent text-foreground border border-border hover:bg-muted rounded-lg cursor-pointer text-base font-medium transition-colors duration-300"
          >
            ↻ Try Again
          </button>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Need immediate assistance? Call (830) 201-0414
          </p>
        </div>
      </div>
    </div>
  )
}