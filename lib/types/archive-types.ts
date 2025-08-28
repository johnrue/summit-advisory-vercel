// Story 3.4: Shift Archive System Types
// TypeScript interfaces for historical shift management and reporting

// Archive Types
export type ArchiveReason = 
  | 'completed'      // Shift completed successfully
  | 'cancelled'      // Shift cancelled
  | 'no_show'        // Guard no-show
  | 'issue_resolved' // Issue logged and resolved
  | 'administrative'; // Administrative archival

export type MetricPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly';

// Core Archive Interface
export interface ShiftArchive {
  id: string;
  originalShiftData: Record<string, any>; // Complete shift snapshot
  shiftId: string; // Original shift ID for reference
  
  // Archive Metadata
  archivedAt: Date;
  archivedBy: string;
  archiveReason: ArchiveReason;
  
  // Performance Metrics
  completionMetrics: ShiftCompletionMetrics;
  clientSatisfactionScore?: number; // 1-5 rating
  
  // Search and Reporting Fields (denormalized for performance)
  clientName: string;
  siteName: string;
  guardName?: string;
  shiftDate: Date;
  shiftDurationHours: number;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

// Completion Metrics
export interface ShiftCompletionMetrics {
  // Timing Metrics
  scheduledStart: Date;
  actualStart?: Date;
  scheduledEnd: Date;
  actualEnd?: Date;
  onTimeStart: boolean;
  onTimeEnd: boolean;
  totalDurationHours: number;
  overtimeHours?: number;
  
  // Assignment Metrics
  timeToAssignment?: number; // hours from creation to assignment
  timeToConfirmation?: number; // hours from assignment to confirmation
  assignmentChanges: number; // Number of guard reassignments
  
  // Performance Indicators
  guardRating?: number; // 1-5 from client
  clientSatisfaction?: number; // 1-5 overall
  incidentReports: number;
  complianceScore?: number; // 0-100 based on requirements met
  
  // Issues and Resolutions
  issuesLogged: ShiftIssue[];
  resolutionTime?: number; // minutes to resolve issues
  escalationsRequired: number;
  
  // Business Metrics
  revenueGenerated: number;
  profitMargin: number;
  guardPayoutAmount: number;
  clientBilledAmount: number;
}

export interface ShiftIssue {
  id: string;
  type: 'guard_late' | 'guard_no_show' | 'client_complaint' | 'safety_incident' | 'equipment_failure' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reportedAt: Date;
  reportedBy: string;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  preventiveMeasures?: string[];
}

// Archive Operations
export interface ArchiveOperation {
  operationType: 'archive_single' | 'archive_bulk' | 'restore' | 'permanent_delete';
  shiftIds: string[];
  reason: ArchiveReason;
  executedBy: string;
  executedAt: Date;
  parameters?: Record<string, any>;
  results: ArchiveOperationResult[];
}

export interface ArchiveOperationResult {
  shiftId: string;
  success: boolean;
  archiveId?: string;
  error?: string;
  previousState?: any;
}

// Historical Reporting
export interface HistoricalReport {
  id: string;
  reportType: 'performance' | 'financial' | 'compliance' | 'client_satisfaction' | 'guard_performance';
  title: string;
  description?: string;
  
  // Report Parameters
  period: {
    start: Date;
    end: Date;
  };
  filters: HistoricalReportFilters;
  
  // Report Data
  generatedAt: Date;
  generatedBy: string;
  data: HistoricalReportData;
  
