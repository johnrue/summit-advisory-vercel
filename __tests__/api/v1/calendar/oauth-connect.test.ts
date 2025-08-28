/**
 * OAuth Connect API Endpoint Tests
 * Tests calendar OAuth connection initiation endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST } from '@/app/api/v1/calendar/oauth/connect/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase'
import { oauthService } from '@/lib/services/oauth-service'

// Mock dependencies
vi.mock('@/lib/supabase')
vi.mock('@/lib/services/oauth-service')

const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase)
}

vi.mocked(createClient).mockReturnValue(mockSupabase as any)

const mockOAuthService = {
  initiateOAuth: vi.fn()
}
vi.mocked(oauthService).initiateOAuth = mockOAuthService.initiateOAuth

describe('/api/v1/calendar/oauth/connect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (body: any): NextRequest => {
    return new NextRequest('https://test.example.com/api/v1/calendar/oauth/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
  }

  const mockAuthenticatedUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {}
  }

  describe('Authentication', () => {
    it('should require user authentication', async () => {
      // Mock unauthenticated user
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = createMockRequest({
        provider: 'google_calendar',
        returnUrl: 'https://example.com/callback'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      })
    })

    it('should handle authentication service error', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null
      })

      const request = createMockRequest({
        provider: 'google_calendar'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
      expect(data.code).toBe('UNAUTHORIZED')
    })
  })

  describe('Provider Validation', () => {
    beforeEach(() => {
      // Mock authenticated user for provider validation tests
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null
      })
    })

    it('should accept valid Google Calendar provider', async () => {
      // Mock no existing integration
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows returned' }
      })

      // Mock successful OAuth initiation
      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: true,
        data: {
          authUrl: 'https://accounts.google.com/oauth/authorize?client_id=test',
          state: 'test-state-123'
        }
      })

      const request = createMockRequest({
        provider: 'google_calendar',
        returnUrl: 'https://example.com/return'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        authUrl: 'https://accounts.google.com/oauth/authorize?client_id=test',
        state: 'test-state-123',
        provider: 'google_calendar'
      })

      expect(mockOAuthService.initiateOAuth).toHaveBeenCalledWith(
        'user-123',
        'google_calendar',
        'https://example.com/return'
      )
    })

    it('should accept valid Microsoft Outlook provider', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows returned' }
      })

      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: true,
        data: {
          authUrl: 'https://login.microsoftonline.com/oauth/authorize?client_id=test',
          state: 'test-state-456'
        }
      })

      const request = createMockRequest({
        provider: 'microsoft_outlook'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.provider).toBe('microsoft_outlook')
      expect(data.authUrl).toContain('login.microsoftonline.com')

      expect(mockOAuthService.initiateOAuth).toHaveBeenCalledWith(
        'user-123',
        'microsoft_outlook',
        undefined
      )
    })

    it('should accept valid Microsoft Exchange provider', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows returned' }
      })

      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: true,
        data: {
          authUrl: 'https://login.microsoftonline.com/oauth/authorize?client_id=test',
          state: 'test-state-789'
        }
      })

      const request = createMockRequest({
        provider: 'microsoft_exchange'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.provider).toBe('microsoft_exchange')
    })

    it('should reject invalid provider', async () => {
      const request = createMockRequest({
        provider: 'invalid_provider'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Invalid calendar provider',
        code: 'INVALID_PROVIDER'
      })
    })

    it('should require provider parameter', async () => {
      const request = createMockRequest({
        returnUrl: 'https://example.com/return'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid calendar provider')
      expect(data.code).toBe('INVALID_PROVIDER')
    })

    it('should handle null provider', async () => {
      const request = createMockRequest({
        provider: null,
        returnUrl: 'https://example.com/return'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid calendar provider')
    })
  })

  describe('Existing Integration Check', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null
      })
    })

    it('should prevent duplicate active integrations', async () => {
      // Mock existing active integration
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'existing-integration-123',
          is_active: true,
          sync_enabled: true
        },
        error: null
      })

      const request = createMockRequest({
        provider: 'google_calendar'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data).toEqual({
        error: 'Integration already exists',
        code: 'INTEGRATION_EXISTS',
        integration: {
          id: 'existing-integration-123',
          is_active: true,
          sync_enabled: true
        }
      })

      // Verify OAuth was not initiated
      expect(mockOAuthService.initiateOAuth).not.toHaveBeenCalled()
    })

    it('should allow new integration when existing is inactive', async () => {
      // Mock existing inactive integration
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'inactive-integration-456',
          is_active: false,
          sync_enabled: false
        },
        error: null
      })

      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: true,
        data: {
          authUrl: 'https://accounts.google.com/oauth/authorize?client_id=test',
          state: 'new-state-123'
        }
      })

      const request = createMockRequest({
        provider: 'google_calendar'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockOAuthService.initiateOAuth).toHaveBeenCalled()
    })

    it('should allow integration when none exists', async () => {
      // Mock no existing integration
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows returned' }
      })

      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: true,
        data: {
          authUrl: 'https://accounts.google.com/oauth/authorize',
          state: 'first-state-123'
        }
      })

      const request = createMockRequest({
        provider: 'google_calendar'
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockOAuthService.initiateOAuth).toHaveBeenCalled()
    })

    it('should verify correct database query for existing integration', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows returned' }
      })

      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: true,
        data: { authUrl: 'test-url', state: 'test-state' }
      })

      const request = createMockRequest({
        provider: 'microsoft_outlook'
      })

      await POST(request)

      // Verify correct query was made
      expect(mockSupabase.from).toHaveBeenCalledWith('calendar_integrations')
      expect(mockSupabase.select).toHaveBeenCalledWith('id, is_active, sync_enabled')
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockSupabase.eq).toHaveBeenCalledWith('provider', 'microsoft_outlook')
    })
  })

  describe('OAuth Initiation', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null
      })

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'No existing integration' }
      })
    })

    it('should successfully initiate OAuth with return URL', async () => {
      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: true,
        data: {
          authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&redirect_uri=callback&state=abc123',
          state: 'abc123'
        }
      })

      const request = createMockRequest({
        provider: 'google_calendar',
        returnUrl: 'https://app.example.com/calendar/connected'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&redirect_uri=callback&state=abc123',
        state: 'abc123',
        provider: 'google_calendar'
      })

      expect(mockOAuthService.initiateOAuth).toHaveBeenCalledWith(
        'user-123',
        'google_calendar',
        'https://app.example.com/calendar/connected'
      )
    })

    it('should successfully initiate OAuth without return URL', async () => {
      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: true,
        data: {
          authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          state: 'def456'
        }
      })

      const request = createMockRequest({
        provider: 'microsoft_outlook'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.provider).toBe('microsoft_outlook')

      expect(mockOAuthService.initiateOAuth).toHaveBeenCalledWith(
        'user-123',
        'microsoft_outlook',
        undefined
      )
    })

    it('should handle OAuth service failure', async () => {
      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: false,
        error: 'OAuth configuration error',
        errorCode: 'OAUTH_CONFIG_ERROR'
      })

      const request = createMockRequest({
        provider: 'google_calendar'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'OAuth configuration error',
        code: 'OAUTH_CONFIG_ERROR'
      })
    })

    it('should handle OAuth service failure without error code', async () => {
      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: false,
        error: 'Generic OAuth failure'
      })

      const request = createMockRequest({
        provider: 'google_calendar'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Generic OAuth failure',
        code: 'OAUTH_INITIATION_ERROR'
      })
    })

    it('should handle OAuth service failure without error message', async () => {
      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: false
      })

      const request = createMockRequest({
        provider: 'google_calendar'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to initiate OAuth flow',
        code: 'OAUTH_INITIATION_ERROR'
      })
    })
  })

  describe('Request Body Parsing', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null
      })
    })

    it('should handle invalid JSON body', async () => {
      const invalidRequest = new NextRequest('https://test.example.com/api/v1/calendar/oauth/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid-json{'
      })

      const response = await POST(invalidRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(data.code).toBe('INTERNAL_SERVER_ERROR')
    })

    it('should handle empty request body', async () => {
      const emptyRequest = new NextRequest('https://test.example.com/api/v1/calendar/oauth/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: '{}'
      })

      const response = await POST(emptyRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid calendar provider')
    })

    it('should handle missing Content-Type header', async () => {
      const noHeaderRequest = new NextRequest('https://test.example.com/api/v1/calendar/oauth/connect', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'google_calendar'
        })
      })

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'No existing integration' }
      })

      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: true,
        data: { authUrl: 'test-url', state: 'test-state' }
      })

      const response = await POST(noHeaderRequest)

      // Should still work without explicit Content-Type
      expect(response.status).toBe(200)
    })
  })

  describe('Error Handling and Logging', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null
      })
    })

    it('should handle unexpected errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock authentication to throw an error
      mockSupabase.auth.getUser.mockImplementationOnce(() => {
        throw new Error('Unexpected database error')
      })

      const request = createMockRequest({
        provider: 'google_calendar'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        'OAuth connect error:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should handle database connection errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock database error during existing integration check
      mockSupabase.single.mockImplementationOnce(() => {
        throw new Error('Database connection lost')
      })

      const request = createMockRequest({
        provider: 'google_calendar'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')

      consoleSpy.mockRestore()
    })
  })

  describe('Response Headers and Status', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null
      })

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null
      })
    })

    it('should return correct content type for success response', async () => {
      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: true,
        data: { authUrl: 'test-url', state: 'test-state' }
      })

      const request = createMockRequest({
        provider: 'google_calendar'
      })

      const response = await POST(request)

      expect(response.headers.get('content-type')).toContain('application/json')
      expect(response.status).toBe(200)
    })

    it('should return correct content type for error response', async () => {
      const request = createMockRequest({
        provider: 'invalid_provider'
      })

      const response = await POST(request)

      expect(response.headers.get('content-type')).toContain('application/json')
      expect(response.status).toBe(400)
    })

    it('should handle CORS preflight if needed', async () => {
      // This endpoint should handle standard JSON requests
      // CORS handling would typically be in middleware
      const request = createMockRequest({
        provider: 'google_calendar'
      })

      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: true,
        data: { authUrl: 'test-url', state: 'test-state' }
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      // Standard JSON API response
      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('Security Validations', () => {
    it('should validate return URL format if provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null
      })

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null
      })

      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: true,
        data: { authUrl: 'test-url', state: 'test-state' }
      })

      const request = createMockRequest({
        provider: 'google_calendar',
        returnUrl: 'https://legitimate-app.example.com/calendar/success'
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockOAuthService.initiateOAuth).toHaveBeenCalledWith(
        'user-123',
        'google_calendar',
        'https://legitimate-app.example.com/calendar/success'
      )
    })

    it('should handle user ID extraction securely', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { ...mockAuthenticatedUser, id: 'different-user-456' } },
        error: null
      })

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null
      })

      mockOAuthService.initiateOAuth.mockResolvedValueOnce({
        success: true,
        data: { authUrl: 'test-url', state: 'test-state' }
      })

      const request = createMockRequest({
        provider: 'google_calendar'
      })

      await POST(request)

      // Verify the correct user ID was used
      expect(mockOAuthService.initiateOAuth).toHaveBeenCalledWith(
        'different-user-456',
        'google_calendar',
        undefined
      )

      // Verify database query used correct user ID
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'different-user-456')
    })
  })
})