import { NextRequest, NextResponse } from 'next/server'
import { ProjectCollaborationService } from '@/lib/services/project-collaboration-service'
import { validateRequestAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate authentication and project access
    const authResult = await validateRequestAuth(request, ['manager', 'admin', 'guard'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { id } = await params
    const result = await ProjectCollaborationService.getProjectActivities(id, authResult.userId!)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      activities: result.data,
      message: 'Activities retrieved successfully'
    })

  } catch (error) {
    console.error('Error in GET /api/v1/projects/[id]/activities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}