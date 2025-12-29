import { Hono } from 'hono'
import { createClient } from '@/lib/supabase/server'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { logActivity } from '@/lib/logger'
import { UI_CONFIG } from '@/lib/constants'

const app = new Hono()

// Get all posts
app.get('/', async (c) => {
    const supabase = await createClient()
    const query = c.req.query('q')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || String(UI_CONFIG.PAGINATION_LIMIT))
    const from = (page - 1) * limit
    const to = from + limit - 1

    let dbQuery = supabase.from('posts').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to)

    if (query) {
        dbQuery = dbQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    }

    const { data, error, count } = await dbQuery

    if (error) {
        console.error('[API] Posts Fetch Error:', error)
        return c.json({ error: error.message }, 500)
    }

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

        // [FIX] Get authenticated user for RLS compliance
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (!user) {
            return c.json({ error: 'Unauthorized: Please log in' }, 401)
        }

        // [FIX] Include user_id for RLS policy: auth.uid() = user_id
        const { data, error } = await (supabase.from('posts') as any)
            .insert({ title, content, mode, is_published, images, user_id: user.id })
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

        // [FIX] Auth check for RLS
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            return c.json({ error: 'Unauthorized: Please log in' }, 401)
        }

        const { data, error, count } = await (supabase.from('posts') as any).update(body).eq('id', id).select().single()

        if (error) return c.json({ error: error.message }, 500)

        await logActivity('POST_UPDATE', { postId: id, changedFields: Object.keys(body) })

        return c.json(data)
    }
)

app.delete('/:id', async (c) => {
    const id = c.req.param('id')
    const supabase = await createClient()

    // [DEBUG] Check authenticated user
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()
    console.log('[API] delete/:id - User:', user?.id || 'NOT AUTHENTICATED', 'PostId:', id)

    if (!user) {
        return c.json({ error: 'Unauthorized: Not logged in' }, 401)
    }

    const { error, count } = await supabase.from('posts').delete({ count: 'exact' }).eq('id', id)

    console.log('[API] delete/:id - Deleted count:', count, 'Error:', error?.message || 'none')

    if (error) return c.json({ error: error.message }, 500)

    if (count === 0) {
        return c.json({ error: 'Post not found or you do not have permission to delete it.' }, 403)
    }

    await logActivity('POST_DELETE', { postId: id })

    return c.json({ success: true })
})

app.post('/bulk-delete', zValidator('json', z.object({ ids: z.array(z.string().uuid()) })), async (c) => {
    const { ids } = c.req.valid('json')
    const supabase = await createClient()

    // [DEBUG] Check authenticated user
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()
    console.log('[API] bulk-delete - User:', user?.id || 'NOT AUTHENTICATED', 'AuthError:', authError?.message || 'none')

    if (!user) {
        return c.json({ error: 'Unauthorized: Not logged in' }, 401)
    }

    const { error, count } = await supabase.from('posts').delete({ count: 'exact' }).in('id', ids)

    console.log('[API] bulk-delete - Deleted count:', count, 'Error:', error?.message || 'none')

    if (error) return c.json({ error: error.message }, 500)

    if (count === 0) {
        console.log('[API] bulk-delete - WARNING: 0 rows deleted. RLS policy may be blocking.')
        return c.json({ error: 'No posts were deleted. You may not have permission.' }, 403)
    }

    await logActivity('POST_DELETE', { count: ids.length, bulk: true })

    return c.json({ success: true, deletedCount: count })
})

export const posts = app
