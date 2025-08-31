import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase'
import { jwtDecode } from 'jwt-decode'
import { userSupportService } from '@/lib/admin/user-support-service'
import type { UserRole } from '@/lib/auth/role-service'

interface RouteParams {
  params: Promise<{
    userId: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params
    const supabase = createClient()
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Extract user role from JWT
    let userRole: UserRole = 'guard'
    try {
      const payload = jwtDecode<any>(session.access_token)
      userRole = payload.role || payload.user_metadata?.role || 'guard'
    } catch (jwtError) {
      console.warn('Failed to decode JWT token:', jwtError)
    }

    // Verify admin permissions
    if (userRole !== 'admin') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Only administrators can access user support information',
          canView: false
        },
        { status: 403 }
      )
    }

    // Get user support information
    const result = await userSupportService.getUserSupportInfo(userId, session.user.id)

    if (!result.canView) {
      return NextResponse.json(
        {
          success: false,
          message: result.error || 'Cannot view user information',
          canView: false,
          user: null
        },
        { status: 403 }
      )
    }

    // Log the user support access for audit purposes
    try {
      const auditEntry = {
        user_id: session.user.id,
        action: 'admin_user_support_access',
        resource_type: 'user_account',
        resource_id: userId,
        details: {
          accessed_user_email: result.user?.email,
          accessed_user_role: result.user?.role,
          timestamp: new Date().toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        },
        metadata: {
          user_support_access: {
            target_user_id: userId,
            access_type: 'user_info_view'
          }
        }
      }

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert(auditEntry)

      if (auditError) {
        console.warn('Failed to log user support access audit event:', auditError)
        // Don't fail the request if audit logging fails
      }
    } catch (auditError) {
      console.warn('Error during audit logging:', auditError)
    }

    return NextResponse.json({
      success: true,
      canView: result.canView,
      user: result.user
    })

  } catch (error) {
    console.error('Error in user support API:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        canView: false,
        user: null
      },
      { status: 500 }
    )
  }
}