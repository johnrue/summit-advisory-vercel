import { NextRequest, NextResponse } from 'next/server'
import { CertificationSchedulingService } from '@/lib/services/certification-scheduling-service'

/**
 * GET /api/certifications/scheduling
 * Check guard scheduling eligibility or get scheduling report
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guardId = searchParams.get('guardId')
    const shiftId = searchParams.get('shiftId')
    const action = searchParams.get('action')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    if (action === 'report' && startDate && endDate) {
      // Get scheduling restrictions report
      const report = await CertificationSchedulingService.getSchedulingRestrictionsReport(
        new Date(startDate),
        new Date(endDate)
      )
      return NextResponse.json(report)
    }
    
    if (guardId && shiftId) {
      // Validate specific shift assignment
      const validation = await CertificationSchedulingService.validateShiftAssignment(guardId, shiftId)
      return NextResponse.json(validation)
    }
    
    if (guardId) {
      // Check if guard can be scheduled
      const eligibility = await CertificationSchedulingService.canGuardBeScheduled(guardId)
      return NextResponse.json(eligibility)
    }
    
    // Default: get all available guards
    const availableGuards = await CertificationSchedulingService.getAvailableGuards()
    return NextResponse.json(availableGuards)
    
  } catch (error) {
    console.error('Error in GET /api/certifications/scheduling:', error)
    return NextResponse.json(
      { error: 'Failed to check scheduling eligibility' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/certifications/scheduling/override
 * Create emergency scheduling override
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guardId, shiftId, reason, authorizedBy, expiryDate } = body

    // Validate required fields
    if (!guardId || !reason || !authorizedBy || !expiryDate) {
      return NextResponse.json(
        { error: 'Missing required fields: guardId, reason, authorizedBy, expiryDate' },
        { status: 400 }
      )
    }

    // Validate expiry date is in the future
    const expiry = new Date(expiryDate)
    if (expiry <= new Date()) {
      return NextResponse.json(
        { error: 'Override expiry date must be in the future' },
        { status: 400 }
      )
    }

    const overrideId = await CertificationSchedulingService.createEmergencyOverride({
      guardId,
      shiftId,
      reason,
      authorizedBy,
      expiryDate: expiry
    })

    return NextResponse.json({
      success: true,
      overrideId,
      message: 'Emergency scheduling override created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating emergency override:', error)
    return NextResponse.json(
      { error: 'Failed to create emergency override' },
      { status: 500 }
    )
  }
}