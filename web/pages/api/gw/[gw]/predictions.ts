import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PredictionsPayloadSchema } from '@/src/types/fpl.schema'

const OUT_DIR = process.env.FPL_OUT_DIR || join(process.cwd(), '..', 'out')

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { gw } = req.query
        const gwNum = Number.parseInt(gw as string, 10)

        if (!Number.isFinite(gwNum)) {
            return res.status(400).json({ error: 'Bad gw parameter' })
        }

        const file = join(OUT_DIR, `predictions_gw${gwNum}.json`)
        const raw = await readFile(file, 'utf8')
        const parsed = PredictionsPayloadSchema.parse(JSON.parse(raw))

        return res.status(200).json(parsed)
    } catch (err: any) {
        console.error('Error reading predictions:', err)
        return res.status(500).json({ error: err?.message ?? 'read error' })
    }
}