  // Export Options
  exportFormats: ('pdf' | 'excel' | 'csv' | 'json')[];
  isScheduled: boolean;
  scheduleConfig?: ReportScheduleConfig;
}

export interface HistoricalReportFilters {
  clients?: string[];
  sites?: string[];
  guards?: string[];
  archiveReasons?: ArchiveReason[];
  shiftTypes?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  minDuration?: number; // hours
  maxDuration?: number; // hours
  minRevenue?: number;
  maxRevenue?: number;
  includeIncidents?: boolean;
  clientSatisfactionRange?: {
    min: number;
    max: number;
  };
}

export interface HistoricalReportData {
  summary: ReportSummary;
  trends: ReportTrend[];
  breakdowns: ReportBreakdown[];
  topPerformers: PerformanceRanking[];
  recommendations: string[];
  charts: ChartData[];
  rawData?: any[]; // Optional detailed data
}

export interface ReportSummary {
  totalShifts: number;
  totalRevenue: number;
  totalHours: number;
  averageClientSatisfaction: number;
  completionRate: number;
  onTimePerformance: number;
  incidentRate: number;
  profitMargin: number;
  guardUtilization: number;
}

export interface ReportTrend {
  date: Date;
  shiftsCompleted: number;
  revenue: number;
  satisfaction: number;
  onTimeRate: number;
  incidentCount: number;
}

export interface ReportBreakdown {
  category: string;
  subcategory: string;
  value: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  comparison?: number; // vs previous period
}

export interface PerformanceRanking {
  id: string;
  name: string;
  category: 'guard' | 'client' | 'site';
  metrics: Record<string, number>;
  rank: number;
  score: number;
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  data: any[];
  xAxis?: string;
  yAxis?: string;
  config?: Record<string, any>;
}

// Scheduled Reporting
export interface ReportScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  dayOfWeek?: number; // For weekly reports
  dayOfMonth?: number; // For monthly reports
  time: string; // HH:MM format
  recipients: string[]; // Email addresses
  autoExport: boolean;
  exportFormat: 'pdf' | 'excel' | 'csv';
  isActive: boolean;
  nextRun: Date;
  lastRun?: Date;
}

// Archive Analytics
export interface ArchiveMetrics {
  totalArchivedShifts: number;
  archivesByReason: Record<ArchiveReason, number>;
  archivesByMonth: Array<{
    month: string;
    count: number;
    revenue: number;
  }>;
  
  // Performance Metrics
  averageShiftDuration: number;
  averageRevenue: number;
  averageClientSatisfaction: number;
  completionRateByMonth: Array<{
    month: string;
    rate: number;
  }>;
  
  // Storage Metrics
  totalStorageUsed: number; // bytes
  oldestArchive: Date;
  newestArchive: Date;
  compressionRatio: number;
}

export interface ArchiveCleanupPolicy {
  id: string;
  policyName: string;
  isActive: boolean;
  
  // Retention Rules
  retentionPeriodDays: number;
  archiveReasonsToClean: ArchiveReason[];
  
  // Conditions
  conditions: {
    minAge: number; // days
    maxStorageSize?: number; // bytes
    clientRequestOnly?: boolean;
    requiredApproval?: boolean;
  };
  
  // Execution
  scheduleConfig: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    dryRunFirst: boolean;
  };
  
  // Audit
  createdBy: string;
  createdAt: Date;
  lastExecuted?: Date;
  nextExecution: Date;
}

// Search and Query
export interface ArchiveSearchQuery {
  keywords?: string[];
  clientNames?: string[];
  guardNames?: string[];
  siteNames?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  archiveReasons?: ArchiveReason[];
  satisfactionRange?: {
    min: number;
    max: number;
  };
  revenueRange?: {
    min: number;
    max: number;
  };
  hasIncidents?: boolean;
  sortBy?: 'date' | 'revenue' | 'satisfaction' | 'duration';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ArchiveSearchResult {
  totalCount: number;
  results: ShiftArchive[];
  aggregations: {
    totalRevenue: number;
    totalHours: number;
    averageSatisfaction: number;
    clientCounts: Record<string, number>;
  };
  facets: {
    clients: Array<{ name: string; count: number }>;
    guards: Array<{ name: string; count: number }>;
    reasons: Array<{ reason: ArchiveReason; count: number }>;
  };
}

// API Response Types
export interface ArchiveApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    total?: number;
    archived?: number;
    totalRevenue?: number;
    timestamp?: string;
  };
}