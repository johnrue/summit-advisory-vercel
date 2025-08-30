import {
  createRecruitingCampaign,
  updateCampaignStatus,
  generateCampaignQRCode,
  trackCampaignVisit,
  getCampaignPerformance,
  getActiveCampaigns,
  createLandingPage,
  updateLandingPageContent
} from '@/lib/services/recruiting-campaign-service'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}))

// Mock QRCode library
jest.mock('qrcode', () => ({
  toDataURL: jest.fn()
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
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis()
}

;(createClient as jest.Mock).mockReturnValue(mockSupabase)

const QRCode = require('qrcode')

describe('RecruitingCampaignService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createRecruitingCampaign', () => {
    it('should create a new recruiting campaign', async () => {
      const campaignData = {
        name: 'Houston Security Guard Drive',
        description: 'Recruiting campaign for Houston market',
        type: 'job_board' as const,
        budget: 5000,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        targetAudience: {
          ageRange: { min: 21, max: 65 },
          experience: 'entry_level' as const,
          location: 'Houston, TX',
          keywords: ['security', 'guard', 'protection']
        },
        channels: ['indeed', 'linkedin'],
        goals: {
          leadsTarget: 100,
          conversionsTarget: 10,
          costPerLead: 50
        }
      }

      mockSupabase.insert.mockResolvedValueOnce({
        data: {
          id: 'campaign-1',
          ...campaignData,
          status: 'draft',
          createdAt: '2024-01-01T00:00:00Z'
        },
        error: null
      })

      const result = await createRecruitingCampaign(campaignData)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'campaign-1',
        name: 'Houston Security Guard Drive',
        type: 'job_board',
        status: 'draft',
        budget: 5000
      })

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        name: campaignData.name,
        description: campaignData.description,
        type: campaignData.type,
        status: 'draft',
        budget: campaignData.budget,
        start_date: campaignData.startDate,
        end_date: campaignData.endDate,
        target_audience: campaignData.targetAudience,
        channels: campaignData.channels,
        goals: campaignData.goals,
        created_at: expect.any(String)
      })
    })

    it('should handle campaign creation failures', async () => {
      const campaignData = {
        name: 'Test Campaign',
        description: 'Test',
        type: 'social_media' as const,
        budget: 1000,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        targetAudience: {
          ageRange: { min: 18, max: 65 },
          experience: 'experienced' as const,
          location: 'Dallas, TX',
          keywords: ['security']
        },
        channels: ['facebook'],
        goals: {
          leadsTarget: 50,
          conversionsTarget: 5,
          costPerLead: 20
        }
      }

      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' }
      })

      const result = await createRecruitingCampaign(campaignData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create recruiting campaign')
    })
  })

  describe('updateCampaignStatus', () => {
    it('should update campaign status', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        name: 'Test Campaign',
        status: 'active',
        updatedAt: '2024-01-02T00:00:00Z'
      }

      mockSupabase.update.mockResolvedValueOnce({
        data: mockCampaign,
        error: null
      })

      const result = await updateCampaignStatus('campaign-1', 'active')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockCampaign)
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'active',
        updated_at: expect.any(String)
      })
    })

    it('should handle status update failures', async () => {
      mockSupabase.update.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' }
      })

      const result = await updateCampaignStatus('campaign-1', 'paused')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update campaign status')
    })

    it('should handle campaign activation with budget validation', async () => {
      mockSupabase.update.mockResolvedValueOnce({
        data: {
          id: 'campaign-1',
          status: 'active',
          budget: 5000,
          goals: { leadsTarget: 100 }
        },
        error: null
      })

      const result = await updateCampaignStatus('campaign-1', 'active')

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('active')
    })
  })

  describe('generateCampaignQRCode', () => {
    it('should generate QR code for campaign', async () => {
      // Mock campaign lookup
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: 'campaign-1',
          name: 'Test Campaign',
          status: 'active'
        },
        error: null
      })

      // Mock QR code generation
      ;(QRCode.toDataURL as jest.Mock).mockResolvedValueOnce('data:image/png;base64,mockqrcode')

      const result = await generateCampaignQRCode('campaign-1')

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        qrCodeUrl: 'data:image/png;base64,mockqrcode',
        trackingUrl: expect.stringContaining('campaign=campaign-1'),
        campaignId: 'campaign-1'
      })

      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        expect.stringContaining('campaign=campaign-1'),
        expect.any(Object)
      )
    })

    it('should handle non-existent campaign', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await generateCampaignQRCode('invalid-campaign')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Campaign not found')
    })

    it('should handle QR code generation failures', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: { id: 'campaign-1', name: 'Test Campaign' },
        error: null
      })

      ;(QRCode.toDataURL as jest.Mock).mockRejectedValueOnce(new Error('QR generation failed'))

      const result = await generateCampaignQRCode('campaign-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to generate QR code')
    })

    it('should include custom parameters in QR code URL', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: { id: 'campaign-1', name: 'Test Campaign' },
        error: null
      })

      ;(QRCode.toDataURL as jest.Mock).mockResolvedValueOnce('data:image/png;base64,mockqrcode')

      const customParams = {
        source: 'flyer',
        location: 'houston'
      }

      const result = await generateCampaignQRCode('campaign-1', customParams)

      expect(result.success).toBe(true)
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        expect.stringContaining('source=flyer'),
        expect.any(Object)
      )
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        expect.stringContaining('location=houston'),
        expect.any(Object)
      )
    })
  })

  describe('trackCampaignVisit', () => {
    it('should track campaign visit', async () => {
      const visitData = {
        campaignId: 'campaign-1',
        source: 'qr_code',
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1',
        referrer: 'https://example.com'
      }

      mockSupabase.insert.mockResolvedValueOnce({
        data: {
          id: 'visit-1',
          ...visitData,
          timestamp: '2024-01-01T12:00:00Z'
        },
        error: null
      })

      const result = await trackCampaignVisit(visitData)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'visit-1',
        campaignId: 'campaign-1',
        source: 'qr_code'
      })

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        campaign_id: visitData.campaignId,
        source: visitData.source,
        user_agent: visitData.userAgent,
        ip_address: visitData.ipAddress,
        referrer: visitData.referrer,
        timestamp: expect.any(String)
      })
    })

    it('should handle visit tracking failures', async () => {
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' }
      })

      const visitData = {
        campaignId: 'campaign-1',
        source: 'direct'
      }

      const result = await trackCampaignVisit(visitData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to track campaign visit')
    })
  })

  describe('getCampaignPerformance', () => {
    it('should return comprehensive campaign performance metrics', async () => {
      // Mock campaign data
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: 'campaign-1',
          name: 'Test Campaign',
          budget: 5000,
          goals: {
            leadsTarget: 100,
            conversionsTarget: 10,
            costPerLead: 50
          }
        },
        error: null
      })

      // Mock visits data
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          { id: '1', source: 'qr_code', timestamp: '2024-01-01' },
          { id: '2', source: 'qr_code', timestamp: '2024-01-02' },
          { id: '3', source: 'direct', timestamp: '2024-01-03' }
        ],
        error: null
      })

      // Mock leads data
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          { id: 'lead-1', campaignId: 'campaign-1', status: 'new' },
          { id: 'lead-2', campaignId: 'campaign-1', status: 'qualified' },
          { id: 'lead-3', campaignId: 'campaign-1', status: 'hired' }
        ],
        error: null
      })

      const result = await getCampaignPerformance('campaign-1')

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        campaign: {
          id: 'campaign-1',
          name: 'Test Campaign'
        },
        metrics: {
          totalVisits: 3,
          totalLeads: 3,
          conversions: 1,
          conversionRate: expect.any(Number),
          costPerLead: expect.any(Number)
        },
        sourceBreakdown: expect.arrayContaining([
          expect.objectContaining({
            source: 'qr_code',
            visits: 2
          }),
          expect.objectContaining({
            source: 'direct',
            visits: 1
          })
        ])
      })
    })

    it('should handle non-existent campaign', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await getCampaignPerformance('invalid-campaign')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Campaign not found')
    })

    it('should calculate ROI when applicable', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: {
          id: 'campaign-1',
          budget: 2000,
          goals: { costPerLead: 40 }
        },
        error: null
      })

      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null })

      mockSupabase.select.mockResolvedValueOnce({
        data: [
          { status: 'hired', estimatedValue: 5000 },
          { status: 'hired', estimatedValue: 7000 }
        ],
        error: null
      })

      const result = await getCampaignPerformance('campaign-1')

      expect(result.success).toBe(true)
      expect(result.data?.metrics.roi).toBeDefined()
      expect(result.data?.metrics.totalRevenue).toBe(12000)
    })

    it('should handle database errors', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      })

      const result = await getCampaignPerformance('campaign-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch campaign performance')
    })
  })

  describe('getActiveCampaigns', () => {
    it('should return active campaigns', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          name: 'Houston Drive',
          status: 'active',
          budget: 5000
        },
        {
          id: 'campaign-2',
          name: 'Dallas Expansion',
          status: 'active',
          budget: 3000
        }
      ]

      mockSupabase.select.mockResolvedValueOnce({
        data: mockCampaigns,
        error: null
      })

      const result = await getActiveCampaigns()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockCampaigns)
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active')
    })

    it('should handle empty active campaigns', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await getActiveCampaigns()

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('should handle database errors', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Query failed' }
      })

      const result = await getActiveCampaigns()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch active campaigns')
    })
  })

  describe('createLandingPage', () => {
    it('should create landing page for campaign', async () => {
      const landingPageData = {
        campaignId: 'campaign-1',
        title: 'Join Our Security Team',
        headline: 'Protect What Matters Most',
        subheadline: 'Start your career in professional security services',
        heroImage: 'https://example.com/hero.jpg',
        ctaText: 'Apply Now',
        ctaColor: '#007bff',
        sections: [
          {
            type: 'benefits' as const,
            title: 'Why Choose Us',
            content: 'Competitive pay, flexible schedules, comprehensive training'
          }
        ],
        customCss: '.hero { background: linear-gradient(...) }',
        trackingPixels: ['facebook', 'google'],
        seoSettings: {
          metaDescription: 'Join our security team',
          keywords: ['security', 'jobs', 'houston']
        }
      }

      mockSupabase.insert.mockResolvedValueOnce({
        data: {
          id: 'page-1',
          ...landingPageData,
          slug: 'join-our-security-team',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z'
        },
        error: null
      })

      const result = await createLandingPage(landingPageData)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'page-1',
        campaignId: 'campaign-1',
        title: 'Join Our Security Team',
        slug: 'join-our-security-team',
        isActive: true
      })
    })

    it('should generate URL-friendly slug from title', async () => {
      const landingPageData = {
        campaignId: 'campaign-1',
        title: 'Security Guards Needed - Houston Area!',
        headline: 'Join Us',
        subheadline: 'Great opportunity',
        ctaText: 'Apply',
        sections: []
      }

      mockSupabase.insert.mockResolvedValueOnce({
        data: {
          ...landingPageData,
          slug: 'security-guards-needed-houston-area'
        },
        error: null
      })

      const result = await createLandingPage(landingPageData)

      expect(result.success).toBe(true)
      expect(result.data?.slug).toBe('security-guards-needed-houston-area')
    })

    it('should handle landing page creation failures', async () => {
      mockSupabase.insert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' }
      })

      const landingPageData = {
        campaignId: 'campaign-1',
        title: 'Test Page',
        headline: 'Test',
        subheadline: 'Test',
        ctaText: 'Test',
        sections: []
      }

      const result = await createLandingPage(landingPageData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create landing page')
    })
  })

  describe('updateLandingPageContent', () => {
    it('should update landing page content', async () => {
      const updates = {
        headline: 'Updated Headline',
        subheadline: 'Updated Subheadline',
        ctaText: 'Join Today',
        sections: [
          {
            type: 'testimonials' as const,
            title: 'Success Stories',
            content: 'Hear from our team members'
          }
        ]
      }

      mockSupabase.update.mockResolvedValueOnce({
        data: {
          id: 'page-1',
          ...updates,
          updatedAt: '2024-01-02T00:00:00Z'
        },
        error: null
      })

      const result = await updateLandingPageContent('page-1', updates)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'page-1',
        headline: 'Updated Headline',
        ctaText: 'Join Today'
      })

      expect(mockSupabase.update).toHaveBeenCalledWith({
        headline: updates.headline,
        subheadline: updates.subheadline,
        cta_text: updates.ctaText,
        sections: updates.sections,
        updated_at: expect.any(String)
      })
    })

    it('should handle partial content updates', async () => {
      const updates = {
        headline: 'New Headline Only'
      }

      mockSupabase.update.mockResolvedValueOnce({
        data: {
          id: 'page-1',
          headline: 'New Headline Only'
        },
        error: null
      })

      const result = await updateLandingPageContent('page-1', updates)

      expect(result.success).toBe(true)
      expect(result.data?.headline).toBe('New Headline Only')
    })

    it('should handle update failures', async () => {
      mockSupabase.update.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' }
      })

      const result = await updateLandingPageContent('page-1', { headline: 'Test' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update landing page content')
    })
  })
})