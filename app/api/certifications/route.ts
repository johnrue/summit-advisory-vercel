import { NextRequest, NextResponse } from 'next/server'
import { CertificationMonitoringService } from '@/lib/services/certification-monitoring-service'
import { CertificationRenewalService } from '@/lib/services/certification-renewal-service'
import { CertificationSchedulingService } from '@/lib/services/certification-scheduling-service'
import { createServerSupabaseClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { validateRequestAuth } from '@/lib/auth'

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
    // Validate authentication - only admins can create certifications
    const authResult = await validateRequestAuth(request, ['admin'])
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error || 'Unauthorized',
          message: 'Access denied. Admin role required.'
        },
        { status: authResult.status || 401 }
      )
    }

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

    // Validate date formats
    const expiryDateObj = new Date(expiryDate)
    if (isNaN(expiryDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid expiry date format' },
        { status: 400 }
      )
    }

    const issuedDateObj = issuedDate ? new Date(issuedDate) : null
    if (issuedDate && isNaN(issuedDateObj?.getTime() || 0)) {
      return NextResponse.json(
        { error: 'Invalid issued date format' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const cookieStore = cookies()
    const supabase = createServerSupabaseClient(cookieStore)

    // Verify guard exists
    const { data: guard, error: guardError } = await supabase
      .from('user_roles')
      .select('id, user_id')
      .eq('user_id', guardId)
      .eq('role', 'guard')
      .single()

    if (guardError || !guard) {
      return NextResponse.json(
        { error: 'Guard not found or invalid guard ID' },
        { status: 404 }
      )
    }

    // Insert certification record
    const certificationData = {
      guard_id: guardId,
      certification_type: certificationType,
      certificate_number: certificateNumber,
      issued_date: issuedDateObj?.toISOString(),
      expiry_date: expiryDateObj.toISOString(),
      issuing_authority: issuingAuthority,
      document_url: documentUrl,
      status: 'active',
      created_by: authResult.userId
    }

    const { data: newCertification, error } = await supabase
      .from('certifications')
      .insert([certificationData])
      .select()
      .single()

    if (error) {
      console.error('Database error creating certification:', error)
      return NextResponse.json(
        { error: 'Failed to create certification in database' },
        { status: 500 }
      )
    }

    // Transform response to match expected format
    const formattedCertification = {
      id: newCertification.id,
      guardId: newCertification.guard_id,
      certificationType: newCertification.certification_type,
      certificateNumber: newCertification.certificate_number,
      issuedDate: newCertification.issued_date,
      expiryDate: newCertification.expiry_date,
      issuingAuthority: newCertification.issuing_authority,
      documentUrl: newCertification.document_url,
      status: newCertification.status,
      createdAt: newCertification.created_at,
      updatedAt: newCertification.updated_at
    }

    return NextResponse.json({
      success: true,
      data: formattedCertification,
      message: 'Certification created successfully'
    }, { status: 201 })
    
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
    // Validate authentication - admins and managers can update certifications
    const authResult = await validateRequestAuth(request, ['admin', 'manager'])
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error || 'Unauthorized',
          message: 'Access denied. Admin or manager role required.'
        },
        { status: authResult.status || 401 }
      )
    }

    const body = await request.json()
    const { 
      certificationId, 
      status, 
      expiryDate, 
      certificateNumber,
      issuingAuthority,
      documentUrl 
    } = body

    if (!certificationId) {
      return NextResponse.json(
        { error: 'Missing required field: certificationId' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const cookieStore = cookies()
    const supabase = createServerSupabaseClient(cookieStore)

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
      updated_by: authResult.userId
    }

    if (status !== undefined) {
      updateData.status = status
    }
    
    if (expiryDate !== undefined) {
      const expiryDateObj = new Date(expiryDate)
      if (isNaN(expiryDateObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiry date format' },
          { status: 400 }
        )
      }
      updateData.expiry_date = expiryDateObj.toISOString()
    }

    if (certificateNumber !== undefined) {
      updateData.certificate_number = certificateNumber
    }

    if (issuingAuthority !== undefined) {
      updateData.issuing_authority = issuingAuthority
    }

    if (documentUrl !== undefined) {
      updateData.document_url = documentUrl
    }

    // Update certification in database
    const { data: updatedCertification, error } = await supabase
      .from('certifications')
      .update(updateData)
      .eq('id', certificationId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Certification not found' },
          { status: 404 }
        )
      }
      console.error('Database error updating certification:', error)
      return NextResponse.json(
        { error: 'Failed to update certification in database' },
        { status: 500 }
      )
    }

    // Transform response to match expected format
    const formattedCertification = {
      id: updatedCertification.id,
      guardId: updatedCertification.guard_id,
      certificationType: updatedCertification.certification_type,
      certificateNumber: updatedCertification.certificate_number,
      issuedDate: updatedCertification.issued_date,
      expiryDate: updatedCertification.expiry_date,
      issuingAuthority: updatedCertification.issuing_authority,
      documentUrl: updatedCertification.document_url,
      status: updatedCertification.status,
      createdAt: updatedCertification.created_at,
      updatedAt: updatedCertification.updated_at
    }

    return NextResponse.json({
      success: true,
      data: formattedCertification,
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