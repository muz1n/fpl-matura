import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { loadSquad, formatSquadSummary } from '@/lib/squad-storage'

export default function Home() {
    const router = useRouter()
    const [gw, setGw] = useState('38')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [squadSummary, setSquadSummary] = useState<string | null>(null)

    // Neue Prognose laden
    const handleLoadPredictions = async () => {
        const gwNum = parseInt(gw, 10)
        if (!gwNum || gwNum < 1 || gwNum > 38) {
            setError('Bitte eine gültige Gameweek (1-38) eingeben')
            return
        }
        setError('')
        setLoading(true)
        try {
            const res = await fetch(`/api/gw/${gwNum}/predictions`)
            if (!res.ok) {
                throw new Error('Prognose-Datei nicht gefunden oder ungültig')
            }
            await res.json() // Validierung
            router.push(`/predictions?gw=${gwNum}`)
        } catch (err: any) {
            setError(err.message || 'Fehler beim Laden der Prognose')
        } finally {
            setLoading(false)
        }
    }

    // LocalStorage auslesen
    const handleShowSquad = () => {
        const squad = loadSquad()
        if (!squad) {
            setSquadSummary('Keine Mannschaft gespeichert.')
            return
        }
        setSquadSummary(formatSquadSummary(squad))
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Head>
                <title>FPL Matura — Home</title>
            </Head>

            <main className="max-w-4xl w-full mx-auto p-6 bg-white rounded shadow">
                <h1 className="text-3xl font-bold mb-6 text-slate-900">FPL Matura</h1>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Karte 1: Prognosen ansehen */}
                    <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <h2 className="text-lg font-semibold mb-2 text-emerald-900">Prognosen ansehen</h2>
                        <p className="text-sm text-emerald-800 mb-4">
                            Zeigt die aktuelle Vorhersage und empfohlene Aufstellung.
                        </p>
                        <Link
                            href="/predictions"
                            className="inline-block px-4 py-2 bg-emerald-600 text-white font-medium rounded hover:bg-emerald-700 transition-colors"
                        >
                            Zu Prognosen →
                        </Link>
                    </div>

                    {/* Karte 2: Neue Prognose laden */}
                    <div className="p-5 bg-sky-50 border border-sky-200 rounded-lg">
                        <h2 className="text-lg font-semibold mb-2 text-sky-900">Neue Prognose laden</h2>
                        <p className="text-sm text-sky-800 mb-3">
                            Lade Daten für eine bestimmte Gameweek.
                        </p>
                        <div className="space-y-2">
                            <input
                                type="number"
                                min="1"
                                max="38"
                                value={gw}
                                onChange={(e) => setGw(e.target.value)}
                                className="w-full px-3 py-2 border border-sky-300 rounded text-sm"
                                placeholder="Gameweek (z.B. 38)"
                            />
                            <button
                                onClick={handleLoadPredictions}
                                disabled={loading}
                                className="w-full px-4 py-2 bg-sky-600 text-white font-medium rounded hover:bg-sky-700 transition-colors disabled:bg-slate-400"
                            >
                                {loading ? 'Lädt...' : 'Laden'}
                            </button>
                            {error && <p className="text-xs text-red-600">{error}</p>}
                        </div>
                    </div>

                    {/* Karte 3: Deine Mannschaft merken */}
                    <div className="p-5 bg-amber-50 border border-amber-200 rounded-lg">
                        <h2 className="text-lg font-semibold mb-2 text-amber-900">Deine Mannschaft merken</h2>
                        <p className="text-sm text-amber-800 mb-3">
                            Speichere deine Aufstellung lokal im Browser.
                        </p>
                        <button
                            onClick={handleShowSquad}
                            className="w-full px-4 py-2 bg-amber-600 text-white font-medium rounded hover:bg-amber-700 transition-colors mb-2"
                        >
                            Letzte Mannschaft anzeigen
                        </button>
                        {squadSummary && (
                            <p className="text-xs text-amber-900 bg-amber-100 p-2 rounded">{squadSummary}</p>
                        )}
                        <p className="text-xs text-amber-700 mt-2">
                            Speichern erfolgt auf der Prognosen-Seite.
                        </p>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 text-sm text-slate-500">
                    <p>Next.js 15 + TypeScript + Tailwind CSS · Keine echten FPL-Logins erforderlich</p>
                </div>
            </main>
        </div>
    )
}
