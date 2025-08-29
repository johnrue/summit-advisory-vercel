import { NextRequest, NextResponse } from 'next/server'
import { CertificationMonitoringService } from '@/lib/services/certification-monitoring-service'
import { CertificationRenewalService } from '@/lib/services/certification-renewal-service'
import { CertificationSchedulingService } from '@/lib/services/certification-scheduling-service'

/**
 * GET /api/certifications
 * Get guard certifications with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guardId = searchParams.get('guardId')
    const status = searchParams.get('status')
    
    if (guardId) {
      // Get certifications for a specific guard
      const certifications = await CertificationRenewalService.getGuardCertifications(guardId)
      
      // Filter by status if provided
      const filteredCertifications = status 
        ? certifications.filter(cert => cert.status === status)
        : certifications
      
      return NextResponse.json(filteredCertifications)
    }
    
    // Default: return available guards for scheduling
    const availableGuards = await CertificationSchedulingService.getAvailableGuards()
    return NextResponse.json(availableGuards)
    
  } catch (error) {
    console.error('Error in GET /api/certifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch certifications' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/certifications
 * Create a new certification record (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      guardId,
      certificationType,
      certificateNumber,
      issuedDate,
      expiryDate,
      issuingAuthority,
      documentUrl
    } = body

    // Validate required fields
    if (!guardId || !certificationType || !expiryDate) {
      return NextResponse.json(
        { error: 'Missing required fields: guardId, certificationType, expiryDate' },
        { status: 400 }
      )
    }

    // In a real implementation, this would use a proper service
    // For now, return a placeholder response
    const newCertification = {
      id: `cert_${Date.now()}`,
      guardId,
      certificationType,
      certificateNumber,
      issuedDate: issuedDate ? new Date(issuedDate) : undefined,
      expiryDate: new Date(expiryDate),
      issuingAuthority,
      documentUrl,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newCertification, { status: 201 })
    
  } catch (error) {
    console.error('Error in POST /api/certifications:', error)
    return NextResponse.json(
      { error: 'Failed to create certification' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/certifications
 * Update certification status or information
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { certificationId, status, expiryDate } = body

    if (!certificationId) {
      return NextResponse.json(
        { error: 'Missing required field: certificationId' },
        { status: 400 }
      )
    }

    // In a real implementation, this would update the database
    // For now, return success response
    return NextResponse.json({
      success: true,
      message: 'Certification updated successfully'
    })
    
  } catch (error) {
    console.error('Error in PUT /api/certifications:', error)
    return NextResponse.json(
      { error: 'Failed to update certification' },
      { status: 500 }
    )
  }
}