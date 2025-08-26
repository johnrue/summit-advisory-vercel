import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase'
import { jwtDecode } from 'jwt-decode'
import type { UserRole } from '@/lib/auth/role-service'

export interface RoleViewSwitchRequest {
  targetViewRole: UserRole
  persistPreference?: boolean
}

export interface RoleViewSwitchResponse {
  currentViewRole: UserRole
  adminRole: UserRole
  success: boolean
  message?: string
}

export async function POST(request: NextRequest) {
  try {
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
          message: 'Only administrators can switch role views',
          currentViewRole: userRole,
          adminRole: userRole
        } as RoleViewSwitchResponse,
        { status: 403 }
      )
    }

    // Parse request body
    const body: RoleViewSwitchRequest = await request.json()
    const { targetViewRole, persistPreference = false } = body

    // Validate target role
    const allowedRoles: UserRole[] = ['admin', 'manager', 'guard']
    if (!allowedRoles.includes(targetViewRole)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid target role: ${targetViewRole}`,
          currentViewRole: userRole,
          adminRole: userRole
        } as RoleViewSwitchResponse,
        { status: 400 }
      )
    }

    // Log the role view switch for audit purposes
    try {
      const auditEntry = {
        user_id: session.user.id,
        action: 'admin_role_view_switch',
        resource_type: 'admin_interface',
        resource_id: null,
        details: {
          admin_role: userRole,
          target_view_role: targetViewRole,
          persist_preference: persistPreference,
          timestamp: new Date().toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        },
        metadata: {
          role_view_switch: {
            from_role: userRole,
            to_role: targetViewRole,
            persisted: persistPreference
          }
        }
      }

      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert(auditEntry)

      if (auditError) {
        console.warn('Failed to log role view switch audit event:', auditError)
        // Don't fail the request if audit logging fails
      }
    } catch (auditError) {
      console.warn('Error during audit logging:', auditError)
      // Continue with the role switch operation
    }

    // Return successful response
    const response: RoleViewSwitchResponse = {
      currentViewRole: targetViewRole,
      adminRole: userRole,
      success: true,
      message: `Role view switched to ${targetViewRole}`
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in role view switch API:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error during role view switch',
        currentViewRole: 'admin',
        adminRole: 'admin'
      } as RoleViewSwitchResponse,
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve current role view status
export async function GET(request: NextRequest) {
  try {
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

    // Return current role information
    const response = {
      adminRole: userRole,
      canSwitchRoleViews: userRole === 'admin',
      availableViewRoles: userRole === 'admin' ? ['admin', 'manager', 'guard'] : [userRole],
      success: true
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in role view status API:', error)
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}