import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { ShiftManagementService } from '@/lib/services/shift-service'
import type { ShiftCreateData, ShiftFilterOptions, PaginationOptions } from '@/lib/types/shift-types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse filters
    const filters: ShiftFilterOptions = {}
    
    const status = searchParams.get('status')
    if (status) {
      filters.status = status.split(',') as any[]
    }
    
    const assignedGuardId = searchParams.get('assignedGuardId')
    if (assignedGuardId) {
      filters.assignedGuardId = assignedGuardId
    }
    
    const clientId = searchParams.get('clientId')
    if (clientId) {
      filters.clientId = clientId
    }
    
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    if (startDate && endDate) {
      filters.dateRange = { start: startDate, end: endDate }
    }
    
    const priority = searchParams.get('priority')
    if (priority) {
      filters.priority = priority.split(',').map(p => parseInt(p))
    }
    
    const requiredCertifications = searchParams.get('requiredCertifications')
    if (requiredCertifications) {
      filters.requiredCertifications = requiredCertifications.split(',')
    }
    
    // Parse pagination
    const pagination: PaginationOptions = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    }
    
    const service = new ShiftManagementService()
    const result = await service.getShifts(filters, pagination)
    
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
    console.error('GET /api/v1/shifts error:', error)
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
    if (!body.title || !body.locationData || !body.timeRange || !body.clientInfo || !body.rateInformation) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields'
        }
      }, { status: 400 })
    }
    
    // TODO: Get actual user ID from session/auth
    const managerId = 'current-user-id'
    
    const shiftData: ShiftCreateData = {
      title: body.title,
      description: body.description,
      locationData: body.locationData,
      timeRange: body.timeRange,
      requiredCertifications: body.requiredCertifications || [],
      guardRequirements: body.guardRequirements || {},
      clientInfo: body.clientInfo,
      priority: body.priority || 3,
      rateInformation: body.rateInformation,
      specialRequirements: body.specialRequirements
    }
    
    const service = new ShiftManagementService()
    const result = await service.createShift(shiftData, managerId)
    
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
    console.error('POST /api/v1/shifts error:', error)
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