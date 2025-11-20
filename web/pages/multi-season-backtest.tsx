import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import { Select } from '../src/components/Select'
import { LoadingState, ErrorState } from '../src/components/States'
import { Tooltip } from '../src/components/Tooltip'
import { tooltips } from '../src/data/tooltips'
import { getUsableSeasons } from '../lib/seasonQuality'
import { BarChart3, Download, TrendingUp, Activity, Target, Layers } from 'lucide-react'
import { Navbar } from '../src/components/Navbar'
import ReactECharts from 'echarts-for-react'

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

interface MultiSeasonResponse {
    seasons: string[]
    gw_range: string
    data: BacktestData[]
    errors?: Array<{ season: string; error: string }>
}

type LoadingStateType = 'idle' | 'loading' | 'success' | 'error'

const METHOD_COLORS: Record<string, string> = {
    rf: '#3b82f6',
    rf_rank: '#8b5cf6',
    rf_pos: '#6366f1',
    ma3: '#10b981',
    pos: '#f59e0b',
    legacy: '#6b7280'
}

export default function MultiSeasonBacktestPage() {
    const [availableSeasons, setAvailableSeasons] = useState<string[]>([])
    const [selectedSeasons, setSelectedSeasons] = useState<string[]>([])
    const [seasonsLoading, setSeasonsLoading] = useState<boolean>(true)
    const [gwRange, setGwRange] = useState<string>('30-38')

    const [backtestData, setBacktestData] = useState<MultiSeasonResponse | null>(null)
    const [state, setState] = useState<LoadingStateType>('idle')
    const [error, setError] = useState<string>('')

    // Lade verfügbare Seasons on mount
    useEffect(() => {
        async function loadSeasons() {
            try {
                const seasons = await getUsableSeasons()
                setAvailableSeasons(seasons)
                // Default: letzte 3 Seasons
                if (seasons.length >= 3) {
                    setSelectedSeasons(seasons.slice(-3))
                } else {
                    setSelectedSeasons(seasons)
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

    // Lade Multi-Season Backtest
    const loadBacktest = async () => {
        if (selectedSeasons.length === 0 || !gwRange) return

        setState('loading')
        setError('')

        try {
            const res = await fetch(`/api/backtest/multi?seasons=${selectedSeasons.join(',')}&gwRange=${gwRange}`)

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                const errorMsg = errorData.error || 'Fehler beim Laden der Multi-Season Backtest-Daten'
                const suggestion = errorData.suggestion ? `\n${errorData.suggestion}` : ''
                throw new Error(errorMsg + suggestion)
            }

            const data: MultiSeasonResponse = await res.json()
            setBacktestData(data)
            setState('success')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
            setState('error')
            setBacktestData(null)
        }
    }

    useEffect(() => {
        loadBacktest()
    }, [selectedSeasons, gwRange])

    // Toggle Season Selection
    const toggleSeason = (season: string) => {
        setSelectedSeasons(prev =>
            prev.includes(season) ? prev.filter(s => s !== season) : [...prev, season]
        )
    }

    // Chart: Avg Points per Season & Method
    const avgPointsChartOption = useMemo(() => {
        if (!backtestData || backtestData.data.length === 0) return null

        const methods = Array.from(new Set(
            backtestData.data.flatMap(d => d.summary.map(s => s.method))
        ))

        const series = methods.map(method => ({
            name: method.toUpperCase(),
            type: 'bar',
            data: backtestData.data.map(d => {
                const summary = d.summary.find(s => s.method === method)
                return summary ? summary.avg_xi_points : 0
            }),
            itemStyle: { color: METHOD_COLORS[method] || '#6b7280' }
        }))

        return {
            title: { text: 'Durchschnittliche Punkte pro Season', left: 'center', textStyle: { color: '#374151' } },
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            legend: { bottom: 0, textStyle: { color: '#6b7280' } },
            xAxis: {
                type: 'category',
                data: backtestData.data.map(d => d.season),
                axisLabel: { color: '#6b7280' }
            },
            yAxis: {
                type: 'value',
                name: 'Ø Punkte',
                axisLabel: { color: '#6b7280' }
            },
            series
        }
    }, [backtestData])

    // Chart: Efficiency per Season & Method
    const efficiencyChartOption = useMemo(() => {
        if (!backtestData || backtestData.data.length === 0) return null

        const methods = Array.from(new Set(
            backtestData.data.flatMap(d => d.summary.map(s => s.method))
        ))

        const series = methods.map(method => ({
            name: method.toUpperCase(),
            type: 'line',
            data: backtestData.data.map(d => {
                const summary = d.summary.find(s => s.method === method)
                return summary?.avg_efficiency != null ? (summary.avg_efficiency * 100).toFixed(1) : null
            }),
            itemStyle: { color: METHOD_COLORS[method] || '#6b7280' },
            lineStyle: { width: 3 }
        }))

        return {
            title: { text: 'Durchschnittliche Effizienz pro Season (%)', left: 'center', textStyle: { color: '#374151' } },
            tooltip: { trigger: 'axis' },
            legend: { bottom: 0, textStyle: { color: '#6b7280' } },
            xAxis: {
                type: 'category',
                data: backtestData.data.map(d => d.season),
                axisLabel: { color: '#6b7280' }
            },
            yAxis: {
                type: 'value',
                name: 'Effizienz (%)',
                min: 0,
                max: 100,
                axisLabel: { color: '#6b7280' }
            },
            series
        }
    }, [backtestData])

    return (
        <>
            <Head>
                <title>Multi-Season Backtest | FPL Maturaarbeit</title>
            </Head>

            <Navbar />

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
                            <Layers className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                                Multi-Season Backtest
                            </h1>
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto flex items-center justify-center gap-2">
                            Vergleich der Modellperformance über mehrere Saisons hinweg
                            <Tooltip content={tooltips.multi_season}>
                                <span className="text-sm text-gray-500 cursor-help">ℹ</span>
                            </Tooltip>
                        </p>
                    </motion.div>

                    {/* Controls */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8"
                    >
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Seasons auswählen (Mehrfachauswahl)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {availableSeasons.map(season => (
                                        <button
                                            key={season}
                                            onClick={() => toggleSeason(season)}
                                            className={`px-4 py-2 rounded-lg border transition-colors ${
                                                selectedSeasons.includes(season)
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                            {season}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    GW Range
                                </label>
                                <input
                                    type="text"
                                    value={gwRange}
                                    onChange={(e) => setGwRange(e.target.value)}
                                    placeholder="z.B. 30-38"
                                    className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Loading/Error States */}
                    {state === 'loading' && <LoadingState message="Lade Multi-Season Backtest-Daten..." />}
                    {state === 'error' && <ErrorState message={error} />}

                    {/* Summary Table */}
                    {state === 'success' && backtestData && backtestData.data.length > 0 && (
                        <>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8"
                            >
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Summary Tabelle</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-200">Season</th>
                                                <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-200">Methode</th>
                                                <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-200">Ø Punkte</th>
                                                <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-200">Std. Abw.</th>
                                                <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-200">
                                                    <Tooltip content={tooltips.effizienz}>
                                                        <span className="border-b border-dotted border-gray-400 cursor-help">Ø Effizienz</span>
                                                    </Tooltip>
                                                </th>
                                                <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-200"># GWs</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {backtestData.data.map(seasonData =>
                                                seasonData.summary.map((row, idx) => (
                                                    <tr
                                                        key={`${seasonData.season}-${row.method}`}
                                                        className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                                                            idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'
                                                        }`}
                                                    >
                                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{seasonData.season}</td>
                                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{row.method.toUpperCase()}</td>
                                                        <td className="px-4 py-2 text-gray-900 dark:text-white font-semibold">{row.avg_xi_points.toFixed(1)}</td>
                                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">±{row.std_xi_points.toFixed(1)}</td>
                                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                                            {row.avg_efficiency != null ? `${(row.avg_efficiency * 100).toFixed(1)}%` : '-'}
                                                        </td>
                                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{row.n_gw}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>

                            {/* Charts */}
                            {avgPointsChartOption && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8"
                                >
                                    <ReactECharts option={avgPointsChartOption} style={{ height: '500px' }} />
                                </motion.div>
                            )}

                            {efficiencyChartOption && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.4 }}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8"
                                >
                                    <ReactECharts option={efficiencyChartOption} style={{ height: '500px' }} />
                                </motion.div>
                            )}
                        </>
                    )}

                    {/* Errors */}
                    {backtestData?.errors && backtestData.errors.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8"
                        >
                            <h3 className="text-amber-800 dark:text-amber-400 font-semibold mb-2">Teilweise Fehler:</h3>
                            <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside">
                                {backtestData.errors.map(err => (
                                    <li key={err.season}>{err.season}: {err.error}</li>
                                ))}
                            </ul>
                        </motion.div>
                    )}
                </div>
            </main>
        </>
    )
}
