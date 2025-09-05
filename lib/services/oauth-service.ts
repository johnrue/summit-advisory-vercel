/**
 * OAuth Service for Calendar Integration
 * Handles OAuth flows for Google Calendar and Microsoft Graph APIs
 */

import { createClient } from '@/lib/supabase'
import type { 
  OAuthConfig, 
  OAuthToken, 
  OAuthState, 
  CalendarProvider, 
  OAuthResult,
  CalendarIntegration,
  EncryptedOAuthToken
} from '@/lib/types/oauth-types'

class OAuthService {
  private readonly supabase = createClient()

  // OAuth Configuration for Providers
  private getOAuthConfig(provider: CalendarProvider): OAuthConfig {
    switch (provider) {
      case 'google_calendar':
        return {
          clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
          redirectUri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/v1/calendar/oauth/callback`,
          scopes: [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/calendar.readonly'
          ],
          authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token'
        }
        
      case 'microsoft_outlook':
        return {
          clientId: process.env.MICROSOFT_CLIENT_ID!,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
          redirectUri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/v1/calendar/oauth/callback`,
          scopes: [
            'https://graph.microsoft.com/Calendars.ReadWrite',
            'https://graph.microsoft.com/User.Read'
          ],
          authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
        }
        
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`)
    }
  }

  // Initialize OAuth Flow
  async initiateOAuth(
    userId: string, 
    provider: CalendarProvider,
    returnUrl?: string
  ): Promise<OAuthResult<{ authUrl: string; state: string }>> {
    try {
      const config = this.getOAuthConfig(provider)
      
      // Generate secure state parameter
      const state = this.generateSecureState()
      const nonce = this.generateNonce()
      
      // Store OAuth state in database
      const oauthState: OAuthState = {
        userId,
        provider,
        returnUrl,
        nonce,
        createdAt: new Date()
      }
      
      const { error: stateError } = await this.supabase
        .from('oauth_states')
        .insert([{
          state_token: state,
          user_id: userId,
          provider,
          return_url: returnUrl,
          nonce,
          expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        }])
      
      if (stateError) {
        return {
          success: false,
          error: 'Failed to store OAuth state',
          errorCode: 'OAUTH_STATE_STORAGE_ERROR'
        }
      }

      // Build authorization URL
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scopes.join(' '),
        state: state,
        access_type: provider === 'google_calendar' ? 'offline' : undefined!,
        prompt: provider === 'google_calendar' ? 'consent' : undefined!,
        response_mode: provider === 'microsoft_outlook' ? 'query' : undefined!
      })

      // Remove undefined values
      Array.from(params.entries()).forEach(([key, value]) => {
        if (value === 'undefined') params.delete(key)
      })

      const authUrl = `${config.authUrl}?${params.toString()}`

      return {
        success: true,
        data: { authUrl, state }
      }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to initiate OAuth flow',
        errorCode: 'OAUTH_INITIATION_ERROR'
      }
    }
  }

  // Handle OAuth Callback
  async handleOAuthCallback(
    code: string,
    state: string
  ): Promise<OAuthResult<CalendarIntegration>> {
    try {
      // Verify and retrieve OAuth state
      const { data: oauthState, error: stateError } = await this.supabase
        .from('oauth_states')
        .select('*')
        .eq('state_token', state)
        .single()

      if (stateError || !oauthState) {
        return {
          success: false,
          error: 'Invalid OAuth state',
          errorCode: 'INVALID_OAUTH_STATE'
        }
      }

      // Check state expiration
      if (new Date(oauthState.expires_at) < new Date()) {
        await this.cleanupOAuthState(state)
        return {
          success: false,
          error: 'OAuth state expired',
          errorCode: 'OAUTH_STATE_EXPIRED'
        }
      }

      const config = this.getOAuthConfig(oauthState.provider)

      // Exchange code for tokens
      const tokenResult = await this.exchangeCodeForTokens(config, code)
      
      if (!tokenResult.success) {
        await this.cleanupOAuthState(state)
        return tokenResult as unknown as OAuthResult<CalendarIntegration>
      }

      const tokens = tokenResult.data!

      // Get user info from provider
      const userInfo = await this.getUserInfo(oauthState.provider, tokens.access_token)
      
      if (!userInfo.success) {
        await this.cleanupOAuthState(state)
        return {
          success: false,
          error: 'Failed to get user information',
          errorCode: 'USER_INFO_ERROR'
        }
      }

      // Encrypt and store tokens
      const encryptedTokens = await this.encryptTokens(tokens)
      
      // Create or update calendar integration
      const integration = await this.createOrUpdateIntegration({
        user_id: oauthState.user_id,
        provider: oauthState.provider,
        provider_user_id: userInfo.data!.id,
        ...encryptedTokens,
        token_expires_at: tokens.expires_at,
        is_active: true,
        sync_enabled: true
      })

      // Cleanup OAuth state
      await this.cleanupOAuthState(state)

      return integration

    } catch (error) {
      return {
        success: false,
        error: 'Failed to process OAuth callback',
        errorCode: 'OAUTH_CALLBACK_ERROR'
      }
    }
  }

  // Exchange Authorization Code for Tokens
  private async exchangeCodeForTokens(
    config: OAuthConfig, 
    code: string
  ): Promise<OAuthResult<OAuthToken>> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code: code
      })

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      })

      if (!response.ok) {
        const error = await response.json()
        return {
          success: false,
          error: error.error_description || 'Token exchange failed',
          errorCode: error.error || 'TOKEN_EXCHANGE_ERROR'
        }
      }

      const tokenData = await response.json()

      const token: OAuthToken = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        expires_at: new Date(Date.now() + (tokenData.expires_in * 1000))
      }

      return { success: true, data: token }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to exchange code for tokens',
        errorCode: 'TOKEN_EXCHANGE_ERROR'
      }
    }
  }

  // Get User Information from Provider
  private async getUserInfo(
    provider: CalendarProvider, 
    accessToken: string
  ): Promise<OAuthResult<{ id: string; email: string; name: string }>> {
    try {
      let userInfoUrl: string
      let userIdField: string
      
      switch (provider) {
        case 'google_calendar':
          userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo'
          userIdField = 'id'
          break
        case 'microsoft_outlook':
          userInfoUrl = 'https://graph.microsoft.com/v1.0/me'
          userIdField = 'id'
          break
        default:
          throw new Error(`Unsupported provider: ${provider}`)
      }

      const response = await fetch(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        return {
          success: false,
          error: 'Failed to get user information',
          errorCode: 'USER_INFO_REQUEST_ERROR'
        }
      }

      const userData = await response.json()

      return {
        success: true,
        data: {
          id: userData[userIdField],
          email: userData.email || userData.mail || userData.userPrincipalName,
          name: userData.name || userData.displayName || `${userData.given_name} ${userData.family_name}`
        }
      }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to get user information',
        errorCode: 'USER_INFO_ERROR'
      }
    }
  }

  // Refresh Access Token
  async refreshAccessToken(integrationId: string): Promise<OAuthResult<OAuthToken>> {
    try {
      const { data: integration, error } = await this.supabase
        .from('calendar_integrations')
        .select('*')
        .eq('id', integrationId)
        .single()

      if (error || !integration) {
        return {
          success: false,
          error: 'Integration not found',
          errorCode: 'INTEGRATION_NOT_FOUND'
        }
      }

      if (!integration.refresh_token_encrypted) {
        return {
          success: false,
          error: 'No refresh token available',
          errorCode: 'NO_REFRESH_TOKEN'
        }
      }

      const config = this.getOAuthConfig(integration.provider)
      const refreshToken = await this.decryptToken(integration.refresh_token_encrypted)

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken
      })

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      })

      if (!response.ok) {
        const error = await response.json()
        return {
          success: false,
          error: error.error_description || 'Token refresh failed',
          errorCode: error.error || 'TOKEN_REFRESH_ERROR'
        }
      }

      const tokenData = await response.json()

      const newToken: OAuthToken = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refreshToken,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        expires_at: new Date(Date.now() + (tokenData.expires_in * 1000))
      }

      // Update stored tokens
      const encryptedTokens = await this.encryptTokens(newToken)
      
      const { error: updateError } = await this.supabase
        .from('calendar_integrations')
        .update({
          ...encryptedTokens,
          token_expires_at: newToken.expires_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId)

      if (updateError) {
        return {
          success: false,
          error: 'Failed to update tokens',
          errorCode: 'TOKEN_UPDATE_ERROR'
        }
      }

      return { success: true, data: newToken }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to refresh access token',
        errorCode: 'TOKEN_REFRESH_ERROR'
      }
    }
  }

  // Disconnect OAuth Integration
  async disconnectOAuth(userId: string, integrationId: string): Promise<OAuthResult<void>> {
    try {
      const { error } = await this.supabase
        .from('calendar_integrations')
        .update({
          is_active: false,
          sync_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId)
        .eq('user_id', userId)

      if (error) {
        return {
          success: false,
          error: 'Failed to disconnect integration',
          errorCode: 'DISCONNECT_ERROR'
        }
      }

      return { success: true }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to disconnect OAuth integration',
        errorCode: 'OAUTH_DISCONNECT_ERROR'
      }
    }
  }

  // Helper Methods
  private generateSecureState(): string {
    return crypto.randomUUID() + '.' + Date.now().toString(36)
  }

  private generateNonce(): string {
    return crypto.randomUUID().replace(/-/g, '')
  }

  private async encryptTokens(tokens: OAuthToken): Promise<EncryptedOAuthToken> {
    // In production, use proper encryption with Supabase vault
    // For now, using base64 encoding as placeholder
    return {
      access_token_encrypted: Buffer.from(tokens.access_token).toString('base64'),
      refresh_token_encrypted: tokens.refresh_token 
        ? Buffer.from(tokens.refresh_token).toString('base64') 
        : undefined,
      token_expires_at: tokens.expires_at
    }
  }

  private async decryptToken(encryptedToken: string): Promise<string> {
    // In production, use proper decryption with Supabase vault
    // For now, using base64 decoding as placeholder
    return Buffer.from(encryptedToken, 'base64').toString('utf-8')
  }

  private async createOrUpdateIntegration(
    data: Omit<CalendarIntegration, 'id' | 'created_at' | 'updated_at'>
  ): Promise<OAuthResult<CalendarIntegration>> {
    try {
      const { data: integration, error } = await this.supabase
        .from('calendar_integrations')
        .upsert([{
          ...data,
          is_active: true,
          sync_enabled: true,
          last_sync_at: null,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'user_id,provider'
        })
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: 'Failed to create integration',
          errorCode: 'INTEGRATION_CREATE_ERROR'
        }
      }

      return { success: true, data: integration }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to create calendar integration',
        errorCode: 'INTEGRATION_CREATE_ERROR'
      }
    }
  }

  private async cleanupOAuthState(state: string): Promise<void> {
    await this.supabase
      .from('oauth_states')
      .delete()
      .eq('state_token', state)
  }
}

export const oauthService = new OAuthService()