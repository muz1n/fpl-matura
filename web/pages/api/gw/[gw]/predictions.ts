import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { PredictionsPayloadSchema } from '@/src/types/fpl.schema'
import { z } from 'zod'

const OUT_DIR = process.env.FPL_OUT_DIR || join(process.cwd(), '..', 'out')

// Unterstützte Methoden
type PredictionMethod = 'rf' | 'ma3' | 'pos' | 'rf_rank'

/**
 * Scannt das OUT_DIR und gibt alle verfügbaren GW-Nummern zurück
 * + optional ein Map mit verfügbaren Methoden pro GW
 */
async function getAvailableGWs(): Promise<{ available: number[]; methodsByGw: Record<number, string[]> }> {
    try {
        const files = await readdir(OUT_DIR)
        const gwSet = new Set<number>()
        const methodsByGw: Record<number, string[]> = {}

        // Suche nach predictions_gw{N}.json (legacy) und predictions_gw{N}_{method}.json
        for (const file of files) {
            // Method-specific: predictions_gw30_rf.json
            const matchMethod = file.match(/^predictions_gw(\d+)_([a-z0-9]+)\.json$/)
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
        const { gw, methode } = req.query
        const gwNum = Number.parseInt(gw as string, 10)
        const methodRaw = (methode as string)?.toLowerCase() || 'rf'
        const method: PredictionMethod = (methodRaw === 'ma3' || methodRaw === 'pos' || methodRaw === 'rf' || methodRaw === 'rf_rank') ? methodRaw : 'rf'

        if (!Number.isFinite(gwNum)) {
            return res.status(400).json({ error: 'Bad gw parameter' })
        }

        // Validiere Methode
        const validMethods: PredictionMethod[] = ['rf', 'ma3', 'pos', 'rf_rank']
        if (!validMethods.includes(method as PredictionMethod)) {
            return res.status(400).json({
                error: `Invalid method. Use: ${validMethods.join(', ')}`
            })
        }

        // Try primary path: predictions_gw{N}_{method}.json
        const primaryFilename = `predictions_gw${gwNum}_${method}.json`
        const primaryPath = join(OUT_DIR, primaryFilename)

        // Try legacy path: predictions_gw{N}.json
        const legacyFilename = `predictions_gw${gwNum}.json`
        const legacyPath = join(OUT_DIR, legacyFilename)

        let raw: string | null = null
        let usedMethod: string = method

        // Attempt primary first
        try {
            raw = await readFile(primaryPath, 'utf8')
        } catch (e: any) {
            if (e.code === 'ENOENT') {
                // Primary not found, try legacy
                try {
                    raw = await readFile(legacyPath, 'utf8')
                    usedMethod = 'legacy'
                } catch (e2: any) {
                    if (e2.code === 'ENOENT') {
                        // Neither found, return 404 with availability
                        const { available, methodsByGw } = await getAvailableGWs()
                        return res.status(404).json({
                            error: 'GW not available',
                            available,
                            methodsByGw
                        })
                    }
                    throw e2
                }
            } else {
                throw e
            }
        }

        if (!raw) {
            const { available, methodsByGw } = await getAvailableGWs()
            return res.status(404).json({
                error: 'GW not available',
                available,
                methodsByGw
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
