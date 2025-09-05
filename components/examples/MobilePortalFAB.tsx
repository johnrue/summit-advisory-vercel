"use client"

import { useState, useEffect } from "react"
import { Shield, X, ExternalLink } from "lucide-react"

interface MobilePortalFABProps {
  showOnMobile?: boolean
  hideAfterScroll?: boolean
  className?: string
}

/**
 * Mobile Portal Floating Action Button (FAB)
 * This is an EXAMPLE component for mobile portal access on marketing site
 */
export function MobilePortalFAB({
  showOnMobile = true,
  hideAfterScroll = false,
  className = ""
}: MobilePortalFABProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle scroll visibility
  useEffect(() => {
    if (!hideAfterScroll) {
      setIsVisible(showOnMobile && isMobile)
      return
    }

    let timeoutId: NodeJS.Timeout
    
    const handleScroll = () => {
      if (!showOnMobile || !isMobile) return
      
      // Show FAB when user scrolls down
      setIsVisible(true)
      
      // Hide after user stops scrolling (optional behavior)
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        if (window.scrollY > 100) { // Only hide if not near top
          setIsVisible(false)
        }
      }, 3000)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial state
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [showOnMobile, isMobile, hideAfterScroll])

  // Track portal access from mobile FAB
  const trackMobilePortalClick = () => {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'mobile_portal_fab_click', {
        'source': 'mobile-fab',
        'device_type': 'mobile',
        'expanded_state': isExpanded
      })
    }
  }

  // Handle portal access
  const handlePortalAccess = () => {
    trackMobilePortalClick()
    
    const portalUrl = new URL('https://app.summitadvisoryfirm.com/auth/login')
    portalUrl.searchParams.set('source', 'mobile-fab')
    portalUrl.searchParams.set('device', 'mobile')
    
    window.open(portalUrl.toString(), '_blank', 'noopener,noreferrer')
    setIsExpanded(false)
  }

  if (!isVisible || !isMobile) return null

  return (
    <>
      {/* Backdrop for expanded state */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* Main FAB */}
      <div
        className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${className} ${
          isExpanded ? 'scale-110' : 'scale-100'
        }`}
      >
        {/* Expanded Menu */}
        {isExpanded && (
          <div className="absolute bottom-16 right-0 bg-white rounded-xl shadow-xl border border-gray-200 p-4 min-w-[250px] animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Portal Access</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Access your guard management portal for scheduling, reports, and more.
            </p>
            
            <button
              onClick={handlePortalAccess}
              className="w-full flex items-center justify-center gap-2 bg-[#d4af37] text-[#1a1a1a] px-4 py-3 rounded-lg font-semibold hover:bg-[#b8941f] transition-colors duration-200"
            >
              <ExternalLink className="w-4 h-4" />
              Open Portal
            </button>
            
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                Secure access • SSL encrypted
              </p>
            </div>
          </div>
        )}
        
        {/* FAB Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            flex items-center justify-center w-14 h-14 bg-[#d4af37] text-[#1a1a1a] rounded-full shadow-lg
            hover:bg-[#b8941f] hover:shadow-xl transform hover:scale-105 
            transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#d4af37] focus:ring-opacity-30
            ${isExpanded ? 'bg-[#b8941f]' : ''}
          `}
          aria-label="Access Guard Portal"
        >
          <Shield 
            className={`w-6 h-6 transition-transform duration-200 ${
              isExpanded ? 'rotate-12' : 'rotate-0'
            }`} 
          />
        </button>
        
        {/* Pulse animation for new visitors */}
        <div className="absolute inset-0 rounded-full bg-[#d4af37] animate-ping opacity-20" />
      </div>
    </>
  )
}

// Alternative compact version
export function MobilePortalCompact() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleClick = () => {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'mobile_portal_compact_click', {
        'source': 'mobile-compact'
      })
    }

    const portalUrl = new URL('https://app.summitadvisoryfirm.com/auth/login')
    portalUrl.searchParams.set('source', 'mobile-compact')
    
    window.open(portalUrl.toString(), '_blank', 'noopener,noreferrer')
  }

  if (!isMobile) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
      <button
        onClick={handleClick}
        className="w-full flex items-center justify-center gap-2 bg-[#d4af37] text-[#1a1a1a] px-6 py-3 rounded-full font-semibold shadow-lg hover:bg-[#b8941f] transition-colors duration-200"
      >
        <Shield className="w-5 h-5" />
        Access Guard Portal
        <ExternalLink className="w-4 h-4" />
      </button>
    </div>
  )
}

// Usage examples and integration guide
export const MobilePortalExamples = {
  // Standard FAB with expansion
  StandardFAB: () => <MobilePortalFAB />,
  
  // FAB that appears after scrolling
  ScrollTriggeredFAB: () => (
    <MobilePortalFAB hideAfterScroll={true} />
  ),
  
  // Compact bottom banner
  BottomBanner: () => <MobilePortalCompact />,
  
  // Custom styled FAB
  CustomFAB: () => (
    <MobilePortalFAB 
      className="shadow-2xl"
      showOnMobile={true}
    />
  )
}