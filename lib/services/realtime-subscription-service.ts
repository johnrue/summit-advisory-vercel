import { supabase } from '@/lib/supabase'
import { UnifiedLead, FilterCriteria } from '@/lib/types/unified-leads'
import { LeadStatus } from '@/lib/types'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeSubscriptionConfig {
  userId: string
  filters?: FilterCriteria
  onLeadUpdate?: (lead: UnifiedLead, action: 'INSERT' | 'UPDATE' | 'DELETE') => void
  onAnalyticsUpdate?: (analytics: any) => void
  onError?: (error: Error) => void
}

export interface RealtimeEvent {
  eventType: 'lead_update' | 'analytics_update' | 'assignment_update' | 'status_change'
  data: any
  timestamp: Date
  userId?: string
}

export class RealtimeSubscriptionService {
  private static activeChannels = new Map<string, RealtimeChannel>()
  private static eventHandlers = new Map<string, ((event: RealtimeEvent) => void)[]>()

  /**
   * Subscribe to real-time updates for unified lead dashboard
   */
  static async subscribeToLeadUpdates(
    subscriptionId: string,
    config: RealtimeSubscriptionConfig
  ): Promise<{ success: boolean, error?: string }> {
    try {
      // Clean up existing subscription if any
      this.unsubscribe(subscriptionId)

      // Create new channel
      const channel = supabase
        .channel(`unified-leads-${subscriptionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'consultation_requests'
          },
          (payload) => this.handleClientLeadChange(payload, config)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'guard_leads'
          },
          (payload) => this.handleGuardLeadChange(payload, config)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'lead_assignments'
          },
          (payload) => this.handleAssignmentChange(payload, config)
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
          } else if (status === 'CHANNEL_ERROR') {
            config.onError?.(new Error(`Subscription ${subscriptionId} failed`))
          }
        })

      // Store the channel
      this.activeChannels.set(subscriptionId, channel)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe to lead updates'
      }
    }
  }

  /**
   * Subscribe to analytics updates
   */
  static async subscribeToAnalyticsUpdates(
    subscriptionId: string,
    userId: string,
    onUpdate: (analytics: any) => void,
    onError?: (error: Error) => void
  ): Promise<{ success: boolean, error?: string }> {
    try {
      const channel = supabase
        .channel(`analytics-${subscriptionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'lead_analytics_cache'
          },
          (payload) => this.handleAnalyticsUpdate(payload, onUpdate)
        )
        .subscribe()

      this.activeChannels.set(`analytics-${subscriptionId}`, channel)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe to analytics updates'
      }
    }
  }

  /**
   * Subscribe to custom events
   */
  static subscribeToEvents(
    eventType: string,
    handler: (event: RealtimeEvent) => void
  ): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, [])
    }

    this.eventHandlers.get(eventType)!.push(handler)

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType)
      if (handlers) {
        const index = handlers.indexOf(handler)
        if (index > -1) {
          handlers.splice(index, 1)
        }
        
        // Clean up empty handler arrays
        if (handlers.length === 0) {
          this.eventHandlers.delete(eventType)
        }
      }
    }
  }

  /**
   * Emit custom events
   */
  static emitEvent(event: RealtimeEvent): void {
    const handlers = this.eventHandlers.get(event.eventType)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event)
        } catch (error) {
        }
      })
    }
  }

  /**
   * Unsubscribe from a specific subscription
   */
  static unsubscribe(subscriptionId: string): void {
    const channel = this.activeChannels.get(subscriptionId)
    if (channel) {
      supabase.removeChannel(channel)
      this.activeChannels.delete(subscriptionId)
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  static unsubscribeAll(): void {
    this.activeChannels.forEach((channel, subscriptionId) => {
      supabase.removeChannel(channel)
    })
    this.activeChannels.clear()
    this.eventHandlers.clear()
  }

  /**
   * Get active subscription count
   */
  static getActiveSubscriptionCount(): number {
    return this.activeChannels.size
  }

  /**
   * Check if a subscription is active
   */
  static isSubscriptionActive(subscriptionId: string): boolean {
    return this.activeChannels.has(subscriptionId)
  }

  /**
   * Handle client lead changes
   */
  private static async handleClientLeadChange(
    payload: any,
    config: RealtimeSubscriptionConfig
  ): Promise<void> {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload

      // Convert database record to unified lead format
      const unifiedLead = await this.convertClientRecordToUnifiedLead(newRecord || oldRecord)

      // Check if lead matches current filters
      if (config.filters && !this.leadMatchesFilters(unifiedLead, config.filters)) {
        return
      }

      // Call the update handler
      if (config.onLeadUpdate) {
        config.onLeadUpdate(unifiedLead, eventType)
      }

      // Emit custom event
      this.emitEvent({
        eventType: 'lead_update',
        data: {
          lead: unifiedLead,
          action: eventType,
          pipeline: 'client'
        },
        timestamp: new Date(),
        userId: config.userId
      })

      // Trigger analytics recalculation if needed
      if (eventType === 'INSERT' || eventType === 'DELETE') {
        this.triggerAnalyticsUpdate(config.userId)
      }
    } catch (error) {
      config.onError?.(error instanceof Error ? error : new Error('Unknown error'))
    }
  }

  /**
   * Handle guard lead changes
   */
  private static async handleGuardLeadChange(
    payload: any,
    config: RealtimeSubscriptionConfig
  ): Promise<void> {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload

      // Convert database record to unified lead format
      const unifiedLead = await this.convertGuardRecordToUnifiedLead(newRecord || oldRecord)

      // Check if lead matches current filters
      if (config.filters && !this.leadMatchesFilters(unifiedLead, config.filters)) {
        return
      }

      // Call the update handler
      if (config.onLeadUpdate) {
        config.onLeadUpdate(unifiedLead, eventType)
      }

      // Emit custom event
      this.emitEvent({
        eventType: 'lead_update',
        data: {
          lead: unifiedLead,
          action: eventType,
          pipeline: 'guard'
        },
        timestamp: new Date(),
        userId: config.userId
      })

      // Trigger analytics recalculation if needed
      if (eventType === 'INSERT' || eventType === 'DELETE') {
        this.triggerAnalyticsUpdate(config.userId)
      }
    } catch (error) {
      config.onError?.(error instanceof Error ? error : new Error('Unknown error'))
    }
  }

  /**
   * Handle assignment changes
   */
  private static async handleAssignmentChange(
    payload: any,
    config: RealtimeSubscriptionConfig
  ): Promise<void> {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload

      // Emit assignment update event
      this.emitEvent({
        eventType: 'assignment_update',
        data: {
          assignment: newRecord || oldRecord,
          action: eventType
        },
        timestamp: new Date(),
        userId: config.userId
      })

      // Trigger manager performance recalculation
      this.triggerManagerPerformanceUpdate(
        newRecord?.assigned_manager_id || oldRecord?.assigned_manager_id
      )
    } catch (error) {
      config.onError?.(error instanceof Error ? error : new Error('Unknown error'))
    }
  }

  /**
   * Handle analytics updates
   */
  private static async handleAnalyticsUpdate(
    payload: any,
    onUpdate: (analytics: any) => void
  ): Promise<void> {
    try {
      const { new: newRecord } = payload
      
      if (newRecord && newRecord.analytics_data) {
        const analytics = JSON.parse(newRecord.analytics_data)
        onUpdate(analytics)
      }
    } catch (error) {
    }
  }

  /**
   * Convert client database record to unified lead
   */
  private static async convertClientRecordToUnifiedLead(record: any): Promise<UnifiedLead> {
    return {
      id: record.id,
      type: 'client',
      source: 'website', // Client leads are primarily from website
      status: this.mapClientStatus(record.status),
      priority: this.calculatePriority(record.created_at),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      clientInfo: {
        firstName: record.first_name,
        lastName: record.last_name,
        email: record.email,
        phone: record.phone,
        serviceType: record.service_type,
        message: record.message
      },
      sourceAttribution: {
        originalSource: 'website',
        sourceDetails: {},
        referralPath: []
      },
      conversionMetrics: {
        contactCount: 0,
        timeToFirstContact: undefined,
        timeToConversion: undefined
      },
      engagementScore: this.calculateEngagementScore(record),
      responseTime: 0
    }
  }

  /**
   * Convert guard database record to unified lead
   */
  private static async convertGuardRecordToUnifiedLead(record: any): Promise<UnifiedLead> {
    return {
      id: record.id,
      type: 'guard',
      source: record.lead_source,
      status: this.mapGuardStatus(record.status),
      priority: this.calculatePriority(record.created_at),
      assignedManager: record.assigned_manager_id,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      guardInfo: {
        firstName: record.first_name,
        lastName: record.last_name,
        email: record.email,
        phone: record.phone,
        hasSecurityExperience: false, // Would be populated from application data
        hasLicense: false,
        preferredShifts: [],
        preferredLocations: [],
        availability: {
          fullTime: true,
          partTime: false,
          weekdays: true,
          weekends: false,
          nights: false,
          holidays: false
        },
        transportationAvailable: true
      },
      sourceAttribution: {
        originalSource: record.lead_source,
        sourceDetails: record.source_details ? JSON.parse(record.source_details) : {},
        referralPath: []
      },
      conversionMetrics: {
        contactCount: 0,
        timeToFirstContact: undefined,
        timeToConversion: undefined
      },
      engagementScore: this.calculateEngagementScore(record),
      responseTime: 0
    }
  }

  /**
   * Check if lead matches filters
   */
  private static leadMatchesFilters(lead: UnifiedLead, filters: FilterCriteria): boolean {
    // Lead type filter
    if (filters.leadType && !filters.leadType.includes(lead.type)) {
      return false
    }

    // Source filter
    if (filters.sources && !filters.sources.includes(lead.source as any)) {
      return false
    }

    // Status filter
    if (filters.statuses && !filters.statuses.includes(lead.status as any)) {
      return false
    }

    // Assigned user filter
    if (filters.assignedUsers && filters.assignedUsers.length > 0) {
      if (!lead.assignedManager || !filters.assignedUsers.includes(lead.assignedManager)) {
        return false
      }
    }

    // Date range filter
    if (filters.dateRange) {
      const leadDate = lead.createdAt
      const startDate = new Date(filters.dateRange.start)
      const endDate = new Date(filters.dateRange.end)
      
      if (leadDate < startDate || leadDate > endDate) {
        return false
      }
    }

    // Priority filter
    if (filters.priorities && !filters.priorities.includes(lead.priority)) {
      return false
    }

    return true
  }

  /**
   * Helper methods for data transformation
   */
  private static mapClientStatus(status: string): LeadStatus {
    const statusMappings: Record<string, LeadStatus> = {
      'new': 'new',
      'contacted': 'contacted',
      'scheduled': 'qualified',
      'completed': 'converted',
      'cancelled': 'lost'
    }
    
    return statusMappings[status] || status as LeadStatus
  }

  private static mapGuardStatus(status: string): LeadStatus {
    const statusMappings: Record<string, LeadStatus> = {
      'new': 'new',
      'contacted': 'contacted',
      'application-sent': 'qualified',
      'hired': 'converted',
      'rejected': 'lost'
    }
    
    return statusMappings[status] || status as LeadStatus
  }

  private static calculatePriority(createdAt: string): 'low' | 'medium' | 'high' | 'critical' {
    const created = new Date(createdAt)
    const hoursOld = (Date.now() - created.getTime()) / (1000 * 60 * 60)
    
    if (hoursOld < 1) return 'critical'
    if (hoursOld < 24) return 'high'
    if (hoursOld < 72) return 'medium'
    return 'low'
  }

  private static calculateEngagementScore(record: any): number {
    let score = 50 // Base score
    
    if (record.phone) score += 10
    if (record.message && record.message.length > 50) score += 20
    if (record.assigned_manager_id) score += 15
    
    return Math.min(100, score)
  }

  /**
   * Trigger analytics updates
   */
  private static async triggerAnalyticsUpdate(userId: string): Promise<void> {
    // Emit event to trigger analytics recalculation
    this.emitEvent({
      eventType: 'analytics_update',
      data: { userId },
      timestamp: new Date(),
      userId
    })
  }

  private static async triggerManagerPerformanceUpdate(managerId: string): Promise<void> {
    // Emit event to trigger manager performance recalculation
    this.emitEvent({
      eventType: 'analytics_update',
      data: { 
        type: 'manager_performance',
        managerId 
      },
      timestamp: new Date()
    })
  }
}