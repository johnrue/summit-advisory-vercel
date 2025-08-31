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
    const result = await ProjectCollaborationService.getProjectComments(id, authResult.userId!)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      comments: result.data,
      message: 'Comments retrieved successfully'
    })

  } catch (error) {
    console.error('Error in GET /api/v1/projects/[id]/comments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate authentication and project access
    const authResult = await validateRequestAuth(request, ['manager', 'admin', 'guard'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    
    if (!body.content || !body.content.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      )
    }

    const { id } = await params
    const result = await ProjectCollaborationService.addProjectComment(
      id,
      authResult.userId!,
      body.content.trim(),
      body.parentCommentId
    )
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      comment: result.data.comment,
      project: result.data.project,
      message: 'Comment added successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/v1/projects/[id]/comments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}