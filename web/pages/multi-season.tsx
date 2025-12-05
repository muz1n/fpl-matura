import { useEffect, useState, useMemo } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { getUsableSeasons } from '../src/lib/seasonQuality'
import { LoadingState, ErrorState } from '../src/components/States'
import { TrendingUp, Info, Calendar } from 'lucide-react'

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
    summary: BacktestSummaryRow[]
}

interface MultiSeasonResponse {
    seasons: string[]
    gw_range: string
    data: BacktestData[]
    errors?: Array<{ season: string; error: string }>
}

// Methoden-Farben (konsistent mit Backtest - HOHER KONTRAST)
const METHOD_COLORS: Record<string, string> = {
    rf: '#ec4899',         // Pink-500
    rf_pos: '#22c55e',     // Green-500
    rf_rank: '#f97316',    // Orange-500
    rf_relaxed: '#8b5cf6', // Violet-500
    ma3: '#eab308',        // Yellow-500
    pos: '#ef4444',        // Red-500
}

const METHOD_LABELS: Record<string, string> = {
    rf: 'Random Forest (Standard)',
    rf_pos: 'Random Forest (Position)',
    rf_rank: 'Random Forest (Rank)',
    rf_relaxed: 'Random Forest (Relaxed)',
    ma3: 'Formdurchschnitt (MA3)',
    pos: 'Positionsmittel (POS)',
}

