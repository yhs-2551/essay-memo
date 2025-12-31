import { Page } from '@playwright/test'

/**
 * 프로그래매틱 로그인 유틸리티
 *
 * Hono API `/api/test-login`을 호출하면 서버에서 쿠키를 자동으로 설정합니다.
 * 페이지를 새로고침하면 인증 상태가 적용됩니다.
 */
export async function loginAs(page: Page, email: string, password: string) {
    // 1. 홈페이지로 먼저 이동 (도메인 컨텍스트 확보)
    await page.goto('/')

    // 2. 브라우저 내에서 fetch로 로그인 API 호출
    // 서버가 Set-Cookie 헤더로 쿠키를 설정함
    const loginResult = await page.evaluate(
        async ({ email, password }) => {
            try {
                const response = await fetch('/api/test-login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include', // 쿠키 수신을 위해 필수
                })

                const text = await response.text()

                if (!response.ok) {
                    return { success: false, error: `HTTP ${response.status}: ${text.substring(0, 200)}` }
                }

                try {
                    const data = JSON.parse(text)
                    return { success: true, data }
                } catch {
                    return { success: false, error: `Not JSON: ${text.substring(0, 200)}` }
                }
            } catch (e: any) {
                return { success: false, error: e.message }
            }
        },
        { email, password }
    )

    if (!loginResult.success) {
        throw new Error(`Login failed: ${loginResult.error}`)
    }

    // 3. 페이지 새로고침하여 쿠키 적용
    await page.reload()
    await page.waitForTimeout(500)

    console.log(`✅ Logged in as ${email} (User ID: ${loginResult.data.user?.id})`)
}
