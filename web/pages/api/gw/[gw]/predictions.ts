import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { PredictionsPayloadSchema } from '@/src/types/fpl.schema'
import { z } from 'zod'

// Basis-Ausgabeordner im public/data Verzeichnis
const PRED_DIR = join(process.cwd(), 'public', 'data', 'predictions')

// Unterstützte Methoden
type PredictionMethod = 'rf' | 'ma3' | 'pos' | 'rf_rank' | 'rf_pos'

/**
 * Scannt das OUT_DIR und gibt alle verfügbaren GW-Nummern zurück
 * + optional ein Map mit verfügbaren Methoden pro GW
 */
/**
 * Ermittelt verfügbare Gameweeks & Methoden aus neuer (mit Season & Unterordner) oder alter Struktur.
 */
async function getAvailableGWs(): Promise<{ available: number[]; methodsByGw: Record<number, string[]> }> {
    try {
        let files: string[] = []
        try {
            files = await readdir(PRED_DIR)
        } catch {
            files = await readdir(OUT_DIR)
        }
        const gwSet = new Set<number>()
        const methodsByGw: Record<number, string[]> = {}

        // Suche nach predictions_gw{N}.json (legacy) und predictions_gw{N}_{method}.json
        for (const file of files) {
            // Neue Struktur: predictions_2023-24_gw30_rf.json
            const matchSeasonMethod = file.match(/^predictions_[0-9]{4}-[0-9]{2}_gw(\d+)_([a-z0-9_]+)\.json$/)
            if (matchSeasonMethod) {
                const gw = Number.parseInt(matchSeasonMethod[1], 10)
                const method = matchSeasonMethod[2]
                gwSet.add(gw)
                if (!methodsByGw[gw]) methodsByGw[gw] = []
                if (!methodsByGw[gw].includes(method)) methodsByGw[gw].push(method)
                continue
            }

            // Alte Struktur: predictions_gw30_rf.json
            const matchMethod = file.match(/^predictions_gw(\d+)_([a-z0-9_]+)\.json$/)
            if (matchMethod) {
                const gw = Number.parseInt(matchMethod[1], 10)
                const method = matchMethod[2]
                gwSet.add(gw)
                if (!methodsByGw[gw]) methodsByGw[gw] = []
                if (!methodsByGw[gw].includes(method)) {
                    methodsByGw[gw].push(method)
                }
                continue
            }

            // Legacy: predictions_gw30.json
            const matchLegacy = file.match(/^predictions_gw(\d+)\.json$/)
            if (matchLegacy) {
                const gw = Number.parseInt(matchLegacy[1], 10)
                gwSet.add(gw)
                if (!methodsByGw[gw]) methodsByGw[gw] = []
                if (!methodsByGw[gw].includes('legacy')) {
                    methodsByGw[gw].push('legacy')
                }
            }
        }

        const available = Array.from(gwSet).sort((a, b) => a - b)
        return { available, methodsByGw }
    } catch {
        return { available: [], methodsByGw: {} }
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { gw, methode, season } = req.query
        const gwNum = Number.parseInt(gw as string, 10)
        const methodRaw = (methode as string)?.toLowerCase() || 'rf'
        const method: PredictionMethod = (methodRaw === 'ma3' || methodRaw === 'pos' || methodRaw === 'rf' || methodRaw === 'rf_rank' || methodRaw === 'rf_pos') ? methodRaw : 'rf'
        const seasonStr = season as string | undefined

        if (!Number.isFinite(gwNum)) {
            return res.status(400).json({ error: 'Bad gw parameter' })
        }

        // Validiere Methode
        const validMethods: PredictionMethod[] = ['rf', 'ma3', 'pos', 'rf_rank', 'rf_pos']
        if (!validMethods.includes(method as PredictionMethod)) {
            return res.status(400).json({
                error: `Invalid method. Use: ${validMethods.join(', ')}`
            })
        }

        // Try paths in order:
        // 1. predictions_{season}_gw{N}_{method}.json (season-specific)
        // 2. predictions_gw{N}_{method}.json (current/default)
        // 3. predictions_gw{N}.json (legacy)

        const candidatePaths: Array<{ path: string; method: string; description: string }> = []

        // Neue Struktur (Unterordner + Season-Präfix)
        if (seasonStr) {
            candidatePaths.push({
                path: join(PRED_DIR, `predictions_${seasonStr}_gw${gwNum}_${method}.json`),
                method,
                description: `season-specific (${seasonStr})`
            })
        }
        candidatePaths.push({
            path: join(PRED_DIR, `predictions_gw${gwNum}_${method}.json`),
            method,
            description: 'method-specific (subdir)'
        })
        candidatePaths.push({
            path: join(PRED_DIR, `predictions_gw${gwNum}.json`),
            method: 'legacy',
            description: 'legacy (subdir)'
        })
        // Fallback: alte Root-Struktur falls Unterordner fehlt
        if (seasonStr) {
            candidatePaths.push({
                path: join(OUT_DIR, `predictions_${seasonStr}_gw${gwNum}_${method}.json`),
                method,
                description: `season-specific (fallback root)`
            })
        }
        candidatePaths.push({
            path: join(OUT_DIR, `predictions_gw${gwNum}_${method}.json`),
            method,
            description: 'method-specific (fallback root)'
        })
        candidatePaths.push({
            path: join(OUT_DIR, `predictions_gw${gwNum}.json`),
            method: 'legacy',
            description: 'legacy (fallback root)'
        })

        let raw: string | null = null
        let usedMethod: string = method
        let usedDescription: string = ''

        for (const candidate of candidatePaths) {
            try {
                raw = await readFile(candidate.path, 'utf8')
                usedMethod = candidate.method
                usedDescription = candidate.description
                break
            } catch (e: any) {
                if (e.code !== 'ENOENT') {
                    throw e
                }
            }
        }

        if (!raw) {
            // None found - return 404 with helpful message
            const { available, methodsByGw } = await getAvailableGWs()
            const seasonMsg = seasonStr ? ` für Season ${seasonStr}` : ''
            return res.status(404).json({
                error: `Keine Predictions${seasonMsg} für GW ${gwNum} mit Methode ${method} verfügbar`,
                available,
                methodsByGw,
                suggestion: seasonStr
                    ? `Generiere zuerst Predictions für Season ${seasonStr} GW ${gwNum}`
                    : 'Verfügbare Gameweeks prüfen'
            })
        }

        let json: any
        try {
            json = JSON.parse(raw)
        } catch {
            return res.status(422).json({ error: 'Ungueltiges JSON Format' })
        }

        // Zod Validierung
        const parseResult = PredictionsPayloadSchema.safeParse(json)
        if (!parseResult.success) {
            return res.status(422).json({
                error: 'Validierungsfehler',
                details: parseResult.error.issues.map(i => i.message)
            })
        }
        const data = parseResult.data

        // Return with gw and methode echoed
        return res.status(200).json({
            ...data,
            gw: gwNum,
            methode: usedMethod
        })
    } catch (err: any) {
        console.error('Error reading predictions:', err)

        // Bessere Fehlermeldungen
        if (err.code === 'ENOENT') {
            return res.status(404).json({
                error: 'Keine Daten für diese Kombination verfügbar'
            })
        }

        return res.status(500).json({ error: err?.message ?? 'read error' })
    }
}
