'use client'

import { createClient } from '@/lib/supabase'

export type ReportPermission = 
  | 'reports.view_all'
  | 'reports.create'
  | 'reports.edit'
  | 'reports.delete'
  | 'reports.export_data'
  | 'reports.view_sensitive_data'
  | 'reports.schedule_automated'
  | 'reports.manage_all_schedules'
  | 'reports.access_audit_logs'
  | 'reports.view_system_metrics'

export type DataSensitivityLevel = 'public' | 'internal' | 'confidential' | 'restricted'

export interface ReportAccessRule {
  resource: string // Table or data type
  action: string // read, write, export
  conditions?: {
    userRole?: string[]
    permissions?: ReportPermission[]
    dataFields?: string[] // Specific fields that can be accessed
    filters?: Record<string, any> // Additional filters to apply
  }
  sensitivity: DataSensitivityLevel
}

export interface DataMaskingRule {
  field: string
  maskingType: 'full' | 'partial' | 'hash' | 'redact'
  requiredPermissions: ReportPermission[]
  applies_to_roles?: string[]
}

// Define access rules for different data types
const REPORT_ACCESS_RULES: ReportAccessRule[] = [
  // Guards data access
  {
    resource: 'guards',
    action: 'read',
    conditions: {
      userRole: ['admin', 'manager'],
      permissions: ['reports.view_all']
    },
    sensitivity: 'internal'
  },
  {
    resource: 'guards',
    action: 'export',
    conditions: {
      userRole: ['admin', 'manager'],
      permissions: ['reports.export_data'],
      dataFields: ['id', 'full_name', 'email', 'phone', 'status', 'hire_date']
    },
    sensitivity: 'confidential'
  },
  
  // Applications data access
  {
    resource: 'applications',
    action: 'read',
    conditions: {
      userRole: ['admin', 'manager'],
      permissions: ['reports.view_all']
    },
    sensitivity: 'confidential'
  },
  {
    resource: 'applications',
    action: 'export',
    conditions: {
      userRole: ['admin'],
      permissions: ['reports.export_data', 'reports.view_sensitive_data']
    },
    sensitivity: 'restricted'
  },

  // Shifts data access
  {
    resource: 'shifts',
    action: 'read',
    conditions: {
      userRole: ['admin', 'manager', 'guard'],
      permissions: ['reports.view_all']
    },
    sensitivity: 'internal'
  },
  {
    resource: 'shifts',
    action: 'export',
    conditions: {
      userRole: ['admin', 'manager'],
      permissions: ['reports.export_data']
    },
    sensitivity: 'internal'
  },

  // Compliance data access
  {
    resource: 'compliance',
    action: 'read',
    conditions: {
      userRole: ['admin', 'manager'],
      permissions: ['reports.view_all']
    },
    sensitivity: 'confidential'
  },
  {
    resource: 'compliance',
    action: 'export',
    conditions: {
      userRole: ['admin'],
      permissions: ['reports.export_data', 'reports.view_sensitive_data']
    },
    sensitivity: 'restricted'
  },

  // Audit logs access (most restricted)
  {
    resource: 'audit-logs',
    action: 'read',
    conditions: {
      userRole: ['admin'],
      permissions: ['reports.access_audit_logs']
    },
    sensitivity: 'restricted'
  },
  {
    resource: 'audit-logs',
    action: 'export',
    conditions: {
      userRole: ['admin'],
      permissions: ['reports.access_audit_logs', 'reports.export_data']
    },
    sensitivity: 'restricted'
  }
]

// Define data masking rules
const DATA_MASKING_RULES: DataMaskingRule[] = [
  {
    field: 'ssn',
    maskingType: 'partial',
    requiredPermissions: ['reports.view_sensitive_data'],
    applies_to_roles: ['manager']
  },
  {
    field: 'phone',
    maskingType: 'partial',
    requiredPermissions: ['reports.view_sensitive_data']
  },
  {
    field: 'email',
    maskingType: 'partial',
    requiredPermissions: ['reports.view_sensitive_data'],
    applies_to_roles: ['guard']
  },
  {
    field: 'license_number',
    maskingType: 'hash',
    requiredPermissions: ['reports.view_sensitive_data'],
    applies_to_roles: ['manager', 'guard']
  },
  {
    field: 'salary',
    maskingType: 'redact',
    requiredPermissions: ['reports.view_sensitive_data'],
    applies_to_roles: ['manager', 'guard']
  },
  {
    field: 'background_check_details',
    maskingType: 'full',
    requiredPermissions: ['reports.view_sensitive_data'],
    applies_to_roles: ['manager', 'guard']
  }
]

