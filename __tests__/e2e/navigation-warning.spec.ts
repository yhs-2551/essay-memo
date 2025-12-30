import { test, expect } from '@playwright/test'

/**
 * E2E Test: Navigation Warning (beforeunload)
 * Verifies use-navigation-warning.ts hook functionality
 */

test.describe('Navigation Warning', () => {
    test('should warn user when leaving page with unsaved content', async ({ page, context }) => {
        // Navigate to new essay page
        await page.goto('/blog/new')

        // Wait for editor
        await page.waitForSelector('textarea[placeholder*="제목"]')

        // Type some content
        await page.fill('textarea[placeholder*="제목"]', 'Unsaved Essay')
        await page.fill('textarea[placeholder*="내용"]', 'This content should trigger navigation warning')

        // Set up dialog handler for beforeunload
        page.on('dialog', async (dialog) => {
            expect(dialog.type()).toBe('beforeunload')
            await dialog.dismiss()
        })

        // Try to navigate away
        await page.goto('/')

        // If warning worked, we should still be on the editor page
        // (dialog was dismissed, preventing navigation)
        const currentUrl = page.url()
        expect(currentUrl).toContain('/blog/new')
    })

    test('should NOT warn when content is saved', async ({ page }) => {
        // Navigate to new essay page
        await page.goto('/blog/new')

        await page.waitForSelector('textarea[placeholder*="제목"]')

        // Type and save
        await page.fill('textarea[placeholder*="제목"]', 'Saved Essay')
        await page.fill('textarea[placeholder*="내용"]', 'This is saved')

        // Click save/publish button
        const saveButton = page.locator('button:has-text("저장"), button:has-text("발행")')
        await saveButton.first().click()

        // Wait for save confirmation
        await expect(page.locator('text=/저장.*완료|발행.*완료/i')).toBeVisible({ timeout: 5000 })

        // Now navigate away - should NOT trigger warning
        await page.goto('/')

        // Should successfully navigate to home
        expect(page.url()).toBe('http://localhost:3000/')
    })
})
