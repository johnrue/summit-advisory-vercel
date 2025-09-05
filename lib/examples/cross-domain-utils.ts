/**
 * Cross-Domain Integration Utilities
 * These utilities facilitate seamless integration between the marketing site 
 * (summitadvisoryfirm.com) and SaaS platform (app.summitadvisoryfirm.com)
 */

// Type definitions for cross-domain messaging
export interface CrossDomainMessage {
  type: 'PORTAL_NAVIGATION' | 'HEALTH_CHECK' | 'AUTH_STATUS' | 'SESSION_SYNC'
  source: 'marketing' | 'saas'
  data?: any
  timestamp: number
}

export interface PortalNavigationOptions {
  source: string
  service?: string
  campaign?: string
  userType?: 'prospect' | 'client' | 'guard'
  returnUrl?: string
}

export interface HealthCheckResult {
  available: boolean
  responseTime: number
  version?: string
  lastChecked: number
}

// Constants
export const DOMAINS = {
  MARKETING: 'https://summitadvisoryfirm.com',
  SAAS: 'https://app.summitadvisoryfirm.com'
} as const

export const PORTAL_ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/dashboard/profile',
  SCHEDULE: '/dashboard/schedule'
} as const

export const TRACKING_SOURCES = {
  HERO: 'hero',
  NAVIGATION: 'navigation', 
  SERVICES: 'services',
  FOOTER: 'footer',
  CONTACT_SUCCESS: 'contact-success',
  MOBILE_FAB: 'mobile-fab',
  QR_CODE: 'qr-code'
} as const

/**
 * Portal Navigation Utility
 * Handles cross-domain navigation with tracking and fallback
 */
export class PortalNavigator {
  private static instance: PortalNavigator
  private healthCache: Map<string, HealthCheckResult> = new Map()
  private readonly CACHE_TTL = 30000 // 30 seconds

  static getInstance(): PortalNavigator {
    if (!PortalNavigator.instance) {
      PortalNavigator.instance = new PortalNavigator()
    }
    return PortalNavigator.instance
  }

  /**
   * Navigate to portal with tracking and fallback handling
   */
  async navigateToPortal(options: PortalNavigationOptions): Promise<boolean> {
    const { source, service, campaign, userType, returnUrl } = options

    try {
      // Check portal availability
      const isAvailable = await this.checkPortalHealth()
      
      if (!isAvailable) {
        this.handleUnavailablePortal(options)
        return false
      }

      // Build portal URL with parameters
      const portalUrl = this.buildPortalUrl({
        route: PORTAL_ROUTES.LOGIN,
        source,
        service,
        campaign,
        userType,
        returnUrl
      })

      // Track navigation attempt
      this.trackPortalNavigation(options)

      // Open portal (preferably in same tab for better UX)
      if (this.isCurrentDomainMarketing()) {
        window.open(portalUrl, '_blank', 'noopener,noreferrer')
      } else {
        window.location.href = portalUrl
      }

      return true
    } catch (error) {
      this.handleNavigationError(error, options)
      return false
    }
  }

