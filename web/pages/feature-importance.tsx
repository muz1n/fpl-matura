import { useEffect, useState } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import { FeatureImportanceChart, FeatureImportanceRow } from '../src/components/FeatureImportanceChart'
import { getUsableSeasons } from '../lib/seasonQuality'
import { Select } from '../src/components/Select'
import { LoadingState, ErrorState } from '../src/components/States'
import { BarChart3, BrainCircuit, Info, Database } from 'lucide-react'
import { Navbar } from '../src/components/Navbar'
import { Card, SummaryCard, SectionHeader, InfoBox, ControlPanel } from '../src/components/ui'

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
                    setError('Fehler – Keine Feature Importance-Daten gefunden'); setData(null); setState('error'); return;
                }
                const json: FIResponse = await res.json()
                setData(json); setState('success')
            } catch (e: any) {
                setError('Fehler – Keine Feature Importance-Daten gefunden'); setData(null); setState('error')
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
            <main className="min-h-screen bg-slate-900 text-slate-100">
                <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center"
                    >
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <BrainCircuit className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-100">Feature Importance</h1>
                        </div>
                        <p className="text-sm md:text-base text-slate-300 max-w-2xl">
                            Welche Merkmale beeinflussen die Vorhersagen am stärksten?
                        </p>
                    </motion.div>
                    <div className="space-y-6 mt-6">
                        <SectionHeader
                            title={`Wichtigste Merkmale für ${position === 'ALL' ? 'alle Positionen' : position}`}
                            subtitle={`Saison ${data?.season ?? selectedSeason}`}
                        />
                        <div className="flex flex-wrap gap-2 items-center">
                            <Select
                                label="Saison wählen"
                                options={seasons.map(s => ({ value: s, label: s }))}
                                value={selectedSeason}
                                onChange={setSelectedSeason}
                                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900/60 text-slate-200 border border-slate-700 hover:bg-slate-800"
                            />
                            {[
                                { value: 'ALL', label: 'Alle' },
                                { value: 'DEF', label: 'Verteidiger' },
                                { value: 'MID', label: 'Mittelfeld' },
                                { value: 'FWD', label: 'Stürmer' },
                                { value: 'GK', label: 'Torwart' }
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setPosition(opt.value)}
                                    className={
                                        position === opt.value
                                            ? "px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-600 text-white border border-emerald-500"
                                            : "px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900/60 text-slate-200 border border-slate-700 hover:bg-slate-800"
                                    }
                                >
                                    {opt.label}
                                </button>
                            ))}
                            <button
                                onClick={() => setShowCum(s => !s)}
                                className={
                                    showCum
                                        ? "px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-600 text-white border border-emerald-500"
                                        : "px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900/60 text-slate-200 border border-slate-700 hover:bg-slate-800"
                                }
                            >
                                Kumulativ {showCum ? 'ausblenden' : 'einblenden'}
                            </button>
                        </div>
                        {state === 'loading' && <LoadingState message="Lade Daten..." />}
                        {state === 'error' && (
                            <ErrorState message={error || 'Fehler – Keine Feature Importance-Daten gefunden'} />
                        )}
                        {state === 'success' && data && (
                            <>
                                {data.position && data.fallback && (
                                    <div className="mt-4">
                                        <InfoBox variant="warning">
                                            Positionsdatei fehlt – globale Verteilung wird gezeigt.
                                        </InfoBox>
                                    </div>
                                )}
                                <div className="bg-slate-800/90 border border-slate-700 rounded-2xl shadow-lg p-5 space-y-3 mb-8">
                                    <div className="text-sm font-semibold text-slate-100 flex items-center justify-between gap-2">
                                        <span>Feature Importance Plot</span>
                                        <span className="text-xs text-slate-400">Wichtigkeit der Merkmale gemäss Modell</span>
                                    </div>
                                    <div className="w-full h-72 bg-slate-900/60 rounded-xl border border-slate-700 p-3">
                                        <FeatureImportanceChart
                                            data={data.features}
                                            topN={topN}
                                            showCumulative={showCum}
                                            title=""
                                        />
                                    </div>
                                    <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4 text-xs md:text-sm text-slate-200 space-y-2 mt-3">
                                        <div className="text-sm font-semibold text-emerald-300 uppercase tracking-wide">Interpretation</div>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Hoher Wert = starker Einfluss auf die Prognose.</li>
                                            <li>Werte sind relativ innerhalb eines Modells, nicht absolut zwischen Modellen.</li>
                                            <li>Dient zur Einordnung, nicht als harte Regel.</li>
                                        </ul>
                                    </div>
                                </div>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className="space-y-8"
                                >
                                    <InfoBox>
                                        Die Balken zeigen, welche Eingangsgrössen der Random Forest als wichtig einstuft.
                                        Je höher der Balken, desto stärker beeinflusst dieses Merkmal die Vorhersage.
                                        Das bedeutet nicht automatisch, dass hohe Werte "gut" sind, sondern dass das Modell
                                        darauf sensibel reagiert.
                                    </InfoBox>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <Card>
                                            <div className="flex items-center gap-2 mb-4 font-semibold text-slate-100">
                                                <Database className="w-5 h-5" />
                                                Interpretation
                                            </div>
                                            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300">
                                                <li><strong>Hohe Wichtigkeit</strong> → Modell trennt stark nach diesem Merkmal (z.B. Preis als Proxy für Qualität).</li>
                                                <li><strong>Rolling Features</strong> (r3) bündeln Form ohne Leaks (Vergangenheit).</li>
                                                <li><strong>Kumulativ</strong> zeigt wie schnell wenige Features den Grossteil der Erklärung liefern.</li>
                                                <li>Niedrige Importances können dennoch für Stabilität relevant sein (Regularisierungseffekt).</li>
                                                <li><strong>Positionsmodus</strong>: Merkmalsgewichtung kann sich stark unterscheiden (z.B. Minuten wichtiger für Rotation bei Defensivspielern).</li>
                                            </ul>
                                        </Card>
                                        <Card>
                                            <div className="flex items-center gap-2 mb-4 font-semibold text-slate-100">
                                                <Info className="w-5 h-5" />
                                                Limitationen
                                            </div>
                                            <div className="text-sm text-slate-400 space-y-2">
                                                <p>
                                                    Random Forest Importances sind bias-anfällig bei hochkardinalen oder stark
                                                    skalierten Merkmalen. Für tiefergehende Analyse wären permutation importances
                                                    oder SHAP geeigneter.
                                                </p>
                                                <p>
                                                    Für die Maturaarbeit reicht diese Übersicht zur transparenten Modellreflexion
                                                    und zur Ableitung von Verbesserungen (Feature Engineering, Regularisierung).
                                                    Positionssplits zeigen zusätzliche Nuancen ohne das Gesamtmodell zu verkomplizieren.
                                                </p>
                                            </div>
                                        </Card>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </>
    )
}
