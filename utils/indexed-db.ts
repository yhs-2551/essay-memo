/**
 * Orbit Sync Engine - L1 Storage Utility
 * Wraps Native IndexedDB in Promises for "Universe Class" performance.
 *
 * Features:
 * - Zero Dependencies (Lightweight)
 * - Async/Non-blocking
 * - Large Storage Support (> 5MB)
 */

const DB_NAME = "orbit-sync-db";
const STORE_NAME = "drafts";
const DB_VERSION = 1;

interface OrbitDB {
    db: IDBDatabase | null;
    initPromise: Promise<void> | null;
}

const orbitDB: OrbitDB = {
    db: null,
    initPromise: null,
};

function initDB(): Promise<void> {
    if (orbitDB.db) return Promise.resolve();
    if (orbitDB.initPromise) return orbitDB.initPromise;

    orbitDB.initPromise = new Promise((resolve, reject) => {
        if (typeof window === "undefined") {
            resolve(); // SSR safe
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error("Orbit Sync Engine: Failed to open L1 Storage.");
            reject(request.error);
        };

        request.onsuccess = () => {
            orbitDB.db = request.result;
            resolve();
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });

    return orbitDB.initPromise;
}

export const l1Storage = {
    async set(key: string, value: any): Promise<void> {
        await initDB();
        return new Promise((resolve, reject) => {
            if (!orbitDB.db) return resolve();
            const transaction = orbitDB.db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(value, key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async get<T>(key: string): Promise<T | null> {
        await initDB();
        return new Promise((resolve, reject) => {
            if (!orbitDB.db) return resolve(null);
            const transaction = orbitDB.db.transaction([STORE_NAME], "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result as T);
            request.onerror = () => reject(request.error);
        });
    },

    async remove(key: string): Promise<void> {
        await initDB();
        return new Promise((resolve, reject) => {
            if (!orbitDB.db) return resolve();
            const transaction = orbitDB.db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async clearAll(): Promise<void> {
        await initDB();
        return new Promise((resolve, reject) => {
            if (!orbitDB.db) return resolve();
            const transaction = orbitDB.db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
};
