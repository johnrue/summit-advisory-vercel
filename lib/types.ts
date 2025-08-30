// TypeScript interfaces for the Summit Advisory application

// Consultation request form data
export interface ConsultationFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  serviceType: string
  message: string
}

// Database consultation request record
export interface ConsultationRequest extends ConsultationFormData {
  id: string
  created_at: string
  status: 'new' | 'contacted' | 'scheduled' | 'completed' | 'cancelled'
  updated_at: string
}

// Service types for the select dropdown
export type ServiceType = 
  | 'armed'
  | 'unarmed' 
  | 'event'
  | 'executive'
  | 'commercial'
  | 'consulting'
  | 'other'

// Response types for API operations
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Analytics event parameters
export interface AnalyticsEventParams {
  campaign?: string
  source?: string
  service?: string
  cta_name?: string
  location?: string
  error?: string
}

// Company information types (extending existing structure)
export interface ContactInfo {
  name: string
  email: {
    compliance: string
    operations: string
  }
  phone: {
    call: string
    text: string
    textNoFormatting: string
  }
  license: {
    dps: string
  }
  locations: {
    defaultState: string
    mainOffice: {
      address: string
      city: string
      state: string
      zip: string
    }
    serviceAreas: string[]
  }
  hours: {
    weekday: string
    emergency: string
  }
}

// Guard Management Types
export interface Guard {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  licenseNumber: string
  licenseExpiry: Date
  employmentStatus: 'active' | 'inactive' | 'terminated'
  employmentStartDate: Date
  ssn: string
  dateOfBirth: Date
  homeAddress: string
  emergencyContact: string
  certifications?: Certification
  backgroundChecks?: BackgroundCheck
  trainingRecords?: TrainingRecord
  created_at: string
  updated_at: string
}

export interface Certification {
  id: string
  guardId: string
  status: 'active' | 'expired' | 'pending_renewal'
  issueDate: Date
  expiryDate: Date
  certificationNumber: string
  certificationTypes: string[]
}

export interface BackgroundCheck {
  id: string
  guardId: string
  status: 'passed' | 'pending' | 'failed'
  completedAt: Date
  expiryDate: Date
  checkType: 'dps' | 'fbi' | 'both'
  notes?: string
}

export interface TrainingRecord {
  id: string
  guardId: string
  trainingType: string
  completedAt: Date
  expiryDate?: Date
  certificateNumber?: string
  instructor: string
}

// TOPS Compliance Report Types
export interface ReportParameters {
  startDate: Date
  endDate: Date
  format: 'pdf' | 'csv'
  includeSensitiveData: boolean
  generatedBy: string
  recipients?: string[]
}

export interface TOPSReportData {
  reportPeriod: {
    startDate: Date
    endDate: Date
  }
  company: {
    name: string
    license: string
    contact: string
    serviceAreas: string[]
  }
  guards: Guard[]
  generatedBy: string
  generatedAt: Date
  reportType: 'tops_compliance'
}

export interface ComplianceReport {
  id: string
  data: TOPSReportData
  metadata: any
  format: 'pdf' | 'csv'
}

// Certification Management Types
export interface GuardCertification {
  id: string
  guardId: string
  certificationType: string // 'TOPS License', 'CPR', 'First Aid', etc.
  certificateNumber?: string
  issuedDate?: Date
  expiryDate: Date
  issuingAuthority?: string
  documentUrl?: string
  status: 'active' | 'expired' | 'pending_renewal'
  createdAt: string
  updatedAt: string
}

export interface CertificationHistory {
  id: string
  guardCertificationId: string
  action: 'issued' | 'renewed' | 'expired' | 'revoked'
  previousExpiryDate?: Date
  newExpiryDate?: Date
  documentUrl?: string
  processedBy?: string
  notes?: string
  createdAt: string
}

