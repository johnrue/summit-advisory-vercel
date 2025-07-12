"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { updateGAConsent } from "@/lib/analytics"
import { X } from "lucide-react"

const CONSENT_KEY = 'ga-consent'
const CONSENT_BANNER_KEY = 'consent-banner-shown'

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already made a consent decision
    const hasConsent = localStorage.getItem(CONSENT_KEY)
    const bannerShown = localStorage.getItem(CONSENT_BANNER_KEY)
    
    if (!hasConsent && !bannerShown) {
      setShowBanner(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'granted')
    localStorage.setItem(CONSENT_BANNER_KEY, 'true')
    updateGAConsent(true)
    setShowBanner(false)
  }

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'denied')
    localStorage.setItem(CONSENT_BANNER_KEY, 'true')
    updateGAConsent(false)
    setShowBanner(false)
  }

  const handleDismiss = () => {
    localStorage.setItem(CONSENT_BANNER_KEY, 'true')
    setShowBanner(false)
    // Don't update consent - defaults to denied
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
      <Card className="p-4 shadow-lg border-border/50 bg-card/95 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-sm font-semibold">Privacy & Cookies</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mb-4">
          We use analytics cookies to improve our website. Your data is anonymized and helps us provide better services.
        </p>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDecline}
            className="flex-1 text-xs"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="flex-1 text-xs"
          >
            Accept
          </Button>
        </div>
      </Card>
    </div>
  )
}