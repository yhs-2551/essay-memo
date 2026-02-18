import { describe, it, expect, vi, beforeEach } from 'vitest'
import { posts } from '@/server/routes/posts'

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

describe('Posts Route Security', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

    describe('GET / (List Posts)', () => {
        it('should return 401 if not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })
            const req = new Request('http://localhost/', { method: 'GET' })
            const res = await posts.request(req)
            expect(res.status).toBe(401)
        })

        it('should list posts with pagination and search', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

            const mockChain = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                then: (resolve: any) => resolve({
                    data: [{ id: VALID_UUID, title: 'Test Post' }],
                    error: null,
                    count: 1
                })
            }
            mockSupabase.from.mockReturnValue(mockChain)

            const req = new Request('http://localhost/?q=test&page=2', { method: 'GET' })
            const res = await posts.request(req)

            expect(res.status).toBe(200)
            const json = await res.json()
            expect(json.posts).toHaveLength(1)
            expect(mockChain.or).toHaveBeenCalledWith(expect.stringContaining('test'))
            expect(mockChain.range).toHaveBeenCalledWith(20, 39)
        })
    })

    describe('GET /:id (Get Post)', () => {
        it('should return 401 if not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })
            const req = new Request(`http://localhost/${VALID_UUID}`, { method: 'GET' })
            const res = await posts.request(req)
            expect(res.status).toBe(401)
        })

        it('should return post with consultation data (array format)', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

            const mockSingle = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: {
                        id: VALID_UUID,
                        title: 'Test Post',
                        consultations: [{ id: 'cons-1', result: 'Analysis' }]
                    },
                    error: null
                })
            }
            mockSupabase.from.mockReturnValue(mockSingle)

            const req = new Request(`http://localhost/${VALID_UUID}`, { method: 'GET' })
            const res = await posts.request(req)

            expect(res.status).toBe(200)
            const json = await res.json()
            expect(json.post.id).toBe(VALID_UUID)
            expect(json.consultation.id).toBe('cons-1')
            // Ensure consultations is removed from post object
            expect(json.post.consultations).toBeUndefined()
        })
    })

    describe('POST / (Create Post)', () => {
        it('should return 401 if not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })

            const req = new Request('http://localhost/', {
                method: 'POST',
                body: JSON.stringify({ title: 'Test', content: 'Content', mode: 'standard' }),
                headers: { 'Content-Type': 'application/json' },
            })

            const res = await posts.request(req)
            expect(res.status).toBe(401)
        })

        it('should create a post successfully', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

            const mockInsert = {
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: VALID_UUID, title: 'Test', user_id: 'user-1' },
                    error: null
                })
            }
            mockSupabase.from.mockReturnValue(mockInsert)

            const req = new Request('http://localhost/', {
                method: 'POST',
                body: JSON.stringify({ title: 'Test', content: 'Content', mode: 'standard' }),
                headers: { 'Content-Type': 'application/json' },
            })

            const res = await posts.request(req)
            expect(res.status).toBe(200)
            const json = await res.json()
            expect(json.title).toBe('Test')
        })

        it('should return 400 if validation fails', async () => {
            const req = new Request('http://localhost/', {
                method: 'POST',
                body: JSON.stringify({ title: '', content: '' }), // Invalid data
                headers: { 'Content-Type': 'application/json' },
            })

            const res = await posts.request(req)
            expect(res.status).toBe(400)
        })
    })

    describe('PATCH /:id', () => {
        it('should return 401 if not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })
            const req = new Request(`http://localhost/${VALID_UUID}`, {
                method: 'PATCH',
                body: JSON.stringify({ title: 'Updated' }),
                headers: { 'Content-Type': 'application/json' },
            })
            const res = await posts.request(req)
            expect(res.status).toBe(401)
        })

        it('should update a post successfully', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

            const mockUpdate = {
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: VALID_UUID, title: 'Updated' },
                    error: null
                })
            }
            mockSupabase.from.mockReturnValue(mockUpdate)

            const req = new Request(`http://localhost/${VALID_UUID}`, {
                method: 'PATCH',
                body: JSON.stringify({ title: 'Updated' }),
                headers: { 'Content-Type': 'application/json' },
            })

            const res = await posts.request(req)
            expect(res.status).toBe(200)
            expect(mockUpdate.update).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated' }))
        })
    })

    describe('DELETE /:id', () => {
        it('should return 401 if not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })

            const req = new Request(`http://localhost/${VALID_UUID}`, {
                method: 'DELETE',
            })

            const res = await posts.request(req)
            expect(res.status).toBe(401)
        })

        it('should return 403 if RLS policy blocks deletion (count=0)', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

            // Mock delete to return count 0 (RLS blocking or not found)
            const mockDelete = {
                eq: vi.fn().mockResolvedValue({ error: null, count: 0 }),
            }
            mockSupabase.from.mockReturnValue({
                delete: vi.fn(() => mockDelete),
            })

            const req = new Request(`http://localhost/${VALID_UUID}`, {
                method: 'DELETE',
            })

            const res = await posts.request(req)
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

            const res = await posts.request(req)
            expect(res.status).toBe(401)
        })

        it('should return 403 if 0 items deleted (RLS blocking)', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

            const mockIn = vi.fn().mockResolvedValue({ error: null, count: 0 })
            mockSupabase.from.mockReturnValue({
                delete: vi.fn(() => ({
                    in: mockIn,
                })),
            })

            const req = new Request(`http://localhost/bulk-delete`, {
                method: 'POST',
                body: JSON.stringify({ ids: [VALID_UUID] }),
                headers: { 'Content-Type': 'application/json' },
            })

            const res = await posts.request(req)
            expect(res.status).toBe(403)
            expect(await res.json()).toEqual(expect.objectContaining({ error: expect.stringContaining('No posts were deleted') }))
        })
    })
})
