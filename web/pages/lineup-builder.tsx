import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { PitchXI, FormationStr, PitchPlayer } from '@/components/PitchXI'
import PlayerCard, { PlayerCardData } from '@/components/PlayerCard'
import { cn } from '@/lib/utils'

const FORMATIONS: FormationStr[] = ['3-4-3', '3-5-2', '4-4-2', '4-3-3', '4-5-1', '5-3-2', '5-4-1']

type Player = {
    name: string
    position: string
    team: string | null
    price: number | null
    image: string | null
    clubImage: string | null
    predicted_points?: number | null
}

const POS_LIMITS: Record<string, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 }
const MAX_FROM_CLUB = 3
const BUDGET = 100 // in same units as price (e.g. 5.5)
const SEASONS = ['2023-24', '2022-23', '2021-22', '2020-21', '2019-20', '2018-19', '2017-18', '2016-17']

export default function LineupBuilderPage() {
    const [season, setSeason] = useState('2023-24')
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<Player[]>([])
    const [error, setError] = useState<string | null>(null)
    const [squad, setSquad] = useState<Player[]>([])
    const [formation, setFormation] = useState<FormationStr>('4-4-2')
    const [xiIds, setXiIds] = useState<Set<number>>(new Set())
    const [captainId, setCaptainId] = useState<number>(-1)
    const [viceCaptainId, setViceCaptainId] = useState<number>(-1)
    const [viewMode, setViewMode] = useState<'pitch' | 'list'>('pitch')

    const totals = useMemo(() => {
        const byPos: Record<string, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
        let budget = 0
        const byClub = new Map<string, number>()
        for (const p of squad) {
            byPos[p.position] = (byPos[p.position] || 0) + 1
            budget += p.price || 0
            if (p.team) byClub.set(p.team, (byClub.get(p.team) || 0) + 1)
        }
        return { byPos, budget, byClub }
    }, [squad])

    const canSearch = useMemo(() => season.trim() && q.trim().length >= 2, [season, q])

    async function search() {
        if (!canSearch) return
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams({ season, q, limit: '20' })
            const r = await fetch(`/api/players/search?${params.toString()}`)
            const data = await r.json()
            if (!r.ok) throw new Error(data?.error || 'Fehler bei der Suche')
            console.log('API response:', data.results?.[0]) // Debug
            setResults(data.results || [])
        } catch (e: any) {
            setError(e?.message || 'Unbekannter Fehler')
            setResults([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (q.trim().length >= 3) {
            const t = setTimeout(search, 150)
            return () => clearTimeout(t)
        } else {
            setResults([])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, season])

    function canAdd(p: Player): { ok: boolean; reason?: string } {
        if (squad.length >= 15) return { ok: false, reason: 'Kader voll' }
        // No duplicates by name+team+position
        if (squad.some(x => x.name === p.name && x.team === p.team && x.position === p.position)) {
            return { ok: false, reason: 'Spieler schon im Kader' }
        }
        // Position limit
        if ((totals.byPos[p.position] || 0) >= (POS_LIMITS[p.position] || 0)) {
            return { ok: false, reason: `Limit ${p.position} erreicht` }
        }
        // Club limit
        if (p.team) {
            const count = totals.byClub.get(p.team) || 0
            if (count >= MAX_FROM_CLUB) return { ok: false, reason: `Max ${MAX_FROM_CLUB} pro Klub` }
        }
        // Budget
        const newBudget = totals.budget + (p.price || 0)
        if (newBudget > BUDGET) return { ok: false, reason: 'Budget überschritten' }
        return { ok: true }
    }

    function addToSquad(p: Player) {
        const check = canAdd(p)
        if (!check.ok) {
            setError(check.reason || 'Hinzufügen nicht möglich')
            return
        }
        setSquad(prev => {
            const next = [...prev, p]
            autopopulateXI(next, formation)
            return next
        })
    }

    function removeFromSquad(idx: number) {
        setSquad(prev => {
            const removed = prev.filter((_, i) => i !== idx)
            // XI nach Entfernen neu berechnen
            autopopulateXI(removed, formation)
            return removed
        })
    }

    function autopopulateXI(list: Player[], form: FormationStr) {
        // Wenn bereits manuell gewählt (xiIds nicht leer), nicht überschreiben
        if (xiIds.size > 0) return
        const config = formation.split('-').map(n => parseInt(n, 10))
        const [defCount, midCount, fwdCount] = config.length === 3 ? config : [4, 4, 2]
        const gk = list.findIndex(p => p.position === 'GK')
        const defIdxs = list.map((p, i) => ({ p, i })).filter(x => x.p.position === 'DEF').slice(0, defCount).map(x => x.i)
        const midIdxs = list.map((p, i) => ({ p, i })).filter(x => x.p.position === 'MID').slice(0, midCount).map(x => x.i)
        const fwdIdxs = list.map((p, i) => ({ p, i })).filter(x => x.p.position === 'FWD').slice(0, fwdCount).map(x => x.i)
        const ids = new Set<number>()
        if (gk !== -1) ids.add(gk)
        defIdxs.forEach(i => ids.add(i))
        midIdxs.forEach(i => ids.add(i))
        fwdIdxs.forEach(i => ids.add(i))
        setXiIds(ids)
    }

    useEffect(() => {
        autopopulateXI(squad, formation)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formation])

    const xiPlayers: PitchPlayer[] = squad
        .map((p, i): PitchPlayer | null => xiIds.has(i) ? ({
            id: i,
            name: p.name,
            position: p.position as any,
            teamShort: p.team || '',
            price: p.price || 0,
            predictedPoints: p.predicted_points || undefined,
            photoUrl: p.image || undefined,
            clubImage: p.clubImage || undefined,
            isCaptain: captainId === i,
            isVice: viceCaptainId === i
        }) : null)
        .filter(Boolean) as PitchPlayer[]

    const benchPlayers: PitchPlayer[] = squad
        .map((p, i): PitchPlayer | null => !xiIds.has(i) ? ({
            id: i,
            name: p.name,
            position: p.position as any,
            teamShort: p.team || '',
            price: p.price || 0,
            predictedPoints: p.predicted_points || undefined,
            photoUrl: p.image || undefined,
            clubImage: p.clubImage || undefined
        }) : null)
        .filter(Boolean) as PitchPlayer[]

    function toggleXi(index: number) {
        setXiIds(prev => {
            const next = new Set(prev)
            if (next.has(index)) {
                next.delete(index)
                if (captainId === index) setCaptainId(-1)
                if (viceCaptainId === index) setViceCaptainId(-1)
            } else {
                next.add(index)
            }
            return next
        })
    }

    function handleCaptainChange(cId: number, vId: number) {
        setCaptainId(cId)
        setViceCaptainId(vId)
    }

    const lineupState = { xi: squad.filter((_, i) => xiIds.has(i)) }

    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 640) {
            setViewMode('list')
        }
    }, [])

    return (
        <div className="animate-fadeInSlow">
            <Head>
                <title>Lineup Builder</title>
            </Head>
            <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Globaler Loading-State */}
                    {loading && (
                        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-5 text-sm text-slate-200 text-center mb-6">
                            Daten werden geladen…
                        </div>
                    )}
                    {/* Globaler Error-State */}
                    {error && !loading && (
                        <div className="rounded-2xl bg-red-900/40 border border-red-700 text-red-100 px-4 py-3 text-sm text-center mb-6">
                            {error}
                        </div>
                    )}
                    {/* Responsive Header-Bar */}
                    <div className="mb-6 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 shadow-lg
                flex items-center justify-between
                lg:flex lg:items-center lg:justify-between
                md:grid md:grid-cols-3 md:gap-2
                sm:block">
                        {/* Linker Bereich: Titel + Saison */}
                        <div className="lg:text-left md:text-left sm:text-center">
                            <div className="text-xl font-semibold text-slate-100">Lineup Builder</div>
                            <div className="text-[12px] text-slate-400">Saison {season}</div>
                        </div>
                        {/* Mittlerer Bereich: Formation Dropdown */}
                        <div className="flex flex-col gap-2 md:justify-center md:items-center sm:mt-2">
                            <label className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">Formation</label>
                            <select
                                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-emerald-500 shadow"
                                value={formation}
                                onChange={e => setFormation(e.target.value as FormationStr)}
                            >
                                {FORMATIONS.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        </div>
                        {/* Rechter Bereich: Buttons + Info */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-2 mt-2 md:mt-0">
                            <div className="flex items-center gap-2">
                                <button
                                    className="px-2 py-1 lg:px-3 lg:py-1.5 rounded-md text-sm font-medium transition-all duration-150 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white hover:-translate-y-[1px] active:translate-y-[1px] active:brightness-90 hover:shadow-emerald-700/30 hover:shadow-lg"
                                    onClick={() => autopopulateXI(squad, formation)}
                                >
                                    Auto Pick
                                </button>
                                <button
                                    className="px-2 py-1 lg:px-3 lg:py-1.5 rounded-md text-sm font-medium transition-all duration-150 shadow-md bg-slate-700 hover:bg-slate-600 text-slate-100 hover:-translate-y-[1px] active:translate-y-[1px] active:brightness-90"
                                    onClick={() => setXiIds(new Set<number>())}
                                >
                                    Reset XI
                                </button>
                                <button
                                    className="px-2 py-1 lg:px-3 lg:py-1.5 rounded-md text-sm font-medium transition-all duration-150 shadow-md bg-red-600 hover:bg-red-700 text-white hover:-translate-y-[1px] active:translate-y-[1px] active:brightness-90 hover:shadow-red-700/30"
                                    onClick={() => setSquad([])}
                                >
                                    Clear Squad
                                </button>
                            </div>
                            <div className="flex flex-col items-end leading-tight ml-2">
                                <div className="text-[12px] text-slate-300">Budget Left: £{(BUDGET - totals.budget).toFixed(1)}</div>
                                <div className="text-[12px] text-slate-300">Squad: {squad.length}/15</div>
                            </div>
                        </div>
                    </div>

                    {/* Budget & Limits Bar */}
                    <div className="bg-slate-800/90 border border-slate-700 rounded-xl shadow-lg p-4 mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold">{squad.length}<span className="text-slate-500">/15</span></div>
                                <div className="text-xs text-slate-400 uppercase tracking-wide">Kader</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-emerald-500">{totals.budget.toFixed(1)}<span className="text-slate-500">/{BUDGET.toFixed(1)}</span></div>
                                <div className="text-xs text-slate-400 uppercase tracking-wide">Budget (M)</div>
                            </div>
                            <div className={totals.byPos.GK >= POS_LIMITS.GK ? 'opacity-50' : ''}>
                                <div className="text-2xl font-bold">{totals.byPos.GK || 0}<span className="text-slate-500">/{POS_LIMITS.GK}</span></div>
                                <div className="text-xs text-slate-400 uppercase tracking-wide">GK</div>
                            </div>
                            <div className={totals.byPos.DEF >= POS_LIMITS.DEF ? 'opacity-50' : ''}>
                                <div className="text-2xl font-bold">{totals.byPos.DEF || 0}<span className="text-slate-500">/{POS_LIMITS.DEF}</span></div>
                                <div className="text-xs text-slate-400 uppercase tracking-wide">DEF</div>
                            </div>
                            <div className={totals.byPos.MID >= POS_LIMITS.MID ? 'opacity-50' : ''}>
                                <div className="text-2xl font-bold">{totals.byPos.MID || 0}<span className="text-slate-500">/{POS_LIMITS.MID}</span></div>
                                <div className="text-xs text-slate-400 uppercase tracking-wide">MID</div>
                            </div>
                            <div className={totals.byPos.FWD >= POS_LIMITS.FWD ? 'opacity-50' : ''}>
                                <div className="text-2xl font-bold">{totals.byPos.FWD || 0}<span className="text-slate-500">/{POS_LIMITS.FWD}</span></div>
                                <div className="text-xs text-slate-400 uppercase tracking-wide">FWD</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Linke Spalte: Pitch + Bench (2fr) */}
                        <div className="lg:col-span-2">
                            <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-4 shadow-lg mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-slate-200">Aufstellung</span>
                                    <div className="inline-flex rounded-full bg-slate-800/80 border border-slate-700 p-1">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('pitch')}
                                            className={cn(
                                                'px-3 py-1 text-xs font-medium rounded-full transition',
                                                viewMode === 'pitch'
                                                    ? 'bg-emerald-600 text-white shadow'
                                                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/70'
                                            )}
                                        >
                                            Pitch XI
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('list')}
                                            className={cn(
                                                'px-3 py-1 text-xs font-medium rounded-full transition',
                                                viewMode === 'list'
                                                    ? 'bg-emerald-600 text-white shadow'
                                                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/70'
                                            )}
                                        >
                                            Liste
                                        </button>
                                    </div>
                                </div>
                                <div className="aspect-[3/4] w-full">
                                    {viewMode === 'pitch' ? (
                                        <PitchXI
                                            formation={formation}
                                            players={xiPlayers}
                                            captainId={captainId}
                                            viceCaptainId={viceCaptainId}
                                            onCaptainChange={handleCaptainChange}
                                        />
                                    ) : (
                                        <div className='w-full rounded-2xl bg-slate-800/90 border border-slate-700 p-4 shadow-lg space-y-2 max-h-[480px] overflow-y-auto'>
                                            {xiPlayers.length === 0 ? (
                                                <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3 text-xs text-slate-400 text-center my-6">
                                                    Keine Startelf – ziehe Spieler in die Aufstellung.
                                                </div>
                                            ) : (
                                                xiPlayers.map((player, index) => {
                                                    const cardData: PlayerCardData = {
                                                        name: player.name,
                                                        team: player.teamShort ?? '',
                                                        position: player.position,
                                                        price: player.price ?? null,
                                                        predicted_points: player.predictedPoints ?? null,
                                                        image: player.photoUrl ?? null,
                                                        clubImage: player.clubImage ?? null
                                                    }
                                                    return (
                                                        <div key={player.id} className='flex items-center gap-3'>
                                                            <span className='w-5 text-[11px] text-slate-400 text-right'>
                                                                {index + 1}.
                                                            </span>
                                                            <PlayerCard mode='list' player={cardData} />
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* Bench */}
                                <div className="mt-4 bg-slate-900/80 rounded-xl p-3">
                                    <h4 className="text-sm font-semibold mb-2">Bank ({benchPlayers.length})</h4>
                                    {benchPlayers.length === 0 ? (
                                        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3 text-xs text-slate-400 text-center my-3">
                                            Keine Bankspieler – weise Spieler der Bank zu.
                                        </div>
                                    ) : (
                                        <div className="flex justify-center gap-2">
                                            {benchPlayers.map(b => {
                                                const cardData: PlayerCardData = {
                                                    name: b.name,
                                                    team: b.teamShort,
                                                    position: b.position,
                                                    price: b.price,
                                                    predicted_points: b.predictedPoints ?? null,
                                                    image: b.photoUrl ?? null,
                                                    clubImage: b.clubImage ?? null
                                                }
                                                return (
                                                    <div key={b.id} onClick={() => toggleXi(b.id)} className="cursor-pointer">
                                                        <PlayerCard player={cardData} mode="bench" showPosition={false} />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Rechte Spalte: Search + Squad List (1fr) */}
                        <div className="lg:col-span-1 space-y-4">
                            {/* Panel 1: Spieler-Suche */}
                            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 shadow-lg">
                                <h2 className="text-lg font-semibold mb-4">Spieler suchen</h2>

                                {/* Saison Selector */}
                                <div className="mb-3">
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Saison</label>
                                    <select
                                        className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-700 text-slate-100"
                                        value={season}
                                        onChange={(e) => setSeason(e.target.value)}
                                    >
                                        {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                {/* Suchfeld */}
                                <div className="mb-3">
                                    <input
                                        className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-100 placeholder-slate-400"
                                        placeholder="Spieler suchen…"
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                    />
                                </div>

                                {/* Error Message (nur für Feld-Fehler, nicht global) */}

                                {/* Autocomplete Liste */}
                                {results.length > 0 && (
                                    <div className="max-h-64 overflow-y-auto bg-slate-900/40 border border-slate-700 rounded-lg">
                                        {results.map((r, idx) => {
                                            const check = canAdd(r)
                                            return (
                                                <div
                                                    key={`${r.name}-${r.team}-${r.position}-${idx}`}
                                                    className={`flex items-center gap-3 px-3 py-2 transition-all duration-100 hover:bg-slate-700/60 hover:shadow-md hover:-translate-y-[1px] ${check.ok ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                                                    onClick={() => check.ok && addToSquad(r)}
                                                    title={check.ok ? 'Zum Kader hinzufügen' : (check.reason || '')}
                                                >
                                                    <img
                                                        src={r.image || '/images/player-placeholder.png'}
                                                        alt={r.name}
                                                        className="w-10 h-10 rounded-full object-cover border border-slate-600"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-sm truncate">{r.name}</div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-100 uppercase">
                                                                {r.position}
                                                            </span>
                                                            <span className="text-xs text-slate-400 truncate">{r.team || '—'}</span>
                                                        </div>
                                                    </div>
                                                    {r.clubImage && (
                                                        <img src={r.clubImage} alt={r.team || ''} className="w-5 h-5 object-contain" />
                                                    )}
                                                    <span className="text-sm font-semibold text-emerald-400">
                                                        £{r.price != null ? r.price.toFixed(1) : '—'}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {results.length === 0 && q.trim().length >= 3 && !loading && (
                                    <div className="text-center py-4 text-slate-400 text-xs">
                                        Keine Spieler gefunden
                                    </div>
                                )}
                            </div>

                            {/* Panel 2: Squad-Liste */}
                            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 shadow-lg">
                                <h3 className="text-md font-semibold mb-3">Kompletter Kader</h3>
                                {squad.length === 0 ? (
                                    <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3 text-xs text-slate-400 text-center my-6">
                                        Noch keine Spieler im Kader – füge rechts Spieler hinzu.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {/* Squad Panel Inhalt */}
                                        <div className="shadow-md shadow-black/20 rounded-lg">
                                            {squad.map((p, i) => {
                                                const cardData: PlayerCardData = {
                                                    name: p.name,
                                                    team: p.team,
                                                    position: p.position,
                                                    price: p.price,
                                                    predicted_points: p.predicted_points ?? null,
                                                    image: p.image,
                                                    clubImage: p.clubImage
                                                }
                                                return (
                                                    <div key={`${p.name}-${p.team}-${p.position}-${i}`} className="flex items-center gap-2">
                                                        <div className="flex-1">
                                                            <PlayerCard player={cardData} mode="list" showPosition={true} />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <button
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-md text-xs transition-colors whitespace-nowrap"
                                                                onClick={() => toggleXi(i)}
                                                            >
                                                                {xiIds.has(i) ? 'Von XI' : 'Zur XI'}
                                                            </button>
                                                            <button
                                                                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-md text-xs transition-colors"
                                                                onClick={() => removeFromSquad(i)}
                                                                title="Entfernen"
                                                            >
                                                                Entfernen
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
