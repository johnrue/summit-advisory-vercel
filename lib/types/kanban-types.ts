// Story 3.4: Kanban Workflow Management Types
// TypeScript interfaces for shift Kanban board functionality

// Core Kanban Types
export type KanbanStatus = 
  | 'unassigned' 
  | 'assigned' 
  | 'confirmed' 
  | 'in_progress' 
  | 'completed' 
  | 'issue_logged'
  | 'archived';

export type TransitionMethod = 'manual' | 'bulk' | 'automated' | 'api';

export interface KanbanColumn {
  id: KanbanStatus;
  title: string;
  description?: string;
  color: string;
  allowedTransitions: KanbanStatus[];
  requiresValidation?: boolean;
  maxItems?: number;
}

export interface KanbanCard {
  shiftId: string;
  status: KanbanStatus;
  position: number;
  updatedAt: Date;
}

// Workflow Transition Types
export interface StatusTransition {
  fromStatus: KanbanStatus;
  toStatus: KanbanStatus;
  isValid: boolean;
  requiresApproval?: boolean;
  validationRules?: string[];
  businessRules?: string[];
}

export interface WorkflowTransition {
  id: string;
  shiftId: string;
  previousStatus?: KanbanStatus;
  newStatus: KanbanStatus;
  transitionReason?: string;
  changedBy: string;
  changedAt: Date;
  kanbanColumnChanged: boolean;
  transitionMethod: TransitionMethod;
  bulkOperationId?: string;
}

// Filtering Types
export interface KanbanFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  clients?: string[];
  sites?: string[];
  guards?: string[];
  statuses?: KanbanStatus[];
  priorities?: number[];
  certificationRequirements?: string[];
  assignmentStatus?: 'assigned' | 'unassigned' | 'all';
  urgentOnly?: boolean;
}

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filters: KanbanFilters;
  isDefault?: boolean;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
}

// Bulk Operations Types
export interface BulkOperation {
  id: string;
  operationType: 'assign' | 'status_change' | 'priority_update' | 'notification' | 'clone';
  shiftIds: string[];
  parameters: Record<string, any>;
  executedBy: string;
  executedAt: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'rolled_back';
  results?: BulkOperationResult[];
  rollbackData?: Record<string, any>;
}

export interface BulkOperationResult {
  shiftId: string;
  success: boolean;
  error?: string;
  previousValue?: any;
  newValue?: any;
}

export interface BulkActionRequest {
  action: 'assign' | 'status_change' | 'priority_update' | 'notification' | 'clone';
  shiftIds: string[];
  parameters: {
    guardId?: string;
    newStatus?: KanbanStatus;
    priority?: number;
    message?: string;
    templateId?: string;
  };
  reason?: string;
}

// Kanban Board Configuration
export interface KanbanBoardConfig {
  columns: KanbanColumn[];
  allowDragDrop: boolean;
  enableBulkOperations: boolean;
  enableRealTimeUpdates: boolean;
  autoRefreshInterval?: number; // milliseconds
  maxCardsPerColumn?: number;
  defaultFilters?: KanbanFilters;
}

// Collaboration Types
export interface ManagerPresence {
  managerId: string;
  managerName: string;
  isActive: boolean;
  lastActivity: Date;
  currentView?: string;
  editingShift?: string;
}

export interface KanbanActivity {
  id: string;
  activityType: 'shift_moved' | 'bulk_operation' | 'filter_applied' | 'user_joined' | 'user_left';
  managerId: string;
  managerName: string;
  timestamp: Date;
  details: Record<string, any>;
  affectedShifts?: string[];
}

// Performance and Analytics Types
export interface KanbanMetrics {
  totalShifts: number;
  shiftsByStatus: Record<KanbanStatus, number>;
  avgTimeToAssignment: number; // hours
  avgTimeToConfirmation: number; // hours
  completionRate: number; // percentage
  urgentAlertsCount: number;
  workflowBottlenecks: {
    status: KanbanStatus;
    avgDwellTime: number;
    shiftCount: number;
  }[];
}

export interface WorkflowAnalytics {
  date: Date;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  metrics: KanbanMetrics;
  trends: {
    completionRateChange: number;
    assignmentSpeedChange: number;
    urgentAlertsChange: number;
  };
  recommendations: string[];
}

// API Response Types
export interface KanbanApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
    timestamp?: string;
  };
}

export interface KanbanBoardData {
  shifts: Array<any>; // From existing shift types
  columns: KanbanColumn[];
  filters: KanbanFilters;
  activePresence: ManagerPresence[];
  metrics: KanbanMetrics;
  recentActivity: KanbanActivity[];
}

// View Configuration Types
export interface KanbanViewConfig {
  id: string;
  name: string;
  description?: string;
  managerId: string;
  isPublic: boolean;
  config: {
    columns: KanbanColumn[];
    filters: KanbanFilters;
    sortOrder?: 'priority' | 'date' | 'client';
    displayMode?: 'compact' | 'detailed';
    showMetrics?: boolean;
  };
  isBookmarked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface KanbanDashboardWidget {
  id: string;
  type: 'status_overview' | 'urgent_alerts' | 'recent_activity' | 'metrics_summary';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  config: Record<string, any>;
  isVisible: boolean;
}