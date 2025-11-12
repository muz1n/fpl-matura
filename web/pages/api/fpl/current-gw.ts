import type { NextApiRequest, NextApiResponse } from 'next'
import { globalLimiter } from '@/src/server/rateLimit'
import { getCurrentGameweek, isFplApiEnabled } from '@/src/server/fpl/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    // Rate limit per IP (basic)
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
    if (!globalLimiter.allow(`fpl:${ip}`)) {
        return res.status(429).json({ error: 'Rate limit exceeded' })
    }

    try {
        if (!isFplApiEnabled()) {
            // Structure only: communicate that the real API is disabled
            const data = await getCurrentGameweek()
            return res.status(200).json({ mode: 'stub', enabled: false, data })
        }

        const data = await getCurrentGameweek()
        return res.status(200).json({ mode: 'live', enabled: true, data })
    } catch (e: any) {
        return res.status(500).json({ error: e?.message || 'Unknown error' })
    }
}
