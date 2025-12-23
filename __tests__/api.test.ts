import { describe, it, expect, vi } from 'vitest'
import { app } from '../server/app'

// Mock Supabase to avoid real DB calls during test
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }) // mock get response
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: '1', content: 'test' }, error: null })
        })
      })
    })
  })
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
      body: JSON.stringify({ content: 'Test Content' })
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.content).toBe('Test Content')
  })
})
