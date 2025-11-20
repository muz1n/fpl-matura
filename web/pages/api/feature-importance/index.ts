import type { NextApiRequest, NextApiResponse } from 'next'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const OUT_DIR = process.env.FPL_OUT_DIR || join(process.cwd(), '..', 'out')

interface FileEntry {
    season: string
    method: string
    position?: string | null
    path: string
    size?: number
}

interface IndexResponse {
    seasons: string[]
    files: FileEntry[]
    positionsPerSeason: Record<string, string[]>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { season } = req.query
        const entries = await readdir(OUT_DIR, { withFileTypes: true })
        const fiFiles = entries
            .filter(d => d.isFile() && /^feature_importance_.*_rf(?:_(GK|DEF|MID|FWD))?\.json$/.test(d.name))
            .map(d => d.name)

        const files: FileEntry[] = []
        const positionsPerSeason: Record<string, Set<string>> = {}

        for (const name of fiFiles) {
            // Pattern: feature_importance_<season>_rf.json oder feature_importance_<season>_rf_DEF.json
            const parts = name.replace('feature_importance_', '').replace('.json', '').split('_')
            // parts: [season, method, optional position]
            const [seasonPart, methodPart, posPart] = parts
            if (season && typeof season === 'string' && seasonPart !== season) continue
            const filePath = join(OUT_DIR, name)
            files.push({ season: seasonPart, method: methodPart, position: posPart || null, path: filePath })
            if (!positionsPerSeason[seasonPart]) positionsPerSeason[seasonPart] = new Set()
            if (posPart) positionsPerSeason[seasonPart].add(posPart)
        }

        const seasons = Array.from(new Set(files.map(f => f.season))).sort()
        const positionsPerSeasonPlain: Record<string, string[]> = {}
        for (const s of Object.keys(positionsPerSeason)) {
            positionsPerSeasonPlain[s] = Array.from(positionsPerSeason[s]).sort()
        }

        const response: IndexResponse = {
            seasons,
            files,
            positionsPerSeason: positionsPerSeasonPlain
        }
        return res.status(200).json(response)
    } catch (err: any) {
        console.error('Feature Importance Index Fehler:', err)
        return res.status(500).json({ error: err?.message || 'Interner Fehler' })
    }
}