import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// .env.test 파일 명시적으로 로드
config({ path: resolve(__dirname, '../../.env.test') })

/**
 * Playwright Global Setup
 * 테스트 시작 전 자동으로 테스트 계정 생성
 */
export default async function globalSetup() {
    console.log('🚀 E2E 테스트 환경 준비 중...')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            '❌ 환경 변수가 설정되지 않았습니다.\n' +
                'NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY를 .env.test에 설정해주세요.\n' +
                `현재 값: supabaseUrl=${supabaseUrl}, serviceRoleKey=${serviceRoleKey ? '설정됨' : '없음'}`
        )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    try {
        // 1️⃣ 먼저 기존 테스트 계정 정리 (이전 테스트 실패로 남아있을 수 있음)
        console.log('🧹 기존 테스트 계정 정리 중...')
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const testUsers = existingUsers.users.filter((user) => user.email?.includes('e2e@example.com'))

        for (const user of testUsers) {
            await supabase.auth.admin.deleteUser(user.id)
            console.log(`   삭제: ${user.email}`)
        }

        if (testUsers.length > 0) {
            console.log(`✅ ${testUsers.length}개 기존 계정 정리 완료\n`)
        }

        // 2️⃣ Free 티어 테스트 계정 생성
        console.log('📝 Free 티어 테스트 계정 생성 중...')
        const { data: freeUser, error: freeError } = await supabase.auth.admin.createUser({
            email: 'test-free-e2e@example.com',
            password: 'test-password-e2e-123',
            email_confirm: true,
        })

        if (freeError) {
            console.error('❌ Free 계정 생성 실패:', freeError)
            throw freeError
        }

        // Free 티어로 프로필 설정 (기본값이 'free'이므로 생략 가능하지만 명시적으로)
        await supabase.from('profiles').update({ subscription_tier: 'free' }).eq('id', freeUser.user!.id)

        console.log(`✅ Free 계정 생성: ${freeUser.user!.email}`)

        // 3️⃣ Pro 티어 테스트 계정 생성
        console.log('📝 Pro 티어 테스트 계정 생성 중...')
        const { data: proUser, error: proError } = await supabase.auth.admin.createUser({
            email: 'test-pro-e2e@example.com',
            password: 'test-password-e2e-123',
            email_confirm: true,
        })

        if (proError) {
            console.error('❌ Pro 계정 생성 실패:', proError)
            throw proError
        }

        // Pro 티어로 프로필 설정
        await supabase.from('profiles').update({ subscription_tier: 'pro' }).eq('id', proUser.user!.id)

        console.log(`✅ Pro 계정 생성: ${proUser.user!.email}`)
        console.log('✨ E2E 테스트 환경 준비 완료!\n')
    } catch (error) {
        console.error('❌ 테스트 계정 생성 실패:', error)
        throw error
    }
}
