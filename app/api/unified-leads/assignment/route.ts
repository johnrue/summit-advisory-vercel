import { NextRequest, NextResponse } from 'next/server'
import { 
  getWorkloadDistribution, 
  getAssignmentRecommendations, 
  assignLead, 
  autoAssignLeads,
  reassignLead 
} from '@/lib/services/unified-assignment-service'

/**
 * GET /api/unified-leads/assignment
 * Get assignment-related data (workload distribution or recommendations)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'workload'

    switch (type) {
      case 'workload':
        const workloadResult = await getWorkloadDistribution()
        
        if (!workloadResult.success) {
          return NextResponse.json(
            { error: workloadResult.error || 'Failed to fetch workload distribution' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: workloadResult.data,
          message: workloadResult.message
        })

      case 'recommendations':
        const leadIds = searchParams.get('leadIds')?.split(',').filter(Boolean)
        const recommendationsResult = await getAssignmentRecommendations(leadIds)
        
        if (!recommendationsResult.success) {
          return NextResponse.json(
            { error: recommendationsResult.error || 'Failed to fetch recommendations' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: recommendationsResult.data,
          message: recommendationsResult.message
        })

      default:
        return NextResponse.json(
          { error: 'Invalid type. Supported types: workload, recommendations' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Assignment GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/unified-leads/assignment
 * Perform assignment operations (assign, reassign, auto-assign)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    // TODO: Add authentication and get current user ID
    const currentUserId = 'current-user-id' // This should come from auth context

    switch (action) {
      case 'assign':
        const { leadId, leadType, managerId } = data
        
        if (!leadId || !leadType || !managerId) {
          return NextResponse.json(
            { error: 'leadId, leadType, and managerId are required for assign action' },
            { status: 400 }
          )
        }

        if (!['client', 'guard'].includes(leadType)) {
          return NextResponse.json(
            { error: 'leadType must be either "client" or "guard"' },
            { status: 400 }
          )
        }

        const assignResult = await assignLead(leadId, leadType, managerId, currentUserId)
        
        if (!assignResult.success) {
          return NextResponse.json(
            { error: assignResult.error || 'Failed to assign lead' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: assignResult.data,
          message: assignResult.message
        })

      case 'reassign':
        const { 
          leadId: reassignLeadId, 
          leadType: reassignLeadType, 
          fromManagerId, 
          toManagerId, 
          reason 
        } = data
        
        if (!reassignLeadId || !reassignLeadType || !fromManagerId || !toManagerId) {
          return NextResponse.json(
            { error: 'leadId, leadType, fromManagerId, and toManagerId are required for reassign action' },
            { status: 400 }
          )
        }

        if (!['client', 'guard'].includes(reassignLeadType)) {
          return NextResponse.json(
            { error: 'leadType must be either "client" or "guard"' },
            { status: 400 }
          )
        }

        const reassignResult = await reassignLead(
          reassignLeadId, 
          reassignLeadType, 
          fromManagerId, 
          toManagerId, 
          currentUserId, 
          reason
        )
        
        if (!reassignResult.success) {
          return NextResponse.json(
            { error: reassignResult.error || 'Failed to reassign lead' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: reassignResult.data,
          message: reassignResult.message
        })

      case 'auto-assign':
        const { leadIds, confidenceThreshold } = data
        
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
          return NextResponse.json(
            { error: 'leadIds array is required and must not be empty for auto-assign action' },
            { status: 400 }
          )
        }

        const autoAssignResult = await autoAssignLeads(
          leadIds, 
          currentUserId, 
          confidenceThreshold || 70
        )
        
        if (!autoAssignResult.success) {
          return NextResponse.json(
            { error: autoAssignResult.error || 'Failed to auto-assign leads' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: autoAssignResult.data,
          message: autoAssignResult.message
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: assign, reassign, auto-assign' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Assignment POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}