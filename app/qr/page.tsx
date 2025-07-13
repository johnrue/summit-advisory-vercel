"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function QRRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [countdown, setCountdown] = useState(3)
  const [error, setError] = useState(false)

  // Get campaign parameter for tracking
  const campaign = searchParams.get('campaign') || 'qr-default'
  const source = searchParams.get('source') || 'qr-code'

  useEffect(() => {
    // Track QR code access (simplified)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'qr_code_scan', {
        campaign,
        source,
        timestamp: new Date().toISOString(),
      })
    }

    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleRedirect()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [campaign, source])

  const handleRedirect = () => {
    try {
      // Track successful redirect
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'qr_redirect_success', {
          campaign,
          source,
          destination: '/',
        })
      }
      
      // Use window.location for more reliable redirect
      window.location.href = '/'
    } catch (err) {
      console.error('Redirect failed:', err)
      setError(true)
    }
  }

  const handleManualRedirect = () => {
    // Track manual redirect click
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'qr_manual_redirect', {
        campaign,
        source,
      })
    }
    
    // Direct navigation
    window.location.href = '/'
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md p-6 text-center bg-card border border-border rounded-xl shadow-lg backdrop-blur-sm">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-destructive/10 border-destructive border-2 rounded-full flex items-center justify-center">
              <span className="text-2xl text-destructive">⚠</span>
            </div>
          </div>
          <h1 className="text-xl font-semibold mb-2 text-foreground">
            Redirect Issue
          </h1>
          <p className="text-muted-foreground mb-4">
            We encountered an issue with the automatic redirect. Please click below to continue to our website.
          </p>
          <button 
            onClick={handleManualRedirect}
            className="w-full px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg cursor-pointer text-base font-medium transition-colors duration-300"
          >
            Continue to Summit Advisory →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md p-6 text-center bg-card border border-border rounded-xl shadow-lg backdrop-blur-sm">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" 
               style={{ animation: 'qr-spin 1s linear infinite' }} />
        </div>
        
        <h1 className="text-2xl font-semibold mb-2 text-foreground">
          Welcome to Summit Advisory
        </h1>
        <p className="text-muted-foreground mb-4">
          Thank you for scanning our QR code. We're redirecting you to our website...
        </p>
        
        {countdown > 0 && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}
            </p>
          </div>
        )}
        
        <div className="mt-4 space-y-3">
          <button 
            onClick={handleManualRedirect}
            className="w-full px-6 py-3 bg-accent text-accent-foreground hover:bg-accent/90 border border-accent rounded-lg cursor-pointer text-base font-medium transition-colors duration-300"
          >
            Continue Now →
          </button>
          <p className="text-xs text-muted-foreground">
            Professional Security Services | Houston, Dallas, Austin, San Antonio
          </p>
        </div>
      </div>
      
      <style>{`
        @keyframes qr-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}