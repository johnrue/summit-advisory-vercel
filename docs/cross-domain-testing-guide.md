# Cross-Domain Integration Testing Guide

## Overview
This guide provides comprehensive testing procedures for validating the integration between the marketing site (summitadvisoryfirm.com) and the SaaS platform (app.summitadvisoryfirm.com).

## Testing Environment Setup

### Prerequisites
- **Marketing Site**: https://summitadvisoryfirm.com (AWS Amplify - LIVE)
- **SaaS Platform**: app.summitadvisoryfirm.com (AWS EC2 - TO BE DEPLOYED)
- **Testing Domains**: Use staging/development subdomains for testing
- **Browser Tools**: Developer tools, network tab, console access
- **Analytics**: Google Analytics 4 access for tracking validation

### Test Data Preparation
```javascript
// Test portal navigation scenarios
const testScenarios = [
  {
    source: 'hero',
    expectedUrl: 'app.summitadvisoryfirm.com/auth/login?source=hero',
    userType: 'prospect'
  },
  {
    source: 'services',
    service: 'patrol',
    expectedUrl: 'app.summitadvisoryfirm.com/auth/login?source=services&service=patrol',
    userType: 'client'
  },
  {
    source: 'mobile-fab',
    expectedUrl: 'app.summitadvisoryfirm.com/auth/login?source=mobile-fab&device=mobile',
    userType: 'guard'
  }
]
```

## Testing Procedures

### 1. Portal Link Functionality Tests

#### Test 1.1: Basic Portal Navigation
**Objective**: Verify all portal links navigate to correct SaaS platform URLs

**Steps**:
1. Navigate to marketing site homepage
2. Click hero "Access Portal" button
3. Verify new tab opens with correct URL
4. Check URL parameters are preserved
5. Repeat for navigation menu portal link
6. Test footer portal link
7. Test service-specific portal buttons

**Expected Results**:
- New tab opens to `app.summitadvisoryfirm.com/auth/login`
- URL contains correct `source` parameter
- Service-specific links include `service` parameter
- All links open in new tabs with `noopener noreferrer`

**Validation Script**:
```javascript
// Run in browser console on marketing site
function testPortalLinks() {
  const portalLinks = document.querySelectorAll('[href*="app.summitadvisoryfirm.com"]')
  
  portalLinks.forEach((link, index) => {
    console.log(`Link ${index + 1}:`, {
      href: link.href,
      target: link.target,
      rel: link.rel,
      text: link.textContent.trim()
    })
  })
  
  console.log(`Total portal links found: ${portalLinks.length}`)
}

testPortalLinks()
```

#### Test 1.2: Mobile Portal Access
**Objective**: Verify mobile-specific portal access works correctly

**Steps**:
1. Open marketing site on mobile device (or simulate with dev tools)
2. Verify mobile FAB is visible and positioned correctly
3. Tap mobile FAB to expand menu
4. Tap "Open Portal" button
5. Verify portal opens in new tab with mobile-specific parameters

**Expected Results**:
- Mobile FAB appears only on mobile viewports (<768px)
- FAB expands to show portal access options
- Portal opens with `device=mobile` parameter
- Touch targets meet 44px minimum size requirement

#### Test 1.3: Portal Availability Checking
**Objective**: Verify graceful handling when SaaS platform is unavailable

**Steps**:
1. Block network requests to `app.summitadvisoryfirm.com` (dev tools Network tab)
2. Click portal link with availability checking enabled
3. Verify fallback behavior activates
4. Check error messaging is user-friendly
5. Verify analytics tracking for unavailable portal

**Expected Results**:
- Health check fails gracefully within 3-5 second timeout
- User sees appropriate error message with contact information
- Analytics event `portal_unavailable` is tracked
- Fallback options are presented (contact form, phone number)

### 2. Cross-Domain Parameter Passing Tests

#### Test 2.1: Campaign Tracking Parameters
**Objective**: Verify campaign and source tracking works across domains

**Steps**:
1. Add campaign parameters to marketing site URL: `?utm_campaign=summer2024&utm_source=google`
2. Click portal link
3. Verify campaign parameters are passed to SaaS platform
4. Check analytics tracking includes campaign data

**Expected Results**:
- SaaS platform receives campaign parameters
- Analytics events include campaign information
- User journey is trackable across domains

