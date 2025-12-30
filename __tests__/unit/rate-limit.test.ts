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
    } as any)

const mockContext = (ip: string = '127.0.0.1') =>
    ({
        req: mockRequest(ip),
        json: vi.fn(),
    } as any)

describe('Rate Limit Middleware', () => {
    let mockSupabase: any

    beforeEach(() => {
        vi.clearAllMocks()
        mockSupabase = {
            rpc: vi.fn(),
        }
        ;(createClient as any).mockResolvedValue(mockSupabase)
    })

    it('should allow request if within limit', async () => {
        // Mock RPC success (true = allowed)
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
        // Mock RPC failure (false = blocked)
        mockSupabase.rpc.mockResolvedValue({ data: false, error: null })
        const c = mockContext()

        await rateLimit(c, mockNext)

        expect(mockNext).not.toHaveBeenCalled()
        expect(c.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Too Many Requests' }), 429)
    })

    it('should fail open (allow request) if RPC errors', async () => {
        // Mock RPC error
        mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'DB Error' } })
        const c = mockContext()

        await rateLimit(c, mockNext)

        // Should allow request despite error
        expect(mockNext).toHaveBeenCalled()
        expect(c.json).not.toHaveBeenCalled()
    })
})
