import {
  createABTest,
  launchABTest,
  recordTestVisitor,
  recordTestConversion,
  calculateTestResults,
  stopTestAndSelectWinner,
  getTestsForCampaign,
  getRunningTestsSummary
} from '@/lib/services/ab-testing-service'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })
    }
  }
}))

describe('A/B Testing Service', () => {
  const mockTestData = {
    name: 'Landing Page Headline Test',
    description: 'Testing different headlines for conversion',
    testType: 'landing_page' as const,
    hypothesis: 'Action-oriented headline will increase conversions',
    successMetric: 'application_submissions',
    campaignId: 'campaign-123',
    variants: [
      {
        name: 'Control',
        description: 'Original headline',
        config: { 
          headline: 'Join Our Security Team',
          trafficPercentage: 50
        },
        isControl: true
      },
      {
        name: 'Action-Oriented',
        description: 'Action-oriented headline',
        config: { 
          headline: 'Start Your Security Career Today',
          trafficPercentage: 50
        },
        isControl: false
      }
    ],
    confidenceLevel: 95,
    minimumSampleSize: 100,
    minimumEffectSize: 5
  }

  const mockABTest = {
    id: 'test-123',
    name: 'Landing Page Headline Test',
    description: 'Testing different headlines for conversion',
    campaignId: 'campaign-123',
    testType: 'landing_page',
    hypothesis: 'Action-oriented headline will increase conversions',
    successMetric: 'application_submissions',
    variants: [
      {
        id: 'variant_test-123_0',
        testId: 'test-123',
        name: 'Control',
        description: 'Original headline',
        config: { headline: 'Join Our Security Team', trafficPercentage: 50 },
        visitors: 150,
        conversions: 15,
        conversionRate: 0.1,
        isControl: true,
        isWinner: false
      },
      {
        id: 'variant_test-123_1',
        testId: 'test-123',
        name: 'Action-Oriented',
        description: 'Action-oriented headline',
        config: { headline: 'Start Your Security Career Today', trafficPercentage: 50 },
        visitors: 145,
        conversions: 20,
        conversionRate: 0.138,
        isControl: false,
        isWinner: false
      }
    ],
    trafficSplit: {
      'variant_test-123_0': 50,
      'variant_test-123_1': 50
    },
    confidenceLevel: 95,
    minimumSampleSize: 100,
    minimumEffectSize: 5,
    status: 'draft',
    startDate: '2025-08-30T12:00:00Z',
    created_at: '2025-08-30T12:00:00Z',
    updated_at: '2025-08-30T12:00:00Z'
  }

  const mockTestResults = {
    testId: 'test-123',
    totalVisitors: 295,
    totalConversions: 35,
    pValue: 0.045,
    isSignificant: true,
    confidenceLevel: 95,
    variantResults: [
      {
        variantId: 'variant_test-123_0',
        visitors: 150,
        conversions: 15,
        conversionRate: 0.1,
        confidenceInterval: { lower: 0.055, upper: 0.145 }
      },
      {
        variantId: 'variant_test-123_1',
        visitors: 145,
        conversions: 20,
        conversionRate: 0.138,
        lift: 38,
        confidenceInterval: { lower: 0.083, upper: 0.193 }
      }
    ],
    recommendedAction: 'implement_winner',
    expectedImpact: 38,
    calculatedAt: '2025-08-30T12:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createABTest', () => {
    it('should create A/B test successfully', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: null
        })
      })

      const result = await createABTest(mockTestData)

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe(mockTestData.name)
      expect(result.data?.variants).toHaveLength(2)
      expect(result.data?.variants[0].isControl).toBe(true)
      expect(result.data?.status).toBe('draft')
    })

    it('should validate traffic split adds up to 100%', async () => {
      const invalidTestData = {
        ...mockTestData,
        variants: [
          {
            ...mockTestData.variants[0],
            config: { ...mockTestData.variants[0].config, trafficPercentage: 60 }
          },
          {
            ...mockTestData.variants[1],
            config: { ...mockTestData.variants[1].config, trafficPercentage: 60 }
          }
        ]
      }

      const result = await createABTest(invalidTestData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Traffic split must add up to 100%')
    })

    it('should handle database errors', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: { message: 'Database error' }
        })
      })

      const result = await createABTest(mockTestData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('launchABTest', () => {
    it('should launch A/B test successfully', async () => {
      const { supabase } = require('@/lib/supabase')

      // Mock test fetch and update
      supabase.from.mockImplementation((table: string) => {
        if (table === 'ab_tests') {
          const mockChain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis()
          }

          // First call - fetch test
          mockChain.single.mockResolvedValueOnce({
            data: { ...mockABTest, status: 'ready_to_launch' },
            error: null
          })

          // Second call - update test
          mockChain.single.mockResolvedValueOnce({
            data: { ...mockABTest, status: 'running' },
            error: null
          })

          mockChain.update.mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })

          return mockChain
        }
        return {}
      })

      const result = await launchABTest('test-123')

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('running')
    })

    it('should handle test not found', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Test not found' }
            })
          })
        })
      })

      const result = await launchABTest('nonexistent-test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Test not found')
    })

    it('should validate test status before launch', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockABTest, status: 'completed' },
              error: null
            })
          })
        })
      })

      const result = await launchABTest('test-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('cannot be launched in current status')
    })
  })

  describe('recordTestVisitor', () => {
    it('should assign new visitor to variant', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockImplementation((table: string) => {
        if (table === 'ab_tests') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { ...mockABTest, status: 'running' },
                  error: null
                })
              })
            })
          }
        }
        if (table === 'test_visitor_assignments') {
          if (arguments.length > 1) { // insert call
            return {
              insert: jest.fn().mockResolvedValue({ error: null })
            }
          }
          // select call - no existing assignment
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: null
                  })
                })
              })
            })
          }
        }
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        }
      })

      const result = await recordTestVisitor('test-123', 'visitor-456', 'Mozilla/5.0', 'https://google.com')

      expect(result.success).toBe(true)
      expect(result.data?.variantId).toBeDefined()
      expect(result.data?.variantConfig).toBeDefined()
    })

    it('should return existing assignment for returning visitor', async () => {
      const { supabase } = require('@/lib/supabase')

      const existingAssignment = {
        variant_id: 'variant_test-123_0',
        variant_config: { headline: 'Join Our Security Team' }
      }

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: existingAssignment,
                error: null
              })
            })
          })
        })
      })

      const result = await recordTestVisitor('test-123', 'visitor-456')

      expect(result.success).toBe(true)
      expect(result.data?.variantId).toBe('variant_test-123_0')
      expect(result.data?.variantConfig).toBeDefined()
    })

    it('should handle test not running', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockABTest, status: 'paused' },
              error: null
            })
          })
        })
      })

      const result = await recordTestVisitor('test-123', 'visitor-456')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not currently running')
    })
  })

  describe('recordTestConversion', () => {
    it('should record conversion successfully', async () => {
      const { supabase } = require('@/lib/supabase')

      const visitorAssignment = { variant_id: 'variant_test-123_1' }

      supabase.from.mockImplementation((table: string) => {
        if (table === 'test_visitor_assignments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: visitorAssignment,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'test_conversions') {
          if (arguments.length > 1) { // insert call
            return {
              insert: jest.fn().mockResolvedValue({ error: null })
            }
          }
          // select call - no existing conversion
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'ab_tests') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockABTest,
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          }
        }
        return {}
      })

      const result = await recordTestConversion('test-123', 'visitor-456', 1)

      expect(result.success).toBe(true)
    })

    it('should handle visitor not assigned', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Assignment not found' }
              })
            })
          })
        })
      })

      const result = await recordTestConversion('test-123', 'visitor-456')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Visitor assignment not found')
    })

    it('should handle duplicate conversion', async () => {
      const { supabase } = require('@/lib/supabase')

      const visitorAssignment = { variant_id: 'variant_test-123_1' }
      const existingConversion = { id: 'conversion-123' }

      supabase.from.mockImplementation((table: string) => {
        if (table === 'test_visitor_assignments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: visitorAssignment,
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'test_conversions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: existingConversion,
                    error: null
                  })
                })
              })
            })
          }
        }
        return {}
      })

      const result = await recordTestConversion('test-123', 'visitor-456')

      expect(result.success).toBe(true)
      expect(result.message).toContain('already recorded')
    })
  })

  describe('calculateTestResults', () => {
    it('should calculate test results with significance', async () => {
      const { supabase } = require('@/lib/supabase')

      const mockConversions = [
        { variant_id: 'variant_test-123_0', conversion_value: 1 },
        { variant_id: 'variant_test-123_0', conversion_value: 1 },
        { variant_id: 'variant_test-123_1', conversion_value: 1 },
        { variant_id: 'variant_test-123_1', conversion_value: 1 },
        { variant_id: 'variant_test-123_1', conversion_value: 1 }
      ]

      supabase.from.mockImplementation((table: string) => {
        if (table === 'ab_tests') {
          if (arguments.length > 1) { // update call
            return {
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null })
              })
            }
          }
          // select call
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockABTest,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'test_conversions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockConversions,
                error: null
              })
            })
          }
        }
        return {}
      })

      const result = await calculateTestResults('test-123')

      expect(result.success).toBe(true)
      expect(result.data?.testId).toBe('test-123')
      expect(result.data?.totalVisitors).toBe(295)
      expect(result.data?.totalConversions).toBe(5)
      expect(result.data?.variantResults).toHaveLength(2)
      expect(result.data?.variantResults[0].conversionRate).toBeGreaterThan(0)
    })

    it('should handle insufficient data', async () => {
      const { supabase } = require('@/lib/supabase')

      const testWithLowTraffic = {
        ...mockABTest,
        variants: mockABTest.variants.map(v => ({ ...v, visitors: 5 }))
      }

      supabase.from.mockImplementation((table: string) => {
        if (table === 'ab_tests') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: testWithLowTraffic,
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          }
        }
        if (table === 'test_conversions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          }
        }
        return {}
      })

      const result = await calculateTestResults('test-123')

      expect(result.success).toBe(true)
      expect(result.data?.isSignificant).toBe(false)
    })
  })

  describe('stopTestAndSelectWinner', () => {
    it('should stop test and select winner', async () => {
      const { supabase } = require('@/lib/supabase')

      const mockConversions = [
        { variant_id: 'variant_test-123_1', conversion_value: 1 }
      ]

      supabase.from.mockImplementation((table: string) => {
        if (table === 'ab_tests') {
          if (arguments.length > 1) { // update call
            return {
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null })
              })
            }
          }
          // select calls
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockABTest,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'test_conversions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockConversions,
                error: null
              })
            })
          }
        }
        return {}
      })

      const result = await stopTestAndSelectWinner('test-123', 'Test completed successfully')

      expect(result.success).toBe(true)
      expect(result.data?.winner).toBeDefined()
      expect(result.data?.results).toBeDefined()
    })
  })

  describe('getTestsForCampaign', () => {
    it('should get tests for campaign', async () => {
      const { supabase } = require('@/lib/supabase')

      const campaignTests = [mockABTest, { ...mockABTest, id: 'test-456' }]

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: campaignTests,
              error: null
            })
          })
        })
      })

      const result = await getTestsForCampaign('campaign-123')

      expect(result.success).toBe(true)
      expect(result.data?.length).toBe(2)
    })

    it('should filter by status', async () => {
      const { supabase } = require('@/lib/supabase')

      const runningTests = [{ ...mockABTest, status: 'running' }]

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: runningTests,
                error: null
              })
            })
          })
        })
      })

      const result = await getTestsForCampaign('campaign-123', 'running')

      expect(result.success).toBe(true)
      expect(result.data?.length).toBe(1)
      expect(result.data?.[0].status).toBe('running')
    })
  })

  describe('getRunningTestsSummary', () => {
    it('should get running tests summary', async () => {
      const { supabase } = require('@/lib/supabase')

      const runningTests = [
        { ...mockABTest, status: 'running' },
        { ...mockABTest, id: 'test-456', status: 'running' }
      ]

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: runningTests,
              error: null
            })
          })
        })
      })

      const result = await getRunningTestsSummary()

      expect(result.success).toBe(true)
      expect(result.data?.length).toBe(2)
      expect(result.data?.[0].testId).toBeDefined()
      expect(result.data?.[0].visitors).toBeGreaterThan(0)
    })

    it('should handle no running tests', async () => {
      const { supabase } = require('@/lib/supabase')

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      const result = await getRunningTestsSummary()

      expect(result.success).toBe(true)
      expect(result.data?.length).toBe(0)
    })
  })
})