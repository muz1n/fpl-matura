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
import { Card, SummaryCard, SectionHeader, InfoBox, ControlPanel } from '../src/components/ui'

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

                const data: BacktestData = await res.json();
                setBacktestData(data)
                // Alle Methoden initial selektiert
                const allMethods: string[] = Array.from(new Set(data.detail.map((r: BacktestDetailRow) => r.method)))
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
        rf: '#3b82f6',           // Blau
        rf_relaxed: '#8b5cf6',   // Violett
        rf_optfill: '#06b6d4',   // Cyan
        rf_pos: '#6366f1',       // Indigo
        rf_rank: '#a855f7',      // Lila
        ma3: '#10b981',          // Grün
        pos: '#f59e0b',          // Orange
        legacy: '#6b7280'        // Grau
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

            <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center"
                    >
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <BarChart3 className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                Historischer Backtest
                            </h1>
                        </div>
                        <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Vergleich der Prognosemethoden über mehrere Gameweeks
                        </p>
                    </motion.div>

                    {/* Controls */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        <ControlPanel>
                            <Select
                                label="Saison"
                                value={selectedSeason}
                                onChange={(val) => setSelectedSeason(val as string)}
                                options={availableSeasons.map(s => ({
                                    value: s,
                                    label: s
                                }))}
                                disabled={seasonsLoading || availableSeasons.length === 0}
                            />

                            <Select
                                label="Spieltag-Bereich"
                                value={selectedRange || ''}
                                onChange={(val) => setSelectedRange(val as string)}
                                options={availableRanges.map(r => ({
                                    value: r,
                                    label: `GW ${r}`
                                }))}
                                disabled={availableRanges.length === 0}
                            />

                            <div className="flex items-end">
                                <div className="w-full">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Methoden filtern
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {backtestData && Array.from(new Set(backtestData.detail.map(r => r.method))).map(m => (
                                            <button
                                                key={m}
                                                onClick={() => toggleMethod(m)}
                                                className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center gap-2 transition-colors ${selectedMethods.includes(m) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                            >
                                                <span className="inline-block w-2 h-2 rounded-full" style={{ background: METHOD_COLORS[m] || '#6b7280' }} /> {m.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </ControlPanel>

                        {availableRanges.length === 0 && !seasonsLoading && (
                            <div className="mt-4">
                                <InfoBox variant="warning">
                                    Keine Backtest-Daten für Saison {selectedSeason} verfügbar. Führe zuerst <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">team_backtest.py</code> aus.
                                </InfoBox>
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
                        >
                            <SectionHeader
                                title="Übersicht"
                                subtitle="Durchschnittswerte für alle Methoden"
                                className="mb-4"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {backtestData.summary.map((row) => (
                                    <SummaryCard
                                        key={row.method}
                                        title={row.method.toUpperCase()}
                                        value={`${row.avg_xi_points.toFixed(1)} Pkt`}
                                        subtitle={`${row.n_gw} GWs • Ø ${formatEff(row.avg_efficiency)}`}
                                        icon={<Activity className="w-5 h-5" />}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Info Box */}
                    {state === 'success' && backtestData && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.25 }}
                        >
                            <InfoBox>
                                <p className="font-semibold mb-2">Was zeigt der Backtest?</p>
                                <p className="mb-2">
                                    In diesem Diagramm sieht man die durchschnittlichen Team-Punkte pro Spieltag.
                                    Jede Linie steht für eine Methode. Ein Punkt bedeutet, dass das Modell ein gültiges
                                    Team innerhalb der FPL-Regeln gefunden hat. Fehlen Punkte, konnte kein Team gebildet werden
                                    (z. B. wegen Datenlücken oder zu strengen Constraints).
                                </p>
                                <p className="text-sm">
                                    <strong>Effizienz:</strong> Verhältnis aus erzielten XI-Punkten (inkl. Captain) zur hypothetisch
                                    perfekten Auswahl auf Basis der echten Punkte (Hindsight-Optimum). 100&nbsp;% = identische Punkte
                                    wie theoretisches Maximum.
                                </p>
                            </InfoBox>
                        </motion.div>
                    )}

                    {/* Chart */}
                    {state === 'success' && backtestData && filteredDetail.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <Card>
                                <SectionHeader
                                    title="Punkteverlauf"
                                    subtitle={`${backtestData.season}, GW ${backtestData.gw_start}-${backtestData.gw_end}`}
                                    action={
                                        <button
                                            onClick={() => setShowTable(t => !t)}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
                                        >
                                            <Table className="w-4 h-4" />
                                            {showTable ? 'Tabelle ausblenden' : 'Tabelle anzeigen'}
                                        </button>
                                    }
                                    className="mb-4"
                                />
                                <TeamBacktestChart
                                    data={filteredDetail}
                                    title=""
                                    height="500px"
                                />
                            </Card>
                        </motion.div>
                    )}

                    {/* GW Pivot Tabelle */}
                    {state === 'success' && backtestData && showTable && pivotRows.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.35 }}
                        >
                            <Card>
                                <SectionHeader
                                    title="Detaillierte Daten pro Gameweek"
                                    action={
                                        pivotCsvUrl && (
                                            <a
                                                href={pivotCsvUrl}
                                                download={`backtest_pivot_${backtestData.season}_gw${backtestData.gw_start}-${backtestData.gw_end}.csv`}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                                            >
                                                <Download className="w-4 h-4" />
                                                CSV Export
                                            </a>
                                        )
                                    }
                                    className="mb-4"
                                />
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
                                                <th className="px-3 py-2 text-left">Effizienz RF</th>
                                                <th className="px-3 py-2 text-left">Beste Methode</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pivotRows.map((row, idx) => {
                                                const methods = Array.from(new Set(backtestData.detail.map(r => r.method)))
                                                const best = row.best_method
                                                return (
                                                    <tr
                                                        key={row.gw}
                                                        className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}
                                                    >
                                                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{row.gw}</td>
                                                        {methods.map(m => (
                                                            <td key={m} className={`px-3 py-2 ${best === m ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                {row[m] !== undefined ? row[m].toFixed(1) : '-'}
                                                            </td>
                                                        ))}
                                                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatEff(row.efficiency_rf)}</td>
                                                        <td className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">
                                                            {best.toUpperCase()} ({row.best_points.toFixed(1)})
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Download Links */}
                    {state === 'success' && backtestData && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                        >
                            <Card>
                                <SectionHeader title="Daten exportieren" className="mb-4" />
                                <div className="flex flex-wrap gap-3">
                                    <a
                                        href={`/api/files?name=team_backtest_${backtestData.season}_gw${backtestData.gw_start}-${backtestData.gw_end}.csv`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                                    >
                                        <Download className="w-4 h-4" />
                                        Detail CSV
                                    </a>

                                    <a
                                        href={`/api/files?name=team_backtest_summary_${backtestData.season}_gw${backtestData.gw_start}-${backtestData.gw_end}.csv`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
                                    >
                                        <Download className="w-4 h-4" />
                                        Summary CSV
                                    </a>

                                    <a
                                        href={`/api/files?name=team_backtest_${backtestData.season}_gw${backtestData.gw_start}-${backtestData.gw_end}.png`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors text-sm font-medium"
                                    >
                                        <Download className="w-4 h-4" />
                                        PNG Plot
                                    </a>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </div>
            </main>
        </>
    )
}
