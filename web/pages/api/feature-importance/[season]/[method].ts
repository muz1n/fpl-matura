import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const FEATURE_IMPORTANCE_DIR = join(process.cwd(), 'public', 'data', 'feature-importance')

interface RawFeatureRow {
    feature: string
    importance: number
}

interface RawFIFile {
    season: string
    method?: string
    n_features?: number
    generated_at?: string
    features: RawFeatureRow[]
}

interface FeatureImportanceRow {
    feature: string
    importance: number
    normalized: number
    cumulative: number
    rank: number
}

interface FeatureImportanceResponse {
    season: string
    method: string
    n_features: number
    generated_at: string
    position: string | null
    features: FeatureImportanceRow[]
    file?: string
}

async function loadFileForSeason(
    season: string
): Promise<{ path: string; text: string }> {
    const candidates = [
        // Variante 1: public/data/feature-importance/rf_2023-24.json
        join(FEATURE_IMPORTANCE_DIR, `rf_${season}.json`)
    ]

    let lastError: any = null

    for (const path of candidates) {
        try {
            const buf = await readFile(path) // Buffer, keine Encoding-Angabe

            let encoding: BufferEncoding = 'utf8'
            if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
                // UTF-16 LE BOM
                encoding = 'utf16le'
            }

            let text = buf.toString(encoding)

            // BOM entfernen, falls vorhanden
            if (text.charCodeAt(0) === 0xfeff) {
                text = text.slice(1)
            }

            return { path, text }
        } catch (err) {
            lastError = err
        }
    }

    const error: any = new Error(
        `Keine rf_${season}.json Datei in out/ oder out/feature_importance/ gefunden`
    )
    error.cause = lastError
    throw error
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { season, method } = req.query

    if (!season || typeof season !== 'string') {
        return res.status(400).json({ error: 'Season Parameter fehlt' })
    }

    try {
        const { path: filePath, text } = await loadFileForSeason(season)
        const parsed: RawFIFile = JSON.parse(text)

        if (!parsed.features || parsed.features.length === 0) {
            return res
                .status(404)
                .json({ error: 'Keine Features in der Feature-Importance-Datei gefunden' })
        }

        const sorted = [...parsed.features].sort(
            (a, b) => b.importance - a.importance
        )

        const totalImportance = sorted.reduce(
            (sum, f) => sum + (f.importance ?? 0),
            0
        )

        let cumulative = 0
        const features: FeatureImportanceRow[] = sorted.map((f, idx) => {
            const norm = totalImportance > 0 ? f.importance / totalImportance : 0
            cumulative += norm

            return {
                feature: f.feature,
                importance: f.importance,
                normalized: norm,
                cumulative,
                rank: idx + 1
            }
        })

        const response: FeatureImportanceResponse = {
            season: parsed.season ?? season,
            method:
                parsed.method ??
                (typeof method === 'string' ? method : 'rf'),
            n_features: parsed.n_features ?? features.length,
            generated_at:
                parsed.generated_at ?? new Date().toISOString().slice(0, 10),
            position: null,
            features,
            file: filePath
        }

        return res.status(200).json(response)
    } catch (err: any) {
        console.error('Feature Importance API Fehler:', err)
        if (err.code === 'ENOENT') {
            return res.status(404).json({
                error: `Datei rf_${season}.json nicht gefunden`
            })
        }
        return res.status(500).json({
            error: err?.message ?? 'Interner Fehler beim Laden der FI-Daten'
        })
    }
}
