import { Hono } from 'hono'
import { createClient } from '@/lib/supabase/server'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { logActivity } from '@/lib/logger'
import { UI_CONFIG } from '@/lib/constants'

const app = new Hono()

// Get all memos
app.get('/', async (c) => {
    const supabase = await createClient()
    const query = c.req.query('q')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || String(UI_CONFIG.PAGINATION_LIMIT))
    const from = (page - 1) * limit
    const to = from + limit - 1

    let dbQuery = supabase.from('memos').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to)

    if (query) {
        dbQuery = dbQuery.ilike('content', `%${query}%`)
    }

    const { data, error, count } = await dbQuery

    if (error) {
        console.error('[API] Memos Fetch Error:', error)
        return c.json({ error: error.message }, 500)
    }

    return c.json({
        memos: data,
        hasMore: count ? from + (data?.length || 0) < count : false,
        total: count,
    })
})

// Create memo
app.post(
    '/',
    zValidator(
        'json',
        z.object({
            content: z.string().min(1),
            images: z.array(z.string()).optional(),
        })
    ),
    async (c) => {
        const { content, images } = c.req.valid('json')
        const supabase = await createClient()

        // [FIX] Get authenticated user for RLS compliance
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return c.json({ error: 'Unauthorized: Please log in' }, 401)
        }

        // [FIX] Include user_id for RLS policy
        const { data, error } = await (supabase.from('memos') as any).insert({ content, images, user_id: user.id }).select().single()

        if (error) return c.json({ error: error.message }, 500)

        await logActivity('MEMO_CREATE', { memoId: data.id })

        return c.json(data)
    }
)

// Update memo
app.patch(
    '/:id',
    zValidator(
        'json',
        z.object({
            content: z.string().min(1),
            images: z.array(z.string()).optional(),
        })
    ),
    async (c) => {
        const id = c.req.param('id')
        const body = c.req.valid('json')
        const supabase = await createClient()

        // [FIX] Auth check for RLS
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            return c.json({ error: 'Unauthorized: Please log in' }, 401)
        }

        const { data, error, count } = await (supabase.from('memos') as any).update(body).eq('id', id).select().single()

        if (error) return c.json({ error: error.message }, 500)
        return c.json(data)
    }
)

app.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const supabase = await createClient()

    // [FIX] Auth check for RLS
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
        return c.json({ error: 'Unauthorized: Please log in' }, 401)
    }

    const { error, count } = await supabase.from('memos').delete({ count: 'exact' }).eq('id', id)

    if (error) return c.json({ error: error.message }, 500)

    if (count === 0) {
        return c.json({ error: 'Memo not found or you do not have permission.' }, 403)
    }

    await logActivity('MEMO_DELETE', { memoId: id })

    return c.json({ success: true })
})

app.post('/bulk-delete', zValidator('json', z.object({ ids: z.array(z.string().uuid()) })), async (c) => {
    const { ids } = c.req.valid('json')
    const supabase = await createClient()

    // [FIX] Auth check for RLS
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
        return c.json({ error: 'Unauthorized: Please log in' }, 401)
    }

    const { error, count } = await supabase.from('memos').delete({ count: 'exact' }).in('id', ids)

    if (error) return c.json({ error: error.message }, 500)

    if (count === 0) {
        return c.json({ error: 'No memos were deleted. You may not have permission.' }, 403)
    }

    await logActivity('MEMO_DELETE', { count: ids.length, bulk: true })

    return c.json({ success: true, deletedCount: count })
})

export const memos = app