class ReportAccessControlService {
  private supabase = createClient()

  /**
   * Check if user has access to a specific report action
   */
  async checkReportAccess(
    userId: string,
    resource: string,
    action: string
  ): Promise<{ hasAccess: boolean; allowedFields?: string[]; error?: string }> {
    try {
      // Get user role and permissions
      const userContext = await this.getUserContext(userId)
      if (!userContext.success) {
        return { hasAccess: false, error: userContext.error }
      }

      const { role, permissions } = userContext.data!

      // Find applicable access rule
      const accessRule = REPORT_ACCESS_RULES.find(
        rule => rule.resource === resource && rule.action === action
      )

      if (!accessRule) {
        return { hasAccess: false, error: `No access rule defined for ${resource}:${action}` }
      }

      // Check role requirements
      if (accessRule.conditions?.userRole && !accessRule.conditions.userRole.includes(role)) {
        return { hasAccess: false, error: 'Insufficient role permissions' }
      }

      // Check permission requirements
      if (accessRule.conditions?.permissions) {
        const hasRequiredPermissions = accessRule.conditions.permissions.every(
          permission => permissions.includes(permission)
        )
        
        if (!hasRequiredPermissions) {
          return { 
            hasAccess: false, 
            error: `Missing required permissions: ${accessRule.conditions.permissions.join(', ')}` 
          }
        }
      }

      return {
        hasAccess: true,
        allowedFields: accessRule.conditions?.dataFields
      }

    } catch (error) {
      return {
        hasAccess: false,
        error: error instanceof Error ? error.message : 'Access check failed'
      }
    }
  }

  /**
   * Apply data masking to exported data based on user permissions
   */
  async applyDataMasking(
    userId: string,
    data: Record<string, any>[],
    dataType: string
  ): Promise<Record<string, any>[]> {
    try {
      // Get user context
      const userContext = await this.getUserContext(userId)
      if (!userContext.success) {
        return data // Return original data if can't determine permissions
      }

      const { role, permissions } = userContext.data!

      // Apply masking rules
      return data.map(record => {
        const maskedRecord = { ...record }

        DATA_MASKING_RULES.forEach(rule => {
          if (maskedRecord.hasOwnProperty(rule.field)) {
            // Check if user has required permissions to see unmasked data
            const hasPermission = rule.requiredPermissions.every(
              permission => permissions.includes(permission)
            )

            // Check if rule applies to user's role
            const appliesToRole = !rule.applies_to_roles || rule.applies_to_roles.includes(role)

            // If user doesn't have permission or rule applies to their role, mask the data
            if (!hasPermission || appliesToRole) {
              maskedRecord[rule.field] = this.maskValue(maskedRecord[rule.field], rule.maskingType)
            }
          }
        })

        return maskedRecord
      })

    } catch (error) {
      console.error('Data masking error:', error)
      return data // Return original data on error to avoid breaking exports
    }
  }

