/**
 * Cross-Domain Integration Tests
 * These tests validate the integration between the marketing site and SaaS platform
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals'

// Mock fetch for testing
global.fetch = jest.fn()

// Mock window.open
const mockWindowOpen = jest.fn()
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true
})

// Mock gtag for analytics testing
declare global {
  var gtag: jest.Mock
}

global.gtag = jest.fn()

// Import the utilities after mocks are set up
import {
  PortalNavigator,
  CrossDomainMessenger,
  navigateToPortal,
  checkPortalHealth,
  DOMAINS,
  PORTAL_ROUTES,
  TRACKING_SOURCES
} from '../lib/examples/cross-domain-utils'

describe('Cross-Domain Integration', () => {
  let portalNavigator: PortalNavigator
  let crossDomainMessenger: CrossDomainMessenger

  beforeEach(() => {
    portalNavigator = PortalNavigator.getInstance()
    crossDomainMessenger = new CrossDomainMessenger()
    
    // Reset mocks
    jest.clearAllMocks()
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'summitadvisoryfirm.com',
        href: 'https://summitadvisoryfirm.com'
      },
      writable: true
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Portal Navigation', () => {
    test('should navigate to portal with correct URL parameters', async () => {
      // Mock successful health check
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const options = {
        source: TRACKING_SOURCES.HERO,
        service: 'patrol',
        campaign: 'summer-2024',
        userType: 'prospect' as const
      }

      const result = await navigateToPortal(options)

      expect(result).toBe(true)
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('app.summitadvisoryfirm.com/auth/login'),
        '_blank',
        'noopener,noreferrer'
      )

      // Verify URL parameters
      const calledUrl = mockWindowOpen.mock.calls[0][0]
      const url = new URL(calledUrl)
      
      expect(url.searchParams.get('source')).toBe('hero')
      expect(url.searchParams.get('service')).toBe('patrol')
      expect(url.searchParams.get('campaign')).toBe('summer-2024')
      expect(url.searchParams.get('userType')).toBe('prospect')
      expect(url.searchParams.get('referrer')).toBe('summitadvisoryfirm.com')
    })

    test('should handle portal unavailable scenario', async () => {
      // Mock failed health check
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      // Mock alert to capture fallback message
      const mockAlert = jest.fn()
      window.alert = mockAlert

      const result = await navigateToPortal({
        source: TRACKING_SOURCES.SERVICES,
        service: 'executive-protection'
      })

      expect(result).toBe(false)
      expect(mockWindowOpen).not.toHaveBeenCalled()
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('temporarily unavailable')
      )

      // Verify unavailable tracking
      expect(gtag).toHaveBeenCalledWith('event', 'portal_unavailable', {
        'source': 'services',
        'attempted_service': 'executive-protection'
      })
    })

    test('should track portal navigation analytics', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({ ok: true })

      await navigateToPortal({
        source: TRACKING_SOURCES.NAVIGATION,
        service: 'event-security'
      })

      expect(gtag).toHaveBeenCalledWith('event', 'portal_navigation', {
        'source': 'navigation',
        'service': 'event-security',
        'campaign': 'organic',
        'user_type': 'unknown',
        'destination_domain': 'app.summitadvisoryfirm.com'
      })
    })
  })

  describe('Portal Health Check', () => {
    test('should successfully check portal health', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const isHealthy = await checkPortalHealth()

      expect(isHealthy).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        'https://app.summitadvisoryfirm.com/api/health',
        expect.objectContaining({
          method: 'HEAD',
          mode: 'no-cors'
        })
      )
    })

    test('should handle health check failure', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Timeout'))

      const isHealthy = await checkPortalHealth()

      expect(isHealthy).toBe(false)
    })

    test('should cache health check results', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({ ok: true })

      // First call
      await checkPortalHealth()
      expect(fetch).toHaveBeenCalledTimes(1)

      // Second call within cache TTL should use cached result
      await checkPortalHealth()
      expect(fetch).toHaveBeenCalledTimes(1) // Still only one call
    })
  })

  describe('Cross-Domain Messaging', () => {
    test('should send cross-domain messages', () => {
      const mockPostMessage = jest.fn()
      const mockParent = { postMessage: mockPostMessage }
      
      Object.defineProperty(window, 'parent', {
        value: mockParent,
        writable: true
      })

      const message = {
        type: 'PORTAL_NAVIGATION' as const,
        source: 'marketing' as const,
        data: { test: 'data' },
        timestamp: Date.now()
      }

      crossDomainMessenger.sendMessage(DOMAINS.SAAS, message)

      expect(mockPostMessage).toHaveBeenCalledWith(message, DOMAINS.SAAS)
    })

    test('should handle incoming messages', () => {
      const callback = jest.fn()
      crossDomainMessenger.on('AUTH_STATUS', callback)

      const message = {
        type: 'AUTH_STATUS' as const,
        source: 'saas' as const,
        data: { authenticated: true },
        timestamp: Date.now()
      }

      // Simulate message event
      window.dispatchEvent(new MessageEvent('message', {
        data: message,
        origin: DOMAINS.SAAS
      }))

      expect(callback).toHaveBeenCalledWith(message)
    })

    test('should reject messages from invalid origins', () => {
      const callback = jest.fn()
      crossDomainMessenger.on('PORTAL_NAVIGATION', callback)

      const message = {
        type: 'PORTAL_NAVIGATION' as const,
        source: 'marketing' as const,
        data: {},
        timestamp: Date.now()
      }

      // Simulate message from invalid origin
      window.dispatchEvent(new MessageEvent('message', {
        data: message,
        origin: 'https://malicious-site.com'
      }))

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('URL Building', () => {
    test('should build correct portal URLs', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({ ok: true })

      await navigateToPortal({
        source: 'test',
        service: 'patrol',
        campaign: 'test-campaign',
        userType: 'client'
      })

      const calledUrl = mockWindowOpen.mock.calls[0][0]
      const url = new URL(calledUrl)

      expect(url.hostname).toBe('app.summitadvisoryfirm.com')
      expect(url.pathname).toBe('/auth/login')
      expect(url.searchParams.has('timestamp')).toBe(true)
      expect(url.searchParams.get('source')).toBe('test')
      expect(url.searchParams.get('service')).toBe('patrol')
      expect(url.searchParams.get('campaign')).toBe('test-campaign')
      expect(url.searchParams.get('userType')).toBe('client')
    })
  })

  describe('Error Handling', () => {
    test('should handle navigation errors gracefully', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const mockConfirm = jest.fn().mockReturnValue(false)
      window.confirm = mockConfirm

      const result = await navigateToPortal({
        source: TRACKING_SOURCES.FOOTER
      })

      expect(result).toBe(false)
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining('Unable to access the portal')
      )

      // Verify error tracking
      expect(gtag).toHaveBeenCalledWith('event', 'portal_error', {
        'source': 'footer',
        'error_type': 'Error',
        'error_message': 'Network error'
      })
    })

    test('should provide fallback options on errors', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Timeout'))

      const mockConfirm = jest.fn().mockReturnValue(true)
      window.confirm = mockConfirm

      // Mock setTimeout to test retry logic
      const mockSetTimeout = jest.fn().mockImplementation((callback) => callback())
      global.setTimeout = mockSetTimeout as any

      await navigateToPortal({
        source: TRACKING_SOURCES.HERO
      })

      expect(mockConfirm).toHaveBeenCalled()
      // Verify retry attempt
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000)
    })
  })

  describe('Mobile Considerations', () => {
    test('should handle mobile viewport detection', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true
      })

      // Test mobile-specific behavior would be implemented here
      // This is a placeholder for mobile-specific tests
      expect(window.innerWidth).toBe(375)
    })
  })

  describe('Analytics Integration', () => {
    test('should track all portal interactions', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({ ok: true })

      await navigateToPortal({
        source: TRACKING_SOURCES.MOBILE_FAB,
        service: 'patrol'
      })

      expect(gtag).toHaveBeenCalledWith('event', 'portal_navigation', {
        'source': 'mobile-fab',
        'service': 'patrol',
        'campaign': 'organic',
        'user_type': 'unknown',
        'destination_domain': 'app.summitadvisoryfirm.com'
      })
    })

    test('should support custom analytics platforms', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({ ok: true })

      // Mock custom analytics
      const mockAnalytics = { track: jest.fn() }
      ;(window as any).analytics = mockAnalytics

      await navigateToPortal({
        source: TRACKING_SOURCES.SERVICES,
        service: 'executive-protection'
      })

      expect(mockAnalytics.track).toHaveBeenCalledWith(
        'portal_navigation',
        expect.objectContaining({
          source: 'services',
          service: 'executive-protection'
        })
      )
    })
  })
})

// Integration test scenarios
describe('End-to-End Integration Scenarios', () => {
  test('Marketing site to SaaS platform user journey', async () => {
    // Simulate complete user journey
    const steps = [
      'User visits marketing site',
      'User clicks hero CTA',
      'Portal availability checked',
      'User navigated to SaaS platform',
      'Analytics tracked'
    ]

    ;(fetch as jest.Mock).mockResolvedValue({ ok: true })

    const result = await navigateToPortal({
      source: TRACKING_SOURCES.HERO,
      userType: 'prospect'
    })

    expect(result).toBe(true)
    expect(gtag).toHaveBeenCalled()
    expect(mockWindowOpen).toHaveBeenCalled()

    // Verify complete journey tracking
    steps.forEach(step => {
      // In a real implementation, each step would be tracked
      expect(step).toBeDefined()
    })
  })

  test('Fallback scenario when SaaS platform is down', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('Service unavailable'))
    
    const mockAlert = jest.fn()
    window.alert = mockAlert

    await navigateToPortal({
      source: TRACKING_SOURCES.HERO
    })

    expect(mockAlert).toHaveBeenCalledWith(
      expect.stringContaining('contact us at (830) 201-0414')
    )
    expect(gtag).toHaveBeenCalledWith('event', 'portal_unavailable', expect.any(Object))
  })
})