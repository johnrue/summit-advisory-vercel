import { NextRequest, NextResponse } from 'next/server'
import { ShiftTemplateService } from '@/lib/services/shift-template-service'
import type { ShiftTemplateCreateData } from '@/lib/types/shift-types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id
    
    if (!templateId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_TEMPLATE_ID',
          message: 'Template ID is required'
        }
      }, { status: 400 })
    }
    
    const service = new ShiftTemplateService()
    const result = await service.getTemplate(templateId)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      })
    } else {
      const status = result.error?.code === 'TEMPLATE_NOT_FOUND' ? 404 : 400
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status })
    }
  } catch (error) {
    console.error(`GET /api/v1/shifts/templates/${params.id} error:`, error)
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id
    const body = await request.json()
    
    if (!templateId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_TEMPLATE_ID',
          message: 'Template ID is required'
        }
      }, { status: 400 })
    }
    
    const updates: Partial<ShiftTemplateCreateData> = {
      name: body.name,
      description: body.description,
      category: body.category,
      templateData: body.templateData,
      isShared: body.isShared
    }
    
    const service = new ShiftTemplateService()
    const result = await service.updateTemplate(templateId, updates)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      })
    } else {
      const status = result.error?.code === 'TEMPLATE_NOT_FOUND' ? 404 : 400
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status })
    }
  } catch (error) {
    console.error(`PUT /api/v1/shifts/templates/${params.id} error:`, error)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id
    
    if (!templateId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_TEMPLATE_ID',
          message: 'Template ID is required'
        }
      }, { status: 400 })
    }
    
    const service = new ShiftTemplateService()
    const result = await service.deleteTemplate(templateId)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: null
      })
    } else {
      const status = result.error?.code === 'TEMPLATE_NOT_FOUND' ? 404 : 400
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status })
    }
  } catch (error) {
    console.error(`DELETE /api/v1/shifts/templates/${params.id} error:`, error)
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