import { supabase } from '@/lib/supabase'
import { FilterCriteria, DateRange, CustomFilter } from '@/lib/types/unified-leads'
import { ApiResponse } from '@/lib/types'

export interface FilterPreset {
  id: string
  userId: string
  name: string
  description?: string
  filters: FilterCriteria
  isGlobal: boolean
  usageCount: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface FilterQueryBuilder {
  query: string
  params: any[]
}

export interface FilterValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export class UnifiedLeadFilterService {
  /**
   * Build optimized database queries for complex filtering
   */
  static buildFilterQuery(
    filters: FilterCriteria,
    baseTable: 'consultation_requests' | 'guard_leads'
  ): FilterQueryBuilder {
    const conditions: string[] = []
    const params: any[] = []
    let paramCount = 0

    // Lead type filter (implicit based on table choice)
    // No need to add condition as it's handled by table selection

    // Status filter
    if (filters.statuses && filters.statuses.length > 0) {
      const statusConditions = filters.statuses.map(() => {
        paramCount++
        return `$${paramCount}`
      })
      conditions.push(`status IN (${statusConditions.join(', ')})`)
      params.push(...this.mapStatusesToTable(filters.statuses, baseTable))
    }

    // Source filter
    if (filters.sources && filters.sources.length > 0) {
      if (baseTable === 'guard_leads') {
        const sourceConditions = filters.sources.map(() => {
          paramCount++
          return `$${paramCount}`
        })
        conditions.push(`lead_source IN (${sourceConditions.join(', ')})`)
        params.push(...filters.sources)
      }
      // Client leads don't have diverse sources, they're primarily from website
    }

    // Assigned users filter
    if (filters.assignedUsers && filters.assignedUsers.length > 0) {
      const userConditions = filters.assignedUsers.map(() => {
        paramCount++
        return `$${paramCount}`
      })
      
      if (baseTable === 'guard_leads') {
        conditions.push(`assigned_manager_id IN (${userConditions.join(', ')})`)
      } else {
        // For client leads, we'd need to join with assignments table
        conditions.push(`id IN (SELECT lead_id FROM lead_assignments WHERE assigned_to IN (${userConditions.join(', ')}))`)
      }
      params.push(...filters.assignedUsers)
    }

    // Date range filter
    if (filters.dateRange) {
      paramCount++
      conditions.push(`created_at >= $${paramCount}`)
      params.push(filters.dateRange.start)
      
      paramCount++
      conditions.push(`created_at <= $${paramCount}`)
      params.push(filters.dateRange.end)
    }

    // Priority filter (calculated dynamically)
    if (filters.priorities && filters.priorities.length > 0) {
      const priorityConditions = this.buildPriorityConditions(filters.priorities)
      if (priorityConditions) {
        conditions.push(priorityConditions)
      }
    }

    // Score range filter (applies to guard leads)
    if (filters.scoreRange && baseTable === 'guard_leads') {
      if (filters.scoreRange.min !== undefined) {
        paramCount++
        conditions.push(`qualification_score >= $${paramCount}`)
        params.push(filters.scoreRange.min)
      }
      if (filters.scoreRange.max !== undefined) {
        paramCount++
        conditions.push(`qualification_score <= $${paramCount}`)
        params.push(filters.scoreRange.max)
      }
    }

    // Value range filter (applies to client leads with estimated value)
    if (filters.valueRange && baseTable === 'consultation_requests') {
      if (filters.valueRange.min !== undefined) {
        paramCount++
        conditions.push(`estimated_value >= $${paramCount}`)
        params.push(filters.valueRange.min)
      }
      if (filters.valueRange.max !== undefined) {
        paramCount++
        conditions.push(`estimated_value <= $${paramCount}`)
        params.push(filters.valueRange.max)
      }
    }

    // Custom filters
    if (filters.customFilters && filters.customFilters.length > 0) {
      const customConditions = this.buildCustomFilterConditions(
        filters.customFilters,
        baseTable,
        paramCount
      )
      conditions.push(...customConditions.conditions)
      params.push(...customConditions.params)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const query = `SELECT * FROM ${baseTable} ${whereClause} ORDER BY created_at DESC`

    return { query, params }
  }

  /**
   * Validate filter criteria for correctness and performance
   */
  static validateFilters(filters: FilterCriteria): FilterValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Date range validation
    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start)
      const endDate = new Date(filters.dateRange.end)
      
