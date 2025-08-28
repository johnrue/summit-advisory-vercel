/**
 * OAuth Disconnection Endpoint
 * Handles disconnecting calendar integrations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { oauthService } from '@/lib/services/oauth-service'

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
    const { integrationId } = body

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID is required', code: 'MISSING_INTEGRATION_ID' },
        { status: 400 }
      )
    }

    // Verify user owns this integration
    const { data: integration, error: fetchError } = await supabase
      .from('calendar_integrations')
      .select('id, provider, user_id')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found', code: 'INTEGRATION_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Disconnect the integration
    const disconnectResult = await oauthService.disconnectOAuth(user.id, integrationId)

    if (!disconnectResult.success) {
      return NextResponse.json(
        { 
          error: disconnectResult.error || 'Failed to disconnect integration',
          code: disconnectResult.errorCode || 'DISCONNECT_ERROR'
        },
        { status: 500 }
      )
    }

    // Log the disconnection
    const { error: logError } = await supabase
      .from('calendar_sync_logs')
      .insert([{
        integration_id: integrationId,
        sync_type: 'sync_status_check',
        operation_status: 'completed',
        event_type: 'integration_disconnected',
        events_processed: 0,
        operation_duration_ms: 0,
        created_at: new Date().toISOString()
      }])

    if (logError) {
      console.error('Failed to log disconnection:', logError)
    }

    return NextResponse.json({
      success: true,
      message: `${integration.provider} integration disconnected successfully`,
      integrationId,
      provider: integration.provider
    })

  } catch (error) {
    console.error('OAuth disconnect error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  // Handle DELETE method as well for RESTful API
  return POST(request)
}