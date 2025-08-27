import { NextRequest, NextResponse } from 'next/server'
import { BackgroundCheckService } from '@/lib/services/background-check-service'

const backgroundCheckService = new BackgroundCheckService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('applicationId')

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 })
    }

    // TODO: Validate user authentication and manager/admin role permissions
    const result = await backgroundCheckService.getAuditTrail(applicationId)
    
    if (result.success) {
      return NextResponse.json({ 
        data: {
          auditTrail: result.data,
          applicationId,
          recordCount: result.data.length
        }
      })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error('Background check audit GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}