export default function MultiSeasonPage() {
    const [seasons, setSeasons] = useState<string[]>([])
    const [selectedSeasons, setSelectedSeasons] = useState<string[]>([])
    const [availableRanges, setAvailableRanges] = useState<string[]>([])
    const [gwRange, setGwRange] = useState<string>('')
    const [data, setData] = useState<MultiSeasonResponse | null>(null)
    const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [error, setError] = useState<string>('')

    useEffect(() => {
        async function loadSeasons() {
            try {
                const s = await getUsableSeasons()
                setSeasons(s)
                // Standardmässig die letzten 3 Saisons auswählen
                setSelectedSeasons(s.slice(-3))
            } catch {
                setSeasons(['2020-21', '2021-22', '2022-23', '2023-24'])
                setSelectedSeasons(['2021-22', '2022-23', '2023-24'])
            }
        }
        loadSeasons()
    }, [])

    // Lade verfügbare GW-Ranges für die erste ausgewählte Season
    useEffect(() => {
        if (selectedSeasons.length === 0) return
        async function fetchRanges() {
            try {
                const firstSeason = selectedSeasons[0]
                const res = await fetch(`/api/backtests/${firstSeason}`)
                if (!res.ok) {
                    setAvailableRanges(['2-38', '30-38'])
                    setGwRange('30-38')
                    return
                }
                const data = await res.json()
                const ranges = data.available_ranges ?? []
                setAvailableRanges(ranges)
                if (ranges.length > 0) {
                    const defaultRange = ranges[ranges.length - 1]
                    setGwRange(defaultRange)
                }
            } catch {
                setAvailableRanges(['2-38', '30-38'])
                setGwRange('30-38')
            }
        }
        fetchRanges()
    }, [selectedSeasons])

    useEffect(() => {
        if (selectedSeasons.length === 0 || !gwRange) {
            setState('idle')
            return
        }
        async function fetchData() {
            setState('loading')
            setError('')
            try {
                const seasonParam = selectedSeasons.join(',')
                const res = await fetch(`/api/backtest/multi?seasons=${seasonParam}&gwRange=${gwRange}`)
                if (!res.ok) {
                    const err = await res.json()
                    setError(err.error || 'Fehler beim Laden')
                    setState('error')
                    return
                }
                const json: MultiSeasonResponse = await res.json()
                setData(json)
                setState('success')
            } catch (e: any) {
                setError('Fehler beim Laden der Daten: ' + (e.message || 'Unbekannter Fehler'))
                setState('error')
            }
        }
        fetchData()
    }, [selectedSeasons, gwRange])

    // Daten für Chart vorbereiten: Pro Methode die Effizienz über alle Saisons
    const chartData = useMemo(() => {
        if (!data || !data.data || data.data.length === 0) {
            return null
        }

        const methodsData: Record<string, { method: string; methodKey: string; seasons: Record<string, number> }> = {}

        data.data.forEach(seasonData => {
            seasonData.summary
                .filter(row => row.method !== 'rf_filled' && row.method !== 'rf_optfill')
                .forEach(row => {
                    if (!methodsData[row.method]) {
                        methodsData[row.method] = {
                            method: METHOD_LABELS[row.method] || row.method,
                            methodKey: row.method,
                            seasons: {},
                        }
                    }
                    // Effizienz ist als Dezimalzahl gespeichert (0-1), daher * 100
                    const efficiency = (row.avg_efficiency ?? 0) * 100
                    methodsData[row.method].seasons[seasonData.season] = efficiency
                })
        })

        return Object.values(methodsData)
    }, [data])

    const chartOption: EChartsOption | null = useMemo(() => {
        if (!chartData || chartData.length === 0) {
            return null
        }

        const methods = chartData.map(d => d.method)
        const seriesData = selectedSeasons.map((season, idx) => ({
            name: season,
            type: 'bar' as const,
            data: chartData.map(d => d.seasons[season] ?? 0),
            itemStyle: {
                color: `hsl(${(idx * 360) / selectedSeasons.length}, 70%, 60%)`,
            },
        }))

        return {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                backgroundColor: 'rgba(30, 41, 59, 0.95)',
                borderColor: '#475569',
                borderWidth: 1,
                textStyle: { color: '#e2e8f0' },
                formatter: (params: any) => {
                    let tooltip = `<strong>${params[0].axisValue}</strong><br/>`
                    params.forEach((param: any) => {
                        tooltip += `${param.marker} ${param.seriesName}: <strong>${param.value.toFixed(2)}%</strong><br/>`
                    })
                    return tooltip
                },
            },
            legend: {
                data: selectedSeasons,
                textStyle: { color: '#cbd5e1' },
                top: 10,
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                top: '15%',
                containLabel: true,
            },
            xAxis: {
                type: 'category',
                data: methods,
                axisLabel: {
                    rotate: 45,
                    color: '#cbd5e1',
                    fontSize: 11,
                },
                axisLine: { lineStyle: { color: '#475569' } },
            },
            yAxis: {
                type: 'value',
                name: 'Effizienz (%)',
                nameTextStyle: { color: '#cbd5e1' },
                axisLabel: { color: '#cbd5e1' },
                axisLine: { lineStyle: { color: '#475569' } },
                splitLine: { lineStyle: { color: '#334155' } },
                min: 0,
                max: 100,
            },
            series: seriesData,
        }
    }, [chartData, selectedSeasons])

    const toggleSeason = (season: string) => {
        setSelectedSeasons(prev =>
            prev.includes(season) ? prev.filter(s => s !== season) : [...prev, season]
        )
    }

    return (
        <>
            <Head>
                <title>Multi-Season Analyse - FPL Matura</title>
            </Head>
            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="min-h-screen text-slate-100"
            >
                <div className="mx-auto px-4 pt-12 pb-16 space-y-6 max-w-7xl">
                    {/* Hero */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center space-y-3"
                    >
                        <div className="flex items-center justify-center gap-3">
                            <Calendar className="w-10 h-10 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600" />
                            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                                Multi-Season Analyse
                            </h1>
                        </div>
                        <p className="text-slate-300 text-lg max-w-3xl mx-auto">
                            Vergleiche die Effizienz der Prognosemethoden über mehrere Saisons hinweg
                        </p>
                    </motion.div>

                    {/* Info Box */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="bg-slate-800/90 border border-pink-500/20 rounded-2xl p-6 shadow-lg"
                    >
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2 text-sm text-slate-300">
                                <p>
                                    <strong>Die Multi-Season Analyse zeigt, wie stabil die Methoden über verschiedene Saisons hinweg performen.</strong>
                                </p>
                                <p>
                                    Ein gutes Modell sollte nicht nur in einer Saison gut abschneiden, sondern konsistent
                                    hohe Effizienz über mehrere Saisons erreichen. Starke Schwankungen deuten auf
                                    Overfitting oder saisonspezifische Muster hin.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Controls */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-slate-800/90 border border-pink-500/20 rounded-2xl p-6 shadow-lg space-y-4"
                    >
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Saisons auswählen (mindestens 2)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {seasons.map(season => (
                                    <button
                                        key={season}
                                        onClick={() => toggleSeason(season)}
                                        className={
                                            selectedSeasons.includes(season)
                                                ? "px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                                                : "px-4 py-2 rounded-xl text-sm font-medium bg-slate-900/60 text-slate-200 border border-slate-700 hover:border-pink-500/30"
                                        }
                                    >
                                        {season}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Gameweek-Bereich
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {availableRanges.length > 0 ? (
                                    availableRanges.map(range => (
                                        <button
                                            key={range}
                                            onClick={() => setGwRange(range)}
                                            className={
                                                gwRange === range
                                                    ? "px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                                                    : "px-4 py-2 rounded-xl text-sm font-medium bg-slate-900/60 text-slate-200 border border-slate-700 hover:border-pink-500/30"
                                            }
                                        >
                                            GW {range}
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400">Lade verfügbare Ranges...</p>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Debug Info - nur wenn nötig */}
                    {state === 'idle' && selectedSeasons.length > 0 && !gwRange && (
                        <div className="bg-slate-800/90 border border-yellow-500/20 rounded-2xl p-6 shadow-lg">
                            <p className="text-sm text-slate-300">Wähle einen Gameweek-Bereich aus...</p>
                        </div>
                    )}

                    {state === 'loading' && <LoadingState message="Lade Multi-Season Daten..." />}
                    {state === 'error' && <ErrorState message={error} />}

                    {state === 'success' && data && chartData && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="space-y-6"
                        >
                            {/* Chart */}
                            <div className="bg-slate-800/90 border border-pink-500/20 rounded-2xl p-6 shadow-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-slate-100">
                                        Effizienz nach Methode und Saison
                                    </h2>
                                    <TrendingUp className="w-5 h-5 text-pink-500" />
                                </div>
                                {chartOption && (
                                    <div className="w-full h-[500px]">
                                        <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
                                    </div>
                                )}
                            </div>

                            {/* Tabelle */}
                            <div className="bg-slate-800/90 border border-pink-500/20 rounded-2xl p-6 shadow-lg overflow-x-auto">
                                <h2 className="text-lg font-semibold text-slate-100 mb-4">Detaillierte Ergebnisse</h2>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left py-3 px-4 text-slate-300 font-medium">Methode</th>
                                            {selectedSeasons.map(season => (
                                                <th key={season} className="text-right py-3 px-4 text-slate-300 font-medium">
                                                    {season}
                                                </th>
                                            ))}
                                            <th className="text-right py-3 px-4 text-slate-300 font-medium">Ø Effizienz</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {chartData.map(row => {
                                            const avgEff =
                                                selectedSeasons.reduce((sum, s) => sum + (row.seasons[s] || 0), 0) /
                                                selectedSeasons.length
                                            return (
                                                <tr key={row.methodKey} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                                    <td className="py-3 px-4 font-medium text-slate-100">{row.method}</td>
                                                    {selectedSeasons.map(season => (
                                                        <td key={season} className="text-right py-3 px-4 text-slate-300">
                                                            {row.seasons[season] ? `${row.seasons[season].toFixed(2)}%` : '-'}
                                                        </td>
                                                    ))}
                                                    <td className="text-right py-3 px-4 font-semibold text-pink-400">
                                                        {avgEff.toFixed(2)}%
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Interpretation */}
                            <div className="bg-slate-800/90 border border-purple-500/20 rounded-2xl p-6 shadow-lg">
                                <h2 className="text-lg font-semibold text-slate-100 mb-3">Interpretation</h2>
                                <div className="space-y-2 text-sm text-slate-300">
                                    <p>
                                        <strong className="text-purple-400">Hohe durchschnittliche Effizienz:</strong> Methode
                                        ist über mehrere Saisons konsistent gut
                                    </p>
                                    <p>
                                        <strong className="text-purple-400">Geringe Schwankung:</strong> Modell ist robust und
                                        generalisiert gut auf neue Daten
                                    </p>
                                    <p>
                                        <strong className="text-purple-400">RF vs. Baselines:</strong> Random Forest sollte
                                        konsistent besser abschneiden als MA3 und POS
                                    </p>
                                </div>
                            </div>

                            {/* Errors */}
                            {data.errors && data.errors.length > 0 && (
                                <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
                                    <p className="text-sm text-amber-300 font-medium mb-2">
                                        Einige Saisons konnten nicht geladen werden:
                                    </p>
                                    <ul className="list-disc list-inside text-xs text-amber-200 space-y-1">
                                        {data.errors.map((err, idx) => (
                                            <li key={idx}>
                                                {err.season}: {err.error}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </motion.main>
        </>
    )
}
