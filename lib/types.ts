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

// Enhanced Guard Lead Management Types (Story 5.3)
export interface GuardLead {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  
  // Enhanced source tracking
  sourceType: GuardLeadSource
  sourceDetails: GuardSourceDetails
  utmParameters?: UTMParameters
  referralInfo?: ReferralInfo
  geographicSource?: GeographicSource
  
  // Application and qualification data
  applicationStatus: GuardApplicationStatus
  qualificationScore: number
  qualificationFactors: QualificationFactors
  applicationCompletionProbability: number
  
  // Background and experience
  hasSecurityExperience: boolean
  yearsExperience?: number
  hasLicense: boolean
  licenseNumber?: string
  licenseExpiryDate?: string
  backgroundCheckEligible: boolean
  certifications: string[]
  availability: AvailabilityInfo
  preferredShifts: string[]
  
  // Geographic and assignment preferences
  preferredLocations: string[]
  transportationAvailable: boolean
  willingToRelocate: boolean
  salaryExpectations?: number
  
  // Lead management
  status: GuardLeadStatus
  assignedRecruiter?: string
  assignedAt?: string
  lastContactDate?: string
  nextFollowUpDate?: string
  contactCount: number
  campaignId?: string
  
  // Conversion tracking
  convertedToHire: boolean
  hireDate?: string
  guardId?: string
  rejectionReason?: string
  dropOffStage?: GuardLeadStage
  
  // A/B testing
  formVariant?: string
  emailSequenceVariant?: string
  testGroup?: string
  
  created_at: string
  updated_at: string
}

export type GuardLeadSource = 
  | 'direct_website'
  | 'job_board'
  | 'social_media'
  | 'referral'
  | 'recruiting_agency'
  | 'career_fair'
  | 'print_advertisement'
  | 'radio_advertisement'
  | 'cold_outreach'
  | 'partner_referral'
  | 'other'

export interface GuardSourceDetails {
  platform?: string // LinkedIn, Indeed, Facebook, etc.
  campaign?: string
  adGroup?: string
  keyword?: string
  referrerUrl?: string
  landingPage?: string
  qrCodeId?: string
  agencyName?: string
  eventName?: string
  partnerName?: string
  customDetails?: Record<string, any>
}

export interface UTMParameters {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  gclid?: string // Google Click ID
  fbclid?: string // Facebook Click ID
}

export interface ReferralInfo {
  referrerGuardId?: string
  referrerName?: string
  referralCode?: string
  referralBonusEligible: boolean
  bonusAmount?: number
  bonusStatus?: 'pending' | 'qualified' | 'paid' | 'ineligible'
  bonusPaymentDate?: string
}

export interface GeographicSource {
  city?: string
  state?: string
  zipCode?: string
  latitude?: number
  longitude?: number
  marketArea?: string
  recruitingRegion?: string
}

export type GuardApplicationStatus = 
  | 'lead_captured'
  | 'application_started'
  | 'application_submitted'
  | 'under_review'
  | 'background_check'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'reference_check'
  | 'offer_extended'
  | 'offer_accepted'
  | 'hire_completed'
  | 'rejected'
  | 'withdrawn'

export type GuardLeadStatus = 
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'disqualified'
  | 'nurturing'
  | 'application_pending'
  | 'converted'
  | 'lost'

export type GuardLeadStage = 
  | 'initial_contact'
  | 'qualification'
  | 'application'
  | 'background_check'
  | 'interview'
  | 'decision'
  | 'onboarding'

export interface QualificationFactors {
  experienceScore: number // 0-100
  locationScore: number // 0-100  
  availabilityScore: number // 0-100
  certificationScore: number // 0-100
  backgroundScore: number // 0-100
  salaryExpectationScore: number // 0-100
  transportationScore: number // 0-100
  motivationScore: number // 0-100
  totalScore: number // weighted average
}

export interface AvailabilityInfo {
  fullTime: boolean
  partTime: boolean
  weekdays: boolean
  weekends: boolean
  nights: boolean
  holidays: boolean
  overtime: boolean
  startDate?: string
  hoursPerWeek?: number
}

