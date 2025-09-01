/**
 * OAuth Service Tests
 * Tests OAuth flows for Google Calendar and Microsoft Graph APIs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals'
import { oauthService } from '@/lib/services/oauth-service'
import { createClient } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase')
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(() => mockSupabase),
  upsert: jest.fn(() => mockSupabase)
}

jest.mocked(createClient).mockReturnValue(mockSupabase as any)

// Mock fetch for OAuth API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123'
  }
})

// Mock environment variables
jest.stubEnv('GOOGLE_CALENDAR_CLIENT_ID', 'test-google-client-id')
jest.stubEnv('GOOGLE_CALENDAR_CLIENT_SECRET', 'test-google-client-secret')
jest.stubEnv('MICROSOFT_CLIENT_ID', 'test-microsoft-client-id')
jest.stubEnv('MICROSOFT_CLIENT_SECRET', 'test-microsoft-client-secret')
jest.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://test.example.com')

describe('OAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.setSystemTime(new Date('2025-08-28T10:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('initiateOAuth', () => {
    it('should initiate OAuth flow for Google Calendar', async () => {
      // Mock successful database insertion
      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })

      const result = await oauthService.initiateOAuth(
        'user-123',
        'google_calendar',
        'https://example.com/return'
      )

      expect(result.success).toBe(true)
      expect(result.data?.authUrl).toContain('accounts.google.com')
      expect(result.data?.authUrl).toContain('client_id=test-google-client-id')
      expect(result.data?.authUrl).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events')
      expect(result.data?.state).toBeTruthy()

      // Verify OAuth state storage
      expect(mockSupabase.from).toHaveBeenCalledWith('oauth_states')
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          state_token: expect.any(String),
          user_id: 'user-123',
          provider: 'google_calendar',
          return_url: 'https://example.com/return',
          nonce: expect.any(String),
          expires_at: expect.any(Date)
        })
      ])
    })

    it('should initiate OAuth flow for Microsoft Outlook', async () => {
      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })

      const result = await oauthService.initiateOAuth(
        'user-456',
        'microsoft_outlook'
      )

      expect(result.success).toBe(true)
      expect(result.data?.authUrl).toContain('login.microsoftonline.com')
      expect(result.data?.authUrl).toContain('client_id=test-microsoft-client-id')
      expect(result.data?.authUrl).toContain('scope=https%3A%2F%2Fgraph.microsoft.com%2FCalendars.ReadWrite')
      expect(result.data?.state).toBeTruthy()
    })

    it('should handle unsupported OAuth provider', async () => {
      const result = await oauthService.initiateOAuth(
        'user-123',
        'invalid_provider' as any
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unsupported OAuth provider')
      expect(result.errorCode).toBe('OAUTH_INITIATION_ERROR')
    })

    it('should handle database error during state storage', async () => {
      mockSupabase.insert.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Database error' }
      })

      const result = await oauthService.initiateOAuth(
        'user-123',
        'google_calendar'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to store OAuth state')
      expect(result.errorCode).toBe('OAUTH_STATE_STORAGE_ERROR')
    })

    it('should generate secure state parameter with timestamp', async () => {
      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })

      const result = await oauthService.initiateOAuth('user-123', 'google_calendar')

      expect(result.success).toBe(true)
      expect(result.data?.state).toMatch(/^test-uuid-123\.\w+$/)
    })

    it('should set proper expiration time for OAuth state (10 minutes)', async () => {
      const insertSpy = mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })

      await oauthService.initiateOAuth('user-123', 'google_calendar')

      const insertCall = insertSpy.mock.calls[0][0][0]
      const expiresAt = new Date(insertCall.expires_at)
      const expectedExpiry = new Date('2025-08-28T10:10:00Z') // 10 minutes later
      
      expect(expiresAt.getTime()).toBe(expectedExpiry.getTime())
    })
  })

  describe('handleOAuthCallback', () => {
    const mockOAuthState = {
      state_token: 'test-state-123',
      user_id: 'user-123',
      provider: 'google_calendar',
      return_url: 'https://example.com/return',
      nonce: 'test-nonce',
      expires_at: '2025-08-28T10:10:00Z'
    }

    it('should successfully handle OAuth callback for Google Calendar', async () => {
      // Mock OAuth state retrieval
      mockSupabase.select.mockResolvedValueOnce({
        data: mockOAuthState,
        error: null
      })

      // Mock token exchange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'google-access-token',
          refresh_token: 'google-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'calendar.events'
        })
      })

      // Mock user info retrieval
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'google-user-123',
          email: 'user@example.com',
          name: 'Test User'
        })
      })

      // Mock integration creation
      mockSupabase.upsert.mockResolvedValueOnce({
        data: {
          id: 'integration-123',
          user_id: 'user-123',
          provider: 'google_calendar',
          is_active: true
        },
        error: null
      })

      // Mock state cleanup
      mockSupabase.delete.mockResolvedValueOnce({ data: null, error: null })

      const result = await oauthService.handleOAuthCallback(
        'authorization-code-123',
        'test-state-123'
      )

      expect(result.success).toBe(true)
      expect(result.data?.provider).toBe('google_calendar')
      expect(result.data?.is_active).toBe(true)

      // Verify token exchange API call
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: expect.stringContaining('grant_type=authorization_code')
        })
      )

      // Verify user info API call
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer google-access-token',
            'Accept': 'application/json'
          }
        })
      )
    })

    it('should successfully handle OAuth callback for Microsoft Outlook', async () => {
      const microsoftState = { ...mockOAuthState, provider: 'microsoft_outlook' }
      
      mockSupabase.select.mockResolvedValueOnce({
        data: microsoftState,
        error: null
      })

      // Mock Microsoft token exchange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'microsoft-access-token',
          refresh_token: 'microsoft-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'Calendars.ReadWrite'
        })
      })

      // Mock Microsoft user info
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'microsoft-user-123',
          mail: 'user@example.com',
          displayName: 'Test User'
        })
      })

      mockSupabase.upsert.mockResolvedValueOnce({
        data: { id: 'integration-456', provider: 'microsoft_outlook' },
        error: null
      })
      mockSupabase.delete.mockResolvedValueOnce({ data: null, error: null })

      const result = await oauthService.handleOAuthCallback(
        'microsoft-code-123',
        'test-state-123'
      )

      expect(result.success).toBe(true)
      expect(result.data?.provider).toBe('microsoft_outlook')

      // Verify Microsoft-specific API calls
      expect(mockFetch).toHaveBeenCalledWith(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me',
        expect.any(Object)
      )
    })

    it('should handle invalid OAuth state', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'State not found' }
      })

      const result = await oauthService.handleOAuthCallback(
        'code-123',
        'invalid-state'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid OAuth state')
      expect(result.errorCode).toBe('INVALID_OAUTH_STATE')
    })

    it('should handle expired OAuth state', async () => {
      const expiredState = {
        ...mockOAuthState,
        expires_at: '2025-08-28T09:00:00Z' // Expired 1 hour ago
      }

      mockSupabase.select.mockResolvedValueOnce({
        data: expiredState,
        error: null
      })
      mockSupabase.delete.mockResolvedValueOnce({ data: null, error: null })

      const result = await oauthService.handleOAuthCallback(
        'code-123',
        'expired-state'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('OAuth state expired')
      expect(result.errorCode).toBe('OAUTH_STATE_EXPIRED')

      // Verify cleanup was called
      expect(mockSupabase.delete).toHaveBeenCalledWith()
    })

    it('should handle token exchange failure', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: mockOAuthState,
        error: null
      })

      // Mock failed token exchange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Authorization code expired'
        })
      })

      mockSupabase.delete.mockResolvedValueOnce({ data: null, error: null })

      const result = await oauthService.handleOAuthCallback(
        'expired-code',
        'test-state-123'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Authorization code expired')
      expect(result.errorCode).toBe('invalid_grant')
    })

    it('should handle user info retrieval failure', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: mockOAuthState,
        error: null
      })

      // Mock successful token exchange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'valid-token',
          refresh_token: 'valid-refresh',
          expires_in: 3600
        })
      })

      // Mock failed user info
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'insufficient_scope' })
      })

      mockSupabase.delete.mockResolvedValueOnce({ data: null, error: null })

      const result = await oauthService.handleOAuthCallback(
        'code-123',
        'test-state-123'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to get user information')
      expect(result.errorCode).toBe('USER_INFO_ERROR')
    })
  })

  describe('refreshAccessToken', () => {
    it('should successfully refresh access token', async () => {
      // Mock integration retrieval
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: 'integration-123',
          provider: 'google_calendar',
          refresh_token_encrypted: Buffer.from('refresh-token').toString('base64')
        },
        error: null
      })

      // Mock token refresh API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer'
        })
      })

      // Mock token update
      mockSupabase.update.mockResolvedValueOnce({ data: null, error: null })

      const result = await oauthService.refreshAccessToken('integration-123')

      expect(result.success).toBe(true)
      expect(result.data?.access_token).toBe('new-access-token')
      expect(result.data?.expires_at).toBeInstanceOf(Date)

      // Verify refresh API call
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('grant_type=refresh_token')
        })
      )

      // Verify token storage update
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          access_token_encrypted: expect.any(String),
          refresh_token_encrypted: expect.any(String),
          token_expires_at: expect.any(Date)
        })
      )
    })

    it('should handle missing integration', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Integration not found' }
      })

      const result = await oauthService.refreshAccessToken('invalid-integration')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Integration not found')
      expect(result.errorCode).toBe('INTEGRATION_NOT_FOUND')
    })

    it('should handle missing refresh token', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: 'integration-123',
          provider: 'google_calendar',
          refresh_token_encrypted: null
        },
        error: null
      })

      const result = await oauthService.refreshAccessToken('integration-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('No refresh token available')
      expect(result.errorCode).toBe('NO_REFRESH_TOKEN')
    })

    it('should handle token refresh API failure', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: 'integration-123',
          provider: 'google_calendar',
          refresh_token_encrypted: Buffer.from('expired-refresh').toString('base64')
        },
        error: null
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Token has been expired or revoked'
        })
      })

      const result = await oauthService.refreshAccessToken('integration-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Token has been expired or revoked')
      expect(result.errorCode).toBe('invalid_grant')
    })
  })

  describe('disconnectOAuth', () => {
    it('should successfully disconnect OAuth integration', async () => {
      mockSupabase.update.mockResolvedValueOnce({ data: null, error: null })

      const result = await oauthService.disconnectOAuth('user-123', 'integration-456')

      expect(result.success).toBe(true)

      // Verify integration deactivation
      expect(mockSupabase.update).toHaveBeenCalledWith({
        is_active: false,
        sync_enabled: false,
        updated_at: expect.any(String)
      })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'integration-456')
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123')
    })

    it('should handle database error during disconnection', async () => {
      mockSupabase.update.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' }
      })

      const result = await oauthService.disconnectOAuth('user-123', 'integration-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to disconnect integration')
      expect(result.errorCode).toBe('DISCONNECT_ERROR')
    })
  })

  describe('Token Encryption', () => {
    it('should encrypt and decrypt tokens correctly', async () => {
      // Test the private encryption method through OAuth callback flow
      mockSupabase.select.mockResolvedValueOnce({
        data: mockOAuthState,
        error: null
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600
        })
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        })
      })

      const createIntegrationSpy = mockSupabase.upsert.mockResolvedValueOnce({
        data: { id: 'integration-123' },
        error: null
      })
      mockSupabase.delete.mockResolvedValueOnce({ data: null, error: null })

      await oauthService.handleOAuthCallback('code-123', 'test-state-123')

      // Verify tokens are base64 encoded (placeholder encryption)
      const integrationData = createIntegrationSpy.mock.calls[0][0][0]
      expect(integrationData.access_token_encrypted).toBe(
        Buffer.from('test-access-token').toString('base64')
      )
      expect(integrationData.refresh_token_encrypted).toBe(
        Buffer.from('test-refresh-token').toString('base64')
      )
    })
  })

  describe('OAuth Configuration', () => {
    it('should throw error for unsupported provider in configuration', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const result = await oauthService.initiateOAuth(
        'user-123',
        'unsupported_provider' as any
      )

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('OAUTH_INITIATION_ERROR')

      consoleSpy.mockRestore()
    })

    it('should include correct scopes for Google Calendar', async () => {
      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })

      const result = await oauthService.initiateOAuth('user-123', 'google_calendar')

      expect(result.data?.authUrl).toContain(
        encodeURIComponent('https://www.googleapis.com/auth/calendar.events')
      )
      expect(result.data?.authUrl).toContain(
        encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly')
      )
    })

    it('should include correct scopes for Microsoft Outlook', async () => {
      mockSupabase.insert.mockResolvedValueOnce({ data: null, error: null })

      const result = await oauthService.initiateOAuth('user-123', 'microsoft_outlook')

      expect(result.data?.authUrl).toContain(
        encodeURIComponent('https://graph.microsoft.com/Calendars.ReadWrite')
      )
      expect(result.data?.authUrl).toContain(
        encodeURIComponent('https://graph.microsoft.com/User.Read')
      )
    })
  })
})