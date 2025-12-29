/**
 * Orbit Sync Engine - L1 Storage Utility (Universe-Class Edition)
 *
 * Architecture:
 * - Strategy: "Graceful Degradation"
 * - Primary: IndexedDB (Async, High Capacity)
 * - Fallback: localStorage (Sync, Low Capacity, but universally supported)
 * - Auto-Detection: Automatically switches if IDB fails (e.g., Safari Private Mode)
 */

const DB_NAME = 'orbit-sync-db'
const STORE_NAME = 'drafts'
const DB_VERSION = 1
const FALLBACK_PREFIX = 'orbit_fallback_'

interface OrbitDB {
    db: IDBDatabase | null
    initPromise: Promise<void> | null
    mode: 'indexedDB' | 'localStorage' | 'memory'
}

const orbitDB: OrbitDB = {
    db: null,
    initPromise: null,
    mode: 'indexedDB', // Default assumption
}

// In-memory fallback for worst-case scenarios
const memoryStorage = new Map<string, any>()

function checkIDBSupport(): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            resolve(false)
            return
        }
        // Try opening to detect Private Mode restrictions
        const req = window.indexedDB.open('orbit-test-db')
        req.onsuccess = () => {
            req.result.close()
            window.indexedDB.deleteDatabase('orbit-test-db')
            resolve(true)
        }
        req.onerror = () => resolve(false)
    })
}

async function initDB(): Promise<void> {
    if (orbitDB.db || orbitDB.mode !== 'indexedDB') return Promise.resolve()
    if (orbitDB.initPromise) return orbitDB.initPromise

    orbitDB.initPromise = new Promise(async (resolve) => {
        const isSupported = await checkIDBSupport()

        if (!isSupported) {
            console.warn('Orbit Sync: IndexedDB unavailable. Falling back to localStorage.')
            orbitDB.mode = 'localStorage'
            resolve()
            return
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = (event) => {
            console.error('Orbit Sync: Failed to open DB', event)
            orbitDB.mode = 'localStorage' // Fallback on error
            resolve()
        }

        request.onsuccess = () => {
            orbitDB.db = request.result
            resolve()
        }

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME)
            }
        }
    })

    return orbitDB.initPromise
}

export const l1Storage = {
    async set(key: string, value: any): Promise<void> {
        await initDB()

        if (orbitDB.mode === 'localStorage') {
            try {
                localStorage.setItem(FALLBACK_PREFIX + key, JSON.stringify(value))
            } catch (e) {
                // QuotaExceededError or security block
                console.warn('Orbit Sync: localStorage failed. Using Memory.', e)
                memoryStorage.set(key, value)
            }
            return
        }

        return new Promise((resolve, reject) => {
            if (!orbitDB.db) return resolve() // Should not happen if mode is indexedDB
            try {
                const transaction = orbitDB.db.transaction([STORE_NAME], 'readwrite')
                const store = transaction.objectStore(STORE_NAME)
                const request = store.put(value, key)

                request.onsuccess = () => resolve()
                request.onerror = () => {
                    // Failover to localStorage if IDB write fails unexpectedly
                    orbitDB.mode = 'localStorage'
                    l1Storage.set(key, value).then(resolve).catch(reject)
                }
            } catch (e) {
                orbitDB.mode = 'localStorage'
                l1Storage.set(key, value).then(resolve).catch(reject)
            }
        })
    },

    async get<T>(key: string): Promise<T | null> {
        await initDB()

        if (orbitDB.mode === 'localStorage') {
            try {
                const item = localStorage.getItem(FALLBACK_PREFIX + key)
                if (item) return JSON.parse(item) as T
                return memoryStorage.get(key) || null
            } catch {
                return null
            }
        }

        return new Promise((resolve) => {
            if (!orbitDB.db) return resolve(null)
            try {
                const transaction = orbitDB.db.transaction([STORE_NAME], 'readonly')
                const store = transaction.objectStore(STORE_NAME)
                const request = store.get(key)

                request.onsuccess = () => resolve(request.result as T)
                request.onerror = () => {
                    // Try fallback
                    orbitDB.mode = 'localStorage'
                    resolve(l1Storage.get<T>(key))
                }
            } catch {
                orbitDB.mode = 'localStorage'
                resolve(l1Storage.get<T>(key))
            }
        })
    },

    async remove(key: string): Promise<void> {
        await initDB()

        if (orbitDB.mode === 'localStorage') {
            localStorage.removeItem(FALLBACK_PREFIX + key)
            memoryStorage.delete(key)
            return
        }

        return new Promise((resolve) => {
            if (!orbitDB.db) return resolve()
            const transaction = orbitDB.db.transaction([STORE_NAME], 'readwrite')
            const store = transaction.objectStore(STORE_NAME)
            store.delete(key)
            transaction.oncomplete = () => resolve()
        })
    },

    async clearAll(): Promise<void> {
        await initDB()
        if (orbitDB.mode === 'localStorage') {
            Object.keys(localStorage).forEach((key) => {
                if (key.startsWith(FALLBACK_PREFIX)) localStorage.removeItem(key)
            })
            memoryStorage.clear()
            return
        }

        if (orbitDB.db) {
            const transaction = orbitDB.db.transaction([STORE_NAME], 'readwrite')
            transaction.objectStore(STORE_NAME).clear()
        }
    },
}
