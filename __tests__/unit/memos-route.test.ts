import { describe, it, expect, vi, beforeEach } from 'vitest'
import { memos } from '@/server/routes/memos'

// Mock dependencies
const mockSupabase = {
    auth: {
        getUser: vi.fn(),
    },
    from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/lib/logger', () => ({
    logActivity: vi.fn(),
}))

describe('Memos Route Security', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

    describe('POST / (Create Memo)', () => {
        it('should return 401 if not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })

            const req = new Request('http://localhost/', {
                method: 'POST',
                body: JSON.stringify({ content: 'Memo Content' }),
                headers: { 'Content-Type': 'application/json' },
            })

            const res = await memos.request(req)
            expect(res.status).toBe(401)
        })
    })

    describe('DELETE /:id', () => {
        it('should return 401 if not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })

            const req = new Request(`http://localhost/${VALID_UUID}`, {
                method: 'DELETE',
            })

            const res = await memos.request(req)
            expect(res.status).toBe(401)
        })

        it('should return 403 if RLS policy blocks deletion (count=0)', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

            // Mock delete to return count 0
            const mockDelete = {
                eq: vi.fn().mockResolvedValue({ error: null, count: 0 }),
            }
            mockSupabase.from.mockReturnValue({
                delete: vi.fn(() => mockDelete),
            })

            const req = new Request(`http://localhost/${VALID_UUID}`, {
                method: 'DELETE',
            })

            const res = await memos.request(req)
            expect(res.status).toBe(403)
            expect(await res.json()).toEqual(expect.objectContaining({ error: expect.stringContaining('not have permission') }))
        })
    })

    describe('POST /bulk-delete', () => {
        it('should return 401 if not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })

            const req = new Request(`http://localhost/bulk-delete`, {
                method: 'POST',
                body: JSON.stringify({ ids: [VALID_UUID] }),
                headers: { 'Content-Type': 'application/json' },
            })

            const res = await memos.request(req)
            expect(res.status).toBe(401)
        })
    })
})
