import { useEffect, useState } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import { FeatureImportanceChart, FeatureImportanceRow } from '../src/components/FeatureImportanceChart'
import { getUsableSeasons } from '../lib/seasonQuality'
import { Select } from '../src/components/Select'
import { LoadingState, ErrorState } from '../src/components/States'
import { BarChart3, BrainCircuit, Info, Database } from 'lucide-react'

interface FIResponse {
    season: string
    method: string
    n_features: number
    generated_at: string
    features: FeatureImportanceRow[]
    position?: string | null
    fallback?: boolean
}

export default function FeatureImportancePage() {
    const [seasons, setSeasons] = useState<string[]>([])
    const [selectedSeason, setSelectedSeason] = useState<string>('2023-24')
    const [data, setData] = useState<FIResponse | null>(null)
    const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [error, setError] = useState<string>('')
    const [topN, setTopN] = useState<number>(15)
    const [showCum, setShowCum] = useState<boolean>(true)
    const [position, setPosition] = useState<string>('ALL')

    useEffect(() => {
        async function loadSeasons() {
            try {
                const s = await getUsableSeasons()
                setSeasons(s)
                if (!selectedSeason && s.length > 0) setSelectedSeason(s[s.length - 1])
            } catch {
                setSeasons(['2020-21', '2021-22', '2022-23', '2023-24'])
            }
        }
        loadSeasons()
    }, [])

    useEffect(() => {
        if (!selectedSeason) return
        async function fetchFI() {
            setState('loading'); setError('')
            try {
                const posParam = position !== 'ALL' ? `?position=${position}` : ''
                const res = await fetch(`/api/feature-importance/${selectedSeason}/rf${posParam}`)
                if (!res.ok) {
                    const e = await res.json().catch(() => ({}))
                    throw new Error(e.error || 'Fehler beim Laden der Feature Importances')
                }
                const json: FIResponse = await res.json()
                setData(json); setState('success')
            } catch (e: any) {
                setError(e.message); setData(null); setState('error')
            }
        }
        fetchFI()
    }, [selectedSeason, position])

    return (
        <>
            <Head>
                <title>Feature Importances – FPL Matura</title>
                <meta name="description" content="Analyse der wichtigsten Einflussfaktoren des Random Forest Modells" />
            </Head>
            <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                <div className="container mx-auto px-4 py-8">
                    {/* Header */}
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-10">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <BrainCircuit className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Feature Importances</h1>
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                            Welche Input-Variablen treiben die Punktprognosen des Random Forest Modells? Interpretation hilft bei Modellkritik & Verbesserungen.
                        </p>
                    </motion.div>

                    {/* Controls */}
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Select label="Season" value={selectedSeason} onChange={val => setSelectedSeason(val as string)} options={seasons.map(s => ({ value: s, label: `Season ${s}` }))} />
                            <Select label="Top N" value={String(topN)} onChange={val => setTopN(Number(val))} options={[5, 10, 15, 20, 30].map(n => ({ value: String(n), label: `Top ${n}` }))} />
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kumulativ Kurve</label>
                                <button onClick={() => setShowCum(s => !s)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700">
                                    {showCum ? 'Ausblenden' : 'Einblenden'}
                                </button>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
                                <div className="grid grid-cols-5 gap-1">
                                    {['ALL', 'GK', 'DEF', 'MID', 'FWD'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPosition(p)}
                                            className={`text-xs px-2 py-1 rounded border ${position === p ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-gray-600'}`}
                                        >{p}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <Info className="w-4 h-4" /> Wichtig: Importances zeigen relative Aufteilungsbeiträge zur Fehlervarianz – keine Kausalität.
                        </div>
                        {data?.position && (
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                {data.fallback ? 'Positionsdatei fehlt – globale Verteilung gezeigt.' : `Positionsmodus: ${data.position}`}
                            </div>
                        )}
                    </motion.div>

                    {state === 'loading' && <LoadingState message="Lade Daten..." />}
                    {state === 'error' && <ErrorState message={error} />}

                    {state === 'success' && data && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="space-y-10">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                                <FeatureImportanceChart
                                    data={data.features}
                                    topN={topN}
                                    showCumulative={showCum}
                                    title={`RF Feature Importances (${data.season}${position !== 'ALL' && !data?.fallback ? ` – ${position}` : ''})`}
                                />
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-3 font-semibold text-gray-900 dark:text-white"><Database className="w-5 h-5" /> Interpretation</div>
                                    <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                        <li><strong>Hohe Wichtigkeit</strong> → Modell trennt stark nach diesem Merkmal (z.B. Preis als Proxy für Qualität).</li>
                                        <li><strong>Rolling Features</strong> (r3) bündeln Form ohne Leaks (Vergangenheit).</li>
                                        <li><strong>Kumulativ</strong> zeigt wie schnell wenige Features den Grossteil der Erklärung liefern.</li>
                                        <li>Niedrige Importances können dennoch für Stabilität relevant sein (Regularisierungseffekt).</li>
                                        <li><strong>Positionsmodus</strong>: Merkmalsgewichtung kann sich stark unterscheiden (z.B. Minuten wichtiger für Rotation bei Defensivspielern).</li>
                                    </ul>
                                </div>
                                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                    <p className="mb-3 font-semibold text-gray-900 dark:text-white">Limitationen</p>
                                    <p className="mb-2">Random Forest Importances sind bias-anfällig bei hochkardinalen oder stark skalierten Merkmalen. Für tiefergehende Analyse wären permutation importances oder SHAP geeigneter.</p>
                                    <p>Für die Maturaarbeit reicht diese Übersicht zur transparenten Modellreflexion und zur Ableitung von Verbesserungen (Feature Engineering, Regularisierung). Positionssplits zeigen zusätzliche Nuancen ohne das Gesamtmodell zu verkomplizieren.</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </main>
        </>
    )
}