// Recruiting Campaign Management Types
export interface RecruitingCampaign {
  id: string
  name: string
  description: string
  campaignType: CampaignType
  status: CampaignStatus
  
  // Campaign configuration
  targetPositions: string[]
  targetLocations: string[]
  budgetAllocated: number
  budgetSpent: number
  expectedLeads: number
  expectedHires: number
  
  // Landing page and messaging
  landingPageConfig: LandingPageConfig
  formVariants: FormVariant[]
  emailSequences: EmailSequence[]
  
  // Tracking and analytics
  trackingPixelId?: string
  utmParameters: UTMParameters
  qrCodes: QRCodeGeneration[]
  
  // Performance metrics
  impressions: number
  clicks: number
  leads: number
  applications: number
  hires: number
  costPerLead: number
  costPerHire: number
  conversionRate: number
  
  // A/B testing
  activeTests: ABTest[]
  
  // Timeline
  startDate: string
  endDate?: string
  pausedAt?: string
  pausedReason?: string
  
  // Assignment
  createdBy: string
  managedBy: string[]
  
  created_at: string
  updated_at: string
}

export type CampaignType = 
  | 'digital_advertising'
  | 'social_media'
  | 'job_board'
  | 'referral_program'
  | 'career_fair'
  | 'content_marketing'
  | 'email_marketing'
  | 'print_advertising'
  | 'radio_advertising'
  | 'event_marketing'
  | 'partnership'
  | 'cold_outreach'

export type CampaignStatus = 
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'

export interface LandingPageConfig {
  id: string
  templateId: string
  headline: string
  subheadline: string
  heroImage?: string
  callToAction: string
  benefits: string[]
  testimonials: Array<{
    name: string
    role: string
    quote: string
    image?: string
  }>
  customSections: Array<{
    title: string
    content: string
    position: number
  }>
  theme: 'professional' | 'modern' | 'minimal' | 'bold'
  primaryColor: string
  secondaryColor: string
  publishedUrl?: string
  isPublished: boolean
  created_at: string
  updated_at: string
}

export interface FormVariant {
  id: string
  campaignId: string
  name: string
  description: string
  
  // Form configuration
  fields: FormField[]
  layout: 'single_column' | 'two_column' | 'progressive'
  submitButtonText: string
  submitButtonColor: string
  
  // A/B testing
  trafficPercentage: number
  isActive: boolean
  
  // Performance metrics
  views: number
  submissions: number
  conversionRate: number
  
  created_at: string
}

export interface FormField {
  id: string
  name: string
  label: string
  type: 'text' | 'email' | 'phone' | 'select' | 'multiselect' | 'textarea' | 'checkbox' | 'radio' | 'file'
  required: boolean
  placeholder?: string
  options?: string[] // for select/radio/checkbox fields
  validation?: {
    pattern?: string
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
  }
  order: number
  helpText?: string
}

export interface EmailSequence {
  id: string
  campaignId: string
  name: string
  description: string
  
  // Sequence configuration
  triggerEvent: 'form_submission' | 'application_started' | 'application_abandoned' | 'custom'
  emails: EmailTemplate[]
  
  // A/B testing
  variants: EmailSequenceVariant[]
  trafficSplit: Record<string, number> // variant_id -> percentage
  
  // Performance
  totalSent: number
  totalOpened: number
  totalClicked: number
  totalConverted: number
  openRate: number
  clickRate: number
  conversionRate: number
  
  isActive: boolean
  created_at: string
  updated_at: string
}

export interface EmailTemplate {
  id: string
  sequenceId: string
  position: number
  
  // Timing
  delayAfterTrigger: number // hours
  sendTime?: string // HH:mm format for optimal send time
  
  // Content
  subject: string
  preheader?: string
  htmlContent: string
  textContent: string
  
  // Personalization variables
  variables: Record<string, string>
  
  // Performance tracking
  sent: number
  opened: number
  clicked: number
  unsubscribed: number
  bounced: number
  
  created_at: string
  updated_at: string
}

