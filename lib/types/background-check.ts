export type BackgroundCheckStatus = 
  | 'pending'           // Initial state when background check is ordered
  | 'in_progress'       // Background check vendor processing
  | 'complete'          // Background check passed successfully
  | 'failed'           // Background check failed requirements
  | 'expired'          // Background check has expired and needs renewal
  | 'cancelled'        // Background check cancelled or withdrawn

export type BackgroundCheckCommentType =
  | 'general'
  | 'vendor_update'
  | 'manager_note'
  | 'compliance_note'
  | 'expiry_reminder'

export interface BackgroundCheckUpdate {
  status: BackgroundCheckStatus
  vendorConfirmationNumber?: string
  expiryDate?: Date
  notes: string
  supportingDocuments?: DocumentReference[]
  approverSignature: string
}

export interface BackgroundCheckAudit {
  id: string
  applicationId: string
  previousStatus: BackgroundCheckStatus | null
  newStatus: BackgroundCheckStatus
  changedBy: string
  changeReason: string
  vendorConfirmation?: string
  supportingDocuments?: Record<string, any>
  createdAt: Date
  managerSignature: string
  isSystemGenerated: boolean
}

export interface DocumentReference {
  id: string
  name: string
  type: string
  url: string
  uploadedAt: Date
}

export interface BackgroundCheckData {
  status: BackgroundCheckStatus
  date?: Date
  vendorConfirmationNumber?: string
  expiryDate?: Date
  notes?: string
  approvedBy?: string
  auditTrail?: BackgroundCheckAudit[]
}

export interface BackgroundCheckNotificationConfig {
  statusChangeNotifications: {
    managerUpdates: boolean
    applicantUpdates: boolean
    adminOverride: boolean
  }
  expiryReminders: {
    enabled: boolean
    reminderDays: number[] // [30, 14, 7]
    recipientRoles: string[]
  }
  deliverySettings: {
    immediateNotifications: boolean
    digestFrequency: 'daily' | 'weekly'
    retryAttempts: number
  }
}

export interface ExpiryReminderAlert {
  applicationId: string
  applicantName: string
  currentStatus: BackgroundCheckStatus
  expiryDate: Date
  daysUntilExpiry: number
  assignedManager?: string
  lastReminderSent?: Date
}

export interface BackgroundCheckMetrics {
  totalChecks: number
  completedChecks: number
  failedChecks: number
  expiringChecks: number
  averageProcessingDays: number
  complianceRate: number
}