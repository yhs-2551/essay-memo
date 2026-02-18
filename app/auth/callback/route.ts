import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { logActivity } from '@/lib/logger'

// Open Redirect 방지: next 파라미터가 내부 경로인지 검증
// 외부 URL(http://, https://, //)은 모두 차단하고 홈으로 리다이렉트
function getSafeRedirectPath(next: string | null): string {
    const DEFAULT_PATH = '/'

    if (!next) return DEFAULT_PATH

    // 내부 경로만 허용: '/'로 시작하고 '//'나 외부 프로토콜이 없어야 함
    const isInternalPath = next.startsWith('/') && !next.startsWith('//')
    return isInternalPath ? next : DEFAULT_PATH
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    // Open Redirect 방지: 검증된 내부 경로만 사용
    const next = getSafeRedirectPath(searchParams.get('next'))

    if (code) {
        const cookieStore = await import('next/headers').then((m) => m.cookies())
        const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet: any[]) {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
                },
            },
        })
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (user) {
                await logActivity('USER_LOGIN', { method: 'oauth' }, user.id)
            }

            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
