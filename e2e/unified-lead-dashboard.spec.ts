import { test, expect } from '@playwright/test'

test.describe('Unified Lead Dashboard Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for testing
    await page.goto('/')
    
    // Mock the auth state
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_session', JSON.stringify({
        user: {
          id: 'test-user',
          role: 'manager',
          email: 'test@example.com'
        },
        expires_at: Date.now() + 3600000
      }))
    })
  })

  test('should load unified dashboard with both client and guard leads', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/unified-leads**', async (route) => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'client-1',
            type: 'client',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '555-0001',
            status: 'new',
            source: 'website',
            priority: 'high',
            createdAt: '2024-01-01T00:00:00Z',
            clientInfo: {
              company: 'Test Corp',
              industry: 'Technology'
            }
          },
          {
            id: 'guard-1',
            type: 'guard',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            phone: '555-0002',
            status: 'contacted',
            source: 'referral',
            priority: 'medium',
            createdAt: '2024-01-02T00:00:00Z',
            guardInfo: {
              experience: 'senior',
              certifications: ['TOPS']
            }
          }
        ],
        message: 'Success'
      }
      await route.fulfill({ json: mockResponse })
    })

    // Navigate to dashboard
    await page.goto('/dashboard/leads')

    // Wait for leads to load
    await page.waitForSelector('[data-testid="unified-lead-grid"]')

    // Verify both client and guard leads are displayed
    await expect(page.locator('text=John Doe')).toBeVisible()
    await expect(page.locator('text=Jane Smith')).toBeVisible()
    await expect(page.locator('text=client lead')).toBeVisible()
    await expect(page.locator('text=guard lead')).toBeVisible()

    // Verify summary statistics
    await expect(page.locator('text=Total Leads')).toBeVisible()
    await expect(page.locator('text=2')).toBeVisible() // Total count
  })

  test('should filter leads by type correctly', async ({ page }) => {
    await page.route('**/api/unified-leads**', async (route) => {
      const url = new URL(route.request().url())
      const leadType = url.searchParams.get('leadType')
      
      let mockData = []
      if (!leadType || leadType === 'client,guard') {
        mockData = [
          { id: 'client-1', type: 'client', firstName: 'John', lastName: 'Doe' },
          { id: 'guard-1', type: 'guard', firstName: 'Jane', lastName: 'Smith' }
        ]
      } else if (leadType === 'client') {
        mockData = [
          { id: 'client-1', type: 'client', firstName: 'John', lastName: 'Doe' }
        ]
      } else if (leadType === 'guard') {
        mockData = [
          { id: 'guard-1', type: 'guard', firstName: 'Jane', lastName: 'Smith' }
        ]
      }

      await route.fulfill({
        json: { success: true, data: mockData, message: 'Success' }
      })
    })

    await page.goto('/dashboard/leads')
    await page.waitForSelector('[data-testid="unified-lead-grid"]')

    // Test client filter
    await page.selectOption('select[name="leadType"]', 'client')
    await page.waitForTimeout(500) // Wait for filter to apply
    
    await expect(page.locator('text=John Doe')).toBeVisible()
    await expect(page.locator('text=Jane Smith')).not.toBeVisible()

    // Test guard filter
    await page.selectOption('select[name="leadType"]', 'guard')
    await page.waitForTimeout(500)
    
    await expect(page.locator('text=Jane Smith')).toBeVisible()
    await expect(page.locator('text=John Doe')).not.toBeVisible()

    // Test all filter
    await page.selectOption('select[name="leadType"]', 'all')
    await page.waitForTimeout(500)
    
    await expect(page.locator('text=John Doe')).toBeVisible()
    await expect(page.locator('text=Jane Smith')).toBeVisible()
  })

  test('should display analytics dashboard with cross-pipeline data', async ({ page }) => {
    await page.route('**/api/unified-leads/analytics**', async (route) => {
      const mockAnalytics = {
        success: true,
        data: {
          totalLeads: 100,
          clientLeads: 60,
          guardLeads: 40,
          conversionRate: 25.5,
          averageResponseTime: 4.2,
          sourcePerformance: [
            { source: 'website', totalLeads: 40, conversions: 12, conversionRate: 30 },
            { source: 'referral', totalLeads: 30, conversions: 10, conversionRate: 33.3 },
            { source: 'linkedin', totalLeads: 20, conversions: 3, conversionRate: 15 },
            { source: 'social_media', totalLeads: 10, conversions: 1, conversionRate: 10 }
          ],
          trendData: [
            { date: '2024-01-01', clientLeads: 5, guardLeads: 3, conversions: 2 },
            { date: '2024-01-02', clientLeads: 7, guardLeads: 4, conversions: 3 },
            { date: '2024-01-03', clientLeads: 6, guardLeads: 5, conversions: 4 }
          ],
          managerPerformance: [
            { managerId: 'mgr-1', managerName: 'John Manager', totalLeads: 25, conversions: 8 },
            { managerId: 'mgr-2', managerName: 'Jane Manager', totalLeads: 20, conversions: 6 }
          ]
        },
        message: 'Success'
      }
      await route.fulfill({ json: mockAnalytics })
    })

    await page.goto('/dashboard/leads')
    await page.click('button[role="tab"]:has-text("Analytics")')
    
    // Wait for analytics to load
    await page.waitForSelector('[data-testid="unified-analytics-dashboard"]')

    // Verify key metrics
    await expect(page.locator('text=Total Leads')).toBeVisible()
    await expect(page.locator('text=100')).toBeVisible()
    await expect(page.locator('text=25.5%')).toBeVisible() // Conversion rate

    // Verify source performance chart
    await expect(page.locator('text=Source Performance')).toBeVisible()
    await expect(page.locator('text=website')).toBeVisible()
    await expect(page.locator('text=referral')).toBeVisible()

    // Verify trend chart
    await expect(page.locator('text=Lead Trends')).toBeVisible()

    // Verify manager performance
    await expect(page.locator('text=Manager Performance')).toBeVisible()
    await expect(page.locator('text=John Manager')).toBeVisible()
  })

  test('should handle lead assignment workflow', async ({ page }) => {
    let assignmentCalled = false

    await page.route('**/api/unified-leads**', async (route) => {
      if (route.request().method() === 'GET') {
        const mockLeads = [{
          id: 'lead-1',
          type: 'client',
          firstName: 'John',
          lastName: 'Doe',
          status: 'new',
          assignedManager: null
        }]
        await route.fulfill({ json: { success: true, data: mockLeads } })
      }
    })

    await page.route('**/api/unified-leads/assignment**', async (route) => {
      if (route.request().method() === 'POST') {
        assignmentCalled = true
        await route.fulfill({
          json: { success: true, message: 'Lead assigned successfully' }
        })
      } else if (route.request().method() === 'GET') {
        const mockRecommendations = [{
          leadId: 'lead-1',
          recommendations: [{
            managerId: 'mgr-1',
            managerName: 'John Manager',
            confidenceScore: 85,
            reasons: ['Experience match', 'Low workload']
          }]
        }]
        await route.fulfill({ json: { success: true, data: mockRecommendations } })
      }
    })

    await page.goto('/dashboard/leads')
    await page.click('button[role="tab"]:has-text("Assignment")')
    
    // Wait for assignment view to load
    await page.waitForSelector('[data-testid="assignment-recommendations"]')

    // Verify unassigned leads are shown
    await expect(page.locator('text=John Doe')).toBeVisible()
    await expect(page.locator('text=Unassigned')).toBeVisible()

    // Click assign button
    await page.click('button:has-text("Assign")')
    
    // Wait for assignment to complete
    await page.waitForTimeout(1000)
    
    expect(assignmentCalled).toBe(true)
  })

  test('should export unified lead data', async ({ page }) => {
    let exportCalled = false

    await page.route('**/api/unified-leads/export**', async (route) => {
      exportCalled = true
      // Mock CSV export
      const csvData = 'Name,Type,Status,Source\nJohn Doe,client,new,website\nJane Smith,guard,contacted,referral'
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="unified-leads.csv"'
        },
        body: csvData
      })
    })

    await page.goto('/dashboard/leads')
    await page.click('button[role="tab"]:has-text("Export")')
    
    // Wait for export view
    await page.waitForSelector('[data-testid="export-manager"]')

    // Select CSV format and export
    await page.selectOption('select[name="format"]', 'csv')
    
    // Start download and wait for it
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export")')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('unified-leads.csv')
    expect(exportCalled).toBe(true)
  })

  test('should handle real-time updates', async ({ page }) => {
    // Initial load
    await page.route('**/api/unified-leads**', async (route) => {
      const mockLeads = [{
        id: 'lead-1',
        type: 'client',
        firstName: 'John',
        lastName: 'Doe',
        status: 'new'
      }]
      await route.fulfill({ json: { success: true, data: mockLeads } })
    })

    await page.goto('/dashboard/leads')
    await page.waitForSelector('[data-testid="unified-lead-grid"]')

    // Verify initial state
    await expect(page.locator('text=new')).toBeVisible()

    // Simulate real-time update (status change)
    await page.route('**/api/unified-leads**', async (route) => {
      const mockLeads = [{
        id: 'lead-1',
        type: 'client',
        firstName: 'John',
        lastName: 'Doe',
        status: 'contacted'
      }]
      await route.fulfill({ json: { success: true, data: mockLeads } })
    })

    // Trigger refresh
    await page.click('button:has-text("Refresh")')
    await page.waitForTimeout(500)

    // Verify status updated
    await expect(page.locator('text=contacted')).toBeVisible()
    await expect(page.locator('text=new')).not.toBeVisible()
  })

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/unified-leads**', async (route) => {
      await route.fulfill({ status: 500, json: { error: 'Internal server error' } })
    })

    await page.goto('/dashboard/leads')
    
    // Wait for error state
    await page.waitForSelector('text=Error loading leads')
    
    // Verify error message is displayed
    await expect(page.locator('text=Error loading leads')).toBeVisible()
    await expect(page.locator('button:has-text("Retry")')).toBeVisible()

    // Test retry functionality
    await page.route('**/api/unified-leads**', async (route) => {
      const mockLeads = [{ id: 'lead-1', firstName: 'John', lastName: 'Doe' }]
      await route.fulfill({ json: { success: true, data: mockLeads } })
    })

    await page.click('button:has-text("Retry")')
    await page.waitForSelector('text=John Doe')
    
    // Verify recovery
    await expect(page.locator('text=John Doe')).toBeVisible()
  })
})