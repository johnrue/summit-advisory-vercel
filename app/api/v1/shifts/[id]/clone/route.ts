import { NextRequest, NextResponse } from 'next/server'
import { ShiftManagementService } from '@/lib/services/shift-service'
import type { ShiftCreateData } from '@/lib/types/shift-types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sourceShiftId } = await params
    const body = await request.json()
    
    if (!sourceShiftId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_SHIFT_ID',
          message: 'Source shift ID is required'
        }
      }, { status: 400 })
    }
    
    // Extract modifications from request body
    const modifications: Partial<ShiftCreateData> = {}
    
    if (body.title) modifications.title = body.title
    if (body.description !== undefined) modifications.description = body.description
    if (body.locationData) modifications.locationData = body.locationData
    if (body.timeRange) modifications.timeRange = body.timeRange
    if (body.requiredCertifications) modifications.requiredCertifications = body.requiredCertifications
    if (body.guardRequirements) modifications.guardRequirements = body.guardRequirements
    if (body.clientInfo) modifications.clientInfo = body.clientInfo
    if (body.priority) modifications.priority = body.priority
    if (body.rateInformation) modifications.rateInformation = body.rateInformation
    if (body.specialRequirements !== undefined) modifications.specialRequirements = body.specialRequirements
    
    const service = new ShiftManagementService()
    const result = await service.cloneShift(sourceShiftId, modifications)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      }, { status: 201 })
    } else {
      const status = result.error?.code === 'SOURCE_SHIFT_NOT_FOUND' ? 404 : 400
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status })
    }
  } catch (error) {
    console.error(`POST /api/v1/shifts/[id]/clone error:`, error)
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