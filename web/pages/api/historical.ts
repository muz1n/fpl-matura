import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PredictionsPayloadSchema } from '@/src/types/fpl.schema'

// Basis-Ausgabepfad (analog zu bestehenden Endpoints)
const OUT_DIR = process.env.FPL_OUT_DIR || join(process.cwd(), '..', 'out')

// Erwartete Dateinamen-Muster (Fallback-Reihenfolge)
// Beispiel: predictions_gw12.json, predictions_gw12_rf.json, predictions_gw12_ma3.json, predictions_gw12_pos.json
const METHOD_SUFFIXES = ['', '_rf', '_ma3', '_pos']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { season, gw } = req.query
        const seasonStr = (season as string || '').trim()
        const gwNum = Number.parseInt(gw as string, 10)

        if (!seasonStr) {
            return res.status(400).json({ error: 'Parameter season fehlt' })
        }
        if (!Number.isFinite(gwNum)) {
            return res.status(400).json({ error: 'Parameter gw ungültig' })
        }

        // Versuche mehrere mögliche Dateinamen (ältere Dumps könnten unterschiedliche Muster haben)
        const tried: string[] = []
        let found: any = null

        for (const suffix of METHOD_SUFFIXES) {
            const filename = `predictions_gw${gwNum}${suffix}.json`
            const filePath = join(OUT_DIR, filename)
            tried.push(filename)
            try {
                const raw = await readFile(filePath, 'utf8')
                const parsed = PredictionsPayloadSchema.parse(JSON.parse(raw))
                // Optional: Saison validieren, falls Datei Saison-Feld enthält (nur übernehmen, wenn gleich oder leer)
                if (!parsed.season || parsed.season === seasonStr) {
                    found = parsed
                    break
                }
            } catch (e: any) {
                if (e.code === 'ENOENT') {
                    continue // Datei nicht vorhanden, weiter versuchen
                } else {
                    // Anderer Fehler -> abbrechen und melden
                    return res.status(500).json({ error: e?.message ?? 'Lesefehler' })
                }
            }
        }

        if (!found) {
            return res.status(404).json({ error: 'Keine historischen Prognosen gefunden', versucht: tried })
        }

        return res.status(200).json({ mode: 'historical', demo: true, season: seasonStr, gw: gwNum, data: found })
    } catch (err: any) {
        console.error('Error historical:', err)
        return res.status(500).json({ error: err?.message ?? 'Unbekannter Fehler' })
    }
}
