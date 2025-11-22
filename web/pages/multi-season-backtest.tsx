import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import { LoadingState, ErrorState } from '../src/components/States'
import { Tooltip } from '../src/components/Tooltip'
import { tooltips } from '../src/data/tooltips'
import { Layers, Filter, CheckSquare, Square, TrendingUp, Activity, BarChart3, Info } from 'lucide-react'
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
    rf_relaxed: '#2563eb',
    rf_optfill: '#1d4ed8',
    ma3: '#10b981',
    pos: '#f59e0b',
}

const METHOD_NAMES: Record<string, string> = {
    rf: 'Random Forest',
    rf_relaxed: 'RF Relaxed',
    rf_optfill: 'RF OptFill',
    ma3: 'Moving Average 3',
    pos: 'Position Model',
}

const METHOD_DESCRIPTIONS: Record<string, string> = {
    rf: 'Standard Random Forest Modell mit strengen Datenfiltern',
    rf_relaxed: 'RF mit weniger strikten Filtern und Median-Imputation',
    rf_optfill: 'RF mit POS-Fallback bei Team-Selection Problemen',
    ma3: '3-Gameweek Moving Average (einfache Baseline)',
    pos: 'Positionsbasierter Durchschnitt der letzten 5 Spiele',
}

export default function MultiSeasonBacktestPage() {
    // Alle verfügbaren Seasons aus Multi-Season Backtest
    const ALL_SEASONS = ['2020-21', '2021-22', '2022-23', '2023-24']

    const [selectedSeason, setSelectedSeason] = useState<string>(ALL_SEASONS[0])
    const [selectedMethods, setSelectedMethods] = useState<string[]>(['rf', 'rf_relaxed', 'ma3'])
    const [backtestData, setBacktestData] = useState<BacktestData[]>([])
    const [state, setState] = useState<LoadingStateType>('idle')
    const [error, setError] = useState<string>('')

    // Verfügbare Methoden aus geladenen Daten
    const availableMethods = useMemo(() => {
        if (backtestData.length === 0) return []
        const methods = new Set<string>()
        backtestData.forEach(d => d.summary.forEach(s => methods.add(s.method)))
        return Array.from(methods).sort()
    }, [backtestData])

    // Lade alle Season-Backtests on mount
    useEffect(() => {
        loadAllBacktests()
    }, [])

    const loadAllBacktests = async () => {
        setState('loading')
        setError('')

        try {
            const promises = ALL_SEASONS.map(season =>
                fetch(`/api/backtest?season=${season}&gwStart=2&gwEnd=38`)
                    .then(res => res.ok ? res.json() : null)
                    .catch(() => null)
            )

            const results = await Promise.all(promises)
            const validData = results.filter((d): d is BacktestData => d !== null)

            if (validData.length === 0) {
                throw new Error('Keine Backtest-Daten gefunden')
            }

            setBacktestData(validData)
            setState('success')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Laden der Backtest-Daten')
            setState('error')
        }
    }

    // Aktuelle Season-Daten
    const currentSeasonData = useMemo(() =>
        backtestData.find(d => d.season === selectedSeason),
        [backtestData, selectedSeason]
    )

    // Gefilterte Summary nach ausgewählten Methoden
    const filteredSummary = useMemo(() => {
        if (!currentSeasonData) return []
        return currentSeasonData.summary.filter(s => selectedMethods.includes(s.method))
    }, [currentSeasonData, selectedMethods])

    // Toggle Method Selection
    const toggleMethod = (method: string) => {
        setSelectedMethods(prev =>
            prev.includes(method)
                ? prev.filter(m => m !== method)
                : [...prev, method]
        )
    }

    // Select/Deselect All Methods
    const selectAllMethods = () => setSelectedMethods(availableMethods)
    const deselectAllMethods = () => setSelectedMethods([])


    // Chart 1: Durchschnittliche Punkte pro Season (ausgewählte Methoden)
    const avgPointsChartOption = useMemo(() => {
        if (backtestData.length === 0 || selectedMethods.length === 0) return null

        const series = selectedMethods.map(method => ({
            name: METHOD_NAMES[method] || method.toUpperCase(),
            type: 'bar',
            data: backtestData.map(d => {
                const summary = d.summary.find(s => s.method === method)
                return summary ? summary.avg_xi_points.toFixed(2) : 0
            }),
            itemStyle: { color: METHOD_COLORS[method] || '#6b7280' }
        }))

        return {
            title: {
                text: 'Durchschnittliche Punkte pro Season',
                left: 'center',
                textStyle: { fontSize: 18, fontWeight: 'bold', color: '#374151' }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params: any) => {
                    let result = `<strong>${params[0].axisValue}</strong><br/>`
                    params.forEach((p: any) => {
                        result += `${p.marker} ${p.seriesName}: <strong>${p.data}</strong> Punkte<br/>`
                    })
                    return result
                }
            },
            legend: { bottom: 10, textStyle: { color: '#6b7280' } },
            grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
            xAxis: {
                type: 'category',
                data: backtestData.map(d => d.season),
                axisLabel: { color: '#6b7280', fontSize: 12 }
            },
            yAxis: {
                type: 'value',
                name: 'Ø Punkte',
                axisLabel: { color: '#6b7280' },
                nameTextStyle: { color: '#374151' }
            },
            series
        }
    }, [backtestData, selectedMethods])

    // Chart 2: Anzahl gültiger Gameweeks (Coverage)
    const coverageChartOption = useMemo(() => {
        if (backtestData.length === 0 || selectedMethods.length === 0) return null

        const series = selectedMethods.map(method => ({
            name: METHOD_NAMES[method] || method.toUpperCase(),
            type: 'line',
            data: backtestData.map(d => {
                const summary = d.summary.find(s => s.method === method)
                return summary ? summary.n_gw : 0
            }),
            itemStyle: { color: METHOD_COLORS[method] || '#6b7280' },
            lineStyle: { width: 3 },
            symbol: 'circle',
            symbolSize: 8
        }))

        return {
            title: {
                text: 'Anzahl erfolgreicher Gameweeks (Coverage)',
                left: 'center',
                textStyle: { fontSize: 18, fontWeight: 'bold', color: '#374151' }
            },
            tooltip: {
                trigger: 'axis',
                formatter: (params: any) => {
                    let result = `<strong>${params[0].axisValue}</strong><br/>`
                    params.forEach((p: any) => {
                        result += `${p.marker} ${p.seriesName}: <strong>${p.data}</strong> GWs<br/>`
                    })
                    return result
                }
            },
            legend: { bottom: 10, textStyle: { color: '#6b7280' } },
            grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
            xAxis: {
                type: 'category',
                data: backtestData.map(d => d.season),
                axisLabel: { color: '#6b7280', fontSize: 12 }
            },
            yAxis: {
                type: 'value',
                name: '# Gameweeks',
                min: 0,
                max: 37,
                axisLabel: { color: '#6b7280' },
                nameTextStyle: { color: '#374151' }
            },
            series
        }
    }, [backtestData, selectedMethods])

    // Chart 3: Methoden-Vergleich für ausgewählte Season
    const seasonComparisonOption = useMemo(() => {
        if (!currentSeasonData || filteredSummary.length === 0) return null

        return {
            title: {
                text: `Methoden-Vergleich: ${selectedSeason}`,
                left: 'center',
                textStyle: { fontSize: 18, fontWeight: 'bold', color: '#374151' }
            },
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    return `<strong>${params.name}</strong><br/>
                            Ø Punkte: <strong>${params.value}</strong><br/>
                            Anteil: ${params.percent}%`
                }
            },
            legend: { bottom: 10, textStyle: { color: '#6b7280' } },
            series: [
                {
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: true,
                        formatter: '{b}: {c} pts'
                    },
                    data: filteredSummary.map(s => ({
                        name: METHOD_NAMES[s.method] || s.method.toUpperCase(),
                        value: s.avg_xi_points.toFixed(2),
                        itemStyle: { color: METHOD_COLORS[s.method] || '#6b7280' }
                    }))
                }
            ]
        }
    }, [currentSeasonData, filteredSummary, selectedSeason])

    // Chart 4: Detail-Verlauf für ausgewählte Season
    const seasonDetailOption = useMemo(() => {
        if (!currentSeasonData || selectedMethods.length === 0) return null

        const series = selectedMethods.map(method => {
            const details = currentSeasonData.detail.filter(d => d.method === method)
            return {
                name: METHOD_NAMES[method] || method.toUpperCase(),
                type: 'line',
                data: details.map(d => ({ value: d.xi_points, gw: d.gw })),
                itemStyle: { color: METHOD_COLORS[method] || '#6b7280' },
                lineStyle: { width: 2 },
                symbol: 'circle',
                symbolSize: 6
            }
        })

        const allGws = Array.from(
            new Set(currentSeasonData.detail.map(d => d.gw))
        ).sort((a, b) => a - b)

        return {
            title: {
                text: `Punkteverlauf GW-für-GW: ${selectedSeason}`,
                left: 'center',
                textStyle: { fontSize: 18, fontWeight: 'bold', color: '#374151' }
            },
            tooltip: {
                trigger: 'axis',
                formatter: (params: any) => {
                    let result = `<strong>GW ${params[0].axisValue}</strong><br/>`
                    params.forEach((p: any) => {
                        if (p.data) {
                            result += `${p.marker} ${p.seriesName}: <strong>${p.data.value}</strong> Punkte<br/>`
                        }
                    })
                    return result
                }
            },
            legend: { bottom: 10, textStyle: { color: '#6b7280' } },
            grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
            xAxis: {
                type: 'category',
                data: allGws,
                name: 'Gameweek',
                axisLabel: { color: '#6b7280', fontSize: 11 },
                nameTextStyle: { color: '#374151' }
            },
            yAxis: {
                type: 'value',
                name: 'Punkte',
                axisLabel: { color: '#6b7280' },
                nameTextStyle: { color: '#374151' }
            },
            series
        }
    }, [currentSeasonData, selectedMethods, selectedSeason])

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
                        className="text-center mb-10"
                    >
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Layers className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                                Multi-Season Backtest
                            </h1>
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Vergleich der Modellperformance über 4 Saisons (2020-21 bis 2023-24)
                        </p>
                    </motion.div>

                    {/* Loading/Error States */}
                    {state === 'loading' && <LoadingState message="Lade Multi-Season Backtest-Daten..." />}
                    {state === 'error' && <ErrorState message={error} />}

                    {/* Controls */}
                    {state === 'success' && backtestData.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Season Selector */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        <Activity className="w-4 h-4" />
                                        Season auswählen
                                    </label>
                                    <select
                                        value={selectedSeason}
                                        onChange={(e) => setSelectedSeason(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    >
                                        {ALL_SEASONS.map(season => (
                                            <option key={season} value={season}>
                                                {season}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Method Filter */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            <Filter className="w-4 h-4" />
                                            Methoden zum Vergleich
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={selectAllMethods}
                                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                            >
                                                Alle
                                            </button>
                                            <button
                                                onClick={deselectAllMethods}
                                                className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                                            >
                                                Keine
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {availableMethods.map(method => (
                                            <button
                                                key={method}
                                                onClick={() => toggleMethod(method)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${selectedMethods.includes(method)
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                    }`}
                                            >
                                                {selectedMethods.includes(method) ? (
                                                    <CheckSquare className="w-4 h-4" />
                                                ) : (
                                                    <Square className="w-4 h-4" />
                                                )}
                                                <span className="text-sm font-medium">
                                                    {METHOD_NAMES[method] || method.toUpperCase()}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Methoden-Erklärungen */}
                    {state === 'success' && backtestData.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5 mb-8"
                        >
                            <div className="flex items-start gap-3">
                                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">Methoden-Erklärung</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        {Object.entries(METHOD_DESCRIPTIONS).map(([method, desc]) => (
                                            <div key={method} className="flex gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                                                    style={{ backgroundColor: METHOD_COLORS[method] }}
                                                />
                                                <div>
                                                    <strong className="text-blue-900 dark:text-blue-100">
                                                        {METHOD_NAMES[method]}:
                                                    </strong>
                                                    <span className="text-blue-800 dark:text-blue-200 ml-1">
                                                        {desc}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Summary Table */}
                    {state === 'success' && backtestData.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.25 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Gesamt-Übersicht: Alle Seasons
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-200 font-semibold">Season</th>
                                            <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-200 font-semibold">Methode</th>
                                            <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-200 font-semibold">Ø Punkte</th>
                                            <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-200 font-semibold">Std. Abw.</th>
                                            <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-200 font-semibold">
                                                # GWs
                                                <Tooltip content="Anzahl erfolgreicher Gameweeks (Coverage)">
                                                    <span className="ml-1 text-gray-500 cursor-help">ℹ</span>
                                                </Tooltip>
                                            </th>
                                            <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-200 font-semibold">
                                                Ø Effizienz
                                                <Tooltip content={tooltips.effizienz || "Verhältnis zu optimalen Punkten"}>
                                                    <span className="ml-1 text-gray-500 cursor-help">ℹ</span>
                                                </Tooltip>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {backtestData.map(seasonData =>
                                            seasonData.summary
                                                .filter(s => selectedMethods.includes(s.method))
                                                .map((row) => (
                                                    <tr
                                                        key={`${seasonData.season}-${row.method}`}
                                                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                                    >
                                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                                                            {seasonData.season}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-3 h-3 rounded-full"
                                                                    style={{ backgroundColor: METHOD_COLORS[row.method] }}
                                                                />
                                                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                                                    {METHOD_NAMES[row.method] || row.method.toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-900 dark:text-white font-bold text-base">
                                                            {row.avg_xi_points.toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                            ±{row.std_xi_points.toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-semibold">
                                                            {row.n_gw} / 37
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                            {row.avg_efficiency != null
                                                                ? `${(row.avg_efficiency * 100).toFixed(1)}%`
                                                                : '-'}
                                                        </td>
                                                    </tr>
                                                ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {/* Charts Grid */}
                    {state === 'success' && backtestData.length > 0 && selectedMethods.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Chart 1: Avg Points */}
                            {avgPointsChartOption && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700"
                                >
                                    <ReactECharts option={avgPointsChartOption} style={{ height: '400px' }} />
                                </motion.div>
                            )}

                            {/* Chart 2: Coverage */}
                            {coverageChartOption && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.35 }}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700"
                                >
                                    <ReactECharts option={coverageChartOption} style={{ height: '400px' }} />
                                </motion.div>
                            )}

                            {/* Chart 3: Season Comparison Pie */}
                            {seasonComparisonOption && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.4 }}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700"
                                >
                                    <ReactECharts option={seasonComparisonOption} style={{ height: '400px' }} />
                                </motion.div>
                            )}

                            {/* Chart 4: Season Detail Line Chart */}
                            {seasonDetailOption && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.45 }}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700"
                                >
                                    <ReactECharts option={seasonDetailOption} style={{ height: '400px' }} />
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Empty State */}
                    {state === 'success' && selectedMethods.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12 text-gray-500 dark:text-gray-400"
                        >
                            <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Keine Methoden ausgewählt. Bitte wähle mindestens eine Methode zum Vergleich.</p>
                        </motion.div>
                    )}
                </div>
            </main>
        </>
    )
}
