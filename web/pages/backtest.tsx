import { useEffect, useState } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import { Select } from '../src/components/Select'
import { LoadingState, ErrorState } from '../src/components/States'
import { TeamBacktestChart } from '../src/components/TeamBacktestChart'
import { getUsableSeasons } from '../lib/seasonQuality'
import { BarChart3, Download, TrendingUp, Activity, Target } from 'lucide-react'

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

interface BacktestData {
    season: string
    gw_start: number
    gw_end: number
    detail: BacktestDetailRow[]
    summary: BacktestSummaryRow[]
}

type LoadingStateType = 'idle' | 'loading' | 'success' | 'error'

export default function BacktestPage() {
    const [availableSeasons, setAvailableSeasons] = useState<string[]>([])
    const [seasonsLoading, setSeasonsLoading] = useState<boolean>(true)
    const [selectedSeason, setSelectedSeason] = useState<string>('2022-23')

    const [availableRanges, setAvailableRanges] = useState<string[]>([])
    const [selectedRange, setSelectedRange] = useState<string | null>(null)

    const [backtestData, setBacktestData] = useState<BacktestData | null>(null)
    const [state, setState] = useState<LoadingStateType>('idle')
    const [error, setError] = useState<string>('')

    // Lade verfügbare Seasons on mount
    useEffect(() => {
        async function loadSeasons() {
            try {
                const seasons = await getUsableSeasons()
                setAvailableSeasons(seasons)
                if (seasons.length > 0 && !selectedSeason) {
                    setSelectedSeason(seasons[seasons.length - 1])
                }
            } catch (err) {
                console.error('Fehler beim Laden der Seasons:', err)
                setAvailableSeasons(['2020-21', '2021-22', '2022-23', '2023-24'])
            } finally {
                setSeasonsLoading(false)
            }
        }
        loadSeasons()
    }, [])

    // Lade verfügbare GW-Ranges für ausgewählte Season
    useEffect(() => {
        if (!selectedSeason) return

        async function fetchRanges() {
            try {
                const res = await fetch(`/api/backtest/${selectedSeason}`)
                if (!res.ok) {
                    throw new Error('Fehler beim Laden der verfügbaren Ranges')
                }

                const data = await res.json()
                setAvailableRanges(data.available_ranges || [])

                // Setze default Range (neueste/letzte)
                if (data.available_ranges && data.available_ranges.length > 0) {
                    setSelectedRange(data.available_ranges[data.available_ranges.length - 1])
                } else {
                    setSelectedRange(null)
                }
            } catch (err) {
                console.error('Error fetching ranges:', err)
                setAvailableRanges([])
                setSelectedRange(null)
            }
        }

        fetchRanges()
    }, [selectedSeason])

    // Lade Backtest-Daten wenn Season + Range ausgewählt
    useEffect(() => {
        if (!selectedSeason || !selectedRange) return

        async function fetchBacktest() {
            setState('loading')
            setError('')

            try {
                const res = await fetch(`/api/backtest/${selectedSeason}/${selectedRange}`)

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}))
                    const errorMsg = errorData.error || 'Fehler beim Laden der Backtest-Daten'
                    const suggestion = errorData.suggestion ? `\n${errorData.suggestion}` : ''
                    throw new Error(errorMsg + suggestion)
                }

                const data: BacktestData = await res.json()
                setBacktestData(data)
                setState('success')
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
                setState('error')
                setBacktestData(null)
            }
        }

        fetchBacktest()
    }, [selectedSeason, selectedRange])

    // Helper: Berechne Max-Punkte pro Methode
    const getMaxPoints = (method: string): number => {
        if (!backtestData) return 0
        const methodData = backtestData.detail.filter(r => r.method === method && r.xi_points > 0)
        return methodData.length > 0 ? Math.max(...methodData.map(r => r.xi_points)) : 0
    }

    return (
        <>
            <Head>
                <title>Team Backtest - FPL Matura</title>
                <meta name="description" content="Multi-GW Team Backtest: Vergleich verschiedener Prognosemethoden" />
            </Head>

            <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                <div className="container mx-auto px-4 py-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-12"
                    >
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <BarChart3 className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                                Team Backtest
                            </h1>
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Multi-GW Vergleich: Wie gut hätten verschiedene Prognosemethoden über mehrere Gameweeks performt?
                        </p>
                    </motion.div>

                    {/* Controls */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label="Season"
                                value={selectedSeason}
                                onChange={(val) => setSelectedSeason(val as string)}
                                options={availableSeasons.map(s => ({
                                    value: s,
                                    label: `Season ${s}`
                                }))}
                                disabled={seasonsLoading || availableSeasons.length === 0}
                            />

                            <Select
                                label="GW Range"
                                value={selectedRange || ''}
                                onChange={(val) => setSelectedRange(val as string)}
                                options={availableRanges.map(r => ({
                                    value: r,
                                    label: `GW ${r}`
                                }))}
                                disabled={availableRanges.length === 0}
                            />
                        </div>

                        {availableRanges.length === 0 && !seasonsLoading && (
                            <div className="text-sm text-amber-600 dark:text-amber-400 mt-4">
                                Keine Backtest-Daten für Season {selectedSeason} verfügbar. Führe zuerst `team_backtest.py` aus.
                            </div>
                        )}
                    </motion.div>

                    {/* Loading/Error States */}
                    {state === 'loading' && <LoadingState message="Lade Backtest-Daten..." />}
                    {state === 'error' && <ErrorState message={error} />}

                    {/* Summary Cards */}
                    {state === 'success' && backtestData && backtestData.summary.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
                        >
                            {backtestData.summary.map((row, idx) => (
                                <div
                                    key={row.method}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {row.method.toUpperCase()}
                                        </h3>
                                        <Activity className="w-5 h-5 text-blue-500" />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4" />
                                                Ø Punkte
                                            </span>
                                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                                                {row.avg_xi_points.toFixed(1)}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                <Target className="w-4 h-4" />
                                                Max
                                            </span>
                                            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                                {getMaxPoints(row.method)}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                Std. Abw.
                                            </span>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                ± {row.std_xi_points.toFixed(1)}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <span className="text-xs text-gray-500 dark:text-gray-500">
                                                Gameweeks
                                            </span>
                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                {row.n_gw} GWs
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* Chart */}
                    {state === 'success' && backtestData && backtestData.detail.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <TeamBacktestChart
                                data={backtestData.detail}
                                title={`Team Backtest: ${backtestData.season}, GW ${backtestData.gw_start}-${backtestData.gw_end}`}
                                height="600px"
                            />
                        </motion.div>
                    )}

                    {/* Download Links */}
                    {state === 'success' && backtestData && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="mt-8 flex flex-wrap gap-4 justify-center"
                        >
                            <a
                                href={`/api/files?name=team_backtest_${backtestData.season}_gw${backtestData.gw_start}-${backtestData.gw_end}.csv`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Detail CSV
                            </a>

                            <a
                                href={`/api/files?name=team_backtest_summary_${backtestData.season}_gw${backtestData.gw_start}-${backtestData.gw_end}.csv`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Summary CSV
                            </a>

                            <a
                                href={`/api/files?name=team_backtest_${backtestData.season}_gw${backtestData.gw_start}-${backtestData.gw_end}.png`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                PNG Plot
                            </a>
                        </motion.div>
                    )}
                </div>
            </main>
        </>
    )
}
