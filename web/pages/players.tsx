import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'

export default function PlayersPage() {
    const [season, setSeason] = useState('2023-24')
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)

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
            const t = setTimeout(search, 250)
            return () => clearTimeout(t)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, season])

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            <Head>
                <title>FPL Spielerübersicht</title>
            </Head>
            <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
                <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg px-6 py-5 space-y-2">
                    <div className="space-y-2">
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-100">Spieler Suche (Season-spezifisch)</h1>
                        <p className="text-sm md:text-base text-slate-300">Hier kannst du nach Spielern einer bestimmten Saison suchen und Details anzeigen lassen.</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3 bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-lg space-y-0">
                    <input
                        className="bg-slate-900/60 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-500 w-full md:w-auto"
                        placeholder="Season z.B. 2020-21"
                        value={season}
                        onChange={(e) => setSeason(e.target.value)}
                    />
                    <input
                        className="bg-slate-900/60 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-500 w-full md:w-auto"
                        placeholder="Spielernamen eingeben…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    <button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full md:w-auto"
                        onClick={search}
                        disabled={!canSearch || loading}
                    >
                        {loading ? 'Suche…' : 'Suchen'}
                    </button>
                </div>
                {error && (
                    <div className="rounded-xl bg-red-900/40 border border-red-700 text-red-200 px-4 py-3 text-sm">
                        {error}
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                    {results.map((r) => (
                        <div key={`${r.playerId ?? r.name}`} className="flex items-center gap-4 p-4 bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg hover:border-emerald-500/50 transition-colors">
                            <img src={r.image || ''} alt={r.name} className="w-14 h-14 rounded-full object-cover bg-slate-900/60 border border-slate-700" />
                            <div className="flex-1">
                                <div className="text-sm font-semibold text-slate-100">{r.name}</div>
                                <div className="text-xs text-slate-400">{r.position} · {r.team || 'Team unbekannt'}</div>
                                <div className="text-xs text-emerald-400 font-medium">Preis: {r.price != null ? r.price.toFixed(1) : '—'}</div>
                            </div>
                            <img src={r.clubImage || ''} alt={r.team || 'Club'} className="w-8 h-8 rounded object-contain bg-slate-900/60 border border-slate-700" />
                        </div>
                    ))}
                </div>
                {results.length === 0 && !loading && !error && (
                    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center text-sm text-slate-400">
                        Keine Spieler gefunden.
                    </div>
                )}
            </div>
        </div>
    )
}
