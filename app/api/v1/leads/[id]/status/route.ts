import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { updateGuardLeadStatus } from '@/lib/services/guard-lead-service'
import { z } from 'zod'

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

const leadStatuses = [
  'new',
  'contacted',
  'application-sent',
  'application-started', 
  'application-completed',
  'interview-scheduled',
  'hired',
  'rejected',
  'unresponsive'
] as const

const updateStatusSchema = z.object({
  status: z.enum(leadStatuses),
  notes: z.string().optional()
})

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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const leadId = params.id
    
    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing lead ID',
          message: 'Lead ID is required'
        },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateStatusSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    const { status, notes } = validationResult.data

    // Update lead status via service layer
    const result = await updateGuardLeadStatus(leadId, status, notes)

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
    console.error('Error updating lead status:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to update lead status'
      },
      { status: 500 }
    )
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function POST() {
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