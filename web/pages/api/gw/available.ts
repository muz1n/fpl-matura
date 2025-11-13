import type { NextApiRequest, NextApiResponse } from 'next'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const OUT_DIR = process.env.FPL_OUT_DIR || join(process.cwd(), '..', 'out')

/**
 * Response-Typ für verfügbare Gameweeks
 */
interface AvailableGWsResponse {
    available: number[]
    latest: number | null
}

/**
 * Scannt das OUT_DIR und gibt alle verfügbaren GW-Nummern zurück
 */
async function getAvailableGWs(): Promise<number[]> {
    try {
        const files = await readdir(OUT_DIR)
        const gwSet = new Set<number>()

        // Suche nach predictions_gwXX.json Dateien
        for (const file of files) {
            const match = file.match(/^predictions_gw(\d+)\.json$/)
            if (match) {
                gwSet.add(Number.parseInt(match[1], 10))
            }
        }

        return Array.from(gwSet).sort((a, b) => a - b)
    } catch {
        return []
    }
}

/**
 * GET /api/gw/available
 * 
 * Liefert alle verfügbaren Gameweeks basierend auf vorhandenen Prediction-Dateien
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<AvailableGWsResponse>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ available: [], latest: null })
    }

    try {
        const available = await getAvailableGWs()
        const latest = available.length > 0 ? Math.max(...available) : null

        return res.status(200).json({
            available,
            latest
        })
    } catch (error) {
        // Bei Fehler leere Liste zurückgeben
        console.error('Error scanning for available gameweeks:', error)
        return res.status(200).json({
            available: [],
            latest: null
        })
    }
}
