import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { BlogEditor } from '@/components/blog-editor'

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data, error } = await supabase.from('posts').select('*, consultations(*)').eq('id', id).single()

    if (error || !data) notFound()

    const consultationData = (data as any).consultations
    const consultation = Array.isArray(consultationData) ? consultationData[0] : consultationData
    const { consultations: _removed, ...post } = data as any

    return (
        <BlogEditor
            isEditing
            initialData={{
                id: post.id,
                title: post.title,
                content: post.content,
                mode: post.mode,
            }}
            initialConsultation={consultation}
        />
    )
}