export interface EmailSequenceVariant {
  id: string
  sequenceId: string
  name: string
  emails: EmailTemplate[]
  trafficPercentage: number
  performance: {
    sent: number
    opened: number
    clicked: number
    converted: number
  }
  isActive: boolean
}

export interface QRCodeGeneration {
  id: string
  campaignId: string
  name: string
  description: string
  
  // QR code configuration
  url: string
  size: number
  format: 'PNG' | 'SVG' | 'PDF'
  logoUrl?: string
  
  // Styling
  foregroundColor: string
  backgroundColor: string
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
  
  // Usage tracking
  scans: number
  uniqueScans: number
  scanLocations: Array<{
    lat: number
    lng: number
    count: number
  }>
  
  // Distribution
  printMaterials: string[]
  distributionDate?: string
  distributionNotes?: string
  
  created_at: string
  updated_at: string
}

// A/B Testing Framework Types
export interface ABTest {
  id: string
  name: string
  description: string
  campaignId?: string
  
  // Test configuration
  testType: ABTestType
  hypothesis: string
  successMetric: string
  variants: ABTestVariant[]
  trafficSplit: Record<string, number> // variant_id -> percentage
  
  // Statistical configuration
  confidenceLevel: number // 95, 99, etc.
  minimumSampleSize: number
  minimumEffectSize: number // percentage improvement to detect
  
  // Test lifecycle
  status: ABTestStatus
  startDate: string
  endDate?: string
  actualEndDate?: string
  
  // Results
  results?: ABTestResults
  winner?: string // variant_id
  significance?: number
  
  // Analysis
  analysisNotes?: string
  recommendations?: string[]
  implementationPlan?: string
  
  created_at: string
  updated_at: string
}

export type ABTestType = 
  | 'landing_page'
  | 'form_variant'
  | 'email_subject'
  | 'email_content'
  | 'call_to_action'
  | 'headline'
  | 'pricing'
  | 'application_flow'

export type ABTestStatus = 
  | 'draft'
  | 'ready_to_launch'
  | 'running'
  | 'paused'
  | 'completed'
  | 'stopped'
  | 'inconclusive'

export interface ABTestVariant {
  id: string
  testId: string
  name: string
  description: string
  config: Record<string, any> // variant-specific configuration
  
  // Performance metrics
  visitors: number
  conversions: number
  conversionRate: number
  
  // Statistical data
  confidenceInterval?: {
    lower: number
    upper: number
  }
  
  isControl: boolean
  isWinner?: boolean
}

export interface ABTestResults {
  testId: string
  totalVisitors: number
  totalConversions: number
  
  // Statistical significance
  pValue: number
  isSignificant: boolean
  confidenceLevel: number
  
  // Variant performance
  variantResults: Array<{
    variantId: string
    visitors: number
    conversions: number
    conversionRate: number
    lift?: number // percentage improvement over control
    confidenceInterval: {
      lower: number
      upper: number
    }
  }>
  
  // Recommendations
  recommendedAction: 'implement_winner' | 'continue_testing' | 'redesign' | 'inconclusive'
  expectedImpact?: number
  
  calculatedAt: string
}

// Lead Scoring and Qualification Types
export interface LeadScoringConfig {
  id: string
  name: string
  description: string
  version: number
  
  // Scoring factors and weights
  factors: ScoringFactor[]
  
  // Qualification thresholds
  qualificationThreshold: number // minimum score to be qualified
  highPriorityThreshold: number // score for high priority leads
  
  // Historical performance
  accuracy: number // percentage of leads that converted as predicted
  lastCalibrated: string
  
  isActive: boolean
  created_at: string
  updated_at: string
}

export interface ScoringFactor {
  id: string
  name: string
  description: string
  category: ScoringCategory
  weight: number // 0-1, relative importance
  
  // Scoring logic
  scoringRules: ScoringRule[]
  
  isActive: boolean
}

export type ScoringCategory = 
  | 'experience'
  | 'location'
  | 'availability'
  | 'certifications'
  | 'background'
  | 'salary_expectations'
  | 'transportation'
  | 'motivation'
  | 'source_quality'

