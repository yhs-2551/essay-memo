import { createClient } from '@/lib/supabase/server'
import { MemoClientPage } from '@/components/memo-list-client'
import { Memo } from '@/lib/types'

export default async function MemoPage() {
    const supabase = await createClient()

    // Fetch initial memos (Page 1, limit 20)
    const { data } = await supabase.from('memos').select('*').order('created_at', { ascending: false }).range(0, 19)

    const initialMemos = (data as Memo[]) || []

    return <MemoClientPage initialMemos={initialMemos} />
}
