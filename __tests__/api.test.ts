import { describe, it, expect, vi } from 'vitest'
import { app } from '../server/app'

// Mock Supabase to avoid real DB calls during test
vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: {
            getUser: () =>
                Promise.resolve({
                    data: { user: { id: 'test-user-123' } },
                    error: null,
                }),
        },
        from: () => ({
            select: () => ({
                order: () => ({
                    range: () => Promise.resolve({ data: [], error: null, count: 0 }),
                }),
            }),
            insert: () => ({
                select: () => ({
                    single: () => Promise.resolve({ data: { id: '1', content: 'Test Content', user_id: 'test-user-123' }, error: null }),
                }),
            }),
        }),
    }),
}))

describe('Hono Backend API', () => {
    it('GET /api/memos returns memos', async () => {
        const res = await app.request('/api/memos')
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data).toHaveProperty('memos')
    })

    it('POST /api/memos creates a memo', async () => {
        const res = await app.request('/api/memos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: 'Test Content' }),
        })
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.content).toBe('Test Content')
    })
})
