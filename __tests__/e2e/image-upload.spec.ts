import { test, expect } from '@playwright/test'

/**
 * E2E Test: Image Upload Flow
 * Verifies use-image-upload.ts hook functionality in real browser environment
 */

test.describe('Image Upload Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to new essay page
        await page.goto('/blog/new')

        // Wait for editor to load
        await page.waitForSelector('textarea[placeholder*="제목"]')
    })

    test('should upload image successfully', async ({ page }) => {
        // Fill in title
        await page.fill('textarea[placeholder*="제목"]', 'Test Essay with Image')

        // Find and click image upload button
        const uploadButton = page.locator('button:has-text("이미지")')
        await uploadButton.click()

        // Upload a test image file
        const fileInput = page.locator('input[type="file"]')
        await fileInput.setInputFiles({
            name: 'test-image.png',
            mimeType: 'image/png',
            buffer: Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                'base64'
            ),
        })

        // Wait for upload to complete (look for preview or success indicator)
        await expect(page.locator('img[alt*="preview"], img[src*="supabase"]')).toBeVisible({ timeout: 10000 })
    })

    test('should show error for oversized image', async ({ page }) => {
        // Fill in title
        await page.fill('textarea[placeholder*="제목"]', 'Test Oversized Image')

        // Click image upload button
        const uploadButton = page.locator('button:has-text("이미지")')
        await uploadButton.click()

        // Try to upload a large file (> 5MB limit)
        const fileInput = page.locator('input[type="file"]')
        const largeBuffer = Buffer.alloc(6 * 1024 * 1024) // 6MB
        await fileInput.setInputFiles({
            name: 'large-image.png',
            mimeType: 'image/png',
            buffer: largeBuffer,
        })

        // Expect error toast or message
        await expect(page.locator('text=/이미지.*크기.*초과|파일.*너무.*큽니다/i')).toBeVisible({ timeout: 5000 })
    })
})
