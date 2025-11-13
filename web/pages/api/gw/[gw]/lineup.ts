
import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { LineupPayloadSchema, PredictionsPayloadSchema, PredictionPlayerSchema, FormationStr } from '@/src/types/fpl.schema'

const OUT_DIR = process.env.FPL_OUT_DIR || join(process.cwd(), '..', 'out')
type PredictionMethod = 'rf' | 'ma3' | 'pos' | 'rf_rank' | 'legacy'
const FORMATIONS = ["3-4-3", "3-5-2", "4-4-2", "4-3-3", "4-5-1", "5-4-1", "5-3-2"] as const

// Helper: scan predictions files for available GWs and methods
async function getAvailableGWsAndMethods(): Promise<{ available: number[]; methodsByGw: Record<number, string[]> }> {
    try {
        const files = await readdir(OUT_DIR)
        const gwSet = new Set<number>()
        const methodsByGw: Record<number, string[]> = {}
        for (const file of files) {
            const m = file.match(/^predictions_gw(\d+)_([a-z0-9]+)\.json$/)
            if (m) {
                const gw = Number(m[1])
                const method = m[2]
                gwSet.add(gw)
                if (!methodsByGw[gw]) methodsByGw[gw] = []
                if (!methodsByGw[gw].includes(method)) methodsByGw[gw].push(method)
                continue
            }
            const l = file.match(/^predictions_gw(\d+)\.json$/)
            if (l) {
                const gw = Number(l[1])
                gwSet.add(gw)
                if (!methodsByGw[gw]) methodsByGw[gw] = []
                if (!methodsByGw[gw].includes('legacy')) methodsByGw[gw].push('legacy')
            }
        }
        return { available: Array.from(gwSet).sort((a, b) => a - b), methodsByGw }
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

        // Try primary lineup file first
        const primaryFile = join(OUT_DIR, `lineup_gw${gwNum}_${method}.json`)
        try {
            const raw = await readFile(primaryFile, 'utf8')
            const parsed = LineupPayloadSchema.parse(JSON.parse(raw))
            return res.status(200).json({ ...parsed, methode: method })
        } catch (e: any) {
            if (e.code !== 'ENOENT') throw e
        }

        // Fallback: legacy lineup file
        const legacyFile = join(OUT_DIR, `lineup_gw${gwNum}.json`)
        try {
            const raw = await readFile(legacyFile, 'utf8')
            const parsed = LineupPayloadSchema.parse(JSON.parse(raw))
            return res.status(200).json({ ...parsed, methode: 'legacy' })
        } catch (e: any) {
            if (e.code !== 'ENOENT') throw e
        }

        // Fallback: build lineup from predictions
        // Try method-specific predictions file
        const predFile = join(OUT_DIR, `predictions_gw${gwNum}_${method}.json`)
        let predRaw: string | null = null
        let usedMethod: string = method
        try {
            predRaw = await readFile(predFile, 'utf8')
        } catch (e: any) {
            if (e.code === 'ENOENT') {
                // Try legacy predictions file
                const legacyPredFile = join(OUT_DIR, `predictions_gw${gwNum}.json`)
                try {
                    predRaw = await readFile(legacyPredFile, 'utf8')
                    usedMethod = 'legacy'
                } catch (e2: any) {
                    if (e2.code === 'ENOENT') {
                        // Neither predictions file found: return available GWs/methods
                        const { available, methodsByGw } = await getAvailableGWsAndMethods()
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

        // Build lineup from predictions
        if (!predRaw) {
            const { available, methodsByGw } = await getAvailableGWsAndMethods()
            return res.status(404).json({ error: 'GW not available', available, methodsByGw })
        }

        // Parse predictions
        const predJson = JSON.parse(predRaw)
        const predParse = PredictionsPayloadSchema.safeParse(predJson)
        if (!predParse.success) {
            return res.status(422).json({ error: 'Invalid predictions format', details: predParse.error.issues.map(i => i.message) })
        }
        const players = predParse.data.players

        // Build 15-man pool: GK=2, DEF=5, MID=5, FWD=3
        const pool: Record<'GK' | 'DEF' | 'MID' | 'FWD', any[]> = {
            GK: players.filter(p => p.pos === 'GK').sort((a, b) => b.predicted_points - a.predicted_points).slice(0, 2),
            DEF: players.filter(p => p.pos === 'DEF').sort((a, b) => b.predicted_points - a.predicted_points).slice(0, 5),
            MID: players.filter(p => p.pos === 'MID').sort((a, b) => b.predicted_points - a.predicted_points).slice(0, 5),
            FWD: players.filter(p => p.pos === 'FWD').sort((a, b) => b.predicted_points - a.predicted_points).slice(0, 3)
        }
        // Try all formations, greedy pick per pos, enforce max 3 per club
        let bestXI: number[] = []
        let bestFormation: typeof FORMATIONS[number] = FORMATIONS[0]
        let bestSum = -Infinity
        let bestXIPlayers: any[] = []
        for (const f of FORMATIONS) {
            const [def, mid, fwd] = f.split('-').map(Number)
            const xi: any[] = [
                ...pool.GK.slice(0, 1),
                ...pool.DEF.slice(0, def),
                ...pool.MID.slice(0, mid),
                ...pool.FWD.slice(0, fwd)
            ]
            // Enforce max 3 per club
            const clubCounts: Record<string, number> = {}
            const xiFiltered: any[] = []
            for (const p of xi) {
                clubCounts[p.team] = (clubCounts[p.team] || 0) + 1
                if (clubCounts[p.team] <= 3) xiFiltered.push(p)
            }
            // If not enough players, skip
            if (xiFiltered.length !== 11) continue
            const sum = xiFiltered.reduce((acc, p) => acc + p.predicted_points, 0)
            if (sum > bestSum) {
                bestSum = sum
                bestXI = xiFiltered.map(p => p.player_id)
                bestFormation = f
                bestXIPlayers = xiFiltered
            }
        }
        if (bestXI.length !== 11) {
            return res.status(422).json({ error: 'Not enough valid players for XI' })
        }
        // Captain = highest predicted_points, Vice = second highest
        const sortedXI = [...bestXIPlayers].sort((a, b) => b.predicted_points - a.predicted_points)
        const captain_id = sortedXI[0]?.player_id ?? null
        const vice_id = sortedXI[1]?.player_id ?? null
        // Bench: pick GK not in XI, then top 3 outfield not in XI
        const xiSet = new Set(bestXI)
        const bench_gk = pool.GK.find(p => !xiSet.has(p.player_id))?.player_id ?? null
        const bench_out = [...pool.DEF, ...pool.MID, ...pool.FWD].filter(p => !xiSet.has(p.player_id)).sort((a, b) => b.predicted_points - a.predicted_points).slice(0, 3).map(p => p.player_id)
        // Compose payload
        const payload = {
            gw: gwNum,
            methode: usedMethod,
            formation: bestFormation,
            xi_ids: bestXI,
            bench_gk_id: bench_gk,
            bench_out_ids: bench_out,
            captain_id,
            vice_id,
            xi_points_sum: bestSum
        }
        return res.status(200).json(payload)
    } catch (err: any) {
        console.error('Error reading lineup:', err)
        if (err.code === 'ENOENT') {
            const { available, methodsByGw } = await getAvailableGWsAndMethods()
            return res.status(404).json({ error: 'GW not available', available, methodsByGw })
        }
        return res.status(500).json({ error: err?.message ?? 'read error' })
    }
}
