import type { NextApiRequest, NextApiResponse } from 'next'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const OUT_ROOT = process.env.FPL_OUT_DIR || join(process.cwd(), '..', 'out')
const BACKTEST_DIR = join(OUT_ROOT, 'backtests')

interface BacktestsBySeasonResponse {
    season: string
    available_ranges: string[]
}

async function findBacktestRanges(season: string): Promise<string[]> {
    let files: string[]
    try {
        files = await readdir(BACKTEST_DIR)
    } catch {
        // Ordner existiert nicht -> keine Ranges
        return []
    }

    const prefix = `team_backtest_${season}_gw`
    const ranges = new Set<string>()

    for (const file of files) {
        if (file.startsWith(prefix) && file.endsWith('.csv')) {
            // Beispiel: team_backtest_2023-24_gw2-38.csv
            const middle = file.slice(prefix.length, -'.csv'.length) // "2-38"
            if (middle && middle.includes('-')) {
                ranges.add(middle)
            }
        }
    }

    return Array.from(ranges).sort((a, b) => {
        const [af] = a.split('-').map(Number)
        const [bf] = b.split('-').map(Number)
        return af - bf
    })
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { season } = req.query

    if (!season || typeof season !== 'string') {
        return res.status(400).json({ error: 'Season Parameter fehlt' })
    }

    try {
        const available_ranges = await findBacktestRanges(season)
        return res.status(200).json({ season, available_ranges } as BacktestsBySeasonResponse)
    } catch (err: any) {
        console.error('Backtest Season API Fehler:', err)
        return res.status(500).json({
            error: err?.message ?? 'Fehler beim Laden der Backtests'
        })
    }
}
