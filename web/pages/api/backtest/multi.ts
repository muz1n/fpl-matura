import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

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
    efficiency?: number | null
}

interface BacktestSummaryRow {
    method: string
    avg_xi_points: number
    std_xi_points: number
    n_gw: number
    avg_efficiency?: number | null
}

interface BacktestData {
    season: string
    gw_start: number
    gw_end: number
    detail: BacktestDetailRow[]
    summary: BacktestSummaryRow[]
}

/**
 * Multi-Season Backtest API
 * GET /api/backtest/multi?seasons=2020-21,2021-22&gwRange=30-38
 * Lädt Backtest-Daten für mehrere Seasons und kombiniert sie
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { seasons, gwRange } = req.query

    if (!seasons || typeof seasons !== 'string') {
        return res.status(400).json({ error: 'Bitte seasons als komma-separierte Liste angeben, z.B. ?seasons=2020-21,2021-22' })
    }

    if (!gwRange || typeof gwRange !== 'string') {
        return res.status(400).json({ error: 'Bitte gwRange angeben, z.B. ?gwRange=30-38' })
    }

    const seasonList = seasons.split(',').map(s => s.trim()).filter(Boolean)
    if (seasonList.length === 0) {
        return res.status(400).json({ error: 'Keine gültigen Seasons angegeben' })
    }

    const backtestsDir = path.join(process.cwd(), 'public', 'data', 'backtests')
    const results: Array<BacktestData> = []
    const errors: Array<{ season: string; error: string }> = []

    for (const season of seasonList) {
        try {
            // Zuerst JSON versuchen (neue Struktur)
            const jsonPath = path.join(backtestsDir, `${season}_gw${gwRange}.json`)

            if (fs.existsSync(jsonPath)) {
                // JSON-Datei laden
                const jsonContent = fs.readFileSync(jsonPath, 'utf-8')
                const jsonData = JSON.parse(jsonContent)

                const summary: BacktestSummaryRow[] = jsonData.map((row: any) => ({
                    method: row.method || 'unknown',
                    avg_xi_points: row.avg_points || row.avg_xi_points || 0,
                    std_xi_points: row.std_points || row.std_xi_points || 0,
                    n_gw: row.n_gw || 0,
                    avg_efficiency: row.efficiency || row.avg_efficiency || null
                }))

                const [gwStart, gwEnd] = gwRange.split('-').map(Number)

                results.push({
                    season,
                    gw_start: gwStart,
                    gw_end: gwEnd,
                    detail: [], // JSON hat keine Details
                    summary
                })
                continue
            }

            // Fallback: CSV-Dateien versuchen
            const detailPath = path.join(backtestsDir, `team_backtest_${season}_gw${gwRange}.csv`)
            const summaryPath = path.join(backtestsDir, `team_backtest_summary_${season}_gw${gwRange}.csv`)

            if (!fs.existsSync(detailPath) || !fs.existsSync(summaryPath)) {
                errors.push({ season, error: 'Backtest-Dateien nicht gefunden' })
                continue
            }

            const detailCsv = fs.readFileSync(detailPath, 'utf-8')
            const summaryCsv = fs.readFileSync(summaryPath, 'utf-8')

            const detail = parseDetailCsv(detailCsv)
            const summary = parseSummaryCsv(summaryCsv)

            const [gwStart, gwEnd] = gwRange.split('-').map(Number)

            results.push({
                season,
                gw_start: gwStart,
                gw_end: gwEnd,
                detail,
                summary,
            })
        } catch (err) {
            errors.push({ season, error: err instanceof Error ? err.message : 'Unbekannter Fehler' })
        }
    }

    if (results.length === 0) {
        return res.status(404).json({
            error: 'Keine Backtest-Daten für die angegebenen Seasons gefunden',
            errors,
            suggestion: `Führe team_backtest.py für jede Season aus: ${seasonList.join(', ')}`
        })
    }

    return res.status(200).json({
        seasons: results.map(r => r.season),
        gw_range: gwRange,
        data: results,
        errors: errors.length > 0 ? errors : undefined,
    })
}

function parseDetailCsv(csv: string): BacktestDetailRow[] {
    const lines = csv.trim().split('\n')
    if (lines.length < 2) return []

    const header = lines[0].split(',')
    const rows: BacktestDetailRow[] = []

    for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',')
        if (vals.length < header.length) continue

        const row: any = {}
        header.forEach((col, idx) => {
            row[col.trim()] = vals[idx]?.trim() || ''
        })

        rows.push({
            method: row.method || '',
            gw: parseInt(row.gw) || 0,
            formation: row.formation || '',
            xi_points: parseFloat(row.xi_points) || 0,
            captain_id: row.captain_id ? parseInt(row.captain_id) : null,
            vice_id: row.vice_id ? parseInt(row.vice_id) : null,
            n_truth_matched: parseInt(row.n_truth_matched) || 0,
            n_candidates: parseInt(row.n_candidates) || 0,
            budget_used: row.budget_used ? parseFloat(row.budget_used) : undefined,
            notes: row.notes || '',
            optimum_points: row.optimum_points ? parseFloat(row.optimum_points) : null,
            efficiency: row.efficiency ? parseFloat(row.efficiency) : null,
        })
    }

    return rows
}

function parseSummaryCsv(csv: string): BacktestSummaryRow[] {
    const lines = csv.trim().split('\n')
    if (lines.length < 2) return []

    const header = lines[0].split(',')
    const rows: BacktestSummaryRow[] = []

    for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',')
        if (vals.length < header.length) continue

        const row: any = {}
        header.forEach((col, idx) => {
            row[col.trim()] = vals[idx]?.trim() || ''
        })

        rows.push({
            method: row.method || '',
            avg_xi_points: parseFloat(row.avg_xi_points) || 0,
            std_xi_points: parseFloat(row.std_xi_points) || 0,
            n_gw: parseInt(row.n_gw) || 0,
            avg_efficiency: row.avg_efficiency ? parseFloat(row.avg_efficiency) : null,
        })
    }

    return rows
}
