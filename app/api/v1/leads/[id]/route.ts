import { NextRequest, NextResponse } from 'next/server'
import { getLeadById, updateLead, deleteLead } from '@/lib/services/lead-management-service'
import { createClient } from '@supabase/supabase-js'
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
    return false
  }
}

const updateLeadSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  serviceType: z.string().optional(),
  status: z.enum(['prospect', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  estimatedValue: z.number().positive().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  qualificationNotes: z.string().optional(),
  sourceDetails: z.record(z.any()).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: leadId } = await params

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lead ID is required',
          message: 'Missing lead ID parameter'
        },
        { status: 400 }
      )
    }

    const result = await getLeadById(leadId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.message
        },
        result.error === 'Lead not found' ? { status: 404 } : { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message
    })

  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch lead'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: leadId } = await params

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lead ID is required',
          message: 'Missing lead ID parameter'
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateLeadSchema.parse(body)

    // Transform to match database schema
    const updateData: any = {}
    
    if (validatedData.firstName) updateData.first_name = validatedData.firstName
    if (validatedData.lastName) updateData.last_name = validatedData.lastName
    if (validatedData.email) updateData.email = validatedData.email
    if (validatedData.phone) updateData.phone = validatedData.phone
    if (validatedData.serviceType) updateData.service_type = validatedData.serviceType
    if (validatedData.status) updateData.status = validatedData.status
    if (validatedData.assignedTo !== undefined) updateData.assigned_to = validatedData.assignedTo
    if (validatedData.estimatedValue !== undefined) updateData.estimated_value = validatedData.estimatedValue
    if (validatedData.priority) updateData.priority = validatedData.priority
    if (validatedData.qualificationNotes) updateData.qualification_notes = validatedData.qualificationNotes
    if (validatedData.sourceDetails) updateData.source_details = validatedData.sourceDetails

    const result = await updateLead(leadId, updateData)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.message
        },
        result.error === 'Lead not found' ? { status: 404 } : { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Invalid input data',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to update lead'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: leadId } = await params

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lead ID is required',
          message: 'Missing lead ID parameter'
        },
        { status: 400 }
      )
    }

    const result = await deleteLead(leadId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.message
        },
        result.error === 'Lead not found' ? { status: 404 } : { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message
    })

  } catch (error) {
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to delete lead'
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}