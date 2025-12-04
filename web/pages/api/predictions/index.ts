import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PredictionsPayloadSchema } from '@/src/types/fpl.schema'

/**
 * API-Endpunkt zum Laden von Prognose-Daten
 * 
 * Query-Parameter:
 * - season: Saison im Format "2023-24"
 * - gw: Gameweek-Nummer
 * - method: Prognose-Methode (rf, ma3, pos, rf_rank, rf_pos, rf_relaxed, etc.)
 */

const PREDICTIONS_DIR = join(process.cwd(), 'public', 'data', 'predictions')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { season, gw, method } = req.query

        const seasonStr = (season as string || '').trim()
        const gwNum = Number.parseInt(gw as string, 10)
        const methodStr = (method as string || 'rf').trim()

        if (!seasonStr) {
            return res.status(400).json({ error: 'Parameter season fehlt' })
        }
        if (!Number.isFinite(gwNum)) {
            return res.status(400).json({ error: 'Parameter gw ungültig' })
        }
        if (!methodStr) {
            return res.status(400).json({ error: 'Parameter method fehlt' })
        }

        // Dateiname: predictions_2023-24_gw38_rf.json
        const filename = `predictions_${seasonStr}_gw${gwNum}_${methodStr}.json`
        const filePath = join(PREDICTIONS_DIR, filename)

        try {
            const raw = await readFile(filePath, 'utf8')
            const data = JSON.parse(raw)

            // Versuche Zod-Validierung, aber werfe keinen Fehler wenn es fehlschlägt
            try {
                const parsed = PredictionsPayloadSchema.parse(data)
                return res.status(200).json(parsed)
            } catch (zodErr: any) {
                // Fallback: Gib Daten ohne Validierung zurück
                console.warn('Zod validation failed, returning raw data:', zodErr.message)
                return res.status(200).json(data)
            }
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                return res.status(404).json({
                    error: 'Prognose-Datei nicht gefunden',
                    filename,
                    season: seasonStr,
                    gw: gwNum,
                    method: methodStr
                })
            }
            throw err
        }
    } catch (err: any) {
        console.error('Error in predictions:', err)
        return res.status(500).json({ error: err?.message ?? 'Unbekannter Fehler' })
    }
}
