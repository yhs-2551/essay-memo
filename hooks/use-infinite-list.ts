'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseInfiniteListOptions<T> {
    initialItems: T[]
    fetchUrl: string
    limit?: number
}

interface UseInfiniteListResult<T> {
    items: T[]
    setItems: React.Dispatch<React.SetStateAction<T[]>>
    fetching: boolean
    loadingMore: boolean
    searchQuery: string
    setSearchQuery: (query: string) => void
    page: number
    hasMore: boolean
    error: boolean
    dateFilter: string
    setDateFilter: (filter: string) => void
    observerTarget: React.RefObject<HTMLDivElement>
    refreshItems: () => void
}

/**
 * Unified Infinite Scroll Hook
 * Handles pagination, search, and infinite scrolling for list views
 */
export function useInfiniteList<T extends { id: string; created_at: string }>(
    options: UseInfiniteListOptions<T>
): UseInfiniteListResult<T> {
    const { initialItems, fetchUrl, limit = 20 } = options

    const [items, setItems] = useState<T[]>(initialItems)
    const [fetching, setFetching] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(initialItems.length >= limit)
    const [error, setError] = useState(false)
    const [dateFilter, setDateFilter] = useState('')
    const observerTarget = useRef<HTMLDivElement>(null)
    const isFirstRender = useRef(true)

    // ===== Fetch Logic =====

    useEffect(() => {
        // Guard: Skip first render if no query and page is 1
        if (isFirstRender.current && page === 1 && searchQuery === '') {
            isFirstRender.current = false
            return
        }

        const fetchItems = async () => {
            setFetching(page === 1)
            setLoadingMore(page > 1)

            try {
                const query = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''
                const res = await fetch(`${fetchUrl}?page=${page}&limit=${limit}${query}`)

                if (!res.ok) throw new Error('Fetch failed')

                const data = await res.json()
                const newItems = data.posts || data.memos || []

                setItems((prev) => (page === 1 ? newItems : [...prev, ...newItems]))
                setHasMore(data.hasMore || false)
                setError(false)
            } catch (e) {
                console.error('Fetch error:', e)
                setError(true)
            } finally {
                setFetching(false)
                setLoadingMore(false)
            }
        }

        fetchItems()
    }, [searchQuery, page, fetchUrl, limit])

    // ===== Infinite Scroll Observer =====

    useEffect(() => {
        if (!observerTarget.current) return
        if (loadingMore || !hasMore) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setPage((prev) => prev + 1)
                }
            },
            { threshold: 1.0 }
        )

        observer.observe(observerTarget.current)
        return () => observer.disconnect()
    }, [loadingMore, hasMore])

    // ===== Search Handler =====

    useEffect(() => {
        if (isFirstRender.current) return
        setPage(1)
        setItems([])
    }, [searchQuery])

    // ===== Refresh Handler =====

    const refreshItems = useCallback(() => {
        setPage(1)
        setItems([])
    }, [])

    return {
        items,
        setItems,
        fetching,
        loadingMore,
        searchQuery,
        setSearchQuery,
        page,
        hasMore,
        error,
        dateFilter,
        setDateFilter,
        observerTarget,
        refreshItems,
    }
}
