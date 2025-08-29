import { NextResponse } from 'next/server'
import { CertificationMonitoringService } from '@/lib/services/certification-monitoring-service'

/**
 * GET /api/certifications/dashboard
 * Get certification compliance dashboard data
 */
export async function GET() {
  try {
    const dashboardData = await CertificationMonitoringService.getCertificationDashboard()
    return NextResponse.json(dashboardData)
    
  } catch (error) {
    console.error('Error fetching certification dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}