import { NextRequest, NextResponse } from 'next/server'
import { ProjectManagementService } from '@/lib/services/project-management-service'
import { validateRequestAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateRequestAuth(request, ['manager', 'admin', 'guard'])
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const result = await ProjectManagementService.getProjectCategories()
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      categories: result.data,
      message: 'Categories retrieved successfully'
    })

  } catch (error) {
    console.error('Error in GET /api/v1/projects/categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}