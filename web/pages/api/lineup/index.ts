import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * API-Endpunkt zum Laden von Lineup/Aufstellungs-Daten
 * 
 * Query-Parameter:
 * - season: Saison im Format "2023-24"
 * - gw: Gameweek-Nummer
 * - method: Prognose-Methode (rf, ma3, pos, rf_rank, rf_pos, rf_relaxed, etc.)
 */

const LINEUPS_DIR = join(process.cwd(), 'public', 'data', 'lineups')

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

        // Versuche verschiedene Dateinamen-Muster in dieser Reihenfolge:
        // 1. lineup_2023-24_gw38_rf.json (saison-spezifisch mit Methode)
        // 2. lineup_gw38_rf.json (nur Methode, keine Saison)
        // 3. lineup_gw38.json (Legacy-Format ohne Methode)

        const candidates = [
            join(LINEUPS_DIR, `lineup_${seasonStr}_gw${gwNum}_${methodStr}.json`),
            join(LINEUPS_DIR, `lineup_gw${gwNum}_${methodStr}.json`),
            join(LINEUPS_DIR, `lineup_gw${gwNum}.json`),
        ]

        for (const filePath of candidates) {
            try {
                const raw = await readFile(filePath, 'utf8')
                const parsed = JSON.parse(raw)
                return res.status(200).json(parsed)
            } catch (err: any) {
                if (err.code === 'ENOENT') {
                    continue // Versuche nächste Datei
                }
                throw err // Anderer Fehler -> abbrechen
            }
        }

        // Keine Datei gefunden
        return res.status(404).json({
            error: 'Lineup-Datei nicht gefunden',
            season: seasonStr,
            gw: gwNum,
            method: methodStr,
            tried: candidates.map(p => p.split('lineups\\').pop())
        })
    } catch (err: any) {
        console.error('Error in lineup:', err)
        return res.status(500).json({ error: err?.message ?? 'Unbekannter Fehler' })
    }
}
