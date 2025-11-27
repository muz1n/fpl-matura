import { useEffect, useState, useCallback } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import type { PredictionsPayload, LineupPayload, PredictionPlayer } from '../types/fpl'
import { HelpIcon } from '../src/components/HelpIcon'
import { Tooltip } from '../src/components/Tooltip'
import { glossary } from '../src/data/glossary'
import { Select } from '../src/components/Select'
import { LoadingState, ErrorState, EmptyState } from '../src/components/States'
import { saveSquad, loadSquad } from '../src/lib/squad-storage'
import { HistoricalEvaluation } from '../src/components/HistoricalEvaluation'
import { getUsableSeasons } from '../lib/seasonQuality'
import { Navbar } from '../src/components/Navbar'

type LoadingStateType = 'idle' | 'loading' | 'success' | 'error'
type PredictionMethod = 'rf' | 'ma3' | 'pos' | 'rf_rank' | 'rf_pos'

// Methoden-Optionen mit deutschen Namen
const methodOptions = [
    { value: 'rf', label: 'Random Forest (KI-Modell)' },
    { value: 'rf_rank', label: 'RF (Rank)' },
    { value: 'rf_pos', label: 'RF (Pos)' },
    { value: 'ma3', label: 'Formdurchschnitt (MA3)' },
    { value: 'pos', label: 'Positionsmittel' },
]

// Erlaubte Formationen (außerhalb der Komponente, um stabile Referenzen zu haben)
const allowedFormations: Array<{ f: string; DEF: number; MID: number; FWD: number }> = [
    { f: '3-4-3', DEF: 3, MID: 4, FWD: 3 },
    { f: '3-5-2', DEF: 3, MID: 5, FWD: 2 },
    { f: '4-4-2', DEF: 4, MID: 4, FWD: 2 },
    { f: '4-3-3', DEF: 4, MID: 3, FWD: 3 },
    { f: '4-5-1', DEF: 4, MID: 5, FWD: 1 },
    { f: '5-4-1', DEF: 5, MID: 4, FWD: 1 },
    { f: '5-3-2', DEF: 5, MID: 3, FWD: 2 },
]

