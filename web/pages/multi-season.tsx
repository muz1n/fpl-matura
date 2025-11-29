import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import { LoadingState, ErrorState } from '../src/components/States'
import { Tooltip } from '../src/components/Tooltip'
import { tooltips } from '../src/data/tooltips'
import { Layers, Filter, CheckSquare, Square, TrendingUp, Activity, BarChart3, Info } from 'lucide-react'
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
    rf: '#3b82f6',           // Blau
    rf_relaxed: '#8b5cf6',   // Violett
    rf_optfill: '#06b6d4',   // Cyan
    rf_pos: '#6366f1',       // Indigo
    rf_rank: '#a855f7',      // Lila
    ma3: '#10b981',          // Grün
    pos: '#f59e0b',          // Orange
}

const METHOD_NAMES: Record<string, string> = {
    rf: 'Random Forest',
    rf_relaxed: 'RF Relaxed',
    rf_optfill: 'RF OptFill',
    rf_pos: 'RF POS',
    rf_rank: 'RF Rank',
    ma3: 'Moving Average 3',
    pos: 'Position Model',
}

const METHOD_DESCRIPTIONS: Record<string, string> = {
    rf: 'Standard Random Forest Modell mit strengen Datenfiltern',
    rf_relaxed: 'RF mit weniger strikten Filtern und Median-Imputation',
    rf_optfill: 'RF mit POS-Fallback bei Team-Selection Problemen',
    rf_pos: 'RF-Prognosen mit POS-basierter Team-Selektion',
    rf_rank: 'RF mit Ranking-Boost für Top-Spieler',
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

    /**
     * Lädt kombinierte Backtest-Daten für alle Seasons (Standard-Range GW2-38)
     * und setzt den State für Darstellung und Methodenselektion.
     */
    const loadAllBacktests = async () => {
        setState('loading')
        setError('')
        try {
            const gwRange = '2-38'
            const seasonsParam = ALL_SEASONS.join(',')
            const res = await fetch(`/api/backtest/multi?seasons=${seasonsParam}&gwRange=${gwRange}`)
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}))
                throw new Error(errJson.error || 'Fehler beim Laden der Multi-Season Backtests')
            }
            const json: MultiSeasonResponse = await res.json()
            setBacktestData(json.data || [])
            // Falls noch keine Methoden ausgewählt: alle aus erster Season nehmen
            if (json.data && json.data.length > 0) {
                const first = json.data[0]
                const methods = Array.from(new Set(first.detail.map(d => d.method)))
                if (methods.length) setSelectedMethods(methods)
            }
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
        if (backtestData.length === 0 || selectedMethods.length === 0) return null;
        const series = selectedMethods.map(method => ({
            name: METHOD_NAMES[method] || method.toUpperCase(),
            type: 'bar',
            data: backtestData.map(d => {
                const summary = d.summary.find(s => s.method === method);
                return summary ? summary.avg_xi_points.toFixed(2) : 0;
            }),
            itemStyle: { color: METHOD_COLORS[method] || '#6b7280' }
        }));
        return {
            title: {
                text: 'Durchschnittliche Punkte pro Season',
                left: 'center',
                textStyle: { fontSize: 18, fontWeight: 'bold', color: '#e2e8f0' }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params: any) => {
                    let result = `<strong>${params[0].axisValue}</strong><br/>`;
                    params.forEach((p: any) => {
                        result += `${p.marker} ${p.seriesName}: <strong>${p.data}</strong> Punkte<br/>`;
                    });
                    return result;
                }
            },
            legend: { bottom: 10, textStyle: { color: '#cbd5e1' } },
            grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
            xAxis: {
                type: 'category',
                data: backtestData.map(d => d.season),
                axisLabel: { color: '#cbd5e1', fontSize: 12 }
            },
            yAxis: {
                type: 'value'
            },
            series
        };
    }, [backtestData, selectedMethods]);

    // Chart 2: Coverage Chart
    const coverageChartOption = useMemo(() => {
        if (backtestData.length === 0 || selectedMethods.length === 0) return null;
        const series = selectedMethods.map(method => ({
            name: METHOD_NAMES[method] || method.toUpperCase(),
            type: 'bar',
            stack: 'coverage',
            data: backtestData.map(d => {
                const summary = d.summary.find(s => s.method === method);
                return summary ? summary.n_gw : 0;
            }),
            itemStyle: { color: METHOD_COLORS[method] || '#6b7280' }
        }));
        return {
            title: {
                text: 'Abgedeckte Spieltage pro Season',
                left: 'center',
                textStyle: { fontSize: 16, fontWeight: 'bold', color: '#e2e8f0' }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' }
            },
            legend: { bottom: 10, textStyle: { color: '#cbd5e1' } },
            grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
            xAxis: {
                type: 'category',
                data: backtestData.map(d => d.season),
                axisLabel: { color: '#cbd5e1', fontSize: 12 }
            },
            yAxis: {
                type: 'value',
                name: 'Spieltage'
            },
            series
        };
    }, [backtestData, selectedMethods]);

    // Chart 3: Methoden-Vergleich Pie
    const seasonComparisonOption = useMemo(() => {
        if (!currentSeasonData || filteredSummary.length === 0) return null;
        return {
            title: {
                text: `Methoden-Vergleich: ${selectedSeason}`,
                left: 'center',
                textStyle: { fontSize: 18, fontWeight: 'bold', color: '#e2e8f0' }
            },
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    return `<strong>${params.name}</strong><br/>Ø Punkte: <strong>${params.value}</strong><br/>Anteil: ${params.percent}%`;
                }
            },
            legend: { bottom: 10, textStyle: { color: '#cbd5e1' } },
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
        };
    }, [currentSeasonData, filteredSummary, selectedSeason]);

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
                textStyle: { fontSize: 18, fontWeight: 'bold', color: '#e2e8f0' }
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
            legend: { bottom: 10, textStyle: { color: '#cbd5e1' } },
            grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
            xAxis: {
                type: 'category',
                data: allGws,
                name: 'Gameweek',
                axisLabel: { color: '#cbd5e1', fontSize: 11 },
                nameTextStyle: { color: '#e2e8f0' }
            },
            yAxis: {
                type: 'value',
                name: 'Punkte',
                axisLabel: { color: '#cbd5e1' },
                nameTextStyle: { color: '#e2e8f0' }
            },
            series
        }
    }, [currentSeasonData, selectedMethods, selectedSeason])

    return (
        <>
            <Head>
                <title>Multi-Season Backtest | FPL Maturaarbeit</title>
            </Head>

            <main className="min-h-screen bg-slate-900 text-slate-100 px-4 py-8 max-w-7xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold mb-4">Multi-Season Backtest</h1>
                <p className="text-lg mb-6">Vergleich der Modellperformance über 4 Saisons (2020-21 bis 2023-24), Range GW2-38</p>

                {/* Loading/Error States */}
                {state === 'loading' && <LoadingState message="Lade Multi-Season Backtest-Daten..." />}
                {state === 'error' && (
                    <div className="bg-red-900/40 border border-red-700 text-red-100 rounded-2xl px-4 py-4 text-center space-y-2 max-w-xl mx-auto">
                        <div className="font-bold text-xl">Fehler – Multi-Season-Backtest nicht geladen</div>
                        <div className="text-sm">{error}</div>
                        <button
                            onClick={loadAllBacktests}
                            className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded-md text-white text-sm font-semibold"
                        >Erneut versuchen</button>
                    </div>
                )}

                {/* Controls */}
                {state === 'success' && backtestData.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-6 space-y-6 mb-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Season Selector */}
                            <div>
                                <label className="text-slate-300 text-sm font-medium flex items-center gap-2 mb-3">
                                    <Activity className="w-4 h-4" />
                                    Season auswählen
                                </label>
                                <select
                                    value={selectedSeason}
                                    onChange={(e) => setSelectedSeason(e.target.value)}
                                    className="w-full bg-slate-900/60 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
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
                                    <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                                        <Filter className="w-4 h-4" />
                                        Methoden zum Vergleich
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={selectAllMethods}
                                            className="text-xs text-emerald-400 hover:text-emerald-300"
                                        >
                                            Alle
                                        </button>
                                        <button
                                            onClick={deselectAllMethods}
                                            className="text-xs text-slate-400 hover:text-slate-300"
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
                                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${selectedMethods.includes(method)
                                                ? 'bg-emerald-600 text-white border-emerald-500'
                                                : 'bg-slate-900/60 text-slate-200 border-slate-700 hover:bg-slate-800'
                                                }`}
                                        >
                                            {selectedMethods.includes(method) ? (
                                                <CheckSquare className="w-4 h-4" />
                                            ) : (
                                                <Square className="w-4 h-4" />
                                            )}
                                            <span>
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
                        className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6 space-y-4 mb-8"
                    >
                        <div className="flex items-start gap-3">
                            <TrendingUp className="w-5 h-5 text-emerald-300 mt-0.5 flex-shrink-0" />
                            <div className="space-y-2 w-full">
                                <h3 className="text-lg font-semibold text-emerald-300">Methoden-Erklärung</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-300">
                                    {Object.entries(METHOD_DESCRIPTIONS).map(([method, desc]) => (
                                        <div key={method} className="flex gap-2 items-start">
                                            <div
                                                className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                                                style={{ backgroundColor: METHOD_COLORS[method] }}
                                            />
                                            <div>
                                                <strong className="text-slate-300">
                                                    {METHOD_NAMES[method]}:
                                                </strong>
                                                <span className="ml-1">
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
                        className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-6 overflow-x-auto mb-8"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-5 h-5 text-slate-100" />
                            <h2 className="text-2xl font-bold text-slate-100">
                                Gesamt-Übersicht: Alle Seasons
                            </h2>
                        </div>
                        <table className="w-full">
                            <thead className="bg-slate-900/80 border-b border-slate-700">
                                <tr>
                                    <th className="px-4 py-2 text-[11px] uppercase tracking-wide font-medium text-slate-400">Season</th>
                                    <th className="px-4 py-2 text-[11px] uppercase tracking-wide font-medium text-slate-400">Methode</th>
                                    <th className="px-4 py-2 text-[11px] uppercase tracking-wide font-medium text-slate-400">Ø Punkte</th>
                                    <th className="px-4 py-2 text-[11px] uppercase tracking-wide font-medium text-slate-400">Std. Abw.</th>
                                    <th className="px-4 py-2 text-[11px] uppercase tracking-wide font-medium text-slate-400">
                                        # GWs
                                        <Tooltip content="Anzahl erfolgreicher Gameweeks (Coverage)">
                                            <span className="ml-1 text-slate-400 cursor-help">ℹ</span>
                                        </Tooltip>
                                    </th>
                                    <th className="px-4 py-2 text-[11px] uppercase tracking-wide font-medium text-slate-400">
                                        Ø Effizienz
                                        <Tooltip content={tooltips.effizienz || "Verhältnis zu optimalen Punkten"}>
                                            <span className="ml-1 text-slate-400 cursor-help">ℹ</span>
                                        </Tooltip>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700 text-sm">
                                {backtestData.map(seasonData =>
                                    seasonData.summary
                                        .filter(s => selectedMethods.includes(s.method))
                                        .map((row) => (
                                            <tr
                                                key={`${seasonData.season}-${row.method}`}
                                                className="hover:bg-slate-800/60 transition-colors"
                                            >
                                                <td className="px-4 py-2 text-slate-100 font-semibold">{seasonData.season}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: METHOD_COLORS[row.method] }}
                                                        />
                                                        <span className="text-slate-100 font-medium">
                                                            {METHOD_NAMES[row.method] || row.method.toUpperCase()}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-slate-100 font-semibold text-right">{row.avg_xi_points.toFixed(2)}</td>
                                                <td className="px-4 py-2 text-slate-100 font-semibold text-right">±{row.std_xi_points.toFixed(2)}</td>
                                                <td className="px-4 py-2 text-slate-100 font-semibold text-right">{row.n_gw} / 37</td>
                                                <td className="px-4 py-2 text-slate-100 font-semibold text-right">{row.avg_efficiency != null ? `${(row.avg_efficiency * 100).toFixed(1)}%` : '-'}</td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
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
                                className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-6"
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
                                className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-6"
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
                                className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-6"
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
                                className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-6"
                            >
                                <ReactECharts option={seasonDetailOption} style={{ height: '400px' }} />
                            </motion.div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {state === 'success' && backtestData.length > 0 && selectedMethods.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12 text-slate-400"
                    >
                        <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Keine Methoden ausgewählt. Bitte wähle mindestens eine Methode zum Vergleich.</p>
                    </motion.div>
                )}
                {state === 'success' && backtestData.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        Keine kombinierten Backtest-Daten gefunden (GW2-38). Erzeuge zuerst Dateien in <code className="bg-slate-800 px-1 rounded">out/backtests/</code>.
                    </div>
                )}
            </main>
        </>
    )
}
