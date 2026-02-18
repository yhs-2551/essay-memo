import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
    test('should allow user to log in via UI', async ({ page }) => {
        // Skip if running against production without test credentials
        // Assuming local dev has this user
        const TEST_EMAIL = 'test@example.com'
        const TEST_PASSWORD = 'password'

        await page.goto('/login')

        // Fill login form
        await page.fill('input[type="email"]', TEST_EMAIL)
        await page.fill('input[type="password"]', TEST_PASSWORD)

        // Submit
        await page.click('button[type="submit"]')

        // Expect redirection to home or dashboard
        await expect(page).toHaveURL('/')

        // Check for authenticated state (e.g., specific UI element)
        // Adjust selector based on actual UI
        // await expect(page.getByText('Log out')).toBeVisible()
    })

    test('should redirect unauthenticated user from protected route', async ({ page }) => {
        await page.goto('/memos')
        await expect(page).toHaveURL(/\/login\?next=%2Fmemos/)
    })
})
