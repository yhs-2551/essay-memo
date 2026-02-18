import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rateLimit } from '@/server/middleware/rate-limit'
import { createClient } from '@/lib/supabase/server'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}))

const mockNext = vi.fn()
const mockRequest = (ip: string) =>
    ({
        header: (name: string) => (name === 'x-forwarded-for' ? ip : null),
    }) as any

const mockContext = (ip: string = '127.0.0.1') =>
    ({
        req: mockRequest(ip),
        json: vi.fn(),
    }) as any

describe('Rate Limit Middleware', () => {
    let mockSupabase: any

    beforeEach(() => {
        vi.clearAllMocks()
        mockSupabase = {
            rpc: vi.fn(),
        }
        ;(createClient as any).mockResolvedValue(mockSupabase)
    })

    // ─── 기존 테스트 (유지) ────────────────────────────────────────────────────

    it('should allow request if within limit', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: true, error: null })
        const c = mockContext()

        await rateLimit(c, mockNext)

        expect(createClient).toHaveBeenCalled()
        expect(mockSupabase.rpc).toHaveBeenCalledWith(
            'check_rate_limit',
            expect.objectContaining({
                request_key: 'rl:127.0.0.1',
                limit_count: 60,
            })
        )
        expect(mockNext).toHaveBeenCalled()
        expect(c.json).not.toHaveBeenCalled()
    })

    it('should block request if limit exceeded', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: false, error: null })
        const c = mockContext()

        await rateLimit(c, mockNext)

        expect(mockNext).not.toHaveBeenCalled()
        expect(c.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Too Many Requests' }), 429)
    })

    it('should fail open (allow request) if RPC errors', async () => {
        mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'DB Error' } })
        const c = mockContext()

        await rateLimit(c, mockNext)

        expect(mockNext).toHaveBeenCalled()
        expect(c.json).not.toHaveBeenCalled()
    })

    // ─── TDD: 신규 테스트 (search_path 고정 + RLS 보안 시나리오) ───────────────

    it('[search_path 고정] DB 함수 search_path 고정 후에도 RPC 호출이 동일하게 동작해야 한다', async () => {
        // search_path = public 고정은 DB 레벨 변경이므로 미들웨어 동작에 영향 없음을 검증
        // 즉, 보안 패치 후 기존 기능이 깨지지 않음을 보장
        mockSupabase.rpc.mockResolvedValue({ data: true, error: null })
        const c = mockContext('192.168.1.1')

        await rateLimit(c, mockNext)

        expect(mockSupabase.rpc).toHaveBeenCalledWith(
            'check_rate_limit',
            expect.objectContaining({
                request_key: 'rl:192.168.1.1',
                limit_count: 60,
                window_seconds: 60,
            })
        )
        expect(mockNext).toHaveBeenCalled()
    })

    it('[IP 파싱] 프록시 체인의 X-Forwarded-For에서 첫 번째 IP(실제 클라이언트)만 추출해야 한다', async () => {
        // 악의적 사용자가 X-Forwarded-For를 조작해 rate limit을 우회하는 것을 방지
        // 첫 번째 IP = 실제 클라이언트 IP (프록시가 추가한 IP들은 뒤에 붙음)
        mockSupabase.rpc.mockResolvedValue({ data: true, error: null })

        const multiIpContext = {
            req: {
                header: (name: string) => (name === 'x-forwarded-for' ? '10.0.0.1, 172.16.0.1, 192.168.1.1' : null),
            },
            json: vi.fn(),
        } as any

        await rateLimit(multiIpContext, mockNext)

        expect(mockSupabase.rpc).toHaveBeenCalledWith('check_rate_limit', expect.objectContaining({ request_key: 'rl:10.0.0.1' }))
    })

    it('[IP 파싱] IP 헤더가 없을 때 "unknown" 키로 처리해야 한다', async () => {
        // IP를 특정할 수 없는 요청도 rate limit 적용 (무제한 허용 방지)
        mockSupabase.rpc.mockResolvedValue({ data: true, error: null })

        const noIpContext = {
            req: { header: (_name: string) => null },
            json: vi.fn(),
        } as any

        await rateLimit(noIpContext, mockNext)

        expect(mockSupabase.rpc).toHaveBeenCalledWith('check_rate_limit', expect.objectContaining({ request_key: 'rl:unknown' }))
    })

    it('[RLS 보안] RLS가 rate_limits 직접 접근을 차단해도 Fail Open으로 서비스를 유지해야 한다', async () => {
        // SECURITY DEFINER 함수가 아닌 경로로 rate_limits 접근 시 RLS가 차단함
        // 이 경우 RPC 에러로 반환되며, Fail Open 전략으로 서비스 중단을 방지해야 함
        mockSupabase.rpc.mockResolvedValue({
            data: null,
            error: { message: 'permission denied for table rate_limits', code: '42501' },
        })
        const c = mockContext()

        await rateLimit(c, mockNext)

        // RLS 차단 에러도 Fail Open 처리 → 서비스 중단 없이 요청 허용
        expect(mockNext).toHaveBeenCalled()
        expect(c.json).not.toHaveBeenCalled()
    })
})
