import { NextRequest, NextResponse } from 'next/server'
import { ProjectManagementService } from '@/lib/services/project-management-service'
import { validateRequestAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate authentication and role
    const authResult = await validateRequestAuth(request, ['manager', 'admin', 'guard'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { id } = await params
    const result = await ProjectManagementService.getProjectById(id)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    // Check if user has access to this project
    const project = result.data
    const hasAccess = authResult.role === 'admin' || 
                     authResult.role === 'manager' ||
                     project.ownerId === authResult.userId ||
                     project.assignedMembers.includes(authResult.userId!)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      project: result.data,
      message: 'Project retrieved successfully'
    })

  } catch (error) {
    console.error('Error in GET /api/v1/projects/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate authentication and role
    const authResult = await validateRequestAuth(request, ['manager', 'admin'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()

    const { id } = await params
    const result = await ProjectManagementService.updateProject(id, body, authResult.userId!)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      project: result.data,
      message: 'Project updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/v1/projects/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate authentication and role
    const authResult = await validateRequestAuth(request, ['manager', 'admin'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { id } = await params
    const result = await ProjectManagementService.deleteProject(id, authResult.userId!)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/v1/projects/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}