export interface ScoringRule {
  id: string
  condition: string // JSON logic condition
  points: number
  description: string
}

export interface LeadScoreCalculation {
  leadId: string
  totalScore: number
  maxPossibleScore: number
  normalizedScore: number // 0-100
  
  // Factor breakdown
  factorScores: Array<{
    factorId: string
    factorName: string
    score: number
    maxScore: number
    appliedRules: Array<{
      ruleId: string
      points: number
      reason: string
    }>
  }>
  
  // Qualification result
  isQualified: boolean
  priority: 'low' | 'medium' | 'high'
  
  // Predictions
  applicationProbability: number // 0-1
  hireProbability: number // 0-1
  
  calculatedAt: string
  configVersion: number
}

// Recruiting Analytics Types
export interface RecruitingFunnelData {
  totalLeads: number
  
  // Funnel stages
  stages: Array<{
    stage: GuardLeadStage
    count: number
    conversionRate: number
    averageDuration: number // days in stage
    dropOffRate: number
  }>
  
  // Source performance
  sourcePerformance: Array<{
    source: GuardLeadSource
    leads: number
    applications: number
    hires: number
    conversionRate: number
    costPerLead: number
    costPerHire: number
    averageScore: number
  }>
  
  // Campaign performance
  campaignPerformance: Array<{
    campaignId: string
    campaignName: string
    leads: number
    applications: number
    hires: number
    spent: number
    roi: number
    conversionRate: number
  }>
  
  // Geographic analysis
  geographicData: Array<{
    location: string
    leads: number
    hires: number
    averageScore: number
    competitionLevel: 'low' | 'medium' | 'high'
  }>
  
  // Time-based trends
  timeSeriesData: Array<{
    date: string
    leads: number
    applications: number
    hires: number
    costPerLead: number
    averageScore: number
  }>
}

export interface RecruitingOptimizationRecommendations {
  // Source optimization
  topPerformingSources: Array<{
    source: GuardLeadSource
    recommendation: string
    expectedImpact: string
    priority: 'high' | 'medium' | 'low'
  }>
  
  // Campaign optimization
  campaignRecommendations: Array<{
    campaignId: string
    type: 'budget_increase' | 'budget_decrease' | 'pause' | 'optimize_targeting' | 'test_creative'
    description: string
    expectedImpact: string
  }>
  
  // Funnel optimization
  bottleneckAnalysis: Array<{
    stage: GuardLeadStage
    issue: string
    solution: string
    priority: 'high' | 'medium' | 'low'
  }>
  
  // Scoring optimization
  scoringRecommendations: Array<{
    factor: ScoringCategory
    currentWeight: number
    recommendedWeight: number
    reason: string
  }>
  
  generatedAt: string
}

// Referral Program Types
export interface GuardReferralProgram {
  id: string
  name: string
  description: string
  
  // Program configuration
  isActive: boolean
  startDate: string
  endDate?: string
  
  // Eligibility criteria
  referrerEligibility: {
    minimumTenure: number // months
    goodStanding: boolean
    minimumPerformanceRating: number
    excludedRoles?: string[]
  }
  
  // Bonus structure
  bonusStructure: BonusStructure
  
  // Tracking and limits
  maxReferralsPerPerson?: number
  maxBonusPerPerson?: number
  trackingPeriod: number // days to track attribution
  
  // Performance metrics
  totalReferrals: number
  successfulHires: number
  totalBonusPaid: number
  averageCostPerHire: number
  
  created_at: string
  updated_at: string
}

export interface BonusStructure {
  type: 'flat' | 'tiered' | 'milestone'
  
  // Flat bonus
  flatAmount?: number
  
  // Tiered bonus (based on number of successful referrals)
  tiers?: Array<{
    minReferrals: number
    maxReferrals?: number
    bonusAmount: number
  }>
  
  // Milestone-based bonus
  milestones?: Array<{
    milestone: 'application_submitted' | '30_days' | '60_days' | '90_days' | '6_months' | '1_year'
    percentage: number
    amount?: number
    description: string
  }>
  
