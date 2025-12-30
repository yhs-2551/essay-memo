import { test, expect } from '@playwright/test'

/**
 * E2E Test: AI Tier Limits (Critical Business Logic)
 * Verifies Free tier 2-call limit and Pro tier 10-call limit
 * Rules: 현금 흐름(Revenue Stream) 보호
 */

test.describe('AI Tier Limits', () => {
    test('Free tier should be limited to 2 AI consultations per day', async ({ page }) => {
        // Login as Free tier user
        await page.goto('/login')

        // Fill login form (adjust selectors based on actual login UI)
        await page.fill('input[type="email"]', process.env.TEST_FREE_USER_EMAIL || 'test-free@example.com')
        await page.fill('input[type="password"]', process.env.TEST_FREE_USER_PASSWORD || 'testpassword')
        await page.click('button[type="submit"]')

        // Wait for redirect to home
        await page.waitForURL('/')

        // Create first essay and request AI analysis
        await page.goto('/blog/new')
        await page.fill('textarea[placeholder*="제목"]', 'First AI Test')
        await page.fill('textarea[placeholder*="내용"]', 'This is my first essay for AI analysis')

        // Click AI analysis button (consultation mode)
        const aiButton = page.locator('button:has-text("인사이트"), button:has-text("AI")')
        await aiButton.first().click()

        // Wait for AI analysis to complete
        await expect(page.locator('text=/분석.*완료|인사이트.*생성/i')).toBeVisible({ timeout: 30000 })

        // Second essay
        await page.goto('/blog/new')
        await page.fill('textarea[placeholder*="제목"]', 'Second AI Test')
        await page.fill('textarea[placeholder*="내용"]', 'This is my second essay')
        await aiButton.first().click()
        await expect(page.locator('text=/분석.*완료|인사이트.*생성/i')).toBeVisible({ timeout: 30000 })

        // Third essay - should be BLOCKED
        await page.goto('/blog/new')
        await page.fill('textarea[placeholder*="제목"]', 'Third AI Test')
        await page.fill('textarea[placeholder*="내용"]', 'This should be blocked')
        await aiButton.first().click()

        // Expect limit error (403)
        await expect(page.locator('text=/일일.*제한|2회.*초과|업그레이드/i')).toBeVisible({ timeout: 5000 })
    })

    test('Pro tier should allow 10 AI consultations per day', async ({ page }) => {
        // Login as Pro tier user
        await page.goto('/login')

        await page.fill('input[type="email"]', process.env.TEST_PRO_USER_EMAIL || 'test-pro@example.com')
        await page.fill('input[type="password"]', process.env.TEST_PRO_USER_PASSWORD || 'testpassword')
        await page.click('button[type="submit"]')

        await page.waitForURL('/')

        // Verify Pro badge or indicator
        await expect(page.locator('text=/Pro|프로/i')).toBeVisible()

        // Create essay and verify AI works
        await page.goto('/blog/new')
        await page.fill('textarea[placeholder*="제목"]', 'Pro User AI Test')
        await page.fill('textarea[placeholder*="내용"]', 'Pro tier should have 10 calls available')

        const aiButton = page.locator('button:has-text("인사이트"), button:has-text("AI")')
        await aiButton.first().click()

        // Should succeed
        await expect(page.locator('text=/분석.*완료|인사이트.*생성/i')).toBeVisible({ timeout: 30000 })

        // Verify usage count shows "1/10" or similar
        await expect(page.locator('text=/1.*10|9.*남음/i')).toBeVisible()
    })
})