export default function PredictionsPage() {
    const [predictions, setPredictions] = useState<PredictionsPayload | null>(null)
    const [lineup, setLineup] = useState<LineupPayload | null>(null)
    const [state, setState] = useState<LoadingStateType>('idle')
    const [error, setError] = useState<string>('')
    const [lineupError, setLineupError] = useState<string>('')


    // Available GWs and methods by GW
    const [availableGWs, setAvailableGWs] = useState<number[]>([])
    const [methodsByGw, setMethodsByGw] = useState<Record<number, string[]>>({})
    const [gwLoadingState, setGwLoadingState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
    const [gwError, setGwError] = useState<string>('')

    // Auswahl-States
    const [selectedGW, setSelectedGW] = useState<number | null>(null)
    const [selectedMethod, setSelectedMethod] = useState<string | null>('rf')
    const [selectedSeason, setSelectedSeason] = useState<string>('2022-23')
    const [availableSeasons, setAvailableSeasons] = useState<string[]>([])
    const [seasonsLoading, setSeasonsLoading] = useState<boolean>(true)

    // Dein Team (LocalStorage) + Transfer-Hilfe
    const [teamInput, setTeamInput] = useState<string>("")
    const [teamIds, setTeamIds] = useState<number[]>([])
    const [transferSuggestion, setTransferSuggestion] = useState<{
        out?: PredictionPlayer
        in?: PredictionPlayer
        oldXiSum: number
        newXiSum: number
        delta: number
    } | null>(null)
    const TEAM_KEY = 'fpl_my_team_ids'

    // Downloads panel state
    const [downloadError, setDownloadError] = useState<string>("")
    const [showDownloads, setShowDownloads] = useState<boolean>(true)
    const [availableDownloadLinks, setAvailableDownloadLinks] = useState<Array<{ href: string; label: string }>>([])

    // Lade verfügbare Seasons on mount
    useEffect(() => {
        async function loadSeasons() {
            try {
                const seasons = await getUsableSeasons()
                setAvailableSeasons(seasons)
                // Setze default auf neueste Season falls nicht schon gesetzt
                if (seasons.length > 0 && !selectedSeason) {
                    setSelectedSeason(seasons[seasons.length - 1])
                }
            } catch (err) {
                // Fehlerbehandlung für Season-Laden
            }
        }
        loadSeasons();
        fetchAvailableGWs();
    }, [])

    // Derive availableMethods for selectedGW
    const availableMethods: string[] = selectedGW !== null ? (methodsByGw[selectedGW] ?? []) : [];

    // Dummy-Implementierung, falls fetchAvailableGWs fehlt
    function fetchAvailableGWs() {
        // Hier sollte die echte Logik stehen, z.B. API-Call
        // Für Fehlerbehebung: Setze leeres Array
        setAvailableGWs([]);
    }

    // Ensure selectedMethod is valid for selectedGW
    useEffect(() => {
        if (!selectedGW) return;
        if (availableMethods.length === 0) {
            setSelectedMethod(null);
            return;
        }
        // Prefer 'rf', else first, else null
        if (!availableMethods.includes(selectedMethod ?? '')) {
            if (availableMethods.includes('rf')) {
                setSelectedMethod('rf');
            } else {
                setSelectedMethod(availableMethods[0] ?? null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedGW, availableMethods.length]);

    // Fetch predictions and lineup when GW or method changes
    useEffect(() => {
        // Don't fetch if no GW or method is selected
        if (selectedGW === null || !selectedMethod) return;

        async function fetchData() {
            setState('loading');
            setError('');
            setLineupError('');

            try {
                // Fetch predictions with optional season parameter
                const seasonParam = selectedSeason ? `&season=${selectedSeason}` : ''
                const predRes = await fetch(`/api/gw/${selectedGW}/predictions?methode=${selectedMethod}${seasonParam}`);

                if (!predRes.ok) {
                    const errorData = await predRes.json().catch(() => ({}));
                    const errorMsg = errorData.error || 'Fehler beim Laden der Prognosen'
                    const suggestion = errorData.suggestion ? `\n${errorData.suggestion}` : ''
                    throw new Error(errorMsg + suggestion);
                }

                const predData: PredictionsPayload = await predRes.json();
                setPredictions(predData);

                // Fetch lineup - handle 404 gracefully
                try {
                    const lineupRes = await fetch(`/api/gw/${selectedGW}/lineup?methode=${selectedMethod}${seasonParam}`);

                    if (!lineupRes.ok) {
                        if (lineupRes.status === 404) {
                            const errorData = await lineupRes.json().catch(() => ({}));
                            const errorMsg = errorData.error || 'Lineup-Daten nicht verfügbar'
                            const suggestion = errorData.suggestion ? `\n${errorData.suggestion}` : ''
                            setLineupError(errorMsg + suggestion);
                            setLineup(null);
                        } else {
                            const errorData = await lineupRes.json().catch(() => ({}));
                            const errorMsg = errorData.error || 'Fehler beim Laden der Lineup-Daten'
                            const suggestion = errorData.suggestion ? `\n${errorData.suggestion}` : ''
                            throw new Error(errorMsg + suggestion);
                        }
                    } else {
                        const lineupData: LineupPayload = await lineupRes.json();
                        setLineup(lineupData);
                        setLineupError('');
                    }
                } catch (lineupErr) {
                    // Lineup error shouldn't break predictions view
                    console.warn('Lineup fetch error:', lineupErr);
                    setLineupError(lineupErr instanceof Error ? lineupErr.message : 'Fehler beim Laden der Lineup-Daten');
                    setLineup(null);
                }

                setState('success');
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
                setState('error');
                setPredictions(null);
                setLineup(null);
            }
        }

        fetchData();
    }, [selectedGW, selectedMethod, selectedSeason]);

    // Helper: find player by ID
    const findPlayer = (id: number): PredictionPlayer | undefined => {
        return predictions?.players.find(p => p.player_id === id)
    }

    // Helper: get XI players sorted by position then points
    const getXIPlayers = (): PredictionPlayer[] => {
        if (!lineup || !predictions) return []

        const posOrder = { GK: 0, DEF: 1, MID: 2, FWD: 3 }
        const xiPlayers = lineup.xi_ids
            .map(findPlayer)
            .filter((p): p is PredictionPlayer => p !== undefined)

        return xiPlayers.sort((a, b) => {
            const posCompare = posOrder[a.pos] - posOrder[b.pos]
            if (posCompare !== 0) return posCompare
            return b.predicted_points - a.predicted_points
        })
    }

    // Helper: get top 15 predicted players overall
    const getTop15Players = (): PredictionPlayer[] => {
        if (!predictions) return []
        return [...predictions.players]
            .sort((a, b) => b.predicted_points - a.predicted_points)
            .slice(0, 15)
    }

    // Helper: Beste XI aus beliebigem Kader bestimmen (über erlaubte Formationen)
    const computeBestXI = useCallback((players: PredictionPlayer[]) => {
        if (!players || players.length === 0) return null
        const byPos = {
            GK: players.filter(p => p.pos === 'GK').sort((a, b) => b.predicted_points - a.predicted_points),
            DEF: players.filter(p => p.pos === 'DEF').sort((a, b) => b.predicted_points - a.predicted_points),
            MID: players.filter(p => p.pos === 'MID').sort((a, b) => b.predicted_points - a.predicted_points),
            FWD: players.filter(p => p.pos === 'FWD').sort((a, b) => b.predicted_points - a.predicted_points),
        }

        let best: { xi: PredictionPlayer[]; formation: string; sum: number } | null = null
        for (const form of allowedFormations) {
            if (byPos.GK.length < 1 || byPos.DEF.length < form.DEF || byPos.MID.length < form.MID || byPos.FWD.length < form.FWD) {
                continue
            }
            const xi = [
                ...byPos.GK.slice(0, 1),
                ...byPos.DEF.slice(0, form.DEF),
                ...byPos.MID.slice(0, form.MID),
                ...byPos.FWD.slice(0, form.FWD),
            ]
            const sum = xi.reduce((acc, p) => acc + p.predicted_points, 0)
            if (!best || sum > best.sum) {
                best = { xi, formation: form.f, sum }
            }
        }
        return best
    }, [])

    // Team-Input parsen (IDs, kommasepariert)
    const parseTeamInput = (text: string): number[] => {
        return text
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(s => parseInt(s, 10))
            .filter(n => Number.isFinite(n) && n > 0)
    }

    const handleSaveTeam = () => {
        try {
            const ids = parseTeamInput(teamInput)
            // zusätzlich in neuem Storage-Format sichern
            saveSquad(ids)
            if (typeof window !== 'undefined') localStorage.setItem(TEAM_KEY, teamInput)
            setTeamIds(ids)
        } catch (e) {
            // noop
        }
    }

    const handleLoadTeam = () => {
        try {
            // bevorzugt strukturiertes Format
            const structured = loadSquad()
            if (structured) {
                setTeamIds(structured.ids)
                setTeamInput(structured.ids.join(', '))
                return
            }
            if (typeof window !== 'undefined') {
                const saved = localStorage.getItem(TEAM_KEY) || ''
                setTeamInput(saved)
                const ids = parseTeamInput(saved)
                setTeamIds(ids)
            }
        } catch (e) {
            // noop
        }
    }

    // Transfer-Vorschlag berechnen, sobald Team + Prognosen vorhanden
    useEffect(() => {
        if (!predictions) return
        if (!teamIds || teamIds.length < 11) {
            setTransferSuggestion(null)
            return
        }

        const idSet = new Set(teamIds)
        const teamPlayers = predictions.players.filter(p => idSet.has(p.player_id))
        if (teamPlayers.length === 0) {
            setTransferSuggestion(null)
            return
        }

        const base = computeBestXI(teamPlayers)
        if (!base) {
            setTransferSuggestion(null)
            return
        }

        let bestDelta = 0
        let bestOut: PredictionPlayer | undefined
        let bestIn: PredictionPlayer | undefined
        let bestNewSum = base.sum

        const candidatesIn = predictions.players.filter(p => !idSet.has(p.player_id))

        for (const out of teamPlayers) {
            // Entferne OUT
            const reduced = teamPlayers.filter(p => p.player_id !== out.player_id)
            for (const inn of candidatesIn) {
                const swapped = [...reduced, inn]
                const xi = computeBestXI(swapped)
                if (!xi) continue
                const delta = xi.sum - base.sum
                if (delta > bestDelta + 1e-9) {
                    bestDelta = delta
                    bestOut = out
                    bestIn = inn
                    bestNewSum = xi.sum
                }
            }
        }

        setTransferSuggestion({
            out: bestOut,
            in: bestIn,
            oldXiSum: base.sum,
            newXiSum: bestNewSum,
            delta: bestDelta,
        })
    }, [teamIds, predictions, computeBestXI])

    const handleRetry = () => {
        if (availableGWs.length > 0) {
            setSelectedGW(availableGWs[availableGWs.length - 1]) // Use last available as fallback
        }
        setSelectedMethod('rf')
    }

    // Loading state for available GWs
    if (gwLoadingState === 'loading') {
        return (
            <>
                <Head>
                    <title>Prognosen — FPL Assistent</title>
                </Head>
                <LoadingState message="Lade verfügbare Gameweeks..." />
            </>
        )
    }

    // Error state for available GWs
    if (gwLoadingState === 'error') {
        return (
            <>
                <Head>
                    <title>Prognosen — FPL Assistent</title>
                </Head>
                <ErrorState
                    message={gwError || 'Fehler beim Laden verfügbarer Gameweeks'}
                    onRetry={() => window.location.reload()}
                />
            </>
        )
    }

    // Empty state if no GWs available
    if (availableGWs.length === 0) {
        return (
            <>
                <Head>
                    <title>Prognosen — FPL Assistent</title>
                </Head>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <p className="text-xl text-slate-400">
                            Keine Gameweek-Daten verfügbar
                        </p>
                        <p className="text-sm text-slate-400">
                            Bitte stellen Sie sicher, dass Prognose-Daten generiert wurden.
                        </p>
                    </div>
                </div>
            </>
        )
    }

    if (state === 'loading') {
        return (
            <>
                <Head>
                    <title>Prognosen — FPL Assistent</title>
                </Head>
                <LoadingState message="Lade Prognosen..." />
            </>
        )
    }

    if (state === 'error') {
        return (
            <>
                <Head>
                    <title>Prognosen — FPL Assistent</title>
                </Head>
                <div className="rounded-2xl bg-red-900/40 border border-red-700 text-red-100 px-4 py-3 text-sm flex items-start gap-2 mb-6 max-w-2xl mx-auto mt-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 text-red-300 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 16a2 2 0 01-1.732 1H3.732A2 2 0 012 16c0-.386.11-.765.32-1.09l7-11a2 2 0 013.36 0l7 11A2 2 0 0118 16zm-8-4a1 1 0 112 0v2a1 1 0 11-2 0v-2zm1-6a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <div className="font-semibold mb-1">Prognosen konnten für diese Auswahl nicht geladen werden.</div>
                        <div>Bitte Season oder Gameweek wechseln oder später erneut versuchen.</div>
                    </div>
                </div>
            </>
        )
    }

    if (!predictions) {
        return (
            <>
                <Head>
                    <title>Prognosen — FPL Assistent</title>
                </Head>
                <EmptyState />
            </>
        )
    }

    // Fall b: Response ok, aber keine Prognosedaten vorhanden
    const isNoData = Array.isArray(predictions?.players) && predictions.players.length === 0;
    if (isNoData) {
        return (
            <>
                <Head>
                    <title>Prognosen — FPL Assistent</title>
                </Head>
                <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-4 text-sm text-slate-200 max-w-2xl mx-auto mt-10 text-center">
                    Für diese Auswahl sind noch keine Prognosedaten vorhanden. Bitte eine andere Gameweek oder Methode wählen.
                </div>
            </>
        );
    }

    const captainPlayer = lineup ? findPlayer(lineup.captain_id) : undefined
    const vicePlayer = lineup ? findPlayer(lineup.vice_id) : undefined
    const xiPlayers = getXIPlayers()
    const top15 = getTop15Players()
    const isLegacyLineup = lineup?.methode === 'legacy'

    // Tooltip für gewählte Methode
    const methodTooltip = selectedMethod === 'rf' ? glossary.methodeRF :
        selectedMethod === 'rf_rank' ? glossary.methodeRFRank :
            selectedMethod === 'ma3' ? glossary.methodeMA3 :
                glossary.methodePos

    // Generate gameweek options from available GWs
    const gameweekOptions = availableGWs.map(gw => ({
        value: gw,
        label: `Spielwoche ${gw}`,
    }))

    return (
        <>
            <Head>
                <title>Prognosen GW{selectedGW ?? ''} — FPL Assistent</title>
            </Head>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
                {/* Toolbar mit Auswahl */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                            label="Season"
                            value={selectedSeason}
                            onChange={(val) => setSelectedSeason(val as string)}
                            options={availableSeasons.map(s => ({
                                value: s,
                                label: `Season ${s}`
                            }))}
                            disabled={seasonsLoading || availableSeasons.length === 0}
                            tooltip={<HelpIcon text="Nur Seasons 2020-24 haben vollständige Datenqualität" />}
                        />

                        <Select
                            label="Spielwoche"
                            value={selectedGW ?? 1}
                            onChange={(val) => setSelectedGW(Number(val))}
                            options={gameweekOptions}
                            tooltip={<HelpIcon text={glossary.gameweek} />}
                        />

                        <div className="relative">
                            <Select
                                label="Prognosemethode"
                                value={selectedMethod ?? ''}
                                onChange={(val) => setSelectedMethod(val as string)}
                                options={availableMethods.map(m => {
                                    const opt = methodOptions.find(o => o.value === m)
                                    return opt ? opt : { value: m, label: m === 'legacy' ? 'Legacy (nur Rohdaten)' : m }
                                })}
                                disabled={availableMethods.length === 0 || (availableMethods.length === 1 && availableMethods[0] === 'legacy')}
                                tooltip={<HelpIcon text={methodTooltip} />}
                            />
                            {isLegacyLineup && (
                                <span className="absolute top-2 right-2 px-2 py-1 text-[11px] font-semibold rounded-full bg-amber-500/10 text-amber-300 border border-amber-400/60 shadow">
                                    Legacy
                                </span>
                            )}
                        </div>
                    </div>
                    {availableMethods.length === 0 && (
                        <div className="text-sm text-slate-400 mt-2">Keine Prognosemethode für diese Gameweek verfügbar.</div>
                    )}
                    {availableMethods.length === 1 && availableMethods[0] === 'legacy' && (
                        <div className="text-sm text-slate-400 mt-2">Nur Legacy-Daten für diese Gameweek vorhanden. Prognoseauswahl deaktiviert.</div>
                    )}
                </motion.div>
                <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 space-y-6'>
                    {/* Linke Spalte */}
                    <div className='lg:col-span-2 space-y-6'>
                        {/* Prognosen & Aufstellung Header */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-6">
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-100 mb-4">
                                Prognosen & Aufstellung
                            </h1>
                            <div className="flex flex-wrap gap-3 text-xs md:text-sm text-slate-400 mb-4">
                                <span>Saison: <span className="text-slate-100 font-medium">{predictions.season || '—'}</span></span>
                                <span>•</span>
                                <span>Gameweek: <span className="text-slate-100 font-medium">{predictions.gw}</span></span>
                                <span>•</span>
                                <span className="inline-flex items-center">
                                    Methode: <span className="ml-1 text-slate-100 font-medium">
                                        {selectedMethod === 'rf' ? 'Random Forest' :
                                            selectedMethod === 'rf_rank' ? 'RF (Rank)' :
                                                selectedMethod === 'ma3' ? 'Formdurchschnitt' :
                                                    selectedMethod === 'pos' ? 'Positionsmittel' :
                                                        selectedMethod}
                                    </span>
                                    <HelpIcon text={methodTooltip} />
                                </span>
                                {lineup && (
                                    <>
                                        <span>•</span>
                                        <span>Generiert: <span className="text-slate-100 font-medium">{new Date(lineup.generated_at).toLocaleString('de-DE')}</span></span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Lineup-Übersicht */}
                        {lineup && (
                            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-6 mb-6">
                                <h2 className="text-2xl font-bold text-slate-100 mb-4">Aufstellungs-Übersicht</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* ...bestehender Inhalt... */}
                                    {/* ...existing code... */}
                                </div>
                                {/* ...Hinweise... */}
                                {/* ...existing code... */}
                            </div>
                        )}

                        {/* Startelf-Tabelle */}
                        {lineup && (
                            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg overflow-hidden">
                                <div className="p-6 border-b border-slate-700">
                                    <h2 className="text-2xl font-bold text-slate-100 inline-flex items-center">
                                        Startelf<HelpIcon text={glossary.startelf} />
                                    </h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-900/80 border-b border-slate-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">Spieler</th>
                                                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">Team</th>
                                                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">Position</th>
                                                <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">Gegner</th>
                                                <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-slate-400">Prognose<HelpIcon text={glossary.prognose} side="left" /></th>
                                                <th className="px-6 py-3 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">Rolle</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-slate-800/90 divide-y divide-slate-700">
                                            {xiPlayers.map((player) => {
                                                const isCaptain = player.player_id === lineup.captain_id
                                                const isVice = player.player_id === lineup.vice_id
                                                return (
                                                    <tr key={player.player_id} className="hover:bg-slate-700/60 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="font-medium text-slate-100">{player.name}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                                            {player.team}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-900/60 border border-slate-700 text-slate-200">
                                                                {player.pos}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                                            {player.is_home ? 'vs' : '@'} {player.opponent}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-slate-100 font-semibold text-sm">
                                                            {player.predicted_points.toFixed(1)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                                            {isCaptain && <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 font-semibold text-xs">K</span>}
                                                            {isVice && <span className="inline-flex items-center px-2 py-1 rounded bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-400 font-semibold text-xs">VK</span>}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Bank-Section */}
                        {lineup && (
                            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-6 mb-6">
                                <h2 className="text-xl font-bold text-slate-100 mb-4 inline-flex items-center">
                                    Bank<HelpIcon text={glossary.bank} />
                                </h2>
                                <div className="space-y-2">
                                    {/* ...bestehender Inhalt... */}
                                    {/* ...existing code... */}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Rechte Spalte */}
                    <div className='space-y-6'>
                        {/* Dein Team Section inkl. Beste XI/Transfer-Vorschlag */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-6 space-y-6">
                            {/* ...Dein Team Section wie oben... */}
                            {/* ...existing code... */}
                        </div>

                        {/* Top-15-Section */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg overflow-hidden">
                            <div className="p-6 border-b border-slate-700">
                                <h2 className="text-2xl font-bold text-slate-100 inline-flex items-center">
                                    Top 15 Spieler<HelpIcon text="Die 15 Spieler mit den höchsten prognostizierten Punkten für diese Gameweek." />
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-900/80 border-b border-slate-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">Rang</th>
                                            <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">Spieler</th>
                                            <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">Team</th>
                                            <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">Position</th>
                                            <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">Gegner</th>
                                            <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-slate-400">Prognose<HelpIcon text={glossary.prognose} side="left" /></th>
                                            <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-slate-400">Preis<HelpIcon text={glossary.preis} side="left" /></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-slate-800/90 divide-y divide-slate-700">
                                        {top15.map((player, idx) => (
                                            <tr key={player.player_id} className="hover:bg-slate-700/60 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-slate-100 font-semibold text-sm">#{idx + 1}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-slate-100">{player.name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{player.team}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-900/60 border border-slate-700 text-slate-200">
                                                        {player.pos}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{player.is_home ? 'vs' : '@'} {player.opponent}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-slate-100 font-semibold text-sm">{player.predicted_points.toFixed(1)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-slate-100 font-semibold text-sm">£{player.price.toFixed(1)}m</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* HistoricalEvaluation-Komponente */}
                        {selectedGW && selectedMethod && selectedSeason && (
                            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-6 mt-6">
                                <HistoricalEvaluation
                                    season={selectedSeason}
                                    gw={selectedGW}
                                    methode={selectedMethod}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Header */}
                    // ...alter Header-Block entfernt...

                {/* Lineup Error Message */}
                {lineupError && (
                    <div className="rounded-xl bg-amber-900/30 border border-amber-700 text-amber-200 p-6 mb-6">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-amber-200">
                                    Aufstellung nicht verfügbar
                                </h3>
                                <p className="text-sm text-amber-300 mb-4">
                                    {lineupError}
                                </p>
                                <p className="text-xs text-amber-300">
                                    Die Prognosen sind weiterhin verfügbar. Eine Aufstellung kann für diese Kombination aus Gameweek und Methode möglicherweise nicht generiert werden.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                // ...zweite Aufstellungs-Übersicht entfernt...

                {/* Starting XI Table */}
                // ...alte Startelf-Tabelle entfernt...

                {/* Bench */}
                {lineup && (
                    <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-6 mb-6">
                        <h2 className="text-xl font-bold text-slate-100 mb-4 inline-flex items-center">
                            Bank<HelpIcon text={glossary.bank} />
                        </h2>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-700">
                                <div>
                                    <span className="text-[11px] text-slate-400 font-medium">TW:</span>
                                    <span className="text-sm text-slate-100 font-medium ml-1">{findPlayer(lineup.bench_gk_id)?.name || `ID ${lineup.bench_gk_id}`}</span>
                                </div>
                                <span className="text-sm text-slate-300">
                                    {findPlayer(lineup.bench_gk_id)?.predicted_points.toFixed(1)} Pkt
                                </span>
                            </div>
                            {lineup.bench_out_ids.map((id, idx) => {
                                const player = findPlayer(id)
                                return (
                                    <div key={id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-700">
                                        <div>
                                            <span className="text-[11px] text-slate-400 font-medium">B{idx + 1}:</span>
                                            <span className="text-sm text-slate-100 font-medium ml-1">{player?.name || `ID ${id}`}</span>
                                            {player && <span className="ml-2 text-[11px] text-slate-400">({player.pos})</span>}
                                        </div>
                                        <span className="text-sm text-slate-300">
                                            {player?.predicted_points.toFixed(1)} Pkt
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Top 15 Predictions */}
                // ...alte Bank-Sektion entfernt...

                // ...zweite ungestylte HistoricalEvaluation entfernt...

                {/* Hinweis: Downloads-Panel entfernt. Downloads werden zukünftig als 'Materialien'-Sektion dargestellt. */}
            </div>
        </>
    )
}
