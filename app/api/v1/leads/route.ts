import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLeads } from '@/lib/services/lead-management-service'

// Create Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function checkManagerAccess(request: NextRequest): Promise<boolean> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false
    }

    const token = authHeader.split(' ')[1]
    
    // Verify JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return false
    }

    // Check if user has manager or admin role
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        status,
        expires_at,
        roles(name)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .or('expires_at.is.null,expires_at.gt.now()')

    if (roleError || !userRoles || userRoles.length === 0) {
      return false
    }

    // Check if user has manager or admin role
    const hasAccess = userRoles.some(userRole => {
      const role = userRole.roles as any
      return role && (role.name === 'manager' || role.name === 'admin')
    })

    return hasAccess
  } catch (error) {
    console.error('Error checking manager access:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const hasAccess = await checkManagerAccess(request)
    
    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Access denied. Manager or admin role required.'
        },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    
    const filters = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '25'),
      search: searchParams.get('search') || '',
      sourceFilter: searchParams.get('source_filter')?.split(',') || [],
      statusFilter: searchParams.get('status_filter')?.split(',') || [],
      managerFilter: searchParams.get('manager_filter') || '',
      sortBy: (searchParams.get('sort_by') as 'created_at' | 'name' | 'status' | 'estimated_value') || 'created_at',
      sortOrder: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc'
    }

    // Get leads from service layer
    const result = await getLeads(filters)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message
    })

  } catch (error) {
    console.error('Error in leads API:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch leads'
      },
      { status: 500 }
    )
  }
}

// Handle other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}