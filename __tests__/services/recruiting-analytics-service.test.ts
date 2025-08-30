import {
  getRecruitingFunnelAnalytics,
  getOptimizationRecommendations,
  exportRecruitingAnalytics
} from '@/lib/services/recruiting-analytics-service'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}))

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis()
}

;(createClient as jest.Mock).mockReturnValue(mockSupabase)

describe('RecruitingAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getRecruitingFunnelAnalytics', () => {
    it('should return comprehensive funnel analytics', async () => {
      // Mock guard leads data
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            id: '1',
            source: 'job_board',
            status: 'hired',
            qualificationScore: 85,
            createdAt: '2024-01-01T00:00:00Z',
            firstContactAt: '2024-01-01T12:00:00Z',
            applicationSubmittedAt: '2024-01-02T00:00:00Z',
            interviewScheduledAt: '2024-01-05T00:00:00Z',
            offerMadeAt: '2024-01-10T00:00:00Z',
            hiredAt: '2024-01-15T00:00:00Z'
          },
          {
            id: '2',
            source: 'referral',
            status: 'qualified',
            qualificationScore: 75,
            createdAt: '2024-01-01T00:00:00Z',
            firstContactAt: '2024-01-01T14:00:00Z',
            applicationSubmittedAt: '2024-01-03T00:00:00Z'
          },
          {
            id: '3',
            source: 'job_board',
            status: 'disqualified',
            qualificationScore: 45,
            createdAt: '2024-01-01T00:00:00Z',
            firstContactAt: '2024-01-02T00:00:00Z'
          }
        ],
        error: null
      })

      const result = await getRecruitingFunnelAnalytics()

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        overview: {
          totalLeads: 3,
          qualifiedLeads: 2,
          hiredGuards: 1,
          averageQualificationScore: expect.any(Number)
        },
        funnelStages: expect.arrayContaining([
          expect.objectContaining({
            stage: 'lead_created',
            count: 3
          }),
          expect.objectContaining({
            stage: 'first_contact',
            count: 3
          }),
          expect.objectContaining({
            stage: 'application_submitted',
            count: 2
          })
        ])
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('guard_leads')
      expect(mockSupabase.select).toHaveBeenCalled()
    })

    it('should apply date range filters correctly', async () => {
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null })

      const filters = {
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31'
        }
      }

      await getRecruitingFunnelAnalytics(filters)

      expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', '2024-01-01')
      expect(mockSupabase.lte).toHaveBeenCalledWith('created_at', '2024-01-31')
    })

    it('should apply source filters correctly', async () => {
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null })

      const filters = {
        sources: ['job_board', 'referral']
      }

      await getRecruitingFunnelAnalytics(filters)

      expect(mockSupabase.in).toHaveBeenCalledWith('source', ['job_board', 'referral'])
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection error' }
      })

      const result = await getRecruitingFunnelAnalytics()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch recruiting analytics')
    })

    it('should calculate conversion rates accurately', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          { status: 'new', createdAt: '2024-01-01' },
          { status: 'contacted', createdAt: '2024-01-01', firstContactAt: '2024-01-01' },
          { status: 'qualified', createdAt: '2024-01-01', firstContactAt: '2024-01-01', applicationSubmittedAt: '2024-01-02' },
          { status: 'hired', createdAt: '2024-01-01', firstContactAt: '2024-01-01', applicationSubmittedAt: '2024-01-02', hiredAt: '2024-01-15' }
        ],
        error: null
      })

      const result = await getRecruitingFunnelAnalytics()

      expect(result.success).toBe(true)
      expect(result.data?.funnelStages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            stage: 'lead_created',
            count: 4,
            conversionRate: 100
          }),
          expect.objectContaining({
            stage: 'first_contact',
            count: 3,
            conversionRate: 75
          }),
          expect.objectContaining({
            stage: 'application_submitted',
            count: 2,
            conversionRate: 50
          }),
          expect.objectContaining({
            stage: 'hired',
            count: 1,
            conversionRate: 25
          })
        ])
      )
    })
  })

  describe('getOptimizationRecommendations', () => {
    it('should generate optimization recommendations', async () => {
      // Mock analytics data
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            source: 'job_board',
            status: 'hired',
            qualificationScore: 85,
            createdAt: '2024-01-01',
            firstContactAt: '2024-01-02',
            applicationSubmittedAt: '2024-01-03',
            hiredAt: '2024-01-15'
          },
          {
            source: 'referral',
            status: 'disqualified',
            qualificationScore: 45,
            createdAt: '2024-01-01',
            firstContactAt: '2024-01-05'
          }
        ],
        error: null
      })

      // Mock campaigns data
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            id: '1',
            name: 'Job Board Campaign',
            source: 'job_board',
            budget: 1000,
            leadsGenerated: 50,
            conversions: 5
          }
        ],
        error: null
      })

      const result = await getOptimizationRecommendations()

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        sourceRecommendations: expect.arrayContaining([
          expect.objectContaining({
            source: expect.any(String),
            recommendation: expect.any(String),
            priority: expect.any(String),
            metrics: expect.any(Object)
          })
        ]),
        processRecommendations: expect.arrayContaining([
          expect.objectContaining({
            area: expect.any(String),
            recommendation: expect.any(String),
            priority: expect.any(String),
            expectedImpact: expect.any(String)
          })
        ]),
        timeToContactRecommendations: expect.any(Object)
      })
    })

    it('should identify slow response time issues', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            source: 'job_board',
            createdAt: '2024-01-01T00:00:00Z',
            firstContactAt: '2024-01-05T00:00:00Z', // 4+ days delay
            status: 'contacted'
          }
        ],
        error: null
      })

      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null })

      const result = await getOptimizationRecommendations()

      expect(result.success).toBe(true)
      expect(result.data?.processRecommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            area: 'response_time',
            priority: 'high',
            recommendation: expect.stringContaining('response time')
          })
        ])
      )
    })

    it('should recommend budget reallocation for underperforming sources', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          { source: 'job_board', status: 'disqualified', qualificationScore: 30 },
          { source: 'referral', status: 'hired', qualificationScore: 90 }
        ],
        error: null
      })

      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            source: 'job_board',
            budget: 1000,
            leadsGenerated: 10,
            conversions: 1
          },
          {
            source: 'referral',
            budget: 200,
            leadsGenerated: 5,
            conversions: 3
          }
        ],
        error: null
      })

      const result = await getOptimizationRecommendations()

      expect(result.success).toBe(true)
      expect(result.data?.sourceRecommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source: 'referral',
            recommendation: expect.stringContaining('increase budget'),
            priority: 'high'
          })
        ])
      )
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      })

      const result = await getOptimizationRecommendations()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to generate optimization recommendations')
    })
  })

  describe('exportRecruitingAnalytics', () => {
    it('should export analytics data in CSV format', async () => {
      const mockData = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          source: 'job_board',
          status: 'hired',
          qualificationScore: 85,
          createdAt: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null
      })

      const result = await exportRecruitingAnalytics(undefined, 'csv')

      expect(result.success).toBe(true)
      expect(result.data?.filename).toMatch(/recruiting-analytics-.*\.csv/)
      expect(result.data?.data).toContain('id,firstName,lastName')
      expect(result.data?.data).toContain('1,John,Doe')
    })

    it('should export analytics data in JSON format', async () => {
      const mockData = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          source: 'job_board',
          status: 'hired'
        }
      ]

      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null
      })

      const result = await exportRecruitingAnalytics(undefined, 'json')

      expect(result.success).toBe(true)
      expect(result.data?.filename).toMatch(/recruiting-analytics-.*\.json/)
      
      const parsedData = JSON.parse(result.data!.data)
      expect(parsedData).toEqual(mockData)
    })

    it('should apply filters to export data', async () => {
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null })

      const filters = {
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31'
        },
        sources: ['job_board']
      }

      await exportRecruitingAnalytics(filters, 'csv')

      expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', '2024-01-01')
      expect(mockSupabase.lte).toHaveBeenCalledWith('created_at', '2024-01-31')
      expect(mockSupabase.in).toHaveBeenCalledWith('source', ['job_board'])
    })

    it('should handle empty data gracefully', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await exportRecruitingAnalytics(undefined, 'csv')

      expect(result.success).toBe(true)
      expect(result.data?.data).toBe('No data available for export')
    })

    it('should handle database errors during export', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Export failed' }
      })

      const result = await exportRecruitingAnalytics(undefined, 'csv')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to export recruiting analytics')
    })

    it('should generate proper CSV headers', async () => {
      const mockData = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          source: 'job_board',
          status: 'hired',
          qualificationScore: 85,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z'
        }
      ]

      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null
      })

      const result = await exportRecruitingAnalytics(undefined, 'csv')

      expect(result.success).toBe(true)
      const csvLines = result.data!.data.split('\n')
      const headers = csvLines[0]
      
      expect(headers).toContain('id')
      expect(headers).toContain('firstName')
      expect(headers).toContain('lastName')
      expect(headers).toContain('email')
      expect(headers).toContain('phone')
      expect(headers).toContain('source')
      expect(headers).toContain('status')
      expect(headers).toContain('qualificationScore')
      expect(headers).toContain('createdAt')
      expect(headers).toContain('updatedAt')
    })

    it('should handle special characters in CSV data', async () => {
      const mockData = [
        {
          id: '1',
          firstName: 'John "Johnny"',
          lastName: 'O\'Connor',
          email: 'john,test@example.com'
        }
      ]

      mockSupabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null
      })

      const result = await exportRecruitingAnalytics(undefined, 'csv')

      expect(result.success).toBe(true)
      expect(result.data?.data).toContain('"John ""Johnny"""')
      expect(result.data?.data).toContain('O\'Connor')
      expect(result.data?.data).toContain('"john,test@example.com"')
    })
  })
})