export interface CertificationRenewalRequest {
  id: string
  guardCertificationId: string
  guardId: string
  newDocumentUrl?: string
  newExpiryDate?: Date
  requestStatus: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  reviewNotes?: string
}

export interface CertificationAlert {
  id: string
  guardCertificationId: string
  guardId: string
  alertType: '30_day' | '14_day' | '7_day' | 'expired' | 'escalation'
  alertDate: Date
  sentAt?: string
  emailSent: boolean
  escalated: boolean
  createdAt: string
}

export interface CertificationExpiryCheck {
  certification: GuardCertification
  guard: Guard
  daysUntilExpiry: number
  alertType: '30_day' | '14_day' | '7_day' | 'expired'
  shouldAlert: boolean
  canSchedule: boolean
}

export interface CertificationDashboardData {
  expiringIn30Days: CertificationExpiryCheck[]
  expiringIn14Days: CertificationExpiryCheck[]
  expiringIn7Days: CertificationExpiryCheck[]
  expired: CertificationExpiryCheck[]
  totalGuards: number
  compliantGuards: number
  nonCompliantGuards: number
  pendingRenewals: number
}

// Notification System Types
export interface Notification {
  id: string
  recipientId: string
  senderId?: string
  type: NotificationType
  priority: NotificationPriority
  category: NotificationCategory
  title: string
  message: string
  actionData?: Record<string, any>
  entityType?: string
  entityId?: string
  deliveryStatus: NotificationDeliveryStatus
  deliveryChannels: NotificationChannel[]
  isRead: boolean
  readAt?: string
  acknowledgedAt?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface NotificationPreferences {
  id: string
  userId: string
  inAppNotifications: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  scheduleNotifications: boolean
  availabilityNotifications: boolean
  assignmentNotifications: boolean
  systemNotifications: boolean
  complianceNotifications: boolean
  emergencyNotifications: boolean
  notificationFrequency: NotificationFrequency
  quietHoursStart?: string
  quietHoursEnd?: string
  weekendNotifications: boolean
  emailDigestEnabled: boolean
  emailDigestFrequency: NotificationFrequency
  minimumPriority: NotificationPriority
  createdAt: string
  updatedAt: string
}

export interface NotificationTemplate {
  id: string
  type: string
  channel: NotificationChannel
  subjectTemplate?: string
  bodyTemplate: string
  variables: Record<string, string>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Notification Enums
export type NotificationType = 
  | 'shift_assignment' 
  | 'shift_change' 
  | 'shift_cancellation'
  | 'certification_expiry'
  | 'approval_needed'
  | 'approval_granted'
  | 'approval_denied'
  | 'hiring_update'
  | 'document_required'
  | 'system_alert'
  | 'compliance_reminder'
  | 'emergency_alert'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical'

export type NotificationCategory = 
  | 'scheduling'
  | 'compliance'
  | 'hiring'
  | 'system'
  | 'emergency'

export type NotificationChannel = 'in_app' | 'email' | 'sms'

export type NotificationDeliveryStatus = 
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'

export type NotificationFrequency = 
  | 'immediate'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'disabled'

// Notification Service Types
export interface CreateNotificationData {
  recipientId: string
  senderId?: string
  type: NotificationType
  title: string
  message: string
  priority?: NotificationPriority
  category?: NotificationCategory
  channels?: NotificationChannel[]
  actionData?: Record<string, any>
  entityType?: string
  entityId?: string
  expiresAt?: Date
}

export interface NotificationDigest {
  id: string
  recipientId: string
  notifications: Notification[]
  period: {
    startDate: Date
    endDate: Date
  }
  deliverySchedule: NotificationFrequency
  createdAt: string
  sentAt?: string
}

export interface NotificationStats {
  totalNotifications: number
  unreadCount: number
  byPriority: Record<NotificationPriority, number>
  byCategory: Record<NotificationCategory, number>
  deliveryStats: Record<NotificationChannel, {
    sent: number
    delivered: number
    failed: number
  }>
}

export interface NotificationEscalation {
  id: string
  originalNotificationId: string
  recipientId: string
  escalationLevel: number
  escalatedAt: string
  escalatedTo?: string
  reason: string
  resolved: boolean
  resolvedAt?: string
}

// Lead Management Types
export interface Lead {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  sourceType: string
  sourceDetails: Record<string, any>
  serviceType: string
  message?: string
  estimatedValue?: number
  status: 'prospect' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  assignedTo?: string
  assignedAt?: string
  qualificationScore: number
  qualificationNotes?: string
  lastContactDate?: string
  nextFollowUpDate?: string
  contactCount: number
  convertedToContract: boolean
  contractSignedDate?: string
  created_at: string
  updated_at: string
}

export interface LeadFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  sourceType: string
  sourceDetails?: Record<string, any>
  serviceType: string
  message?: string
  estimatedValue?: number
}

export interface LeadFilters {
  status?: string[]
  sourceType?: string[]
  assignedTo?: string
  dateRange?: {
    start: string
    end: string
  }
  search?: string
}

export interface LeadStats {
  totalLeads: number
  byStatus: Record<string, number>
  bySource: Record<string, number>
  conversionRate: number
  averageValue: number
  averageScore: number
}

export interface LeadAssignmentRule {
  id: string
  name: string
  priority: number
  conditions: {
    serviceTypes?: string[]
    sources?: string[]
    geography?: string[]
    valueRange?: {
      min?: number
      max?: number
    }
  }
  assignmentMethod: 'round_robin' | 'lowest_workload' | 'random' | 'manual'
  eligibleManagers: string[]
  isActive: boolean
}

export interface LeadBulkImport {
  fileName: string
  totalRows: number
  processedRows: number
  successRows: number
  errorRows: number
  duplicateRows: number
  errors: Array<{
    row: number
    field: string
    message: string
  }>
  status: 'processing' | 'completed' | 'failed'
  createdAt: string
}

// Contract Management Types
export interface Contract {
  id: string
  leadId?: string
  clientName: string
  clientEmail: string
  clientPhone: string
  companyName?: string
  serviceType: string
  status: ContractStatus
  priority: ContractPriority
  estimatedValue: number
  actualValue?: number
  monthlyRecurringRevenue?: number
  billingCycle: 'monthly' | 'quarterly' | 'annually'
  
