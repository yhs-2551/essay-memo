import { test, expect } from '@playwright/test'
import { loginAs } from './playwright-utils'
import { BlogEditorPage } from './pages/blog-editor.page'

const USER = { email: 'test-free-e2e@example.com', password: 'test-password-e2e-123' }

/**
 * E2E Test: Image Upload
 * Page Object Model (POM) 패턴 적용
 */

test.describe('Image Upload Flow', () => {
    test('should upload image', async ({ page }) => {
        await loginAs(page, USER.email, USER.password)

        const editor = new BlogEditorPage(page)
        await editor.goto()
        await editor.dismissDraftToast()

        await editor.titleInput.fill('Image Test')

        // 1x1 픽셀 PNG 이미지
        const testImage = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
        )
        await editor.uploadImage(testImage)

        await expect(editor.imageCount).toContainText('1/20', { timeout: 15000 })
    })

    test('should reject oversized image', async ({ page }) => {
        await loginAs(page, USER.email, USER.password)

        const editor = new BlogEditorPage(page)
        await editor.goto()
        await editor.dismissDraftToast()

        // 6MB 파일 (제한: 5MB)
        await editor.uploadImage(Buffer.alloc(6 * 1024 * 1024), 'large.png')

        await expect(editor.toastMessage).toBeVisible({ timeout: 5000 })
    })
})
