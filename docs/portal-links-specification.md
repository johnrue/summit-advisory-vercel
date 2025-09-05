# Portal Links Specification

## Overview
This document specifies the portal links that need to be implemented on the marketing site (https://github.com/johnrue/summit-advisory-amplify.git) to enable seamless navigation to the SaaS platform at app.summitadvisoryfirm.com.

## Marketing Site Repository
- **Repository**: https://github.com/johnrue/summit-advisory-amplify.git
- **Domain**: summitadvisoryfirm.com (AWS Amplify)
- **Status**: ✅ LIVE and operational

## SaaS Platform Target
- **Repository**: Current repository (summit-advisory-vercel)
- **Target Domain**: app.summitadvisoryfirm.com (AWS EC2/ALB)
- **Status**: 📋 To be deployed

## Required Portal Links

### 1. Primary CTA Button - Hero Section
**Location**: Homepage hero section
**Text**: "Access Portal" or "Get Started"
**URL**: `https://app.summitadvisoryfirm.com/auth/login`
**Style**: Primary button with Summit Advisory branding

```html
<a 
  href="https://app.summitadvisoryfirm.com/auth/login"
  className="btn btn-primary"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Access Summit Advisory Guard Management Platform"
>
  Access Portal
</a>
```

### 2. Navigation Menu Link
**Location**: Main navigation menu
**Text**: "Portal"
**URL**: `https://app.summitadvisoryfirm.com/auth/login`
**Position**: After "Services", before "Contact"

```html
<nav>
  <a href="#home">Home</a>
  <a href="#services">Services</a>
  <a href="https://app.summitadvisoryfirm.com/auth/login" target="_blank" rel="noopener">Portal</a>
  <a href="#contact">Contact</a>
</nav>
```

### 3. Services Section CTAs
**Location**: Each service card in services section
**Text**: "Manage This Service"
**URL**: `https://app.summitadvisoryfirm.com/auth/login?service={service-type}`
**Conditional**: Only show for authenticated users or all users based on business rules

```html
<!-- Example for Executive Protection service -->
<div className="service-card">
  <h3>Executive Protection</h3>
  <p>Professional executive security services...</p>
  <a 
    href="https://app.summitadvisoryfirm.com/auth/login?service=executive-protection"
    className="btn btn-outline"
    target="_blank"
    rel="noopener noreferrer"
  >
    Manage This Service
  </a>
</div>
```

### 4. Footer Portal Link
**Location**: Footer section
**Text**: "Guard Portal"
**URL**: `https://app.summitadvisoryfirm.com/auth/login`
**Section**: Quick Links or Services section

```html
<footer>
  <div className="footer-section">
    <h4>Quick Links</h4>
    <ul>
      <li><a href="#services">Services</a></li>
      <li><a href="#about">About</a></li>
      <li><a href="#contact">Contact</a></li>
      <li><a href="https://app.summitadvisoryfirm.com/auth/login" target="_blank">Guard Portal</a></li>
    </ul>
  </div>
</footer>
```

### 5. Contact Form Success - Portal Suggestion
**Location**: Contact form success message
**Text**: "For existing clients: Access your portal"
**URL**: `https://app.summitadvisoryfirm.com/auth/login`
**Display**: After successful form submission

```html
<div className="success-message">
  <h3>Thank you for your inquiry!</h3>
  <p>We'll be in touch within 24 hours.</p>
  <div className="portal-suggestion">
    <p>
      <strong>Existing clients:</strong> 
      <a href="https://app.summitadvisoryfirm.com/auth/login" target="_blank">
        Access your portal here
      </a>
    </p>
  </div>
</div>
```

## Cross-Domain Integration Features

### 1. URL Parameters for Campaign Tracking
Support marketing campaign tracking through URL parameters:

```javascript
// Example URLs with tracking
https://app.summitadvisoryfirm.com/auth/login?source=marketing-hero
https://app.summitadvisoryfirm.com/auth/login?source=services-card&service=patrol
https://app.summitadvisoryfirm.com/auth/login?source=footer-link
https://app.summitadvisoryfirm.com/auth/login?source=contact-success
```

### 2. Graceful 404 Fallback
If SaaS platform is unavailable, implement graceful fallback:

```javascript
// Check if SaaS platform is available
async function checkSaaSAvailability() {
  try {
    const response = await fetch('https://app.summitadvisoryfirm.com/api/health', {
      method: 'HEAD',
      timeout: 5000
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Fallback behavior
function handlePortalLink(e) {
  e.preventDefault();
  
  checkSaaSAvailability().then(isAvailable => {
    if (isAvailable) {
      window.open('https://app.summitadvisoryfirm.com/auth/login', '_blank');
    } else {
      // Show fallback modal or redirect to contact form
      showUnavailableModal();
    }
  });
}
```

### 3. Session Continuity
Preserve user context when navigating between domains:

```javascript
// Pass user context via URL parameters (non-sensitive data only)
const portalUrl = new URL('https://app.summitadvisoryfirm.com/auth/login');

// Add marketing context
portalUrl.searchParams.set('source', 'marketing-site');
portalUrl.searchParams.set('campaign', getCurrentCampaign());
portalUrl.searchParams.set('referrer', window.location.hostname);

window.open(portalUrl.toString(), '_blank');
```

## Styling Guidelines

### 1. Visual Consistency
Portal links should maintain visual consistency with existing marketing site design:

```css
.portal-link {
  /* Match existing button styles */
  background-color: #d4af37; /* Summit Advisory gold */
  color: #1a1a1a;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
}

.portal-link:hover {
  background-color: #b8941f;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.portal-link-outline {
  background-color: transparent;
  border: 2px solid #d4af37;
  color: #d4af37;
}

.portal-link-outline:hover {
  background-color: #d4af37;
  color: #1a1a1a;
}
```

### 2. Icons and Visual Indicators
Consider adding icons to indicate external links:

```html
<a href="https://app.summitadvisoryfirm.com/auth/login" target="_blank">
  Portal
  <svg className="external-link-icon" width="16" height="16" viewBox="0 0 24 24">
    <path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7Z"/>
    <path d="M19 19H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7Z"/>
  </svg>
</a>
```

## Analytics Integration

### 1. Track Portal Link Clicks
Implement analytics tracking for portal link usage:

```javascript
// Google Analytics 4 event tracking
function trackPortalClick(source, service = null) {
  gtag('event', 'portal_link_click', {
    'source': source,
    'service': service,
    'destination_domain': 'app.summitadvisoryfirm.com'
  });
}

// Usage example
<a 
  href="https://app.summitadvisoryfirm.com/auth/login?source=hero"
  onClick={() => trackPortalClick('hero')}
  target="_blank"
>
  Access Portal
</a>
```

### 2. Conversion Tracking
Track the success of marketing site to SaaS platform conversions:

```javascript
// Track conversion funnel
gtag('event', 'marketing_to_saas_navigation', {
  'source_page': window.location.pathname,
  'destination': 'auth_login',
  'user_type': 'prospect' // or 'client' if known
});
```

## Mobile Optimization

### 1. Mobile-First Portal Links
Ensure portal links work well on mobile devices:

```css
@media (max-width: 768px) {
  .portal-link {
    display: block;
    width: 100%;
    text-align: center;
    margin: 16px 0;
    font-size: 16px; /* Prevent zoom on iOS */
  }
  
  .mobile-portal-sticky {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    border-radius: 50px;
    padding: 16px 24px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
}
```

### 2. Touch-Friendly Design
Ensure touch targets meet accessibility guidelines (44px minimum):

```css
.portal-link {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
}
```

## Implementation Checklist

- [ ] Add primary CTA button in hero section
- [ ] Add portal link to main navigation menu
- [ ] Add service-specific portal links to service cards
- [ ] Add portal link to footer
- [ ] Add portal suggestion to contact form success state
- [ ] Implement 404 fallback for SaaS unavailability
- [ ] Add analytics tracking for portal link clicks
- [ ] Test mobile responsiveness and touch targets
- [ ] Verify cross-domain navigation works correctly
- [ ] Test URL parameter passing for campaign tracking

## Testing Requirements

1. **Cross-Domain Navigation**
   - Verify all portal links open in new tabs
   - Confirm URL parameters are passed correctly
   - Test fallback behavior when SaaS platform is unavailable

2. **Analytics Tracking**
   - Verify portal link clicks are tracked in Google Analytics
   - Confirm campaign parameters are captured
   - Test conversion funnel tracking

3. **Mobile Experience**
   - Test portal links on various mobile devices
   - Verify touch targets meet accessibility standards
   - Confirm responsive design works correctly

4. **Performance**
   - Ensure portal links don't impact marketing site performance
   - Verify health check calls don't slow down page loading
   - Test timeout handling for availability checks