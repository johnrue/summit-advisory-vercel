import { NextRequest, NextResponse } from 'next/server'
import { AuditRetentionService } from '@/lib/services/audit-retention-service'
import { createClient } from '@/lib/supabase'

const retentionService = AuditRetentionService.getInstance()

async function checkAdminAuth(request: NextRequest): Promise<{ authorized: boolean; userId?: string }> {
  try {
    const supabase = createClient()
    
    // Check for API key or bearer token
    const authHeader = request.headers.get('Authorization')
    const apiKey = request.headers.get('X-API-Key')
    
    // For scheduled jobs, check if it's from Vercel cron
    const vercelCron = request.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`
    
    if (vercelCron) {
      return { authorized: true, userId: 'system-cron' }
    }
    
    if (apiKey === process.env.RETENTION_API_KEY) {
      return { authorized: true, userId: 'system-api' }
    }

    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false }
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { authorized: false }
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !roleData || roleData.role !== 'admin') {
      return { authorized: false }
    }

    return { authorized: true, userId: user.id }
  } catch (error) {
    console.error('Error checking admin authorization:', error)
    return { authorized: false }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authResult = await checkAdminAuth(request)
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'run_archival':
        console.log('Starting audit log archival process...')
        
        const archivalResult = await retentionService.runArchivalProcess()
        
        if (!archivalResult.success) {
          console.error('Archival process failed:', archivalResult.error)
          return NextResponse.json(
            { error: archivalResult.error },
            { status: 500 }
          )
        }

        console.log('Archival process completed:', archivalResult.data)
        
        return NextResponse.json({
          success: true,
          data: archivalResult.data,
          message: 'Archival process completed successfully'
        })

      case 'get_stats':
        const statsResult = await retentionService.getArchivalStats()
        
        if (!statsResult.success) {
          return NextResponse.json(
            { error: statsResult.error },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: statsResult.data
        })

      case 'get_jobs':
        const limit = parseInt(body.limit || '10', 10)
        const jobsResult = await retentionService.getRetentionJobs(limit)
        
        if (!jobsResult.success) {
          return NextResponse.json(
            { error: jobsResult.error },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: jobsResult.data
        })

      case 'get_policy':
        const { entityType } = body
        
        if (!entityType) {
          return NextResponse.json(
            { error: 'entityType is required' },
            { status: 400 }
          )
        }

        const policyResult = await retentionService.getRetentionPolicy(entityType)
        
        if (!policyResult.success) {
          return NextResponse.json(
            { error: policyResult.error },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: policyResult.data
        })

      case 'update_policy':
        const { entityType: updateEntityType, updates } = body
        
        if (!updateEntityType || !updates) {
          return NextResponse.json(
            { error: 'entityType and updates are required' },
            { status: 400 }
          )
        }

        const updateResult = await retentionService.updateRetentionPolicy(updateEntityType, updates)
        
        if (!updateResult.success) {
          return NextResponse.json(
            { error: updateResult.error },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          data: updateResult.data,
          message: 'Retention policy updated successfully'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: run_archival, get_stats, get_jobs, get_policy, update_policy' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in retention endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for cron jobs and status checks
export async function GET(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth(request)
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'run_archival') {
      // This allows cron jobs to trigger archival via GET request
      console.log('Running scheduled audit log archival...')
      
      const result = await retentionService.runArchivalProcess()
      
      if (!result.success) {
        console.error('Scheduled archival failed:', result.error)
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      }

      console.log('Scheduled archival completed:', result.data)
      
      return NextResponse.json({
        success: true,
        data: result.data,
        message: 'Scheduled archival completed'
      })
    }

    // Default: return stats
    const statsResult = await retentionService.getArchivalStats()
    
    if (!statsResult.success) {
      return NextResponse.json(
        { error: statsResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: statsResult.data,
      retention_endpoint: 'active'
    })
  } catch (error) {
    console.error('Error in retention GET endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}