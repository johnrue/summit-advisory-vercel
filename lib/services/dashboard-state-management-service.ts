import { supabase } from '@/lib/supabase'
import { FilterCriteria, DateRange } from '@/lib/types/unified-leads'
import { ApiResponse } from '@/lib/types'

export interface DashboardViewPreference {
  id: string
  userId: string
  viewName: string
  isDefault: boolean
  filters: FilterCriteria
  layoutConfig: DashboardLayoutConfig
  createdAt: string
  updatedAt: string
}

export interface DashboardLayoutConfig {
  widgets: DashboardWidget[]
  gridLayout: GridLayoutItem[]
  theme: 'light' | 'dark' | 'auto'
  refreshInterval: number // minutes
  compactMode: boolean
  showAnalytics: boolean
}

export interface DashboardWidget {
  id: string
  type: 'lead-summary' | 'source-performance' | 'pipeline-velocity' | 'manager-performance' | 'recent-activity' | 'conversion-trends'
  title: string
  position: { x: number, y: number }
  size: { width: number, height: number }
  isVisible: boolean
  config: Record<string, any>
}

export interface GridLayoutItem {
  widgetId: string
  x: number
  y: number
  width: number
  height: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

export interface DashboardState {
  activeView: DashboardViewPreference
  currentFilters: FilterCriteria
  layoutConfig: DashboardLayoutConfig
  isLoading: boolean
  lastRefresh: Date
  realtimeSubscriptions: string[]
}

export interface FilterPreset {
  id: string
  userId: string
  name: string
  description?: string
  filters: FilterCriteria
  isGlobal: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

export class DashboardStateManagementService {
  private static state: DashboardState | null = null
  private static subscribers: ((state: DashboardState) => void)[] = []
  private static realtimeChannels: any[] = []

  /**
   * Initialize dashboard state for a user
   */
  static async initializeDashboardState(userId: string): Promise<ApiResponse<DashboardState>> {
    try {
      // Load user's default view preference
      const defaultView = await this.getUserDefaultView(userId)
      
      // Initialize dashboard state
      this.state = {
        activeView: defaultView,
        currentFilters: defaultView.filters,
        layoutConfig: defaultView.layoutConfig,
        isLoading: false,
        lastRefresh: new Date(),
        realtimeSubscriptions: []
      }

      // Set up real-time subscriptions
      await this.setupRealtimeSubscriptions(userId)

      // Notify subscribers
      this.notifySubscribers()

      return {
        success: true,
        data: this.state
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize dashboard state'
      }
    }
  }

  /**
   * Subscribe to dashboard state changes
   */
  static subscribe(callback: (state: DashboardState) => void): () => void {
    this.subscribers.push(callback)
    
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback)
    }
  }

  /**
   * Update dashboard filters
   */
  static async updateFilters(
    userId: string, 
    filters: FilterCriteria, 
    saveAsPreset?: { name: string, description?: string }
  ): Promise<ApiResponse<DashboardState>> {
    try {
      if (!this.state) {
        throw new Error('Dashboard state not initialized')
      }

      // Update current filters
      this.state.currentFilters = filters
      this.state.lastRefresh = new Date()
      this.state.isLoading = true

      this.notifySubscribers()

      // Save as filter preset if requested
      if (saveAsPreset) {
        await this.saveFilterPreset(userId, saveAsPreset.name, filters, saveAsPreset.description)
      }

      // Update the active view with new filters
      await this.updateViewPreference(userId, this.state.activeView.id, {
        filters
      })

      this.state.isLoading = false
      this.notifySubscribers()

      return {
        success: true,
        data: this.state
      }
    } catch (error) {
      if (this.state) {
        this.state.isLoading = false
        this.notifySubscribers()
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update filters'
      }
    }
  }

  /**
   * Switch to a different view preference
   */
  static async switchView(userId: string, viewId: string): Promise<ApiResponse<DashboardState>> {
    try {
      if (!this.state) {
        throw new Error('Dashboard state not initialized')
      }

      const view = await this.getViewPreference(userId, viewId)
      
      this.state.activeView = view
      this.state.currentFilters = view.filters
      this.state.layoutConfig = view.layoutConfig
      this.state.lastRefresh = new Date()
      this.state.isLoading = true

      this.notifySubscribers()

      // Refresh real-time subscriptions based on new filters
      await this.refreshRealtimeSubscriptions(userId)

      this.state.isLoading = false
      this.notifySubscribers()

      return {
        success: true,
        data: this.state
      }
    } catch (error) {
      if (this.state) {
        this.state.isLoading = false
        this.notifySubscribers()
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to switch view'
      }
    }
  }

