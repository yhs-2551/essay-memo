import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BlogClientPage } from '@/components/blog-list-client'
import { Post } from '@/lib/types'

export default async function BlogPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data } = await supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).range(0, 19)

    const initialPosts = (data as Post[]) || []

    return <BlogClientPage initialPosts={initialPosts} />
}
