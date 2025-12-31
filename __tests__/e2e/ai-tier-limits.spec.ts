import { test, expect } from '@playwright/test'
import { loginAs } from './playwright-utils'
import { BlogEditorPage } from './pages/blog-editor.page'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

/**
 * E2E Test: AI Tier Limits
 * Page Object Model (POM) 패턴 적용
 */

const FREE_USER = { email: 'test-free-e2e@example.com', password: 'test-password-e2e-123' }
const PRO_USER = { email: 'test-pro-e2e@example.com', password: 'test-password-e2e-123' }

test.describe('AI Tier Limits', () => {
    test('Free tier can use AI consultation mode', async ({ page }) => {
        await loginAs(page, FREE_USER.email, FREE_USER.password)

        const editor = new BlogEditorPage(page)
        await editor.goto()
        await editor.dismissDraftToast()

        await editor.fillEssay('AI Test Essay', 'Testing AI analysis feature with consultation mode')
        await editor.selectConsultationMode()

        await expect(editor.submitButton).toContainText('분석 시작')
        await editor.submit()
        await editor.waitForSaveComplete()
    })

    test('Pro tier can access AI features', async ({ page }) => {
        await loginAs(page, PRO_USER.email, PRO_USER.password)

        const editor = new BlogEditorPage(page)
        await editor.goto()
        await editor.dismissDraftToast()

        await editor.fillEssay('Pro AI Test', 'Pro tier testing with AI consultation')
        await editor.selectConsultationMode()

        await editor.submit()
        await editor.waitForSaveComplete()
    })
})
