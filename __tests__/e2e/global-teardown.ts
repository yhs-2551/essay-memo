import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// .env.test 파일 명시적으로 로드
config({ path: resolve(__dirname, '../../.env.test') })

/**
 * Playwright Global Teardown
 * 테스트 종료 후 자동으로 테스트 계정 삭제
 */
export default async function globalTeardown() {
    console.log('\n🧹 E2E 테스트 환경 정리 중...')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        console.warn('⚠️ 환경 변수가 없어 테스트 계정을 삭제할 수 없습니다.')
        return
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })

    try {
        // 모든 사용자 조회
        const { data, error } = await supabase.auth.admin.listUsers()

        if (error) throw error

        // 'e2e@example.com'이 포함된 테스트 계정만 필터링
        const testUsers = data.users.filter((user) => user.email?.includes('e2e@example.com'))

        if (testUsers.length === 0) {
            console.log('ℹ️  삭제할 테스트 계정이 없습니다.')
            return
        }

        // 테스트 계정 삭제
        for (const user of testUsers) {
            await supabase.auth.admin.deleteUser(user.id)
            console.log(`🗑️  테스트 계정 삭제: ${user.email}`)
        }

        console.log(`✅ 총 ${testUsers.length}개 테스트 계정 정리 완료\n`)
    } catch (error) {
        console.error('❌ 테스트 계정 정리 실패:', error)
        // Teardown 실패는 치명적이지 않으므로 throw하지 않음
    }
}
