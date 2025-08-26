import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/supabase-server'
import { serverRoleService, type UserRole } from '@/lib/auth/role-service-server'
import { permissionService } from '@/lib/auth/permission-service'

// GET /api/v1/roles - List all user roles
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user has permission to view user roles
    const { hasPermission } = await permissionService.checkPermission(user.id, 'users.view_all')
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const roleFilter = searchParams.get('role') as UserRole | null

    // Fetch users with roles
    const { users, error } = await serverRoleService.listUsersWithRoles(roleFilter || undefined)
    
    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length
    })

  } catch (error) {
    console.error('Error fetching user roles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/v1/roles - Assign role to user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user has permission to create/assign roles
    const { hasPermission } = await permissionService.checkPermission(user.id, 'users.create')
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role, permissions: customPermissions } = body

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, role' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles: UserRole[] = ['admin', 'manager', 'guard', 'client']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: ' + validRoles.join(', ') },
        { status: 400 }
      )
    }

    // Assign role
    const result = await serverRoleService.assignRole(userId, role, customPermissions)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Log the role assignment in audit trail
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        table_name: 'user_roles',
        operation: 'INSERT',
        record_id: userId,
        new_values: { role, permissions: customPermissions || {} },
        changed_by: user.id,
        change_description: `Role assigned: ${role.toUpperCase()}`
      })

    if (auditError) {
      console.warn('Failed to log audit trail:', auditError)
    }

    return NextResponse.json({
      success: true,
      message: `Role ${role} assigned successfully`,
      data: { userId, role }
    })

  } catch (error) {
    console.error('Error assigning role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/v1/roles - Update user role
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user has permission to edit roles
    const { hasPermission } = await permissionService.checkPermission(user.id, 'users.edit')
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role, permissions: customPermissions } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      )
    }

    // Get current role for audit logging
    const { role: currentRole } = await serverRoleService.getUserRole(userId)

    // Update role
    const result = await serverRoleService.assignRole(userId, role, customPermissions)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Log the role change in audit trail
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        table_name: 'user_roles',
        operation: 'UPDATE',
        record_id: userId,
        old_values: { role: currentRole },
        new_values: { role, permissions: customPermissions || {} },
        changed_by: user.id,
        change_description: currentRole !== role ? 
          `Role changed from ${currentRole?.toUpperCase()} to ${role?.toUpperCase()}` :
          'Permissions updated'
      })

    if (auditError) {
      console.warn('Failed to log audit trail:', auditError)
    }

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
      data: { userId, role }
    })

  } catch (error) {
    console.error('Error updating role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}