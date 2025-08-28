import { NextRequest, NextResponse } from 'next/server'
import { ShiftTemplateService } from '@/lib/services/shift-template-service'
import type { ShiftTemplateCreateData } from '@/lib/types/shift-types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const category = searchParams.get('category') || undefined
    const sharedOnly = searchParams.get('sharedOnly') === 'true'
    
    const service = new ShiftTemplateService()
    const result = await service.getTemplates(category, sharedOnly)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }
  } catch (error) {
    console.error('GET /api/v1/shifts/templates error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: 'Internal server error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.category || !body.templateData) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: name, category, templateData'
        }
      }, { status: 400 })
    }
    
    // TODO: Get actual user ID from session/auth
    const managerId = 'current-user-id'
    
    const templateData: ShiftTemplateCreateData = {
      name: body.name,
      description: body.description,
      category: body.category,
      templateData: body.templateData,
      isShared: body.isShared || false
    }
    
    const service = new ShiftTemplateService()
    const result = await service.createTemplate(templateData, managerId)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      }, { status: 201 })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }
  } catch (error) {
    console.error('POST /api/v1/shifts/templates error:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'API_ERROR',
        message: 'Internal server error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }, { status: 500 })
  }
}