  // Additional bonuses
  qualityBonus?: {
    scoreThreshold: number
    bonusAmount: number
  }
  
  urgentHireBonus?: {
    timeToFill: number // days
    bonusAmount: number
  }
}

export interface GuardReferral {
  id: string
  programId: string
  
  // Referrer information
  referrerGuardId: string
  referrerName: string
  referralCode: string
  
  // Referred candidate information
  referredLeadId: string
  referredName: string
  referredEmail: string
  
  // Tracking
  referralDate: string
  attributionConfirmed: boolean
  attributionMethod: 'referral_code' | 'email_match' | 'manual' | 'survey'
  
  // Status tracking
  status: ReferralStatus
  currentStage: GuardLeadStage
  
  // Bonus tracking
  bonusCalculation: ReferralBonusCalculation
  
  // Performance
  leadQualityScore: number
  timeToApplication?: number // days
  timeToHire?: number // days
  
  // Notes and feedback
  referrerNotes?: string
  recruiterNotes?: string
  
  created_at: string
  updated_at: string
}

export type ReferralStatus = 
  | 'referred'
  | 'contacted'
  | 'qualified'
  | 'disqualified'
  | 'hired'
  | 'rejected'
  | 'withdrawn'

export interface ReferralBonusCalculation {
  totalEarned: number
  totalPaid: number
  totalPending: number
  
  // Milestone tracking
  milestoneStatus: Array<{
    milestone: string
    achieved: boolean
    achievedDate?: string
    bonusAmount: number
    paidDate?: string
  }>
  
  // Payment history
  payments: Array<{
    id: string
    amount: number
    reason: string
    paidDate: string
    paymentMethod: 'payroll' | 'bonus_check' | 'direct_deposit'
    transactionId?: string
  }>
  
  // Clawback tracking
  clawbacks?: Array<{
    id: string
    amount: number
    reason: string
    date: string
  }>
}

export interface ReferralLeaderboard {
  period: {
    startDate: string
    endDate: string
  }
  
  rankings: Array<{
    rank: number
    referrerGuardId: string
    referrerName: string
    totalReferrals: number
    successfulHires: number
    totalBonusEarned: number
    successRate: number
    averageLeadScore: number
  }>
  
  // Recognition tiers
  recognitionTiers: Array<{
    tier: string
    requirement: string
    guards: string[]
    reward?: string
  }>
  
  generatedAt: string
}

// Enhanced Guard Lead Form Data
export interface GuardLeadFormData {
  // Basic information
  firstName: string
  lastName: string
  email: string
  phone: string
  
  // Work preferences
  positionType: 'armed' | 'unarmed' | 'both'
  preferredShifts: string[]
  preferredLocations: string[]
  availabilityType: 'full_time' | 'part_time' | 'both'
  
  // Experience and qualifications
  hasSecurityExperience: boolean
  yearsExperience?: number
  hasLicense: boolean
  licenseNumber?: string
  licenseExpiryDate?: string
  hasTransportation: boolean
  willingToRelocate: boolean
  
  // Source tracking (hidden fields)
  sourceType?: GuardLeadSource
  sourceDetails?: GuardSourceDetails
  utmParameters?: UTMParameters
  referralCode?: string
  campaignId?: string
  formVariant?: string
  
  // Additional information
  salaryExpectations?: number
  additionalInfo?: string
  resumeFile?: File
}

export interface GuardLeadFilters {
  status?: GuardLeadStatus[]
  applicationStatus?: GuardApplicationStatus[]
  sourceType?: GuardLeadSource[]
  assignedRecruiter?: string
  campaignId?: string
  scoreRange?: {
    min: number
    max: number
  }
  dateRange?: {
    start: string
    end: string
  }
  location?: string[]
  hasExperience?: boolean
  hasLicense?: boolean
  search?: string
}

export interface RecruitingAnalyticsFilters {
  dateRange?: {
    start: string
    end: string
  }
  campaignIds?: string[]
  sources?: GuardLeadSource[]
  locations?: string[]
  recruiterIds?: string[]
}