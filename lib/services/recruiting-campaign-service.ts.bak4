// Recruiting Campaign Service - Campaign and landing page management
// Handles dynamic campaign creation, QR code generation, and performance tracking

import { supabase } from '@/lib/supabase'
import type { 
  RecruitingCampaign,
  CampaignType,
  CampaignStatus,
  LandingPageConfig,
  FormVariant,
  EmailSequence,
  QRCodeGeneration,
  UTMParameters,
  ApiResponse
} from '@/lib/types'

/**
 * Create new recruiting campaign
 */
export async function createRecruitingCampaign(
  campaignData: Omit<RecruitingCampaign, 'id' | 'created_at' | 'updated_at' | 'impressions' | 'clicks' | 'leads' | 'applications' | 'hires' | 'costPerLead' | 'costPerHire' | 'conversionRate' | 'activeTests' | 'qrCodes'>
): Promise<ApiResponse<RecruitingCampaign>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create landing page configuration if not provided
    let landingPageConfig = campaignData.landingPageConfig
    if (!landingPageConfig.id) {
      const landingPageResponse = await createDefaultLandingPage(campaignId, campaignData.name)
      if (!landingPageResponse.success || !landingPageResponse.data) {
        return { success: false, error: 'Failed to create landing page' }
      }
      landingPageConfig = landingPageResponse.data
    }

    const campaign: RecruitingCampaign = {
      id: campaignId,
      ...campaignData,
      landingPageConfig: landingPageConfig,
      formVariants: campaignData.formVariants.length > 0 ? campaignData.formVariants : [await createDefaultFormVariant(campaignId)],
      emailSequences: campaignData.emailSequences.length > 0 ? campaignData.emailSequences : [],
      qrCodes: [],
      impressions: 0,
      clicks: 0,
      leads: 0,
      applications: 0,
      hires: 0,
      costPerLead: 0,
      costPerHire: 0,
      conversionRate: 0,
      activeTests: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Store campaign in database
    const { data: createdCampaign, error } = await supabase
      .from('recruiting_campaigns')
      .insert({
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        campaign_type: campaign.campaignType,
        status: campaign.status,
        target_positions: campaign.targetPositions,
        target_locations: campaign.targetLocations,
        budget_allocated: campaign.budgetAllocated,
        budget_spent: campaign.budgetSpent,
        expected_leads: campaign.expectedLeads,
        expected_hires: campaign.expectedHires,
        landing_page_config: campaign.landingPageConfig,
        form_variants: campaign.formVariants,
        email_sequences: campaign.emailSequences,
        tracking_pixel_id: campaign.trackingPixelId,
        utm_parameters: campaign.utmParameters,
        qr_codes: campaign.qrCodes,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        leads: campaign.leads,
        applications: campaign.applications,
        hires: campaign.hires,
        cost_per_lead: campaign.costPerLead,
        cost_per_hire: campaign.costPerHire,
        conversion_rate: campaign.conversionRate,
        active_tests: campaign.activeTests,
        start_date: campaign.startDate,
        end_date: campaign.endDate,
        created_by: campaign.createdBy,
        managed_by: campaign.managedBy,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: createdCampaign }
  } catch (error) {
    console.error('Error creating recruiting campaign:', error)
    return { success: false, error: 'Failed to create recruiting campaign' }
  }
}

/**
 * Update campaign status and metrics
 */
