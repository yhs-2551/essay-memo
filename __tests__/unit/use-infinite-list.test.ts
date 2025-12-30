import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useInfiniteList } from '@/hooks/use-infinite-list'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useInfiniteList Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockFetch.mockReset()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    const mockInitialItems = [
        { id: '1', created_at: new Date().toISOString() },
        { id: '2', created_at: new Date().toISOString() },
    ]

    it('initializes with provided items', () => {
        const { result } = renderHook(() =>
            useInfiniteList({
                initialItems: mockInitialItems,
                fetchUrl: '/api/test',
            })
        )

        expect(result.current.items).toEqual(mockInitialItems)
        expect(result.current.fetching).toBe(false)
        expect(result.current.page).toBe(1)
    })

    it('hasMore is true when initial items >= limit', () => {
        const manyItems = Array.from({ length: 20 }, (_, i) => ({
            id: String(i),
            created_at: new Date().toISOString(),
        }))

        const { result } = renderHook(() =>
            useInfiniteList({
                initialItems: manyItems,
                fetchUrl: '/api/test',
                limit: 20,
            })
        )

        expect(result.current.hasMore).toBe(true)
    })

    it('hasMore is false when initial items < limit', () => {
        const fewItems = [{ id: '1', created_at: new Date().toISOString() }]

        const { result } = renderHook(() =>
            useInfiniteList({
                initialItems: fewItems,
                fetchUrl: '/api/test',
                limit: 20,
            })
        )

        expect(result.current.hasMore).toBe(false)
    })

    it('setSearchQuery triggers data reset and refetch', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ posts: [], hasMore: false }),
        })

        const { result } = renderHook(() =>
            useInfiniteList({
                initialItems: mockInitialItems,
                fetchUrl: '/api/posts',
            })
        )

        act(() => {
            result.current.setSearchQuery('test query')
        })

        await waitFor(() => {
            expect(result.current.searchQuery).toBe('test query')
        })

        // After setting searchQuery, items should be cleared and refetched
        expect(result.current.items).toEqual([])
    })

    it('refreshItems resets to page 1', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ posts: [], hasMore: false }),
        })

        const { result } = renderHook(() =>
            useInfiniteList({
                initialItems: mockInitialItems,
                fetchUrl: '/api/posts',
            })
        )

        act(() => {
            result.current.refreshItems()
        })

        expect(result.current.items).toEqual([])
    })

    it('handles fetch error gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
        })

        const { result } = renderHook(() =>
            useInfiniteList({
                initialItems: [],
                fetchUrl: '/api/posts',
            })
        )

        // Trigger a fetch by changing search query
        act(() => {
            result.current.setSearchQuery('trigger fetch')
        })

        await waitFor(() => {
            expect(result.current.error).toBe(true)
        })
    })

    it('dateFilter state is properly managed', () => {
        const { result } = renderHook(() =>
            useInfiniteList({
                initialItems: mockInitialItems,
                fetchUrl: '/api/test',
            })
        )

        act(() => {
            result.current.setDateFilter('2025-01')
        })

        expect(result.current.dateFilter).toBe('2025-01')
    })
})