**Validation Script**:
```javascript
// Run on SaaS platform to check received parameters
function checkReceivedParams() {
  const urlParams = new URLSearchParams(window.location.search)
  
  console.log('Portal URL Parameters:', {
    source: urlParams.get('source'),
    service: urlParams.get('service'),
    campaign: urlParams.get('campaign'),
    referrer: urlParams.get('referrer'),
    timestamp: urlParams.get('timestamp')
  })
}

checkReceivedParams()
```

#### Test 2.2: Service-Specific Navigation
**Objective**: Verify service-specific portal links work correctly

**Steps**:
1. Navigate to services page on marketing site
2. Click "Manage This Service" on different service cards
3. Verify each opens with correct service parameter
4. Check SaaS platform can interpret service parameters

**Expected Results**:
- Executive Protection → `service=executive-protection`
- Event Security → `service=event-security`
- Patrol Services → `service=patrol`
- SaaS platform pre-selects appropriate service/dashboard

### 3. Analytics and Tracking Tests

#### Test 3.1: Google Analytics 4 Tracking
**Objective**: Verify all portal interactions are tracked correctly

**Steps**:
1. Open browser dev tools and navigate to Network tab
2. Filter for analytics requests (gtag, google-analytics)
3. Click various portal links
4. Verify analytics events are sent with correct parameters
5. Check Google Analytics real-time reports

**Expected Results**:
- `portal_navigation` events tracked with source/service
- `portal_unavailable` events tracked for failed health checks
- `portal_error` events tracked for navigation failures
- Custom dimensions populated correctly

**Analytics Validation Script**:
```javascript
// Mock gtag to capture analytics calls
const originalGtag = window.gtag
const analyticsEvents = []

window.gtag = function(...args) {
  analyticsEvents.push(args)
  console.log('Analytics Event:', args)
  return originalGtag?.apply(this, args)
}

// After testing, review captured events
console.log('All Analytics Events:', analyticsEvents)
```

#### Test 3.2: Custom Analytics Integration
**Objective**: Verify custom analytics platforms receive data

**Steps**:
1. Check for custom analytics implementations (PostHog, Mixpanel, etc.)
2. Test portal navigation with custom analytics active
3. Verify events are sent to all configured platforms
4. Check event data consistency across platforms

### 4. Performance and User Experience Tests

#### Test 4.1: Portal Link Performance
**Objective**: Verify portal links don't impact marketing site performance

**Steps**:
1. Use Lighthouse to audit marketing site performance
2. Measure page load times with and without portal link scripts
3. Check for any blocking network requests
4. Verify health checks don't slow down initial page load

**Expected Results**:
- Marketing site performance scores remain high (>90)
- Portal health checks don't block page rendering
- JavaScript execution time minimal for portal functionality

#### Test 4.2: Cross-Domain Navigation UX
**Objective**: Verify smooth user experience during domain transitions

**Steps**:
1. Test portal navigation flow from user perspective
2. Verify loading states during health checks
3. Check for clear visual feedback during navigation
4. Test fallback scenarios provide clear next steps

**Expected Results**:
- Loading states shown during health checks
- Clear visual feedback for portal navigation
- Error states provide actionable information
- No broken or confusing user flows

### 5. Security and Compliance Tests

#### Test 5.1: Cross-Domain Security
**Objective**: Verify secure cross-domain communication

**Steps**:
1. Verify all portal links use HTTPS
2. Check for proper `rel="noopener noreferrer"` attributes
3. Test cross-domain messaging origin validation
4. Verify no sensitive data passed in URL parameters

**Expected Results**:
- All portal links use HTTPS protocol
- New tabs opened with security attributes
- Cross-domain messages validate origins
- No authentication tokens or sensitive data in URLs

#### Test 5.2: Data Privacy Compliance
**Objective**: Ensure GDPR and privacy compliance

**Steps**:
1. Verify analytics tracking respects user consent
2. Check for proper cookie handling across domains
3. Test opt-out functionality for tracking
4. Verify data minimization in cross-domain parameters

**Expected Results**:
- Analytics only active with user consent
- No unauthorized cross-domain cookies
- Clear opt-out mechanisms available
- Minimal data passed between domains

## Test Automation Scripts

