import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { PitchXI, FormationStr, PitchPlayer } from '@/components/PitchXI'
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
            // Rebuild xi after removal
            const newXiIds = new Set(Array.from(xiIds).filter(id => id !== idx))
            setXiIds(newXiIds) // might be inconsistent due to index usage; we adjust below
            // Re-autopopulate with formation
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

    return (
        <>
            <Head>
                <title>Lineup Builder</title>
            </Head>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Lineup Builder</h1>
                        <p className="text-slate-600">Erstelle deinen FPL Kader für Saison {season}</p>
                    </div>

                    {/* Budget & Limits Bar */}
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold text-slate-900">{squad.length}<span className="text-slate-400">/15</span></div>
                                <div className="text-xs text-slate-600 uppercase tracking-wide">Kader</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-emerald-600">{totals.budget.toFixed(1)}<span className="text-slate-400">/{BUDGET.toFixed(1)}</span></div>
                                <div className="text-xs text-slate-600 uppercase tracking-wide">Budget (M)</div>
                            </div>
                            <div className={totals.byPos.GK >= POS_LIMITS.GK ? 'opacity-50' : ''}>
                                <div className="text-2xl font-bold text-slate-900">{totals.byPos.GK || 0}<span className="text-slate-400">/{POS_LIMITS.GK}</span></div>
                                <div className="text-xs text-slate-600 uppercase tracking-wide">GK</div>
                            </div>
                            <div className={totals.byPos.DEF >= POS_LIMITS.DEF ? 'opacity-50' : ''}>
                                <div className="text-2xl font-bold text-slate-900">{totals.byPos.DEF || 0}<span className="text-slate-400">/{POS_LIMITS.DEF}</span></div>
                                <div className="text-xs text-slate-600 uppercase tracking-wide">DEF</div>
                            </div>
                            <div className={totals.byPos.MID >= POS_LIMITS.MID ? 'opacity-50' : ''}>
                                <div className="text-2xl font-bold text-slate-900">{totals.byPos.MID || 0}<span className="text-slate-400">/{POS_LIMITS.MID}</span></div>
                                <div className="text-xs text-slate-600 uppercase tracking-wide">MID</div>
                            </div>
                            <div className={totals.byPos.FWD >= POS_LIMITS.FWD ? 'opacity-50' : ''}>
                                <div className="text-2xl font-bold text-slate-900">{totals.byPos.FWD || 0}<span className="text-slate-400">/{POS_LIMITS.FWD}</span></div>
                                <div className="text-xs text-slate-600 uppercase tracking-wide">FWD</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Pitch View */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-slate-900">Aufstellung ({squad.length}/15)</h2>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-slate-700">Formation:</label>
                                        <select
                                            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            value={formation}
                                            onChange={(e) => setFormation(e.target.value as FormationStr)}
                                        >
                                            {FORMATIONS.map((f: FormationStr) => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="aspect-[3/4] max-h-[600px]">
                                    <PitchXI
                                        formation={formation}
                                        players={xiPlayers}
                                        captainId={captainId}
                                        viceCaptainId={viceCaptainId}
                                        onCaptainChange={handleCaptainChange}
                                    />
                                </div>
                                {/* Bench Anzeige */}
                                <div className="mt-4 bg-slate-900/80 rounded-xl p-3 text-slate-100">
                                    <h4 className="text-sm font-semibold mb-2">Bank ({benchPlayers.length})</h4>
                                    {benchPlayers.length === 0 ? (
                                        <div className="text-xs text-slate-400">Keine Bankspieler</div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {benchPlayers.map(b => (
                                                <div key={b.id} className="relative">
                                                    <div className="w-[90px]">
                                                        <img src={b.photoUrl || '/images/player-placeholder.png'} alt={b.name} className="w-16 h-16 rounded-full object-cover mx-auto mb-1 border border-slate-700" />
                                                        <div className="text-[11px] font-medium text-center truncate">{b.name}</div>
                                                        <div className="text-[10px] text-center text-slate-400">{b.position}</div>
                                                    </div>
                                                    <button
                                                        className="absolute -top-1 -right-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full w-6 h-6 text-[10px] font-bold"
                                                        title="In XI verschieben"
                                                        onClick={() => toggleXi(b.id)}
                                                    >
                                                        ↑
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Squad List below pitch (refactored) */}
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
                                <h3 className="text-md font-semibold text-slate-900 mb-3">Kompletter Kader</h3>
                                {squad.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-sm">
                                        Kader ist leer
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-200">
                                        {squad.map((p, i) => (
                                            <li key={`${p.name}-${p.team}-${p.position}-${i}`} className="relative flex items-center gap-3 py-2">
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 border border-slate-300 shadow-sm">
                                                    <img
                                                        src={p.image || '/images/player-placeholder.png'}
                                                        alt={p.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/player-placeholder.png' }}
                                                    />
                                                </div>
                                                {p.clubImage && (
                                                    <img src={p.clubImage} alt={p.team || ''} className="w-6 h-6 object-contain" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-slate-900 truncate text-sm">{p.name}</div>
                                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600">
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 text-white font-medium">
                                                            {p.position}
                                                        </span>
                                                        {p.team && <span className="truncate">{p.team}</span>}
                                                        <span className="font-semibold text-emerald-600">£{p.price?.toFixed(1)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <button
                                                        className="text-xs px-2 py-1 font-medium rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                        onClick={() => toggleXi(i)}
                                                    >
                                                        {xiIds.has(i) ? 'Von XI' : 'Zur XI'}
                                                    </button>
                                                    <button
                                                        className="text-xs px-2 py-1 font-medium text-red-600 hover:bg-red-50 rounded"
                                                        onClick={() => removeFromSquad(i)}
                                                        title="Entfernen"
                                                    >
                                                        Entfernen
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Search Panel */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 sticky top-6">
                                <h2 className="text-lg font-semibold text-slate-900 mb-4">Spieler suchen</h2>
                                <div className="space-y-3 mb-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Saison</label>
                                        <select
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            value={season}
                                            onChange={(e) => setSeason(e.target.value)}
                                        >
                                            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Spielername</label>
                                        <input
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Name eingeben…"
                                            value={q}
                                            onChange={(e) => setQ(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium px-4 py-2.5 rounded-lg transition-colors"
                                        disabled={!canSearch || loading}
                                        onClick={search}
                                    >
                                        {loading ? 'Suche läuft…' : 'Suchen'}
                                    </button>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {results.length === 0 && q.trim().length >= 3 && !loading && (
                                        <div className="text-center py-6 text-slate-400 text-sm">
                                            Keine Spieler gefunden
                                        </div>
                                    )}
                                    {results.map((r, idx) => {
                                        const check = canAdd(r)
                                        return (
                                            <div key={`${r.name}-${r.team}-${r.position}-${idx}`} className="border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <img src={r.image || ''} alt={r.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-slate-900 text-sm truncate">{r.name}</div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-700 text-white">
                                                                {r.position}
                                                            </span>
                                                            <img src={r.clubImage || ''} alt={r.team || 'Club'} className="w-4 h-4 object-contain" />
                                                            <span className="text-xs text-slate-600 truncate">{r.team || '—'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-emerald-700">
                                                        £{r.price != null ? r.price.toFixed(1) : '—'}M
                                                    </span>
                                                    <button
                                                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${check.ok
                                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                            }`}
                                                        disabled={!check.ok}
                                                        onClick={() => addToSquad(r)}
                                                        title={check.ok ? 'Zum Kader hinzufügen' : (check.reason || '')}
                                                    >
                                                        {check.ok ? '+ Hinzufügen' : check.reason || 'Nicht verfügbar'}
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
