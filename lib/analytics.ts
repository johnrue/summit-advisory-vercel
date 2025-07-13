// Analytics utilities for Google Analytics 4
// Provides GDPR-compliant tracking with consent management

declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

// Initialize GDPR-compliant consent mode
export const initializeGAConsent = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    // Set default consent to denied for GDPR compliance
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    })

    // Enable basic functionality without cookies
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      ads_data_redaction: true,
    })
  }
}

// Update consent when user accepts
export const updateGAConsent = (accepted: boolean) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', 'update', {
      ad_storage: accepted ? 'granted' : 'denied',
      analytics_storage: accepted ? 'granted' : 'denied',
    })
  }
}

// Track page views
export const trackPageView = (path: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_path: path,
    })
  }
}

// Track custom events
export const trackEvent = (action: string, parameters?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      ...parameters,
    })
  }
}

// Common event trackers
export const analytics = {
  // Contact form events
  contactFormStart: () => trackEvent('contact_form_start'),
  contactFormSubmit: () => trackEvent('contact_form_submit'),
  contactFormSuccess: () => trackEvent('contact_form_success'),
  contactFormError: (error: string) => trackEvent('contact_form_error', { error }),

  // Service page events
  servicePageView: (service: string) => trackEvent('service_page_view', { service }),
  
  // Call-to-action events
  ctaClick: (cta_name: string, location: string) => 
    trackEvent('cta_click', { cta_name, location }),
  
  // Phone/email clicks
  phoneClick: () => trackEvent('phone_click'),
  emailClick: () => trackEvent('email_click'),

  // QR code tracking events
  qrCodeScan: (campaign?: string, source?: string) => 
    trackEvent('qr_code_scan', { campaign: campaign || 'default', source: source || 'unknown' }),
  qrRedirectSuccess: (campaign?: string) => 
    trackEvent('qr_redirect_success', { campaign: campaign || 'default' }),
  qrRedirectError: (error: string, campaign?: string) => 
    trackEvent('qr_redirect_error', { error, campaign: campaign || 'default' }),
  qrManualRedirect: (campaign?: string) => 
    trackEvent('qr_manual_redirect', { campaign: campaign || 'default' }),
}