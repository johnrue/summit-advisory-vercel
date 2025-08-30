import {
  calculateLeadScore,
  batchScoreLeads,
  getPrioritizedLeads,
  updateScoringConfig,
  analyzeScoringAccuracy,
  getDefaultScoringConfig
} from '@/lib/services/guard-lead-scoring-service'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })
    }
  }
}))

describe('Guard Lead Scoring Service', () => {
  const mockGuardLead = {
    id: 'lead-123',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@email.com',
    phone: '555-0123',
    sourceType: 'direct_website',
    sourceDetails: { platform: 'website' },
    applicationStatus: 'lead_captured',
    qualificationScore: 0,
    qualificationFactors: {},
    applicationCompletionProbability: 0,
    hasSecurityExperience: true,
    yearsExperience: 3,
    hasLicense: true,
    licenseNumber: 'TX123456',
    backgroundCheckEligible: true,
    certifications: ['CPR', 'First Aid'],
    availability: {
      fullTime: true,
      partTime: false,
      weekdays: true,
      weekends: true,
      nights: false,
      holidays: true,
      overtime: true,
      hoursPerWeek: 40
    },
    preferredShifts: ['day', 'evening'],
    preferredLocations: ['Houston', 'Dallas'],
    transportationAvailable: true,
    willingToRelocate: false,
    salaryExpectations: 40000,
    status: 'new',
    convertedToHire: false,
    created_at: '2025-08-30T12:00:00Z',
    updated_at: '2025-08-30T12:00:00Z'
  }

  const mockScoringConfig = {
    id: 'config-123',
    name: 'Default Guard Lead Scoring',
    description: 'Default scoring configuration',
    version: 1,
    qualification_threshold: 60,
    high_priority_threshold: 80,
    accuracy: 75,
    is_active: true,
    factors: [
      {
        id: 'factor-1',
        name: 'Security Experience',
        description: 'Previous security work experience',
        category: 'experience',
        weight: 0.25,
        scoringRules: [
          {
            id: 'rule-1',
            condition: '{">=": ["yearsExperience", 3]}',
            points: 20,
            description: '3+ years experience'
          },
          {
            id: 'rule-2',
            condition: '{"==": ["hasSecurityExperience", true]}',
            points: 10,
            description: 'Has security experience'
          }
        ],
        is_active: true
      },
      {
        id: 'factor-2',
        name: 'Location Flexibility',
        description: 'Geographic availability and transportation',
        category: 'location',
        weight: 0.20,
        scoringRules: [
          {
            id: 'rule-3',
            condition: '{"==": ["hasTransportation", true]}',
            points: 15,
            description: 'Has reliable transportation'
          }
        ],
        is_active: true
      }
    ],
    created_at: '2025-08-30T12:00:00Z',
    updated_at: '2025-08-30T12:00:00Z'
  }

  const mockLeadScoreCalculation = {
    leadId: 'lead-123',
    totalScore: 45,
    maxPossibleScore: 65,
    normalizedScore: 69.2,
    factorScores: [
      {
        factorId: 'factor-1',
        factorName: 'Security Experience',
        score: 30,
        maxScore: 30,
        appliedRules: [
          {
            ruleId: 'rule-1',
            points: 20,
            reason: '3+ years experience'
          },
          {
            ruleId: 'rule-2',
            points: 10,
            reason: 'Has security experience'
          }
        ]
      },
      {
        factorId: 'factor-2',
        factorName: 'Location Flexibility',
        score: 15,
        maxScore: 15,
        appliedRules: [
          {
            ruleId: 'rule-3',
            points: 15,
            reason: 'Has reliable transportation'
          }
        ]
      }
    ],
    isQualified: true,
    priority: 'medium',
    applicationProbability: 0.7,
    hireProbability: 0.45,
    calculatedAt: '2025-08-30T12:00:00Z',
    configVersion: 1
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('calculateLeadScore', () => {
    it('should calculate lead score successfully', async () => {
      const { supabase } = require('@/lib/supabase')

      // Mock guard lead fetch
      supabase.from.mockImplementation((table: string) => {
        if (table === 'guard_leads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockGuardLead,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'lead_scoring_configs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockScoringConfig,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'lead_score_calculations') {
          return {
            upsert: jest.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'guard_leads' && arguments.length > 1) {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          }
        }
        return {}
      })

      const result = await calculateLeadScore('lead-123')

      expect(result.success).toBe(true)
      expect(result.data?.leadId).toBe('lead-123')
      expect(result.data?.isQualified).toBe(true)
      expect(result.data?.normalizedScore).toBeGreaterThan(0)
      expect(result.data?.factorScores).toHaveLength(2)
    })

    it('should handle lead not found', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Lead not found' }
            })
          })
        })
      })

      const result = await calculateLeadScore('nonexistent-lead')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Lead not found')
    })

    it('should handle scoring config not found', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockImplementation((table: string) => {
        if (table === 'guard_leads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockGuardLead,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'lead_scoring_configs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Config not found' }
                  })
                })
              })
            })
          }
        }
        return {}
      })

      const result = await calculateLeadScore('lead-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Scoring configuration not found')
    })
  })

  describe('batchScoreLeads', () => {
    it('should batch score multiple leads', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockImplementation((table: string) => {
        if (table === 'guard_leads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockGuardLead,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'lead_scoring_configs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockScoringConfig,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'lead_score_calculations') {
          return {
            upsert: jest.fn().mockResolvedValue({ error: null })
          }
        }
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        }
      })

      const leadIds = ['lead-123', 'lead-456', 'lead-789']
      const result = await batchScoreLeads(leadIds)

      expect(result.success).toBe(true)
      expect(result.data?.length).toBe(3)
    })

    it('should handle partial failures in batch scoring', async () => {
      const { supabase } = require('@/lib/supabase')
      let callCount = 0

      supabase.from.mockImplementation((table: string) => {
        if (table === 'guard_leads') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockImplementation(() => {
                  callCount++
                  if (callCount === 2) {
                    return Promise.resolve({
                      data: null,
                      error: { message: 'Lead not found' }
                    })
                  }
                  return Promise.resolve({
                    data: mockGuardLead,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'lead_scoring_configs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockScoringConfig,
                    error: null
                  })
                })
              })
            })
          }
        }
        return {
          upsert: jest.fn().mockResolvedValue({ error: null }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        }
      })

      const leadIds = ['lead-123', 'lead-456', 'lead-789']
      const result = await batchScoreLeads(leadIds)

      expect(result.success).toBe(true)
      expect(result.data?.length).toBe(2) // Only 2 successful scores
      expect(result.message).toContain('1 errors')
    })
  })

  describe('getPrioritizedLeads', () => {
    it('should get prioritized leads successfully', async () => {
      const { supabase } = require('@/lib/supabase')

      const mockPrioritizedLeads = [
        {
          ...mockGuardLead,
          qualification_score: 85,
          score_calculations: [{ calculation_data: mockLeadScoreCalculation }]
        },
        {
          ...mockGuardLead,
          id: 'lead-456',
          qualification_score: 70,
          score_calculations: [{ calculation_data: { ...mockLeadScoreCalculation, leadId: 'lead-456' } }]
        }
      ]

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: mockPrioritizedLeads,
                  error: null
                })
              })
            })
          })
        })
      })

      const result = await getPrioritizedLeads('recruiter-123', ['new', 'contacted'], 10)

      expect(result.success).toBe(true)
      expect(result.data?.length).toBe(2)
      expect(result.data?.[0].qualification_score).toBe(85)
      expect(result.data?.[0].scoreCalculation).toBeDefined()
    })

    it('should handle no results', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      })

      const result = await getPrioritizedLeads()

      expect(result.success).toBe(true)
      expect(result.data?.length).toBe(0)
    })
  })

  describe('updateScoringConfig', () => {
    it('should update scoring config successfully', async () => {
      const { supabase } = require('@/lib/supabase')

      const updatedConfig = {
        ...mockScoringConfig,
        qualification_threshold: 65,
        high_priority_threshold: 85
      }

      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedConfig,
                error: null
              })
            })
          })
        })
      })

      const result = await updateScoringConfig('config-123', {
        qualification_threshold: 65,
        high_priority_threshold: 85
      })

      expect(result.success).toBe(true)
      expect(result.data?.qualification_threshold).toBe(65)
      expect(result.data?.high_priority_threshold).toBe(85)
    })

    it('should handle config not found', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Config not found' }
              })
            })
          })
        })
      })

      const result = await updateScoringConfig('nonexistent-config', {})

      expect(result.success).toBe(false)
      expect(result.error).toBe('Config not found')
    })
  })

  describe('analyzeScoringAccuracy', () => {
    it('should analyze scoring accuracy successfully', async () => {
      const { supabase } = require('@/lib/supabase')

      const mockScoredLeads = [
        { qualification_score: 80, converted_to_hire: true, application_status: 'hire_completed' },
        { qualification_score: 85, converted_to_hire: true, application_status: 'hire_completed' },
        { qualification_score: 45, converted_to_hire: false, application_status: 'rejected' },
        { qualification_score: 40, converted_to_hire: false, application_status: 'withdrawn' },
        { qualification_score: 75, converted_to_hire: false, application_status: 'application_submitted' }
      ]

      // Add more leads to meet minimum requirement
      const additionalLeads = Array(15).fill(null).map((_, i) => ({
        qualification_score: 60 + i,
        converted_to_hire: i % 3 === 0,
        application_status: i % 3 === 0 ? 'hire_completed' : 'application_submitted'
      }))

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: [...mockScoredLeads, ...additionalLeads],
              error: null
            })
          })
        })
      })

      const result = await analyzeScoringAccuracy()

      expect(result.success).toBe(true)
      expect(result.data?.accuracy).toBeGreaterThanOrEqual(0)
      expect(result.data?.accuracy).toBeLessThanOrEqual(100)
      expect(result.data?.recommendations).toBeDefined()
      expect(result.data?.calibrationNeeded).toBeDefined()
    })

    it('should handle insufficient data', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: [], // No data
              error: null
            })
          })
        })
      })

      const result = await analyzeScoringAccuracy()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient data')
    })
  })

  describe('getDefaultScoringConfig', () => {
    it('should get default scoring config successfully', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockScoringConfig,
              error: null
            })
          })
        })
      })

      const result = await getDefaultScoringConfig()

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('config-123')
      expect(result.data?.factors).toHaveLength(2)
    })

    it('should handle no active config', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'No active config' }
            })
          })
        })
      })

      const result = await getDefaultScoringConfig()

      expect(result.success).toBe(false)
      expect(result.error).toBe('No active config')
    })
  })
})