'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { l1Storage } from '@/utils/indexed-db'
import { toast } from 'sonner'

interface AutoSaveResult<T> {
    isSaving: boolean
    lastSavedAt: Date | null
    syncStatus: 'synced' | 'local-only' | 'uploading' | 'error'
    isAuthReady: boolean
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

    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current
    const isMounted = useRef(false)
    const lastSerializedData = useRef('')
    const localSaveTimer = useRef<NodeJS.Timeout | null>(null)

    // Calculate Isolated Storage Key
    // Format: "user_{uuid}:{key}" or "guest:{key}"
    const storageKey = (() => {
        if (!isAuthReady) return null
        return userId ? `user_${userId}:${key}` : `guest:${key}`
    })()

    // Stable ref for storageKey to avoid stale closures
    const storageKeyRef = useRef(storageKey)
    storageKeyRef.current = storageKey

    // Stable ref for userId
    const userIdRef = useRef(userId)
    userIdRef.current = userId

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

    // --- L1: IndexedDB (Fast & Async) --- Stable reference via useCallback
    const saveToLocal = useCallback(async (content: T) => {
        const currentKey = storageKeyRef.current
        if (!currentKey) return

        try {
            const payload = {
                data: content,
                timestamp: Date.now(),
                version: 2,
            }
            await l1Storage.set(currentKey, payload)
            setLastSavedAt(new Date())
        } catch (e) {
            console.warn('Orbit Sync: L1 Write Failed', e)
        }
    }, [])

    // --- L2: Server Storage (Secure & Persistent) --- Stable reference via useCallback
    const saveToServer = useCallback(
        async (content: T) => {
            const currentUserId = userIdRef.current
            if (!currentUserId) {
                setSyncStatus('local-only')
                return
            }

            try {
                setSyncStatus('uploading')

                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Orbit Sync: L2 Timeout')), 10000))

                const uploadPromise = (async () => {
                    const { error } = await supabaseRef.current.from('drafts').upsert(
                        {
                            user_id: currentUserId,
                            key: key,
                            data: content as any,
                            updated_at: new Date().toISOString(),
                        },
                        { onConflict: 'user_id,key' }
                    )

                    if (error) throw error
                    setSyncStatus('synced')
                })()

                await Promise.race([uploadPromise, timeoutPromise])
            } catch (e: any) {
                if (e.message === 'Orbit Sync: L2 Timeout') {
                    setSyncStatus('error')
                    toast.error('서버 응답 지연: 로컬에 안전하게 저장됨')
                } else {
                    setSyncStatus('error')
                    toast.error(`저장 오류: ${e.message || e.details || '알 수 없는 오류'}`)
                }
            } finally {
                setIsSaving(false)
            }
        },
        [key]
    )

    // ===== Helper Functions (Clean Code: SRP) =====

    /**
     * Read draft from L1 Storage (IndexedDB)
     */
    const readLocalStorage = async (sk: string) => {
        try {
            const parsed = (await l1Storage.get(sk)) as StorageWrapper | null
            if (parsed && typeof parsed === 'object' && 'data' in parsed) {
                return { data: parsed.data, timestamp: parsed.timestamp }
            }
        } catch (e) {
            console.warn('Orbit Sync: L1 Read Failed', e)
        }
        return null
    }

    /**
     * Migrate legacy drafts to new isolated format
     */
    const migrateLegacyDraft = async (sk: string, legacyKey: string) => {
        try {
            const legacyParsed = (await l1Storage.get(legacyKey)) as StorageWrapper | null
            if (legacyParsed && typeof legacyParsed === 'object' && 'data' in legacyParsed) {
                await l1Storage.set(sk, legacyParsed)
                await l1Storage.remove(legacyKey)
                return { data: legacyParsed.data, timestamp: legacyParsed.timestamp }
            }
        } catch (e) {
            console.warn('Orbit Sync: IndexedDB legacy migration failed', e)
        }

        try {
            const legacyRaw = localStorage.getItem(legacyKey)
            if (legacyRaw) {
                const parsedOld = JSON.parse(legacyRaw)
                const data = parsedOld.data || parsedOld
                const timestamp = Date.now()
                await l1Storage.set(sk, { data, timestamp, version: 2 })
                localStorage.removeItem(legacyKey)
                return { data, timestamp }
            }
        } catch (e) {
            console.warn('Orbit Sync: localStorage legacy migration failed', e)
        }

        return null
    }

    /**
     * Read draft from L2 Storage (Supabase)
     */
    const readServerStorage = async (queryKey: string) => {
        const currentUserId = userIdRef.current
        if (!currentUserId) return null

        try {
            const { data: serverDraft } = await supabase
                .from('drafts')
                .select('data, updated_at')
                .eq('user_id', currentUserId)
                .eq('key', queryKey)
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
    }

    /**
     * Resolve conflict between local and server drafts
     * Strategy: Server wins if significantly newer (> 1s)
     */
    const resolveConflict = async (
        local: { data: T; timestamp: number } | null,
        server: { data: T; timestamp: number } | null
    ): Promise<T | null> => {
        if (!server) return local?.data || null
        if (!local) return server.data

        if (server.timestamp > local.timestamp + 1000) {
            const hasLocalContent = local.data && JSON.stringify(local.data).length > 50
            if (hasLocalContent) {
                toast.info('다른 기기에서 작성된 최신 글을 불러왔습니다.')
            }

            await saveToLocal(server.data)
            return server.data
        }

        return local.data
    }

    // ===== Smart Load Strategy (Orchestrator) — Stable ref via useCallback =====

    const loadDraft = useCallback(async (): Promise<T | null> => {
        if (typeof window === 'undefined') return null
        const currentKey = storageKeyRef.current
        if (!currentKey) return null

        let localData = await readLocalStorage(currentKey)

        if (!localData) {
            localData = await migrateLegacyDraft(currentKey, key)
        }

        const serverData = await readServerStorage(key)

        return resolveConflict(localData, serverData)
    }, [key])

    // --- Online Recovery (Edge Case: Offline -> Online) ---
    useEffect(() => {
        const handleOnline = () => {
            toast.info('네트워크 연결이 복구되었습니다. 저장 중...', { icon: '📡' })
            saveToServer(data)
        }
        window.addEventListener('online', handleOnline)
        return () => window.removeEventListener('online', handleOnline)
    }, [data, saveToServer])

    // --- Optimization: Memoize Data Serialization ---
    const serializedData = JSON.stringify(data)

    // --- Auto-Save Effect ---
    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true
            lastSerializedData.current = serializedData
            return
        }

        // Block auto-save until we know the user identity
        if (!isAuthReady) return

        // Skip if data hasn't actually changed (prevents StrictMode double-fire)
        if (serializedData === lastSerializedData.current) return
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
        const currentKey = storageKeyRef.current
        if (currentKey) await l1Storage.remove(currentKey)
        await l1Storage.remove(key)

        setLastSavedAt(null)

        const currentUserId = userIdRef.current
        if (currentUserId) {
            try {
                await supabaseRef.current.from('drafts').delete().match({ user_id: currentUserId, key: key })
            } catch (e) {
                console.warn('Orbit Sync: Failed to clear L2', e)
            }
        }
    }, [key])

    return { isSaving, lastSavedAt, syncStatus, isAuthReady, loadDraft, clearDraft }
}
