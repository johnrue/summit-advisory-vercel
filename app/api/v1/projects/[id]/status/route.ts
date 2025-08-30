import { NextRequest, NextResponse } from 'next/server'
import { ProjectManagementService } from '@/lib/services/project-management-service'
import { validateRequestAuth } from '@/lib/auth'
import type { ProjectStatus } from '@/lib/types'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate authentication and role
    const authResult = await validateRequestAuth(request, ['manager', 'admin'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    
    if (!body.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Validate status value
    const validStatuses: ProjectStatus[] = ['backlog', 'in_progress', 'review', 'done']
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: backlog, in_progress, review, done' },
        { status: 400 }
      )
    }

    const result = await ProjectManagementService.updateProjectStatus(
      params.id,
      body.status,
      authResult.userId!,
      body.notes
    )
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      project: result.data,
      message: 'Project status updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/v1/projects/[id]/status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}