      if (isNaN(startDate.getTime())) {
        errors.push('Invalid start date format')
      }
      if (isNaN(endDate.getTime())) {
        errors.push('Invalid end date format')
      }
      if (startDate > endDate) {
        errors.push('Start date cannot be after end date')
      }
      
      // Performance warning for large date ranges
      const daysDifference = Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysDifference > 365) {
        warnings.push('Large date range may impact performance. Consider narrowing the range.')
      }
    }

    // Score range validation
    if (filters.scoreRange) {
      if (filters.scoreRange.min !== undefined && (filters.scoreRange.min < 0 || filters.scoreRange.min > 100)) {
        errors.push('Score range minimum must be between 0 and 100')
      }
      if (filters.scoreRange.max !== undefined && (filters.scoreRange.max < 0 || filters.scoreRange.max > 100)) {
        errors.push('Score range maximum must be between 0 and 100')
      }
      if (filters.scoreRange.min !== undefined && filters.scoreRange.max !== undefined && 
          filters.scoreRange.min > filters.scoreRange.max) {
        errors.push('Score range minimum cannot be greater than maximum')
      }
    }

    // Value range validation
    if (filters.valueRange) {
      if (filters.valueRange.min !== undefined && filters.valueRange.min < 0) {
        errors.push('Value range minimum cannot be negative')
      }
      if (filters.valueRange.min !== undefined && filters.valueRange.max !== undefined && 
          filters.valueRange.min > filters.valueRange.max) {
        errors.push('Value range minimum cannot be greater than maximum')
      }
    }

    // Custom filter validation
    if (filters.customFilters) {
      filters.customFilters.forEach((filter, index) => {
        if (!filter.field || !filter.operator || filter.value === undefined) {
          errors.push(`Custom filter ${index + 1} is missing required fields`)
        }
        
        if (filter.operator === 'between' && (!filter.values || filter.values.length !== 2)) {
          errors.push(`Custom filter ${index + 1} with 'between' operator requires exactly 2 values`)
        }
      })
    }

    // Performance warnings
    if (filters.assignedUsers && filters.assignedUsers.length > 10) {
      warnings.push('Large number of assigned users may impact query performance')
    }

    if (filters.customFilters && filters.customFilters.length > 5) {
      warnings.push('Large number of custom filters may impact query performance')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Get saved filter presets for a user
   */
  static async getFilterPresets(
    userId: string,
    includeGlobal: boolean = true
  ): Promise<ApiResponse<FilterPreset[]>> {
    try {
      let query = supabase
        .from('dashboard_filter_presets')
        .select('*')
        .order('usage_count', { ascending: false })
        .order('updated_at', { ascending: false })

      if (includeGlobal) {
        query = query.or(`user_id.eq.${userId},is_global.eq.true`)
      } else {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

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
        tags: item.tags || [],
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
   * Save a new filter preset
   */
  static async saveFilterPreset(
    userId: string,
    name: string,
    description: string,
    filters: FilterCriteria,
    tags: string[] = [],
    isGlobal: boolean = false
  ): Promise<ApiResponse<FilterPreset>> {
    try {
      // Validate filters before saving
      const validation = this.validateFilters(filters)
      if (!validation.isValid) {
        throw new Error(`Invalid filters: ${validation.errors.join(', ')}`)
      }

      const presetData = {
        user_id: userId,
        name: name.trim(),
        description: description.trim(),
        filters: JSON.stringify(filters),
        tags: tags,
        is_global: isGlobal,
        usage_count: 0
      }

      const { data, error } = await supabase
        .from('dashboard_filter_presets')
        .insert([presetData])
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to save filter preset: ${error.message}`)
      }

      const preset: FilterPreset = {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description,
        filters: JSON.parse(data.filters),
        isGlobal: data.is_global,
        usageCount: data.usage_count,
        tags: data.tags || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }

      return {
        success: true,
        data: preset
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save filter preset'
      }
    }
  }

  /**
   * Update an existing filter preset
   */
  static async updateFilterPreset(
    userId: string,
    presetId: string,
    updates: Partial<{
      name: string
      description: string
      filters: FilterCriteria
      tags: string[]
    }>
  ): Promise<ApiResponse<FilterPreset>> {
    try {
      // Validate filters if being updated
      if (updates.filters) {
        const validation = this.validateFilters(updates.filters)
        if (!validation.isValid) {
          throw new Error(`Invalid filters: ${validation.errors.join(', ')}`)
        }
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (updates.name) updateData.name = updates.name.trim()
      if (updates.description !== undefined) updateData.description = updates.description.trim()
      if (updates.filters) updateData.filters = JSON.stringify(updates.filters)
      if (updates.tags) updateData.tags = updates.tags

      const { data, error } = await supabase
        .from('dashboard_filter_presets')
        .update(updateData)
        .eq('id', presetId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update filter preset: ${error.message}`)
      }

      const preset: FilterPreset = {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description,
        filters: JSON.parse(data.filters),
        isGlobal: data.is_global,
        usageCount: data.usage_count,
        tags: data.tags || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }

      return {
        success: true,
        data: preset
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update filter preset'
      }
    }
  }

  /**
   * Delete a filter preset
   */
  static async deleteFilterPreset(
    userId: string,
    presetId: string
  ): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('dashboard_filter_presets')
        .delete()
        .eq('id', presetId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Failed to delete filter preset: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete filter preset'
      }
    }
  }

  /**
   * Apply a filter preset and increment usage count
   */
  static async applyFilterPreset(
    userId: string,
    presetId: string
  ): Promise<ApiResponse<FilterCriteria>> {
    try {
      // Get the preset
      const { data: preset, error: fetchError } = await supabase
        .from('dashboard_filter_presets')
        .select('*')
        .eq('id', presetId)
        .single()

      if (fetchError) {
        throw new Error(`Failed to fetch filter preset: ${fetchError.message}`)
      }

      // Increment usage count
      await supabase
        .from('dashboard_filter_presets')
        .update({ 
          usage_count: preset.usage_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', presetId)

      const filters = JSON.parse(preset.filters)

      return {
        success: true,
        data: filters
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply filter preset'
      }
    }
  }

  /**
   * Search filter presets by name or tags
   */
  static async searchFilterPresets(
    userId: string,
    searchTerm: string,
    includeGlobal: boolean = true
  ): Promise<ApiResponse<FilterPreset[]>> {
    try {
      let query = supabase
        .from('dashboard_filter_presets')
        .select('*')

      if (includeGlobal) {
        query = query.or(`user_id.eq.${userId},is_global.eq.true`)
      } else {
        query = query.eq('user_id', userId)
      }

      // Add search conditions
      query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)

      query = query
        .order('usage_count', { ascending: false })
        .order('updated_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to search filter presets: ${error.message}`)
      }

      const presets: FilterPreset[] = (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        name: item.name,
        description: item.description,
        filters: JSON.parse(item.filters),
        isGlobal: item.is_global,
        usageCount: item.usage_count,
        tags: item.tags || [],
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
        error: error instanceof Error ? error.message : 'Failed to search filter presets'
      }
    }
  }

  /**
   * Get filter suggestions based on user history and popular filters
   */
  static async getFilterSuggestions(userId: string): Promise<ApiResponse<{
    recentFilters: Partial<FilterCriteria>[]
    popularFilters: Partial<FilterCriteria>[]
    suggestedPresets: FilterPreset[]
  }>> {
    try {
      // This would be implemented based on user's filter history
      // For now, return some common suggestions
      
      const recentFilters: Partial<FilterCriteria>[] = [
        { leadType: ['client'] },
        { statuses: ['new', 'contacted'] },
        { dateRange: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] } }
      ]

      const popularFilters: Partial<FilterCriteria>[] = [
        { leadType: ['guard'], statuses: ['new'] },
        { priorities: ['high', 'critical'] },
        { sources: ['website', 'referral'] }
      ]

      // Get top global presets as suggestions
      const { data: suggestedPresets } = await supabase
        .from('dashboard_filter_presets')
        .select('*')
        .eq('is_global', true)
        .order('usage_count', { ascending: false })
        .limit(5)

      const presets: FilterPreset[] = (suggestedPresets || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        name: item.name,
        description: item.description,
        filters: JSON.parse(item.filters),
        isGlobal: item.is_global,
        usageCount: item.usage_count,
        tags: item.tags || [],
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))

      return {
        success: true,
        data: {
          recentFilters,
          popularFilters,
          suggestedPresets: presets
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get filter suggestions'
      }
    }
  }

  /**
   * Private helper methods
   */
  private static mapStatusesToTable(
    statuses: string[], 
    table: 'consultation_requests' | 'guard_leads'
  ): string[] {
    const mappings = {
      consultation_requests: {
        'new': 'new',
        'contacted': 'contacted',
        'qualified': 'scheduled',
        'converted': 'completed',
        'lost': 'cancelled'
      },
      guard_leads: {
        'new': 'new',
        'contacted': 'contacted',
        'qualified': 'application-sent',
        'converted': 'hired',
        'lost': 'rejected'
      }
    }

    const tableMapping = mappings[table]
    return statuses.map(status => tableMapping[status as keyof typeof tableMapping] || status)
  }

  private static buildPriorityConditions(priorities: string[]): string | null {
    // Priority is calculated based on created_at, so we build time-based conditions
    const conditions: string[] = []

    if (priorities.includes('critical')) {
      conditions.push('created_at > NOW() - INTERVAL \'1 hour\'')
    }
    if (priorities.includes('high')) {
      conditions.push('(created_at > NOW() - INTERVAL \'1 day\' AND created_at <= NOW() - INTERVAL \'1 hour\')')
    }
    if (priorities.includes('medium')) {
      conditions.push('(created_at > NOW() - INTERVAL \'3 days\' AND created_at <= NOW() - INTERVAL \'1 day\')')
    }
    if (priorities.includes('low')) {
      conditions.push('created_at <= NOW() - INTERVAL \'3 days\'')
    }

    return conditions.length > 0 ? `(${conditions.join(' OR ')})` : null
  }

  private static buildCustomFilterConditions(
    customFilters: CustomFilter[],
    table: string,
    startingParamCount: number
  ): { conditions: string[], params: any[] } {
    const conditions: string[] = []
    const params: any[] = []
    let paramCount = startingParamCount

    customFilters.forEach(filter => {
      switch (filter.operator) {
        case 'equals':
          paramCount++
          conditions.push(`${filter.field} = $${paramCount}`)
          params.push(filter.value)
          break
        
        case 'contains':
          paramCount++
          conditions.push(`${filter.field} ILIKE $${paramCount}`)
          params.push(`%${filter.value}%`)
          break
        
        case 'greater_than':
          paramCount++
          conditions.push(`${filter.field} > $${paramCount}`)
          params.push(filter.value)
          break
        
        case 'less_than':
          paramCount++
          conditions.push(`${filter.field} < $${paramCount}`)
          params.push(filter.value)
          break
        
        case 'between':
          if (filter.values && filter.values.length === 2) {
            paramCount++
            conditions.push(`${filter.field} >= $${paramCount}`)
            params.push(filter.values[0])
            
            paramCount++
            conditions.push(`${filter.field} <= $${paramCount}`)
            params.push(filter.values[1])
          }
          break
      }
    })

    return { conditions, params }
  }
}