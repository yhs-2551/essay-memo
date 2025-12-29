import { createMiddleware } from 'hono/factory'
import { createClient } from '@/lib/supabase/server'

export const rateLimit = createMiddleware(async (c, next) => {
    // 1. Identify User (IP)
    // X-Forwarded-For can be comma separated list, take the first one
    const forwardedFor = c.req.header('x-forwarded-for')
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown'

    // Rate Limit Key: IP based
    const key = `rl:${ip}`

    // Config: 60 requests per 1 minute
    const LIMIT = 60
    const WINDOW = 60

    try {
        const supabase = await createClient()

        // RPC call
        const { data: isAllowed, error } = await supabase.rpc('check_rate_limit', {
            request_key: key,
            limit_count: LIMIT,
            window_seconds: WINDOW,
        } as any)

        if (error) {
            console.error('Rate Limit RPC Error:', error)
            // Strategy: Fail Open (allow request) to prevent outage if DB is down
            // But log it.
        } else if (isAllowed === false) {
            return c.json(
                {
                    error: 'Too Many Requests',
                    message: 'Please try again later.',
                },
                429
            )
        }
    } catch (e) {
        console.error('Rate Limit Exception:', e)
    }

    await next()
})
