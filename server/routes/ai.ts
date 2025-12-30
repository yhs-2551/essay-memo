import { Hono } from 'hono'
import { createClient } from '@/lib/supabase/server'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { logActivity } from '@/lib/logger'

const app = new Hono()

app.post(
    '/analyze',
    zValidator(
        'json',
        z.object({
            postId: z.string().uuid(),
            persona: z.string().optional(),
        })
    ),
    async (c) => {
        const { postId, persona } = c.req.valid('json')
        const supabase = await createClient()

        // 0. 사용자 인증 확인
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) {
            return c.json({ error: 'Unauthorized' }, 401)
        }

        // 1. Quota Check (Server-side) - 티어별 제한 적용
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('consultation_count, last_consultation_date, subscription_tier')
            .eq('id', user.id)
            .single()

        const profile = profileData as any

        if (profileError) {
            return c.json({ error: 'Profile not found' }, 404)
        }

        const today = new Date()
        const lastDate = profile.last_consultation_date ? new Date(profile.last_consultation_date) : new Date(0)

        // 날짜가 다르면 카운트 리셋
        let currentCount = profile.consultation_count || 0
        const isSameDay = today.toDateString() === lastDate.toDateString()

        if (!isSameDay) {
            currentCount = 0
        }

        // 티어별 일일 제한 체크 (확장성 고려)
        const isPro = profile.subscription_tier === 'pro'
        const dailyLimit = isPro ? 10 : 2 // Pro: 10회, Free: 2회

        const hasExceededLimit = currentCount >= dailyLimit
        if (hasExceededLimit) {
            return c.json(
                {
                    error: `Daily consultation limit reached (${currentCount}/${dailyLimit})`,
                    tierInfo: isPro ? 'pro' : 'free',
                },
                403
            )
        }

        // 2. 게시글 데이터 가져오기
        const { data: post, error: postError } = (await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .eq('user_id', user.id)
            .single()) as any

        if (postError || !post) {
            return c.json({ error: 'Post not found or unauthorized' }, 404)
        }

        // 3. 이미지 URL 추출
        const imageRegex = /!\[(.*?)\]\((.*?)\)/g
        const matches = Array.from(post.content.matchAll(imageRegex)) as RegExpExecArray[]
        const imageUrls = matches.map((m) => m[2])
        const textContent = post.content.replace(imageRegex, '').trim()

        try {
            // 4. Supabase Edge Function 호출
            const { data, error } = await supabase.functions.invoke('analyze-entry', {
                body: { record: { ...post, content: textContent, images: imageUrls, persona } },
            })

            if (error) {
                console.error('Edge Function Error:', error)
                throw new Error('AI analysis failed at Edge')
            }

            // 5. 성공 시 Quota 업데이트
            const newCount = isSameDay ? currentCount + 1 : 1
            const query = supabase.from('profiles') as any
            await query
                .update({
                    consultation_count: newCount,
                    last_consultation_date: new Date().toISOString(),
                })
                .eq('id', user.id)

            // 6. 결과 반환
            const { data: consultation, error: readError } = await supabase.from('consultations').select('*').eq('post_id', postId).single()

            if (readError) throw readError

            await logActivity('AI_ANALYSIS', { postId }, user.id)

            return c.json(consultation)
        } catch (e) {
            console.error('Analysis Process Error:', e)
            return c.json({ error: 'Failed to process analysis' }, 500)
        }
    }
)

export const ai = app
