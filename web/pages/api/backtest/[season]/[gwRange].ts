import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

// Basis-Ausgabeordner (ein Verzeichnis über dem Web Root)
const OUT_DIR = process.env.FPL_OUT_DIR || join(process.cwd(), '..', 'out')
// Neuer Unterordner für Backtests gemäss aktueller Pipeline-Struktur
const BACKTEST_DIR = join(OUT_DIR, 'backtests')

interface BacktestDetailRow {
    method: string
    gw: number
    formation: string
    xi_points: number
    captain_id: number | null
    vice_id: number | null
    n_truth_matched: number
    n_candidates: number
    budget_used?: number
    notes: string
    optimum_points?: number | null
    optimum_formation?: string | null
    optimum_captain_id?: number | null
    efficiency?: number | null
}

interface BacktestSummaryRow {
    method: string
    avg_xi_points: number
    std_xi_points: number
    n_gw: number
    avg_efficiency?: number | null
}

interface BacktestResponse {
    season: string
    gw_start: number
    gw_end: number
    detail: BacktestDetailRow[]
    summary: BacktestSummaryRow[]
}

/**
 * Ermittelt verfügbare GW-Ranges aus neuer Unterordner-Struktur (backtests/) oder fällt auf alte Root-Struktur zurück.
 */
async function getAvailableRanges(season: string): Promise<string[]> {
    try {
        let files: string[] = []
        try {
            files = await readdir(BACKTEST_DIR)
        } catch {
            files = await readdir(OUT_DIR) // Fallback: alte Struktur ohne Unterordner
        }
        const ranges = new Set<string>()
        const pattern = new RegExp(`^team_backtest_${season}_gw(\d+)-(\d+)\.csv$`)
        for (const file of files) {
            const match = file.match(pattern)
            if (match) {
                const [_, start, end] = match
                ranges.add(`${start}-${end}`)
            }
        }
        return Array.from(ranges).sort()
    } catch {
        return []
    }
}

/**
 * Parst CSV-String zu Array von Objekten
 */
function parseCSV<T = any>(csvContent: string): T[] {
    const lines = csvContent.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim())
    const rows: T[] = []

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const row: any = {}

        for (let j = 0; j < headers.length; j++) {
            const value = values[j]
            // Convert to number if possible, otherwise keep as string
            row[headers[j]] = value === '' ? null : (isNaN(Number(value)) ? value : Number(value))
        }

        rows.push(row as T)
    }

    return rows
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { season, gwRange } = req.query

        if (!season || typeof season !== 'string') {
            return res.status(400).json({ error: 'Season parameter required' })
        }

        if (!gwRange || typeof gwRange !== 'string') {
            // Return available ranges for this season
            const ranges = await getAvailableRanges(season)
            return res.status(200).json({
                season,
                available_ranges: ranges
            })
        }

        // Parse gwRange: "30-38" -> [30, 38]
        const rangeParts = gwRange.split('-')
        if (rangeParts.length !== 2) {
            return res.status(400).json({ error: 'Invalid gwRange format. Use: "start-end"' })
        }

        const gwStart = Number.parseInt(rangeParts[0], 10)
        const gwEnd = Number.parseInt(rangeParts[1], 10)

        if (!Number.isFinite(gwStart) || !Number.isFinite(gwEnd)) {
            return res.status(400).json({ error: 'Invalid GW numbers in range' })
        }

        // Load detail CSV
        // Neuer Pfad im Unterordner (Fallback auf Root bei ENOENT weiter unten durch try/catch)
        const detailFile = join(BACKTEST_DIR, `team_backtest_${season}_gw${gwStart}-${gwEnd}.csv`)
        let detailData: BacktestDetailRow[] = []

        try {
            const detailContent = await readFile(detailFile, 'utf8')
            detailData = parseCSV<BacktestDetailRow>(detailContent)
        } catch (e: any) {
            if (e.code === 'ENOENT') {
                const ranges = await getAvailableRanges(season)
                return res.status(404).json({
                    error: `Keine Backtest-Daten für Season ${season}, GW ${gwStart}-${gwEnd}`,
                    available_ranges: ranges,
                    suggestion: `Verfügbare GW-Ranges: ${ranges.join(', ') || 'keine'}`
                })
            }
            throw e
        }

        // Load summary CSV
        const summaryFile = join(BACKTEST_DIR, `team_backtest_summary_${season}_gw${gwStart}-${gwEnd}.csv`)
        let summaryData: BacktestSummaryRow[] = []

        try {
            const summaryContent = await readFile(summaryFile, 'utf8')
            summaryData = parseCSV<BacktestSummaryRow>(summaryContent)
        } catch (e: any) {
            if (e.code !== 'ENOENT') {
                throw e
            }
            // Summary file optional - can be calculated from detail data
        }

        // Falls keine Summary vorhanden oder Effizienz-Spalte fehlt: aus Detail berechnen
        if (!summaryData.length || !('avg_efficiency' in summaryData[0])) {
            const byMethod: Record<string, { pts: number[]; eff: number[] }> = {}
            for (const row of detailData) {
                if (!byMethod[row.method]) byMethod[row.method] = { pts: [], eff: [] }
                if (typeof row.xi_points === 'number' && row.xi_points > 0) {
                    byMethod[row.method].pts.push(row.xi_points)
                }
                if (typeof row.efficiency === 'number' && row.efficiency > 0) {
                    byMethod[row.method].eff.push(row.efficiency)
                }
            }
            const computed: BacktestSummaryRow[] = Object.entries(byMethod).map(([method, vals]) => {
                const avgPts = vals.pts.length ? vals.pts.reduce((a, b) => a + b, 0) / vals.pts.length : 0
                const stdPts = (() => {
                    if (vals.pts.length < 2) return 0
                    const mean = avgPts
                    const varSum = vals.pts.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0)
                    return Math.sqrt(varSum / (vals.pts.length - 1))
                })()
                const avgEff = vals.eff.length ? vals.eff.reduce((a, b) => a + b, 0) / vals.eff.length : null
                return { method, avg_xi_points: avgPts, std_xi_points: stdPts, n_gw: vals.pts.length, avg_efficiency: avgEff }
            })
            // Wenn originale Summary existiert aber avg_efficiency fehlt -> mergen
            if (summaryData.length && !('avg_efficiency' in summaryData[0])) {
                summaryData = summaryData.map(orig => {
                    const comp = computed.find(c => c.method === orig.method)
                    return { ...orig, avg_efficiency: comp?.avg_efficiency ?? null }
                })
            } else if (!summaryData.length) {
                summaryData = computed
            }
        } else {
            // Summary vorhanden mit Effizienz? ensure numeric
            summaryData = summaryData.map(r => ({ ...r, avg_efficiency: (r as any).avg_efficiency ?? null }))
        }

        // Sortierung nach Effizienz (falls vorhanden), sonst nach avg_xi_points
        summaryData.sort((a, b) => {
            const ea = a.avg_efficiency ?? -1
            const eb = b.avg_efficiency ?? -1
            if (ea === eb) return b.avg_xi_points - a.avg_xi_points
            return eb - ea
        })

        const response: BacktestResponse = {
            season,
            gw_start: gwStart,
            gw_end: gwEnd,
            detail: detailData,
            summary: summaryData
        }

        return res.status(200).json(response)

    } catch (err: any) {
        console.error('Error in backtest API:', err)
        return res.status(500).json({
            error: err?.message ?? 'Internal server error'
        })
    }
}
