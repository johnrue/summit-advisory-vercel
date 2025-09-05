/**
 * OAuth Connection Initiation Endpoint
 * Initiates OAuth flow for calendar provider integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { oauthService } from '@/lib/services/oauth-service'
import type { CalendarProvider } from '@/lib/types/oauth-types'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { provider, returnUrl } = body

    // Validate provider
    const validProviders: CalendarProvider[] = ['google_calendar', 'microsoft_outlook', 'microsoft_exchange']
    if (!provider || !validProviders.includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid calendar provider', code: 'INVALID_PROVIDER' },
        { status: 400 }
      )
    }

    // Check if user already has this integration
    const { data: existingIntegration } = await supabase
      .from('calendar_integrations')
      .select('id, is_active, sync_enabled')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single()

    if (existingIntegration?.is_active) {
      return NextResponse.json(
        { 
          error: 'Integration already exists', 
          code: 'INTEGRATION_EXISTS',
          integration: existingIntegration
        },
        { status: 409 }
      )
    }

    // Initiate OAuth flow
    const oauthResult = await oauthService.initiateOAuth(
      user.id, 
      provider as CalendarProvider,
      returnUrl
    )

    if (!oauthResult.success) {
      return NextResponse.json(
        { 
          error: oauthResult.error || 'Failed to initiate OAuth flow',
          code: oauthResult.errorCode || 'OAUTH_INITIATION_ERROR'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      authUrl: oauthResult.data!.authUrl,
      state: oauthResult.data!.state,
      provider
    })

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}