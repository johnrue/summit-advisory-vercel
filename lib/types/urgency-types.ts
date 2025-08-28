// Story 3.4: Urgency Alert System Types
// TypeScript interfaces for shift urgency monitoring and alert management

// Alert Types
export type UrgencyAlertType = 
  | 'unassigned_24h'     // Unassigned shift within 24 hours
  | 'unconfirmed_12h'    // Assigned but unconfirmed within 12 hours
  | 'no_show_risk'       // High risk of guard no-show
  | 'understaffed'       // Insufficient guards for shift requirements
  | 'certification_gap'; // Missing required certifications

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'expired';

// Core Alert Interface
export interface UrgentShiftAlert {
  id: string;
  shiftId: string;
  alertType: UrgencyAlertType;
  alertPriority: AlertPriority;
  hoursUntilShift: number;
  
  // Status Management
  alertStatus: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  
  // Escalation
  escalationLevel: number;
  lastEscalatedAt?: Date;
  maxEscalationLevel: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Alert Configuration
export interface AlertConfiguration {
  alertType: UrgencyAlertType;
  isEnabled: boolean;
  thresholdHours: number;
  priority: AlertPriority;
  escalationRules: EscalationRule[];
  notificationMethods: NotificationMethod[];
  autoResolveConditions?: string[];
}

export interface EscalationRule {
  level: number;
  triggerAfterHours: number;
  newPriority?: AlertPriority;
  additionalNotifications?: string[];
  requireManagerApproval?: boolean;
}

export interface NotificationMethod {
  type: 'email' | 'sms' | 'push' | 'dashboard' | 'webhook';
  enabled: boolean;
  recipients: string[];
  template?: string;
  cooldownMinutes?: number; // Prevent spam
}

// Alert Calculation and Monitoring
export interface ShiftUrgencyCalculation {
  shiftId: string;
  urgencyScore: number; // 0-100 scale
  riskFactors: UrgencyRiskFactor[];
  recommendedActions: string[];
  calculatedAt: Date;
  nextRecalculation: Date;
}

export interface UrgencyRiskFactor {
  factor: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  score: number; // Contributing score to overall urgency
  mitigationSuggestions?: string[];
}

// Alert Management
export interface AlertAcknowledgment {
  alertId: string;
  acknowledgedBy: string;
  acknowledgedAt: Date;
  notes?: string;
  estimatedResolutionTime?: Date;
  assignedTo?: string;
}

export interface AlertResolution {
  alertId: string;
  resolvedBy: string;
  resolvedAt: Date;
  resolutionMethod: 'manual' | 'automated' | 'shift_assigned' | 'shift_cancelled';
  resolutionNotes?: string;
  actualResolutionTime?: number; // minutes from creation
}

// Bulk Alert Operations
export interface BulkAlertAction {
  alertIds: string[];
  action: 'acknowledge' | 'resolve' | 'escalate' | 'dismiss';
  parameters?: {
    notes?: string;
    assignedTo?: string;
    newPriority?: AlertPriority;
  };
  executedBy: string;
  executedAt: Date;
}

// Alert Analytics and Reporting
export interface AlertMetrics {
  totalActiveAlerts: number;
  alertsByType: Record<UrgencyAlertType, number>;
  alertsByPriority: Record<AlertPriority, number>;
  avgResolutionTime: number; // hours
  escalationRate: number; // percentage
  falsePositiveRate: number; // percentage
  
  // Trends
  newAlertsLast24h: number;
  resolvedAlertsLast24h: number;
  escalatedAlertsLast24h: number;
  
  // Performance Indicators
  criticalAlertsUnresolved: number;
  averageAcknowledgmentTime: number; // minutes
  shiftsAtRisk: number;
}

export interface AlertTrend {
  date: Date;
  alertCount: number;
  resolutionRate: number;
  escalationCount: number;
  avgUrgencyScore: number;
}

export interface AlertReport {
  reportId: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  metrics: AlertMetrics;
  trends: AlertTrend[];
  topRiskFactors: UrgencyRiskFactor[];
  recommendations: string[];
  shiftImpactAnalysis: {
    shiftsAffected: number;
    clientsImpacted: string[];
    revenueAtRisk: number;
    guardsSaved: number; // Guards prevented from no-show
  };
}

// Real-time Alert System
export interface AlertSubscription {
  managerId: string;
  alertTypes: UrgencyAlertType[];
  priorities: AlertPriority[];
  clientFilters?: string[];
  siteFilters?: string[];
  isActive: boolean;
  notificationPreferences: NotificationMethod[];
}

export interface RealTimeAlertUpdate {
  type: 'new_alert' | 'alert_updated' | 'alert_resolved' | 'alert_escalated';
  alert: UrgentShiftAlert;
  previousState?: Partial<UrgentShiftAlert>;
  affectedManagers: string[];
  timestamp: Date;
}

// Integration Types
export interface AlertIntegrationConfig {
  // Story 3.2 Integration - Guard Assignment
  enableAutoAssignment: boolean;
  assignmentPriorityBoost: number; // Boost priority for urgent shifts
  
  // Story 3.3 Integration - Availability
  checkGuardAvailability: boolean;
  emergencyAvailabilityRequest: boolean;
  
  // External Integrations
  webhookUrls: string[];
  slackIntegration?: {
    enabled: boolean;
    channelId: string;
    webhookUrl: string;
  };
  emailIntegration?: {
    enabled: boolean;
    smtpConfig: Record<string, any>;
  };
}

// API Response Types
export interface UrgencyApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    total?: number;
    activeAlerts?: number;
    criticalAlerts?: number;
    timestamp?: string;
  };
}

export interface AlertDashboardData {
  activeAlerts: UrgentShiftAlert[];
  metrics: AlertMetrics;
  recentActivity: RealTimeAlertUpdate[];
  upcomingRisks: ShiftUrgencyCalculation[];
  configurations: AlertConfiguration[];
}