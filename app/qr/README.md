# QR Code Redirect Page

## Overview
The `/qr` route serves as a smart redirect landing page for QR code marketing campaigns. It provides analytics tracking, branded user experience, and flexible campaign management.

## Features

### Core Functionality
- **Automatic redirect** to homepage after 3-second countdown
- **Manual redirect option** with "Continue Now" button
- **Error handling** with fallback navigation options
- **Mobile-optimized** responsive design for QR code scanning

### Analytics Tracking
- **QR scan events** with campaign and source parameters
- **Device information** and user agent tracking
- **Redirect success/failure** monitoring
- **Error logging** for troubleshooting

### SEO Optimization
- **noindex/nofollow** meta tags to prevent search indexing
- **Meta refresh** fallback for non-JavaScript users
- **Proper error boundaries** for graceful failures

## Usage Examples

### Basic QR Code URL
```
https://yoursite.com/qr
```

### Campaign Tracking
```
https://yoursite.com/qr?campaign=flyer-downtown&source=business-cards
https://yoursite.com/qr?campaign=trade-show-2024&source=booth-display
```

### Parameters
- `campaign` - Marketing campaign identifier
- `source` - QR code source/location identifier

## Analytics Events

The page tracks the following Google Analytics events:
- `qr_code_scan` - When page loads
- `qr_redirect_success` - Successful automatic redirect
- `qr_redirect_error` - Failed redirect attempt
- `qr_manual_redirect` - Manual "Continue Now" button click
- `qr_page_error` - Page error boundary triggered
- `qr_error_retry` - Error page retry attempt

## File Structure
```
app/qr/
├── page.tsx          # Main redirect component
├── layout.tsx        # SEO metadata and layout
├── loading.tsx       # Loading state component
├── error.tsx         # Error boundary component
└── README.md         # This documentation
```

## Customization

### Redirect Timing
Modify the countdown timer in `page.tsx`:
```typescript
const [countdown, setCountdown] = useState(3) // Change from 3 seconds
```

### Destination URL
Update the redirect destination:
```typescript
router.push('/') // Change from homepage
```

### Campaign Tracking
Add additional URL parameters for more detailed tracking as needed.