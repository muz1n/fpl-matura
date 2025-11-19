import type { NextApiRequest, NextApiResponse } from 'next'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const OUT_DIR = process.env.FPL_OUT_DIR || join(process.cwd(), '..', 'out')

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
}

interface BacktestSummaryRow {
    method: string
    avg_xi_points: number
    std_xi_points: number
    n_gw: number
}

interface BacktestResponse {
    season: string
    gw_start: number
    gw_end: number
    detail: BacktestDetailRow[]
    summary: BacktestSummaryRow[]
}

/**
 * Scannt OUT_DIR nach verfügbaren Backtest GW-Ranges für eine Season
 */
async function getAvailableRanges(season: string): Promise<string[]> {
    try {
        const files = await readdir(OUT_DIR)
        const ranges = new Set<string>()
        
        // Pattern: team_backtest_{season}_gw{start}-{end}.csv
        const pattern = new RegExp(`^team_backtest_${season.replace(/[-]/g, '-')}_gw(\\d+)-(\\d+)\\.csv$`)
        
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
        const detailFile = join(OUT_DIR, `team_backtest_${season}_gw${gwStart}-${gwEnd}.csv`)
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
        const summaryFile = join(OUT_DIR, `team_backtest_summary_${season}_gw${gwStart}-${gwEnd}.csv`)
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
