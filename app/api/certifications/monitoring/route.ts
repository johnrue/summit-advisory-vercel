import { NextRequest, NextResponse } from 'next/server'
import { CertificationMonitoringService } from '@/lib/services/certification-monitoring-service'

/**
 * GET /api/certifications/monitoring
 * Get certification monitoring data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'escalation') {
      // Get guards requiring escalation
      const guardsForEscalation = await CertificationMonitoringService.getGuardsForEscalation()
      return NextResponse.json(guardsForEscalation)
    }
    
    // Default: check all expirations
    const expiryChecks = await CertificationMonitoringService.checkExpirations()
    return NextResponse.json(expiryChecks)
    
  } catch (error) {
    console.error('Error in GET /api/certifications/monitoring:', error)
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/certifications/monitoring/escalate
 * Process escalation notifications
 */
export async function POST(request: NextRequest) {
  try {
    await CertificationMonitoringService.processEscalations()
    
    return NextResponse.json({
      success: true,
      message: 'Escalation notifications processed successfully'
    })
    
  } catch (error) {
    console.error('Error processing escalations:', error)
    return NextResponse.json(
      { error: 'Failed to process escalation notifications' },
      { status: 500 }
    )
  }
}