export async function updateCampaignStatus(
  campaignId: string,
  status: CampaignStatus,
  metrics?: {
    impressions?: number
    clicks?: number
    budgetSpent?: number
  }
): Promise<ApiResponse<RecruitingCampaign>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Build update object
    const updates: any = {
      status: status,
      updated_at: new Date().toISOString()
    }

    if (metrics) {
      if (metrics.impressions !== undefined) updates.impressions = metrics.impressions
      if (metrics.clicks !== undefined) updates.clicks = metrics.clicks
      if (metrics.budgetSpent !== undefined) updates.budget_spent = metrics.budgetSpent
    }

    // Handle status-specific updates
    if (status === 'active' && !updates.start_date) {
      updates.start_date = new Date().toISOString()
    } else if (['completed', 'cancelled'].includes(status)) {
      updates.end_date = new Date().toISOString()
    } else if (status === 'paused') {
      updates.paused_at = new Date().toISOString()
    }

    const { data: updatedCampaign, error } = await supabase
      .from('recruiting_campaigns')
      .update(updates)
      .eq('id', campaignId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Update calculated metrics
    const metricsResponse = await recalculateCampaignMetrics(campaignId)
    if (metricsResponse.success && metricsResponse.data) {
      return { success: true, data: metricsResponse.data }
    }

    return { success: true, data: updatedCampaign }
  } catch (error) {
    console.error('Error updating campaign status:', error)
    return { success: false, error: 'Failed to update campaign status' }
  }
}

/**
 * Generate QR code for campaign
 */
export async function generateCampaignQRCode(
  campaignId: string,
  qrData: Omit<QRCodeGeneration, 'id' | 'campaignId' | 'created_at' | 'updated_at' | 'scans' | 'uniqueScans' | 'scanLocations'>
): Promise<ApiResponse<QRCodeGeneration>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Get campaign to validate
    const { data: campaign, error: campaignError } = await supabase
      .from('recruiting_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return { success: false, error: 'Campaign not found' }
    }

    const qrCodeId = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Build QR code URL with campaign tracking
    const baseUrl = qrData.url
    const urlParams = new URLSearchParams({
      campaign: campaignId,
      source: 'qr_code',
      qr_id: qrCodeId,
      utm_source: campaign.utm_parameters?.utm_source || 'qr',
      utm_medium: campaign.utm_parameters?.utm_medium || 'offline',
      utm_campaign: campaign.utm_parameters?.utm_campaign || campaign.name
    })

    const trackingUrl = `${baseUrl}?${urlParams.toString()}`

    const qrCode: QRCodeGeneration = {
      id: qrCodeId,
      campaignId: campaignId,
      name: qrData.name,
      description: qrData.description,
      url: trackingUrl,
      size: qrData.size || 200,
      format: qrData.format || 'PNG',
      logoUrl: qrData.logoUrl,
      foregroundColor: qrData.foregroundColor || '#000000',
      backgroundColor: qrData.backgroundColor || '#FFFFFF',
      errorCorrectionLevel: qrData.errorCorrectionLevel || 'M',
      scans: 0,
      uniqueScans: 0,
      scanLocations: [],
      printMaterials: qrData.printMaterials || [],
      distributionDate: qrData.distributionDate,
      distributionNotes: qrData.distributionNotes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Update campaign with new QR code
    const updatedQRCodes = [...(campaign.qr_codes || []), qrCode]
    
    const { error: updateError } = await supabase
      .from('recruiting_campaigns')
      .update({
        qr_codes: updatedQRCodes,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, data: qrCode }
  } catch (error) {
    console.error('Error generating campaign QR code:', error)
    return { success: false, error: 'Failed to generate campaign QR code' }
  }
}

/**
 * Track QR code scan
 */