  /**
   * Get allowed fields for data export based on user permissions
   */
  async getAllowedExportFields(
    userId: string,
    dataType: string
  ): Promise<{ success: boolean; fields?: string[]; error?: string }> {
    try {
      const accessCheck = await this.checkReportAccess(userId, dataType, 'export')
      
      if (!accessCheck.hasAccess) {
        return { success: false, error: accessCheck.error }
      }

      // If specific fields are defined, return them
      if (accessCheck.allowedFields) {
        return { success: true, fields: accessCheck.allowedFields }
      }

      // Otherwise, get user context to determine field restrictions
      const userContext = await this.getUserContext(userId)
      if (!userContext.success) {
        return { success: false, error: userContext.error }
      }

      const { role, permissions } = userContext.data!

      // Get all available fields for the data type
      const allFields = this.getAvailableFields(dataType)
      
      // Filter out sensitive fields based on permissions
      const allowedFields = allFields.filter(field => {
        const maskingRule = DATA_MASKING_RULES.find(rule => rule.field === field)
        
        if (!maskingRule) {
          return true // Allow if no masking rule
        }

        // Check if user has required permissions for sensitive field
        const hasPermission = maskingRule.requiredPermissions.every(
          permission => permissions.includes(permission)
        )

        // Check if masking rule applies to user's role
        const appliesToRole = !maskingRule.applies_to_roles || maskingRule.applies_to_roles.includes(role)

        // Allow field if user has permission and rule doesn't apply to their role
        return hasPermission && !appliesToRole
      })

      return { success: true, fields: allowedFields }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get allowed fields'
      }
    }
  }

  /**
   * Create audit log entry for report access
   */
  async logReportAccess(
    userId: string,
    action: string,
    resource: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const auditEntry = {
        user_id: userId,
        action: `report_${action}`,
        resource_type: 'report_system',
        resource_id: resource,
        details: {
          ...metadata,
          timestamp: new Date().toISOString(),
          user_agent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
        },
        timestamp: new Date().toISOString()
      }

      await this.supabase.from('audit_logs').insert(auditEntry)
    } catch (error) {
      console.error('Failed to log report access:', error)
      // Don't throw error as this shouldn't fail the main operation
    }
  }

  /**
   * Check if user can manage scheduled reports
   */
  async canManageScheduledReports(userId: string): Promise<boolean> {
    try {
      const userContext = await this.getUserContext(userId)
      if (!userContext.success) {
        return false
      }

      const { role, permissions } = userContext.data!
      
      return role === 'admin' || permissions.includes('reports.manage_all_schedules')
    } catch (error) {
      console.error('Error checking scheduled report permissions:', error)
      return false
    }
  }

  /**
   * Apply row-level security filters based on user context
   */
  async getDataFilters(
    userId: string,
    dataType: string
  ): Promise<Record<string, any>> {
    try {
      const userContext = await this.getUserContext(userId)
      if (!userContext.success) {
        return {}
      }

      const { role } = userContext.data!

      // Apply different filters based on role and data type
      const filters: Record<string, any> = {}

      if (role === 'guard') {
        // Guards can only see their own data
        filters.guard_id = userId

        if (dataType === 'shifts') {
          filters.assigned_guard = userId
        }
      }

      if (role === 'manager') {
        // Managers can see data for guards they manage
        // This would need to be implemented based on your org structure
        // For now, we'll allow all data for managers
      }

      // Admins can see all data (no additional filters)

      return filters
    } catch (error) {
      console.error('Error getting data filters:', error)
      return {}
    }
  }

  /**
   * Get user context including role and permissions
   */
  private async getUserContext(userId: string): Promise<{
    success: boolean
    data?: { role: string; permissions: ReportPermission[] }
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('user_roles')
        .select('role, permissions')
        .eq('user_id', userId)
        .single()

      if (error) {
        return { success: false, error: `Failed to get user context: ${error.message}` }
      }

      if (!data) {
        return { success: false, error: 'User not found' }
      }

      return {
        success: true,
        data: {
          role: data.role,
          permissions: data.permissions || []
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Mask sensitive data value
   */
  private maskValue(value: any, maskingType: DataMaskingRule['maskingType']): any {
    if (value === null || value === undefined) {
      return value
    }

    const stringValue = String(value)

    switch (maskingType) {
      case 'full':
        return '*'.repeat(stringValue.length)
      
      case 'partial':
        if (stringValue.length <= 4) {
          return '*'.repeat(stringValue.length)
        }
        return stringValue.slice(0, 2) + '*'.repeat(stringValue.length - 4) + stringValue.slice(-2)
      
      case 'hash':
        // Simple hash for demo - in production use crypto.createHash
        return `***${stringValue.slice(-4)}`
      
      case 'redact':
        return '[REDACTED]'
      
      default:
        return value
    }
  }

  /**
   * Get available fields for a data type
   */
  private getAvailableFields(dataType: string): string[] {
    const fieldMap: Record<string, string[]> = {
      'guards': ['id', 'full_name', 'email', 'phone', 'status', 'license_number', 'hire_date', 'ssn', 'salary'],
      'applications': ['id', 'applicant_name', 'email', 'phone', 'status', 'pipeline_stage', 'applied_date', 'background_check_details'],
      'shifts': ['id', 'title', 'location', 'start_time', 'end_time', 'status', 'assigned_guard', 'hourly_rate'],
      'compliance': ['id', 'guard_id', 'certification_type', 'issue_date', 'expiry_date', 'status'],
      'audit-logs': ['id', 'timestamp', 'user_id', 'action', 'resource_type', 'resource_id', 'details']
    }

    return fieldMap[dataType] || []
  }
}

// Export singleton instance
export const reportAccessControl = new ReportAccessControlService()
export default reportAccessControl