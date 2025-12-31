import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { createClient } from '@supabase/supabase-js'

/**
 * 테스트 전용 로그인 라우트
 *
 * ⚠️ 주의: E2E 테스트 환경에서만 사용됩니다.
 * 프로덕션에서는 차단됩니다.
 */
export const testLogin = new Hono()

testLogin.post('/', async (c) => {
    // 프로덕션 환경에서는 차단
    if (process.env.NODE_ENV === 'production') {
        return c.json({ error: 'Not available in production' }, 403)
    }

    try {
        const { email, password } = await c.req.json()

        if (!email || !password) {
            return c.json({ error: 'Email and password required' }, 400)
        }

        // Supabase 클라이언트로 로그인
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            return c.json({ error: error.message }, 401)
        }

        // 세션 데이터
        const session = data.session
        if (!session) {
            return c.json({ error: 'No session returned' }, 500)
        }

        // Supabase SSR 쿠키 형식으로 설정
        // 프로젝트 ref 추출
        const projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
        const projectRef = projectUrl.hostname.split('.')[0]
        const cookieName = `sb-${projectRef}-auth-token`

        // 세션을 JSON으로 직렬화하여 쿠키로 설정
        const sessionData = {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            expires_in: session.expires_in,
            token_type: session.token_type,
            user: session.user,
        }

        // 쿠키 설정 (Hono의 setCookie 사용)
        setCookie(c, cookieName, JSON.stringify(sessionData), {
            path: '/',
            httpOnly: false,
            secure: false,
            sameSite: 'Lax',
            maxAge: session.expires_in,
        })

        // 성공 응답
        return c.json({
            success: true,
            session: {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
            },
            user: {
                id: data.user?.id,
                email: data.user?.email,
            },
        })
    } catch (error: any) {
        return c.json({ error: error.message }, 500)
    }
})