  /**
   * Check portal health with caching
   */
  async checkPortalHealth(): Promise<boolean> {
    const cacheKey = 'portal_health'
    const cached = this.healthCache.get(cacheKey)
    
    if (cached && Date.now() - cached.lastChecked < this.CACHE_TTL) {
      return cached.available
    }

    const startTime = Date.now()
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${DOMAINS.SAAS}/api/health`, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors' // Avoid CORS for simple health checks
      })

      clearTimeout(timeoutId)
      
      const result: HealthCheckResult = {
        available: true,
        responseTime: Date.now() - startTime,
        lastChecked: Date.now()
      }

      this.healthCache.set(cacheKey, result)
      return true

    } catch (error) {
      const result: HealthCheckResult = {
        available: false,
        responseTime: Date.now() - startTime,
        lastChecked: Date.now()
      }

      this.healthCache.set(cacheKey, result)
      return false
    }
  }

  /**
   * Build portal URL with tracking parameters
   */
  private buildPortalUrl(params: {
    route: string
    source: string
    service?: string
    campaign?: string
    userType?: string
    returnUrl?: string
  }): string {
    const url = new URL(`${DOMAINS.SAAS}${params.route}`)
    
    // Add tracking parameters
    url.searchParams.set('source', params.source)
    url.searchParams.set('referrer', this.getCurrentDomain())
    url.searchParams.set('timestamp', Date.now().toString())

    if (params.service) {
      url.searchParams.set('service', params.service)
    }

    if (params.campaign) {
      url.searchParams.set('campaign', params.campaign)
    }

    if (params.userType) {
      url.searchParams.set('userType', params.userType)
    }

    if (params.returnUrl) {
      url.searchParams.set('returnUrl', encodeURIComponent(params.returnUrl))
    }

    return url.toString()
  }

  /**
   * Handle portal unavailable scenario
   */
  private handleUnavailablePortal(options: PortalNavigationOptions): void {
    // Track unavailable portal attempt
    this.trackPortalUnavailable(options)

    // Show user-friendly message
    if (typeof window !== 'undefined') {
      const message = this.getUnavailableMessage(options.source)
      
      // Use modern browser APIs if available
      if ('showNotification' in window) {
        this.showNotification(message)
      } else {
        alert(message)
      }

      // Optionally redirect to contact form
      if (options.source === TRACKING_SOURCES.HERO) {
        this.redirectToContact()
      }
    }
  }

  /**
   * Handle navigation errors
   */
  private handleNavigationError(error: any, options: PortalNavigationOptions): void {
    
    // Track error
    this.trackPortalError(error, options)
    
    // Provide fallback options
    const fallbackMessage = `
      Unable to access the portal right now. 
      Please try again or contact us at (830) 201-0414.
      
      Alternative: Visit app.summitadvisoryfirm.com directly.
    `
    
    if (confirm(fallbackMessage + '\n\nWould you like to try again?')) {
      setTimeout(() => this.navigateToPortal(options), 1000)
    }
  }

  /**
   * Tracking methods
   */
  private trackPortalNavigation(options: PortalNavigationOptions): void {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', 'portal_navigation', {
        'source': options.source,
        'service': options.service || 'general',
        'campaign': options.campaign || 'organic',
        'user_type': options.userType || 'unknown',
        'destination_domain': 'app.summitadvisoryfirm.com'
      })
    }

    // Custom analytics
    this.sendCustomAnalytics('portal_navigation', options)
  }

  private trackPortalUnavailable(options: PortalNavigationOptions): void {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'portal_unavailable', {
        'source': options.source,
        'attempted_service': options.service || 'general'
      })
    }

    this.sendCustomAnalytics('portal_unavailable', options)
  }

  private trackPortalError(error: any, options: PortalNavigationOptions): void {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'portal_error', {
        'source': options.source,
        'error_type': error.name || 'unknown',
        'error_message': error.message || 'unknown'
      })
    }

    this.sendCustomAnalytics('portal_error', { ...options, error: error.message })
  }

  /**
   * Utility methods
   */
  private isCurrentDomainMarketing(): boolean {
    return typeof window !== 'undefined' && 
           window.location.hostname.includes('summitadvisoryfirm.com') &&
           !window.location.hostname.includes('app.')
  }

  private getCurrentDomain(): string {
    if (typeof window === 'undefined') return ''
    return window.location.hostname
  }

  private getUnavailableMessage(source: string): string {
    const baseMessage = 'The guard portal is temporarily unavailable.'
    
    switch (source) {
      case TRACKING_SOURCES.HERO:
        return `${baseMessage} Please contact us at (830) 201-0414 to get started.`
      case TRACKING_SOURCES.SERVICES:
        return `${baseMessage} We'll help you manage this service directly.`
      default:
        return `${baseMessage} Please try again in a few minutes.`
    }
  }

  private showNotification(message: string): void {
    // Modern notification implementation would go here
    // For now, fallback to alert
    alert(message)
  }

  private redirectToContact(): void {
    if (typeof window !== 'undefined') {
      const contactUrl = `${this.getCurrentDomain()}#contact`
      window.location.href = contactUrl
    }
  }

  private sendCustomAnalytics(event: string, data: any): void {
    // Custom analytics integration
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(event, data)
    }

    // PostHog integration
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture(event, data)
    }
  }
}

/**
 * Cross-domain messaging utility
 * Enables communication between marketing site and SaaS platform
 */
export class CrossDomainMessenger {
  private listeners: Map<string, Function[]> = new Map()

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleMessage.bind(this))
    }
  }

  /**
   * Send message to other domain
   */
  sendMessage(targetDomain: string, message: CrossDomainMessage): void {
    if (typeof window === 'undefined') return

    const targetWindow = window.parent !== window ? window.parent : window

    try {
      targetWindow.postMessage(message, targetDomain)
    } catch (error) {
    }
  }

  /**
   * Listen for messages of specific type
   */
  on(messageType: CrossDomainMessage['type'], callback: Function): void {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, [])
    }
    this.listeners.get(messageType)!.push(callback)
  }

  /**
   * Remove message listener
   */
  off(messageType: CrossDomainMessage['type'], callback: Function): void {
    const listeners = this.listeners.get(messageType)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(event: MessageEvent): void {
    // Verify origin
    if (!this.isValidOrigin(event.origin)) {
      return
    }

    try {
      const message = event.data as CrossDomainMessage
      const listeners = this.listeners.get(message.type)
      
      if (listeners) {
        listeners.forEach(callback => callback(message))
      }
    } catch (error) {
    }
  }

  /**
   * Validate message origin
   */
  private isValidOrigin(origin: string): boolean {
    return origin === DOMAINS.MARKETING || origin === DOMAINS.SAAS
  }
}

// Singleton instances
export const portalNavigator = PortalNavigator.getInstance()
export const crossDomainMessenger = new CrossDomainMessenger()

// Convenience functions
export const navigateToPortal = (options: PortalNavigationOptions) => 
  portalNavigator.navigateToPortal(options)

export const checkPortalHealth = () => 
  portalNavigator.checkPortalHealth()

// React hooks for easy integration
export function usePortalNavigation() {
  return {
    navigateToPortal: (options: PortalNavigationOptions) => 
      portalNavigator.navigateToPortal(options),
    checkHealth: () => 
      portalNavigator.checkPortalHealth()
  }
}

export function useCrossDomainMessaging() {
  return {
    sendMessage: (targetDomain: string, message: CrossDomainMessage) =>
      crossDomainMessenger.sendMessage(targetDomain, message),
    on: (type: CrossDomainMessage['type'], callback: Function) =>
      crossDomainMessenger.on(type, callback),
    off: (type: CrossDomainMessage['type'], callback: Function) =>
      crossDomainMessenger.off(type, callback)
  }
}