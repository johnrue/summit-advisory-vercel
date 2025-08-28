// Story 3.4: Shift Archive Service
// Manages shift archival, historical reporting, and analytics

import { createClient } from '@/lib/supabase';
import type { 
  ShiftArchive, 
  ArchiveReason, 
  ShiftCompletionMetrics,
  HistoricalReport,
  ArchiveMetrics,
  ArchiveSearchQuery,
  ArchiveSearchResult 
} from '@/lib/types/archive-types';
import type { ServiceResult } from '@/lib/types/service-types';

export class ShiftArchiveService {
  private static supabase = createClient();

  /**
   * Archive a completed shift
   */
  static async archiveShift(
    shiftId: string,
    archivedBy: string,
    reason: ArchiveReason = 'completed',
    completionMetrics?: Partial<ShiftCompletionMetrics>
  ): Promise<ServiceResult<ShiftArchive>> {
    try {
      // Get complete shift data for archival
      const { data: shiftData, error: shiftError } = await this.supabase
        .from('shifts')
        .select(`
          *,
          shift_assignments!left(*),
          shift_workflow_history!left(*)
        `)
        .eq('id', shiftId)
        .single();

      if (shiftError || !shiftData) {
        return {
          success: false,
          error: {
            code: 'SHIFT_NOT_FOUND',
            message: 'Shift not found for archival'
          }
        };
      }

      // Calculate completion metrics if not provided
      const calculatedMetrics = completionMetrics || await this.calculateCompletionMetrics(shiftData);

      // Extract denormalized fields for search performance
      const clientName = shiftData.client_info?.name || 'Unknown Client';
      const siteName = shiftData.location_data?.siteName || shiftData.location_data?.address || 'Unknown Site';
      const shiftDate = new Date(shiftData.time_range.split(',')[0].replace('[', '').replace('"', ''));
      const shiftEnd = new Date(shiftData.time_range.split(',')[1].replace(']', '').replace('"', ''));
      const shiftDurationHours = (shiftEnd.getTime() - shiftDate.getTime()) / (1000 * 60 * 60);

      // Get guard name if assigned
      let guardName: string | undefined;
      if (shiftData.assigned_guard_id) {
        const { data: guardProfile } = await this.supabase
          .from('guard_profiles')
          .select('first_name, last_name')
          .eq('id', shiftData.assigned_guard_id)
          .single();

        if (guardProfile) {
          guardName = `${guardProfile.first_name} ${guardProfile.last_name}`;
        }
      }

      // Create archive record
      const archiveData = {
        original_shift_data: shiftData,
        shift_id: shiftId,
        archived_by: archivedBy,
        archive_reason: reason,
        completion_metrics: calculatedMetrics,
        client_name: clientName,
        site_name: siteName,
        guard_name: guardName,
        shift_date: shiftDate.toISOString().split('T')[0],
        shift_duration_hours: shiftDurationHours
      };

      const { data: archiveRecord, error: archiveError } = await this.supabase
        .from('shift_archive')
        .insert(archiveData)
        .select()
        .single();

      if (archiveError) {
        throw archiveError;
      }

      // Update original shift status to archived
      await this.supabase
        .from('shifts')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', shiftId);

      // Record workflow transition
      await this.supabase
        .from('shift_workflow_history')
        .insert({
          shift_id: shiftId,
          previous_status: shiftData.status,
          new_status: 'archived',
          transition_reason: `Archived: ${reason}`,
          changed_by: archivedBy,
          kanban_column_changed: true,
          transition_method: 'manual'
        });

      const archive: ShiftArchive = {
        id: archiveRecord.id,
        originalShiftData: archiveRecord.original_shift_data,
        shiftId: archiveRecord.shift_id,
        archivedAt: new Date(archiveRecord.archived_at),
        archivedBy: archiveRecord.archived_by,
        archiveReason: archiveRecord.archive_reason,
        completionMetrics: archiveRecord.completion_metrics,
        clientSatisfactionScore: archiveRecord.client_satisfaction_score,
        clientName: archiveRecord.client_name,
        siteName: archiveRecord.site_name,
        guardName: archiveRecord.guard_name,
        shiftDate: new Date(archiveRecord.shift_date),
        shiftDurationHours: parseFloat(archiveRecord.shift_duration_hours),
        createdAt: new Date(archiveRecord.created_at),
        updatedAt: new Date(archiveRecord.updated_at)
      };

      return {
        success: true,
        data: archive
      };
    } catch (error) {
      console.error('Error archiving shift:', error);
      return {
        success: false,
        error: {
          code: 'ARCHIVE_ERROR',
          message: 'Failed to archive shift',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Search archived shifts with advanced filtering
   */
  static async searchArchivedShifts(
    query: ArchiveSearchQuery
  ): Promise<ServiceResult<ArchiveSearchResult>> {
    try {
      let baseQuery = this.supabase.from('shift_archive').select('*');

      // Apply filters
      if (query.keywords?.length) {
        const keywordFilter = query.keywords
          .map(keyword => `client_name.ilike.%${keyword}%,site_name.ilike.%${keyword}%,guard_name.ilike.%${keyword}%`)
          .join(',');
        baseQuery = baseQuery.or(keywordFilter);
      }

      if (query.clientNames?.length) {
        baseQuery = baseQuery.in('client_name', query.clientNames);
      }

      if (query.guardNames?.length) {
        baseQuery = baseQuery.in('guard_name', query.guardNames);
      }

      if (query.siteNames?.length) {
        baseQuery = baseQuery.in('site_name', query.siteNames);
      }

      if (query.dateRange) {
        baseQuery = baseQuery
          .gte('shift_date', query.dateRange.start.toISOString().split('T')[0])
          .lte('shift_date', query.dateRange.end.toISOString().split('T')[0]);
      }

      if (query.archiveReasons?.length) {
        baseQuery = baseQuery.in('archive_reason', query.archiveReasons);
      }

      if (query.satisfactionRange) {
        baseQuery = baseQuery
          .gte('client_satisfaction_score', query.satisfactionRange.min)
          .lte('client_satisfaction_score', query.satisfactionRange.max);
      }

      if (query.revenueRange) {
        baseQuery = baseQuery
          .gte('completion_metrics->revenueGenerated', query.revenueRange.min)
          .lte('completion_metrics->revenueGenerated', query.revenueRange.max);
      }

      if (query.hasIncidents !== undefined) {
        if (query.hasIncidents) {
          baseQuery = baseQuery.gt('completion_metrics->incidentReports', 0);
        } else {
          baseQuery = baseQuery.eq('completion_metrics->incidentReports', 0);
        }
      }

      // Apply sorting
      if (query.sortBy) {
        const ascending = query.sortOrder === 'asc';
        switch (query.sortBy) {
          case 'date':
            baseQuery = baseQuery.order('shift_date', { ascending });
            break;
          case 'revenue':
            baseQuery = baseQuery.order('completion_metrics->revenueGenerated', { ascending });
            break;
          case 'satisfaction':
            baseQuery = baseQuery.order('client_satisfaction_score', { ascending, nullsLast: true });
            break;
          case 'duration':
            baseQuery = baseQuery.order('shift_duration_hours', { ascending });
            break;
          default:
            baseQuery = baseQuery.order('archived_at', { ascending: false });
        }
      } else {
        baseQuery = baseQuery.order('archived_at', { ascending: false });
      }

      // Get total count for pagination
      const { count } = await this.supabase
        .from('shift_archive')
        .select('*', { count: 'exact', head: true });

      // Apply pagination
      if (query.limit) {
        baseQuery = baseQuery.limit(query.limit);
      }
      if (query.offset) {
        baseQuery = baseQuery.range(query.offset, (query.offset + (query.limit || 50)) - 1);
      }

      const { data: results, error } = await baseQuery;

      if (error) {
        throw error;
      }

      // Calculate aggregations
      const totalRevenue = results.reduce((sum, archive) => 
        sum + (archive.completion_metrics?.revenueGenerated || 0), 0);
      const totalHours = results.reduce((sum, archive) => 
        sum + parseFloat(archive.shift_duration_hours || 0), 0);
      const satisfactionScores = results
        .filter(archive => archive.client_satisfaction_score)
        .map(archive => archive.client_satisfaction_score);
      const averageSatisfaction = satisfactionScores.length > 0 
        ? satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length 
        : 0;

      // Calculate facets
      const clientCounts = results.reduce((acc, archive) => {
        acc[archive.client_name] = (acc[archive.client_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const archives: ShiftArchive[] = results.map(item => ({
        id: item.id,
        originalShiftData: item.original_shift_data,
        shiftId: item.shift_id,
        archivedAt: new Date(item.archived_at),
        archivedBy: item.archived_by,
        archiveReason: item.archive_reason,
        completionMetrics: item.completion_metrics,
        clientSatisfactionScore: item.client_satisfaction_score,
        clientName: item.client_name,
        siteName: item.site_name,
        guardName: item.guard_name,
        shiftDate: new Date(item.shift_date),
        shiftDurationHours: parseFloat(item.shift_duration_hours),
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));

      return {
        success: true,
        data: {
          totalCount: count || 0,
          results: archives,
          aggregations: {
            totalRevenue,
            totalHours,
            averageSatisfaction,
            clientCounts
          },
          facets: {
            clients: Object.entries(clientCounts).map(([name, count]) => ({ name, count })),
            guards: [], // Would be calculated similarly
            reasons: [] // Would be calculated similarly
          }
        }
      };
    } catch (error) {
      console.error('Error searching archived shifts:', error);
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to search archived shifts',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Get archive metrics and statistics
   */
  static async getArchiveMetrics(
    period?: { start: Date; end: Date }
  ): Promise<ServiceResult<ArchiveMetrics>> {
    try {
      let query = this.supabase.from('shift_archive').select('*');

      if (period) {
        query = query
          .gte('archived_at', period.start.toISOString())
          .lte('archived_at', period.end.toISOString());
      }

      const { data: archives, error } = await query;

      if (error) {
        throw error;
      }

      // Calculate basic metrics
      const totalArchivedShifts = archives.length;

      const archivesByReason = archives.reduce((acc, archive) => {
        acc[archive.archive_reason] = (acc[archive.archive_reason] || 0) + 1;
        return acc;
      }, {} as Record<ArchiveReason, number>);

      // Group by month for trends
      const archivesByMonth = archives.reduce((acc, archive) => {
        const month = new Date(archive.archived_at).toISOString().slice(0, 7);
        if (!acc[month]) {
          acc[month] = { count: 0, revenue: 0 };
        }
        acc[month].count++;
        acc[month].revenue += archive.completion_metrics?.revenueGenerated || 0;
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>);

      const archivesByMonthArray = Object.entries(archivesByMonth)
        .map(([month, data]) => ({ month, count: data.count, revenue: data.revenue }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Performance metrics
      const validShifts = archives.filter(a => a.shift_duration_hours > 0);
      const averageShiftDuration = validShifts.length > 0 
        ? validShifts.reduce((sum, a) => sum + a.shift_duration_hours, 0) / validShifts.length 
        : 0;

      const shiftsWithRevenue = archives.filter(a => a.completion_metrics?.revenueGenerated > 0);
      const averageRevenue = shiftsWithRevenue.length > 0
        ? shiftsWithRevenue.reduce((sum, a) => sum + (a.completion_metrics?.revenueGenerated || 0), 0) / shiftsWithRevenue.length
        : 0;

      const shiftsWithSatisfaction = archives.filter(a => a.client_satisfaction_score > 0);
      const averageClientSatisfaction = shiftsWithSatisfaction.length > 0
        ? shiftsWithSatisfaction.reduce((sum, a) => sum + (a.client_satisfaction_score || 0), 0) / shiftsWithSatisfaction.length
        : 0;

      // Completion rate by month
      const completionRateByMonth = archivesByMonthArray.map(item => ({
        month: item.month,
        rate: 100 // Placeholder - would calculate based on total shifts vs completed
      }));

      // Storage metrics (estimated)
      const totalStorageUsed = archives.length * 50000; // Rough estimate in bytes
      const oldestArchive = archives.length > 0 
        ? new Date(Math.min(...archives.map(a => new Date(a.archived_at).getTime())))
        : new Date();
      const newestArchive = archives.length > 0
        ? new Date(Math.max(...archives.map(a => new Date(a.archived_at).getTime())))
        : new Date();

      const metrics: ArchiveMetrics = {
        totalArchivedShifts,
        archivesByReason,
        archivesByMonth: archivesByMonthArray,
        averageShiftDuration,
        averageRevenue,
        averageClientSatisfaction,
        completionRateByMonth,
        totalStorageUsed,
        oldestArchive,
        newestArchive,
        compressionRatio: 0.3 // Estimated compression ratio
      };

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      console.error('Error getting archive metrics:', error);
      return {
        success: false,
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to calculate archive metrics',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Get archived shift by ID
   */
  static async getArchivedShift(archiveId: string): Promise<ServiceResult<ShiftArchive>> {
    try {
      const { data, error } = await this.supabase
        .from('shift_archive')
        .select('*')
        .eq('id', archiveId)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: {
            code: 'ARCHIVE_NOT_FOUND',
            message: 'Archived shift not found'
          }
        };
      }

      const archive: ShiftArchive = {
        id: data.id,
        originalShiftData: data.original_shift_data,
        shiftId: data.shift_id,
        archivedAt: new Date(data.archived_at),
        archivedBy: data.archived_by,
        archiveReason: data.archive_reason,
        completionMetrics: data.completion_metrics,
        clientSatisfactionScore: data.client_satisfaction_score,
        clientName: data.client_name,
        siteName: data.site_name,
        guardName: data.guard_name,
        shiftDate: new Date(data.shift_date),
        shiftDurationHours: parseFloat(data.shift_duration_hours),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      return {
        success: true,
        data: archive
      };
    } catch (error) {
      console.error('Error getting archived shift:', error);
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to retrieve archived shift',
          details: { error: String(error) }
        }
      };
    }
  }

  /**
   * Calculate completion metrics for a shift
   */
  private static async calculateCompletionMetrics(shiftData: any): Promise<ShiftCompletionMetrics> {
    const timeRange = shiftData.time_range;
    const scheduledStart = new Date(timeRange.split(',')[0].replace('[', '').replace('"', ''));
    const scheduledEnd = new Date(timeRange.split(',')[1].replace(']', '').replace('"', ''));
    const totalDurationHours = (scheduledEnd.getTime() - scheduledStart.getTime()) / (1000 * 60 * 60);

    // Calculate assignment metrics from workflow history
    const workflowHistory = shiftData.shift_workflow_history || [];
    const createdAt = new Date(shiftData.created_at);
    
    let timeToAssignment: number | undefined;
    let timeToConfirmation: number | undefined;
    let assignmentChanges = 0;

    for (const transition of workflowHistory) {
      const transitionTime = new Date(transition.changed_at);
      
      if (transition.new_status === 'assigned' && !timeToAssignment) {
        timeToAssignment = (transitionTime.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      }
      
      if (transition.new_status === 'confirmed' && !timeToConfirmation) {
        timeToConfirmation = (transitionTime.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      }
      
      if (transition.new_status === 'assigned') {
        assignmentChanges++;
      }
    }

    // Extract financial information
    const rateInfo = shiftData.rate_information || {};
    const clientBilledAmount = rateInfo.clientRate * totalDurationHours || 0;
    const guardPayoutAmount = rateInfo.guardRate * totalDurationHours || 0;
    const revenueGenerated = clientBilledAmount;
    const profitMargin = clientBilledAmount > 0 ? ((clientBilledAmount - guardPayoutAmount) / clientBilledAmount) * 100 : 0;

    return {
      scheduledStart,
      scheduledEnd,
      totalDurationHours,
      onTimeStart: true, // Would be calculated from actual check-in data
      onTimeEnd: true,   // Would be calculated from actual check-out data
      timeToAssignment,
      timeToConfirmation,
      assignmentChanges: Math.max(0, assignmentChanges - 1), // Subtract initial assignment
      incidentReports: 0, // Would be populated from incident tracking
      escalationsRequired: 0,
      revenueGenerated,
      profitMargin,
      guardPayoutAmount,
      clientBilledAmount,
      issuesLogged: [] // Would be populated from issue tracking system
    };
  }

  /**
   * Auto-archive completed shifts (batch operation)
   */
  static async autoArchiveCompletedShifts(
    olderThanDays = 7
  ): Promise<ServiceResult<{ archivedCount: number; errors: string[] }>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Get completed shifts ready for archival
      const { data: shiftsToArchive, error } = await this.supabase
        .from('shifts')
        .select('id, created_at')
        .eq('status', 'completed')
        .lt('updated_at', cutoffDate.toISOString())
        .limit(100); // Process in batches

      if (error) {
        throw error;
      }

      const results = {
        archivedCount: 0,
        errors: [] as string[]
      };

      for (const shift of shiftsToArchive) {
        const archiveResult = await this.archiveShift(
          shift.id, 
          'system', // System user for auto-archival
          'completed'
        );

        if (archiveResult.success) {
          results.archivedCount++;
        } else {
          results.errors.push(`Failed to archive shift ${shift.id}: ${archiveResult.error?.message}`);
        }
      }

      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error('Error in auto-archive process:', error);
      return {
        success: false,
        error: {
          code: 'AUTO_ARCHIVE_ERROR',
          message: 'Failed to auto-archive completed shifts',
          details: { error: String(error) }
        }
      };
    }
  }
}