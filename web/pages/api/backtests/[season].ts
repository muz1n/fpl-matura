import type { NextApiRequest, NextApiResponse } from 'next'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const OUT_DIR = process.env.FPL_OUT_DIR || join(process.cwd(), '..', 'out')

interface BacktestsBySeasonResponse {
    season: string
    artifacts: Array<{
        filename: string
        type: 'png' | 'csv'
        label: string
        href: string
        gw_from: number
        gw_to: number
    }>
}

const TEAM_BACKTEST_RE = /^team_backtest_(\d{4}-\d{2})_gw(\d+)-(\d+)\.(png|csv)$/
const TEAM_BACKTEST_SUMMARY_RE = /^team_backtest_summary_(\d{4}-\d{2})_gw(\d+)-(\d+)\.csv$/
const RF_RANK_BOOST_SUMMARY_RE = /^rf_rank_boost_summary_(\d{4}-\d{2})_gw(\d+)-(\d+)\.csv$/

export default async function handler(req: NextApiRequest, res: NextApiResponse<BacktestsBySeasonResponse | { error: string }>) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { season } = req.query
        const seasonStr = String(season || '').trim()
        if (!seasonStr) {
            return res.status(400).json({ error: 'Parameter season fehlt' })
        }

        const files = await readdir(OUT_DIR)
        const artifacts: BacktestsBySeasonResponse['artifacts'] = []

        for (const file of files) {
            let m: RegExpMatchArray | null
            if ((m = file.match(TEAM_BACKTEST_RE)) && m[1] === seasonStr) {
                const gw_from = Number(m[2])
                const gw_to = Number(m[3])
                const ext = m[4] as 'png' | 'csv'
                const label = ext === 'png' ? `Team Backtest ${seasonStr} (GW ${gw_from}-${gw_to})` : `Team Backtest Summary ${seasonStr} (GW ${gw_from}-${gw_to})`
                artifacts.push({ filename: file, type: ext, label, href: `/api/files?name=${encodeURIComponent(file)}`, gw_from, gw_to })
                continue
            }
            if ((m = file.match(TEAM_BACKTEST_SUMMARY_RE)) && m[1] === seasonStr) {
                const gw_from = Number(m[2])
                const gw_to = Number(m[3])
                const label = `Team Backtest Summary ${seasonStr} (GW ${gw_from}-${gw_to})`
                artifacts.push({ filename: file, type: 'csv', label, href: `/api/files?name=${encodeURIComponent(file)}`, gw_from, gw_to })
                continue
            }
            if ((m = file.match(RF_RANK_BOOST_SUMMARY_RE)) && m[1] === seasonStr) {
                const gw_from = Number(m[2])
                const gw_to = Number(m[3])
                const label = `RF Rank Boost Summary ${seasonStr} (GW ${gw_from}-${gw_to})`
                artifacts.push({ filename: file, type: 'csv', label, href: `/api/files?name=${encodeURIComponent(file)}`, gw_from, gw_to })
                continue
            }
        }

        artifacts.sort((a, b) => a.gw_from - b.gw_from)

        return res.status(200).json({ season: seasonStr, artifacts })
    } catch (e: any) {
        return res.status(500).json({ error: e?.message ?? 'Fehler beim Laden der Backtests' })
    }
}
