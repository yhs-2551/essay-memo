import { test, expect } from '@playwright/test'
import { loginAs } from './playwright-utils'
import { BlogEditorPage } from './pages/blog-editor.page'

const USER = { email: 'test-free-e2e@example.com', password: 'test-password-e2e-123' }

/**
 * E2E Test: Navigation & Save
 * Page Object Model (POM) 패턴 적용
 */

test.describe('Essay Save Flow', () => {
    test('should save essay in standard mode', async ({ page }) => {
        await loginAs(page, USER.email, USER.password)

        const editor = new BlogEditorPage(page)
        await editor.goto()
        await editor.dismissDraftToast()

        await editor.fillEssay('Save Test Essay', 'This content will be saved')

        // 자유 기록 모드 (기본값)
        await expect(editor.submitButton).toContainText('저장 완료')
        await editor.submit()

        await editor.waitForSaveComplete()
    })
})
