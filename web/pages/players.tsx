import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'

export default function PlayersSearchPage() {
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
        <>
            <Head>
                <title>Spieler Suche</title>
            </Head>
            <div className="min-h-screen p-4 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">Spieler Suche (Season-spezifisch)</h1>
                <div className="flex gap-2 mb-4">
                    <input
                        className="border rounded px-3 py-2 w-40"
                        placeholder="Season z.B. 2020-21"
                        value={season}
                        onChange={(e) => setSeason(e.target.value)}
                    />
                    <input
                        className="border rounded px-3 py-2 flex-1"
                        placeholder="Spielernamen eingeben…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    <button
                        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                        onClick={search}
                        disabled={!canSearch || loading}
                    >
                        {loading ? 'Suche…' : 'Suchen'}
                    </button>
                </div>
                {error && <div className="text-red-600 mb-3">{error}</div>}
                <div className="grid md:grid-cols-2 gap-3">
                    {results.map((r) => (
                        <div key={`${r.playerId ?? r.name}`} className="border rounded p-3 flex gap-3 items-center">
                            <img src={r.image || ''} alt={r.name} className="w-16 h-16 rounded-full object-cover bg-gray-100" />
                            <div className="flex-1">
                                <div className="font-semibold">{r.name}</div>
                                <div className="text-sm text-gray-600">{r.position} · {r.team || 'Team unbekannt'}</div>
                                <div className="text-sm">Preis: {r.price != null ? r.price.toFixed(1) : '—'}</div>
                            </div>
                            <img src={r.clubImage || ''} alt={r.team || 'Club'} className="w-10 h-10 rounded object-contain bg-gray-50" />
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}
