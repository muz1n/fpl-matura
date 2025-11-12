import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { LineupPayloadSchema } from '@/src/types/fpl.schema'

const OUT_DIR = process.env.FPL_OUT_DIR || join(process.cwd(), '..', 'out')

// Unterstützte Methoden
type PredictionMethod = 'rf' | 'ma3' | 'pos'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { gw, methode } = req.query
        const gwNum = Number.parseInt(gw as string, 10)
        const method = (methode as string)?.toLowerCase() || 'rf'

        if (!Number.isFinite(gwNum)) {
            return res.status(400).json({ error: 'Bad gw parameter' })
        }

        // Validiere Methode
        const validMethods: PredictionMethod[] = ['rf', 'ma3', 'pos']
        if (!validMethods.includes(method as PredictionMethod)) {
            return res.status(400).json({
                error: `Invalid method. Use: ${validMethods.join(', ')}`
            })
        }

        // Dateiname je nach Methode
        let filename: string
        if (method === 'rf') {
            filename = `lineup_gw${gwNum}.json`
        } else {
            filename = `lineup_gw${gwNum}_${method}.json`
        }

        const file = join(OUT_DIR, filename)
        const raw = await readFile(file, 'utf8')
        const parsed = LineupPayloadSchema.parse(JSON.parse(raw))

        return res.status(200).json(parsed)
    } catch (err: any) {
        console.error('Error reading lineup:', err)

        // Bessere Fehlermeldungen
        if (err.code === 'ENOENT') {
            return res.status(404).json({
                error: 'Keine Aufstellung für diese Kombination verfügbar'
            })
        }

        return res.status(500).json({ error: err?.message ?? 'read error' })
    }
}