  // Contract dates
  proposalDate?: string
  startDate: string
  endDate: string
  renewalDate?: string
  signedDate?: string
  
  // Assignment and ownership
  assignedManager: string
  assignedAt: string
  
  // Contract terms
  contractTerms: ContractTerms
  paymentTerms: PaymentTerms
  serviceDetails: ServiceDetails
  
  // Document management
  proposalDocumentUrl?: string
  contractDocumentUrl?: string
  signedDocumentUrl?: string
  documentVersion: number
  requiresSignature: boolean
  
  // Renewal and expansion
  autoRenew: boolean
  renewalNoticeRequired: number // days
  expansionOpportunities: ExpansionOpportunity[]
  
  // Analytics and tracking
  createdFrom: 'lead' | 'direct' | 'renewal' | 'expansion'
  sourceDetails: Record<string, any>
  tags: string[]
  notes: string
  
  // Audit trail
  created_at: string
  updated_at: string
  createdBy: string
  updatedBy: string
}

export type ContractStatus = 
  | 'prospect' 
  | 'proposal' 
  | 'negotiation' 
  | 'signed' 
  | 'active' 
  | 'renewal' 
  | 'closed'
  | 'lost'

export type ContractPriority = 'low' | 'medium' | 'high' | 'critical'

export interface ContractTerms {
  duration: number // months
  cancellationNotice: number // days
  terminationClause: string
  performanceStandards: string[]
  serviceLevel: 'basic' | 'standard' | 'premium'
  customClauses: Array<{
    title: string
    content: string
    required: boolean
  }>
}

export interface PaymentTerms {
  paymentMethod: 'check' | 'ach' | 'wire' | 'credit_card'
  paymentSchedule: 'net_30' | 'net_15' | 'due_on_receipt' | 'custom'
  invoiceFrequency: 'monthly' | 'quarterly' | 'annually'
  lateFeePercentage: number
  discountTerms?: {
    percentage: number
    conditions: string
  }
}

export interface ServiceDetails {
  sites: ContractSite[]
  serviceHours: ServiceHours
  guardRequirements: GuardRequirements
  equipmentProvided: string[]
  additionalServices: AdditionalService[]
  performanceMetrics: PerformanceMetric[]
}

export interface ContractSite {
  id: string
  contractId: string
  siteName: string
  address: string
  city: string
  state: string
  zipCode: string
  siteType: 'retail' | 'office' | 'warehouse' | 'residential' | 'event' | 'other'
  guardsRequired: number
  hourlyRate: number
  monthlyValue: number
  specialRequirements: string[]
  accessInstructions: string
  emergencyContacts: Array<{
    name: string
    phone: string
    role: string
  }>
  isActive: boolean
  created_at: string
  updated_at: string
}

export interface ServiceHours {
  schedule: Array<{
    dayOfWeek: number // 0-6, Sunday = 0
    startTime: string // HH:mm format
    endTime: string // HH:mm format
    guardsRequired: number
  }>
  holidays: Array<{
    date: string
    name: string
    coverage: 'normal' | 'skeleton' | 'none'
  }>
  specialEvents: Array<{
    date: string
    startTime: string
    endTime: string
    description: string
    additionalGuards: number
  }>
}

export interface GuardRequirements {
  minimumExperience: number // years
  requiredCertifications: string[]
  uniformRequirements: string[]
  weaponRequirement: 'armed' | 'unarmed' | 'optional'
  backgroundCheckLevel: 'basic' | 'enhanced' | 'top_secret'
  languageRequirements: string[]
  physicalRequirements: string[]
}

export interface AdditionalService {
  id: string
  name: string
  description: string
  hourlyRate?: number
  monthlyRate?: number
  oneTimeRate?: number
  frequency: 'as_needed' | 'daily' | 'weekly' | 'monthly'
}

export interface PerformanceMetric {
  name: string
  description: string
  target: number
  unit: string
  measurementFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
}

export interface ExpansionOpportunity {
  id: string
  type: 'additional_site' | 'extended_hours' | 'additional_service' | 'upgrade_service'
  description: string
  estimatedValue: number
  priority: 'low' | 'medium' | 'high'
  likelihood: number // 0-100 percentage
  expectedDate?: string
  notes: string
  created_at: string
}

// Contract workflow and forms
export interface ContractFormData {
  clientName: string
  clientEmail: string
  clientPhone: string
  companyName?: string
  serviceType: string
  estimatedValue: number
  startDate: string
  endDate: string
  serviceDetails: Partial<ServiceDetails>
  contractTerms: Partial<ContractTerms>
  paymentTerms: Partial<PaymentTerms>
  notes?: string
}

export interface ContractFilters {
  status?: ContractStatus[]
  assignedManager?: string
  serviceType?: string[]
  priority?: ContractPriority[]
  dateRange?: {
    start: string
    end: string
  }
  valueRange?: {
    min: number
    max: number
  }
  search?: string
  tags?: string[]
}

// Proposal generation
export interface ProposalTemplate {
  id: string
  name: string
  serviceType: string
  description: string
  template: string // HTML/markdown template
  variables: Array<{
    name: string
    type: 'text' | 'number' | 'date' | 'boolean'
    required: boolean
    defaultValue?: string
  }>
  pricingStructure: PricingStructure
  isActive: boolean
  created_at: string
  updated_at: string
}

export interface PricingStructure {
  baseRate: number
  rateType: 'hourly' | 'monthly' | 'annual'
  modifiers: Array<{
    name: string
    type: 'percentage' | 'fixed'
    value: number
    condition: string
  }>
  discounts: Array<{
    name: string
    percentage: number
    minimumValue: number
    validUntil?: string
  }>
}

export interface ProposalGeneration {
  contractId: string
  templateId: string
  variables: Record<string, any>
  customSections: Array<{
    title: string
    content: string
    position: number
  }>
  pricingOverrides?: Partial<PricingStructure>
  approvalRequired: boolean
  validUntil?: string
}

// Contract analytics and reporting
export interface ContractStats {
  totalContracts: number
  byStatus: Record<ContractStatus, number>
  byServiceType: Record<string, number>
  totalValue: number
  monthlyRecurringRevenue: number
  averageContractValue: number
  winRate: number
  averageSalesCycle: number // days
  renewalRate: number
  expansionRevenue: number
}

export interface ContractAnalytics {
  overview: ContractStats
  pipelineVelocity: Array<{
    stage: ContractStatus
    averageDuration: number
    conversionRate: number
    bottleneckScore: number
  }>
  revenueForecasting: Array<{
    month: string
    predictedRevenue: number
    confidence: number
    factors: string[]
  }>
  managerPerformance: Array<{
    managerId: string
    managerName: string
    totalContracts: number
    totalValue: number
    winRate: number
    averageDealSize: number
  }>
  renewalPipeline: Array<{
    contractId: string
    clientName: string
    renewalDate: string
    currentValue: number
    renewalProbability: number
    expansionPotential: number
  }>
  timeSeriesData: Array<{
    date: string
    newContracts: number
    contractValue: number
    renewals: number
    expansions: number
  }>
}

// Contract document management
export interface ContractDocument {
  id: string
  contractId: string
  documentType: 'proposal' | 'contract' | 'amendment' | 'renewal' | 'termination'
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  version: number
  status: 'draft' | 'pending_review' | 'approved' | 'signed' | 'executed'
  
