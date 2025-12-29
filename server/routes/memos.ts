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
        })
    ),
    async (c) => {
        const { content } = c.req.valid('json')
        const supabase = await createClient()
        const { data, error } = await (supabase.from('memos') as any).insert({ content }).select().single()

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
        })
    ),
    async (c) => {
        const id = c.req.param('id')
        const { content } = c.req.valid('json')
        const supabase = await createClient()
        const { data, error } = await (supabase.from('memos') as any).update({ content }).eq('id', id).select().single()

        if (error) return c.json({ error: error.message }, 500)
        return c.json(data)
    }
)

app.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const supabase = await createClient()
    const { error } = await supabase.from('memos').delete().eq('id', id)

    if (error) return c.json({ error: error.message }, 500)

    await logActivity('MEMO_DELETE', { memoId: id }) // No explicit user_id needed as logger will fetch from session

    return c.json({ success: true })
})

app.post('/bulk-delete', zValidator('json', z.object({ ids: z.array(z.string().uuid()) })), async (c) => {
    const { ids } = c.req.valid('json')
    const supabase = await createClient()
    const { error } = await supabase.from('memos').delete().in('id', ids)

    if (error) return c.json({ error: error.message }, 500)

    await logActivity('MEMO_DELETE', { count: ids.length, bulk: true })

    return c.json({ success: true })
})

export const memos = app
