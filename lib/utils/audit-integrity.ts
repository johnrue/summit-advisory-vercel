import { createHash } from 'crypto'

export interface AuditLogData {
  user_id?: string
  action: string
  entity_type: string
  entity_id: string
  details?: any
  created_at?: string
}

export function generateIntegrityHash(auditData: AuditLogData): string {
  const dataToHash = {
    user_id: auditData.user_id || null,
    action: auditData.action,
    entity_type: auditData.entity_type,
    entity_id: auditData.entity_id,
    details: auditData.details || null,
    created_at: auditData.created_at || new Date().toISOString()
  }

  const dataString = JSON.stringify(dataToHash, Object.keys(dataToHash).sort())
  return createHash('sha256').update(dataString).digest('hex')
}

export function verifyIntegrityHash(auditData: AuditLogData, expectedHash: string): boolean {
  const calculatedHash = generateIntegrityHash(auditData)
  return calculatedHash === expectedHash
}

export function createAuditContext(
  previousValues?: any, 
  newValues?: any, 
  context?: string,
  metadata?: Record<string, any>
) {
  return {
    ...(previousValues && { previousValues }),
    ...(newValues && { newValues }),
    ...(context && { context }),
    ...(metadata && { metadata }),
    timestamp: new Date().toISOString()
  }
}