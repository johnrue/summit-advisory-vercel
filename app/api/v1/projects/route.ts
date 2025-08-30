import { NextRequest, NextResponse } from 'next/server'
import { ProjectManagementService } from '@/lib/services/project-management-service'
import { validateRequestAuth } from '@/lib/auth'
import type { ProjectFormData, ProjectFilters } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    // Validate authentication and role
    const authResult = await validateRequestAuth(request, ['manager', 'admin'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(request.url)
    
    // Parse filters from query parameters
    const filters: ProjectFilters = {}
    
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')!.split(',') as any[]
    }
    if (searchParams.get('priority')) {
      filters.priority = searchParams.get('priority')!.split(',') as any[]
    }
    if (searchParams.get('category')) {
      filters.category = searchParams.get('category')!.split(',')
    }
    if (searchParams.get('ownerId')) {
      filters.ownerId = searchParams.get('ownerId')!
    }
    if (searchParams.get('assignedMember')) {
      filters.assignedMember = searchParams.get('assignedMember')!
    }
    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!
    }
    if (searchParams.get('isRecurring')) {
      filters.isRecurring = searchParams.get('isRecurring') === 'true'
    }
    
    // Date range filter
    if (searchParams.get('startDate') && searchParams.get('endDate')) {
      filters.dateRange = {
        start: searchParams.get('startDate')!,
        end: searchParams.get('endDate')!
      }
    }

    const result = await ProjectManagementService.getProjects(filters)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      projects: result.data,
      message: 'Projects retrieved successfully'
    })

  } catch (error) {
    console.error('Error in GET /api/v1/projects:', error)
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
    if (!body.title || !body.description || !body.categoryId || !body.priority) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, categoryId, priority' },
        { status: 400 }
      )
    }

    const projectData: ProjectFormData = {
      title: body.title,
      description: body.description,
      categoryId: body.categoryId,
      priority: body.priority,
      ownerId: authResult.userId!, // Set current user as owner
      assignedMembers: body.assignedMembers || [],
      dueDate: body.dueDate,
      estimatedHours: body.estimatedHours,
      budget: body.budget,
      templateId: body.templateId,
      isRecurring: body.isRecurring || false,
      recurringSchedule: body.recurringSchedule
    }

    const result = await ProjectManagementService.createProject(projectData)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      project: result.data,
      message: 'Project created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/v1/projects:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}