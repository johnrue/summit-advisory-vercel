import type { Database } from './database'

// Base unified lead interface extending existing schemas
export interface UnifiedLead {
  id: string
  type: 'client' | 'guard'
  source: LeadSource
  status: LeadStatus
  priority: LeadPriority
  assignedManager?: string
  createdAt: Date
  updatedAt: Date
  lastContactDate?: Date
  nextFollowUpDate?: Date
  
  // Client-specific fields (from Story 5.1)
  clientInfo?: ClientLeadInfo
  serviceRequirements?: ServiceRequirements
  estimatedValue?: number
  conversionProbability?: number
  
  // Guard-specific fields (from Stories 2.1/5.3)
  guardInfo?: GuardLeadInfo
  applicationProgress?: ApplicationProgress
  qualificationScore?: number
  referralInfo?: ReferralInfo
  
  // Unified analytics fields
  sourceAttribution: SourceAttribution
  conversionMetrics: ConversionMetrics
  engagementScore: number
  responseTime: number
}

export type LeadSource = 
  | 'website'
  | 'qr-code' 
  | 'social-media'
  | 'referral'
  | 'job-board'
  | 'direct-contact'
  | 'networking'
  | 'partner'
  | 'cold-outreach'

export type LeadStatus = 
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'converted'
  | 'lost'
  | 'nurturing'

export type LeadPriority = 'low' | 'medium' | 'high' | 'critical'

// Client lead specific information
export interface ClientLeadInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  companyName?: string
  serviceType: string
  message?: string
  industryType?: string
  companySize?: string
}

export interface ServiceRequirements {
  serviceTypes: string[]
  locations: string[]
  startDate?: string
  endDate?: string
  guardCount?: number
  specialRequirements?: string[]
  budgetRange?: {
    min: number
    max: number
  }
}

// Guard lead specific information
export interface GuardLeadInfo {
  firstName: string
  lastName: string
  email: string
  phone?: string
  hasSecurityExperience: boolean
  yearsExperience?: number
  hasLicense: boolean
  licenseNumber?: string
  licenseExpiryDate?: string
  preferredShifts: string[]
  preferredLocations: string[]
  availability: AvailabilityInfo
  transportationAvailable: boolean
  salaryExpectations?: number
}

export interface ApplicationProgress {
  currentStage: GuardLeadStage
  applicationCompletedAt?: string
  backgroundCheckStatus?: 'not_started' | 'in_progress' | 'completed' | 'failed'
  interviewScheduledAt?: string
  interviewCompletedAt?: string
  offerExtendedAt?: string
  hireCompletedAt?: string
}

export interface ReferralInfo {
  referrerGuardId?: string
  referrerName?: string
  referralCode?: string
  referralBonusEligible: boolean
  bonusAmount?: number
  bonusStatus?: 'pending' | 'qualified' | 'paid' | 'ineligible'
}

export interface AvailabilityInfo {
  fullTime: boolean
  partTime: boolean
  weekdays: boolean
  weekends: boolean
  nights: boolean
  holidays: boolean
  startDate?: string
  hoursPerWeek?: number
}

export type GuardLeadStage = 
  | 'initial_contact'
  | 'qualification'
  | 'application'
  | 'background_check'
  | 'interview'
  | 'decision'
  | 'onboarding'

// Unified analytics and tracking
export interface SourceAttribution {
  originalSource: LeadSource
  sourceDetails: Record<string, any>
  utmParameters?: UTMParameters
  campaignId?: string
  landingPage?: string
  referralPath?: string[]
}

export interface UTMParameters {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

export interface ConversionMetrics {
  timeToFirstContact?: number // hours
  timeToConversion?: number // days
  contactCount: number
  emailOpens?: number
  emailClicks?: number
  formViews?: number
  formCompletions?: number
}

// Lead analytics and reporting
export interface LeadAnalytics {
  totalLeads: number
  clientLeads: number
  guardLeads: number
  conversionRate: number
  averageResponseTime: number
  sourcePerformance: SourcePerformance[]
  pipelineVelocity: PipelineVelocity
  managerPerformance: ManagerPerformance[]
}

export interface SourcePerformance {
  source: LeadSource
  totalLeads: number
  clientLeads: number
  guardLeads: number
  conversionRate: number
  averageValue: number
  averageScore: number
  costPerLead?: number
  roi?: number
}

export interface PipelineVelocity {
  averageStageTransition: Record<string, number>
  bottleneckStages: string[]
  averageConversionTime: number
  stageConversionRates: Record<string, number>
}

export interface ManagerPerformance {
  managerId: string
  managerName: string
  totalAssigned: number
  clientLeads: number
  guardLeads: number
  totalConverted: number
  conversionRate: number
  averageResponseTime: number
  totalValue: number
  currentWorkload: number
}

// Filtering and search
export interface FilterCriteria {
  leadType?: ('client' | 'guard')[]
  sources?: LeadSource[]
  statuses?: LeadStatus[]
  assignedUsers?: string[]
  dateRange?: DateRange
  priorities?: LeadPriority[]
  scoreRange?: {
    min: number
    max: number
  }
  valueRange?: {
    min: number
    max: number
  }
  customFilters?: CustomFilter[]
}

export interface DateRange {
  start: string
  end: string
}

export interface CustomFilter {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between'
  value: any
  values?: any[] // for between operator
}

// Lead assignment and workload management
export interface LeadAssignment {
  leadId: string
  assignedTo: string
  assignedBy: string
  assignedAt: string
  assignmentReason: 'automatic' | 'manual' | 'round_robin' | 'workload_balance'
  territory?: string
  specialization?: string[]
  workloadScore: number
}

export interface WorkloadBalance {
  managerId: string
  managerName: string
  currentLeads: number
  maxCapacity: number
  utilizationRate: number
  avgResponseTime: number
  conversionRate: number
  lastAssignment?: string
  territories: string[]
  specializations: string[]
}

// Export and reporting
export interface ExportRequest {
  format: 'csv' | 'xlsx' | 'pdf'
  filters: FilterCriteria
  columns: string[]
  includeAnalytics: boolean
  privacyLevel: 'full' | 'redacted' | 'summary'
  requestedBy: string
  requestedAt: string
}

export interface ReportSchedule {
  id: string
  name: string
  description: string
  reportType: 'lead_performance' | 'conversion_funnel' | 'manager_performance' | 'source_analysis'
  filters: FilterCriteria
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  deliveryMethod: 'email' | 'dashboard' | 'download'
  recipients: string[]
  lastSent?: string
  nextScheduled: string
  isActive: boolean
}

// Form data interfaces for API
export interface UnifiedLeadFormData {
  type: 'client' | 'guard'
  clientInfo?: Partial<ClientLeadInfo>
  guardInfo?: Partial<GuardLeadInfo>
  serviceRequirements?: Partial<ServiceRequirements>
  sourceAttribution: SourceAttribution
  priority?: LeadPriority
  assignedManager?: string
  notes?: string
}

// API response types
export interface UnifiedLeadResponse {
  lead: UnifiedLead
  analytics?: Partial<LeadAnalytics>
  recommendations?: string[]
}

export interface UnifiedLeadListResponse {
  leads: UnifiedLead[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  analytics: LeadAnalytics
  filters: FilterCriteria
}