  // Signature tracking
  requiresSignature: boolean
  signatureRequestId?: string
  signerEmail?: string
  signedAt?: string
  signatureProvider?: 'docusign' | 'adobe_sign' | 'hellosign'
  
  // Workflow
  createdBy: string
  reviewedBy?: string
  approvedBy?: string
  reviewNotes?: string
  
  // Audit trail
  created_at: string
  updated_at: string
}

export interface DocumentVersion {
  id: string
  contractDocumentId: string
  version: number
  fileName: string
  fileUrl: string
  changes: string
  createdBy: string
  created_at: string
}

// Contract renewal management
export interface ContractRenewal {
  id: string
  originalContractId: string
  status: 'upcoming' | 'in_progress' | 'completed' | 'declined' | 'expired'
  renewalType: 'automatic' | 'manual' | 'negotiated'
  
  // Timeline
  originalEndDate: string
  renewalStartDate: string
  renewalEndDate: string
  notificationSentAt?: string
  clientResponseAt?: string
  
  // Terms
  proposedTerms: ContractTerms
  proposedValue: number
  proposedChanges: Array<{
    field: string
    oldValue: any
    newValue: any
    reason: string
  }>
  
  // Risk assessment
  churnRisk: 'low' | 'medium' | 'high' | 'critical'
  churnReasons: string[]
  retentionStrategy: string
  
  // Expansion opportunities
  identifiedExpansions: ExpansionOpportunity[]
  crossSellOpportunities: Array<{
    serviceType: string
    estimatedValue: number
    probability: number
  }>
  
  // Assignment
  assignedManager: string
  assignedAt: string
  
  created_at: string
  updated_at: string
}

export interface RenewalAlert {
  id: string
  contractId: string
  alertType: 'initial' | 'reminder' | 'urgent' | 'final'
  daysBeforeRenewal: number
  scheduledFor: string
  sentAt?: string
  acknowledgedAt?: string
  created_at: string
}