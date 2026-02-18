import { describe, it, expect, vi, beforeEach } from 'vitest'
import { middleware } from '@/middleware'
import { NextRequest, NextResponse } from 'next/server'

// Mock dependencies
const mockSupabase = {
    auth: {
        getUser: vi.fn(),
    },
}

vi.mock('@supabase/ssr', () => ({
    createServerClient: vi.fn(() => mockSupabase),
}))

// Mock NextResponse
vi.mock('next/server', () => {
    return {
        NextResponse: {
            next: vi.fn(() => ({ cookies: { set: vi.fn() } })),
            redirect: vi.fn((url) => ({ status: 307, url: url.toString(), cookies: { set: vi.fn() } })),
        },
        NextRequest: class {
            nextUrl: any
            cookies: any
            constructor(url: string) {
                const u = new URL(url)
                this.nextUrl = u
                this.nextUrl.clone = () => new URL(url)
                this.cookies = {
                    getAll: vi.fn(() => []),
                    set: vi.fn(),
                }
            }
        }
    }
})

describe('Middleware Security', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should allow public routes without authentication', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })

        const req = new NextRequest('http://localhost/')
        const res = await middleware(req)

        expect(NextResponse.next).toHaveBeenCalled()
        expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should allow login route without authentication', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })

        const req = new NextRequest('http://localhost/login')
        const res = await middleware(req)

        expect(NextResponse.next).toHaveBeenCalled()
        expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should redirect unauthenticated user accessing protected route', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })

        const req = new NextRequest('http://localhost/memos')
        const res = await middleware(req)

        expect(NextResponse.redirect).toHaveBeenCalled()
        const redirectUrl = (NextResponse.redirect as any).mock.calls[0][0]

        // The mock implementation of URL.toString() will return the full URL
        const urlStr = redirectUrl.toString()
        expect(urlStr).toContain('/login')
        expect(urlStr).toContain('next=%2Fmemos')
    })

    it('should allow authenticated user accessing protected route', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

        const req = new NextRequest('http://localhost/memos')
        const res = await middleware(req)

        expect(NextResponse.next).toHaveBeenCalled()
        expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it('should allow auth callback route', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })

        const req = new NextRequest('http://localhost/auth/callback')
        const res = await middleware(req)

        expect(NextResponse.next).toHaveBeenCalled()
        expect(NextResponse.redirect).not.toHaveBeenCalled()
    })
})
