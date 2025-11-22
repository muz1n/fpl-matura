import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import { Select } from '../src/components/Select'
import { LoadingState, ErrorState } from '../src/components/States'
import { TeamBacktestChart } from '../src/components/TeamBacktestChart'
import { Tooltip } from '../src/components/Tooltip'
import { tooltips } from '../src/data/tooltips'
import { getUsableSeasons } from '../lib/seasonQuality'
import { BarChart3, Download, TrendingUp, Activity, Target, Filter, Table, ArrowUpDown } from 'lucide-react'
import { Navbar } from '../src/components/Navbar'

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
    const [selectedMethods, setSelectedMethods] = useState<string[]>([])
    const [showTable, setShowTable] = useState<boolean>(false)
    const [pivotCsvUrl, setPivotCsvUrl] = useState<string>('')
    const [sortColumn, setSortColumn] = useState<string>('gw')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

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
                // Alle Methoden initial selektiert
                const allMethods = Array.from(new Set(data.detail.map(r => r.method)))
                setSelectedMethods(allMethods)
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

    // Gefilterte Detail-Daten für Chart
    const filteredDetail = useMemo(() => {
        if (!backtestData) return []
        return backtestData.detail.filter(r => selectedMethods.includes(r.method))
    }, [backtestData, selectedMethods])

    // Pivot Table: GW -> { gw, rf, ma3, pos, best_method, best_points } mit Sortierung
    const pivotRows = useMemo(() => {
        if (!backtestData) return [] as Array<any>
        const byGw: Record<number, Record<string, number>> = {}
        for (const row of backtestData.detail) {
            if (row.xi_points <= 0) continue
            if (!byGw[row.gw]) byGw[row.gw] = {}
            byGw[row.gw][row.method] = row.xi_points
        }
        const rows: any[] = []
        Object.keys(byGw).map(n => Number(n)).sort((a, b) => a - b).forEach(gw => {
            const methodsMap = byGw[gw]
            const entries = Object.entries(methodsMap)
            if (entries.length === 0) return
            const best = entries.reduce((acc, cur) => cur[1] > acc[1] ? cur : acc)
            const detailGw = backtestData.detail.filter(d => d.gw === gw)
            const anyOptimum = detailGw.find(d => d.optimum_points && d.optimum_points > 0)
            const rfDetail = detailGw.find(d => d.method === 'rf')
            rows.push({
                gw,
                ...methodsMap,
                best_method: best[0],
                best_points: best[1],
                optimum: anyOptimum?.optimum_points ?? null,
                efficiency_rf: rfDetail?.efficiency ?? null,
            })
        })

        // Sortierung anwenden
        return rows.sort((a, b) => {
            const aVal = a[sortColumn] ?? 0
            const bVal = b[sortColumn] ?? 0
            if (sortDirection === 'asc') return aVal > bVal ? 1 : -1
            return aVal < bVal ? 1 : -1
        })
    }, [backtestData, sortColumn, sortDirection])

    // CSV Export erstellen (on demand bei Änderungen der PivotRows)
    useEffect(() => {
        if (!pivotRows.length) {
            setPivotCsvUrl('')
            return
        }
        const headersSet = new Set<string>()
        pivotRows.forEach(r => Object.keys(r).forEach(k => headersSet.add(k)))
        const headers = Array.from(headersSet)
        const lines = [headers.join(',')]
        pivotRows.forEach(r => {
            lines.push(headers.map(h => (r[h] !== undefined ? r[h] : '')).join(','))
        })
        const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        setPivotCsvUrl(url)
        return () => URL.revokeObjectURL(url)
    }, [pivotRows])

    const METHOD_COLORS: Record<string, string> = {
        rf: '#3b82f6',
        rf_rank: '#8b5cf6',
        rf_pos: '#6366f1',
        ma3: '#10b981',
        pos: '#f59e0b',
        legacy: '#6b7280'
    }

    const toggleMethod = (m: string) => {
        setSelectedMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
    }

    const allSelected = backtestData && selectedMethods.length === Array.from(new Set(backtestData.detail.map(r => r.method))).length
    const toggleAll = () => {
        if (!backtestData) return
        if (allSelected) {
            setSelectedMethods([])
        } else {
            setSelectedMethods(Array.from(new Set(backtestData.detail.map(r => r.method))))
        }
    }

    const formatEff = (v: number | null | undefined) => {
        if (v === null || v === undefined || isNaN(v)) return '–'
        return `${(v * 100).toFixed(1)} %`
    }

    return (
        <>
            <Head>
                <title>Team Backtest - FPL Matura</title>
                <meta name="description" content="Multi-GW Team Backtest: Vergleich verschiedener Prognosemethoden" />
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
                            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8"
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
                                                <Tooltip content={tooltips.predicted_points}>
                                                    <span className="border-b border-dotted border-gray-400 cursor-help">Ø Punkte</span>
                                                </Tooltip>
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

                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                <Activity className="w-4 h-4" />
                                                <Tooltip content={tooltips.effizienz}>
                                                    <span className="border-b border-dotted border-gray-400 cursor-help">Ø Effizienz</span>
                                                </Tooltip>
                                            </span>
                                            <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {formatEff(row.avg_efficiency ?? null)}
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

                    {/* Erklärbox & Filter */}
                    {state === 'success' && backtestData && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.25 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8"
                        >
                            <div className="flex flex-col md:flex-row md:items-start gap-6">
                                <div className="flex-1 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Was zeigt der Backtest?</h2>
                                    <p>Für jede Gameweek wird rückblickend ein optimales Team anhand der Prognosen der jeweiligen Methode gebaut (Budget & max 3 pro Klub gelten). Die angezeigten Punkte enthalten Captain-Bonus. Fehlgeschlagene Selektionsversuche (xi_points = 0) werden ausgefiltert.</p>
                                    <p className="mt-2"><strong>Effizienz</strong>: Verhältnis aus erzielten XI-Punkten (inkl. Captain) zur hypothetisch perfekten Auswahl auf Basis der echten Punkte (Hindsight-Optimum). 100&nbsp;% = identische Punkte wie theoretisches Maximum. Werte unter 100&nbsp;% zeigen Spielraum für Verbesserung der Prognose oder Auswahlstrategie.</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li><strong>RF</strong>: Random Forest Modell mit engineered Features.</li>
                                        <li><strong>MA3</strong>: Gleitender 3er Mittelwert der Punkte (Form-Proxi).</li>
                                        <li><strong>POS</strong>: Positionsbasierter Durchschnitt (einfache Baseline).</li>
                                        <li><strong>rf_rank / rf_pos</strong>: Varianten, falls vorhanden (Ranking / Positionsmodellierung).</li>
                                    </ul>
                                    <p className="mt-2 text-xs">Interpretation: Stabil hohe Durchschnittswerte + geringe Streuung deuten auf robuste Methode hin. Einzelne Ausreisser können durch Captain-Wahl oder fehlende Verfügbarkeit echter Punkte entstehen.</p>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Filter className="w-4 h-4" /> Methoden filtern</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {Array.from(new Set(backtestData.detail.map(r => r.method))).map(m => (
                                            <button
                                                key={m}
                                                onClick={() => toggleMethod(m)}
                                                className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center gap-2 transition-colors ${selectedMethods.includes(m) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}
                                                title={`Toggle ${m}`}
                                            >
                                                <span className="inline-block w-2 h-2 rounded-full" style={{ background: METHOD_COLORS[m] || '#6b7280' }} /> {m.toUpperCase()}
                                            </button>
                                        ))}
                                        <button
                                            onClick={toggleAll}
                                            className="px-3 py-1.5 rounded-md border text-xs font-semibold bg-indigo-600 text-white border-indigo-600"
                                        >{allSelected ? 'Alle aus' : 'Alle an'}</button>
                                    </div>
                                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <Table className="w-4 h-4" />
                                        <button
                                            onClick={() => setShowTable(t => !t)}
                                            className="underline decoration-dotted hover:text-gray-700 dark:hover:text-gray-200"
                                        >{showTable ? 'GW-Tabelle ausblenden' : 'GW-Tabelle anzeigen'}</button>
                                        {pivotCsvUrl && (
                                            <a href={pivotCsvUrl} download={`backtest_pivot_${backtestData.season}_gw${backtestData.gw_start}-${backtestData.gw_end}.csv`} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 ml-2">Pivot CSV exportieren</a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Chart */}
                    {state === 'success' && backtestData && filteredDetail.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <TeamBacktestChart
                                data={filteredDetail}
                                title={`Team Backtest: ${backtestData.season}, GW ${backtestData.gw_start}-${backtestData.gw_end}`}
                                height="600px"
                            />
                        </motion.div>
                    )}

                    {/* GW Pivot Tabelle */}
                    {state === 'success' && backtestData && showTable && pivotRows.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.35 }}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mt-8"
                        >
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                GW Punkte Vergleich (beste Methode hervorgehoben)
                                <Tooltip content={tooltips.gw_range}>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 cursor-help">ℹ</span>
                                </Tooltip>
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
                                        <tr className="text-gray-700 dark:text-gray-200">
                                            <th
                                                className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                onClick={() => {
                                                    if (sortColumn === 'gw') setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
                                                    else { setSortColumn('gw'); setSortDirection('asc') }
                                                }}
                                            >
                                                <span className="flex items-center gap-1">
                                                    GW <ArrowUpDown className="w-3 h-3" />
                                                </span>
                                            </th>
                                            {Array.from(new Set(backtestData.detail.map(r => r.method))).map(m => (
                                                <th
                                                    key={m}
                                                    className="px-3 py-2 text-left cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                    onClick={() => {
                                                        if (sortColumn === m) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
                                                        else { setSortColumn(m); setSortDirection('desc') }
                                                    }}
                                                >
                                                    <span className="flex items-center gap-1">
                                                        {m.toUpperCase()} <ArrowUpDown className="w-3 h-3" />
                                                    </span>
                                                </th>
                                            ))}
                                            <th className="px-3 py-2 text-left">
                                                <Tooltip content={tooltips.hindsight_optimum}>
                                                    <span className="border-b border-dotted border-gray-400 cursor-help">Optimum</span>
                                                </Tooltip>
                                            </th>
                                            <th className="px-3 py-2 text-left">
                                                <Tooltip content={tooltips.effizienz}>
                                                    <span className="border-b border-dotted border-gray-400 cursor-help">Effizienz RF</span>
                                                </Tooltip>
                                            </th>
                                            <th className="px-3 py-2 text-left">Beste</th>
                                            <th className="px-3 py-2 text-left">Diff RF→Best</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pivotRows.map((row, idx) => {
                                            const methods = Array.from(new Set(backtestData.detail.map(r => r.method)))
                                            const best = row.best_method
                                            const rfVal = row['rf'] ?? null
                                            const diff = rfVal !== null ? (row.best_points - rfVal) : ''
                                            return (
                                                <tr
                                                    key={row.gw}
                                                    className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}
                                                >
                                                    <td className="px-3 py-1.5 font-medium text-gray-900 dark:text-gray-100">{row.gw}</td>
                                                    {methods.map(m => (
                                                        <td key={m} className={`px-3 py-1.5 ${best === m ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                            {row[m] !== undefined ? row[m].toFixed(1) : '-'}
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{row.optimum ? row.optimum.toFixed(1) : '-'}</td>
                                                    <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{formatEff(row.efficiency_rf)}</td>
                                                    <td className="px-3 py-1.5 font-semibold text-gray-900 dark:text-gray-100">{best.toUpperCase()} ({row.best_points.toFixed(1)})</td>
                                                    <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{typeof diff === 'number' ? diff.toFixed(1) : '-'}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Diff RF→Best zeigt wie viele Punkte RF gegenüber der jeweils besten Methode verloren hat (negativ = RF schlechter). Effizienz RF bezieht sich auf das Hindsight-Optimum (theoretisches Maximum für diese GW). Nur informative Kennzahlen – Captain-Volatilität beachten. Klicke auf Spaltenüberschriften zum Sortieren.</p>
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
