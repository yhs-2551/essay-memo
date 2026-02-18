import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUsageStore } from '@/hooks/use-usage-limit'

// Mock dependencies
const mockSupabase = {
    auth: {
        getUser: vi.fn(),
    },
    from: vi.fn(),
}

vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn(() => mockSupabase),
}))

describe('useUsageStore', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Reset store state
        act(() => {
            useUsageStore.setState({ count: 0, loading: true, isSubscribed: false })
        })
    })

    it('should initialize with default values', () => {
        const { result } = renderHook(() => useUsageStore())
        expect(result.current.count).toBe(0)
        expect(result.current.loading).toBe(true)
        expect(result.current.isSubscribed).toBe(false)
    })

    it('should increment count', () => {
        const { result } = renderHook(() => useUsageStore())

        act(() => {
            result.current.increment()
        })

        expect(result.current.count).toBe(1)
    })

    it('should set subscribed status', () => {
        const { result } = renderHook(() => useUsageStore())

        act(() => {
            result.current.setSubscribed(true)
        })

        expect(result.current.isSubscribed).toBe(true)
    })

    it('should reset count and loading if user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: 'No user' })

        const { result } = renderHook(() => useUsageStore())

        await act(async () => {
            await result.current.refreshUsage()
        })

        expect(result.current.count).toBe(0)
        expect(result.current.loading).toBe(false)
        expect(result.current.isSubscribed).toBe(false)
    })

    it('should load usage and check date reset (same day)', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

        const today = new Date().toISOString()
        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: {
                    consultation_count: 5,
                    last_consultation_date: today,
                    subscription_tier: 'free',
                },
                error: null,
            }),
        })

        const { result } = renderHook(() => useUsageStore())

        await act(async () => {
            await result.current.refreshUsage()
        })

        expect(result.current.count).toBe(5)
        expect(result.current.loading).toBe(false)
        expect(result.current.isSubscribed).toBe(false)
    })

    it('should reset count if date is different', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)

        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: {
                    consultation_count: 5,
                    last_consultation_date: yesterday.toISOString(),
                    subscription_tier: 'free',
                },
                error: null,
            }),
        })

        const { result } = renderHook(() => useUsageStore())

        await act(async () => {
            await result.current.refreshUsage()
        })

        expect(result.current.count).toBe(0) // Reset to 0
        expect(result.current.loading).toBe(false)
    })

    it('should set isSubscribed to true for pro tier', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: {
                    consultation_count: 0,
                    last_consultation_date: new Date().toISOString(),
                    subscription_tier: 'pro',
                },
                error: null,
            }),
        })

        const { result } = renderHook(() => useUsageStore())

        await act(async () => {
            await result.current.refreshUsage()
        })

        expect(result.current.isSubscribed).toBe(true)
    })
})
