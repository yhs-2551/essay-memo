'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/logger'

interface PostInput {
    title: string
    content: string
    mode: 'standard' | 'consultation'
    is_published?: boolean
    images?: string[]
}

interface ActionResult<T = any> {
    data?: T
    error?: string
    success?: boolean
    deletedCount?: number
}

export async function createPost(input: PostInput): Promise<ActionResult> {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const { data, error } = await (supabase.from('posts') as any)
        .insert({
            title: input.title,
            content: input.content,
            mode: input.mode,
            is_published: input.is_published ?? true,
            images: input.images ?? [],
            user_id: user.id,
        })
        .select()
        .single()

    if (error) return { error: error.message }

    await logActivity('POST_CREATE', { postId: data.id, mode: input.mode }, user.id)
    revalidatePath('/blog')

    return { data }
}

export async function updatePost(id: string, input: Partial<PostInput>): Promise<ActionResult> {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const { data, error } = await (supabase.from('posts') as any).update(input).eq('id', id).select().single()

    if (error) return { error: error.message }

    await logActivity('POST_UPDATE', { postId: id, changedFields: Object.keys(input) })
    revalidatePath('/blog')
    revalidatePath(`/blog/${id}`)

    return { data }
}

export async function deletePost(id: string): Promise<ActionResult> {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const { error, count } = await supabase.from('posts').delete({ count: 'exact' }).eq('id', id)

    if (error) return { error: error.message }
    if (count === 0) return { error: '글을 찾을 수 없거나 삭제 권한이 없습니다.' }

    await logActivity('POST_DELETE', { postId: id })
    revalidatePath('/blog')

    return { success: true }
}

export async function bulkDeletePosts(ids: string[]): Promise<ActionResult> {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const { error, count } = await supabase.from('posts').delete({ count: 'exact' }).in('id', ids)

    if (error) return { error: error.message }
    if (count === 0) return { error: '삭제할 글을 찾을 수 없습니다.' }

    await logActivity('POST_DELETE', { count: ids.length, bulk: true })
    revalidatePath('/blog')

    return { success: true, deletedCount: count ?? 0 }
}
