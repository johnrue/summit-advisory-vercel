import { NextRequest, NextResponse } from 'next/server'
import { ShiftManagementService } from '@/lib/services/shift-service'
import type { ShiftUpdateData } from '@/lib/types/shift-types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shiftId = params.id
    
    if (!shiftId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_SHIFT_ID',
          message: 'Shift ID is required'
        }
      }, { status: 400 })
    }
    
    const service = new ShiftManagementService()
    const result = await service.getShift(shiftId)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      })
    } else {
      const status = result.error?.code === 'SHIFT_NOT_FOUND' ? 404 : 400
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status })
    }
  } catch (error) {
    console.error(`GET /api/v1/shifts/${params.id} error:`, error)
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
    const shiftId = params.id
    const body = await request.json()
    
    if (!shiftId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_SHIFT_ID',
          message: 'Shift ID is required'
        }
      }, { status: 400 })
    }
    
    // Validate required fields for update
    if (!body.changeReason) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Change reason is required for updates'
        }
      }, { status: 400 })
    }
    
    // TODO: Get actual user ID from session/auth
    const managerId = 'current-user-id'
    
    const updateData: ShiftUpdateData = {
      ...body,
      changeReason: body.changeReason,
      changeDescription: body.changeDescription,
      managerSignature: body.managerSignature || `Manager-${managerId}-${Date.now()}`
    }
    
    const service = new ShiftManagementService()
    const result = await service.updateShift(shiftId, updateData, managerId)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      })
    } else {
      const status = result.error?.code === 'SHIFT_NOT_FOUND' ? 404 : 400
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status })
    }
  } catch (error) {
    console.error(`PUT /api/v1/shifts/${params.id} error:`, error)
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
    const shiftId = params.id
    const { searchParams } = new URL(request.url)
    const reason = searchParams.get('reason') || 'Shift cancelled by manager'
    
    if (!shiftId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_SHIFT_ID',
          message: 'Shift ID is required'
        }
      }, { status: 400 })
    }
    
    // TODO: Get actual user ID from session/auth
    const managerId = 'current-user-id'
    
    const service = new ShiftManagementService()
    const result = await service.cancelShift(shiftId, reason, managerId)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      })
    } else {
      const status = result.error?.code === 'SHIFT_NOT_FOUND' ? 404 : 400
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status })
    }
  } catch (error) {
    console.error(`DELETE /api/v1/shifts/${params.id} error:`, error)
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