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
          message: 'Only administrators can compare user permissions'
        },
        { status: 403 }
      )
    }

    // Get permission comparison
    const comparison = await userSupportService.compareUserPermissions(userId, session.user.id)

    if (!comparison) {
      return NextResponse.json(
        {
          success: false,
          message: 'Cannot compare permissions for this user',
          comparison: null
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      comparison
    })

  } catch (error) {
    console.error('Error in user permission comparison API:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        comparison: null
      },
      { status: 500 }
    )
  }
}