  /**
   * Update layout configuration
   */
  static async updateLayout(
    userId: string, 
    layoutConfig: Partial<DashboardLayoutConfig>
  ): Promise<ApiResponse<DashboardState>> {
    try {
      if (!this.state) {
        throw new Error('Dashboard state not initialized')
      }

      // Merge layout configuration
      this.state.layoutConfig = {
        ...this.state.layoutConfig,
        ...layoutConfig
      }

      // Update the active view with new layout
      await this.updateViewPreference(userId, this.state.activeView.id, {
        layoutConfig: this.state.layoutConfig
      })

      this.notifySubscribers()

      return {
        success: true,
        data: this.state
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update layout'
      }
    }
  }

  /**
   * Get all view preferences for a user
   */
  static async getUserViewPreferences(userId: string): Promise<ApiResponse<DashboardViewPreference[]>> {
    try {
      const { data, error } = await supabase
        .from('dashboard_view_preferences')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('updated_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch view preferences: ${error.message}`)
      }

      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch view preferences'
      }
    }
  }

  /**
   * Create a new view preference
   */
  static async createViewPreference(
    userId: string,
    viewName: string,
    filters: FilterCriteria,
    layoutConfig: DashboardLayoutConfig,
    isDefault = false
  ): Promise<ApiResponse<DashboardViewPreference>> {
    try {
      // If setting as default, unset other defaults
      if (isDefault) {
        await supabase
          .from('dashboard_view_preferences')
          .update({ is_default: false })
          .eq('user_id', userId)
          .eq('is_default', true)
      }

      const viewData = {
        user_id: userId,
        view_name: viewName,
        is_default: isDefault,
        filters: JSON.stringify(filters),
        layout_config: JSON.stringify(layoutConfig)
      }

      const { data, error } = await supabase
        .from('dashboard_view_preferences')
        .insert([viewData])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create view preference: ${error.message}`)
      }

      const viewPreference: DashboardViewPreference = {
        id: data.id,
        userId: data.user_id,
        viewName: data.view_name,
        isDefault: data.is_default,
        filters: JSON.parse(data.filters),
        layoutConfig: JSON.parse(data.layout_config),
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }

      return {
        success: true,
        data: viewPreference
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create view preference'
      }
    }
  }

  /**
   * Get filter presets for a user
   */
  static async getFilterPresets(userId: string): Promise<ApiResponse<FilterPreset[]>> {
    try {
      const { data, error } = await supabase
        .from('dashboard_filter_presets')
        .select('*')
        .or(`user_id.eq.${userId},is_global.eq.true`)
        .order('usage_count', { ascending: false })
        .order('updated_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch filter presets: ${error.message}`)
      }

      const presets: FilterPreset[] = (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        name: item.name,
        description: item.description,
        filters: JSON.parse(item.filters),
        isGlobal: item.is_global,
        usageCount: item.usage_count,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))

      return {
        success: true,
        data: presets
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch filter presets'
      }
    }
  }

  /**
   * Apply a filter preset
   */
  static async applyFilterPreset(userId: string, presetId: string): Promise<ApiResponse<DashboardState>> {
    try {
      // Get the preset
      const { data: preset, error } = await supabase
        .from('dashboard_filter_presets')
        .select('*')
        .eq('id', presetId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch filter preset: ${error.message}`)
      }

      // Increment usage count
      await supabase
        .from('dashboard_filter_presets')
        .update({ usage_count: preset.usage_count + 1 })
        .eq('id', presetId)

      // Apply the filters
      const filters = JSON.parse(preset.filters)
      return await this.updateFilters(userId, filters)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply filter preset'
      }
    }
  }

  /**
   * Refresh dashboard data
   */
  static async refreshDashboard(): Promise<void> {
    if (!this.state) return

    this.state.isLoading = true
    this.state.lastRefresh = new Date()
    this.notifySubscribers()

    // Simulate refresh delay
    setTimeout(() => {
      if (this.state) {
        this.state.isLoading = false
        this.notifySubscribers()
      }
    }, 1000)
  }

  /**
   * Get current dashboard state
   */
  static getCurrentState(): DashboardState | null {
    return this.state
  }

  /**
   * Clean up dashboard state and subscriptions
   */
  static cleanup(): void {
    // Clean up real-time subscriptions
    this.realtimeChannels.forEach(channel => {
      supabase.removeChannel(channel)
    })
    this.realtimeChannels = []

    // Clear state and subscribers
    this.state = null
    this.subscribers = []
  }

  /**
   * Private helper methods
   */
  private static async getUserDefaultView(userId: string): Promise<DashboardViewPreference> {
    // Try to get user's default view
    const { data, error } = await supabase
      .from('dashboard_view_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch default view: ${error.message}`)
    }

    if (data) {
      return {
        id: data.id,
        userId: data.user_id,
        viewName: data.view_name,
        isDefault: data.is_default,
        filters: JSON.parse(data.filters),
        layoutConfig: JSON.parse(data.layout_config),
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    }

    // Create default view if none exists
    return await this.createDefaultView(userId)
  }

  private static async createDefaultView(userId: string): Promise<DashboardViewPreference> {
    const defaultFilters: FilterCriteria = {
      leadType: ['client', 'guard'],
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    }

    const defaultLayout: DashboardLayoutConfig = {
      widgets: [
        {
          id: 'lead-summary',
          type: 'lead-summary',
          title: 'Lead Summary',
          position: { x: 0, y: 0 },
          size: { width: 6, height: 3 },
          isVisible: true,
          config: {}
        },
        {
          id: 'source-performance',
          type: 'source-performance',
          title: 'Source Performance',
          position: { x: 6, y: 0 },
          size: { width: 6, height: 3 },
          isVisible: true,
          config: {}
        },
        {
          id: 'pipeline-velocity',
          type: 'pipeline-velocity',
          title: 'Pipeline Velocity',
          position: { x: 0, y: 3 },
          size: { width: 12, height: 4 },
          isVisible: true,
          config: {}
        }
      ],
      gridLayout: [
        { widgetId: 'lead-summary', x: 0, y: 0, width: 6, height: 3 },
        { widgetId: 'source-performance', x: 6, y: 0, width: 6, height: 3 },
        { widgetId: 'pipeline-velocity', x: 0, y: 3, width: 12, height: 4 }
      ],
      theme: 'auto',
      refreshInterval: 5,
      compactMode: false,
      showAnalytics: true
    }

    const result = await this.createViewPreference(
      userId,
      'Default View',
      defaultFilters,
      defaultLayout,
      true
    )

    if (!result.success) {
      throw new Error('Failed to create default view')
    }

    return result.data!
  }

  private static async getViewPreference(userId: string, viewId: string): Promise<DashboardViewPreference> {
    const { data, error } = await supabase
      .from('dashboard_view_preferences')
      .select('*')
      .eq('id', viewId)
      .eq('user_id', userId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch view preference: ${error.message}`)
    }

    return {
      id: data.id,
      userId: data.user_id,
      viewName: data.view_name,
      isDefault: data.is_default,
      filters: JSON.parse(data.filters),
      layoutConfig: JSON.parse(data.layout_config),
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  private static async updateViewPreference(
    userId: string,
    viewId: string,
    updates: Partial<{ filters: FilterCriteria, layoutConfig: DashboardLayoutConfig }>
  ): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (updates.filters) {
      updateData.filters = JSON.stringify(updates.filters)
    }

    if (updates.layoutConfig) {
      updateData.layout_config = JSON.stringify(updates.layoutConfig)
    }

    const { error } = await supabase
      .from('dashboard_view_preferences')
      .update(updateData)
      .eq('id', viewId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to update view preference: ${error.message}`)
    }
  }

  private static async saveFilterPreset(
    userId: string,
    name: string,
    filters: FilterCriteria,
    description?: string
  ): Promise<void> {
    const presetData = {
      user_id: userId,
      name,
      description,
      filters: JSON.stringify(filters),
      is_global: false,
      usage_count: 1
    }

    const { error } = await supabase
      .from('dashboard_filter_presets')
      .insert([presetData])

    if (error) {
      throw new Error(`Failed to save filter preset: ${error.message}`)
    }
  }

  private static async setupRealtimeSubscriptions(userId: string): Promise<void> {
    // Subscribe to lead changes
    const leadChannel = supabase
      .channel('unified-leads-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'consultation_requests' 
        }, 
        () => this.handleRealtimeUpdate()
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'guard_leads' 
        }, 
        () => this.handleRealtimeUpdate()
      )
      .subscribe()

    this.realtimeChannels.push(leadChannel)

    if (this.state) {
      this.state.realtimeSubscriptions.push('unified-leads-updates')
    }
  }

  private static async refreshRealtimeSubscriptions(userId: string): Promise<void> {
    // Clean up existing subscriptions
    this.realtimeChannels.forEach(channel => {
      supabase.removeChannel(channel)
    })
    this.realtimeChannels = []

    // Set up new subscriptions
    await this.setupRealtimeSubscriptions(userId)
  }

  private static handleRealtimeUpdate(): void {
    if (this.state) {
      this.state.lastRefresh = new Date()
      this.notifySubscribers()
    }
  }

  private static notifySubscribers(): void {
    if (this.state) {
      this.subscribers.forEach(callback => callback(this.state!))
    }
  }
}