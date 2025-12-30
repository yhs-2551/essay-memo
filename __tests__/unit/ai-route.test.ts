import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ai } from '@/server/routes/ai'

// Mock dependencies
const mockSupabase = {
    auth: {
        getUser: vi.fn(),
    },
    from: vi.fn(),
    functions: {
        invoke: vi.fn(),
    },
}

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/lib/logger', () => ({
    logActivity: vi.fn(),
}))

describe('AI Route Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const VALID_UUID_1 = '123e4567-e89b-12d3-a456-426614174001'
    const VALID_UUID_2 = '123e4567-e89b-12d3-a456-426614174002'
    const VALID_UUID_3 = '123e4567-e89b-12d3-a456-426614174003'

    it('should return 401 if not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })

        const req = new Request('http://localhost/analyze', {
            method: 'POST',
            body: JSON.stringify({ postId: VALID_UUID_1, persona: 'prism' }),
            headers: { 'Content-Type': 'application/json' },
        })

        const res = await ai.request(req)
        expect(res.status).toBe(401)
    })

    it('should enforce Free tier limit (2)', async () => {
        // User logged in
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

        // Profile mock: Free tier, already used 2
        const mockProfileQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: {
                    consultation_count: 2,
                    last_consultation_date: new Date().toISOString(),
                    subscription_tier: 'free',
                },
                error: null,
            }),
        }
        mockSupabase.from.mockReturnValueOnce(mockProfileQuery) // 1st call for profile

        const req = new Request('http://localhost/analyze', {
            method: 'POST',
            body: JSON.stringify({ postId: VALID_UUID_2, persona: 'prism' }),
            headers: { 'Content-Type': 'application/json' },
        })

        const res = await ai.request(req)
        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.error).toContain('limit reached')
    })

    it('should enforce Pro tier limit (10)', async () => {
        // User logged in
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-2' } }, error: null })

        // Profile mock: Pro tier, already used 10
        const mockProfileQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: {
                    consultation_count: 10,
                    last_consultation_date: new Date().toISOString(),
                    subscription_tier: 'pro',
                },
                error: null,
            }),
        }
        mockSupabase.from.mockReturnValueOnce(mockProfileQuery)

        const req = new Request('http://localhost/analyze', {
            method: 'POST',
            body: JSON.stringify({ postId: VALID_UUID_3, persona: 'prism' }),
            headers: { 'Content-Type': 'application/json' },
        })

        const res = await ai.request(req)
        expect(res.status).toBe(403)
    })

    it('should succeed if under limit and process analysis', async () => {
        // User logged in
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-ok' } }, error: null })

        // 1. Profile Check: Free, used 0
        const mockProfileQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: {
                    consultation_count: 0,
                    last_consultation_date: new Date().toISOString(),
                    subscription_tier: 'free',
                },
                error: null,
            }),
        }

        // 2. Post Fetch
        const mockPostQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { id: VALID_UUID_1, content: 'Test content', user_id: 'user-ok' },
                error: null,
            }),
        }

        // 3. Update Profile (Quota)
        const mockUpdateQuery = {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
        }

        // 4. Fetch Result
        const mockResultQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { result: 'Analysis Done' },
                error: null,
            }),
        }

        mockSupabase.from
            .mockReturnValueOnce(mockProfileQuery)
            .mockReturnValueOnce(mockPostQuery)
            .mockReturnValueOnce(mockUpdateQuery)
            .mockReturnValueOnce(mockResultQuery)

        mockSupabase.functions.invoke.mockResolvedValue({ data: {}, error: null })

        const req = new Request('http://localhost/analyze', {
            method: 'POST',
            body: JSON.stringify({ postId: VALID_UUID_1, persona: 'prism' }),
            headers: { 'Content-Type': 'application/json' },
        })

        const res = await ai.request(req)
        expect(res.status).toBe(200)
        expect(mockSupabase.functions.invoke).toHaveBeenCalled()
    })
})
