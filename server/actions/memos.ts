'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/logger'

interface MemoInput {
    content: string
    images?: string[]
}

interface ActionResult<T = any> {
    data?: T
    error?: string
    success?: boolean
    deletedCount?: number
}

export async function createMemo(input: MemoInput): Promise<ActionResult> {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const { data, error } = await (supabase.from('memos') as any)
        .insert({
            content: input.content,
            images: input.images ?? [],
            user_id: user.id,
        })
        .select()
        .single()

    if (error) return { error: error.message }

    await logActivity('MEMO_CREATE', { memoId: data.id })
    revalidatePath('/memos')

    return { data }
}

export async function updateMemo(id: string, input: Partial<MemoInput>): Promise<ActionResult> {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const { data, error } = await (supabase.from('memos') as any).update(input).eq('id', id).select().single()

    if (error) return { error: error.message }

    revalidatePath('/memos')

    return { data }
}

export async function deleteMemo(id: string): Promise<ActionResult> {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const { error, count } = await supabase.from('memos').delete({ count: 'exact' }).eq('id', id)

    if (error) return { error: error.message }
    if (count === 0) return { error: '메모를 찾을 수 없거나 삭제 권한이 없습니다.' }

    await logActivity('MEMO_DELETE', { memoId: id })
    revalidatePath('/memos')

    return { success: true }
}

export async function bulkDeleteMemos(ids: string[]): Promise<ActionResult> {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: '인증이 필요합니다.' }

    const { error, count } = await supabase.from('memos').delete({ count: 'exact' }).in('id', ids)

    if (error) return { error: error.message }
    if (count === 0) return { error: '삭제할 메모를 찾을 수 없습니다.' }

    await logActivity('MEMO_DELETE', { count: ids.length, bulk: true })
    revalidatePath('/memos')

    return { success: true, deletedCount: count ?? 0 }
}
