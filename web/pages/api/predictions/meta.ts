import type { NextApiRequest, NextApiResponse } from 'next'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * API-Endpunkt zur Abfrage der verfügbaren Prognose-Metadaten für eine Saison
 * 
 * Durchsucht das predictions-Verzeichnis und gibt zurück:
 * - Verfügbare Gameweeks für die gewählte Saison
 * - Verfügbare Methoden pro Gameweek (optional)
 */

const PREDICTIONS_DIR = join(process.cwd(), 'public', 'data', 'predictions')

// Regex-Muster: predictions_2023-24_gw38_rf.json
const PREDICTION_FILE_PATTERN = /^predictions_([^_]+)_gw(\d+)_([^.]+)\.json$/

interface MetaResponse {
    season: string
    gws: number[]
    methods_by_gw?: Record<number, string[]>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { season } = req.query
        const seasonStr = (season as string || '').trim()

        if (!seasonStr) {
            return res.status(400).json({ error: 'Parameter season fehlt' })
        }

        // Alle Dateien im predictions-Verzeichnis auflisten
        let files: string[]
        try {
            files = await readdir(PREDICTIONS_DIR)
        } catch (err: any) {
            console.error('Error reading predictions directory:', err)
            return res.status(500).json({ error: 'Verzeichnis konnte nicht gelesen werden' })
        }

        // Dateien filtern und parsen
        const gwSet = new Set<number>()
        const methodsByGw: Record<number, Set<string>> = {}

        for (const file of files) {
            const match = file.match(PREDICTION_FILE_PATTERN)
            if (!match) continue

            const [, fileSeason, gwStr, method] = match

            // Nur Dateien für die gewünschte Saison
            if (fileSeason !== seasonStr) continue

            const gw = parseInt(gwStr, 10)
            if (!Number.isFinite(gw)) continue

            gwSet.add(gw)

            if (!methodsByGw[gw]) {
                methodsByGw[gw] = new Set()
            }
            methodsByGw[gw].add(method)
        }

        // Sets in Arrays konvertieren und sortieren
        const gws = Array.from(gwSet).sort((a, b) => a - b)

        const methods_by_gw: Record<number, string[]> = {}
        for (const [gw, methodSet] of Object.entries(methodsByGw)) {
            methods_by_gw[Number(gw)] = Array.from(methodSet).sort()
        }

        const response: MetaResponse = {
            season: seasonStr,
            gws,
            methods_by_gw
        }

        return res.status(200).json(response)
    } catch (err: any) {
        console.error('Error in predictions/meta:', err)
        return res.status(500).json({ error: err?.message ?? 'Unbekannter Fehler' })
    }
}