### Automated Cross-Domain Test Suite
```javascript
// Automated test suite for cross-domain integration
describe('Cross-Domain Integration E2E Tests', () => {
  test('Marketing to SaaS navigation flow', async () => {
    await page.goto('https://summitadvisoryfirm.com')
    
    // Test hero CTA
    await page.click('[data-testid="hero-portal-cta"]')
    await page.waitForNavigation()
    
    expect(page.url()).toContain('app.summitadvisoryfirm.com/auth/login')
    expect(page.url()).toContain('source=hero')
  })
  
  test('Service-specific portal navigation', async () => {
    await page.goto('https://summitadvisoryfirm.com/services')
    
    await page.click('[data-service="patrol"] .portal-link')
    await page.waitForNavigation()
    
    expect(page.url()).toContain('service=patrol')
  })
  
  test('Mobile portal access', async () => {
    await page.setViewport({ width: 375, height: 667 })
    await page.goto('https://summitadvisoryfirm.com')
    
    await page.waitForSelector('[data-testid="mobile-portal-fab"]')
    await page.click('[data-testid="mobile-portal-fab"]')
    
    const portalButton = await page.waitForSelector('[data-testid="mobile-portal-open"]')
    await portalButton.click()
    
    expect(page.url()).toContain('device=mobile')
  })
})
```

### Health Check Validation Script
```javascript
// Script to validate portal health check functionality
async function validatePortalHealth() {
  const results = {
    healthEndpointAccessible: false,
    responseTime: null,
    errorHandling: false,
    caching: false
  }
  
  try {
    const startTime = Date.now()
    const response = await fetch('https://app.summitadvisoryfirm.com/api/health')
    results.responseTime = Date.now() - startTime
    results.healthEndpointAccessible = response.ok
    
    // Test error handling
    try {
      await fetch('https://app.summitadvisoryfirm.com/api/nonexistent')
    } catch {
      results.errorHandling = true
    }
    
    // Test caching (second request should be faster)
    const secondStart = Date.now()
    await fetch('https://app.summitadvisoryfirm.com/api/health')
    const secondResponseTime = Date.now() - secondStart
    
    results.caching = secondResponseTime < results.responseTime
    
  } catch (error) {
    console.error('Health check validation failed:', error)
  }
  
  return results
}

// Run validation
validatePortalHealth().then(console.log)
```

## Testing Checklist

### Pre-Deployment Testing
- [ ] All portal links functional on marketing site
- [ ] URL parameters correctly formatted and passed
- [ ] Mobile portal access working across devices
- [ ] Health check fallback behavior tested
- [ ] Analytics tracking verified in all scenarios
- [ ] Performance impact assessed and acceptable
- [ ] Security attributes properly configured
- [ ] Error handling provides clear user guidance

### Post-Deployment Validation
- [ ] End-to-end user flows tested on production domains
- [ ] SSL certificates valid for both domains
- [ ] DNS routing working correctly
- [ ] Cross-domain analytics data flowing properly
- [ ] Mobile responsiveness verified on real devices
- [ ] Load testing completed for both platforms
- [ ] Monitoring and alerts configured
- [ ] Rollback procedures tested and documented

### Ongoing Monitoring
- [ ] Daily health check monitoring
- [ ] Weekly analytics review for cross-domain conversions
- [ ] Monthly performance assessment
- [ ] Quarterly security audit of cross-domain integration
- [ ] User feedback collection for navigation experience

## Troubleshooting Common Issues

### Portal Links Not Working
1. Check browser console for JavaScript errors
2. Verify URL construction is correct
3. Test health check endpoint directly
4. Confirm CORS configuration on SaaS platform
5. Validate SSL certificates for both domains

### Analytics Not Tracking
1. Verify gtag implementation on marketing site
2. Check Google Analytics real-time reports
3. Confirm cross-domain tracking setup
4. Test with analytics debugging tools
5. Validate custom dimension configuration

### Mobile Portal Issues
1. Test viewport detection logic
2. Verify touch target sizes (44px minimum)
3. Check mobile-specific CSS and JavaScript
4. Test on various mobile devices and browsers
5. Validate responsive design breakpoints

### Performance Problems
1. Audit marketing site with Lighthouse
2. Check for blocking network requests
3. Optimize health check timeout settings
4. Review JavaScript bundle sizes
5. Test caching effectiveness for repeat visits

## Success Criteria

The cross-domain integration is considered successful when:

1. **Functionality**: All portal links work correctly across all devices and browsers
2. **Performance**: Marketing site maintains >90 Lighthouse scores
3. **Analytics**: 95%+ of portal clicks are tracked accurately
4. **User Experience**: <2 second navigation time from marketing to SaaS
5. **Reliability**: 99%+ portal availability with graceful fallbacks
6. **Security**: All cross-domain communication secure and compliant
7. **Mobile**: Excellent mobile experience with appropriate touch targets
8. **Monitoring**: Real-time monitoring and alerting in place