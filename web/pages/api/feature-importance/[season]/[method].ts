import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Basis-Ausgabeordner + neuer Unterordner fuer Feature Importances
const OUT_DIR = process.env.FPL_OUT_DIR || join(process.cwd(), '..', 'out')
const FI_DIR = join(OUT_DIR, 'feature_importance')

interface FeatureImportanceRow {
    feature: string
    importance: number
    rank: number
    cumulative: number
    normalized: number
}

interface FeatureImportanceResponse {
    season: string
    method: string
    n_features: number
    generated_at: string
    features: FeatureImportanceRow[]
    position?: string | null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { season, method, position } = req.query
        if (!season || typeof season !== 'string') {
            return res.status(400).json({ error: 'Season parameter required' })
        }
        if (!method || typeof method !== 'string') {
            return res.status(400).json({ error: 'Method parameter required' })
        }

        // Aktuell nur rf implementiert
        if (method !== 'rf') {
            return res.status(400).json({ error: 'Nur rf unterstützt (Random Forest)' })
        }

        const allowedPositions = ['GK', 'DEF', 'MID', 'FWD']
        let pos: string | undefined
        if (position) {
            if (typeof position !== 'string') {
                return res.status(400).json({ error: 'Position parameter invalid' })
            }
            if (!allowedPositions.includes(position)) {
                return res.status(400).json({ error: 'Ungültige Position (GK, DEF, MID, FWD erlaubt)' })
            }
            pos = position
        }

        // Datei-Pfad zusammensetzen (mit optionalem Positionssuffix)
        const fileName = pos ? `feature_importance_${season}_${method}_${pos}.json` : `feature_importance_${season}_${method}.json`
        // Neuer Pfad im Unterordner
        const filePath = join(FI_DIR, fileName)

        let raw: string
        try {
            raw = await readFile(filePath, 'utf8')
        } catch (e: any) {
            if (e.code === 'ENOENT') {
                // Falls Positionsdatei fehlt: Fallback auf globale Datei versuchen
                if (pos) {
                    const fallbackName = `feature_importance_${season}_${method}.json`
                    const fallbackPath = join(FI_DIR, fallbackName)
                    try {
                        const rawFallback = await readFile(fallbackPath, 'utf8')
                        const parsedFallback: FeatureImportanceResponse = JSON.parse(rawFallback)
                        return res.status(200).json({ ...parsedFallback, position: null, fallback: true })
                    } catch (inner: any) {
                        return res.status(404).json({
                            error: 'Positionsspezifische und globale Datei fehlen',
                            suggestion: `Erzeuge mit: python code/compute_feature_importance.py --season ${season} [--position GK|DEF|MID|FWD]`,
                            expected_file: fileName
                        })
                    }
                }
                return res.status(404).json({
                    error: 'Keine Feature Importance Datei gefunden',
                    suggestion: `Erzeuge zuerst die Datei mit: python code/compute_feature_importance.py --season ${season}`,
                    expected_file: fileName
                })
            }
            throw e
        }

        let parsed: FeatureImportanceResponse
        try {
            parsed = JSON.parse(raw)
        } catch {
            return res.status(422).json({ error: 'Ungültiges JSON Format in Importance Datei' })
        }

        return res.status(200).json({ ...parsed, position: parsed.position ?? pos ?? null })
    } catch (err: any) {
        console.error('Feature Importance API Fehler:', err)
        return res.status(500).json({ error: err?.message ?? 'Interner Fehler' })
    }
}
