import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/lib/logger', () => ({
    logActivity: vi.fn(),
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

describe('Post Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

    describe('createPost', () => {
        it('should return error when not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

            const { createPost } = await import('@/server/actions/posts')
            const result = await createPost({ title: 'Test', content: 'Content', mode: 'standard' })

            expect(result.error).toBe('인증이 필요합니다.')
        })

        it('should create a post and return data', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

            const mockChain = {
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: VALID_UUID, title: 'Test', user_id: 'user-1' },
                    error: null,
                }),
            }
            mockSupabase.from.mockReturnValue(mockChain)

            const { createPost } = await import('@/server/actions/posts')
            const result = await createPost({ title: 'Test', content: 'Content', mode: 'standard' })

            expect(result.data?.id).toBe(VALID_UUID)
            expect(result.error).toBeUndefined()
            expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({ title: 'Test', content: 'Content', user_id: 'user-1' }))
        })

        it('should return error on DB failure', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
            })

            const { createPost } = await import('@/server/actions/posts')
            const result = await createPost({ title: 'Test', content: 'Content', mode: 'standard' })

            expect(result.error).toBe('DB error')
        })
    })

    describe('updatePost', () => {
        it('should return error when not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

            const { updatePost } = await import('@/server/actions/posts')
            const result = await updatePost(VALID_UUID, { title: 'Updated' })

            expect(result.error).toBe('인증이 필요합니다.')
        })

        it('should update a post successfully', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: VALID_UUID, title: 'Updated' },
                    error: null,
                }),
            })

            const { updatePost } = await import('@/server/actions/posts')
            const result = await updatePost(VALID_UUID, { title: 'Updated' })

            expect(result.data?.title).toBe('Updated')
        })
    })

    describe('deletePost', () => {
        it('should return error when not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

            const { deletePost } = await import('@/server/actions/posts')
            const result = await deletePost(VALID_UUID)

            expect(result.error).toBe('인증이 필요합니다.')
        })

        it('should delete and return success', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

            mockSupabase.from.mockReturnValue({
                delete: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null, count: 1 }),
                }),
            })

            const { deletePost } = await import('@/server/actions/posts')
            const result = await deletePost(VALID_UUID)

            expect(result.success).toBe(true)
        })

        it('should return error when count is 0 (not found or no permission)', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

            mockSupabase.from.mockReturnValue({
                delete: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null, count: 0 }),
                }),
            })

            const { deletePost } = await import('@/server/actions/posts')
            const result = await deletePost(VALID_UUID)

            expect(result.error).toContain('찾을 수 없')
        })
    })

    describe('bulkDeletePosts', () => {
        it('should return error when not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

            const { bulkDeletePosts } = await import('@/server/actions/posts')
            const result = await bulkDeletePosts([VALID_UUID])

            expect(result.error).toBe('인증이 필요합니다.')
        })

        it('should bulk delete and return count', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

            mockSupabase.from.mockReturnValue({
                delete: vi.fn().mockReturnValue({
                    in: vi.fn().mockResolvedValue({ error: null, count: 3 }),
                }),
            })

            const { bulkDeletePosts } = await import('@/server/actions/posts')
            const result = await bulkDeletePosts([VALID_UUID, 'id-2', 'id-3'])

            expect(result.success).toBe(true)
            expect(result.deletedCount).toBe(3)
        })
    })
})
