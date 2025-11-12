// Simple in-memory TTL cache for server-side usage

type CacheRecord<T> = { value: T; expiresAt: number }

export class TTLCache<T = unknown> {
    private store = new Map<string, CacheRecord<T>>()

    constructor(private defaultTtlMs = 5 * 60_000) { }

    get(key: string): T | undefined {
        const rec = this.store.get(key)
        if (!rec) return undefined
        if (Date.now() > rec.expiresAt) {
            this.store.delete(key)
            return undefined
        }
        return rec.value
    }

    set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
    }

    delete(key: string): void {
        this.store.delete(key)
    }

    clear(): void {
        this.store.clear()
    }
}

export const serverCache = new TTLCache<any>()
