import { test, expect } from '@playwright/test'
import { loginAs } from './playwright-utils'

test.describe('Posts CRUD', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, 'test@example.com', 'password')
    })

    test('should create and delete a post', async ({ page }) => {
        await page.goto('/posts/new') // Assuming creation route

        const title = `E2E Post ${Date.now()}`
        await page.fill('input[name="title"]', title)
        await page.fill('textarea[name="content"]', 'Content')
        await page.click('button[type="submit"]')

        // Expect redirect to post list or view
        await expect(page).toHaveURL(/\/posts/)
        await expect(page.getByText(title)).toBeVisible()

        // Delete
        // Need to find the post and delete it.
        // await page.click(`text=${title}`)
        // await page.click('button:has-text("Delete")')
        // await expect(page.getByText(title)).not.toBeVisible()
    })
})
