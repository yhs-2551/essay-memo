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

    describe('GET / (List Memos)', () => {
        it('should return 401 if not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })
            const req = new Request('http://localhost/', { method: 'GET' })
            const res = await memos.request(req)
            expect(res.status).toBe(401)
        })

        it('should list memos with pagination and search', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockReturnThis(),
                ilike: vi.fn().mockReturnThis(),
                then: (resolve: any) => resolve({
                    data: [{ id: VALID_UUID, content: 'Test Memo' }],
                    error: null,
                    count: 1
                })
            }
            mockSupabase.from.mockReturnValue(mockChain)

            const req = new Request('http://localhost/?q=test&page=2', { method: 'GET' })
            const res = await memos.request(req)

            expect(res.status).toBe(200)
            const json = await res.json()
            expect(json.memos).toHaveLength(1)
            expect(mockSupabase.from).toHaveBeenCalledWith('memos')
            expect(mockChain.ilike).toHaveBeenCalledWith('content', '%test%')
            // Page 2, limit 20 (default) -> offset 20, to 39
            expect(mockChain.range).toHaveBeenCalledWith(20, 39)
        })
    })

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

        it('should create a memo successfully', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

            const mockInsert = {
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: VALID_UUID, content: 'Memo Content' },
                    error: null
                })
            }
            mockSupabase.from.mockReturnValue(mockInsert)

            const req = new Request('http://localhost/', {
                method: 'POST',
                body: JSON.stringify({ content: 'Memo Content' }),
                headers: { 'Content-Type': 'application/json' },
            })

            const res = await memos.request(req)
            expect(res.status).toBe(200)
            const json = await res.json()
            expect(json.content).toBe('Memo Content')
        })
    })

    describe('PATCH /:id', () => {
        it('should return 401 if not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })
            const req = new Request(`http://localhost/${VALID_UUID}`, {
                method: 'PATCH',
                body: JSON.stringify({ content: 'Updated' }),
                headers: { 'Content-Type': 'application/json' },
            })
            const res = await memos.request(req)
            expect(res.status).toBe(401)
        })

        it('should update a memo successfully', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

            const mockUpdate = {
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: VALID_UUID, content: 'Updated' },
                    error: null
                })
            }
            mockSupabase.from.mockReturnValue(mockUpdate)

            const req = new Request(`http://localhost/${VALID_UUID}`, {
                method: 'PATCH',
                body: JSON.stringify({ content: 'Updated' }),
                headers: { 'Content-Type': 'application/json' },
            })

            const res = await memos.request(req)
            expect(res.status).toBe(200)
            expect(mockUpdate.update).toHaveBeenCalledWith(expect.objectContaining({ content: 'Updated' }))
            expect(mockUpdate.eq).toHaveBeenCalledWith('id', VALID_UUID)
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
                body: JSON.stringify({ ids: [VALID_UUID, '123e4567-e89b-12d3-a456-426614174001'] }),
                headers: { 'Content-Type': 'application/json' },
            })

            const res = await memos.request(req)
            expect(res.status).toBe(401)
        })

        it('should return 403 if bulk delete blocked by RLS (count mismatch)', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

            // Should match 2 IDs, but delete returns count 0
            const mockDelete = {
                in: vi.fn().mockResolvedValue({ error: null, count: 0 })
            }
            mockSupabase.from.mockReturnValue({
                delete: vi.fn(() => mockDelete)
            })

            const req = new Request(`http://localhost/bulk-delete`, {
                method: 'POST',
                body: JSON.stringify({ ids: [VALID_UUID, '123e4567-e89b-12d3-a456-426614174001'] }),
                headers: { 'Content-Type': 'application/json' },
            })

            const res = await memos.request(req)
            expect(res.status).toBe(403)
        })
    })
})
