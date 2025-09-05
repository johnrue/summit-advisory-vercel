import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase-server'
import { serverRoleService } from '@/lib/auth/role-service-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user role from database
    const { role, error: roleError } = await serverRoleService.getUserRole(user.id)
    
    if (roleError) {
    }

    // Return user information with role
    const userResponse = {
      id: user.id,
      email: user.email,
      role: role || user.user_metadata?.role || 'guard',
      firstName: user.user_metadata?.firstName,
      lastName: user.user_metadata?.lastName,
      emailConfirmed: user.email_confirmed_at !== null,
      lastSignIn: user.last_sign_in_at,
      createdAt: user.created_at,
    }

    return NextResponse.json(userResponse)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions to update roles
    const { role: currentUserRole } = await serverRoleService.getUserRole(user.id)
    if (currentUserRole !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, role, permissions } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, role' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'guard', 'client']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Update user role using server-side role service
    const result = await serverRoleService.assignRole(userId, role, permissions)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update role' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
      role
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}