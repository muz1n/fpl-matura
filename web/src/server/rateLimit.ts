// Very small token-bucket style limiter for server routes

type Bucket = { tokens: number; lastRefill: number }

export class RateLimiter {
    private buckets = new Map<string, Bucket>()
    constructor(private capacity: number, private refillPerSec: number) { }

    allow(key: string): boolean {
        const now = Date.now()
        const bucket = this.buckets.get(key) || { tokens: this.capacity, lastRefill: now }
        // refill
        const elapsedSec = (now - bucket.lastRefill) / 1000
        const refillTokens = Math.floor(elapsedSec * this.refillPerSec)
        if (refillTokens > 0) {
            bucket.tokens = Math.min(this.capacity, bucket.tokens + refillTokens)
            bucket.lastRefill = now
        }
        if (bucket.tokens > 0) {
            bucket.tokens -= 1
            this.buckets.set(key, bucket)
            return true
        }
        this.buckets.set(key, bucket)
        return false
    }
}

// Global limiter: e.g., 30 requests capacity, refilling 1 token per second
export const globalLimiter = new RateLimiter(30, 1)
