import { NextRequest, NextResponse } from 'next/server'
import { ProjectTemplateService } from '@/lib/services/project-template-service'
import { validateRequestAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateRequestAuth(request, ['manager', 'admin'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const result = await ProjectTemplateService.getProjectTemplates(authResult.userId!)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      templates: result.data,
      message: 'Templates retrieved successfully'
    })

  } catch (error) {
    console.error('Error in GET /api/v1/projects/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate authentication and role
    const authResult = await validateRequestAuth(request, ['manager', 'admin'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.description || !body.categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, categoryId' },
        { status: 400 }
      )
    }

    const result = await ProjectTemplateService.createProjectTemplate({
      ...body,
      createdBy: authResult.userId!
    })
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      template: result.data,
      message: 'Template created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/v1/projects/templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}