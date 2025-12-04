import type { NextApiRequest, NextApiResponse } from 'next'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

// Basis-Ausgabeordner im public/data Verzeichnis
const PRED_DIR = join(process.cwd(), 'public', 'data', 'predictions')

/**
 * Response-Typ für verfügbare Gameweeks
 */
interface AvailableGWsResponse {
    /**
     * Verfuegbare Gameweeks basierend auf Dateien im OUT_DIR
     */
    available: number[]
    /**
     * Neu: Verfuegbare Prognose-Methoden pro Gameweek (z.B. rf, ma3, pos, rf_rank, rf_pos, legacy)
     */
    methodsByGw: Record<number, string[]>
    /**
     * Neueste (maximal vorhandene) Gameweek oder null
     */
    latest: number | null
}

/**
 * Scannt das OUT_DIR und gibt alle verfügbaren GW-Nummern zurück
 */
/**
 * Liest den Prognose-Unterordner und extrahiert verfügbare Gameweeks + Methoden.
 * Berücksichtigt neue Dateistruktur: predictions/predictions_{season}_gw{N}_{method}.json
 */
async function getAvailableGWs(): Promise<{ available: number[]; methodsByGw: Record<number, string[]> }> {
    try {
        let files: string[] = []
        try {
            files = await readdir(PRED_DIR)
        } catch {
            return { available: [], methodsByGw: {} }
        }
        const gwSet = new Set<number>()
        const methodsByGw: Record<number, string[]> = {}

        // Suche nach methodenspezifischen Dateien und Legacy-Dateien
        for (const file of files) {
            // Neue Struktur mit Season: predictions_2022-23_gw30_rf.json
            const matchSeasonMethod = file.match(/^predictions_[0-9]{4}-[0-9]{2}_gw(\d+)_([a-z0-9_]+)\.json$/)
            if (matchSeasonMethod) {
                const gw = Number.parseInt(matchSeasonMethod[1], 10)
                const method = matchSeasonMethod[2]
                gwSet.add(gw)
                if (!methodsByGw[gw]) methodsByGw[gw] = []
                if (!methodsByGw[gw].includes(method)) methodsByGw[gw].push(method)
                continue
            }

            // Alte Struktur ohne Season: predictions_gw30_rf.json
            const matchMethod = file.match(/^predictions_gw(\d+)_([a-z0-9_]+)\.json$/)
            if (matchMethod) {
                const gw = Number.parseInt(matchMethod[1], 10)
                const method = matchMethod[2]
                gwSet.add(gw)
                if (!methodsByGw[gw]) methodsByGw[gw] = []
                if (!methodsByGw[gw].includes(method)) methodsByGw[gw].push(method)
                continue
            }

            // Legacy: predictions_gw30.json
            const matchLegacy = file.match(/^predictions_gw(\d+)\.json$/)
            if (matchLegacy) {
                const gw = Number.parseInt(matchLegacy[1], 10)
                gwSet.add(gw)
                if (!methodsByGw[gw]) methodsByGw[gw] = []
                if (!methodsByGw[gw].includes('legacy')) methodsByGw[gw].push('legacy')
            }
        }

        const available = Array.from(gwSet).sort((a, b) => a - b)
        return { available, methodsByGw }
    } catch {
        return { available: [], methodsByGw: {} }
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
        return res.status(405).json({ available: [], latest: null, methodsByGw: {} })
    }

    try {
        const { available, methodsByGw } = await getAvailableGWs()
        const latest = available.length > 0 ? Math.max(...available) : null

        return res.status(200).json({
            available,
            methodsByGw,
            latest
        })
    } catch (error) {
        // Bei Fehler leere Liste zurückgeben
        console.error('Error scanning for available gameweeks:', error)
        return res.status(200).json({
            available: [],
            methodsByGw: {},
            latest: null
        })
    }
}
