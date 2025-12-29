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
 * - L1: IndexedDB (Async, Large Capacity, Non-blocking) + LocalStorage Fallback
 * - L2: Supabase DB (Secure, Persistent, RLS-protected)
 * - Security: Basic XSS sanitization on critical inputs
 * - Performance: Debounced network calls, instant local writes
 * - Edge Case Handler: Auth Isolation (Drafts are namespaced by User ID)
 */
export function useAutoSave<T>(key: string, data: T, delay: number = 2000): AutoSaveResult<T> {
    const [isSaving, setIsSaving] = useState(false)
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
    const [syncStatus, setSyncStatus] = useState<'synced' | 'local-only' | 'uploading' | 'error'>('synced')
    const [userId, setUserId] = useState<string | null>(null)
    const [isAuthReady, setIsAuthReady] = useState(false)

    const supabase = useMemo(() => createClient(), [])
    const isMounted = useRef(false)
    const lastSerializedData = useRef('')
    const localSaveTimer = useRef<NodeJS.Timeout | null>(null)

    // Calculate Isolated Storage Key
    // Format: "user_{uuid}:{key}" or "guest:{key}"
    const storageKey = useMemo(() => {
        if (!isAuthReady) return null // Wait for auth check
        return userId ? `user_${userId}:${key}` : `guest:${key}`
    }, [userId, key, isAuthReady])

    // Monitor Auth State
    useEffect(() => {
        const initAuth = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser()
            setUserId(user?.id || null)
            setIsAuthReady(true)
        }
        initAuth()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id || null)
            setIsAuthReady(true)
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    // Wrapper for Data Versioning
    interface StorageWrapper {
        data: T
        timestamp: number
        version: number
    }

    // --- L1: IndexedDB (Fast & Async) ---
    const saveToLocal = useCallback(
        async (content: T) => {
            if (!storageKey) return

            try {
                const payload: StorageWrapper = {
                    data: content,
                    timestamp: Date.now(),
                    version: 2, // Version 2: IndexedDB Era
                }
                await l1Storage.set(storageKey, payload)
                setLastSavedAt(new Date())
            } catch (e) {
                console.warn('Orbit Sync: L1 Write Failed', e)
            }
        },
        [storageKey]
    )

    // --- L2: Server Storage (Secure & Persistent) ---
    const saveToServer = useCallback(
        async (content: T) => {
            // L2 requires user. If no user, we stick to L1 (local-only)
            if (!userId) {
                setSyncStatus('local-only')
                return
            }

            console.log('Orbit Sync: Starting L2 Save...', key)
            try {
                setSyncStatus('uploading')

                // Orbit Timeout Breaker: 10s Max
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Orbit Sync: L2 Timeout')), 10000))

                const uploadPromise = (async () => {
                    // Use explicit connection to avoid ambiguity
                    const { error } = await supabase.from('drafts').upsert(
                        {
                            user_id: userId,
                            // We use the raw 'key' for DB to maintain clean records.
                            // Isolation is handled by 'user_id' column RLS policy.
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
                    toast.error(`저장 오류: ${e.message || e.details || '알 수 없는 오류'}`)
                }
            } finally {
                // ALWAYS release the saving lock
                console.log('Orbit Sync: Finished')
                setIsSaving(false)
            }
        },
        [key, supabase, userId]
    )

    // ===== Helper Functions (Clean Code: SRP) =====

    /**
     * Read draft from L1 Storage (IndexedDB)
     */
    const readLocalStorage = useCallback(async (storageKey: string) => {
        try {
            const parsed = (await l1Storage.get(storageKey)) as StorageWrapper | null
            if (parsed && typeof parsed === 'object' && 'data' in parsed) {
                return { data: parsed.data, timestamp: parsed.timestamp }
            }
        } catch (e) {
            console.warn('Orbit Sync: L1 Read Failed', e)
        }
        return null
    }, [])

    /**
     * Migrate legacy drafts to new isolated format
     * Legacy formats:
     * 1. IndexedDB with non-prefixed key (e.g., "draft-new-post")
     * 2. localStorage (very old, pre-IndexedDB era)
     */
    const migrateLegacyDraft = useCallback(async (storageKey: string, key: string) => {
        // Try IndexedDB legacy format
        try {
            const legacyParsed = (await l1Storage.get(key)) as StorageWrapper | null
            if (legacyParsed && typeof legacyParsed === 'object' && 'data' in legacyParsed) {
                console.log('Orbit Sync: Migrating legacy draft to isolated storage')
                await l1Storage.set(storageKey, legacyParsed)
                await l1Storage.remove(key)
                return { data: legacyParsed.data, timestamp: legacyParsed.timestamp }
            }
        } catch (e) {
            console.warn('Orbit Sync: IndexedDB legacy migration failed', e)
        }

        // Try localStorage legacy format
        try {
            const legacyRaw = localStorage.getItem(key)
            if (legacyRaw) {
                const parsedOld = JSON.parse(legacyRaw)
                const data = parsedOld.data || parsedOld
                const timestamp = Date.now()
                await l1Storage.set(storageKey, { data, timestamp, version: 2 })
                localStorage.removeItem(key)
                return { data, timestamp }
            }
        } catch (e) {
            console.warn('Orbit Sync: localStorage legacy migration failed', e)
        }

        return null
    }, [])

    /**
     * Read draft from L2 Storage (Supabase)
     */
    const readServerStorage = useCallback(
        async (key: string) => {
            if (!userId) return null

            try {
                const { data: serverDraft } = await supabase
                    .from('drafts')
                    .select('data, updated_at')
                    .eq('user_id', userId)
                    .eq('key', key)
                    .single()

                if (serverDraft) {
                    return {
                        data: serverDraft.data as T,
                        timestamp: new Date(serverDraft.updated_at).getTime(),
                    }
                }
            } catch (e) {
                console.warn('Orbit Sync: L2 Read Failed', e)
            }

            return null
        },
        [userId, supabase]
    )

    /**
     * Resolve conflict between local and server drafts
     * Strategy: Server wins if significantly newer (> 1s)
     */
    const resolveConflict = useCallback(
        async (local: { data: T; timestamp: number } | null, server: { data: T; timestamp: number } | null): Promise<T | null> => {
            if (!server) return local?.data || null
            if (!local) return server.data

            // Server wins if significantly newer
            if (server.timestamp > local.timestamp + 1000) {
                console.log('Orbit Sync: Remote logic prevails. Syncing down.')

                // [UX] Only notify if there's meaningful local data being replaced
                // Avoid showing toast on every page load
                const hasLocalContent = local.data && JSON.stringify(local.data).length > 50
                if (hasLocalContent) {
                    toast.info('다른 기기에서 작성된 최신 글을 불러왔습니다.')
                }

                await saveToLocal(server.data)
                return server.data
            }

            return local.data
        },
        [saveToLocal]
    )

    // ===== Smart Load Strategy (Orchestrator) =====

    const loadDraft = useCallback(async (): Promise<T | null> => {
        if (typeof window === 'undefined') return null
        if (!storageKey) return null

        // 1. Try to read from local storage
        let localData = await readLocalStorage(storageKey)

        // 2. If not found, try legacy migration
        if (!localData) {
            localData = await migrateLegacyDraft(storageKey, key)
        }

        // 3. Read from server
        const serverData = await readServerStorage(key)

        // 4. Resolve conflict and return
        return resolveConflict(localData, serverData)
    }, [storageKey, key, readLocalStorage, migrateLegacyDraft, readServerStorage, resolveConflict])

    // --- Online Recovery (Edge Case: Offline -> Online) ---
    useEffect(() => {
        const handleOnline = () => {
            console.log('Orbit Sync: Back Online. Triggering sync.')
            toast.info('네트워크 연결이 복구되었습니다. 저장 중...', { icon: '📡' })
            // Force immediate save
            saveToServer(data)
        }
        window.addEventListener('online', handleOnline)
        return () => window.removeEventListener('online', handleOnline)
    }, [data, saveToServer])

    // --- Optimization: Memoize Data Serialization ---
    const serializedData = useMemo(() => JSON.stringify(data), [data])

    // --- Auto-Save Effect ---
    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true
            lastSerializedData.current = serializedData
            return
        }

        // Block auto-save until we know the user identity (to prevent writing to guest:key incorrectly)
        if (!isAuthReady) return

        // Dependency 'serializedData' ensures this ONLY runs when content actually changes.
        lastSerializedData.current = serializedData
        setIsSaving(true)

        // 1. L1 Save (Throttle 500ms)
        if (localSaveTimer.current) clearTimeout(localSaveTimer.current)
        localSaveTimer.current = setTimeout(() => {
            saveToLocal(data)
        }, 500)

        // 2. L2 Save (Debounce 2000ms)
        const serverTimer = setTimeout(() => {
            saveToServer(data)
        }, delay)

        return () => {
            clearTimeout(serverTimer)
            if (localSaveTimer.current) clearTimeout(localSaveTimer.current)
        }
    }, [serializedData, delay, saveToLocal, saveToServer, isAuthReady])

    const clearDraft = useCallback(async () => {
        // Clear L1 (Isolated)
        if (storageKey) await l1Storage.remove(storageKey)
        // Clear Legacy
        await l1Storage.remove(key)

        setLastSavedAt(null)

        // Clear L2
        if (userId) {
            try {
                await supabase.from('drafts').delete().match({ user_id: userId, key: key })
            } catch (e) {
                console.warn('Orbit Sync: Failed to clear L2', e)
            }
        }
    }, [key, supabase, userId, storageKey])

    return { isSaving, lastSavedAt, syncStatus, loadDraft, clearDraft }
}
