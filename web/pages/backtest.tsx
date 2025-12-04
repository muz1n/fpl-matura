import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import { Select } from '@/src/components/Select'
import { TeamBacktestChart } from '@/src/components/TeamBacktestChart'
import { getUsableSeasons } from '@/lib/seasonQuality'
import { BarChart3, Download, Activity, ChevronDown, Info } from 'lucide-react'

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
    const [seasonsError, setSeasonsError] = useState<string | null>(null)
    const [selectedSeason, setSelectedSeason] = useState<string>('2023-24')

    const [availableRanges, setAvailableRanges] = useState<string[]>([])
    const [selectedRange, setSelectedRange] = useState<string | null>(null)
    const [rangesLoading, setRangesLoading] = useState<boolean>(false)
    const [rangesError, setRangesError] = useState<string | null>(null)

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
                setSeasonsLoading(true);
                const seasons = await getUsableSeasons();
                setAvailableSeasons(seasons);

                if (!selectedSeason && seasons.length > 0) {
                    // Standard: letzte Saison wählen
                    setSelectedSeason(seasons[seasons.length - 1]);
                }
            } catch (err) {
                console.error('Fehler beim Laden der Saisons', err);
                setSeasonsError('Fehler beim Laden der verfügbaren Saisons');
                // Fallback - damit die UI trotzdem funktioniert
                setAvailableSeasons(['2020-21', '2021-22', '2022-23', '2023-24']);
            } finally {
                setSeasonsLoading(false);
            }
        }

        loadSeasons();
    }, []); // nur beim ersten Render ausführen

    // Lade verfügbare GW-Ranges für ausgewählte Season
    // Lade verfügbare GW-Ranges fuer ausgewaehlte Season
    useEffect(() => {
        if (!selectedSeason) return

        async function fetchRanges() {
            try {
                const res = await fetch(`/api/backtests/${selectedSeason}`)

                if (!res.ok) {
                    console.error(
                        'Backtest Season API Fehler:',
                        res.status,
                        res.statusText
                    )
                    setAvailableRanges([])
                    setSelectedRange(null)
                    return
                }

                type SeasonResponse = {
                    season: string
                    available_ranges?: string[]
                }

                const data: SeasonResponse = await res.json()
                const ranges = data.available_ranges ?? []

                setAvailableRanges(ranges)

                if (ranges.length > 0) {
                    // Standard: neuester / letzter Range
                    setSelectedRange(ranges[ranges.length - 1])
                } else {
                    setSelectedRange(null)
                }
            } catch (err) {
                console.error('Fehler beim Laden der verfügbaren Ranges', err);
                setRangesError('Fehler beim Laden der verfügbaren Ranges');
                setAvailableRanges([]);
            } finally {
                setRangesLoading(false);
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
                // Alle Methoden initial selektiert - AUSSER deprecated methods
                const allMethods: string[] = Array.from(new Set(data.detail.map((r: BacktestDetailRow) => r.method)))
                    .filter(m => m !== 'rf_filled' && m !== 'rf_optfill')
                console.log('🔍 Gefundene Methoden:', allMethods)
                console.log('📊 Anzahl Detail-Rows:', data.detail.length)
                console.log('📈 Summary Rows:', data.summary.map(s => s.method))
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
    // Helper: Berechne Max-Punkte pro Methode
    const getMaxPoints = (method: string): number => {
        if (!backtestData) return 0;
        const methodData = backtestData.detail.filter(
            r => r.method === method && r.xi_points > 0
        );
        return methodData.length > 0
            ? Math.max(...methodData.map(r => r.xi_points))
            : 0;
    };

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
            // FILTER: rf_filled und rf_optfill ignorieren
            if (row.method === 'rf_filled' || row.method === 'rf_optfill') continue
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
        rf: '#ec4899',         // Pink-500 (Hauptmodell)
        rf_pos: '#22c55e',     // Green-500 (hoher Kontrast)
        rf_rank: '#f97316',    // Orange-500 (hoher Kontrast)
        rf_relaxed: '#8b5cf6', // Violet-500
        ma3: '#eab308',        // Yellow-500 (hoher Kontrast)
        pos: '#ef4444',        // Red-500 (hoher Kontrast)
        legacy: '#6b7280'      // Gray-500
    }

    const toggleMethod = (m: string) => {
        setSelectedMethods(prev =>
            prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
        );
    }

    const allSelected = backtestData && selectedMethods.length === Array.from(new Set(backtestData.detail.map(r => r.method))).filter(m => m !== 'rf_filled' && m !== 'rf_optfill').length
    const toggleAll = () => {
        if (!backtestData) return
        if (allSelected) {
            setSelectedMethods([])
        } else {
            setSelectedMethods(Array.from(new Set(backtestData.detail.map(r => r.method))).filter(m => m !== 'rf_filled' && m !== 'rf_optfill'))
        }
    }

    const formatEff = (v: number | null | undefined) => {
        if (v === null || v === undefined || isNaN(v)) return '-'
        return `${(v * 100).toFixed(1)} %`
    }

    return (
        <>
            <Head>
                <title>Historischer Backtest - FPL Matura</title>
                <meta name="description" content="Vergleich der Prognosemethoden über mehrere Gameweeks" />
            </Head>

            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="min-h-screen text-slate-100"
            >
                <div className="mx-auto px-4 pt-12 pb-16 space-y-6 max-w-7xl">
                    {/* Hero-Titel */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center space-y-3 mb-8"
                    >
                        <div className="flex items-center justify-center gap-3">
                            <BarChart3 className="w-10 h-10 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600" />
                            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                                Historischer Backtest
                            </h1>
                        </div>
                        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
                            Vergleich der Prognosemethoden über mehrere Gameweeks mit Effizienz-Metriken
                        </p>
                    </motion.div>

                    {/* Controls */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="bg-slate-800/90 border border-pink-500/20 rounded-2xl shadow-lg p-6 mb-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                        </div>

                        {backtestData && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-3">
                                    Methoden filtern
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {Array.from(new Set(backtestData.detail.map(r => r.method)))
                                        .filter(m => m !== 'rf_filled' && m !== 'rf_optfill')
                                        .map(m => (
                                            <button
                                                key={m}
                                                onClick={() => toggleMethod(m)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedMethods.includes(m)
                                                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/20'
                                                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600'
                                                    }`}
                                            >
                                                <span
                                                    className="inline-block w-3 h-3 rounded-full mr-2 ring-2 ring-white/30"
                                                    style={{ background: METHOD_COLORS[m] || '#6b7280' }}
                                                />
                                                {m.toUpperCase()}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        )}

                        {availableRanges.length === 0 && !seasonsLoading && (
                            <div className="mt-4">
                                <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-4 text-sm text-slate-200 text-center">
                                    Für die gewählte Season sind noch keine Backtest-Ergebnisse verfügbar. Bitte eine andere Season oder einen kleineren Zeitraum wählen.
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Loading/Error States */}
                    {state === 'loading' && (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-500 mb-4"></div>
                                <p className="text-slate-400">Lade Backtest-Daten...</p>
                            </div>
                        </div>
                    )}
                    {state === 'error' && (
                        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 mb-8">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-red-900/30 rounded-lg">
                                    <Info className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-red-400 font-semibold mb-1">Fehler beim Laden</h3>
                                    <p className="text-red-300 text-sm">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {state === 'error' && (
                        <div className="rounded-2xl bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-100 flex items-start gap-2 mb-6" style={{ display: 'none' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 text-red-300 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 16a2 2 0 01-1.732 1H3.732A2 2 0 012 16c0-.386.11-.765.32-1.09l7-11a2 2 0 013.36 0l7 11A2 2 0 0118 16zm-8-4a1 1 0 112 0v2a1 1 0 11-2 0v-2zm1-6a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <div className="font-semibold mb-1">Backtest-Daten konnten nicht geladen werden.</div>
                                <div>Bitte Season oder GW-Bereich anpassen und erneut versuchen.</div>
                            </div>
                        </div>
                    )}

                    {/* Summary Cards */}
                    {state === 'success' && backtestData && Array.isArray(backtestData.summary) && backtestData.summary.length === 0 && (
                        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-4 text-sm text-slate-200 text-center mb-6">
                            Für diesen Zeitraum sind keine Backtest-Ergebnisse vorhanden.
                        </div>
                    )}
                    {state === 'success' && backtestData && backtestData.summary.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="mb-8"
                        >
                            <h2 className="text-xl font-semibold text-slate-200 mb-4">Übersicht</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {backtestData.summary.map((row) => (
                                    <div
                                        key={row.method}
                                        className="bg-gradient-to-br from-slate-800/90 to-slate-800/50 border border-pink-500/20 rounded-2xl shadow-lg p-6 hover:border-pink-500/40 hover:shadow-pink-500/10 transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-semibold text-pink-400 uppercase tracking-wider">{row.method}</span>
                                            <Activity className="w-5 h-5 text-pink-400/50" />
                                        </div>
                                        <div className="mb-3">
                                            <div className="text-3xl font-bold text-slate-100">
                                                {row.avg_xi_points.toFixed(1)} <span className="text-lg text-slate-400">Pkt</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="font-semibold text-purple-400">{row.n_gw} GWs</span>
                                            <span className="text-slate-600">•</span>
                                            <span className="font-semibold text-pink-400">{formatEff(row.avg_efficiency)}</span>
                                        </div>
                                    </div>
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
                            className="bg-gradient-to-br from-pink-900/10 via-purple-900/10 to-blue-900/10 border border-pink-500/20 rounded-2xl p-5 mb-8"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-lg">
                                    <Info className="w-5 h-5 text-pink-400" />
                                </div>
                                <div className="text-sm text-slate-300 space-y-3">
                                    <p>
                                        <strong className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Was zeigt der Backtest?</strong>{' '}
                                        In diesem Diagramm sieht man die durchschnittlichen Team-Punkte pro Spieltag.
                                        Jede Linie steht für eine Methode. Ein Punkt bedeutet, dass das Modell ein gültiges
                                        Team innerhalb der FPL-Regeln gefunden hat. Fehlen Punkte, konnte kein Team gebildet werden
                                        (z.B. wegen Datenlücken oder zu strengen Constraints).
                                    </p>
                                    <p>
                                        <strong className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Effizienz (%):</strong>{' '}
                                        Verhältnis der <span className="text-pink-300 font-medium">erzielten Punkte</span> zur{' '}
                                        <span className="text-purple-300 font-medium">theoretisch perfekten Auswahl</span> (Hindsight-Optimum).
                                        <br />
                                        <span className="text-slate-400 text-xs">
                                            Beispiel: 35% = Team holte 35 von 100 theoretisch möglichen Punkten.
                                            100% wäre perfekte Vorhersage (unrealistisch).
                                        </span>
                                    </p>
                                    <p className="text-xs text-amber-400/80 bg-amber-900/10 border border-amber-800/30 rounded-lg p-3">
                                        <strong>⚠️ Wenige Gameweeks?</strong> Methoden wie RF_RANK oder RF_POS können manchmal kein gültiges Team bilden,
                                        weil ihnen Preis-Informationen fehlen (budget_used = 0.0) oder zu wenige Spieler mit echten Punkten verfügbar sind.
                                        Dies erklärt, warum diese Methoden nur 3-7 GWs statt 9 GWs haben.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Chart */}
                    {state === 'success' && backtestData && Array.isArray(filteredDetail) && filteredDetail.length === 0 && (
                        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-4 text-sm text-slate-200 text-center mb-6">
                            Für diesen Zeitraum sind keine Backtest-Daten zum Anzeigen vorhanden.
                        </div>
                    )}
                    {state === 'success' && backtestData && filteredDetail.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="bg-slate-800/90 border border-pink-500/20 rounded-2xl shadow-lg p-6 mb-8"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-200">Punkteverlauf</h2>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {backtestData.season}, GW {backtestData.gw_start}-{backtestData.gw_end}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowTable(t => !t)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-pink-500/20"
                                >
                                    {showTable ? 'Tabelle ausblenden' : 'Tabelle anzeigen'}
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>
                            <TeamBacktestChart
                                data={filteredDetail}
                                title=""
                                height="500px"
                            />
                        </motion.div>
                    )}

                    {/* GW Pivot Tabelle - Vereinfacht */}
                    {state === 'success' && backtestData && showTable && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 mb-8 overflow-hidden"
                        >
                            <h2 className="text-xl font-semibold text-slate-200 mb-4">Detaillierte Daten</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-800">
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium">GW</th>
                                            {Array.from(new Set(backtestData.detail.map(r => r.method)))
                                                .filter(m => m !== 'rf_filled' && m !== 'rf_optfill')
                                                .map(m => (
                                                    <th key={m} className="text-left py-3 px-4 text-slate-400 font-medium">
                                                        {m.toUpperCase()}
                                                    </th>
                                                ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from(new Set(backtestData.detail.map(r => r.gw)))
                                            .sort((a, b) => a - b)
                                            .map((gw) => {
                                                const gwData = backtestData.detail.filter(r => r.gw === gw)
                                                return (
                                                    <tr key={gw} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                                        <td className="py-3 px-4 text-slate-300">{gw}</td>
                                                        {Array.from(new Set(backtestData.detail.map(r => r.method)))
                                                            .filter(m => m !== 'rf_filled' && m !== 'rf_optfill')
                                                            .map(m => {
                                                                const methodData = gwData.find(r => r.method === m)
                                                                return (
                                                                    <td key={m} className="py-3 px-4 text-slate-300">
                                                                        {methodData ? methodData.xi_points.toFixed(1) : '-'}
                                                                    </td>
                                                                )
                                                            })}
                                                    </tr>
                                                )
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {/* Download Links */}
                    {state === 'success' && backtestData && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="bg-slate-800/90 border border-pink-500/20 rounded-2xl shadow-lg p-6"
                        >
                            <h2 className="text-xl font-semibold text-slate-200 mb-4">Daten exportieren</h2>
                            <div className="flex flex-wrap gap-3">
                                <a
                                    href={`/api/files?name=team_backtest_${backtestData.season}_gw${backtestData.gw_start}-${backtestData.gw_end}.csv`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-pink-500/20"
                                >
                                    <Download className="w-4 h-4" />
                                    Detail CSV
                                </a>

                                <a
                                    href={`/api/files?name=team_backtest_summary_${backtestData.season}_gw${backtestData.gw_start}-${backtestData.gw_end}.csv`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-pink-500/20"
                                >
                                    <Download className="w-4 h-4" />
                                    Summary CSV
                                </a>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.main>
        </>
    )
}
