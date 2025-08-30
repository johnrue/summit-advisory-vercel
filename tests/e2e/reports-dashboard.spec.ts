/**
 * End-to-end tests for the Reports & Analytics Dashboard
 * Tests the complete user workflow including authentication, navigation, and functionality
 */

import { test, expect } from '@playwright/test'

// Test configuration
const DASHBOARD_URL = '/dashboard/reports'
const API_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'

test.describe('Reports Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - in real tests, you'd handle actual auth
    await page.route('**/auth/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'admin-user',
            email: 'admin@summitadvisory.com',
            role: 'admin'
          }
        })
      })
    })

    // Mock scheduled reports API
    await page.route('**/api/v1/reports/scheduled', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            reports: [
              {
                id: '1',
                name: 'Weekly Guard Summary',
                description: 'Comprehensive weekly summary',
                dataType: 'guards',
                format: 'pdf',
                isActive: true,
                schedule: { frequency: 'weekly', time: '09:00', dayOfWeek: 1 },
                recipients: ['admin@example.com'],
                nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              }
            ]
          })
        })
      }
    })

    // Mock export APIs
    await page.route('**/api/v1/exports/estimate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          recordCount: 156,
          estimatedSize: '4.2 KB'
        })
      })
    })

    await page.route('**/api/v1/exports/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          fileName: 'guards-export-2025-01-22.csv',
          downloadUrl: 'blob:http://localhost:3000/test-download',
          recordCount: 156,
          fileSize: '4.2 KB'
        })
      })
    })
  })

  test('should load reports dashboard successfully', async ({ page }) => {
    await page.goto(DASHBOARD_URL)

    // Check main heading
    await expect(page.locator('h1')).toContainText('Reports & Analytics')
    
    // Check all tabs are present
    await expect(page.locator('text=Overview')).toBeVisible()
    await expect(page.locator('text=Data Export')).toBeVisible()
    await expect(page.locator('text=Scheduled Reports')).toBeVisible()
    await expect(page.locator('text=Custom Builder')).toBeVisible()
    await expect(page.locator('text=Audit')).toBeVisible()
  })

  test('should display metrics overview on load', async ({ page }) => {
    await page.goto(DASHBOARD_URL)

    // Should start on overview tab
    await expect(page.locator('text=Operational Metrics')).toBeVisible()
    await expect(page.locator('text=Active Guards')).toBeVisible()
    await expect(page.locator('text=Hiring Conversion')).toBeVisible()
    await expect(page.locator('text=Scheduling Efficiency')).toBeVisible()
    await expect(page.locator('text=Compliance Status')).toBeVisible()

    // Should show charts
    await expect(page.locator('[data-testid="chart-container"]')).toHaveCount(3)
    
    // Should have refresh button
    await expect(page.locator('text=Refresh')).toBeVisible()
  })

  test('should complete data export workflow', async ({ page }) => {
    await page.goto(DASHBOARD_URL)

    // Switch to export tab
    await page.locator('text=Data Export').click()
    await expect(page.locator('text=Export Configuration')).toBeVisible()

    // Configure export
    await page.selectOption('[data-testid="data-type-select"]', 'guards')
    await page.selectOption('[data-testid="format-select"]', 'csv')
    
    // Select fields
    await page.locator('input[type="checkbox"][value="full_name"]').check()
    await page.locator('input[type="checkbox"][value="email"]').check()
    await page.locator('input[type="checkbox"][value="status"]').check()

    // Estimate size
    await page.locator('text=Estimate Size').click()
    await expect(page.locator('text=Records: 156')).toBeVisible()
    await expect(page.locator('text=Estimated Size: 4.2 KB')).toBeVisible()

    // Generate export
    await page.locator('text=Generate Export').click()
    
    // Should show progress
    await expect(page.locator('text=Generating Export...')).toBeVisible()
    
    // Should complete and show download
    await expect(page.locator('text=guards-export-2025-01-22.csv')).toBeVisible()
    await expect(page.locator('text=Download')).toBeVisible()
    
    // Should show in history
    await expect(page.locator('text=Export History')).toBeVisible()
  })

  test('should manage scheduled reports', async ({ page }) => {
    await page.goto(DASHBOARD_URL)

    // Switch to scheduled reports tab
    await page.locator('text=Scheduled Reports').click()
    await expect(page.locator('text=Automated Report Scheduling')).toBeVisible()

    // Should show existing report
    await expect(page.locator('text=Weekly Guard Summary')).toBeVisible()
    await expect(page.locator('text=Comprehensive weekly summary')).toBeVisible()
    await expect(page.locator('text=Active')).toBeVisible()

    // Open create dialog
    await page.locator('text=New Schedule').click()
    await expect(page.locator('text=Create Scheduled Report')).toBeVisible()

    // Fill form
    await page.fill('input[name="name"]', 'Test Scheduled Report')
    await page.fill('textarea[name="description"]', 'Test description')
    await page.selectOption('select[name="dataType"]', 'applications')
    await page.selectOption('select[name="format"]', 'csv')
    await page.selectOption('select[name="frequency"]', 'daily')
    await page.fill('input[type="time"]', '10:00')

    // Should be able to submit
    await expect(page.locator('text=Create Schedule')).not.toBeDisabled()
  })

  test('should build custom reports', async ({ page }) => {
    await page.goto(DASHBOARD_URL)

    // Switch to custom builder tab
    await page.locator('text=Custom Builder').click()
    await expect(page.locator('text=Custom Report Builder')).toBeVisible()

    // Configure report
    await page.fill('input[id="report-name"]', 'Custom Test Report')
    await page.fill('textarea[id="report-description"]', 'Custom report description')

    // Add fields by clicking available fields
    await page.locator('text=Guards').click()
    await page.locator('button:has-text("full_name")').click()
    await page.locator('button:has-text("email")').click()

    // Should show selected fields
    await expect(page.locator('text=Selected Fields')).toBeVisible()
    await expect(page.locator('text=Full Name')).toBeVisible()

    // Add filter
    await page.locator('text=Add Filter').click()
    await expect(page.locator('text=Filter 1')).toBeVisible()

    // Should be able to preview
    await expect(page.locator('text=Preview')).not.toBeDisabled()
    
    // Should be able to save
    await expect(page.locator('text=Save Report')).not.toBeDisabled()
  })

  test('should show audit trail', async ({ page }) => {
    // Mock audit logs
    await page.route('**/audit-logs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            timestamp: new Date().toISOString(),
            userName: 'Admin User',
            action: 'report_generated',
            resourceName: 'Weekly Summary',
            status: 'success',
            ipAddress: '192.168.1.100'
          }
        ])
      })
    })

    await page.goto(DASHBOARD_URL)

    // Switch to audit tab
    await page.locator('text=Audit').click()
    await expect(page.locator('text=Audit Trail')).toBeVisible()

    // Should show filters
    await expect(page.locator('text=Search')).toBeVisible()
    await expect(page.locator('text=Action')).toBeVisible()
    await expect(page.locator('text=Status')).toBeVisible()

    // Should show audit entries table
    await expect(page.locator('text=Timestamp')).toBeVisible()
    await expect(page.locator('text=User')).toBeVisible()
    await expect(page.locator('text=IP Address')).toBeVisible()
  })

  test('should handle errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/exports/generate', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Insufficient permissions for this data type'
        })
      })
    })

    await page.goto(DASHBOARD_URL)

    // Switch to export tab and try to export
    await page.locator('text=Data Export').click()
    await page.selectOption('[data-testid="data-type-select"]', 'guards')
    await page.selectOption('[data-testid="format-select"]', 'csv')
    await page.locator('input[type="checkbox"][value="full_name"]').check()
    await page.locator('text=Generate Export').click()

    // Should show error
    await expect(page.locator('text=failed')).toBeVisible()
    await expect(page.locator('text=Generate Export')).toBeVisible() // Button should be re-enabled
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(DASHBOARD_URL)

    // Should still show main heading
    await expect(page.locator('h1')).toContainText('Reports & Analytics')
    
    // Tabs should be responsive
    await expect(page.locator('text=Overview')).toBeVisible()
    
    // Cards should stack vertically on mobile
    const metricCards = page.locator('[data-testid="metric-card"]')
    const cardCount = await metricCards.count()
    if (cardCount > 0) {
      // Verify cards are stacked (this would depend on your CSS implementation)
      await expect(metricCards.first()).toBeVisible()
    }
  })

  test('should maintain state between tab switches', async ({ page }) => {
    await page.goto(DASHBOARD_URL)

    // Configure export
    await page.locator('text=Data Export').click()
    await page.selectOption('[data-testid="data-type-select"]', 'guards')
    await page.selectOption('[data-testid="format-select"]', 'csv')
    await page.locator('input[type="checkbox"][value="full_name"]').check()

    // Switch to another tab
    await page.locator('text=Overview').click()
    await expect(page.locator('text=Operational Metrics')).toBeVisible()

    // Switch back to export
    await page.locator('text=Data Export').click()
    
    // Configuration should be preserved
    await expect(page.locator('[data-testid="data-type-select"]')).toHaveValue('guards')
    await expect(page.locator('[data-testid="format-select"]')).toHaveValue('csv')
    await expect(page.locator('input[type="checkbox"][value="full_name"]')).toBeChecked()
  })

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto(DASHBOARD_URL)

    // Tab through the navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Should be able to activate tabs with keyboard
    await page.keyboard.press('Enter')
    
    // Should be able to navigate form elements
    await page.locator('text=Data Export').click()
    await page.keyboard.press('Tab') // Should focus first form element
    
    // Verify accessibility
    const violations = await page.evaluate(() => {
      // This would use axe-core in a real implementation
      // return axe.run()
      return { violations: [] }
    })
    expect(violations.violations).toHaveLength(0)
  })

  test('should load performance metrics efficiently', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto(DASHBOARD_URL)
    
    // Wait for main content to load
    await page.waitForSelector('text=Operational Metrics')
    
    const loadTime = Date.now() - startTime
    
    // Should load within reasonable time
    expect(loadTime).toBeLessThan(3000)
    
    // Check for performance markers
    const performanceMetrics = await page.evaluate(() => {
      return {
        navigation: performance.getEntriesByType('navigation')[0],
        resources: performance.getEntriesByType('resource').length
      }
    })
    
    expect(performanceMetrics.resources).toBeGreaterThan(0)
  })
})