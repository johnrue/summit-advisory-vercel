import { NextRequest, NextResponse } from 'next/server'
import { CertificationRenewalService } from '@/lib/services/certification-renewal-service'

/**
 * GET /api/certifications/renewals
 * Get certification renewal requests
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const certificationId = searchParams.get('certificationId')
    
    if (certificationId) {
      // Get renewal history for a specific certification
      const history = await CertificationRenewalService.getCertificationHistory(certificationId)
      return NextResponse.json(history)
    }
    
    if (status === 'pending' || !status) {
      // Get pending renewal requests
      const pendingRenewals = await CertificationRenewalService.getPendingRenewalRequests()
      return NextResponse.json(pendingRenewals)
    }
    
    return NextResponse.json([])
    
  } catch (error) {
    console.error('Error fetching renewal requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch renewal requests' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/certifications/renewals
 * Submit a new certification renewal request
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const certificationId = formData.get('certificationId') as string
    const guardId = formData.get('guardId') as string
    const newExpiryDate = formData.get('newExpiryDate') as string
    const userId = formData.get('userId') as string
    const documentFile = formData.get('documentFile') as File

    // Validate required fields
    if (!certificationId || !guardId || !newExpiryDate || !userId || !documentFile) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(documentFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF and image files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (documentFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    const renewalRequest = await CertificationRenewalService.submitRenewalRequest({
      certificationId,
      guardId,
      newExpiryDate: new Date(newExpiryDate),
      documentFile,
      userId
    })

    return NextResponse.json(renewalRequest, { status: 201 })
    
  } catch (error) {
    console.error('Error submitting renewal request:', error)
    return NextResponse.json(
      { error: 'Failed to submit renewal request' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/certifications/renewals
 * Review and approve/reject a renewal request
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { renewalRequestId, action, reviewNotes, reviewedBy } = body

    if (!renewalRequestId || !action || !reviewedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: renewalRequestId, action, reviewedBy' },
        { status: 400 }
      )
    }

    if (!['approved', 'rejected'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approved" or "rejected"' },
        { status: 400 }
      )
    }

    const reviewedRequest = await CertificationRenewalService.reviewRenewalRequest({
      renewalRequestId,
      action,
      reviewNotes,
      reviewedBy
    })

    return NextResponse.json(reviewedRequest)
    
  } catch (error) {
    console.error('Error reviewing renewal request:', error)
    return NextResponse.json(
      { error: 'Failed to review renewal request' },
      { status: 500 }
    )
  }
}