// Recruiting Campaigns API - Campaign management and performance tracking
// Handles CRUD operations, QR code generation, and analytics

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createRecruitingCampaign,
  getCampaigns,
  updateCampaignStatus,
  generateCampaignQRCode,
  getCampaignPerformance
} from '@/lib/services/recruiting-campaign-service'

// Validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string(),
  campaignType: z.enum([
    'digital_advertising',
    'social_media',
    'job_board',
    'referral_program',
    'career_fair',
    'content_marketing',
    'email_marketing',
    'print_advertising',
    'radio_advertising',
    'event_marketing',
    'partnership',
    'cold_outreach'
  ]),
  targetPositions: z.array(z.string()),
  targetLocations: z.array(z.string()),
  budgetAllocated: z.number().min(0),
  budgetSpent: z.number().min(0).default(0),
  expectedLeads: z.number().min(0),
  expectedHires: z.number().min(0),
  landingPageConfig: z.object({
    templateId: z.string(),
    headline: z.string(),
    subheadline: z.string(),
    heroImage: z.string().optional(),
    callToAction: z.string(),
    benefits: z.array(z.string()),
    testimonials: z.array(z.object({
      name: z.string(),
      role: z.string(),
      quote: z.string(),
      image: z.string().optional()
    })),
    customSections: z.array(z.object({
      title: z.string(),
      content: z.string(),
      position: z.number()
    })),
    theme: z.enum(['professional', 'modern', 'minimal', 'bold']),
    primaryColor: z.string(),
    secondaryColor: z.string()
  }).optional(),
  formVariants: z.array(z.object({
    name: z.string(),
    description: z.string(),
    fields: z.array(z.object({
      id: z.string(),
      name: z.string(),
      label: z.string(),
      type: z.enum(['text', 'email', 'phone', 'select', 'multiselect', 'textarea', 'checkbox', 'radio', 'file']),
      required: z.boolean(),
      placeholder: z.string().optional(),
      options: z.array(z.string()).optional(),
      validation: z.object({
        pattern: z.string().optional(),
        minLength: z.number().optional(),
        maxLength: z.number().optional(),
        min: z.number().optional(),
        max: z.number().optional()
      }).optional(),
      order: z.number(),
      helpText: z.string().optional()
    })),
    layout: z.enum(['single_column', 'two_column', 'progressive']),
    submitButtonText: z.string(),
    submitButtonColor: z.string(),
    trafficPercentage: z.number().min(0).max(100),
    isActive: z.boolean()
  })).default([]),
  emailSequences: z.array(z.any()).default([]),
  utmParameters: z.object({
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_term: z.string().optional(),
    utm_content: z.string().optional()
  }),
  startDate: z.string(),
  endDate: z.string().optional(),
  createdBy: z.string(),
  managedBy: z.array(z.string()),
  status: z.enum(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled']).default('draft')
})

const updateCampaignSchema = z.object({
  status: z.enum(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled']),
  impressions: z.number().min(0).optional(),
  clicks: z.number().min(0).optional(),
  budgetSpent: z.number().min(0).optional()
})

const qrCodeSchema = z.object({
  name: z.string().min(1, 'QR code name is required'),
  description: z.string(),
  url: z.string().url('Valid URL is required'),
  size: z.number().min(50).max(1000).default(200),
  format: z.enum(['PNG', 'SVG', 'PDF']).default('PNG'),
  logoUrl: z.string().url().optional(),
  foregroundColor: z.string().regex(/^#[0-9A-F]{6}$/i).default('#000000'),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i).default('#FFFFFF'),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).default('M'),
  printMaterials: z.array(z.string()).default([]),
  distributionDate: z.string().optional(),
  distributionNotes: z.string().optional()
})

const filtersSchema = z.object({
  status: z.array(z.enum(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'])).optional(),
  type: z.array(z.enum([
    'digital_advertising',
    'social_media',
    'job_board',
    'referral_program',
    'career_fair',
    'content_marketing',
    'email_marketing',
    'print_advertising',
    'radio_advertising',
    'event_marketing',
    'partnership',
    'cold_outreach'
  ])).optional(),
  managerId: z.string().optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional()
})

/**
 * GET /api/v1/recruiting/campaigns - Get all campaigns with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const rawFilters = {
      status: searchParams.get('status')?.split(','),
      type: searchParams.get('type')?.split(','),
      managerId: searchParams.get('managerId'),
      dateRange: searchParams.get('startDate') && searchParams.get('endDate') ? {
        start: searchParams.get('startDate')!,
        end: searchParams.get('endDate')!
      } : undefined
    }

    // Remove undefined values
    const filters = Object.fromEntries(
      Object.entries(rawFilters).filter(([_, value]) => value !== undefined && value !== null)
    )

    // Validate filters
    const validationResult = filtersSchema.safeParse(filters)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid filter parameters',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    // Get campaigns
    const result = await getCampaigns(validationResult.data)
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.data?.length || 0
    })
  } catch (error) {
    console.error('Error in GET /api/v1/recruiting/campaigns:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * POST /api/v1/recruiting/campaigns - Create new campaign
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validationResult = createCampaignSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid campaign data',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    // Create campaign
    const result = await createRecruitingCampaign(validationResult.data)
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Campaign created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/v1/recruiting/campaigns:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/v1/recruiting/campaigns - Update campaign status and metrics
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('id')
    
    if (!campaignId) {
      return NextResponse.json({
        success: false,
        error: 'Campaign ID is required'
      }, { status: 400 })
    }

    const body = await request.json()
    
    // Validate request body
    const validationResult = updateCampaignSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid update data',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { status, ...metrics } = validationResult.data

    // Update campaign
    const result = await updateCampaignStatus(campaignId, status, metrics)
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Campaign updated successfully'
    })
  } catch (error) {
    console.error('Error in PATCH /api/v1/recruiting/campaigns:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}