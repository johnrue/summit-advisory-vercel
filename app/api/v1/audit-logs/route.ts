import { NextRequest, NextResponse } from 'next/server'
import { AuditService } from '@/lib/services/audit-service'
import type { AuditLogFilter, AuditAction, AuditEntityType } from '@/lib/types/audit-types'
import { createClient } from '@/lib/supabase'

const auditService = AuditService.getInstance()

async function checkUserRole(request: NextRequest): Promise<{ authorized: boolean; userId?: string; role?: string }> {
  try {
    const supabase = createClient()
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false }
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { authorized: false }
    }

    // Get user role from user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !roleData) {
      return { authorized: false }
    }

    // Only admins and managers can access audit logs
    const authorized = roleData.role === 'admin' || roleData.role === 'manager'
    
    return { 
      authorized, 
      userId: user.id, 
      role: roleData.role 
    }
  } catch (error) {
    console.error('Error checking user authorization:', error)
    return { authorized: false }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const authResult = await checkUserRole(request)
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin or Manager role required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Extract filter parameters
    const filters: AuditLogFilter = {
      user_id: searchParams.get('userId') || undefined,
      action: (searchParams.get('action') as AuditAction) || undefined,
      entity_type: (searchParams.get('entityType') as AuditEntityType) || undefined,
      entity_id: searchParams.get('entityId') || undefined,
      date_from: searchParams.get('dateFrom') || undefined,
      date_to: searchParams.get('dateTo') || undefined,
      search: searchParams.get('search') || undefined
    }

    // Pagination parameters
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    
    // Validate pagination parameters
    if (limit > 100 || limit < 1) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      )
    }

    // Get audit logs
    const result = await auditService.getAuditLogs(filters, limit, offset)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        limit,
        offset,
        user_role: authResult.role
      }
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authorization - only admins can perform admin operations
    const authResult = await checkUserRole(request)
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, logId } = body

    switch (action) {
      case 'verify_integrity':
        if (authResult.role !== 'admin') {
          return NextResponse.json(
            { error: 'Admin role required for integrity verification' },
            { status: 403 }
          )
        }

        if (!logId) {
          return NextResponse.json(
            { error: 'logId is required for integrity verification' },
            { status: 400 }
          )
        }

        const verifyResult = await auditService.verifyLogIntegrity(logId)
        
        if (!verifyResult.success) {
          return NextResponse.json(
            { error: verifyResult.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            logId,
            integrityValid: verifyResult.data,
            verifiedAt: new Date().toISOString(),
            verifiedBy: authResult.userId
          }
        })

      case 'get_summary':
        const { entityType, entityId, dateFrom, dateTo } = body
        
        const summaryResult = await auditService.getAuditSummary(
          entityType,
          entityId,
          dateFrom,
          dateTo
        )
        
        if (!summaryResult.success) {
          return NextResponse.json(
            { error: summaryResult.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: summaryResult.data
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: verify_integrity, get_summary' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error processing audit log request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}