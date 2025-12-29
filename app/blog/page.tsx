import { createClient } from '@/lib/supabase/server'
import { BlogClientPage } from '@/components/blog-list-client'
import { Post } from '@/lib/types'

// Server Component
export default async function BlogPage() {
    const supabase = await createClient()

    // Fetch initial posts (Page 1) on the server for best FCP & SEO
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).range(0, 19)

    const initialPosts = (data as Post[]) || []

    return <BlogClientPage initialPosts={initialPosts} />
}