export async function trackQRCodeScan(
  qrCodeId: string,
  scanData: {
    userAgent?: string
    ipAddress?: string
    latitude?: number
    longitude?: number
  }
): Promise<ApiResponse<void>> {
  try {
    // Find campaign with this QR code
    const { data: campaigns, error: campaignError } = await supabase
      .from('recruiting_campaigns')
      .select('*')

    if (campaignError || !campaigns) {
      return { success: false, error: 'Failed to find campaign' }
    }

    let targetCampaign = null
    let qrCode = null

    for (const campaign of campaigns) {
      const foundQR = campaign.qr_codes?.find((qr: any) => qr.id === qrCodeId)
      if (foundQR) {
        targetCampaign = campaign
        qrCode = foundQR
        break
      }
    }

    if (!targetCampaign || !qrCode) {
      return { success: false, error: 'QR code not found' }
    }

    // Update QR code scan metrics
    const updatedQRCodes = targetCampaign.qr_codes.map((qr: any) => {
      if (qr.id === qrCodeId) {
        const updatedScans = (qr.scans || 0) + 1
        const updatedLocations = [...(qr.scanLocations || [])]
        
        if (scanData.latitude && scanData.longitude) {
          const existingLocation = updatedLocations.find(
            loc => Math.abs(loc.lat - scanData.latitude!) < 0.01 && 
                   Math.abs(loc.lng - scanData.longitude!) < 0.01
          )
          
          if (existingLocation) {
            existingLocation.count++
          } else {
            updatedLocations.push({
              lat: scanData.latitude,
              lng: scanData.longitude,
              count: 1
            })
          }
        }

        return {
          ...qr,
          scans: updatedScans,
          uniqueScans: updatedScans, // Simplified - would need visitor tracking for true unique scans
          scanLocations: updatedLocations,
          updated_at: new Date().toISOString()
        }
      }
      return qr
    })

    // Update campaign
    const { error: updateError } = await supabase
      .from('recruiting_campaigns')
      .update({
        qr_codes: updatedQRCodes,
        clicks: (targetCampaign.clicks || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetCampaign.id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Log the scan event
    const { error: logError } = await supabase
      .from('campaign_events')
      .insert({
        campaign_id: targetCampaign.id,
        event_type: 'qr_scan',
        event_data: {
          qr_code_id: qrCodeId,
          user_agent: scanData.userAgent,
          ip_address: scanData.ipAddress,
          location: scanData.latitude && scanData.longitude 
            ? { lat: scanData.latitude, lng: scanData.longitude }
            : null
        },
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Error logging QR scan event:', logError)
    }

    return { success: true }
  } catch (error) {
    console.error('Error tracking QR code scan:', error)
    return { success: false, error: 'Failed to track QR code scan' }
  }
}

/**
 * Create landing page variant
 */
export async function createLandingPageVariant(
  campaignId: string,
  variantData: Omit<LandingPageConfig, 'id' | 'created_at' | 'updated_at' | 'publishedUrl' | 'isPublished'>
): Promise<ApiResponse<LandingPageConfig>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const variantId = `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const landingPage: LandingPageConfig = {
      id: variantId,
      templateId: variantData.templateId,
      headline: variantData.headline,
      subheadline: variantData.subheadline,
      heroImage: variantData.heroImage,
      callToAction: variantData.callToAction,
      benefits: variantData.benefits,
      testimonials: variantData.testimonials,
      customSections: variantData.customSections,
      theme: variantData.theme,
      primaryColor: variantData.primaryColor,
      secondaryColor: variantData.secondaryColor,
      publishedUrl: '',
      isPublished: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Generate landing page URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://summitadvisoryfirm.com'
    landingPage.publishedUrl = `${baseUrl}/careers/${campaignId}/${variantId}`

    // Update campaign with new landing page variant
    const { data: campaign, error: campaignError } = await supabase
      .from('recruiting_campaigns')
      .select('landing_page_config')
      .eq('id', campaignId)
      .single()

    if (campaignError) {
      return { success: false, error: 'Campaign not found' }
    }

    const { error: updateError } = await supabase
      .from('recruiting_campaigns')
      .update({
        landing_page_config: landingPage,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, data: landingPage }
  } catch (error) {
    console.error('Error creating landing page variant:', error)
    return { success: false, error: 'Failed to create landing page variant' }
  }
}

/**
 * Add form variant to campaign
 */
export async function addFormVariant(
  campaignId: string,
  formVariantData: Omit<FormVariant, 'id' | 'campaignId' | 'created_at' | 'views' | 'submissions' | 'conversionRate'>
): Promise<ApiResponse<FormVariant>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const variantId = `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const formVariant: FormVariant = {
      id: variantId,
      campaignId: campaignId,
      name: formVariantData.name,
      description: formVariantData.description,
      fields: formVariantData.fields,
      layout: formVariantData.layout,
      submitButtonText: formVariantData.submitButtonText,
      submitButtonColor: formVariantData.submitButtonColor,
      trafficPercentage: formVariantData.trafficPercentage,
      isActive: formVariantData.isActive,
      views: 0,
      submissions: 0,
      conversionRate: 0,
      created_at: new Date().toISOString()
    }

    // Get current campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('recruiting_campaigns')
      .select('form_variants')
      .eq('id', campaignId)
      .single()

    if (campaignError) {
      return { success: false, error: 'Campaign not found' }
    }

    // Add new form variant
    const updatedFormVariants = [...(campaign.form_variants || []), formVariant]

    // Validate traffic percentages don't exceed 100%
    const totalTraffic = updatedFormVariants.reduce((sum, variant) => sum + variant.trafficPercentage, 0)
    if (totalTraffic > 100) {
      return { success: false, error: 'Total traffic percentage cannot exceed 100%' }
    }

    const { error: updateError } = await supabase
      .from('recruiting_campaigns')
      .update({
        form_variants: updatedFormVariants,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, data: formVariant }
  } catch (error) {
    console.error('Error adding form variant:', error)
    return { success: false, error: 'Failed to add form variant' }
  }
}

/**
 * Get campaign performance analytics
 */
export async function getCampaignPerformance(
  campaignId: string,
  dateRange?: { start: string; end: string }
): Promise<ApiResponse<{
  overview: {
    impressions: number
    clicks: number
    leads: number
    applications: number
    hires: number
    clickThroughRate: number
    conversionRate: number
    costPerLead: number
    costPerHire: number
    roi: number
  }
  dailyMetrics: Array<{
    date: string
    impressions: number
    clicks: number
    leads: number
    spend: number
  }>
  sourceBreakdown: Array<{
    source: string
    leads: number
    conversions: number
    cost: number
  }>
  qrPerformance: Array<{
    qrId: string
    name: string
    scans: number
    leads: number
    locations: Array<{ lat: number; lng: number; count: number }>
  }>
}>> {
  try {
    // Get campaign data
    const { data: campaign, error: campaignError } = await supabase
      .from('recruiting_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return { success: false, error: 'Campaign not found' }
    }

    // Calculate overview metrics
    const clickThroughRate = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0
    const conversionRate = campaign.clicks > 0 ? (campaign.leads / campaign.clicks) * 100 : 0
    const costPerLead = campaign.leads > 0 ? campaign.budget_spent / campaign.leads : 0
    const costPerHire = campaign.hires > 0 ? campaign.budget_spent / campaign.hires : 0
    
    // Simple ROI calculation (assuming $35k avg salary, 10% commission)
    const revenue = campaign.hires * 35000 * 0.1
    const roi = campaign.budget_spent > 0 ? ((revenue - campaign.budget_spent) / campaign.budget_spent) * 100 : 0

    // Get daily metrics (simplified - in production would come from events table)
    const dailyMetrics = await generateDailyMetrics(campaignId, dateRange)

    // Get source breakdown from leads
    const sourceBreakdown = await getCampaignSourceBreakdown(campaignId, dateRange)

    // Get QR code performance
    const qrPerformance = (campaign.qr_codes || []).map((qr: any) => ({
      qrId: qr.id,
      name: qr.name,
      scans: qr.scans || 0,
      leads: 0, // Would need to track leads from QR scans
      locations: qr.scanLocations || []
    }))

    const performance = {
      overview: {
        impressions: campaign.impressions || 0,
        clicks: campaign.clicks || 0,
        leads: campaign.leads || 0,
        applications: campaign.applications || 0,
        hires: campaign.hires || 0,
        clickThroughRate: clickThroughRate,
        conversionRate: conversionRate,
        costPerLead: costPerLead,
        costPerHire: costPerHire,
        roi: roi
      },
      dailyMetrics: dailyMetrics,
      sourceBreakdown: sourceBreakdown,
      qrPerformance: qrPerformance
    }

    return { success: true, data: performance }
  } catch (error) {
    console.error('Error getting campaign performance:', error)
    return { success: false, error: 'Failed to get campaign performance' }
  }
}

/**
 * Get all campaigns with filtering
 */
export async function getCampaigns(
  filters?: {
    status?: CampaignStatus[]
    type?: CampaignType[]
    managerId?: string
    dateRange?: { start: string; end: string }
  }
): Promise<ApiResponse<RecruitingCampaign[]>> {
  try {
    let query = supabase
      .from('recruiting_campaigns')
      .select('*')

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }

    if (filters?.type && filters.type.length > 0) {
      query = query.in('campaign_type', filters.type)
    }

    if (filters?.managerId) {
      query = query.contains('managed_by', [filters.managerId])
    }

    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', `${filters.dateRange.end}T23:59:59.999Z`)
    }

    query = query.order('created_at', { ascending: false })

    const { data: campaigns, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: campaigns || [] }
  } catch (error) {
    console.error('Error getting campaigns:', error)
    return { success: false, error: 'Failed to get campaigns' }
  }
}

// Helper functions

/**
 * Create default landing page for campaign
 */
async function createDefaultLandingPage(
  campaignId: string,
  campaignName: string
): Promise<ApiResponse<LandingPageConfig>> {
  const defaultLandingPage: LandingPageConfig = {
    id: `lp_${campaignId}_default`,
    templateId: 'default_security_template',
    headline: 'Join Summit Advisory - Leading Security Services',
    subheadline: 'Build a rewarding career in professional security services',
    heroImage: '/images/security-hero.jpg',
    callToAction: 'Apply Now',
    benefits: [
      'Competitive pay and benefits',
      'Professional training and certification',
      'Flexible scheduling options',
      'Career advancement opportunities'
    ],
    testimonials: [
      {
        name: 'John Martinez',
        role: 'Security Officer',
        quote: 'Summit Advisory has provided me with excellent training and support throughout my career.',
        image: '/images/testimonial-1.jpg'
      }
    ],
    customSections: [
      {
        title: 'Why Choose Summit Advisory',
        content: 'We are a leading security services company with a commitment to excellence and professional development.',
        position: 1
      }
    ],
    theme: 'professional',
    primaryColor: '#1B365D',
    secondaryColor: '#D4AF37',
    publishedUrl: '',
    isPublished: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return { success: true, data: defaultLandingPage }
}

/**
 * Create default form variant
 */
async function createDefaultFormVariant(campaignId: string): Promise<FormVariant> {
  return {
    id: `form_${campaignId}_default`,
    campaignId: campaignId,
    name: 'Default Application Form',
    description: 'Standard guard application form',
    fields: [
      {
        id: 'firstName',
        name: 'firstName',
        label: 'First Name',
        type: 'text',
        required: true,
        placeholder: 'Enter your first name',
        order: 1
      },
      {
        id: 'lastName',
        name: 'lastName',
        label: 'Last Name',
        type: 'text',
        required: true,
        placeholder: 'Enter your last name',
        order: 2
      },
      {
        id: 'email',
        name: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'Enter your email address',
        order: 3
      },
      {
        id: 'phone',
        name: 'phone',
        label: 'Phone Number',
        type: 'phone',
        required: true,
        placeholder: 'Enter your phone number',
        order: 4
      },
      {
        id: 'positionType',
        name: 'positionType',
        label: 'Position Interest',
        type: 'select',
        required: true,
        options: ['Armed Security', 'Unarmed Security', 'Both'],
        order: 5
      },
      {
        id: 'hasExperience',
        name: 'hasExperience',
        label: 'Do you have security experience?',
        type: 'radio',
        required: true,
        options: ['Yes', 'No'],
        order: 6
      }
    ],
    layout: 'single_column',
    submitButtonText: 'Submit Application',
    submitButtonColor: '#D4AF37',
    trafficPercentage: 100,
    isActive: true,
    views: 0,
    submissions: 0,
    conversionRate: 0,
    created_at: new Date().toISOString()
  }
}

/**
 * Recalculate campaign metrics from leads data
 */
async function recalculateCampaignMetrics(campaignId: string): Promise<ApiResponse<RecruitingCampaign>> {
  try {
    // Get leads for this campaign
    const { data: leads, error: leadsError } = await supabase
      .from('guard_leads')
      .select('application_status, converted_to_hire')
      .eq('campaign_id', campaignId)

    if (leadsError) {
      return { success: false, error: leadsError.message }
    }

    const totalLeads = leads?.length || 0
    const applications = leads?.filter(lead => 
      ['application_submitted', 'under_review', 'background_check', 'interview_scheduled',
       'interview_completed', 'reference_check', 'offer_extended', 'offer_accepted', 
       'hire_completed'].includes(lead.application_status)
    ).length || 0
    
    const hires = leads?.filter(lead => lead.converted_to_hire).length || 0

    // Update campaign with calculated metrics
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('recruiting_campaigns')
      .update({
        leads: totalLeads,
        applications: applications,
        hires: hires,
        conversion_rate: totalLeads > 0 ? (hires / totalLeads) * 100 : 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, data: updatedCampaign }
  } catch (error) {
    console.error('Error recalculating campaign metrics:', error)
    return { success: false, error: 'Failed to recalculate campaign metrics' }
  }
}

/**
 * Generate daily metrics for campaign (simplified)
 */
async function generateDailyMetrics(
  campaignId: string,
  dateRange?: { start: string; end: string }
): Promise<Array<{
  date: string
  impressions: number
  clicks: number
  leads: number
  spend: number
}>> {
  // In a real implementation, this would query a campaign_events table
  // For now, return simulated daily data
  const days = []
  const startDate = dateRange ? new Date(dateRange.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const endDate = dateRange ? new Date(dateRange.end) : new Date()

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    days.push({
      date: d.toISOString().split('T')[0],
      impressions: Math.floor(Math.random() * 500) + 100,
      clicks: Math.floor(Math.random() * 50) + 5,
      leads: Math.floor(Math.random() * 10) + 1,
      spend: Math.floor(Math.random() * 200) + 50
    })
  }

  return days
}

/**
 * Get source breakdown for campaign
 */
async function getCampaignSourceBreakdown(
  campaignId: string,
  dateRange?: { start: string; end: string }
): Promise<Array<{
  source: string
  leads: number
  conversions: number
  cost: number
}>> {
  try {
    let query = supabase
      .from('guard_leads')
      .select('source_type, converted_to_hire')
      .eq('campaign_id', campaignId)

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start)
        .lte('created_at', `${dateRange.end}T23:59:59.999Z`)
    }

    const { data: leads, error } = await query

    if (error || !leads) {
      return []
    }

    // Group by source
    const sourceGroups: Record<string, { leads: number; conversions: number }> = {}
    
    leads.forEach(lead => {
      const source = lead.source_type || 'unknown'
      if (!sourceGroups[source]) {
        sourceGroups[source] = { leads: 0, conversions: 0 }
      }
      
      sourceGroups[source].leads++
      if (lead.converted_to_hire) {
        sourceGroups[source].conversions++
      }
    })

    // Convert to array with estimated costs
    return Object.entries(sourceGroups).map(([source, data]) => ({
      source: source,
      leads: data.leads,
      conversions: data.conversions,
      cost: data.leads * 25 // Simplified cost estimation
    }))
  } catch (error) {
    console.error('Error getting campaign source breakdown:', error)
    return []
  }
}