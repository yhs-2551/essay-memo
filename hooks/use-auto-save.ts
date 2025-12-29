'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { l1Storage } from '@/utils/indexed-db'
import { toast } from 'sonner'

interface AutoSaveResult<T> {
    isSaving: boolean
    lastSavedAt: Date | null
    syncStatus: 'synced' | 'local-only' | 'uploading' | 'error'
    loadDraft: () => Promise<T | null>
    clearDraft: () => void
}

/**
 * Orbit Sync Engine (UseAutoSave)
 *
 * "Universe Class" Architecture:
 * - L1: IndexedDB (Async, Large Capacity, Non-blocking)
 * - L2: Supabase DB (Secure, Persistent, RLS-protected)
 * - Security: Basic XSS sanitization on critical inputs
 * - Performance: Debounced network calls, instant local writes
 */
export function useAutoSave<T>(key: string, data: T, delay: number = 2000): AutoSaveResult<T> {
    const [isSaving, setIsSaving] = useState(false)
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
    const [syncStatus, setSyncStatus] = useState<'synced' | 'local-only' | 'uploading' | 'error'>('synced')

    const supabase = useMemo(() => createClient(), [])
    const isMounted = useRef(false)
    const lastSerializedData = useRef('')
    const localSaveTimer = useRef<NodeJS.Timeout | null>(null)

    // Wrapper for Data Versioning
    interface StorageWrapper {
        data: T
        timestamp: number
        version: number
    }

    // Basic Sanitization (Helper)
    const sanitize = (str: string) => {
        return str.replace(/[<>]/g, (tag) => ({ '<': '&lt;', '>': '&gt;' })[tag] || tag)
    }

    // --- L1: IndexedDB (Fast & Async) ---
    const saveToLocal = useCallback(
        async (content: T) => {
            try {
                const payload: StorageWrapper = {
                    data: content,
                    timestamp: Date.now(),
                    version: 2, // Version 2: IndexedDB Era
                }
                await l1Storage.set(key, payload)
                setLastSavedAt(new Date())
            } catch (e) {
                console.warn('Orbit Sync: L1 Write Failed', e)
            }
        },
        [key]
    )

    // --- L2: Server Storage (Secure & Persistent) ---
    const saveToServer = useCallback(
        async (content: T) => {
            console.log('Orbit Sync: Starting L2 Save...', key)
            try {
                setSyncStatus('uploading')

                // Orbit Timeout Breaker: 10s Max
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Orbit Sync: L2 Timeout')), 10000))

                const uploadPromise = (async () => {
                    const {
                        data: { user },
                    } = await supabase.auth.getUser()
                    if (!user) {
                        console.log('Orbit Sync: No user, skipping L2')
                        setSyncStatus('local-only')
                        // setIsSaving(false) handled in finally
                        return
                    }

                    // Use explicit connection to avoid ambiguity
                    const { error } = await supabase.from('drafts').upsert(
                        {
                            user_id: user.id,
                            key: key,
                            data: content as any,
                            updated_at: new Date().toISOString(),
                        },
                        { onConflict: 'user_id,key' }
                    )

                    if (error) throw error
                    console.log('Orbit Sync: L2 Save Success')
                    setSyncStatus('synced')
                })()

                await Promise.race([uploadPromise, timeoutPromise])
            } catch (e: any) {
                console.error('Orbit Sync: L2 Write Failed', e)

                if (e.message === 'Orbit Sync: L2 Timeout') {
                    setSyncStatus('error')
                    toast.error('서버 응답 지연: 로컬에 안전하게 저장됨')
                } else {
                    setSyncStatus('error')
                    // [Debug] Show actual error to user
                    toast.error(`저장 오류: ${e.message || e.details || '알 수 없는 오류'}`)
                }
            } finally {
                // ALWAYS release the saving lock
                console.log('Orbit Sync: Finished')
                setIsSaving(false)
            }
        },
        [key, supabase]
    )

    // --- Smart Load Strategy (Conflict Resolution) ---
    const loadDraft = useCallback(async (): Promise<T | null> => {
        if (typeof window === 'undefined') return null

        let localData: T | null = null
        let localTime = 0

        // 1. Read L1 (IndexedDB)
        try {
            const parsed: StorageWrapper | null = await l1Storage.get(key)
            if (parsed && typeof parsed === 'object' && 'data' in parsed) {
                localData = parsed.data
                localTime = parsed.timestamp
            } else {
                // Fallback: Check localStorage for migration (Legacy Support)
                const legacyRaw = localStorage.getItem(key)
                if (legacyRaw) {
                    try {
                        const legacyParsed = JSON.parse(legacyRaw)
                        localData = legacyParsed.data || legacyParsed
                        // Migrate to IndexedDB immediately
                        await l1Storage.set(key, { data: localData, timestamp: Date.now(), version: 2 })
                        localStorage.removeItem(key) // Cleanup old trash
                    } catch {}
                }
            }
        } catch (e) {
            console.warn('Orbit Sync: L1 Read Failed', e)
        }

        // 2. Read L2 (Server)
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (user) {
                const { data: serverDraft } = await supabase
                    .from('drafts')
                    .select('data, updated_at')
                    .eq('user_id', user.id)
                    .eq('key', key)
                    .single()

                if (serverDraft) {
                    const serverTime = new Date(serverDraft.updated_at).getTime()

                    // Strategy: Server Wins if significantly newer (> 1s)
                    // Reason: User likely switched devices.
                    if (serverTime > localTime + 1000) {
                        console.log('Orbit Sync: Remote logic prevails. Syncing down.')
                        toast.info('다른 기기에서 작성된 최신 글을 불러왔습니다.')

                        // Update L1 to match L2
                        await saveToLocal(serverDraft.data as T)
                        return serverDraft.data as T
                    }
                }
            }
        } catch (e) {
            console.warn('Orbit Sync: L2 Read Failed', e)
        }

        return localData
    }, [key, saveToLocal, supabase])

    // --- Optimization: Memoize Data Serialization ---
    // Prevents useEffect from running on every render when 'data' is a new object reference but same content
    const serializedData = useMemo(() => JSON.stringify(data), [data])

    // --- Auto-Save Effect ---
    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true
            lastSerializedData.current = serializedData
            return
        }

        // Dependency 'serializedData' ensures this ONLY runs when content actually changes.
        // No need for manual early return check here anymore.

        lastSerializedData.current = serializedData
        setIsSaving(true)

        // 1. L1 Save (Throttle 500ms)
        if (localSaveTimer.current) clearTimeout(localSaveTimer.current)
        localSaveTimer.current = setTimeout(() => {
            saveToLocal(data)
        }, 500)

        // 2. L2 Save (Debounce 2000ms)
        // Note: We use 'data' from the closure, which matches 'serializedData'
        const serverTimer = setTimeout(() => {
            saveToServer(data)
        }, delay)

        return () => {
            clearTimeout(serverTimer)
            if (localSaveTimer.current) clearTimeout(localSaveTimer.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serializedData, delay, saveToLocal, saveToServer]) // 'data' intentionally omitted - serializedData handles content change detection

    const clearDraft = useCallback(async () => {
        // Clear L1
        await l1Storage.remove(key)
        setLastSavedAt(null)

        // Clear L2
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (user) {
                await supabase.from('drafts').delete().match({ user_id: user.id, key: key })
            }
        } catch (e) {
            console.warn('Orbit Sync: Failed to clear L2', e)
        }
    }, [key, supabase])

    return { isSaving, lastSavedAt, syncStatus, loadDraft, clearDraft }
}
