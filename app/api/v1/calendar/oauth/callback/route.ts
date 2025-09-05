/**
 * OAuth Callback Endpoint
 * Handles OAuth callback and completes integration setup
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { oauthService } from '@/lib/services/oauth-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      const errorUrl = new URL('/dashboard/calendar', request.url)
      errorUrl.searchParams.set('error', error)
      errorUrl.searchParams.set('error_description', errorDescription || 'OAuth authorization failed')
      
      return NextResponse.redirect(errorUrl)
    }

    // Validate required parameters
    if (!code || !state) {
      const errorUrl = new URL('/dashboard/calendar', request.url)
      errorUrl.searchParams.set('error', 'invalid_request')
      errorUrl.searchParams.set('error_description', 'Missing authorization code or state parameter')
      
      return NextResponse.redirect(errorUrl)
    }

    // Process OAuth callback
    const callbackResult = await oauthService.handleOAuthCallback(code, state)

    if (!callbackResult.success) {
      const errorUrl = new URL('/dashboard/calendar', request.url)
      errorUrl.searchParams.set('error', callbackResult.errorCode || 'callback_error')
      errorUrl.searchParams.set('error_description', callbackResult.error || 'Failed to complete OAuth flow')
      
      return NextResponse.redirect(errorUrl)
    }

    const integration = callbackResult.data!
    
    // Get OAuth state to check return URL
    const supabase = createClient()
    const { data: oauthState } = await supabase
      .from('oauth_states')
      .select('return_url, provider')
      .eq('state_token', state)
      .single()

    // Determine redirect URL
    const returnUrl = oauthState?.return_url || '/dashboard/calendar'
    const successUrl = new URL(returnUrl, request.url)
    successUrl.searchParams.set('success', 'integration_connected')
    successUrl.searchParams.set('provider', integration.provider)
    successUrl.searchParams.set('integration_id', integration.id)

    return NextResponse.redirect(successUrl)

  } catch (error) {
    
    const errorUrl = new URL('/dashboard/calendar', request.url)
    errorUrl.searchParams.set('error', 'internal_error')
    errorUrl.searchParams.set('error_description', 'An unexpected error occurred during OAuth callback')
    
    return NextResponse.redirect(errorUrl)
  }
}

export async function POST(request: NextRequest) {
  // Handle POST callback for some OAuth providers
  return GET(request)
}