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

describe('Memo Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

    describe('createMemo', () => {
        it('should return error when not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

            const { createMemo } = await import('@/server/actions/memos')
            const result = await createMemo({ content: 'Test memo' })

            expect(result.error).toBe('인증이 필요합니다.')
        })

        it('should create a memo and return data', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: VALID_UUID, content: 'Test memo', user_id: 'user-1' },
                    error: null,
                }),
            })

            const { createMemo } = await import('@/server/actions/memos')
            const result = await createMemo({ content: 'Test memo' })

            expect(result.data?.id).toBe(VALID_UUID)
        })
    })

    describe('updateMemo', () => {
        it('should return error when not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

            const { updateMemo } = await import('@/server/actions/memos')
            const result = await updateMemo(VALID_UUID, { content: 'Updated' })

            expect(result.error).toBe('인증이 필요합니다.')
        })

        it('should update a memo successfully', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: VALID_UUID, content: 'Updated' },
                    error: null,
                }),
            })

            const { updateMemo } = await import('@/server/actions/memos')
            const result = await updateMemo(VALID_UUID, { content: 'Updated' })

            expect(result.data?.content).toBe('Updated')
        })
    })

    describe('deleteMemo', () => {
        it('should return error when not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

            const { deleteMemo } = await import('@/server/actions/memos')
            const result = await deleteMemo(VALID_UUID)

            expect(result.error).toBe('인증이 필요합니다.')
        })

        it('should delete and return success', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

            mockSupabase.from.mockReturnValue({
                delete: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null, count: 1 }),
                }),
            })

            const { deleteMemo } = await import('@/server/actions/memos')
            const result = await deleteMemo(VALID_UUID)

            expect(result.success).toBe(true)
        })
    })

    describe('bulkDeleteMemos', () => {
        it('should return error when not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

            const { bulkDeleteMemos } = await import('@/server/actions/memos')
            const result = await bulkDeleteMemos([VALID_UUID])

            expect(result.error).toBe('인증이 필요합니다.')
        })

        it('should bulk delete and return count', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

            mockSupabase.from.mockReturnValue({
                delete: vi.fn().mockReturnValue({
                    in: vi.fn().mockResolvedValue({ error: null, count: 2 }),
                }),
            })

            const { bulkDeleteMemos } = await import('@/server/actions/memos')
            const result = await bulkDeleteMemos([VALID_UUID, 'id-2'])

            expect(result.success).toBe(true)
            expect(result.deletedCount).toBe(2)
        })
    })
})
