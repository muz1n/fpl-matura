import { useEffect, useState, useCallback } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import type { PredictionsPayload, LineupPayload, PredictionPlayer } from '../types/fpl'
import { HelpIcon } from '../src/components/HelpIcon'
import { glossary } from '../src/data/glossary'
import { Select } from '../src/components/Select'
import { LoadingState, ErrorState, EmptyState } from '../src/components/States'
import { saveSquad, loadSquad } from '../src/lib/squad-storage'

type LoadingStateType = 'idle' | 'loading' | 'success' | 'error'
type PredictionMethod = 'rf' | 'ma3' | 'pos' | 'rf_rank'

// Methoden-Optionen mit deutschen Namen
const methodOptions = [
    { value: 'rf', label: 'Random Forest (KI-Modell)' },
    { value: 'rf_rank', label: 'RF (Rank)' },
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

    // Fetch available gameweeks on mount
    useEffect(() => {
        async function fetchAvailableGWs() {
            setGwLoadingState('loading')
            setGwError('')

            try {
                const res = await fetch('/api/gw/available')
                if (!res.ok) {
                    throw new Error('Fehler beim Laden verfügbarer Gameweeks')
                }

                // Expect: { available: number[], latest: number | null, methodsByGw: Record<number, string[]> }
                const data: { available: number[]; latest: number | null; methodsByGw?: Record<number, string[]> } = await res.json()

                setAvailableGWs(data.available)
                setMethodsByGw(data.methodsByGw ?? {})

                // Set default to latest if available
                if (data.latest !== null) {
                    setSelectedGW(data.latest)
                } else if (data.available.length > 0) {
                    setSelectedGW(data.available[0])
                }

                setGwLoadingState('loaded')
            } catch (err) {
                setGwError(err instanceof Error ? err.message : 'Unbekannter Fehler')
                setGwLoadingState('error')
            }
        }

        fetchAvailableGWs()
    }, [])

    // Derive availableMethods for selectedGW
    const availableMethods: string[] = selectedGW !== null ? (methodsByGw[selectedGW] ?? []) : [];

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
                // Fetch predictions
                const predRes = await fetch(`/api/gw/${selectedGW}/predictions?methode=${selectedMethod}`);

                if (!predRes.ok) {
                    const errorData = await predRes.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Fehler beim Laden der Prognosen');
                }

                const predData: PredictionsPayload = await predRes.json();
                setPredictions(predData);

                // Fetch lineup - handle 404 gracefully
                try {
                    const lineupRes = await fetch(`/api/gw/${selectedGW}/lineup?methode=${selectedMethod}`);

                    if (!lineupRes.ok) {
                        if (lineupRes.status === 404) {
                            const errorData = await lineupRes.json().catch(() => ({}));
                            setLineupError(errorData.error || 'Lineup-Daten nicht verfügbar');
                            setLineup(null);
                        } else {
                            const errorData = await lineupRes.json().catch(() => ({}));
                            throw new Error(errorData.error || 'Fehler beim Laden der Lineup-Daten');
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
    }, [selectedGW, selectedMethod]);

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
                        <p className="text-xl text-gray-600 dark:text-gray-400">
                            Keine Gameweek-Daten verfügbar
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
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
                <ErrorState message={error} onRetry={handleRetry} />
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

            <div className="space-y-6">
                {/* Toolbar mit Auswahl */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <span className="absolute top-0 right-0 mt-1 mr-1 px-2 py-1 text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 rounded">
                                    Legacy
                                </span>
                            )}
                        </div>
                    </div>
                    {availableMethods.length === 0 && (
                        <div className="text-sm text-gray-500 mt-2">Keine Prognosemethode für diese Gameweek verfügbar.</div>
                    )}
                    {availableMethods.length === 1 && availableMethods[0] === 'legacy' && (
                        <div className="text-sm text-gray-500 mt-2">Nur Legacy-Daten für diese Gameweek vorhanden. Prognoseauswahl deaktiviert.</div>
                    )}
                </motion.div>

                {/* Dein Team (LocalStorage) + 1-Transfer-Vorschlag */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Dein Team</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Gib die 15 Spieler-IDs deines Kaders kommasepariert ein. Beispiel: <span className="font-mono">123, 456, 789, ...</span>
                        <br />
                        Hinweis: Die IDs müssen zu den Spielern in den Prognosen dieser Gameweek gehören. Budget wird ignoriert, Kapitänsbonus unberücksichtigt.
                    </p>

                    <div className="space-y-3">
                        <textarea
                            value={teamInput}
                            onChange={(e) => setTeamInput(e.target.value)}
                            rows={3}
                            placeholder="15 IDs, z.B. 101, 102, 103, ..."
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleSaveTeam}
                                className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                Speichern
                            </button>
                            <button
                                onClick={handleLoadTeam}
                                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
                            >
                                Laden
                            </button>
                            {teamIds.length > 0 && (
                                <span className="text-sm text-gray-600 dark:text-gray-400 self-center">{teamIds.length} IDs erkannt</span>
                            )}
                        </div>

                        {/* Beste XI aus deinem Kader */}
                        {predictions && teamIds.length >= 11 && (() => {
                            const idSet = new Set(teamIds)
                            const teamPlayers = predictions.players.filter(p => idSet.has(p.player_id))
                            const best = computeBestXI(teamPlayers)
                            if (!best) return null
                            return (
                                <div className="mt-4 p-4 rounded border border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Beste XI aus deinem Kader</h3>
                                    <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">Formation: <span className="font-medium">{best.formation}</span> • XI-Punkte: <span className="font-medium">{best.sum.toFixed(1)}</span></div>
                                    <ul className="text-sm text-gray-700 dark:text-gray-300 grid md:grid-cols-2 gap-1">
                                        {best.xi.map(p => (
                                            <li key={p.player_id}>{p.name} <span className="text-xs text-gray-500">({p.pos})</span> — {p.predicted_points.toFixed(1)} Pkt</li>
                                        ))}
                                    </ul>
                                </div>
                            )
                        })()}

                        {/* Transfer-Vorschlag */}
                        <div className="mt-4 p-4 rounded border border-dashed border-gray-300 dark:border-gray-600">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Transfer-Vorschlag (1 Wechsel)</h3>
                            {!predictions ? (
                                <p className="text-sm text-gray-600 dark:text-gray-400">Prognosen werden geladen...</p>
                            ) : teamIds.length < 11 ? (
                                <p className="text-sm text-gray-600 dark:text-gray-400">Bitte mindestens 11 IDs eingeben (idealerweise 15), um einen Vorschlag zu berechnen.</p>
                            ) : transferSuggestion && transferSuggestion.in && transferSuggestion.out && transferSuggestion.delta > 0 ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-700 dark:text-gray-300">
                                            Out: <span className="font-medium text-red-600 dark:text-red-400">{transferSuggestion.out.name}</span> ({transferSuggestion.out.pos})
                                        </div>
                                        <div className="text-sm text-gray-700 dark:text-gray-300">
                                            In: <span className="font-medium text-emerald-600 dark:text-emerald-400">{transferSuggestion.in.name}</span> ({transferSuggestion.in.pos})
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        XI-Punkte: {transferSuggestion.oldXiSum.toFixed(1)} → <span className="font-semibold">{transferSuggestion.newXiSum.toFixed(1)}</span> (<span className="text-emerald-600 dark:text-emerald-400">+{transferSuggestion.delta.toFixed(1)} Pkt</span>)
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Demo-Vorschlag (ohne Budget/Club-Limits). Beste XI anhand erlaubter Formationen berechnet.</div>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Kein klarer +Punkte-Wechsel gefunden. Dein aktuelles Team ist bereits nahe am Optimum nach Prognosen.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Prognosen & Aufstellung
                    </h1>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Saison: <strong className="text-gray-900 dark:text-white">{predictions.season}</strong></span>
                        <span>•</span>
                        <span>Gameweek: <strong className="text-gray-900 dark:text-white">{predictions.gw}</strong></span>
                        <span>•</span>
                        <span className="inline-flex items-center">
                            Methode: <strong className="ml-1 text-gray-900 dark:text-white">
                                {selectedMethod === 'rf' ? 'Random Forest' :
                                    selectedMethod === 'rf_rank' ? 'RF (Rank)' :
                                        selectedMethod === 'ma3' ? 'Formdurchschnitt' :
                                            selectedMethod === 'pos' ? 'Positionsmittel' :
                                                selectedMethod}
                            </strong>
                            <HelpIcon text={methodTooltip} />
                        </span>
                        {lineup && (
                            <>
                                <span>•</span>
                                <span>Generiert: <strong className="text-gray-900 dark:text-white">{new Date(lineup.generated_at).toLocaleString('de-DE')}</strong></span>
                            </>
                        )}
                    </div>
                </div>

                {/* Lineup Error Message */}
                {lineupError && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-400">
                                    Aufstellung nicht verfügbar
                                </h3>
                                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                                    {lineupError}
                                </p>
                                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                                    Die Prognosen sind weiterhin verfügbar. Eine Aufstellung kann für diese Kombination aus Gameweek und Methode möglicherweise nicht generiert werden.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Lineup Summary */}
                {lineup && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Aufstellungs-Übersicht</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 inline-flex items-center">
                                    Formation<HelpIcon text={glossary.formation} />
                                </div>
                                <div className="text-xl font-semibold text-gray-900 dark:text-white">{lineup.formation}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 inline-flex items-center">
                                    Kapitän<HelpIcon text={glossary.captain} />
                                </div>
                                <div className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {captainPlayer?.name || `ID ${lineup.captain_id}`}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 inline-flex items-center">
                                    Vize-Kapitän<HelpIcon text={glossary.viceCaptain} />
                                </div>
                                <div className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {vicePlayer?.name || `ID ${lineup.vice_id}`}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 inline-flex items-center">
                                    Startelf<HelpIcon text={glossary.startelf} />
                                </div>
                                <div className="text-xl font-semibold text-gray-900 dark:text-white">{lineup.xi_ids.length}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 inline-flex items-center">
                                    Erwartete Punkte<HelpIcon text={glossary.erwartePunkte} />
                                </div>
                                <div className="text-xl font-semibold text-emerald-600">
                                    {lineup.xi_points_sum.toFixed(1)}
                                </div>
                            </div>
                            {lineup.debug?.rules_ok !== undefined && (
                                <div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 inline-flex items-center">
                                        Regelprüfung<HelpIcon text={glossary.regelPruefung} />
                                    </div>
                                    <div className={`text-xl font-semibold ${lineup.debug.rules_ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {lineup.debug.rules_ok ? '✓ Gültig' : '✗ Ungültig'}
                                    </div>
                                </div>
                            )}
                        </div>
                        {lineup.debug?.notes && (
                            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
                                <strong>Hinweise:</strong> {lineup.debug.notes}
                            </div>
                        )}
                    </div>
                )}

                {/* Starting XI Table */}
                {lineup && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white inline-flex items-center">
                                Startelf<HelpIcon text={glossary.startelf} />
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                            Spieler
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                            Team
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                            Position
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                            Gegner
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                            <span className="inline-flex items-center">
                                                Prognose<HelpIcon text={glossary.prognose} side="left" />
                                            </span>
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                            Rolle
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {xiPlayers.map((player) => {
                                        const isCaptain = player.player_id === lineup.captain_id
                                        const isVice = player.player_id === lineup.vice_id
                                        return (
                                            <tr key={player.player_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900 dark:text-white">{player.name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                    {player.team}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${player.pos === 'GK' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                          ${player.pos === 'DEF' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                          ${player.pos === 'MID' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                          ${player.pos === 'FWD' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                        `}>
                                                        {player.pos}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                                    {player.is_home ? 'vs' : '@'} {player.opponent}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900 dark:text-white">
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

                {/* Bench */}
                {lineup && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 inline-flex items-center">
                            Bank<HelpIcon text={glossary.bank} />
                        </h2>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                                <div>
                                    <span className="font-medium text-gray-900 dark:text-white">TW: </span>
                                    <span className="text-gray-700 dark:text-gray-300">{findPlayer(lineup.bench_gk_id)?.name || `ID ${lineup.bench_gk_id}`}</span>
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {findPlayer(lineup.bench_gk_id)?.predicted_points.toFixed(1)} Pkt
                                </span>
                            </div>
                            {lineup.bench_out_ids.map((id, idx) => {
                                const player = findPlayer(id)
                                return (
                                    <div key={id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                                        <div>
                                            <span className="font-medium text-gray-900 dark:text-white">B{idx + 1}: </span>
                                            <span className="text-gray-700 dark:text-gray-300">{player?.name || `ID ${id}`}</span>
                                            {player && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({player.pos})</span>}
                                        </div>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {player?.predicted_points.toFixed(1)} Pkt
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Top 15 Predictions */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white inline-flex items-center">
                            Top 15 Spieler<HelpIcon text="Die 15 Spieler mit den höchsten prognostizierten Punkten für diese Gameweek." />
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Rang
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Spieler
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Team
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Position
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        Gegner
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        <span className="inline-flex items-center">
                                            Prognose<HelpIcon text={glossary.prognose} side="left" />
                                        </span>
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                        <span className="inline-flex items-center">
                                            Preis<HelpIcon text={glossary.preis} side="left" />
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {top15.map((player, idx) => (
                                    <tr key={player.player_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400">
                                            #{idx + 1}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900 dark:text-white">{player.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                            {player.team}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${player.pos === 'GK' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                        ${player.pos === 'DEF' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                        ${player.pos === 'MID' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                        ${player.pos === 'FWD' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                      `}>
                                                {player.pos}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                            {player.is_home ? 'vs' : '@'} {player.opponent}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900 dark:text-white">
                                            {player.predicted_points.toFixed(1)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600 dark:text-gray-400">
                                            £{player.price.toFixed(1)}m
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    )
}
