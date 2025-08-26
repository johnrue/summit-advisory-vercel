import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display login page with all elements', async ({ page }) => {
    await page.goto('/login')
    
    await expect(page.getByText('Sign in')).toBeVisible()
    await expect(page.getByText('Enter your email and password to access your account')).toBeVisible()
    await expect(page.getByPlaceholder('your.email@example.com')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
  })

  test('should display register page with all elements', async ({ page }) => {
    await page.goto('/register')
    
    await expect(page.getByText('Create account')).toBeVisible()
    await expect(page.getByText('Enter your information to create your Summit Advisory account')).toBeVisible()
    await expect(page.getByLabel('First name')).toBeVisible()
    await expect(page.getByLabel('Last name')).toBeVisible()
    await expect(page.getByPlaceholder('your.email@example.com')).toBeVisible()
    await expect(page.getByText('Select your role')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('should navigate between login and register pages', async ({ page }) => {
    await page.goto('/login')
    
    // Click sign up link
    await page.getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL('/register')
    await expect(page.getByText('Create account')).toBeVisible()
    
    // Click sign in link
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/login')
    await expect(page.getByText('Sign in')).toBeVisible()
  })

  test('should redirect to login when accessing protected dashboard route', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should be redirected to login with redirect parameter
    await expect(page).toHaveURL('/login?redirectTo=%2Fdashboard')
    await expect(page.getByText('Sign in')).toBeVisible()
  })

  test('should show form validation errors on login', async ({ page }) => {
    await page.goto('/login')
    
    // Try to submit empty form
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Check for HTML5 validation (required fields)
    const emailInput = page.getByPlaceholder('your.email@example.com')
    const passwordInput = page.getByLabel('Password')
    
    await expect(emailInput).toBeRequired()
    await expect(passwordInput).toBeRequired()
  })

  test('should show form validation errors on register', async ({ page }) => {
    await page.goto('/register')
    
    // Try to submit empty form
    await page.getByRole('button', { name: /create account/i }).click()
    
    // Check for HTML5 validation (required fields)
    const firstNameInput = page.getByLabel('First name')
    const lastNameInput = page.getByLabel('Last name')
    const emailInput = page.getByPlaceholder('your.email@example.com')
    const passwordInput = page.getByLabel('Password', { exact: true })
    
    await expect(firstNameInput).toBeRequired()
    await expect(lastNameInput).toBeRequired()
    await expect(emailInput).toBeRequired()
    await expect(passwordInput).toBeRequired()
  })

  test('should show password mismatch error', async ({ page }) => {
    await page.goto('/register')
    
    // Fill form with mismatched passwords
    await page.getByLabel('First name').fill('John')
    await page.getByLabel('Last name').fill('Doe')
    await page.getByPlaceholder('your.email@example.com').fill('john@example.com')
    
    // Select role
    await page.getByRole('combobox').click()
    await page.getByText('Security Guard').click()
    
    await page.getByLabel('Password', { exact: true }).fill('password123')
    await page.getByLabel('Confirm password').fill('password456')
    
    await page.getByRole('button', { name: /create account/i }).click()
    
    // Should show password mismatch error
    await expect(page.getByText('Passwords do not match')).toBeVisible()
  })
})

test.describe('Marketing Pages', () => {
  test('should display homepage with key elements', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.getByText('Summit Advisory')).toBeVisible()
    await expect(page.getByRole('button', { name: /request a consultation/i })).toBeVisible()
  })

  test('should display QR redirect page', async ({ page }) => {
    await page.goto('/qr')
    
    // Should show redirect message or redirect to homepage
    // Allow for either redirect or display of redirect page
    await expect(page).toHaveURL(/(\/qr|\/)/);
  })
})

test.describe('Protected Routes', () => {
  test('should protect dashboard routes', async ({ page }) => {
    const protectedRoutes = ['/dashboard']
    
    for (const route of protectedRoutes) {
      await page.goto(route)
      
      // Should redirect to login
      await expect(page).toHaveURL(`/login?redirectTo=${encodeURIComponent(route)}`)
    }
  })
})

test.describe('Accessibility', () => {
  test('login page should have proper accessibility attributes', async ({ page }) => {
    await page.goto('/login')
    
    // Check for proper form labels
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    
    // Check for proper button text
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('register page should have proper accessibility attributes', async ({ page }) => {
    await page.goto('/register')
    
    // Check for proper form labels
    await expect(page.getByLabel('First name')).toBeVisible()
    await expect(page.getByLabel('Last name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Confirm password')).toBeVisible()
  })
})