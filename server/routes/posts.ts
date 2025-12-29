import { Hono } from 'hono'
import { createClient } from '@/lib/supabase/server'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { logActivity } from '@/lib/logger'

const app = new Hono()

// Get all posts
app.get('/', async (c) => {
    const supabase = await createClient()
    const query = c.req.query('q')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const from = (page - 1) * limit
    const to = from + limit - 1

    let dbQuery = supabase.from('posts').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to)

    if (query) {
        dbQuery = dbQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    }

    const { data, error, count } = await dbQuery

    if (error) return c.json({ error: error.message }, 500)

    return c.json({
        posts: data,
        hasMore: count ? from + (data?.length || 0) < count : false,
        total: count,
    })
})

// Get single post with analysis
app.get('/:id', async (c) => {
    const id = c.req.param('id')
    const supabase = await createClient()

    const { data, error } = await supabase.from('posts').select('*, consultations(*)').eq('id', id).single()

    if (error) return c.json({ error: error.message }, 404)

    // Handle joined data (consultations can be array or object depending on relationship)
    // @ts-ignore
    const consultationData = data.consultations
    const consultation = Array.isArray(consultationData) ? consultationData[0] : consultationData

    // Remove the joined property from post object to match original response structure
    const { consultations: _removed, ...post } = data as any

    return c.json({ post, consultation })
})

// Create post
app.post(
    '/',
    zValidator(
        'json',
        z.object({
            title: z.string().min(1),
            content: z.string().min(1),
            mode: z.enum(['standard', 'consultation']),
            is_published: z.boolean().optional(),
            images: z.array(z.string()).optional(),
        })
    ),
    async (c) => {
        const { title, content, mode, is_published, images } = c.req.valid('json')
        const supabase = await createClient()

        const { data, error } = await (supabase.from('posts') as any)
            .insert({ title, content, mode, is_published, images })
            .select()
            .single()

        if (error) return c.json({ error: error.message }, 500)

        await logActivity('POST_CREATE', { postId: data.id, mode }, data.user_id)

        return c.json(data)
    }
)

// Update post
app.patch(
    '/:id',
    zValidator(
        'json',
        z.object({
            title: z.string().min(1).optional(),
            content: z.string().min(1).optional(),
            mode: z.enum(['standard', 'consultation']).optional(),
            is_published: z.boolean().optional(),
            images: z.array(z.string()).optional(),
        })
    ),
    async (c) => {
        const id = c.req.param('id')
        const body = c.req.valid('json')
        const supabase = await createClient()
        const { data, error } = await (supabase.from('posts') as any).update(body).eq('id', id).select().single()

        if (error) return c.json({ error: error.message }, 500)

        await logActivity('POST_UPDATE', { postId: id, changedFields: Object.keys(body) })

        return c.json(data)
    }
)

app.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const supabase = await createClient()
    const { error } = await supabase.from('posts').delete().eq('id', id)

    if (error) return c.json({ error: error.message }, 500)

    await logActivity('POST_DELETE', { postId: id })

    return c.json({ success: true })
})

app.post('/bulk-delete', zValidator('json', z.object({ ids: z.array(z.string().uuid()) })), async (c) => {
    const { ids } = c.req.valid('json')
    const supabase = await createClient()
    const { error } = await supabase.from('posts').delete().in('id', ids)

    if (error) return c.json({ error: error.message }, 500)

    await logActivity('POST_DELETE', { count: ids.length, bulk: true })

    return c.json({ success: true })
})

export const posts = app
