import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PostDetailClient } from './post-detail-client'

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) notFound()

    const { data, error } = await supabase.from('posts').select('*, consultations(*)').eq('id', id).eq('user_id', user.id).single()

    if (error || !data) notFound()

    const consultationData = (data as any).consultations
    const consultation = Array.isArray(consultationData) ? consultationData[0] : consultationData
    const { consultations: _removed, ...post } = data as any

    return <PostDetailClient post={post} consultation={consultation} />
}
