import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MemoClientPage } from '@/components/memo-list-client'
import { Memo } from '@/lib/types'

export default async function MemoPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data } = await supabase.from('memos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).range(0, 19)

    const initialMemos = (data as Memo[]) || []

    return <MemoClientPage initialMemos={initialMemos} />
}
