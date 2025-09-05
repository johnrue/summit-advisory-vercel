"use client"

import { useState, useEffect, useCallback } from "react"
import { ExternalLink, AlertCircle } from "lucide-react"

interface PortalLinkProps {
  children: React.ReactNode
  className?: string
  source: string
  service?: string
  variant?: 'primary' | 'outline' | 'text'
  showIcon?: boolean
  checkAvailability?: boolean
}

/**
 * PortalLink component for cross-domain navigation to SaaS platform
 * This is an EXAMPLE component for the marketing site implementation
 */
export function PortalLink({
  children,
  className = "",
  source,
  service,
  variant = 'primary',
  showIcon = false,
  checkAvailability = false
}: PortalLinkProps) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  // Build the portal URL with tracking parameters
  const buildPortalUrl = () => {
    const baseUrl = 'https://app.summitadvisoryfirm.com/auth/login'
    const url = new URL(baseUrl)
    
    // Add tracking parameters
    url.searchParams.set('source', source)
    url.searchParams.set('referrer', 'marketing-site')
    
    if (service) {
      url.searchParams.set('service', service)
    }
    
    // Add timestamp for cache busting
    url.searchParams.set('t', Date.now().toString())
    
    return url.toString()
  }

  // Check if SaaS platform is available
  const checkSaaSAvailability = useCallback(async () => {
    if (!checkAvailability) return true
    
    setIsChecking(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      const response = await fetch('https://app.summitadvisoryfirm.com/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors' // Avoid CORS issues for health check
      })
      
      clearTimeout(timeoutId)
      return true // If we get any response, assume it's available
    } catch (error) {
      return false
    } finally {
      setIsChecking(false)
    }
  }, [checkAvailability])

  // Track portal link click
  const trackPortalClick = () => {
    // Google Analytics 4 tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', 'portal_link_click', {
        'source': source,
        'service': service || 'general',
        'destination_domain': 'app.summitadvisoryfirm.com',
        'link_variant': variant
      })
    }

    // Alternative tracking for other analytics platforms
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Portal Link Clicked', {
        source,
        service,
        variant
      })
    }
  }

  // Handle portal link click
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    
    trackPortalClick()
    
    if (checkAvailability && isAvailable === null) {
      const available = await checkSaaSAvailability()
      setIsAvailable(available)
      
      if (!available) {
        showUnavailableModal()
        return
      }
    }
    
    if (checkAvailability && isAvailable === false) {
      showUnavailableModal()
      return
    }
    
    // Open portal in new tab
    window.open(buildPortalUrl(), '_blank', 'noopener,noreferrer')
  }

  // Show unavailable modal/message
  const showUnavailableModal = () => {
    // In a real implementation, this would show a modal or redirect to contact form
    alert(
      'The portal is temporarily unavailable. Please try again later or contact us at (830) 201-0414.'
    )
  }

  // Check availability on mount if requested
  useEffect(() => {
    if (checkAvailability) {
      checkSaaSAvailability().then(setIsAvailable)
    }
  }, [checkAvailability, checkSaaSAvailability])

  // Base styles for different variants
  const getVariantStyles = () => {
    const baseStyles = "inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2"
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} bg-[#d4af37] text-[#1a1a1a] hover:bg-[#b8941f] hover:transform hover:-translate-y-0.5 hover:shadow-lg focus:ring-[#d4af37]`
      case 'outline':
        return `${baseStyles} border-2 border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-[#1a1a1a] focus:ring-[#d4af37]`
      case 'text':
        return `${baseStyles} text-[#d4af37] hover:text-[#b8941f] hover:underline bg-transparent px-0`
      default:
        return baseStyles
    }
  }

  const isDisabled = isChecking || (checkAvailability && isAvailable === false)

  return (
    <a
      href={buildPortalUrl()}
      onClick={handleClick}
      className={`${getVariantStyles()} ${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      aria-label={`Access Summit Advisory Guard Management Platform${service ? ` for ${service}` : ''}`}
      role="button"
    >
      {isChecking ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          Checking...
        </>
      ) : isAvailable === false ? (
        <>
          <AlertCircle className="w-4 h-4" />
          Unavailable
        </>
      ) : (
        <>
          {children}
          {showIcon && <ExternalLink className="w-4 h-4" />}
        </>
      )}
    </a>
  )
}

// Example usage components for different sections

export function HeroPortalButton() {
  return (
    <PortalLink
      source="hero"
      variant="primary"
      showIcon={true}
      className="text-lg px-8 py-4"
    >
      Access Portal
    </PortalLink>
  )
}

export function NavigationPortalLink() {
  return (
    <PortalLink
      source="navigation"
      variant="text"
      showIcon={true}
      className="text-base"
    >
      Portal
    </PortalLink>
  )
}

export function ServicePortalButton({ service }: { service: string }) {
  return (
    <PortalLink
      source="services"
      service={service}
      variant="outline"
      className="mt-4"
      checkAvailability={true}
    >
      Manage This Service
    </PortalLink>
  )
}

export function FooterPortalLink() {
  return (
    <PortalLink
      source="footer"
      variant="text"
      className="text-sm hover:underline"
    >
      Guard Portal
    </PortalLink>
  )
}

export function ContactSuccessPortalSuggestion() {
  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg border-l-4 border-[#d4af37]">
      <p className="text-gray-700 mb-2">
        <strong>Existing clients:</strong> Access your account and manage services through our portal.
      </p>
      <PortalLink
        source="contact-success"
        variant="outline"
        className="text-sm px-4 py-2"
      >
        Access Portal
      </PortalLink>
    </div>
  )
}