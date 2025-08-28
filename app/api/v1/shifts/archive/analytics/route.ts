// Story 3.4: Archive Analytics API Endpoint
// Provides historical analytics and metrics for archived shifts

import { NextRequest, NextResponse } from 'next/server';
import { ShiftArchiveService } from '@/lib/services/shift-archive-service';
import type { ArchiveApiResponse } from '@/lib/types/archive-types';

// GET /api/v1/shifts/archive/analytics - Get archive metrics and analytics
export async function GET(request: NextRequest) {
  try {
    const managerId = request.headers.get('x-manager-id');
    
    if (!managerId) {
      return NextResponse.json<ArchiveApiResponse>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Manager authentication required'
        }
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse period filter
    let period: { start: Date; end: Date } | undefined;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    if (startDate && endDate) {
      period = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
      
      // Validate date range
      if (period.start >= period.end) {
        return NextResponse.json<ArchiveApiResponse>({
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'Start date must be before end date'
          }
        }, { status: 400 });
      }
      
      // Limit to reasonable time ranges (max 2 years)
      const maxRange = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
      if (period.end.getTime() - period.start.getTime() > maxRange) {
        return NextResponse.json<ArchiveApiResponse>({
          success: false,
          error: {
            code: 'DATE_RANGE_TOO_LARGE',
            message: 'Date range cannot exceed 2 years'
          }
        }, { status: 400 });
      }
    }

    // Get archive metrics
    const metricsResult = await ShiftArchiveService.getArchiveMetrics(period);

    if (!metricsResult.success) {
      return NextResponse.json<ArchiveApiResponse>({
        success: false,
        error: metricsResult.error
      }, { status: 500 });
    }

    const metrics = metricsResult.data;

    // Calculate additional insights
    const insights = {
      // Performance insights
      topPerformingReason: Object.entries(metrics?.archivesByReason || {})
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
      
      // Trend analysis
      recentTrend: analyzeRecentTrend(metrics?.archivesByMonth || []),
      
      // Efficiency metrics
      averageRevenuePerHour: metrics?.averageRevenue && metrics?.averageShiftDuration 
        ? metrics.averageRevenue / metrics.averageShiftDuration 
        : 0,
      
      // Quality indicators
      satisfactionTrend: metrics?.averageClientSatisfaction > 4 ? 'excellent' :
                        metrics?.averageClientSatisfaction > 3.5 ? 'good' :
                        metrics?.averageClientSatisfaction > 2.5 ? 'fair' : 'needs improvement',
      
      // Storage efficiency
      storageEfficiency: {
        totalStorageUsed: metrics?.totalStorageUsed || 0,
        averagePerShift: metrics?.totalArchivedShifts 
          ? (metrics.totalStorageUsed || 0) / metrics.totalArchivedShifts 
          : 0,
        compressionSavings: metrics?.totalStorageUsed && metrics?.compressionRatio
          ? (metrics.totalStorageUsed / (1 - metrics.compressionRatio)) - metrics.totalStorageUsed
          : 0
      }
    };

    // Generate recommendations
    const recommendations = generateRecommendations(metrics, insights);

    return NextResponse.json<ArchiveApiResponse>({
      success: true,
      data: {
        metrics,
        insights,
        recommendations,
        period: period ? {
          start: period.start.toISOString(),
          end: period.end.toISOString(),
          durationDays: Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24))
        } : null
      },
      metadata: {
        timestamp: new Date().toISOString(),
        calculatedFor: managerId,
        dataPoints: metrics?.totalArchivedShifts || 0
      }
    });

  } catch (error) {
    console.error('Archive analytics GET error:', error);
    return NextResponse.json<ArchiveApiResponse>({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve archive analytics',
        details: { error: String(error) }
      }
    }, { status: 500 });
  }
}

/**
 * Analyze recent trend in archive data
 */
function analyzeRecentTrend(archivesByMonth: Array<{ month: string; count: number; revenue: number }>): string {
  if (!archivesByMonth || archivesByMonth.length < 2) {
    return 'insufficient-data';
  }

  const recent = archivesByMonth.slice(-3); // Last 3 months
  const counts = recent.map(m => m.count);
  
  if (counts.length < 2) {
    return 'stable';
  }

  const firstHalf = counts.slice(0, Math.ceil(counts.length / 2));
  const secondHalf = counts.slice(Math.floor(counts.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (changePercent > 20) return 'increasing';
  if (changePercent < -20) return 'decreasing';
  return 'stable';
}

/**
 * Generate actionable recommendations based on metrics
 */
function generateRecommendations(metrics: any, insights: any): string[] {
  const recommendations: string[] = [];

  // Performance recommendations
  if (metrics?.averageClientSatisfaction < 4.0) {
    recommendations.push('Consider implementing quality improvement measures - client satisfaction is below target (4.0)');
  }

  if (insights?.averageRevenuePerHour < 50) {
    recommendations.push('Explore opportunities to optimize pricing or reduce operational costs');
  }

  // Operational recommendations
  const noShowRate = (metrics?.archivesByReason?.no_show || 0) / (metrics?.totalArchivedShifts || 1) * 100;
  if (noShowRate > 5) {
    recommendations.push('High no-show rate detected - consider implementing guard reliability scoring and early warning systems');
  }

  const cancellationRate = (metrics?.archivesByReason?.cancelled || 0) / (metrics?.totalArchivedShifts || 1) * 100;
  if (cancellationRate > 15) {
    recommendations.push('High cancellation rate - review client communication and shift confirmation processes');
  }

  // Trend recommendations
  if (insights?.recentTrend === 'decreasing') {
    recommendations.push('Declining shift volume detected - consider business development initiatives or client retention strategies');
  } else if (insights?.recentTrend === 'increasing') {
    recommendations.push('Growth in shift volume - ensure adequate guard capacity and consider scaling operations');
  }

  // Data management recommendations
  if (metrics?.totalArchivedShifts > 10000) {
    recommendations.push('Consider implementing automated data archival policies to manage storage costs');
  }

  if (insights?.storageEfficiency?.compressionSavings > 100000) {
    recommendations.push('Archive compression is effective - continue current data management practices');
  }

  // Default recommendation if none generated
  if (recommendations.length === 0) {
    recommendations.push('Operations are performing well - maintain current practices and continue monitoring key metrics');
  }

  return recommendations;
}